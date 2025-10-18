import type {
  IWalletConnectConnector,
  WalletState,
  ConnectorType,
  EIP1193Provider,
} from "../types";
import {
  type Chain,
  type Address,
  createPublicClient,
  createWalletClient,
  custom,
  http,
} from "viem";
import { UniversalProvider } from "@walletconnect/universal-provider";
import { getSdkError } from "@walletconnect/utils";
import { SessionTypes } from "@walletconnect/types";
import QRCode from "qrcode";

interface WalletConnectConfig {
  projectId: string;
  chains: Chain[];
  defaultChainId?: number;
  relayUrl?: string;
}

export class WalletConnectConnector implements IWalletConnectConnector {
  private static instance: WalletConnectConnector | null = null;

  // 公共属性
  public connectorType: ConnectorType = "walletconnect";
  public provider?: any;
  public session?: SessionTypes.Struct;

  // 私有属性
  private config: WalletConnectConfig;
  private state: WalletState = {
    accounts: [],
    chainId: null,
    connected: false,
  };
  private pendingConnection: Promise<SessionTypes.Struct> | null = null;
  private listeners: Record<
    "accountsChanged" | "chainChanged" | "disconnect",
    ((...args: any[]) => void)[]
  > = {
    accountsChanged: [],
    chainChanged: [],
    disconnect: [],
  };
  private qrCodeModal?: HTMLDivElement;

  // 构造函数
  private constructor(config: WalletConnectConfig) {
    this.config = {
      ...config,
      defaultChainId: config.defaultChainId || config.chains[0]?.id,
    };
  }

  // 单例模式获取实例
  public static getInstance(
    config: WalletConnectConfig
  ): WalletConnectConnector {
    if (!WalletConnectConnector.instance) {
      WalletConnectConnector.instance = new WalletConnectConnector(config);
    }
    return WalletConnectConnector.instance;
  }

  // 开始连接 - 返回二维码数据

  // 连接钱包（保持向后兼容）
  async connect(pairing?: any): Promise<
    WalletState & {
      qrCodeData?: { uri: string; dataUrl: string };
    }
  > {
    // 初始化Provider
    await this.initializeProvider();

    if (!this.provider) {
      throw new Error("WalletConnect provider not initialized");
    }

    // 断开现有连接
    if (this.session) {
      await this.disconnect();
    }

    let qrCodeData: { uri: string; dataUrl: string } | undefined;
    let qrCodePromiseResolve: (value: { uri: string; dataUrl: string }) => void;
    let qrCodePromiseReject: (reason?: any) => void;

    // 创建二维码生成的Promise
    const qrCodePromise = new Promise<{ uri: string; dataUrl: string }>(
      (resolve, reject) => {
        qrCodePromiseResolve = resolve;
        qrCodePromiseReject = reject;
      }
    );

    // 监听URI生成事件
    this.provider.on("display_uri", async (uri: string) => {
      console.log("WalletConnect URI:", uri);
      try {
        const dataUrl = await this.generateQRCodeDataUrl(uri);
        qrCodeData = { uri, dataUrl };
        qrCodePromiseResolve(qrCodeData);
      } catch (err) {
        qrCodePromiseReject(err);
      }
    });

    let connectResolve: (value: SessionTypes.Struct) => void;
    let connectReject: (reason?: any) => void;
    // 发起连接请求（这会触发display_uri事件）
    this.pendingConnection = new Promise<SessionTypes.Struct>(
      (resolve, reject) => {
        connectResolve = resolve;
        connectReject = reject;
      }
    );
    debugger

    this.pendingConnection = this.provider
      .connect({
        pairingTopic: pairing?.topic,
        optionalNamespaces: this.getRequiredNamespaces(),
        // namespaces: this.getRequiredNamespaces(),
      })
      .then(async (session: SessionTypes.Struct) => {
        debugger
        // const chainIdFromProvider = await this.getChainIdFromProvider();
        // console.log('===>chainIdFromProvider', chainIdFromProvider)
        // debugger;
        if (!session) {
          throw new Error("Failed to establish session");
        }

        this.session = session;
        const chainIdFromProvider = await this.getChainIdFromProvider();
        debugger
        this.onSessionConnected(session);
        connectResolve(session);
        this.pendingConnection = null;
      })
      .catch((error: any) => {
        console.warn("Session connection failed:", error);
        connectReject(error);
        this.pendingConnection = null;
      });

    try {
      await Promise.race([
        qrCodePromise,
        new Promise((_, reject) =>
          setTimeout(
            () => reject(new Error("QR code generation timeout")),
            50000
          )
        ),
      ]);
    } catch (error) {
      console.warn("QR code generation timeout or failed:", error);
      throw error;
    }

    if (!qrCodeData) {
      throw new Error("QR code data not generated");
    }

    return {
      ...this.state,
      qrCodeData,
    };
  }

  // 断开连接
  async disconnect(): Promise<void> {
    if (this.session && this.provider?.client) {
      try {
        await this.provider.client.disconnect({
          topic: this.session.topic,
          reason: getSdkError("USER_DISCONNECTED"),
        });
      } catch (error) {
        console.warn("Error during disconnect:", error);
      }
    }

    this.reset();
    this.emit("disconnect");
  }

  // 切换链
  async switchChain(targetChainId: number): Promise<void> {
    console.warn(
      "WalletConnect v2 does not support programmatic chain switching"
    );
    console.warn("Please switch chain in your wallet app:", targetChainId);

    this.state.chainId = targetChainId;
    this.emit("chainChanged", targetChainId);
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
  getConnectorType(): ConnectorType | undefined {
    return this.connectorType;
  }

  // 获取Provider
  getProvider(): EIP1193Provider | null {
    return this.provider ?? null;
  }

  // 事件监听
  on(
    event: "accountsChanged" | "chainChanged" | "disconnect",
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

    this.provider = await UniversalProvider.init({
      projectId: this.config.projectId,
      relayUrl: this.config.relayUrl,
      metadata: {
        name: "CA App",
        description: "CA App",
        url: window.location.origin,
        icons: [],
      }
    });

    console.log("===>provider", this.provider);

    // 订阅事件
    this.subscribeToEvents();
  }

  async getChainIdFromProvider(): Promise<number | null> {
    if (this.provider) {
      try {
        const chainIdHex = (await this.provider.request({
          method: "eth_chainId",
        })) as string;
        const actualChainId = parseInt(chainIdHex, 16);
        console.log("===> Actual chainId from provider:", actualChainId);
        return actualChainId;
      } catch (error) {
        console.warn("Failed to get chainId from provider:", error);
        return null;
      }
    }
    return null;
  }

  private subscribeToEvents(): void {
    if (!this.provider?.client) return;

    const client = this.provider.client;

    // 会话更新
    client.on("session_update", ({ topic, params }) => {
      if (topic === this.session?.topic) {
        const _session = client.session.get(topic);
        const updatedSession = { ..._session, namespaces: params.namespaces };
        this.onSessionConnected(updatedSession);
        this.emit("accountsChanged", this.state.accounts);
        this.emit("chainChanged", this.state.chainId);
      }
    });

    // 会话删除（钱包断开连接）
    client.on("session_delete", () => {
      this.reset();
      this.emit("disconnect");
    });
  }

  private onSessionConnected(session: SessionTypes.Struct): void {
    const defaultChainId = this.config.defaultChainId!;

    let accounts: Address[] = [];
    let chainId = defaultChainId;

    // 从session中提取账户信息
    if (session.namespaces.eip155) {
      const eip155Namespace = session.namespaces.eip155;

      // 查找默认链上的账户
      accounts = eip155Namespace.accounts
        .filter((account) => account.startsWith(`eip155:${chainId}:`))
        .map((account) => {
          const parts = account.split(":");
          return parts[2] as Address;
        });
    }

    console.log("===>accounts from session", accounts, chainId);

    this.state = { accounts, chainId, connected: true };
    this.emit("accountsChanged", this.state);
    console.log("Session connected:", { accounts, chainId });
  }

  private getRequiredNamespaces() {
    return {
      eip155: {
        methods: ["eth_sendTransaction", "personal_sign", "eth_signTypedData"],
        chains: this.config.chains.map((chain) => `eip155:${chain.id}`),
        events: ["accountsChanged", "chainChanged"],
      },
    };
  }

  private getChain(id: number): Chain {
    const chain = this.config.chains.find((c) => c.id === id);
    if (!chain) throw new Error(`Chain not configured: ${id}`);
    return chain;
  }

  private reset(): void {
    this.session = undefined;
    this.state = { accounts: [], chainId: null, connected: false };
  }

  private emit(
    event: "accountsChanged" | "chainChanged" | "disconnect",
    ...args: any[]
  ): void {
    for (const listener of this.listeners[event]) {
      listener(...args);
    }
  }

  private async generateQRCodeDataUrl(uri: string): Promise<string> {
    return new Promise((resolve, reject) => {
      const canvas = document.createElement("canvas");
      QRCode.toCanvas(
        canvas,
        uri,
        {
          width: 256,
          margin: 2,
          color: { dark: "#000000", light: "#FFFFFF" },
        },
        (error) => {
          if (error) {
            reject(error);
          } else {
            resolve(canvas.toDataURL("image/png"));
          }
        }
      );
    });
  }
}
