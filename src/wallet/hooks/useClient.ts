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
    return createPublicClient({ 
      chain: chain,
      transport: http(),
    })
  // 使用 walletConnect 的时候，只有 account 有值了，provider 才可以使用
  }, [chainId, account, chains, connector])

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