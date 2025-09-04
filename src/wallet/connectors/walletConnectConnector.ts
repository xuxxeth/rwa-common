// src/connectors/walletconnect.ts
import {
  createPublicClient,
  createWalletClient,
  custom,
  http,
  type Address,
  type Chain,
  defineChain,
} from 'viem'
import { AppKit, CaipNetwork, CaipNetworkId, createAppKit } from '@reown/appkit'
import { UniversalProvider, IUniversalProvider } from '@walletconnect/universal-provider'
import { getAppMetadata, getSdkError } from '@walletconnect/utils'
import { defaultChains } from '../config/chains'
import type { ConnectorType, IWalletConnector, WalletState } from './types'
import { DEFAULT_LOGGER, DEFAULT_PROJECT_ID, DEFAULT_RELAY_URL } from '../config/constants'
import { getRequiredNamespaces } from '../../helpers/namespaces'
import { PairingTypes, SessionTypes } from '@walletconnect/types'

type Client = IUniversalProvider["client"];

const mapCaipIdToAppKitCaipNetwork = (caipId: CaipNetworkId): CaipNetwork => {
  const [namespace, chainId] = caipId.split(":");
  const chain = defineChain({
    id: Number(chainId),
    caipNetworkId: caipId,
    chainNamespace: namespace as CaipNetwork["chainNamespace"],
    name: "",
    nativeCurrency: {
      name: "",
      symbol: "",
      decimals: 8,
    },
    rpcUrls: {
      default: { http: ["https://rpc.walletconnect.org/v1"] },
    },
  });

  return chain as CaipNetwork;
};

export const defaultConfig = {projectId: DEFAULT_PROJECT_ID, relayUrl: DEFAULT_RELAY_URL, chains: []}

export class WalletConnectConnector implements IWalletConnector {
  private static instance: WalletConnectConnector | null = null
  public connectorType?: ConnectorType
  public client?: Client
  public provider?: any 
  public pairings: PairingTypes.Struct[] = []
  public session?: SessionTypes.Struct
  public relayerRegion?: string
  public origin?: string

  private state: WalletState = { accounts: [], chainId: null, connected: false }
  private listeners: Record<'accountsChanged'|'chainChanged'|'disconnect', ((...args:any[])=>void)[]> = {
    accountsChanged: [], chainChanged: [], disconnect: []
  }
  private appkit?: AppKit
  private chains: Chain[]
  private defaultChainId: number
  private projectId: string
  private conifg: any
  
  private prevRelayerValue?: string

  private constructor(cfg: { projectId: string, chains?: Chain[], defaultChainId?: number }, connectorType?: ConnectorType) {
    this.conifg = {...defaultConfig, ...cfg}
    this.chains = cfg.chains ?? [...defaultChains]
    this.defaultChainId = cfg.defaultChainId ?? this.chains[0].id
    this.connectorType = connectorType
    this.projectId = cfg.projectId
    this.relayerRegion = this.conifg .relayUrl
    this.origin = getAppMetadata().url
    
  }
  public static getInstance(cfg: { projectId: string, chains?: Chain[], defaultChainId?: number }, connectorType?: ConnectorType) {
    if (!WalletConnectConnector.instance) {
      WalletConnectConnector.instance = new WalletConnectConnector(cfg, connectorType)
    }
    return WalletConnectConnector.instance
  }
  reset() {
    this.session = undefined
    this.state = { accounts: [], chainId: null, connected: false }
    this.chains = []
    this.relayerRegion = this.conifg .relayUrl
  }
  onSessionConnected(_session: SessionTypes.Struct) {
    const allNamespaceAccounts = Object.values(_session.namespaces)
      .map((namespace) => namespace.accounts)
      .flat();
    const allNamespaceChains = Object.keys(_session.namespaces);
    this.session = _session
    // this.chains = allNamespaceChains

    const accounts = allNamespaceAccounts as Address[]
    const chainId = _session!.namespaces.eip155.chains && parseInt(_session!.namespaces.eip155.chains[0].split(':')[1]) || null
    this.state = { accounts, chainId, connected: true }

  }
  async createAppKit(provider: IUniversalProvider) {
    const networks = ["eip155:1"].map((caipId) =>
      mapCaipIdToAppKitCaipNetwork(caipId as CaipNetworkId)
    );
    if (!this.appkit) {
      this.appkit = createAppKit({
        projectId: this.projectId || DEFAULT_PROJECT_ID,
        themeMode: "dark",
        manualWCControl: true,
        // @ts-ignore
        universalProvider: provider,
        networks: [networks[0], ...networks],
        metadata: {
          name: "CA App",
          description: "CA App",
          url: location.origin,
          icons: [],
        },
        includeWalletIds: [],
        allWallets: 'HIDE',
        // enableWalletGuide: false,
        // enableWallets: false,
        showWallets: true,
        enableEIP6963: false, // Disable 6963 by default
        enableInjected: false, // Disable injected by default
        enableCoinbase: false, // Default to true
        enableWalletConnect: true, // Default to true,
        features: {
          email: false,
          socials: false,
          legalCheckbox: true,
        },
      })
    }
  }
  async createClient() {
    if (this.client) return
    try {
      const claimedOrigin =
        localStorage.getItem("wallet_connect_dapp_origin") || origin;
      const provider = await UniversalProvider.init({
        logger: DEFAULT_LOGGER,
        relayUrl: this.relayerRegion,
        projectId: this.projectId,
        metadata: {
          name: "CA App",
          description: "CA App",
          url: claimedOrigin,
          icons: [],
        },
      });
      this.createAppKit(provider)
      const _client = provider.client;

      if (claimedOrigin === "unknown") {
        //@ts-expect-error - private property
        _client.core.verify.verifyUrlV3 = "0xdeafbeef";
        console.log("verify", _client.core.verify);
      }
      this.provider = provider
      this.client = _client
      this.origin = _client.metadata.url
      console.log("metadata url:", _client.metadata);

      this.prevRelayerValue = this.relayerRegion;
      await this._subscribeToEvents(_client);
      await this._checkPersistedState(_client);
      await this._logClientId(_client);

    } catch (err) {
      throw err;
    }
  }

  async connect(pairing: any): Promise<WalletState> {
    if (typeof this.provider === "undefined" || typeof this.client === "undefined") {
      throw new Error("WalletConnect is not initialized");
    }
    try {
      
      console.log("connect, pairing topic is:", pairing?.topic);
      const namespacesToRequest = getRequiredNamespaces(this.chains.map(c => `eip155:${c.id}`));
      this.appkit?.open();

      this.appkit?.subscribeState((state: { open: boolean }) => {
        // the modal was closed so reject the promise
        if (!state.open && !this.provider.session) {
          throw new Error("Connection request reset. Please try again.");
        }
      });
      console.log(namespacesToRequest)
      // this.provider.namespaces = undefined;
      const session = await this.provider.connect({
        pairingTopic: pairing?.topic,
        optionalNamespaces: {
          eip155: {
            chains: this.chains.map(c => `eip155:${c.id}`),
            methods: ['eth_sendTransaction','personal_sign','eth_signTypedData'],
            events: ['accountsChanged','chainChanged']
          }
        }
      });

      if (!session) {
        throw new Error("Session is not connected");
      }
      this.session = session;

      console.log("Established session:", session);
      await this.onSessionConnected(session);
      this.pairings = this.client.pairing.getAll({ active: true })
      console.log("Current active pairings:", this.pairings);

      return this.state
    } catch (e) {
      console.error(e);
      // toast.error((e as Error).message, {
      //   position: "bottom-left",
      // });
      throw e;
    } finally {
      // close modal in case it was open
      this.appkit?.close();
    }

  }

  async disconnect(): Promise<void> {
    if (typeof this.client === "undefined") {
      throw new Error("WalletConnect is not initialized");
    }
    if (typeof this.session === "undefined") {
      throw new Error("Session is not connected");
    }
    // TODO: 另外一种断开连接方式
    // if (this.provider?.session) {
    //   await this.provider.disconnect()
    // }
    await this.client.disconnect({
      topic: this.session.topic,
      reason: getSdkError("USER_DISCONNECTED"),
    });
    // Reset app state after disconnect.
    this.reset();
    this.emit('disconnect')
  }

  async switchChain(targetChainId: number): Promise<void> {
    // WalletConnect v2 不支持强制切链，只能提示用户在钱包内切换
    console.warn('Please switch chain in wallet app:', targetChainId)
    this.state.chainId = targetChainId
    this.emit('chainChanged', targetChainId)
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
    return createWalletClient({ chain, transport: custom(this.provider as any) })
  }

  on(event: 'accountsChanged'|'chainChanged'|'disconnect', cb: (...args:any[])=>void) {
    this.listeners[event].push(cb)
    return () => {
      this.listeners[event] = this.listeners[event].filter(l => l !== cb)
    }
  }
  private emit(event: 'accountsChanged'|'chainChanged'|'disconnect', ...args:any[]) {
    for (const l of this.listeners[event]) l(...args)
  }
  private getChain(id: number): Chain {
    const chain = this.chains.find(c => c.id === id)
    if (!chain) throw new Error('Chain not configured: ' + id)
    return chain
  }
  private async _subscribeToEvents(_client: Client) {
    if (typeof _client === "undefined") {
      throw new Error("WalletConnect is not initialized");
    }

    _client.on("session_ping", (args) => {
      console.log("EVENT", "session_ping", args);
    });

    _client.on("session_event", (args) => {
      console.log("EVENT", "session_event", args);
    });

    _client.on("session_update", ({ topic, params }) => {
      console.log("EVENT", "session_update", { topic, params });
      const { namespaces } = params;
      const _session = _client.session.get(topic);
      const updatedSession = { ..._session, namespaces };
      this.onSessionConnected(updatedSession);
      this.emit("accountsChanged", this.state.accounts)
      this.emit("chainChanged", this.state.chainId)
    });
    // 手机钱包主动断开
    _client.on("session_delete", () => {
      console.log("EVENT", "session_delete");
      this.reset();
      this.emit("disconnect");
    });

    // 会话过期
    _client.on("session_expire", () => {
      console.log("EVENT", "session_expire");
      this.reset();
      this.emit("disconnect");
    });
  }
  private async _checkPersistedState(_client: Client) {
    if (typeof _client === "undefined") {
      throw new Error("WalletConnect is not initialized");
    }
    this.pairings = _client.pairing.getAll({ active: true })

    console.log(
      "RESTORED PAIRINGS: ",
      _client.pairing.getAll({ active: true })
    );

    if (typeof this.session !== "undefined") return;
    // populates (the last) existing session to state
    if (_client.session.length) {
      const lastKeyIndex = _client.session.keys.length - 1;
      const _session = _client.session.get(
        _client.session.keys[lastKeyIndex]
      );
      console.log("RESTORED SESSION:", _session);
      await this.onSessionConnected(_session);
      return _session;
    }
  }
  private async _logClientId(_client: Client) {
    if (typeof _client === "undefined") {
      throw new Error("WalletConnect is not initialized");
    }
    try {
      const clientId = await _client.core.crypto.getClientId();
      console.log("WalletConnect ClientID: ", clientId);
      localStorage.setItem("WALLETCONNECT_CLIENT_ID", clientId);
    } catch (error) {
      console.error(
        "Failed to set WalletConnect clientId in localStorage: ",
        error
      );
    }
  }
}
