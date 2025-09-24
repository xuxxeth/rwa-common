import React, { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react'
import type { Chain, Client } from 'viem'
import { discoverWallets } from './eip6963'
import { ConnectorType, DiscoveredWallet, IWalletConnector, ManagerConfig, WalletState } from '../types'
import { DEFAULT_CHAIN_ID, DEFAULT_PROJECT_ID, DEFAULT_RELAY_URL } from '../config/constants'
import { EvmConnector } from '../connectors/evmConnector'
import { WalletConnectConnector } from '../connectors/walletConnectConnector'
import storage from '../../utils/storage'

type WalletContextValue = {
  connector: IWalletConnector | null;
  state: WalletState;
  wallets: DiscoveredWallet[];
  chains: Chain[];
  connect: (type: ConnectorType, wallet: DiscoveredWallet) => Promise<void>;
  disconnect: () => Promise<void>;
};

export const defaultConfig = {projectId: DEFAULT_PROJECT_ID, relayUrl: DEFAULT_RELAY_URL, chains: []}

const WalletContext = createContext<WalletContextValue | undefined>(undefined);

export function WalletProvider({ children, config }: { children: React.ReactNode; config?: ManagerConfig & { chains?: Chain[] } }) {
  const evmConnector = useRef<EvmConnector | null>(null)
  const walletConnectConnector = useRef<WalletConnectConnector | null>(null)

  const [connector, setConnector] = useState<IWalletConnector | null>(null);
  const [state, setState] = useState<WalletState>({
    accounts: [],
    chainId: null,
    connected: false,
  });
  const [wallets, setWallets] = useState<DiscoveredWallet[]>([])
  const [chains, setChains] = useState<Chain[]>([])

  useEffect(() => {
    console.log('WalletProvider config: ', config)
    if (config?.chains && config?.chains?.length > 0) {
      const _config = {...defaultConfig, ...config}
      evmConnector.current = EvmConnector.getInstance(_config)
      walletConnectConnector.current = WalletConnectConnector.getInstance(_config)
      const defaultChainId = storage.getItem(DEFAULT_CHAIN_ID) || _config.defaultChainId
      setState((s) => ({ ...s, chainId: defaultChainId }))
      setChains(_config.chains)
    }
    
  }, [config])


  const connect = useCallback(async (type: ConnectorType, wallet: DiscoveredWallet) => {
    let connector: EvmConnector | WalletConnectConnector | null = evmConnector.current
    if (ConnectorType.WalletConnect === type) {
      connector = walletConnectConnector.current
    }
    const newState = await connector?.connect(wallet);
    setConnector(connector);
    // @ts-ignore
    setState({ ...newState });

    // 持久化当前选择
    localStorage.setItem("ca-wallet:connectorType", type);
  }, [evmConnector])

  // disconnect
  async function disconnect() {
    if (connector) {
      await connector.disconnect();
    }
    setConnector(null);
    setState({ accounts: [], chainId: null, connected: false });
    localStorage.removeItem("ca-wallet:connectorType");
  }

  useEffect(() => {
    if (!connector) return
    // 订阅事件
    connector?.on("accountsChanged", (accounts) => {
      setState((s) => ({ ...s, accounts }))
    }
      
    );
    connector?.on("chainChanged", (chainId) =>
      {
        setState((s) => ({ ...s, chainId }))
        storage.setItem(DEFAULT_CHAIN_ID, chainId)
      }
    );
    
    const handleDisconnect = () => {
      console.log("EVENT: disconnected")
      setConnector(null)
      setState({ accounts: [], chainId: null, connected: false })
      localStorage.removeItem("ca-wallet:connectorType")
    }

    const unsubscribe = connector.on("disconnect", handleDisconnect)

    return () => {
      unsubscribe()  // 组件卸载或 connector 变化时解绑
    }
}, [connector])
  // 初始化injected钱包
  useEffect(() => {
    let mounted = true
    discoverWallets().then(async (ws) => {
      if (!mounted) return
      setWallets(ws)
      
    })
    return () => { mounted = false }
  }, [])
  // 初始化walletconnect数据
  useEffect(() => {
    // @ts-ignore
    let interval: NodeJS.Timer;
    if (walletConnectConnector.current && walletConnectConnector.current.origin) {
      const claimedOrigin =
        localStorage.getItem("wallet_connect_dapp_origin") || origin;
      if (claimedOrigin === "unknown") {
        interval = setInterval(
          () => document.getElementById("verify-api")?.remove(),
          500
        );
      }
    }
    return () => {
      clearInterval(interval);
    };
  }, []);

  const prevRelayerValue = useRef<string>("");
  useEffect(() => {
    if (walletConnectConnector.current) {
      if (!walletConnectConnector.current?.client) {
        walletConnectConnector.current.createClient();
      } else if (
        prevRelayerValue.current &&
        prevRelayerValue.current !== walletConnectConnector.current.relayerRegion
      ) {
        walletConnectConnector.current.client.core.relayer.restartTransport(walletConnectConnector.current.relayerRegion);
        prevRelayerValue.current = walletConnectConnector.current.relayerRegion || '';
      }
    }
    
  }, []);

  const value = useMemo<WalletContextValue>(() => ({ connector, state, wallets, chains, connect, disconnect,  }), [connector, state, wallets, chains, connect, disconnect ])
  return <WalletContext.Provider value={value}>{children}</WalletContext.Provider>
}

export function useWalletContext() {
  const ctx = useContext(WalletContext)
  if (!ctx) throw new Error('useWalletCtx must be used within WalletProvider')
  return ctx
}
