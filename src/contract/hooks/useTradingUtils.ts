import { useCallback } from "react";
import { useTradingContract } from "./useContract";
import { useAccount } from "../../wallet";
import { useClient } from "../../wallet/hooks/useClient";
import { useCallWithGasPrice } from "./useCallWithGasPrice";
import { extractErrorNameAndCode, parseErrorFromMessage, getAppErrorMessageFromCode, getUserRejection } from "../../utils/parseError";
import { ERROR_CODE, RESPONSE_CODE } from "../../utils/constants";
import { Address } from "viem";
import { waitForReceiptWithRetry } from "./useTrading";

export function useTradeUtils(trading?: Address) {
  const tradingContract = useTradingContract(trading);
  const account = useAccount();
  const { publicClient } = useClient();
  const { callWithGasPrice } = useCallWithGasPrice();

  const cancelOrder = useCallback(
    async (orderId: string, options?: { wait?: boolean, skipSimulate?: boolean }) => {
      try {
        if (tradingContract && account && publicClient) {
          // @ts-ignore
          const tx = await callWithGasPrice(tradingContract, "cancelOrder", [
            orderId,
          ], {skipSimulate: options?.skipSimulate});

          if (options?.wait) {
            // 2. 等待交易上链并确认
            return await waitForReceiptWithRetry(publicClient, tx.hash)
            
          }
          return {
            code: RESPONSE_CODE.SUCCESS,
            data: { transactionHash: tx },
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
    cancelOrder,
  };
}
