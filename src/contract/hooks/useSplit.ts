import { useCallback, useEffect, useState } from "react";
import { useSplitContract } from "./useContract";
import { ApprovalState, ExchangeProps } from "../types";
import { useAccount } from "../../wallet";
import { useApprove } from "./useApprove";
import { Address, Chain, type PublicClient } from "viem";
import { waitForTransactionReceipt } from 'viem/actions'
import { useCallWithGasPrice } from "./useCallWithGasPrice";
import { useClient } from "../../wallet/hooks/useClient";
import { extractErrorNameAndCode, getAppErrorMessageFromCode, getUserRejection, parseErrorFromMessage } from "../../utils/parseError";
import { ERROR_CODE, RESPONSE_CODE } from "../../utils/constants";
import { waitForReceiptWithRetry } from "./useTrading";


export function useSplit(token?: Address, spender?: Address, amount: BigInt = BigInt(0)) {
  const splitContract = useSplitContract(spender)
  const account = useAccount()
  const { publicClient } = useClient()
  const { callWithGasPrice } = useCallWithGasPrice()
  const { approvalState, approveCallback, refetchAllowance, currentAllowance } = useApprove(token, spender, amount)

  const [txStep, setTxStep] = useState(0) 

  useEffect(() => {
    if (approvalState === ApprovalState.APPROVED) {
      setTxStep(1)
    } else {
      setTxStep(0)
    }
  }, [approvalState])

  const exchangeToken = useCallback(async (params: ExchangeProps, options?: { wait?: boolean, value?: string, skipSimulate?: boolean}) => {
    try {
      if (splitContract && account && publicClient) {
        // 1. 先获取当前allowance
        let _allowance = await refetchAllowance()
        // 2. 如果allowance不够，则进行授权操作
        if (_allowance < amount) {
          const approveTx = await approveCallback()
          if (!approveTx) {
            return {
              code: RESPONSE_CODE.ERROR,
              data: {
                errorCode: ERROR_CODE.TXERROR,
                name: 'tx error',
                message: 'exchangeTokenFail'
              },
            };
          } 
          const txRes = await waitForReceiptWithRetry(publicClient, approveTx.hash)
          // 授权交易查询失败
          if (txRes.code !== RESPONSE_CODE.SUCCESS) {
            return {
              code: RESPONSE_CODE.ERROR,
              data: {
                errorCode: ERROR_CODE.TXERROR,
                name: 'tx error',
                message: 'apIns'
              },
            }
          }
          // 授权交易查询成功
          // 再次查询allowance，如果还是不足，则返回，结束流程
          _allowance = await refetchAllowance()
          if (_allowance < amount) {
            return {
              code: RESPONSE_CODE.ERROR,
              data: {
                errorCode: ERROR_CODE.ALLOWANCE,
                name: 'tx error',
                message: 'apIns'
              },
            }
          }
          // allowance足够，则下一步
          setTxStep(1)
        } else {
          setTxStep(1)
        }
        
        // 3. 交易签名
        const tx = await callWithGasPrice(splitContract, 'exchangeToken', [params.payinToken, params.payinAmount], {
          value: options?.value !== undefined ? BigInt(options?.value) : undefined, 
          skipSimulate: options?.skipSimulate,
          gas: 300000n
        })
        
        setTxStep(2)
        // 4. 查询交易上链结果
        const txRes = await waitForReceiptWithRetry( publicClient, tx.hash)
        // 交易上链成功，则返回结果
        if (txRes.code === RESPONSE_CODE.SUCCESS) {
          setTxStep(3)
          return txRes
        }
        // 交易失败，
        return {
          code: RESPONSE_CODE.ERROR,
          data: {
            errorCode: ERROR_CODE.TXERROR,
            name: 'tx error',
            message: 'exchangeTokenFail'
          }
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
      console.log(error)
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
            getAppErrorMessageFromCode(errorMessage) || 'placeOrderFail',
        }
      };
    }
  }, [
    amount,
    splitContract, 
    account, 
    approvalState, 
    publicClient, 
    approveCallback, 
    callWithGasPrice, 
    refetchAllowance
  ])

  return {
    txStep,
    approvalState: approvalState,
    allowance: currentAllowance,
    contract: splitContract,
    refetchAllowance,
    exchangeToken
  }
}