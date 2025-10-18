import { createPublicClient, createWalletClient, custom, http } from 'viem'
import { useAccount, useChainId, useChains, useConnector } from './hooks'
import { useMemo } from 'react'

export function useClient() {
  const chainId = useChainId()
  const chains = useChains()
  const account = useAccount()
  const connector = useConnector()

  const publicClient = useMemo(() => {
    if (!chainId || chains.length <= 0 || !connector || !connector.getProvider()) return null
    const chain = chains.find(chain => chain.id === chainId)
    if (!chain) return null
    console.log('===> publicClient chain', chain)
    return createPublicClient({ 
      chain: chain,
      // transport: http(),
      transport: custom(connector.getProvider()!),
    })
  }, [chainId, chains, connector])

  const walletClient = useMemo(() => {
    if (!chainId || chains.length <= 0 || !connector || !connector.getProvider() || !account) return null
    const chain = chains.find(chain => chain.id === chainId)
    if (!chain) return null

    return createWalletClient({ 
      chain: chain,
      transport: custom(connector.getProvider()!),
      account
    })
  }, [chainId, chains, account, connector])

  return {
    publicClient,
    walletClient
  }
}