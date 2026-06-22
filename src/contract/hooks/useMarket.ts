import { useCallback } from "react";
import { useMarketContract } from "./useContract";
import { useClient } from "../../wallet/hooks/useClient";
import { Address } from "viem";

export function useMarket(trading?: Address) {
  const marketContract = useMarketContract(trading);
  const { publicClient } = useClient();

  const getFeeConfig = useCallback(
    async () => {
      try {
        if (marketContract && publicClient) {
          const result = await marketContract.read.getFeeConfig([]) as any[];
          const platformFee = result[0] || 0
          const buyFeeConfigs = result[1] || []
          const sellFeeConfigs = result[2] || []
          return {
            platformFee,
            buyFeeConfigs,
            sellFeeConfigs
          };
        }
      } catch (error) {
        return {
          platformFee: 0,
          buyFeeConfigs: [],
          sellFeeConfigs: []
        };
      }
    },
    [marketContract, publicClient]
  )

  return {
    getFeeConfig,
  };
}
