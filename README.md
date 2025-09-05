## ca-common-web

### 暂时实现功能

#### 默认配置定义bsc和xplayer两个链

#### 提供WalletProvider供业务项目使用

```typescript
  import { WalletProvider, bsc, xLayer } from 'ca-common-h5'

  <StrictMode>
    <WalletProvider config={{ chains: [bsc, xLayer], defaultChainId: 56 }}>
      <App />
    </WalletProvider>
  </StrictMode>
  import { useAccount, useChainId, useConnect, useDisconnect, useSwitchChain, useWallets, bsc, xLayer  } from 'ca-common-h5'

```
#### hooks，业务代码使用

```typescript
  import { useAccount, useChainId, useConnect, useDisconnect, useSwitchChain, useWallets, bsc, xLayer  } from 'ca-common-h5'
  const wallets = useWallets()
  const connect = useConnect()
  const disconnect = useDisconnect()
  const account = useAccount()
  const chainId = useChainId()
  const switchChain = useSwitchChain()

```