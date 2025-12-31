import { defineChain } from 'viem'

export const bsc = defineChain({
  id: 56,
  name: 'BNB Smart Chain',
  network: 'bsc',
  nativeCurrency: { name: 'BNB', symbol: 'BNB', decimals: 18 },
  rpcUrls: {
    default: { http: ['https://bsc-dataseed.bnbchain.org', 'https://bsc-dataseed1.bnbchain.org', 'https://bsc-dataseed1.ninicoin.io'] },
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
    default: { http: ['https://data-seed-prebsc-2-s2.bnbchain.org:8545', 'https://data-seed-prebsc-2-s1.bnbchain.org:8545', 'https://data-seed-prebsc-2-s3.bnbchain.org:8545'] },
    public: { http: ['https://data-seed-prebsc-1-s1.bnbchain.org:8545'] }
  },
  blockExplorers: {
    default: { name: 'BscScan', url: 'https://testnet.bscscan.com' }
  },
  contracts: {
    multicall3: {
      address: '0xca11bde05977b3631167028862be2a173976ca11',
      blockCreated: 17422483, // 部署区块高度，随便填也能用，但最好写正确
    },
  },
})

// OKX X Layer
export const xLayer = defineChain({
  id: 196,
  name: 'X Layer',
  network: 'xlayer',
  nativeCurrency: { name: 'OKB', symbol: 'OKB', decimals: 18 },
  rpcUrls: {
    default: { http: ['https://rpc.xlayer.tech', 'https://xlayerrpc.okx.com'] },
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



