// src/connectors/types.ts
import type { Address, Chain } from 'viem'
import { DiscoveredWallet } from '../providers/eip6963'

// export type WalletState = {
//   accounts: Address[]
//   chainId: number | null
//   connected: boolean
//   wallet?: DiscoveredWallet
// }

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


