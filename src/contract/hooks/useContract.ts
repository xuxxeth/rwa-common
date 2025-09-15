import { useMemo } from "react"
import { Address, getContract } from "viem"
import { useClient } from "../../wallet/hooks/useClient";
import { useAccount, useChainId } from "../../wallet";
import { CounterAbi, CounterNetworks } from "../counter";
import { getAddress } from "../../utils";


export function useContract(address: Address | undefined, abi: any, withSigner = true) {
  const account = useAccount()
  const { publicClient, walletClient } = useClient()
  return useMemo(() => {
    if (!walletClient && !publicClient) return null
    if (!address) return null
    const client = account && walletClient ? walletClient : publicClient
     
    return getContract({address, abi, client: client!})
  }, [address, abi, publicClient, walletClient, account]) 
}

export function useCounterContract() {
  const chainId = useChainId()
  const address = chainId ? getAddress(CounterNetworks, chainId)  : undefined
  return useContract(address, CounterAbi)
}