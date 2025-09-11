import { useCallback } from "react";
import { ChainId } from "../../wallet/types";
import { TradingAbi, TradingNetworks } from "../trading";
import { useContract } from "./useContract";

export function useTrading() {
  const tradingContract = useContract(TradingNetworks[ChainId.BSC], TradingAbi)
  
  const handlePlaceOrder = useCallback(async () => {
    try {
      if (tradingContract) {
        console.log(tradingContract)
        return true
      }
    } catch (error) {
      return 
    }
    
    return false
  }, [tradingContract])

  return {
    handlePlaceOrder
  }
}