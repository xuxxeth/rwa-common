import { useCallback, useMemo } from "react";
import { Address, Abi } from "viem";
import { useClient } from "../../wallet/hooks/useClient";
import marketViewAbi from "../config/marketView/abi.json";

export interface TokenBalanceItem {
  token: Address;
  balance: bigint;
}

export function useTokenBalancesV2() {
  const { publicClient } = useClient();  

  const getTokenBalances = useCallback(
    async (diamondContract: Address, account: Address, tokens: Address[]) => {
      if (!diamondContract) {
        throw new Error("Diamond contract is required");
      }
      if (!publicClient) {
        throw new Error("No valid public client");
      }
      if (tokens.length === 0) {
        return [] as TokenBalanceItem[];
      }

      const balances = (await publicClient.readContract({
        address: diamondContract,
        abi: marketViewAbi as Abi,
        functionName: "getBalances",
        args: [account, tokens],
      })) as bigint[];

      return tokens.map((_, index) => ({
        token: tokens[index],
        balance: balances[index] ?? 0n,
      }));
    },
    [publicClient],
  );

  return {
    getTokenBalances,
  };
}
