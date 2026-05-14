import { useCallback, useEffect, useState } from "react";
import { Address, Abi } from "viem";
import { useClient } from "../../wallet/hooks/useClient";

import riskControlAbi from "../../contract/config/riskControl/abi.json";
import regulatoryVaultAbi from "../../contract/config/regulatoryVault/abi.json";

export function useRegulateAssets(
  diamondAddress: string | undefined,
  riskAccount: string | undefined,
  tokens: string[] | undefined
) {
  const { publicClient } = useClient();
  const [assets, setAssets] = useState<{ token: string; amount: bigint }[]>([]);

  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);

  const fetchAssets = useCallback(async () => {
    // 参数校验
    if (
      !publicClient ||
      !diamondAddress ||
      !riskAccount ||
      !tokens ||
      tokens.length === 0
    ) {
      setAssets([]);
      return;
    }

    setIsLoading(true);
    setError(null);
    try {
      // 1. Get regulatoryVault address
      const regulatoryVaultAddress = (await publicClient.readContract({
        address: diamondAddress as Address,
        abi: riskControlAbi,
        functionName: "regulatoryVault",
      })) as Address;

      // 2. Multicall getRegulatoryAsset
      const results = await publicClient.multicall({
        contracts: tokens.map((token) => ({
          address: regulatoryVaultAddress,
          abi: regulatoryVaultAbi as unknown as Abi,
          functionName: "getRegulatoryAsset",
          args: [riskAccount, token],
        })),
        allowFailure: true, // 显式声明允许失败，与下方的 status 判断对应
      });

      const data = results.map((res, index) => {
        if (res.status === "success") {
          return {
            token: tokens[index],
            amount: res.result as bigint,
          };
        } else {
          console.warn(
            `Failed to fetch asset for token ${tokens[index]}`,
            res.error
          );
          return {
            token: tokens[index],
            amount: 0n,
          };
        }
      });

      setAssets(data);
    } catch (err) {
      console.error("Failed to fetch regulatory assets:", err);
      setError(err as Error);
      setAssets([]);
    } finally {
      setIsLoading(false);
    }
  }, [publicClient, diamondAddress, riskAccount, JSON.stringify(tokens)]); // JSON.stringify 是处理数组依赖的实用技巧

  useEffect(() => {
    fetchAssets();
  }, [fetchAssets]);

  return { assets, isLoading, error, refetch: fetchAssets };
}
