// src/connectors/eip6963.ts
import {
  createPublicClient,
  createWalletClient,
  custom,
  http,
  type Address,
  type Chain
} from 'viem'
import { defaultChains } from '../config/chains'
import { ConnectorType, ConnectType, DiscoveredWallet, EIP1193Provider, IWalletConnector, WalletState } from '../types'

const DEFAULT_STORAGE_KEY = 'ca-wallet-sdk:session'

type Listener = (...args: any[]) => void

export class EvmConnector implements IWalletConnector {
  private static instance: EvmConnector | null = null
  private providerHandlers: {
    accountsChanged?: (accounts: Address[]) => void;
    chainChanged?: (chainIdHex: string) => void;
    disconnect?: () => void;
  } = {};
  public connectorType?: ConnectorType
  public chains: Chain[]
  public defaultChainId: number
  public state: WalletState = { accounts: [], chainId: null, connected: false }
  private listeners: Record<'accountsChanged'|'chainChanged'|'disconnect', Listener[]> = {
    accountsChanged: [], chainChanged: [], disconnect: []
  }
  private storageKey: string
  private wallet?: DiscoveredWallet

  private constructor(cfg: { chains?: Chain[], defaultChainId?: number, storageKey?: string } = {}, connectorType?: ConnectorType) {
    this.chains = cfg.chains ? [...cfg.chains] : [...defaultChains]
    this.defaultChainId = cfg.defaultChainId ?? this.chains[0].id
    this.storageKey = cfg.storageKey ?? DEFAULT_STORAGE_KEY
    this.connectorType = connectorType
  }
  public static getInstance(cfg: { projectId: string, chains?: Chain[], defaultChainId?: number }, connectorType?: ConnectorType) {
    if (!EvmConnector.instance) {
      EvmConnector.instance = new EvmConnector(cfg, connectorType)
    }
    return EvmConnector.instance
  }

  async connect(wallet: DiscoveredWallet): Promise<WalletState> {
    if (this.wallet) {
      await this.disconnect()
    }
    this.wallet = wallet
    const provider = wallet.provider
    this.attachEvents(provider)

    let accounts: Address[] = []
    try {
      accounts = await provider.request({ method: 'eth_requestAccounts' }) as Address[]
    } catch (err: any) {
      if (err.code === 4001) {
        console.warn('User rejected connection')
        return this.state
      }
      throw err
    }

    const chainIdHex = await provider.request({ method: 'eth_chainId' }) as string
    const currentId = parseInt(chainIdHex, 16)
    this.state = {
      accounts,
      chainId: currentId,
      connected: accounts.length > 0
    }
    this.persist({ walletId: wallet.info.uuid, chainId: this.state.chainId!, accounts })
    return this.state
  }

  async disconnect(): Promise<void> {
    const prov: any = this.wallet?.provider as any
    if (prov?.disconnect) { try { await prov.disconnect() } catch {} }
    this.detachEvents(); // 先移除旧的监听
    // 清空 wallet 和 provider
    this.wallet = undefined

    this.state = { accounts: [], chainId: null, connected: false }
    this.clearPersisted()
    this.emit('disconnect')
  }

  async switchChain(targetChainId: number): Promise<void> {
    const provider = this.getProvider()
    try {
      await provider?.request({ method: 'wallet_switchEthereumChain', params: [{ chainId: '0x' + targetChainId.toString(16) }] })
    } catch (_err) {
      const chain = this.getChain(targetChainId)
      await provider?.request({
        method: 'wallet_addEthereumChain',
        params: [{
          chainId: '0x' + chain.id.toString(16),
          chainName: chain.name,
          nativeCurrency: chain.nativeCurrency ?? { name: 'ETH', symbol: 'ETH', decimals: 18 },
          rpcUrls: chain.rpcUrls.default.http,
        }]
      })
    }
    this.state.chainId = targetChainId
    if (this.wallet) this.persist({ walletId: this.wallet.info.uuid, chainId: targetChainId, accounts: this.state.accounts })
  }
  getConnectorType(): ConnectorType | undefined {
    return this.connectorType
  }
  getAccount(): Address | null {
    return this.state.accounts[0] ?? null
  }
  getAccounts(): Address[] {
    return this.state.accounts
  }
  getChainId(): number | null {
    return this.state.chainId
  }

  getPublicClient(chainId?: number) {
    const chain = this.getChain(chainId ?? this.state.chainId ?? this.defaultChainId)
    return createPublicClient({ chain, transport: http() })
  }
  getWalletClient(chainId?: number) {
    const chain = this.getChain(chainId ?? this.state.chainId ?? this.defaultChainId)
    return createWalletClient({ chain, transport: custom(this.getProvider() as any) })
  }

  public getProvider(): EIP1193Provider | null  {
    if (!this.wallet?.provider) return null
    return this.wallet.provider ?? null
  }
  private getChain(id: number): Chain {
    const chain = this.chains.find(c => c.id === id)
    if (!chain) throw new Error('Chain not supported:' + id)
    return chain
  }

  on(event: 'accountsChanged'|'chainChanged'|'disconnect', cb: Listener) {
    this.listeners[event].push(cb)
    return () => {
      this.off(event, cb)
    }
  }
  off(event: 'accountsChanged' | 'chainChanged' | 'disconnect', cb: Listener) {
    this.listeners[event] = this.listeners[event].filter(l => l !== cb)
  }
  private emit(event: 'accountsChanged'|'chainChanged'|'disconnect', ...args: any[]) {
    for (const l of this.listeners[event]) l(...args)
  }
  private attachEvents(provider: EIP1193Provider) {
    this.detachEvents(); // 先移除旧的监听

    this.providerHandlers.accountsChanged = (accounts: Address[]) => {
      this.state.accounts = accounts
      this.emit('accountsChanged', accounts)
    };

    this.providerHandlers.chainChanged = (chainIdHex: string) => {
      const id = parseInt(chainIdHex, 16)
      this.state.chainId = id
      this.emit('chainChanged', id)
      if (this.wallet) {
        this.persist({ walletId: this.wallet.info.uuid, chainId: id, accounts: this.state.accounts })
      }
    };

    this.providerHandlers.disconnect = () => {
      this.disconnect()
    };

    provider.on?.('accountsChanged', this.providerHandlers.accountsChanged!)
    provider.on?.('chainChanged', this.providerHandlers.chainChanged!)
    provider.on?.('disconnect', this.providerHandlers.disconnect!)
  }
  private detachEvents() {
    if (!this.wallet?.provider || !this.providerHandlers) return;
    const provider = this.wallet.provider;

    if (this.providerHandlers.accountsChanged) {
      provider.removeListener?.('accountsChanged', this.providerHandlers.accountsChanged);
    }
    if (this.providerHandlers.chainChanged) {
      provider.removeListener?.('chainChanged', this.providerHandlers.chainChanged);
    }
    if (this.providerHandlers.disconnect) {
      provider.removeListener?.('disconnect', this.providerHandlers.disconnect);
    }

    this.providerHandlers = {};
  }

  private persist(data: { walletId: string; chainId: number; accounts: Address[] }) {
    try { localStorage.setItem(this.storageKey, JSON.stringify(data)) } catch {}
  }
  private clearPersisted() {
    try { localStorage.removeItem(this.storageKey) } catch {}
  }
}
