import { useMemo } from "react"
import { Address, erc20Abi, getContract } from "viem"
import { useClient } from "../../wallet/hooks/useClient";
import { useAccount, useChainId, useChains } from "../../wallet";
import { CounterAbi, CounterNetworks } from "../config/counter";
import { getAddress } from "../../utils";
import { TradingAbi, TradingNetworks } from "../config/trading";


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

export function useTadingContract() {
  const chainId = useChainId()
  const address = chainId ? getAddress(TradingNetworks, chainId)  : undefined
  return useContract(address, TradingAbi)
}

export function useTokenContract(address: Address) {
  return useContract(address, erc20Abi)
}