import { useCallback } from "react";
import { useCounterContract } from "./useContract";
import { useAccount } from "../../wallet";

export function useCounter() {
  const counterContract = useCounterContract()
  const account = useAccount()

  const handleGetX = useCallback(async () => {
    try {
      console.log(counterContract)
      if (counterContract) {
        // @ts-ignore
        const xValue = await counterContract.read.x()
        return xValue
      }
    } catch (error) {
      console.log(error)
      return null
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
    handleIncBy,
  }
}