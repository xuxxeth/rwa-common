export const DEFAULT_LOGGER = "silent"; // debug

export const DEFAULT_PROJECT_ID = '93e5dd06d3b4d5502f099544a68f7c12';
export const DEFAULT_RELAY_URL = 'wss://relay.walletconnect.com';


export const DEFAULT_EIP155_METHODS = {
  ETH_SEND_TRANSACTION: "eth_sendTransaction",
  PERSONAL_SIGN: "personal_sign",
};

export enum DEFAULT_EIP_155_EVENTS {
  ETH_CHAIN_CHANGED = "chainChanged",
  ETH_ACCOUNTS_CHANGED = "accountsChanged",
}

export const CONNECTOR_TYPE = 'CONNECTOR_TYPE';
export const WALLET_UUID = 'WALLET_UUID';
export const DEFAULT_CHAIN_ID = 'DEFAULT_CHAIN_ID';