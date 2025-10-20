import { useCallback } from "react";
import { useClient } from "./useClient";
import { Address, erc20Abi } from "viem";
import { useTradingContract } from "../../contract";

export function useTokenBalances() {
  const { publicClient } = useClient();
  const tradingContract = useTradingContract();

  const getTokenBalances = useCallback(
    async (account: Address, tokens: Address[]) => {
      if (publicClient) {
        try {
          const result = await publicClient.multicall({
            contracts: tokens.map((token) => ({
              address: token,
              abi: erc20Abi,
              functionName: "balanceOf",
              args: [account],
            })),
          });

          return result.map((r, i) => ({
            token: tokens[i],
            balance: r.result, // bigint
          }));
        } catch (error) {
          console.log(error);
          return [];
        }
      }
      console.log('Enter No publicClient')
      return [];
    },
    [publicClient]
  );

  const getTokenBalancesByTradingContract = useCallback(
    async (account: Address, tokens: Address[]) => {
      if (publicClient && tradingContract) {
        try {
          const result = await tradingContract.read.getBalances([
            account,
            tokens,
          ]);
          return result;
        } catch (error) {
          console.log("getTokenBalancesByTradingContract error", error);
          return [];
        }
      }
    },
    [publicClient]
  );

  return {
    getTokenBalances,
    getTokenBalancesByTradingContract,
  };
}
