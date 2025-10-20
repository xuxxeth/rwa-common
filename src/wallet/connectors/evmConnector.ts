import {
  createPublicClient,
  createWalletClient,
  custom,
  http,
  type Address,
  type Chain,
} from "viem";
import { defaultChains } from "../config/chains";
import {
  ConnectorType,
  DiscoveredWallet,
  EIP1193Provider,
  IEvmConnector,
  WalletState,
} from "../types";

// 常量定义
const DEFAULT_STORAGE_KEY = "ca-wallet-sdk:session";
const USER_REJECTED_ERROR_CODE = 4001;

type Listener = (...args: any[]) => void;
type EventType = "accountsChanged" | "chainChanged" | "disconnect";

interface EvmConnectorConfig {
  chains?: Chain[];
  defaultChainId?: number;
  storageKey?: string;
  projectId?: string; // 保持接口兼容性
}

interface PersistedData {
  walletId: string;
  chainId: number;
  accounts: Address[];
}

export class EvmConnector implements IEvmConnector {
  // 单例模式
  private static instance: EvmConnector | null = null;

  // 公共属性
  public connectorType: ConnectorType = "injected";
  public chains: Chain[];
  public defaultChainId: number;
  public state: WalletState = {
    accounts: [],
    chainId: null,
    connected: false,
  };

  // 私有属性
  private storageKey: string;
  private wallet?: DiscoveredWallet;
  private providerHandlers: Record<EventType, Listener | null> = {
    accountsChanged: null,
    chainChanged: null,
    disconnect: null,
  };
  private listeners: Record<EventType, Listener[]> = {
    accountsChanged: [],
    chainChanged: [],
    disconnect: [],
  };

  private constructor(config: EvmConnectorConfig = {}) {
    this.chains = config.chains ? [...config.chains] : [...defaultChains];
    this.defaultChainId = config.defaultChainId ?? this.chains[0]?.id ?? 1;
    this.storageKey = config.storageKey ?? DEFAULT_STORAGE_KEY;
  }

  public static getInstance(config: EvmConnectorConfig): EvmConnector {
    if (!EvmConnector.instance) {
      EvmConnector.instance = new EvmConnector(config);
    }
    return EvmConnector.instance;
  }

  // 连接钱包
  async connect(wallet: DiscoveredWallet): Promise<WalletState> {
    try {
      // 断开现有连接
      if (this.wallet) {
        await this.disconnect();
      }

      this.wallet = wallet;
      this.attachEvents(wallet.provider);

      // 请求账户访问权限
      const accounts = await this.requestAccounts(wallet.provider);
      const chainId = await this.getCurrentChainId(wallet.provider);

      this.state = {
        accounts,
        chainId,
        connected: accounts.length > 0,
      };

      return this.state;
    } catch (error) {
      console.error("EvmConnector connection failed:", error);
      throw error;
    }
  }

  // 断开连接
  async disconnect(): Promise<void> {
    console.log("===> EvmConnector disconnecting...");
    try {
      // 尝试调用钱包的断开连接方法
      const provider = this.wallet?.provider as any;
      if (provider?.disconnect) {
        await provider.disconnect();
      }
    } catch (error) {
      console.warn("Error during provider disconnect:", error);
    }

    this.detachEvents();
    this.wallet = undefined;
    this.state = { accounts: [], chainId: null, connected: false };
    this.clearPersisted();
    this.emit("disconnect");
  }

  // 切换链
  async switchChain(targetChainId: number): Promise<void> {
    const provider = this.getProvider();
    if (!provider) {
      throw new Error("Provider not available");
    }

    try {
      // 尝试切换链
      await provider.request({
        method: "wallet_switchEthereumChain",
        params: [{ chainId: `0x${targetChainId.toString(16)}` }],
      });
    } catch (error: any) {
      // 如果链不存在，尝试添加链
      if (error.code === 4902) {
        // await this.addChain(targetChainId);
      } else {
        throw error;
      }
    }

    this.state.chainId = targetChainId;
    this.persistCurrentState();
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
    const targetChainId = chainId ?? this.state.chainId ?? this.defaultChainId;
    const chain = this.getChain(targetChainId);
    return createPublicClient({ chain, transport: http() });
  }

  // 获取钱包客户端
  getWalletClient(chainId?: number) {
    const targetChainId = chainId ?? this.state.chainId ?? this.defaultChainId;
    const chain = this.getChain(targetChainId);
    const provider = this.getProvider();

    if (!provider) {
      throw new Error("Provider not available");
    }

    return createWalletClient({
      chain,
      transport: custom(provider),
    });
  }

  // 获取连接器类型
  getConnectorType(): ConnectorType | undefined {
    return this.connectorType;
  }

  // 获取Provider
  getProvider(): EIP1193Provider | null {
    return this.wallet?.provider ?? null;
  }

  // 事件监听
  on(event: EventType, cb: Listener) {
    this.listeners[event].push(cb);
    return () => this.off(event, cb);
  }

  // 移除事件监听
  off(event: EventType, cb: Listener) {
    this.listeners[event] = this.listeners[event].filter((l) => l !== cb);
  }

  // 私有方法
  private async requestAccounts(provider: EIP1193Provider): Promise<Address[]> {
    try {
      const accounts = (await provider.request({
        method: "eth_requestAccounts",
      })) as Address[];

      console.log("Accounts obtained:", accounts);
      return accounts;
    } catch (error: any) {
      if (error.code === USER_REJECTED_ERROR_CODE) {
        console.warn("User rejected connection");
        return [];
      }
      throw error;
    }
  }

  private async getCurrentChainId(provider: EIP1193Provider): Promise<number> {
    const chainIdHex = (await provider.request({
      method: "eth_chainId",
    })) as string;
    return parseInt(chainIdHex, 16);
  }

  // 不自动添加链(之后去掉)
  // private async addChain(targetChainId: number): Promise<void> {
  //   const provider = this.getProvider();
  //   if (!provider) return;

  //   const chain = this.getChain(targetChainId);
  //   await provider.request({
  //     method: "wallet_addEthereumChain",
  //     params: [
  //       {
  //         chainId: `0x${chain.id.toString(16)}`,
  //         chainName: chain.name,
  //         nativeCurrency: chain.nativeCurrency ?? {
  //           name: "ETH",
  //           symbol: "ETH",
  //           decimals: 18,
  //         },
  //         rpcUrls: chain.rpcUrls.default.http,
  //       },
  //     ],
  //   });
  // }

  private getChain(id: number): Chain {
    const chain = this.chains.find((c) => c.id === id);
    if (!chain) {
      throw new Error(`Chain not supported: ${id}`);
    }
    return chain;
  }

  private attachEvents(provider: EIP1193Provider): void {
    this.detachEvents();

    // 账户变化事件
    this.providerHandlers.accountsChanged = (accounts: Address[]) => {
      this.state.accounts = accounts;
      this.state.connected = accounts.length > 0;
      this.emit("accountsChanged", accounts);
      this.persistCurrentState();
    };

    // 链变化事件
    this.providerHandlers.chainChanged = (chainIdHex: string) => {
      const chainId = parseInt(chainIdHex, 16);
      this.state.chainId = chainId;
      this.emit("chainChanged", chainId);
      this.persistCurrentState();
    };

    // 断开连接事件
    this.providerHandlers.disconnect = () => {
      this.disconnect();
    };

    // 绑定事件监听器
    provider.on?.("accountsChanged", this.providerHandlers.accountsChanged!);
    provider.on?.("chainChanged", this.providerHandlers.chainChanged!);
    provider.on?.("disconnect", this.providerHandlers.disconnect!);
  }

  private detachEvents(): void {
    const provider = this.wallet?.provider;
    if (!provider || !this.providerHandlers) return;

    // 移除所有事件监听器
    Object.entries(this.providerHandlers).forEach(([event, handler]) => {
      if (handler) {
        provider.removeListener?.(event, handler);
      }
    });

    // 清空处理器
    this.providerHandlers = {
      accountsChanged: null,
      chainChanged: null,
      disconnect: null,
    };
  }

  private emit(event: EventType, ...args: any[]): void {
    this.listeners[event].forEach((listener) => listener(...args));
  }

  private persistCurrentState(): void {
    if (!this.wallet) return;

    const data: PersistedData = {
      walletId: this.wallet.info.uuid || "",
      chainId: this.state.chainId!,
      accounts: this.state.accounts,
    };

    this.persist(data);
  }

  private persist(data: PersistedData): void {
    try {
      localStorage.setItem(this.storageKey, JSON.stringify(data));
    } catch (error) {
      console.warn("Failed to persist data:", error);
    }
  }

  private clearPersisted(): void {
    try {
      localStorage.removeItem(this.storageKey);
    } catch (error) {
      console.warn("Failed to clear persisted data:", error);
    }
  }
}
