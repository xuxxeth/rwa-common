import { useCallback } from "react";
import { useTradingContract } from "./useContract";
import { useAccount } from "../../wallet";
import { useClient } from "../../wallet/hooks/useClient";
import { useCallWithGasPrice } from "./useCallWithGasPrice";
import { waitForTransactionReceipt } from "viem/actions";
import { extractErrorNameAndCode, parseErrorFromMessage, getAppErrorMessageFromCode, getUserRejection } from "../../utils/parseError";
import { ERROR_CODE, RESPONSE_CODE } from "../../utils/constants";
import { Address } from "viem";

export function useTradeUtils(trading?: Address) {
  const tradingContract = useTradingContract(trading);
  const account = useAccount();
  const { publicClient } = useClient();
  const { callWithGasPrice } = useCallWithGasPrice();

  const cancelOrder = useCallback(
    async (orderId: string, options?: { wait?: boolean, skipSimulate?: boolean }) => {
      try {
        console.log(tradingContract, account, publicClient)
        if (tradingContract && account && publicClient) {
          // @ts-ignore
          const hash = await callWithGasPrice(tradingContract, "cancelOrder", [
            orderId,
          ], {skipSimulate: options?.skipSimulate, gas: 100000n});

          if (options?.wait) {
            // 2. 等待交易上链并确认
            const waitForReceiptWithRetry = async (hash: `0x${string}`) => {
              const maxAttempts = 5
              const retryDelayMs = 1000
              let attempts = 0

              while (attempts < maxAttempts) {
                try {
                  const receipt = await waitForTransactionReceipt(publicClient, { hash, retryCount: 5 })
                  if (receipt.status === 'success') {
                    return {
                      code: RESPONSE_CODE.SUCCESS,
                      data: receipt,
                    };
                  }
                  
                } catch (err) {
                  console.log(err)
                  attempts++
                  if (attempts >= maxAttempts) break
                  await new Promise(res => setTimeout(res, retryDelayMs))
                }
              }

              return { code: RESPONSE_CODE.ERROR, data: { errorCode: ERROR_CODE.TXERROR, name: 'wait timeout' } }
            }
            return await waitForReceiptWithRetry(hash.hash)
            
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
        console.log(error)
        // const errorMessage = parseErrorFromMessage(error);
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
            message: errorMessage?.code === ERROR_CODE.USERREJECT ? 'userReject' : getAppErrorMessageFromCode(errorMessage)
          }
        };
      }
    },
    [tradingContract, account, publicClient, callWithGasPrice]
  );

  return {
    cancelOrder,
  };
}
