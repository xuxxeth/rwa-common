import { useCallback } from "react";
import { useClient } from "./useClient";
import { Address, erc20Abi } from "viem";

export function useTokenBalances() {
  const { publicClient } = useClient()

  const getTokenBalances = useCallback(async (account: Address, tokens: Address[]) => {
    if (publicClient) {
      try {
        const result = await publicClient.multicall({
          contracts: tokens.map((token) => ({
            address: token,
            abi: erc20Abi,
            functionName: "balanceOf",
            args: [account]
          }))
        })

        return result.map((r, i) => ({
          token: tokens[i],
          balance: r.result // bigint
        }))
      } catch(error) {
        console.log(error)
        return []
      }
    }
    return []
  }, [publicClient])

  return {
    getTokenBalances
  }
}