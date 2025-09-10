import type { Address, Chain } from 'viem'

export type EIP1193Provider = {
  request(args: { method: string; params?: any[] | object }): Promise<any>
  on?: (event: string, listener: (...args: any[]) => void) => void
  removeListener?: (event: string, listener: (...args: any[]) => void) => void
  isMetaMask?: boolean
  isOKXWallet?: boolean
  isCoinbaseWallet?: boolean
  id?: string
}

export type WalletInfo = {
  uuid: string
  name: string
  icon?: string
  rdns?: string
}

export type DiscoveredWallet = {
  info: WalletInfo
  provider: EIP1193Provider
}

export type ManagerConfig = {
  chains?: Chain[]
  defaultChainId?: number
  storageKey?: string
}

export interface WalletState {
  accounts: Address[]
  chainId: number | null
  connected: boolean
  wallet?: DiscoveredWallet
}

export type ConnectType = DiscoveredWallet | { chainId?: number }

export interface IWalletConnector {
  connect(params: ConnectType): Promise<WalletState>
  disconnect(): Promise<void>
  switchChain(chainId: number): Promise<void>
  getAccount(): Address | null
  getAccounts(): Address[]
  getChainId(): number | null
  getPublicClient(chainId?: number): any
  getWalletClient(chainId?: number): any
  getConnectorType(): ConnectorType | undefined
  on(event: 'accountsChanged'|'chainChanged'|'disconnect', cb: (...args: any[]) => void): () => void
}

export enum ConnectorType {
  Injected = 'injected',
  WalletConnect = 'walletconnect',
}




