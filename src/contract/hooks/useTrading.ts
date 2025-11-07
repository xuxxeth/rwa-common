import { useCallback, useState } from "react";
import { useTradingContract } from "./useContract";
import { ApprovalState, PlaceOrderProps } from "../types";
import { useAccount } from "../../wallet";
import { useApprove } from "./useApprove";
import { Address } from "viem";
import { waitForTransactionReceipt } from 'viem/actions'
import { useCallWithGasPrice } from "./useCallWithGasPrice";
import { useClient } from "../../wallet/hooks/useClient";
import { extractErrorNameAndCode, getAppErrorMessageFromCode, getUserRejection, parseErrorFromMessage } from "../../utils/parseError";
import { ERROR_CODE, RESPONSE_CODE } from "../../utils/constants";


export function useTrading(token: Address, spender?: Address, amount: BigInt = BigInt(0)) {
  const tradingContract = useTradingContract(spender)
  const account = useAccount()
  const { publicClient } = useClient()
  const { callWithGasPrice } = useCallWithGasPrice()
  const { approvalState, approveCallback, refetchAllowance, currentAllowance } = useApprove(token, spender, amount)

  const approve = useCallback(async () => {
    try {
      if (tradingContract && account && publicClient) {
        if (approvalState !== ApprovalState.APPROVED) {
          const hash = await approveCallback()
          console.log(hash)
          if (!hash) {
            return {
              code: RESPONSE_CODE.ERROR,
              data: {
                errorCode: ERROR_CODE.TXERROR,
                name: 'tx error'
              },
            };
          } 
          // 等待交易确认
          const receipt = await waitForTransactionReceipt(publicClient, hash)
          console.log("交易完成 ✅", receipt)
          if (receipt.status === 'success') {
            refetchAllowance()
            return {
              code: RESPONSE_CODE.SUCCESS,
              data: receipt,
            };
          }
          return {
            code: RESPONSE_CODE.ERROR,
            data: {
              errorCode: ERROR_CODE.TXERROR,
              name: 'tx error'
            },
          };
        }
        
      }
      return {
        code: RESPONSE_CODE.ERROR,
        data: {
          errorCode: ERROR_CODE.NOCONTRACT,
          message: "no contract or account",
        }
      };
    } catch (error: any) {
      let errorMessage: any = getUserRejection(error.toString())

      return {
        code: RESPONSE_CODE.ERROR,
        data: {
          errorCode: errorMessage?.code,
          name: errorMessage?.name,
          message: errorMessage?.code === ERROR_CODE.USERREJECT ? 'userReject' : 'UnknownErro',
        }
      };
    }
  }, [
    account, 
    approvalState, 
    publicClient, 
    approveCallback, 
    refetchAllowance
  ])

  const placeOrder = useCallback(async (params: PlaceOrderProps, options?: { wait?: boolean, value?: string}) => {
    try {
      if (tradingContract && account && publicClient) {
        // @ts-ignore
        const hash = await callWithGasPrice(tradingContract, 'placeOrder', [params], {value: options?.value})
        if (options?.wait) {
          // 2. 等待交易上链并确认
          const receipt = await waitForTransactionReceipt(publicClient, hash)
          console.log("交易完成 ✅", receipt)
          if (receipt.status === 'success') {
            refetchAllowance()
            return {
              code: RESPONSE_CODE.SUCCESS,
              data: receipt,
            };
          }
          return {
            code: RESPONSE_CODE.ERROR,
            data: {
              errorCode: ERROR_CODE.TXERROR,
              name: 'tx error'
            },
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
          errorCode: ERROR_CODE.NOCONTRACT,
          message: "no contract or account",
        }
      };
    } catch (error: any) {
      console.log(error.toString())
      let errorMessage: any = getUserRejection(error.toString())
      if (!errorMessage || !errorMessage.code) {
        errorMessage = extractErrorNameAndCode(error.toString());
      }
      if (!errorMessage) {
        errorMessage = parseErrorFromMessage(error.toString())
      }
      return {
        code: RESPONSE_CODE.ERROR,
        data: {
          errorCode: errorMessage?.code,
          name: errorMessage?.name,
          message: errorMessage?.code === ERROR_CODE.USERREJECT ? 'userReject' : 
            getAppErrorMessageFromCode(errorMessage) || errorMessage?.name?.slice(0, errorMessage?.name?.indexOf('(') > -1 ? errorMessage?.name?.indexOf('(') : 10000),
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
    refetchAllowance,
    approve,
    placeOrder
  }
}