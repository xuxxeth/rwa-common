
import { erc20Abi, type GetContractReturnType, type PublicClient } from 'viem'

export  type PlaceOrderProps = {
  stockId: string,
  tradeType: string,
  side: string,
  tif: string,
  sessionType: string,
  paymentToken: string, // address
  validDate: string, // s
  networkFee: string,
  amount: string,
  price: string,
  size: string
}



export type ERC20Contract = GetContractReturnType<typeof erc20Abi, PublicClient>

export const SessionType = {
  DEFAULT: 0,
  PRE_MARKET: 1,
  AFTER_HOURS: 2,
  DARK_POOL: 3,
  PRE_MARKET_AND_AFTER_HOURS: 4
} as const;

export type SessionType = typeof SessionType[keyof typeof SessionType];

export const NetworkFeeType = {
  NATIVE: 0,
  STABLE: 1
}
export type NetworkFeeType = typeof NetworkFeeType[keyof typeof NetworkFeeType];

export const TradeType = {
  LIMIT: 0,
  MARKET: 1
}
export type TradeType = typeof TradeType[keyof typeof TradeType];

export const Side = {
  BUYLIMIT: 0,
  SELL: 1
}
export type Side = typeof Side[keyof typeof Side];

export const Tif = {
  DAY: 0,
  GTD: 1,
  GTC: 2,
}
export type Tif = typeof Tif[keyof typeof Tif];