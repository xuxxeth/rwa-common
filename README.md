# ca-common-web — 快速使用指南

此库对外主要导出 wallet 与 contract 子模块。下面是常用的入口、类型与使用示例。


- 根入口：[src/index.ts](src/index.ts)（导出主要对外使用的类型和API）
- WalletProvider 项目中提供钱包上下文：[`WalletProvider`](src/wallet/providers/WalletProvider.tsx)
- 钱包模块：[src/wallet/index.ts](src/wallet/index.ts)
  - 常用 Hook / API：
    - [`useClient`](src/wallet/hooks/useClient.ts)
    - [`useSignature`](src/wallet/hooks/useSignature.ts)
    - [`useTokenBalances`](src/wallet/hooks/useTokenBalances.ts)
    - 钱包提供实现：[src/wallet/providers/WalletProvider.tsx](src/wallet/providers/WalletProvider.tsx)
    - 连接器实现：
      - [`evmConnector`](src/wallet/connectors/evmConnector.ts)
      - [`walletConnectConnector`](src/wallet/connectors/walletConnectConnector.ts)
    - 类型定义：[src/wallet/types.ts](src/wallet/types.ts)
    - 配置与链信息： [src/wallet/config/wallet.ts](src/wallet/config/wallet.ts)、[src/wallet/config/chains.ts](src/wallet/config/chains.ts)
- 合约模块：[src/contract/index.ts](src/contract/index.ts)
  - 常用 Hook / API：
    - [`useTrading`](src/contract/hooks/useTrading.ts)
    - [`useApprove`](src/contract/hooks/useApprove.ts)
    - [`useContract`](src/contract/hooks/useContract.ts)
    - [`useTokenAllowance`](src/contract/hooks/useTokenAllowance.ts)
    - [`useCallWithGasPrice`](src/contract/hooks/useCallWithGasPrice.ts)
    - [useTradingUtils](src/contract/hooks/useTradingUtils.ts)
    - 合约类型定义：[src/contract/types.ts](src/contract/types.ts)
    - 合约配置目录：[src/contract/config](src/contract/config)


---

## 集成

1. 在应用入口使用Provider（参考实现：[`WalletProvider`](src/wallet/providers/WalletProvider.tsx)）


```typescript
import React from 'react'
import { WalletProvider } from './wallet/providers/WalletProvider' // 或从包根导入: import { WalletProvider } from 'ca-common-web'
import App from './App'

// 在你的应用外层包裹 WalletProvider
function Root() {
  // 可选配置：chains / defaultChainId
  return (
    <WalletProvider config={{ chains: [], defaultChainId: 97 }}>
      <App />
    </WalletProvider>
  )
}
```

1. 在组件中使用钱包 Hook（参见实现：[src/wallet/hooks/index.ts](src/wallet/hooks/index.ts) 与具体 Hook 文件）

常见用法示例：

```typescript
import React from 'react'
import { useAccount, useConnect, useDisconnect, useChainId } from './wallet' // <- 库的导出（参见 [src/wallet/index.ts](src/wallet/index.ts)）

export function Demo() {
  const account = useAccount()
  const connect = useConnect()
  const disconnect = useDisconnect()
  const chainId = useChainId()
  const wallets = useWallets()

  return (
    <div>
      <div>Account: {account}</div>
      <div>ChainId: {chainId}</div>
      <button onClick={() => connect('inject'，wallets[0])}>Connect</button>
      <button onClick={() => disconnect()}>Disconnect</button>
    </div>
  )
}
```

3. 请求签名 / 非托管身份（参见实现：[src/wallet/hooks/useSignature.ts](src/wallet/hooks/useSignature.ts)）

示例：

```typescript
import { useSignature } from './wallet/hooks/useSignature'

function SignExample() {
  const { requestSignature } = useSignature()

  async function handleSign() {
    const res = await requestSignature(Math.floor(Date.now() / 1000 + 60 * 100))
    console.log(res) // 返回包含 signature / account / nonce / expires 等
  }

  return <button onClick={handleSign}>Sign</button>
}
```

4. 使用合约相关 Hook（参见实现：[src/contract/hooks/useTrading.ts](src/contract/hooks/useTrading.ts) 等）

示例（下单）：

```typescript
import { useTrading } from './contract/hooks/useTrading'

function PlaceOrderDemo() {
  // paymentToken = 合约 token address
  const { placeOrder, approve, approvalState, refetchAllowance } = useTrading('0xTokenAddress' as `0x${string}`, BigInt(0))

  async function doPlaceOrder() {
    if (approvalState !== 3) {
      const res = await approve()
      if (res.code !== 9200) {
        console.error('approve failed', res)
        return
      }
      await refetchAllowance()
    }

    const params = {
      stockId: '1',
      tradeType: 0, // 使用 [src/contract/types.ts](src/contract/types.ts) 中的 TradeType
      side: 0,
      tif: 0,
      sessionType: 0,
      paymentToken: '0xTokenAddress',
      validDate: String(Math.floor(Date.now()/1000 + 3600)),
      networkFee: '0',
      amount: '0',
      price: '100000',
      size: '100'
    }
    const result = await placeOrder(params, { wait: true })
    console.log(result)
  }

  return <button onClick={doPlaceOrder}>Place Order</button>
}
```
5. 使用合约相关 Hook（参见实现：[src/contract/hooks/useTradingUtils.ts](src/contract/hooks/useTradingUtils.ts) 等）

示例（撤单）：

```typescript
import { useTradingUtils } from './contract/hooks/useTradingUtils'

function CancelOrderDemo() {
  const { cancelOrder } = useTradeUtils(trading)

  const handleCancel = useCallback(async () => {
    const res = await cancelOrder(orderId, { wait: true })
      console.log(res)
      if (res.code !== 9200) {
        // @ts-ignore
        alert(res.data.message)
      }
  }, [cancelOrder])
  

  return <button onClick={handleCancel}>Cancel Order</button>
}
```

> 有关交易和类型，请参阅：[src/contract/types.ts](src/contract/types.ts)。

---

## 重要文件

- 根目录导出：[src/index.ts](src/index.ts)
- Provider上下文：[`src/wallet/providers/WalletProvider.tsx`](src/wallet/providers/WalletProvider.tsx)
- 钱包 Hook 实现目录：[src/wallet/hooks](src/wallet/hooks)
  - [`useClient`](src/wallet/hooks/useClient.ts)
  - [`useSignature`](src/wallet/hooks/useSignature.ts)
  - [`useTokenBalances`](src/wallet/hooks/useTokenBalances.ts)
- 钱包Provider实现：[src/wallet/connectors/evmConnector.ts](src/wallet/connectors/evmConnector.ts)、[src/wallet/connectors/walletConnectConnector.ts](src/wallet/connectors/walletConnectConnector.ts)
- 合约入口与 Hook：[src/contract/index.ts](src/contract/index.ts)、[src/contract/hooks](src/contract/hooks)
  - [`useTrading`](src/contract/hooks/useTrading.ts)
  - [`useApprove`](src/contract/hooks/useApprove.ts)
  - [`useContract`](src/contract/hooks/useContract.ts)
- 合约类型：[src/contract/types.ts](src/contract/types.ts)
- 相关配置：[src/wallet/config](src/wallet/config)、[src/contract/config](src/contract/config)

---

## 其它说明

- 错误码与常量请参考：[src/utils/constants.ts](src/utils/constants.ts) 与 [src/config/constants.ts](src/config/constants.ts)。
- 如果需要深度调试 WalletConnect 二维码相关逻辑，请参考实现：[src/wallet/connectors/walletConnectConnector.ts](src/wallet/connectors/walletConnectConnector.ts)。

