import type { Address, Chain } from "viem";
import { bsc, bscTestnet, xLayer, xLayerTestnet } from "./config/chains";
import type UniversalProvider from "@walletconnect/universal-provider";

export type EIP1193Provider = {
  request(args: { method: string; params?: any[] | object }): Promise<any>;
  on?: (event: string, listener: (...args: any[]) => void) => void;
  removeListener?: (event: string, listener: (...args: any[]) => void) => void;
  isMetaMask?: boolean;
  isOKXWallet?: boolean;
  isCoinbaseWallet?: boolean;
  id?: string;
};

export type WalletType = 'walletConnect' | 'binance' | 'okx' | 'metamask';

export interface WalletConfig {
  info: WalletInfo;
  detected: boolean;
  provider?: EIP1193Provider;
  type: WalletType
}

export type WalletInfo = {
  // uuid 每次都是监听到的都是变化的, 不能作为唯一标识
  uuid?: string;
  name: string;
  icon?: string;
  rdns?: string;
};

export type DiscoveredWallet = {
  info: WalletInfo;
  provider: EIP1193Provider;
};

export type ManagerConfig = {
  chains?: Chain[];
  defaultChainId?: number;
  storageKey?: string;
};

export interface WalletState {
  accounts: Address[];
  chainId: number | null;
  connected: boolean;
  wallet?: DiscoveredWallet;
}

export interface QrCodeData {
  uri: string
  dataUrl: string;
}

export type ConnectType = DiscoveredWallet | { chainId?: number };

export interface IWalletConnector {
  connect(
    wallet?: DiscoveredWallet | WalletConfig
  ): Promise<WalletState & { qrCodeData?: QrCodeData }>;
  disconnect(): Promise<void>;
  switchChain(chainId: number): Promise<void>;
  getAccount(): Address | null;
  getAccounts(): Address[];
  getChainId(): number | null;
  getPublicClient(chainId?: number): any;
  getConnectorType(): ConnectorType | undefined;
  getProvider(): EIP1193Provider | UniversalProvider | null;
  on(
    event: "accountsChanged" | "chainChanged" | "disconnect" | "qrCodeDataChanged",
    cb: (...args: any[]) => void
  ): () => void;
}

export interface IEvmConnector extends IWalletConnector {

}

export interface IWalletConnectConnector extends IWalletConnector {
  getQrCodeData(): QrCodeData | null;
}

// export enum ConnectorType {
//   Injected = 'injected',
//   WalletConnect = 'walletconnect',
// }

export const ConnectorType = {
  Injected: "injected",
  WalletConnect: "walletconnect",
} as const;

export type ConnectorType = (typeof ConnectorType)[keyof typeof ConnectorType];

// export enum ChainId {
//   BSC = bsc.id,
//   XLAYER = xLayer.id,
//   BSCTEST  = bscTestnet.id,
//   XLAYERTEST = xLayerTestnet.id
// }

export const ChainId = {
  BSC: bsc.id,
  XLAYER: xLayer.id,
  BSCTEST: bscTestnet.id,
  XLAYERTEST: xLayerTestnet.id,
} as const;

export type ChainId = (typeof ChainId)[keyof typeof ChainId];
