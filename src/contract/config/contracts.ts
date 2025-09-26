import type { Address } from "viem";

export const bscContracts: Record<string, Address> = {
  usdt: '0xbeD5856646F1faBDFc565F47f8Ea18685466B745',
  trading: '0xe3ec160b8c5e0DeCFd254AB59740b92A2E840Fe9',
  counter: '0x'
}

export const bscTestContracts: Record<string, Address> = {
  usdt: '0xbeD5856646F1faBDFc565F47f8Ea18685466B745',
  trading: '0xe3ec160b8c5e0DeCFd254AB59740b92A2E840Fe9',
  counter: '0x9A885B44c4C2adCbFA509859749fC73FF2Da1020'
}

export const xLayerTestContracts: Record<string, Address> = {
  usdt: '0x',
  trading: '0x',
  counter: '0x9A885B44c4C2adCbFA509859749fC73FF2Da1020'
}