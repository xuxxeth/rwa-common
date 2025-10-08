import { useCallback } from "react"
import { useClient } from "./useClient"
import { useAccount } from "./hooks"
import { signMessage } from "viem/actions"
import { Hex } from 'viem'

const NONCE_STORAGE_KEY = 'cyberalpha:nonces'

type NonceCache = Record<string, number>

function getCache(): NonceCache {
  const raw = localStorage.getItem(NONCE_STORAGE_KEY)
  return raw ? JSON.parse(raw) : {}
}

function setCache(cache: NonceCache) {
  localStorage.setItem(NONCE_STORAGE_KEY, JSON.stringify(cache))
}

/**
 * 拼接 key：chainId + account , 支持多链和多地址
 */
function makeKey(chainId: number, account: Hex) {
  return `${chainId}:${account.toLowerCase()}`
}

export function getLocalNonce(chainId: number, account: Hex): number {
  const cache = getCache()
  const key = makeKey(chainId, account)

  if (cache[key] === undefined) {
    cache[key] = 1 // 初始值
    setCache(cache)
  }

  return cache[key]
}

/**
 * 使用后递增 nonce
 */
export function increaseLocalNonce(chainId: number, account: Hex) {
  const cache = getCache()
  const key = makeKey(chainId, account)

  if (cache[key] === undefined) {
    cache[key] = 1
  } else {
    cache[key] = cache[key] + 1
  }

  setCache(cache)
}

export async function getNonce(client: { getTransactionCount: (arg0: { address: `0x${string}` }) => any }, address: `0x${string}`) {
  const nonce = await client.getTransactionCount({
    address,
  })
  console.log("当前 nonce:", nonce)
  return nonce
}


export function generateSignMessage(nonce: number, expires: number): string {
  return `CyberAlpha Signature Verification\nNonce: ${nonce}\nExpires: ${expires}`
}

export function useSignature() {
  const { walletClient, publicClient } = useClient()
  const account = useAccount()
  const requestSignature = useCallback(async (expires: number) => {
    if (walletClient && account && publicClient) {
      const _nonce = await getNonce(publicClient, account)
      const message = generateSignMessage(_nonce, expires)
      const signature = await signMessage(walletClient, {
        account,
        message
      })
      return {
        account,
        nonce: _nonce,
        expires,
        message,
        signature
      }

    } else {
      throw new Error('no walletClient or account')
    }
  }, [walletClient, account, publicClient])

  return {
    requestSignature
  }
}