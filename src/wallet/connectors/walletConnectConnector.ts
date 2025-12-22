import type {
  IWalletConnectConnector,
  WalletState,
  WalletConfig,
} from "../types";
import { ConnectorType, type QrCodeData } from "../types";
import {
  type Chain,
  type Address,
  createPublicClient,
  createWalletClient,
  custom,
  http,
} from "viem";
import QRCodeStyling from "qr-code-styling";
import { walletConnectWallet } from "../config/wallet";
import type UniversalProvider from "@walletconnect/universal-provider";

interface WalletConnectConfig {
  projectId: string;
  chains: Chain[];
  defaultChainId?: number;
  relayUrl?: string;
  showQrModal?: boolean;
  qrModalOptions?: {
    themeMode?: "light" | "dark";
    themeVariables?: {
      "--wcm-z-index"?: string;
    };
  };
}

export class WalletConnectConnector implements IWalletConnectConnector {
  private static instance: WalletConnectConnector | null = null;

  public provider?: UniversalProvider;
  private connectorType = ConnectorType.WalletConnect;

  // 私有属性
  private config: WalletConnectConfig;
  private state: WalletState = {
    accounts: [],
    chainId: null,
    connected: false,
  };

  private qrCodeData: { uri: string; dataUrl: string } | null = null;

  private listeners: Record<
    "accountsChanged" | "chainChanged" | "disconnect" | "qrCodeDataChanged",
    ((...args: any[]) => void)[]
  > = {
    accountsChanged: [],
    chainChanged: [],
    disconnect: [],
    qrCodeDataChanged: [],
  };

  // 单例模式获取实例
  public static getInstance(
    config: WalletConnectConfig
  ): WalletConnectConnector {
    if (!WalletConnectConnector.instance) {
      WalletConnectConnector.instance = new WalletConnectConnector(config);
    }
    return WalletConnectConnector.instance;
  }

  // 私有构造函数
  private constructor(config: WalletConnectConfig) {
    this.config = config;
  }

  // 连接钱包
  async connect(
    wallet: WalletConfig = walletConnectWallet
  ): Promise<WalletState> {
    // 如果有二维码，清空上次的二维码数据
    this.updateQrCodeData(null);

    // 初始化Provider
    await this.initializeProvider();

    if (!this.provider) {
      throw new Error("WalletConnect provider not initialized");
    }

    // 1. 检查是否存在有效的 Session
    // UniversalProvider 的 session 属性即代表当前激活的会话
    if (this.provider.session) {
      try {
        const expiry = this.provider.session.expiry;
        const now = Math.floor(Date.now() / 1000);

        // 检查 Session 是否过期
        if (expiry > now) {
          console.log("Session is active, restoring connection...");

          // 恢复状态
          await this.updateStateFromProvider();

          // 确保 connected 状态被正确设置
          if (this.state.connected && this.state.accounts.length > 0) {
            return this.state;
          }
        }
      } catch (error) {
        console.warn("Error validating existing session:", error);
        // 如果恢复失败，继续执行后面的连接逻辑，不要 throw
      }
    }

    try {
      // 2. 监听二维码显示事件
      this.provider.on("display_uri", async (uri: string) => {
        const deepLink = this.generateWalletDeepLink(uri, wallet);
        const dataUrl = await this.generateQRCodeDataUrl(deepLink, wallet);
        this.updateQrCodeData({ uri, dataUrl });
      });

      // 3. 构造 EIP-155 (EVM) 命名空间配置
      // 这是让 UniversalProvider 表现得像 EthereumProvider 的关键
      const chains = this.config.chains.map((chain) => chain.id);
      const rpcMap = this.config.chains.reduce((acc, chain) => {
        acc[chain.id] = chain.rpcUrls.default.http[0];
        return acc;
      }, {} as Record<number, string>);

      // 4. 发起连接
      // UniversalProvider 使用 connect 方法，而不是 enable
      await this.provider.connect({
        namespaces: {
          eip155: {
            chains: chains.map((id) => `eip155:${id}`),
            events: ["chainChanged", "accountsChanged"],
            methods: [
              "eth_sendTransaction",
              "eth_signTransaction",
              "eth_sign",
              "personal_sign",
              "eth_signTypedData",
              "eth_signTypedData_v4",
            ],
            rpcMap: rpcMap,
          },
        },
      });

      // 5. 连接成功后，立即同步 Provider 的 Session 数据到本地的 State
      await this.updateStateFromProvider();

      // 6. 返回最新的钱包状态
      return this.state;
    } catch (error) {
      console.error("WalletConnect connection failed:", error);
      this.disconnect();
      throw error;
    }
  }

  private generateWalletDeepLink(uri: string, wallet: WalletConfig) {
    switch (wallet.type) {
      case "metamask": {
        return `metamask://wc?uri=${encodeURIComponent(uri)}`;
      }
      default: {
        return uri;
      }
    }
  }

  // 断开连接
  async disconnect(): Promise<void> {
    if (this.provider) {
      try {
        await this.provider.disconnect();
      } catch (error) {
        console.warn("Error during disconnect:", error);
      }
    }

    // 手动清理本地状态
    this.reset();
    this.emit("disconnect");
  }

  // 切换链
  async switchChain(targetChainId: number): Promise<void> {
    if (!this.provider) {
      throw new Error("Provider not initialized");
    }

    try {
      await this.provider.request({
        method: "wallet_switchEthereumChain",
        params: [{ chainId: `0x${targetChainId.toString(16)}` }],
      });

      // 更新状态
      this.state.chainId = targetChainId;
      this.emit("chainChanged", targetChainId);
    } catch (error) {
      console.warn("Chain switch failed:", error);
      throw error;
    }
  }

  // 获取账户
  getAccount(): Address | null {
    return this.state.accounts[0] ?? null;
  }

  // 获取所有账户
  getAccounts(): Address[] {
    return this.state.accounts;
  }

  // 获取当前链ID
  getChainId(): number | null {
    return this.state.chainId;
  }

  // 获取公共客户端
  getPublicClient(chainId?: number) {
    const chain = this.getChain(
      chainId ?? this.state.chainId ?? this.config.defaultChainId!
    );
    return createPublicClient({ chain, transport: http() });
  }

  // 获取钱包客户端
  getWalletClient(chainId?: number) {
    const chain = this.getChain(
      chainId ?? this.state.chainId ?? this.config.defaultChainId!
    );
    if (!this.provider) throw new Error("Provider not initialized");
    return createWalletClient({ chain, transport: custom(this.provider) });
  }

  // 获取连接器类型
  getConnectorType(): ConnectorType {
    return this.connectorType;
  }

  // 获取Provider
  getProvider(): UniversalProvider | null {
    return this.provider ?? null;
  }

  // 检查是否已连接
  isConnected(): boolean {
    return this.state.connected;
  }

  // 事件监听
  on(
    event:
      | "accountsChanged"
      | "chainChanged"
      | "disconnect"
      | "qrCodeDataChanged",
    cb: (...args: any[]) => void
  ) {
    this.listeners[event].push(cb);
    return () => {
      this.listeners[event] = this.listeners[event].filter((l) => l !== cb);
    };
  }

  // 私有方法
  private async initializeProvider(): Promise<void> {
    if (this.provider) return;

    try {
      // 动态导入：只有在运行时才加载这个巨大的库
      const { default: UniversalProvider } = await import(
        "@walletconnect/universal-provider"
      );

      this.provider = await UniversalProvider.init({
        projectId: this.config.projectId,
        metadata: {
          name: "CyberAlpha",
          description: "CyberAlpha",
          url: window.location.origin,
          icons: ["https://test.cyberalpha.cc/images/logo_dark.png"],
        },
      });

      // 订阅事件
      this.subscribeToEvents();
    } catch (error) {
      console.error("Failed to initialize WalletConnect provider:", error);
      throw error;
    }
  }

  private updateQrCodeData(qrCodeData: QrCodeData | null) {
    if (qrCodeData !== this.qrCodeData) {
      this.qrCodeData = qrCodeData;
      this.emit("qrCodeDataChanged", qrCodeData);
    }
  }

  public getQrCodeData(): QrCodeData | null {
    return this.qrCodeData;
  }

  private async updateStateFromProvider(): Promise<void> {
    if (!this.provider) return;

    try {
      // 优化：直接从 Session 中获取状态，而不是发送 RPC 请求
      const session = this.provider.session;
      if (!session) {
        this.state = {
          accounts: [],
          chainId: null,
          connected: false,
        };
        return;
      }

      // 获取 eip155 命名空间下的账户
      const namespace = session.namespaces["eip155"];
      if (
        !namespace ||
        !namespace.accounts ||
        namespace.accounts.length === 0
      ) {
        this.state.connected = false;
        return;
      }

      // accounts 格式为 ["eip155:1:0x...", "eip155:56:0x..."]
      const accounts = namespace.accounts.map((account) => {
        const parts = account.split(":");
        return parts[2] as Address; // 取地址部分
      });

      // 通常默认取第一个 account 的 chainId
      const firstAccount = namespace.accounts[0];
      const defaultChainId = parseInt(firstAccount.split(":")[1], 10);
      this.state = {
        accounts: [...new Set(accounts)], // 去重
        chainId: defaultChainId,
        connected: true,
      };
    } catch (error) {
      console.error("Failed to update state from provider:", error);
    }
  }

  private subscribeToEvents(): void {
    if (!this.provider) return;

    // 账户变更事件
    this.provider.on("accountsChanged", (accounts: string[]) => {
      this.state.accounts = accounts as Address[];
      this.emit("accountsChanged", accounts);
    });

    // 链变更事件
    this.provider.on("chainChanged", (chainId: string) => {
      const newChainId =
        typeof chainId === "string" ? parseInt(chainId, 16) : chainId;
      if (newChainId !== this.state.chainId) {
        this.state.chainId = newChainId;
        this.emit("chainChanged", newChainId);
      }
    });

    // 断开连接事件
    this.provider.on("disconnect", (error: any) => {
      console.log("WalletConnect disconnected", error);
      this.reset();
      this.emit("disconnect", error);
    });

    // 协议层会话删除事件(更可靠的断开新号)
    this.provider.on("session_delete", () => {
      console.log("WalletConnect session deleted");
      this.reset();
      this.emit("disconnect");
    });

    // 连接事件
    this.provider.on("connect", () => {
      this.updateQrCodeData(null);
      this.updateStateFromProvider();
    });
  }

  private getChain(id: number): Chain {
    const chain = this.config.chains.find((c) => c.id === id);
    if (!chain) throw new Error(`Chain not configured: ${id}`);
    return chain;
  }

  private reset(): void {
    this.state = {
      accounts: [],
      chainId: null,
      connected: false,
    };
    this.updateQrCodeData(null);
  }

  private emit(
    event:
      | "accountsChanged"
      | "chainChanged"
      | "disconnect"
      | "qrCodeDataChanged",
    ...args: any[]
  ): void {
    for (const listener of this.listeners[event]) {
      try {
        listener(...args);
      } catch (error) {
        console.error(`Error in ${event} listener:`, error);
      }
    }
  }

  private async generateQRCodeDataUrl(
    uri: string,
    wallet: WalletConfig
  ): Promise<string> {
    try {
      const qrCode = new QRCodeStyling({
        width: 350,
        height: 350,
        data: uri,
        image: wallet.info.icon,
        dotsOptions: {
          type: "square",
          color: "#000000",
        },
        imageOptions: {
          crossOrigin: "anonymous",
          margin: 6,
          imageSize: 0.15,
          hideBackgroundDots: true,
        },
        backgroundOptions: {
          color: "#ffffff",
        },
      });
      return new Promise((resolve, reject) => {
        qrCode
          .getRawData("png")
          .then((blob: Blob | Buffer<ArrayBufferLike> | null) => {
            if (blob && blob instanceof Blob) {
              const reader = new FileReader();
              reader.onload = () => {
                resolve(reader.result as string);
              };
              reader.onerror = reject;
              reader.readAsDataURL(blob);
            } else {
              reject(new Error("Failed to generate QR code"));
            }
          });
      });
    } catch (error) {
      console.error("Failed to generate QR code:", error);
      throw error;
    }
  }

  // 销毁实例
  public destroy(): void {
    this.disconnect();
    WalletConnectConnector.instance = null;

    // 移除所有事件监听器
    this.listeners.accountsChanged = [];
    this.listeners.chainChanged = [];
    this.listeners.disconnect = [];
  }
}
