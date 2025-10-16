import { DiscoveredWallet, EIP1193Provider } from "../types"


const discoveredInternal: DiscoveredWallet[] = []
const subscribers: ((w: DiscoveredWallet) => void)[] = []

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
