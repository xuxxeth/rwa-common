import { useCallback } from "react";
import { ChainId } from "../../wallet/types";
import { useContract } from "./useContract";
import { CounterNetworks, CounterAbi } from "../counter";
import { useAccount } from "../../wallet";

export function useCounter() {
  const counterContract = useContract(CounterNetworks[ChainId.BSCTEST], CounterAbi)
  const account = useAccount()

  const handleGetX = useCallback(async () => {
    try {
      if (counterContract) {
        console.log(counterContract)
        // @ts-ignore
        const xValue = await counterContract.read.x()
        console.log(xValue)
        return true
      }
    } catch (error) {
      console.log(error)
      return 
    }
    
    return false
  }, [counterContract])
  const handleInc = useCallback(async () => {
    try {
      if (counterContract) {
        // @ts-ignore
        const res = await counterContract.write.inc()
        console.log(res)
        return true
      }
    } catch (error) {
      console.log(error)
      return 
    }
    
    return false
  }, [counterContract])

  const handleIncBy = useCallback(async (by: string) => {
    try {
      if (counterContract && account) {
        // @ts-ignore
        const res = await counterContract.write.incBy([by], { account })
        console.log(res)
        return true
      }
    } catch (error) {
      console.log(error)
      return 
    }
    
    return false
  }, [counterContract, account])

  return {
    handleGetX,
    handleInc,
    handleIncBy
  }
}