import { createPublicClient, createWalletClient, custom, http } from 'viem'
import { useAccount, useChainId, useChains } from './hooks'
import { useMemo } from 'react'

export function useClient() {
  const chainId = useChainId()
  const chains = useChains()
  const account = useAccount()
  const publicClient = useMemo(() => {
    if (!chainId || chains.length <= 0) return null
    const chain = chains.find(chain => chain.id === chainId)
    return createPublicClient({ 
      chain: chain,
      transport: http()
    })
  }, [chainId, chains])

  const walletClient = useMemo(() => {
    if (!chainId || chains.length <= 0 || !window.ethereum) return null
    const chain = chains.find(chain => chain.id === chainId)
    return createWalletClient({ 
      chain: chain,
      // @ts-ignore
      transport: custom(window.ethereum!),
      account
    })
  }, [chainId, chains, account])

  return {
    publicClient,
    walletClient
  }
}