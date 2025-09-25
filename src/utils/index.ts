import { Address } from "viem";
import { ChainId } from "../wallet/types";

export function getAddress(netWroks: Record<ChainId, Address>,  chainId: number) {
  return netWroks[chainId as ChainId]
}

export function calculateGasMargin(value: bigint, margin = 1000n): bigint {
  return (value * (10000n + margin)) / 10000n
}