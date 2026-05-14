
export { WalletProvider } from './providers/WalletProvider'

export * from './hooks/hooks'
export * from './hooks/useClient'
export * from './hooks/useSignature'

export * from './hooks'
export { bscTestnet, xLayerTestnet, defaultChains } from './config/chains'

// 重新导出常用的 viem 类型/工具
// 这样宿主就不需要安装 viem, 直接从 ca-common-web 导入
export { type PublicClient } from 'viem'