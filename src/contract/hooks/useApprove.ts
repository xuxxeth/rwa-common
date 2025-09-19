import { useCallback, useEffect, useMemo, useState } from "react"
import { useAccount, useChainId } from "../../wallet"
import { useCallWithGasPrice } from "./useCallWithGasPrice"
import { useTokenAllowanceByChainId } from "./useTokenAllowance"
import { useTokenContract } from "./useContract"
import { Address, maxUint256, SendTransactionReturnType } from "viem"
import { calculateGasMargin } from "../../utils"

export enum ApprovalState {
  UNKNOWN,
  NOT_APPROVED,
  PENDING,
  APPROVED,
}

export function useApprove(
  token: Address,
  spender: string,
  targetAmount: BigInt
  
) {
  const account = useAccount()
  const activeChainId = useChainId()
  const chainId = activeChainId ?? undefined

  const { callWithGasPrice } = useCallWithGasPrice(chainId)
  const { allowance: currentAllowance, refetch } = useTokenAllowanceByChainId({
    token,
    owner: account ?? undefined,
    spender,
  })
  const [pending, setPending] = useState<boolean>(false)
  const [isPendingError, setIsPendingError] = useState<boolean>(false)

  useEffect(() => {
    refetch().then(() => {
      setPending(false)
    })
  }, [pending, refetch])

  const approvalState: ApprovalState = useMemo(() => {
    if (!spender) return ApprovalState.UNKNOWN
    // if (amountToApprove.currency?.isNative) return ApprovalState.APPROVED
    if (!currentAllowance) return ApprovalState.UNKNOWN
    // amountToApprove will be defined if currentAllowance is
    return currentAllowance < targetAmount
      ? pending
        ? ApprovalState.PENDING
        : ApprovalState.NOT_APPROVED
      : ApprovalState.APPROVED
  }, [currentAllowance, pending, spender])

  const tokenContract = useTokenContract(token)

  const approve = useCallback(
    async (overrideAmountApprove?: bigint, alreadyApproved = approvalState !== ApprovalState.NOT_APPROVED) => {
      
      if (!token) {
        // toastError(t('Error'), t('No token'))
        console.error('no token')
        return undefined
      }

      if (!tokenContract) {
        console.error('tokenContract is null')
        setIsPendingError(true)
        return undefined
      }

      if (!targetAmount) {
        console.error('missing amount to approve')
        setIsPendingError(true)
        return undefined
      }

      if (!spender) {
        console.error('no spender')
        setIsPendingError(true)
        return undefined
      }

      let useExact = false

      const estimatedGas = await tokenContract.estimateGas
        .approve(
          [spender as Address, maxUint256], // TODO: Fix viem
          // @ts-ignore
          {
            account: tokenContract.address,
          },
        )
        .catch((err) => {
          console.info('try estimate approve max failure', err)
          // general fallback for tokens who restrict approval amounts
          useExact = true
          return tokenContract.estimateGas
            .approve(
              [spender as Address, targetAmount ?? maxUint256],
              // @ts-ignore
              {
                account: tokenContract.address,
              },
            )
            .catch((e) => {
              console.error('estimate gas failure', e)
              setIsPendingError(true)
              return null
            })
        })

      if (!estimatedGas) return undefined
      const finalAmount =
        overrideAmountApprove ?? targetAmount ?? maxUint256

      let sendTxResult: Promise<SendTransactionReturnType> | undefined
      // @ts-ignore
      sendTxResult = callWithGasPrice(tokenContract, 'approve' as const, [spender as Address, finalAmount], {
        gas: calculateGasMargin(estimatedGas),
      }).then((response) => response.hash)

      return sendTxResult
        .then((response) => {
          return { hash: response }
        })
        .catch((error: any) => {
          console.error('Failed to approve token', error)
          
          throw error
        })
    },
    [
      approvalState,
      token,
      tokenContract,
      spender,
      callWithGasPrice,
      targetAmount,
      account,
    ],
  )

  const approveNoCheck = useCallback(
    async (overrideAmountApprove?: bigint) => {
      return approve(overrideAmountApprove, false)
    },
    [approve],
  )

  const approveCallback = useCallback(() => {
    return approve()
  }, [approve])

  const revokeCallback = useCallback(() => {
    return approve(0n)
  }, [approve])

  const revokeNoCheck = useCallback(() => {
    return approveNoCheck(0n)
  }, [approveNoCheck])

  return {
    approvalState,
    approveCallback,
    approveNoCheck,
    revokeCallback,
    revokeNoCheck,
    currentAllowance,
    isPendingError,
  }
}


