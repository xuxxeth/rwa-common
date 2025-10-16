import { useCallback } from "react";
import { useTradingContract } from "./useContract";
import { useAccount } from "../../wallet";
import { useClient } from "../../wallet/hooks/useClient";
import { useCallWithGasPrice } from "./useCallWithGasPrice";
import { waitForTransactionReceipt } from "viem/actions";
import { extractErrorNameAndCode, parseErrorFromMessage } from "../../utils/parseError";
import { RESPONSE_CODE } from "../../utils/constants";

export function useTradeUtils() {
  const tradingContract = useTradingContract();
  const account = useAccount();
  const { publicClient } = useClient();
  const { callWithGasPrice } = useCallWithGasPrice();

  const cancelOrder = useCallback(
    async (orderId: number, options?: { wait?: boolean }) => {
      try {
        if (tradingContract && account && publicClient) {
          // @ts-ignore
          const hash = await callWithGasPrice(tradingContract, "cancelOrder", [
            orderId,
          ]);
          if (options?.wait) {
            // 2. 等待交易上链并确认
            const receipt = await waitForTransactionReceipt(publicClient, hash);

            console.log("订单撤销 ✅", receipt);
            return {
              code: RESPONSE_CODE.SUCCESS,
              data: receipt,
            };
          }
          console.log("订单撤销 ✅", hash);
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
        // const errorMessage = parseErrorFromMessage(error);
        const errorMessage = extractErrorNameAndCode(error.toString());
        return {
          code: RESPONSE_CODE.ERROR,
          data: {
            errorCode: errorMessage?.code,
            name: errorMessage?.name
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
