import { useCallback, useState } from "react";
import { useTadingContract } from "./useContract";
import { PlaceOrderProps } from "../types";
import { useAccount } from "../../wallet";
import { ApprovalState, useApprove } from "./useApprove";
import { Address } from "viem";
import { waitForTransactionReceipt } from 'viem/actions'
import { useCallWithGasPrice } from "./useCallWithGasPrice";
import { useClient } from "../../wallet/hooks/useClient";
import { parseErrorFromMessage } from "../../utils/parseError";


export function useTrading(token: Address, amount: BigInt) {
  const tradingContract = useTadingContract()
  const account = useAccount()
  const { publicClient } = useClient()
  const { callWithGasPrice } = useCallWithGasPrice()
  const { approvalState, approveCallback, refetchAllowance, currentAllowance } = useApprove(token, tradingContract?.address, amount)

  const placeOrder = useCallback(async (params: PlaceOrderProps, options?: { wait?: boolean}) => {
    try {
      if (tradingContract && account && publicClient) {
        if (approvalState !== ApprovalState.APPROVED) {
          const hash = await approveCallback()
          console.log(hash)
          if (!hash) {
            throw new Error('approve failed') 
          } 
          // 等待交易确认
          const receipt = await waitForTransactionReceipt(publicClient, hash)
          if (receipt.status === 'success') {
            refetchAllowance()
          }
          console.log('ApprovalState: ', approvalState)
          return
        }
        // @ts-ignore
        const hash = await callWithGasPrice(tradingContract, 'placeOrder', [params])
        if (options?.wait) {
          // 2. 等待交易上链并确认
          const receipt = await waitForTransactionReceipt(publicClient, hash)

          console.log("交易完成 ✅", receipt)
          return {
            code: 1,
            data: receipt
          }
        }
        console.log("交易完成 ✅", hash)
        return {
          code: 1,
          data: { transactionHash: hash }
        }
        
      }
      return {
        code: -1,
        message: 'no contract or account'
      }
    } catch (error: any) {
      const errorMessage = parseErrorFromMessage(error)
      // parseViemErrorFromString(error['cause'].toString())
      return {
        code: -1,
        message: {
          selector: errorMessage?.selector,
          name: errorMessage?.name
        }
      }
    }
  }, [
    tradingContract, 
    account, 
    approvalState, 
    publicClient, 
    approveCallback, 
    callWithGasPrice, 
    refetchAllowance
  ])

  return {
    approvalState: approvalState,
    allowance: currentAllowance,
    contract: tradingContract,
    approveCallback,
    placeOrder
  }
}