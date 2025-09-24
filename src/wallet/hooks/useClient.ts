import { createPublicClient, createWalletClient, custom, http } from 'viem'
import { useAccount, useChainId, useChains, useConnector } from './hooks'
import { useMemo } from 'react'

export function useClient() {
  const chainId = useChainId()
  const chains = useChains()
  const account = useAccount()
  const connecotr = useConnector()

  const publicClient = useMemo(() => {
    if (!chainId || chains.length <= 0) return null
    const chain = chains.find(chain => chain.id === chainId)
    if (!chain) return null
    return createPublicClient({ 
      chain: chain,
      transport: http()
    })
  }, [chainId, chains])

  const walletClient = useMemo(() => {
    if (!chainId || chains.length <= 0 || !connecotr || !connecotr.getProvider()) return null
    const chain = chains.find(chain => chain.id === chainId)
    if (!chain) return null

    return createWalletClient({ 
      chain: chain,
      transport: custom(connecotr.getProvider()!),
      account
    })
  }, [chainId, chains, account, connecotr])

  return {
    publicClient,
    walletClient
  }
}