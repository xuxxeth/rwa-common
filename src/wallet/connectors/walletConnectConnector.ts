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
import EthereumProvider from "@walletconnect/ethereum-provider";
import QRCodeStyling from "qr-code-styling";
import { bscTestnet } from "../config/chains";
import { walletConnectWallet } from "../config/wallet";

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

  public provider?: EthereumProvider;
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

    // conncted 字段状态不准确，使用 provider.session 来判断
    const hasValidSession =
      this.provider.session &&
      this.provider.session.expiry > Math.floor(Date.now() / 1000);
    if (hasValidSession) {
      // 尝试获取账户信息来验证连接状态
      try {
        const accounts: string[] = await this.provider.request({
          method: "eth_accounts",
        });
        if (accounts && accounts.length > 0) {
          console.log("Session is active, updating state...");
          await this.updateStateFromProvider();
          return this.state;
        }
      } catch (error) {
        console.warn("Error validating connection:", error);
      }
    }

    try {
      // 如果配置了不显示二维码弹窗，监听URI事件
      this.provider.on("display_uri", async (uri: string) => {
        const deepLink = this.generateWalletDeepLink(uri, wallet);
        const dataUrl = await this.generateQRCodeDataUrl(deepLink, wallet);
        this.updateQrCodeData({ uri, dataUrl });
      });

      // 启用Provider连接
      await this.provider.enable();

      // 更新状态
      await this.updateStateFromProvider();

      return this.state;
    } catch (error) {
      console.error("WalletConnect connection failed:", error);
      throw error;
    }

    return this.state;
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
  getProvider(): EthereumProvider | null {
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

    // const requiredChains = this.config.chains.map((chain) => chain.id);
    // const optionalChains = this.config.chains
    //   .filter((chain) => chain.id !== this.config.defaultChainId)
    //   .map((chain) => chain.id);

    this.provider = await EthereumProvider.init({
      projectId: this.config.projectId,
      chains: [bscTestnet.id],
      // optionalChains: optionalChains,
      methods: [
        "eth_sendTransaction",
        "eth_signTransaction",
        "eth_sign",
        "personal_sign",
        "eth_signTypedData",
      ],
      events: ["chainChanged", "accountsChanged"],
      showQrModal: false,
      qrModalOptions: this.config.qrModalOptions,
      rpcMap: {
        [bscTestnet.id]: bscTestnet.rpcUrls.default.http[0],
      },
      metadata: {
        name: "CyberAlpha",
        description: "CyberAlpha",
        url: window.location.origin,
        icons: ["https://test.cyberalpha.cc/images/logo_dark.png"],
      },
    });

    // 订阅事件
    this.subscribeToEvents();
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
      const accounts = (await this.provider.request({
        method: "eth_accounts",
      })) as string[];

      const chainId = (await this.provider.request({
        method: "eth_chainId",
      })) as number;

      // 如果用户在授权连接的时候默认没有选择 bsctestnet, 这里chainId 会是 1
      // 但之后会切换到 bsctestnet, 所以这里需要判断一下
      if(chainId !== bscTestnet.id) {
        console.log('Default chainId is not bsctestnet, chainId:', chainId, ', and wait for switch to bsctestnet')
        return
      }

      this.state = {
        accounts: accounts as Address[],
        chainId,
        // provider.connected 这个字段在处理还有有效期的session的时候，不准确，
        // 即便有处于有效期的 session，这个字段也为 false
        // 所以这里额外根据 accounts 是否为false来判断是否连接
        connected: this.provider.connected
          ? true
          : accounts.length > 0
          ? true
          : false,
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
      const newChainId = parseInt(chainId, 16);
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

    // 连接事件
    this.provider.on("connect", () => {
      const provider = this.provider;
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
