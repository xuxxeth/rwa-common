import { useCallback } from "react";
import { Address, Abi } from "viem";
import { useClient } from "../../wallet/hooks/useClient";

import riskControlAbi from "../../contract/config/riskControl/abi.json";
import regulatoryVaultAbi from "../../contract/config/regulatoryVault/abi.json";

export interface RegulateAssetItem {
  token: string;
  amount: bigint;
}

export function useRegulateAssets() {
  const { publicClient } = useClient();

  const getRegulateAssets = useCallback(
    async (
      diamondAddress: string | undefined | null,
      riskAccount: string | undefined,
      tokens: string[] | undefined,
    ) => {
      if (!diamondAddress || !riskAccount || !tokens || tokens.length === 0) {
        return [] as RegulateAssetItem[];
      }
      if (!publicClient) {
        throw new Error("No valid public client");
      }

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
        allowFailure: true,
      });

      return results.map((result: (typeof results)[number], index: number) => {
        if (result.status === "success") {
          return {
            token: tokens[index],
            amount: result.result as bigint,
          };
        }

        console.warn(
          `Failed to fetch asset for token ${tokens[index]}`,
          result.error,
        );
        return {
          token: tokens[index],
          amount: 0n,
        };
      });
    },
    [publicClient],
  );

  return { getRegulateAssets };
}
