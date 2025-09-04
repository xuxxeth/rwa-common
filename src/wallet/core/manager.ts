import { createPublicClient, createWalletClient, custom, http, type Address, type Chain } from 'viem'
import type { DiscoveredWallet, EIP1193Provider } from '../providers/eip6963'
import { defaultChains } from '../config/chains'

export type WalletState = {
  accounts: Address[]
  chainId: number | null
  connected: boolean
  wallet?: DiscoveredWallet
}

export type ManagerConfig = {
  chains?: Chain[]
  defaultChainId?: number
  storageKey?: string
}

const DEFAULT_STORAGE_KEY = 'ca-wallet-sdk:session'

type Listener = (...args: any[]) => void

export class WalletManager {
  public chains: Chain[]
  public defaultChainId: number
  public state: WalletState = { accounts: [], chainId: null, connected: false }
  private listeners: Record<'accountsChanged'|'chainChanged', Listener[]> = { accountsChanged: [], chainChanged: [] }
  private storageKey: string

  constructor(cfg: ManagerConfig = {}) {
    this.chains = cfg.chains ?? [...defaultChains]
    this.defaultChainId = cfg.defaultChainId ?? this.chains[0].id
    this.storageKey = cfg.storageKey ?? DEFAULT_STORAGE_KEY
  }

  /** connect to a discovered wallet */
  async connect(wallet: DiscoveredWallet, opts?: { chainId?: number }) {
    this.state.wallet = wallet
    this.attachEvents(wallet.provider)

    const accounts = await wallet.provider.request({ method: 'eth_requestAccounts' }) as Address[]
    this.state.accounts = accounts
    const chainIdHex = await wallet.provider.request({ method: 'eth_chainId' }) as string
    const currentId = parseInt(chainIdHex, 16)
    this.state.chainId = opts?.chainId ?? currentId
    this.state.connected = accounts.length > 0

    // persist
    this.persist({ walletId: wallet.info.uuid, chainId: this.state.chainId! })

    return this.state
  }

  /** attempt to restore last session */
  async restore(discovered: DiscoveredWallet[]) {
    const saved = this.readPersisted()
    if (!saved) return null
    const wallet = discovered.find(w => w.info.uuid === saved.walletId)
    if (!wallet) return null
    return await this.connect(wallet, { chainId: saved.chainId })
  }

  /** disconnect (clears persistence) */
  async disconnect() {
    const prov: any = this.state.wallet?.provider as any
    if (prov?.disconnect) { try { await prov.disconnect() } catch {} }
    this.state = { accounts: [], chainId: null, connected: false, wallet: undefined }
    this.clearPersisted()
    return this.state
  }

  /** switch chain, adding it if necessary */
  async switchChain(targetChainId: number) {
    const provider = this.getProvider()
    try {
      await provider.request({ method: 'wallet_switchEthereumChain', params: [{ chainId: '0x' + targetChainId.toString(16) }] })
    } catch (_err) {
      const chain = this.getChain(targetChainId)
      await provider.request({
        method: 'wallet_addEthereumChain',
        params: [{
          chainId: '0x' + chain.id.toString(16),
          chainName: chain.name,
          nativeCurrency: chain.nativeCurrency,
          rpcUrls: chain.rpcUrls.default.http,
          blockExplorerUrls: [chain.blockExplorers?.default.url || '']
        }]
      })
    }
    this.state.chainId = targetChainId
    this.persist({ walletId: this.state.wallet!.info.uuid, chainId: targetChainId })
  }

  /** viem clients */
  getPublicClient(chainId?: number) {
    const chain = this.getChain(chainId ?? this.state.chainId ?? this.defaultChainId)
    return createPublicClient({ chain, transport: http() })
  }
  getWalletClient(chainId?: number) {
    const chain = this.getChain(chainId ?? this.state.chainId ?? this.defaultChainId)
    return createWalletClient({ chain, transport: custom(this.getProvider() as any) })
  }

  /** helpers */
  getProvider(): EIP1193Provider {
    if (!this.state.wallet?.provider) throw new Error('No wallet connected')
    return this.state.wallet.provider
  }
  getChain(id: number): Chain {
    const chain = this.chains.find(c => c.id === id)
    if (!chain) throw new Error('Chain not configured: ' + id)
    return chain
  }

  /** events */
  on(event: 'accountsChanged'|'chainChanged', cb: Listener) {
    this.listeners[event].push(cb)
    return () => {
      this.listeners[event] = this.listeners[event].filter(l => l !== cb)
    }
  }
  private emit(event: 'accountsChanged'|'chainChanged', ...args: any[]) {
    for (const l of this.listeners[event]) l(...args)
  }
  private attachEvents(provider: EIP1193Provider) {
    provider.on?.('accountsChanged', (accounts: Address[]) => {
      this.state.accounts = accounts
      this.emit('accountsChanged', accounts)
    })
    provider.on?.('chainChanged', (chainIdHex: string) => {
      const id = parseInt(chainIdHex, 16)
      this.state.chainId = id
      this.emit('chainChanged', id)
      if (this.state.wallet) this.persist({ walletId: this.state.wallet.info.uuid, chainId: id })
    })
  }

  /** persistence */
  private persist(data: { walletId: string; chainId: number }) {
    try { localStorage.setItem(this.storageKey, JSON.stringify(data)) } catch {}
  }
  private readPersisted(): { walletId: string; chainId: number } | null {
    try {
      const raw = localStorage.getItem(this.storageKey)
      return raw ? JSON.parse(raw) : null
    } catch { return null }
  }
  private clearPersisted() {
    try { localStorage.removeItem(this.storageKey) } catch {}
  }
}
