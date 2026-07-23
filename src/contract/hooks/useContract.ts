import { useMemo } from "react"
import { Address, erc20Abi, getContract } from "viem"
import { useClient } from "../../wallet/hooks/useClient";
import { useAccount, useChainId, useChains } from "../../wallet";
import { CounterAbi, CounterNetworks } from "../config/counter";
import { getAddress } from "../../utils";
import { TradingAbi, TradingNetworks } from "../config/trading";
import { MarketAbi, MarketNetworks } from "../config/market";
import { SplitAbi } from "../config/split";


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

export function useTradingContract(trading?: Address) {
  const address = trading
  return useContract(address, TradingAbi)
}

export function useTokenContract(address?: Address) {
  return useContract(address, erc20Abi)
}

export function useMarketContract(marekt?: Address) {
  const address = marekt
  return useContract(address, MarketAbi)
}


export function useSplitContract(split?: Address) {
  const address = split
  return useContract(address, SplitAbi)
}