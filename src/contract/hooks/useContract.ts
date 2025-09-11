import { useMemo } from "react"
import { Address, getContract } from "viem"
import { useClient } from "../../wallet/hooks/useClient";
import { useAccount } from "../../wallet";


export function useContract(address: Address, abi: any, withSigner = true) {
  const account = useAccount()
  const { publicClient, walletClient } = useClient()
  return useMemo(() => {
    if (!walletClient && !publicClient) return null
    const client = account && walletClient ? walletClient : publicClient
    // const client = walletClient
    return getContract({address, abi, client: client!})
  }, [address, abi, publicClient, walletClient, account]) 
}