import { useCallback } from "react";
import { useTradingContract } from "./useContract";
import { useAccount } from "../../wallet";
import { useClient } from "../../wallet/hooks/useClient";
import { useCallWithGasPrice } from "./useCallWithGasPrice";
import { waitForTransactionReceipt } from "viem/actions";
import { parseErrorFromMessage } from "../../utils/parseError";

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
              code: 1,
              data: receipt,
            };
          }
          console.log("订单撤销 ✅", hash);
          return {
            code: 1,
            data: { transactionHash: hash },
          };
        }
        return {
          code: -1,
          message: "no contract or account",
        };
      } catch (error: any) {
        const errorMessage = parseErrorFromMessage(error);
        return {
          code: -1,
          message: errorMessage,
        };
      }
    },
    [tradingContract, account, publicClient, callWithGasPrice]
  );

  return {
    cancelOrder,
  };
}
