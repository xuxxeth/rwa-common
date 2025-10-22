import { useCallback, useState } from "react";
import { useTradingContract } from "./useContract";
import { PlaceOrderProps } from "../types";
import { useAccount } from "../../wallet";
import { ApprovalState, useApprove } from "./useApprove";
import { Address } from "viem";
import { waitForTransactionReceipt } from 'viem/actions'
import { useCallWithGasPrice } from "./useCallWithGasPrice";
import { useClient } from "../../wallet/hooks/useClient";
import { extractErrorNameAndCode, parseErrorFromMessage, getAppErrorMessageFromCode } from "../../utils/parseError";
import { RESPONSE_CODE } from "../../utils/constants";


export function useTrading(token: Address, spender: Address, amount: BigInt) {
  const tradingContract = useTradingContract()
  const account = useAccount()
  const { publicClient } = useClient()
  const { callWithGasPrice } = useCallWithGasPrice()
  const { approvalState, approveCallback, refetchAllowance, currentAllowance } = useApprove(token, spender, amount)

  const placeOrder = useCallback(async (params: PlaceOrderProps, options?: { wait?: boolean, value?: string}) => {
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
        const hash = await callWithGasPrice(tradingContract, 'placeOrder', [params], {value: options?.value})
        if (options?.wait) {
          // 2. 等待交易上链并确认
          const receipt = await waitForTransactionReceipt(publicClient, hash)

          console.log("交易完成 ✅", receipt)
          return {
            code: RESPONSE_CODE.SUCCESS,
            data: receipt,
          };
        }
        return {
          code: RESPONSE_CODE.SUCCESS,
          data: { transactionHash: hash },
        };
        
      }
      return {
        code: RESPONSE_CODE.ERROR,
        data: {
          errorCode: '-1',
          message: "no contract or account",
        }
      };
    } catch (error: any) {
      const errorMessage = extractErrorNameAndCode(error.toString());
      // parseViemErrorFromString(error['cause'].toString())
      return {
        code: RESPONSE_CODE.ERROR,
        data: {
          errorCode: errorMessage?.code,
          name: errorMessage?.name,
          message: getAppErrorMessageFromCode(errorMessage),
        }
      };
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