import { useCallback, useEffect, useMemo, useState } from 'react'
import { Abi, Address, erc20Abi, getAddress } from 'viem'
import type { Account, Chain, ContractFunctionArgs, ContractFunctionName, EstimateContractGasParameters } from 'viem'
import { useClient } from '../../wallet/hooks/useClient'
import { useCallWithGasPrice } from './useCallWithGasPrice'

export function useGetTokenAllowance(
  token?: string,
  owner?: string,
  spender?: string,
): {
  allowance: BigInt
  refetch: () => Promise<BigInt>
} {
  return useTokenAllowanceByChainId({
    token,
    owner,
    spender,
  })
}

export function useTokenAllowance() {
  const { publicClient, walletClient } = useClient()
  const { callWithGasPrice } = useCallWithGasPrice()
  
  const getAllowance = useCallback(async (token: Address | string, owner: Address | string, spender: Address | string) => {
    if (!publicClient) {
      throw new Error('No publicClient')
    }
    if (!token || !owner || !spender) {
      throw new Error('token or owner or spender not found!')
    }
    const inputs = [owner, spender] as [`0x${string}`, `0x${string}`]
    try {
      const allowance = await publicClient.readContract({
        abi: erc20Abi,
        address: token as Address,
        functionName: 'allowance',
        args: inputs,
      })
      return allowance
    } catch(error) {
      throw new Error(error?.toString())
    }
    
  }, [publicClient])

  const approve = useCallback(async  <
        TAbi extends Abi | unknown[],
        functionName extends ContractFunctionName<TAbi, 'nonpayable' | 'payable'>,
        args extends ContractFunctionArgs<TAbi, 'nonpayable' | 'payable', functionName>,
      >(
    contract: { abi: TAbi; account: Account | undefined; chain: Chain | undefined; address: Address } | null,
    spender: Address,
    amount: bigint
  ) => {
    // @ts-ignore
    const tx = await callWithGasPrice(contract, 'approve' as functionName, [spender, amount])
    console.log(tx)
  }, [])

  return {
    getAllowance,
    approve
  }
}

export function useTokenAllowanceByChainId({
  token,
  owner,
  spender,
}: {
  token?: string
  owner?: string
  spender?: string
}): {
  allowance: BigInt
  refetch: () => Promise<BigInt>
} {
  const { publicClient } = useClient()

  const [allowance, setAllowance] = useState(BigInt(0))

  const refetch = useCallback(async () => {
    if (publicClient && token && spender && owner) {
      const inputs = [owner, spender] as [`0x${string}`, `0x${string}`]
      const _allowance = await publicClient.readContract({
        abi: erc20Abi,
        address: token as Address,
        functionName: 'allowance',
        args: inputs,
      })
      setAllowance(_allowance)
      return _allowance
    }
    return BigInt(0)
  }, [publicClient, token, spender, owner])

  useEffect(() => {
    setAllowance(BigInt(0))
    refetch()
  }, [publicClient, refetch, token, spender, owner])

  return useMemo(
    () => ({
      allowance: allowance || BigInt(0),
      refetch,
    }),
    [refetch, allowance],
  )
}

export default useTokenAllowance
