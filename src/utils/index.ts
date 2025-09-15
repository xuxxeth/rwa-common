import { Address } from "viem";
import { ChainId } from "../wallet/types";

export function getAddress(netWroks: Record<ChainId, Address>,  chainId: number) {
  return netWroks[chainId as ChainId]
}