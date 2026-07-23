
import { erc20Abi, type GetContractReturnType, type PublicClient } from 'viem'

export  type PlaceOrderProps = {
  stockId: string,
  tradeType: TradeType,
  side: SideType,
  tif: TifType,
  sessionType: SessionType,
  paymentToken: string, // address
  validDate: string, // s
  networkFee: string,
  amount: string,
  price: string,
  size: string,
  clientAddress: string
}

export type ERC20Contract = GetContractReturnType<typeof erc20Abi, PublicClient>

export const SessionType = {
  DEFAULT: 0,
  PRE_MARKET: 1,
  AFTER_HOURS: 2,
  OVERNIGHT: 3,
  PRE_MARKET_AND_AFTER_HOURS: 4
} as const;

export type SessionType = typeof SessionType[keyof typeof SessionType];

export const NetworkFee = {
  NATIVE: 0,
  STABLE: 1
}
export type NetworkFeeType = typeof NetworkFee[keyof typeof NetworkFee];

export const TradeType = {
  LIMIT: 0,
  MARKET: 1
}
export type TradeType = typeof TradeType[keyof typeof TradeType];

export const SideType = {
  BUYLIMIT: 0,
  SELL: 1
}
export type SideType = typeof SideType[keyof typeof SideType];

export const TifType = {
  DAY: 0,
  GTD: 1,
  GTC: 2,
}
export type TifType = typeof TifType[keyof typeof TifType];

export const ApprovalState = {
  UNKNOWN: 0,
  NOT_APPROVED: 1,
  PENDING: 2,
  APPROVED: 3,
}
export type ApprovalState = typeof ApprovalState[keyof typeof ApprovalState];

export const FeeMode = {
  NONE: 0,          // 0: 无
  FIXED_FEE: 1,     // 1: fixed fee, scaled by 1e6
  AMOUNT_RATIO: 2,  // 2: amount-based rate, scaled by 1e8
  PER_SHARE: 3      // 3: size-based rate, scaled by 1e8
}
export type FeeMode = typeof FeeMode[keyof typeof FeeMode];

export type FeeItem = {
  ruleId: number,
  mode: number,            // 每股多少USD
  minMode: number,         // 固定金额
  maxMode: number,         // 按成交金额的一定比例收取
  value: number,           // 每股 0.0035 USD
  minValue: number,        // 固定金额 0.35 USD
  maxValue: number, 
}
export type CommissionConfig = {
  min: number,
  rate: number
}

export  type ExchangeProps = {
  payinToken: string,
  payinAmount: string,
  
}