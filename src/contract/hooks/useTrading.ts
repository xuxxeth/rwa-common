import { useCallback, useState } from "react";
import { useTadingContract } from "./useContract";
import { PlaceOrderProps } from "../types";
import { useAccount } from "../../wallet";
import { ApprovalState, useApprove } from "./useApprove";
import { Address } from "viem";
import { waitForTransactionReceipt } from 'viem/actions'
import { useCallWithGasPrice } from "./useCallWithGasPrice";
import { useClient } from "../../wallet/hooks/useClient";


export function useTrading(token: Address, spender: Address, amount: BigInt) {
  const tradingContract = useTadingContract()
  const account = useAccount()
  const { publicClient } = useClient()
  const { callWithGasPrice } = useCallWithGasPrice()
  const { approvalState, approveCallback, refetchAllowance } = useApprove(token, spender, amount)

  const placeOrder = useCallback(async (params: PlaceOrderProps) => {
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
        // 2. 等待交易上链并确认
        const receipt = await waitForTransactionReceipt(publicClient, hash)

        console.log("交易完成 ✅", receipt)
        return {
          code: 1,
          data: receipt
        }
      }
      return {
        code: -1,
        message: 'no contract or account'
      }
    } catch (error) {
      console.log(error)
      return {
        code: -1,
        message: error?.toString()
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
    contract: tradingContract,
    approveCallback,
    placeOrder
  }
}