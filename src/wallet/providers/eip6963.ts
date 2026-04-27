import { DiscoveredWallet, EIP1193Provider } from "../types"
import { bitGetWallet } from "../config/wallet";


const discoveredInternal: DiscoveredWallet[] = []
const subscribers: ((w: DiscoveredWallet) => void)[] = []

/**
 * 获取 BitGet 钱包 provider（兼容 iframe 环境和多种注入方式）
 */
function getBitgetProvider(): EIP1193Provider | null {
  // 1. 当前 window
  const fromCurrent =
    (window as any)?.bitkeep?.ethereum ||
    (window as any)?.bitget?.ethereum
  if (fromCurrent) return fromCurrent

  
  // 2. 顶层 window（Storybook 等 iframe 场景，扩展只注入顶层）
  try {
    if (window.top && window.top !== window) {
      console.log('window.top.........', window.top)
      const fromTop =
        (window.top as any)?.bitkeep?.ethereum ||
        (window.top as any)?.bitget?.ethereum
      if (fromTop) return fromTop
    }
  } catch (_) {
    // 跨域 iframe 访问 window.top 会抛错，忽略
  }

  // 3. 从 window.ethereum.providers 数组中查找
  const eth = (window as any)?.ethereum
  if (eth) {
    const providers: any[] = Array.isArray(eth.providers) ? eth.providers : [eth]
    const bitget = providers.find(
      (p: any) => p.isBitKeep || p.isBitget || p.isBitGetWallet || p.isBitkeep
    )
    if (bitget) return bitget
  }

  return null
}
/**
 * Discover wallets via EIP-6963 events with a legacy fallback.
 * @param timeout ms to wait for announcements
 */
export function discoverWallets(timeout = 300): Promise<DiscoveredWallet[]> {
  if (typeof window === 'undefined') return Promise.resolve([])
  const found: DiscoveredWallet[] = []
  
  const onAnnounce = (event: any) => {
    const detail = event?.detail
    if (detail?.info && detail?.provider) {
      const entry: DiscoveredWallet = { info: detail.info, provider: detail.provider }
      found.push(entry)
      subscribers.forEach(cb => cb(entry))
    }
  }

  window.addEventListener('eip6963:announceProvider', onAnnounce as any)
  window.dispatchEvent(new Event('eip6963:requestProvider'))
  
  return new Promise((resolve) => {
    setTimeout(() => {
      window.removeEventListener('eip6963:announceProvider', onAnnounce as any)

      // 检测 BitGet 钱包（兼容 iframe、顶层 window、providers 数组等多种注入方式）
      const bitgetProvider = getBitgetProvider()
      if (bitgetProvider) {
        console.log('bitgetProvider', bitgetProvider)
        const entry: DiscoveredWallet = {
          info: bitGetWallet.info,
          provider: bitgetProvider
        }
        found.push(entry)
        subscribers.forEach(cb => cb(entry))
      }

      // 如果没有监听到钱包注入事件，再从window.ethereum重新获取下钱包
      const eth: any = (window as any).ethereum
      if (eth && found.length <= 0) {
        const providers = Array.isArray(eth.providers) ? eth.providers : [eth]
        providers.forEach((prov: EIP1193Provider, idx: number) => {
          const name = prov.isMetaMask ? 'MetaMask'
            : prov.isOKXWallet ? 'OKX Wallet'
            : prov.isCoinbaseWallet ? 'Coinbase Wallet'
            : 'Injected'
          found.push({
            info: { uuid: prov?.id || `injected-${idx}`, name },
            provider: prov
          })
        })
      }
      
      const unique = dedupe(found)
      discoveredInternal.splice(0, discoveredInternal.length, ...unique)
      resolve(unique)
    }, timeout)
  })
}

function dedupe(list: DiscoveredWallet[]) {
  const map = new Map<string, DiscoveredWallet>()
  for (const w of list) {
    // const key = w.info.uuid || w.info.name || w.info.rdns || ''
    const key = w.info.rdns || w.info.name
    if (!map.has(key)) map.set(key, w)
  }
  return Array.from(map.values())
}

export function onWalletDiscovered(cb: (w: DiscoveredWallet) => void) {
  subscribers.push(cb)
  return () => {
    const i = subscribers.indexOf(cb)
    if (i >= 0) subscribers.splice(i, 1)
  }
}

export function getDiscovered(): DiscoveredWallet[] {
  return [...discoveredInternal]
}
