import { useCallback, useState } from "react";
import { useTradingContract } from "./useContract";
import { useAccount } from "../../wallet";
import { useClient } from "../../wallet/hooks/useClient";
import { useCallWithGasPrice } from "./useCallWithGasPrice";
import { extractErrorNameAndCode, parseErrorFromMessage, getAppErrorMessageFromCode, getUserRejection } from "../../utils/parseError";
import { ERROR_CODE, RESPONSE_CODE } from "../../utils/constants";
import { Address } from "viem";
import { waitForReceiptWithRetry } from "./useTrading";

export function useTradeUtilsV2(trading?: Address) {
  const tradingContract = useTradingContract(trading);
  const account = useAccount();
  const { publicClient } = useClient();
  const { callWithGasPrice } = useCallWithGasPrice();
  const [txStep, setTxStep] = useState(1) 

  const cancelOrder = useCallback(
    async (orderId: string, options?: { wait?: boolean, skipSimulate?: boolean }) => {
      try {
        if (tradingContract && account && publicClient) {
          // 1. 直接发起撤单
          // @ts-ignore
          const tx = await callWithGasPrice(tradingContract, "cancelOrder", [
            orderId,
          ], {skipSimulate: options?.skipSimulate, gas: 100000n});

          // 交易发送成功，返回hash，则进行下一步，查询交易上链结果 
          setTxStep(2)
          // 2. 查询交易上链结果
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
              name: 'tx error'
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
    txStep,
    cancelOrder,
  };
}
