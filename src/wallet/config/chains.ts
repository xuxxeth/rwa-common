import type { Chain } from 'viem'
import { defineChain } from 'viem'
import { xphereTestnet } from 'viem/chains'

export const bsc = defineChain({
  id: 56,
  name: 'BNB Smart Chain',
  network: 'bsc',
  nativeCurrency: { name: 'BNB', symbol: 'BNB', decimals: 18 },
  rpcUrls: {
    default: { http: ['https://bsc-dataseed.bnbchain.org'] },
    public: { http: ['https://bsc-dataseed.bnbchain.org'] }
  },
  blockExplorers: {
    default: { name: 'BscScan', url: 'https://bscscan.com' }
  }
})

export const bscTestnet = defineChain({
  id: 97,
  name: 'BNB Smart Chain Testnet',
  network: 'bsc-testnet',
  nativeCurrency: { name: 'tBNB', symbol: 'tBNB', decimals: 18 },
  rpcUrls: {
    default: { http: ['https://bsc-testnet-dataseed.bnbchain.org'] },
    public: { http: ['https://bsc-testnet-dataseed.bnbchain.org'] }
  },
  blockExplorers: {
    default: { name: 'BscScan', url: 'https://testnet.bscscan.com' }
  }
})

// OKX X Layer
export const xLayer = defineChain({
  id: 196,
  name: 'X Layer',
  network: 'xlayer',
  nativeCurrency: { name: 'OKB', symbol: 'OKB', decimals: 18 },
  rpcUrls: {
    default: { http: ['https://rpc.xlayer.tech'] },
    public: { http: ['https://rpc.xlayer.tech'] }
  },
  blockExplorers: {
    default: { name: 'OKX Explorer', url: 'https://www.okx.com/web3/explorer/xlayer' }
  }
})

export const xLayerTestnet = defineChain({
  id: 1952,
  name: 'X Layer Testnet',
  network: 'xlayer-testnet',
  nativeCurrency: { name: 'OKB', symbol: 'OKB', decimals: 18 },
  rpcUrls: {
    default: { http: ['https://testrpc.xlayer.tech/terigon'] },
    public: { http: ['https://testrpc.xlayer.tech/terigon'] }
  },
  blockExplorers: {
    default: { name: 'OKX Explorer', url: 'https://www.okx.com/web3/explorer/xlayer-test' }
  }
})

export type SupportedChain = typeof bsc | typeof xLayer | typeof bscTestnet | typeof xLayerTestnet
export const defaultChains = [bsc, xLayer]



