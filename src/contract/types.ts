
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