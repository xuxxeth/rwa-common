import { useCallback } from "react";
import { useMarketContract } from "./useContract";
import { useClient } from "../../wallet/hooks/useClient";
import { Address } from "viem";

export function useMarket(trading?: Address) {
  const marketContract = useMarketContract(trading);
  const { publicClient } = useClient();

  // Result:
  // getFeeRules method Response
  // platformFeeRate: uint32
  // buyFeeConfigs: tuple[]
  // sellFeeConfigs: tuple[]
  // platformFeeRateuint32:
  // 400000
  // buyFeeConfigstuple[]:
  // [["1","3","1","2","350000","350000","1000000"]]
  // sellFeeConfigstuple[]:
  // [["1","3","1","2","350000","350000","1000000"],["2","3","1","1","19500","10000","9790000"],["3","2","1","0","2060","10000","0"]]
  // {
  //   ruleId: 1,
  //   mode: 3,            // 每股多少USD
  //   minMode: 1,         // 固定金额
  //   maxMode: 2,         // 按成交金额的一定比例收取
  //   value: 350000,      // 每股 0.0035 USD
  //   minValue: 350000,   // 固定金额 0.35 USD
  //   maxValue: 1000000,  // 成交金额的 1%
  // },
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
