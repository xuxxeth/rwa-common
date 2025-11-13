import { Address } from "viem";
import { ChainId } from "../wallet/types";

export function getAddress(netWroks: Record<ChainId, Address>,  chainId: number) {
  return netWroks[chainId as ChainId]
}

export function calculateGasMargin(value: bigint, margin = 1000n): bigint {
  return (value * (10000n + margin)) / 10000n
}

export function parseAmount(value: string | number, decimals: number = 6): string {
  if (value === null || value === undefined) return "0"

  const num = Number(value)
  if (isNaN(num) || num === 0) return "0"

  const result = BigInt(Math.trunc(num * Math.pow(10, decimals))) // 向下取整

  return result.toString()
}
