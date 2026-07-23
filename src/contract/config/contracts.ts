import type { Address } from "viem";

export const bscContracts: Record<string, Address> = {
  usdt: '0xbeD5856646F1faBDFc565F47f8Ea18685466B745',
  trading: '0x6c5A81eC1D8cF4A389F6Cc9498A3096CF823cb88',
  market: '0x30d942b1175F45731c2de87a319fEcfDFbf0cCe5',
  counter: '0x'
}

export const bscTestContracts: Record<string, Address> = {
  usdt: '0xbeD5856646F1faBDFc565F47f8Ea18685466B745',
  trading: '0x6c5A81eC1D8cF4A389F6Cc9498A3096CF823cb88',
  market: '0x9d7960Aea8a7B59239E105605b5f2b7942409DF9',
  counter: '0x9A885B44c4C2adCbFA509859749fC73FF2Da1020'
}

export const xLayerTestContracts: Record<string, Address> = {
  usdt: '0x9A0F5D3aac1F9aE8f92CC9babf27aac82d933e95',
  trading: '0x218feb3999e941F9878A134030E1aC6eB37d26bA',
  market: '0x218feb3999e941F9878A134030E1aC6eB37d26bA',
  counter: '0x9A885B44c4C2adCbFA509859749fC73FF2Da1020'
}