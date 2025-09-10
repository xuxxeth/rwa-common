import { useCallback } from 'react'
import { useWalletContext } from '../providers/WalletProvider'
import { ConnectorType, DiscoveredWallet } from '../types'


export function useConnector() {
  return useWalletContext().connector
}

export function useWallets() {
  return useWalletContext().wallets
}

export function useConnect() {
  const { connect } = useWalletContext()
  return useCallback(async (type: ConnectorType, wallet: DiscoveredWallet) => {
    connect(type, wallet)
  }, [connect])
}

export function useDisconnect() {
  const { disconnect } = useWalletContext()
  return useCallback(async () => {
    disconnect()
  }, [disconnect])
}

export function useAccount() {
  const { state } = useWalletContext()
  return state.accounts[0]
}

export function useChainId() {
  const { state } = useWalletContext()
  return state.chainId
}

export function useSwitchChain() {
  const { connector } = useWalletContext()
  return useCallback(async (targetChainId: number) => {
    await connector?.switchChain(targetChainId)
  }, [connector])
}

