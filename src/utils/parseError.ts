import {
  decodeErrorResult,
  type Abi,
  type ExtractAbiItemNames,
  ContractFunctionRevertedError,
} from 'viem'

// 直接把 error signature 列出来，改成 viem 的 ABI 格式
const errorsAbi = [
  { type: 'error', name: 'AlreadyExecuted', inputs: [] },
  { type: 'error', name: 'ERC20InsufficientAllowance', inputs: [
    { name: 'spender', type: 'address' },
    { name: 'allowance', type: 'uint256' },
    { name: 'needed', type: 'uint256' },
  ] },
  { type: 'error', name: 'Forbidden', inputs: [] },
  { type: 'error', name: 'InsufficientBalance', inputs: [] },
  { type: 'error', name: 'InsufficientFee', inputs: [] },
  { type: 'error', name: 'InsufficientNetworkFee', inputs: [] },
  { type: 'error', name: 'InvalidAmount', inputs: [] },
  { type: 'error', name: 'InvalidOrder', inputs: [] },
  { type: 'error', name: 'InvalidOrderSize', inputs: [] },
  { type: 'error', name: 'InvalidOrderState', inputs: [] },
  { type: 'error', name: 'InvalidPrice', inputs: [] },
  { type: 'error', name: 'InvalidValidDate', inputs: [] },
  { type: 'error', name: 'NotOwner', inputs: [] },
  { type: 'error', name: 'OrderNotFound', inputs: [] },
  { type: 'error', name: 'PauseAction', inputs: [{ name: 'action', type: 'uint256' }] },
  { type: 'error', name: 'Unauthorized', inputs: [{ name: 'addr', type: 'address' }] },
  { type: 'error', name: 'UnmatchedArrayLength', inputs: [] },
  { type: 'error', name: 'UnsupportedMultiNetworkFee', inputs: [] },
  { type: 'error', name: 'UnsupportedToken', inputs: [{ name: 'token', type: 'address' }] },
  { type: 'error', name: 'UnsupportedMarketOrder', inputs: [] },
  { type: 'error', name: 'InvalidAddress', inputs: [{ name: 'addr', type: 'address' }] },
  { type: 'error', name: 'InitializationFunctionReverted', inputs: [
    { name: 'addr', type: 'address' },
    { name: 'data', type: 'bytes' },
  ] },
  { type: 'error', name: 'IncorrectFacetCutAction', inputs: [{ name: 'action', type: 'uint8' }] },
  { type: 'error', name: 'NoSelectorsProvidedForFacetForCut', inputs: [{ name: 'facet', type: 'address' }] },
  { type: 'error', name: 'RemoveFacetAddressMustBeZeroAddress', inputs: [{ name: 'facet', type: 'address' }] },
  { type: 'error', name: 'CannotAddFunctionToDiamondThatAlreadyExists', inputs: [{ name: 'selector', type: 'bytes4' }] },
  { type: 'error', name: 'CannotAddSelectorsToZeroAddress', inputs: [{ name: 'selector', type: 'bytes4' }] },
  { type: 'error', name: 'CannotRemoveFunctionThatDoesNotExist', inputs: [{ name: 'selector', type: 'bytes4' }] },
  { type: 'error', name: 'CannotRemoveImmutableFunction', inputs: [{ name: 'selector', type: 'bytes4' }] },
  { type: 'error', name: 'CannotReplaceImmutableFunction', inputs: [{ name: 'selector', type: 'bytes4' }] },
  { type: 'error', name: 'CannotReplaceFunctionWithTheSameFunctionFromTheSameFacet', inputs: [{ name: 'selector', type: 'bytes4' }] },
  { type: 'error', name: 'CannotReplaceFunctionThatDoesNotExists', inputs: [{ name: 'selector', type: 'bytes4' }] },
  { type: 'error', name: 'CannotReplaceFunctionsFromFacetWithZeroAddress', inputs: [{ name: 'selector', type: 'bytes4' }] },
  { type: 'error', name: 'NoBytecodeAtAddress', inputs: [
    { name: 'addr', type: 'address' },
    { name: 'reason', type: 'string' },
  ] },
  { type: 'error', name: 'FunctionNotFound', inputs: [{ name: 'selector', type: 'bytes4' }] },
] as const satisfies Abi

export function parseViemError(err: unknown) {
  if (err instanceof ContractFunctionRevertedError) {
    // ✅ 这里确保取到的是 string
    const data = err.data as `0x${string}` | undefined
    if (data) {
      try {
        const decoded = decodeErrorResult({
          abi: errorsAbi,
          data, // 必须是 `0x...` 字符串
        })
        console.log('Decoded custom error:', decoded.errorName, decoded.args)
        return decoded
      } catch (decodeErr) {
        console.warn('Could not decode custom error data:', data)
      }
    }
    console.log('Reverted reason or built-in error:', err.message)
  } else {
    console.error('Non-revert error:', err)
  }
  return null
}
