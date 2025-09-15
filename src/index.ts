export { Button } from './components/button'
export { WalletProvider } from './wallet/providers//WalletProvider'
export * from './wallet'
export * from './contract'

export { ConnectorType, ChainId } from './wallet/types';

// 导出纯类型
export type {
  EIP1193Provider,
  WalletInfo,
  DiscoveredWallet,
  ManagerConfig,
  WalletState,
  ConnectType,
  IWalletConnector,
} from './wallet/types';

