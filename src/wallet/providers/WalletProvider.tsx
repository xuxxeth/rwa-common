import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import type { Address, Chain } from "viem";
import { discoverWallets } from "./eip6963";
import {
  ConnectorType,
  DiscoveredWallet,
  IWalletConnector,
  ManagerConfig,
  WalletState,
  WalletConfig,
  QrCodeData,
} from "../types";
import {
  DEFAULT_CHAIN_ID,
  DEFAULT_PROJECT_ID,
  DEFAULT_RELAY_URL,
} from "../config/constants";
import { EvmConnector } from "../connectors/evmConnector";
import { WalletConnectConnector } from "../connectors/walletConnectConnector";
import storage from "../../utils/storage";
import { defaultSupportedWallets, getWalletUniqueKey } from "../config/wallet";

// 类型定义
type WalletContextValue = {
  connector: IWalletConnector | null;
  state: WalletState;
  wallets: WalletConfig[];
  chains: Chain[];
  connect: (type: ConnectorType, wallet?: WalletConfig) => Promise<void>;
  disconnect: () => Promise<void>;
  isConnecting: boolean;
  error: string | null;
};

// 默认配置
export const defaultConfig = {
  projectId: DEFAULT_PROJECT_ID,
  relayUrl: DEFAULT_RELAY_URL,
  chains: [],
};

// 本地存储键名
const STORAGE_KEYS = {
  CONNECTOR_TYPE: "ca-wallet:connectorType",
  DEFAULT_CHAIN_ID: DEFAULT_CHAIN_ID,
} as const;

const WalletContext = createContext<WalletContextValue | undefined>(undefined);

// 自定义 Hook：钱包发现和合并
export function useWalletDiscovery() {
  const [wallets, setWallets] = useState<WalletConfig[]>(
    defaultSupportedWallets
  );

  useEffect(() => {
    let mounted = true;

    const discoverAndMergeWallets = async () => {
      try {
        const discoveredWallets = await discoverWallets();
        if (!mounted) return;

        // 合并发现的钱包和默认支持的钱包
        const mergedWallets: WalletConfig[] = defaultSupportedWallets
          .map((wallet) => {
            const discoveredWallet = discoveredWallets.find(
              (w) =>
                getWalletUniqueKey(w.info) === getWalletUniqueKey(wallet.info)
            );

            if (discoveredWallet) {
              return {
                ...wallet,
                ...discoveredWallet,
                detected: true,
              };
            }
            return wallet;
          })
          .sort((a, b) => {
            // 已检测的钱包排在前面
            if (a.detected && !b.detected) return -1;
            if (!a.detected && b.detected) return 1;
            return 0;
          });

        setWallets(mergedWallets);
      } catch (error) {
        console.error("Wallet discovery failed:", error);
      }
    };

    discoverAndMergeWallets();

    return () => {
      mounted = false;
    };
  }, []);

  return wallets;
}

// 自定义 Hook：连接器管理
export function useConnectorManager(
  config?: ManagerConfig & { chains?: Chain[] }
) {
  const evmConnector = useRef<EvmConnector | null>(null);
  const walletConnectConnector = useRef<WalletConnectConnector | null>(null);
  const [chains, setChains] = useState<Chain[]>([]);

  useEffect(() => {
    if (config?.chains && config.chains.length > 0) {
      const mergedConfig = { ...defaultConfig, ...config };

      // 初始化连接器实例
      evmConnector.current = EvmConnector.getInstance(mergedConfig);
      walletConnectConnector.current =
        WalletConnectConnector.getInstance(mergedConfig);
      setChains(mergedConfig.chains);
    }
  }, [config]);

  return {
    evmConnector: evmConnector.current,
    walletConnectConnector: walletConnectConnector.current,
    chains,
  };
}

// 自定义 Hook：连接状态管理
export function useConnectionState(config?: ManagerConfig) {
  const [connector, setConnector] = useState<IWalletConnector | null>(null);
  const [state, setState] = useState<WalletState>({
    accounts: [],
    chainId: null,
    connected: false,
  });
  const [isConnecting, setIsConnecting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // 事件监听器
  useEffect(() => {
    if (!connector) return;

    const handleAccountsChanged = (accounts: Address[]) => {
      setState((prev) => ({ ...prev, accounts }));
    };

    const handleChainChanged = (chainId: number) => {
      // 这里要判断一下，如果是非支持的链，则不进行存储操作
      const chains = config?.chains || []
      const nowChain = chains.find(chain => chain.id === chainId)
      let _chainId: number | null = null;
      if (nowChain) {
        _chainId = nowChain.id
      } 
      
      setState((prev) => ({ ...prev, chainId: _chainId }));
      storage.setItem(STORAGE_KEYS.DEFAULT_CHAIN_ID, _chainId || '');
    };

    const handleDisconnect = () => {
      setConnector(null);
      setState({ accounts: [], chainId: null, connected: false });
      localStorage.removeItem(STORAGE_KEYS.CONNECTOR_TYPE);
    };

    // 订阅事件
    const unsubscribeAccounts = connector.on(
      "accountsChanged",
      handleAccountsChanged
    );
    const unsubscribeChain = connector.on("chainChanged", handleChainChanged);
    const unsubscribeDisconnect = connector.on("disconnect", handleDisconnect);

    return () => {
      unsubscribeAccounts();
      unsubscribeChain();
      unsubscribeDisconnect();
    };
  }, [connector]);

  return {
    connector,
    state,
    isConnecting,
    error,
    setConnector,
    setState,
    setIsConnecting,
    setError,
  };
}

export function WalletProvider({
  children,
  config,
}: {
  children: React.ReactNode;
  config?: ManagerConfig & { chains?: Chain[] };
}) {
  // 使用自定义 Hook 管理不同关注点
  const wallets = useWalletDiscovery();
  const { evmConnector, walletConnectConnector, chains } =
    useConnectorManager(config);
  const {
    connector,
    state,
    isConnecting,
    error,
    setConnector,
    setState,
    setIsConnecting,
    setError,
  } = useConnectionState(config);

  // 连接钱包
  const connect = useCallback(
    async (type: ConnectorType, wallet?: WalletConfig) => {
      try {
        setIsConnecting(true);
        setError(null);

        let activeConnector: IWalletConnector | null = null;
        let connectionResult: WalletState;

        switch (type) {
          case ConnectorType.Injected:
            if (!evmConnector || !wallet) {
              throw new Error(
                "Injected wallet connector or wallet config is required"
              );
            }
            activeConnector = evmConnector;
            setConnector(activeConnector);
            connectionResult = await evmConnector.connect(
              wallet as DiscoveredWallet
            );
            break;

          case ConnectorType.WalletConnect:
            if (!walletConnectConnector) {
              throw new Error("WalletConnect connector is not initialized");
            }
            activeConnector = walletConnectConnector;
            setConnector(activeConnector);
            connectionResult = await walletConnectConnector.connect(wallet);
            break;

          default:
            throw new Error(`Unsupported connector type: ${type}`);
        }

        setState(connectionResult);

        // 持久化连接类型
        localStorage.setItem(STORAGE_KEYS.CONNECTOR_TYPE, type);
      } catch (err) {
        const errorMessage =
          err instanceof Error ? err.message : "Connection failed";
        setError(errorMessage);
        console.error("Wallet connection failed:", err);
        throw err;
      } finally {
        setIsConnecting(false);
      }
    },
    [evmConnector, walletConnectConnector]
  );

  // 断开连接
  const disconnect = useCallback(async () => {
    try {
      if (connector) {
        await connector.disconnect();
      }
      // 状态会在事件监听器中自动更新
    } catch (err) {
      console.error("Wallet disconnection failed:", err);
      setError("Disconnection failed");
    }
  }, [connector]);

  // 初始化默认链ID
  useEffect(() => {
    if (config?.defaultChainId) {
      const storedChainId = storage.getItem(STORAGE_KEYS.DEFAULT_CHAIN_ID);
      // 这里要判断一下，如果是非支持的链，则使用默认链
      const defaultChainId = storedChainId || config.defaultChainId;
      setState((prev) => ({ ...prev, chainId: defaultChainId }));
    }
  }, [config?.defaultChainId]);

  // 构建上下文值
  const contextValue = useMemo<WalletContextValue>(
    () => ({
      connector,
      state,
      wallets,
      chains,
      connect,
      disconnect,
      isConnecting,
      error,
    }),
    [
      connector,
      state,
      wallets,
      chains,
      connect,
      disconnect,
      isConnecting,
      error,
    ]
  );

  return (
    <WalletContext.Provider value={contextValue}>
      {children}
    </WalletContext.Provider>
  );
}

export function useWalletContext() {
  const context = useContext(WalletContext);
  if (!context) {
    throw new Error("useWalletContext must be used within a WalletProvider");
  }
  return context;
}
