import { DiscoveredWallet, EIP1193Provider } from "../types";
import { bitGetWallet, trustWallet } from "../config/wallet";


const discoveredInternal: DiscoveredWallet[] = [];
const subscribers: ((w: DiscoveredWallet) => void)[] = [];

function getWindowEthereumProviders(target: Window | null | undefined) {
  const ethereum = (target as any)?.ethereum as
    | (EIP1193Provider & { providers?: EIP1193Provider[] })
    | undefined;
  if (!ethereum) {
    return [];
  }

  return Array.isArray(ethereum.providers)
    ? ethereum.providers
    : [ethereum];
}

function getAccessibleWindows() {
  const windows: Window[] = [window];
  try {
    if (window.top && window.top !== window) {
      windows.push(window.top);
    }
  } catch (_) {
    // Ignore cross-origin iframe access.
  }

  return windows;
}

function findInjectedProvider(
  matcher: (provider: EIP1193Provider) => boolean,
  getters: Array<(target: Window) => EIP1193Provider | null | undefined> = [],
) {
  const windows = getAccessibleWindows();

  for (const target of windows) {
    for (const getProvider of getters) {
      const provider = getProvider(target);
      if (provider && matcher(provider)) {
        return provider;
      }
    }
  }

  for (const target of windows) {
    const providers = getWindowEthereumProviders(target);
    const provider = providers.find(matcher);
    if (provider) {
      return provider;
    }
  }

  return null;
}

/**
 * 获取 BitGet 钱包 provider（兼容 iframe 环境和多种注入方式）
 */
function getBitgetProvider(): EIP1193Provider | null {
  return findInjectedProvider(
    (provider) =>
      !!(
        provider.isBitKeep ||
        provider.isBitget ||
        provider.isBitGetWallet ||
        provider.isBitkeep
      ),
    [
      (target) => (target as any)?.bitkeep?.ethereum,
      (target) => (target as any)?.bitget?.ethereum,
    ],
  );
}

function getTrustWalletProvider(): EIP1193Provider | null {
  return findInjectedProvider(
    (provider) => !!(provider.isTrust || provider.isTrustWallet),
    [
      (target) => (target as any)?.trustwallet?.ethereum,
      (target) => (target as any)?.trustwallet,
    ],
  );
}
/**
 * Discover wallets via EIP-6963 events with a legacy fallback.
 * @param timeout ms to wait for announcements
 */
export function discoverWallets(timeout = 300): Promise<DiscoveredWallet[]> {
  if (typeof window === "undefined") return Promise.resolve([]);
  const found: DiscoveredWallet[] = [];
  
  const onAnnounce = (event: any) => {
    const detail = event?.detail;
    if (detail?.info && detail?.provider) {
      const entry: DiscoveredWallet = {
        info: detail.info,
        provider: detail.provider,
      };
      found.push(entry);
      subscribers.forEach((cb) => cb(entry));
    }
  };

  window.addEventListener("eip6963:announceProvider", onAnnounce as any);
  window.dispatchEvent(new Event("eip6963:requestProvider"));
  
  return new Promise((resolve) => {
    setTimeout(() => {
      window.removeEventListener("eip6963:announceProvider", onAnnounce as any);

      const bitgetProvider = getBitgetProvider();
      if (bitgetProvider) {
        const entry: DiscoveredWallet = {
          info: bitGetWallet.info,
          provider: bitgetProvider,
        };
        found.push(entry);
        subscribers.forEach((cb) => cb(entry));
      }

      const trustProvider = getTrustWalletProvider();
      if (trustProvider) {
        const entry: DiscoveredWallet = {
          info: trustWallet.info,
          provider: trustProvider,
        };
        found.push(entry);
        subscribers.forEach((cb) => cb(entry));
      }

      const ethProviders = getWindowEthereumProviders(window);
      if (ethProviders.length > 0 && found.length <= 0) {
        ethProviders.forEach((prov: EIP1193Provider, idx: number) => {
          const name = prov.isTrust || prov.isTrustWallet
            ? "Trust Wallet"
            : prov.isMetaMask
              ? "MetaMask"
              : prov.isOKXWallet
                ? "OKX Wallet"
                : prov.isCoinbaseWallet
                  ? "Coinbase Wallet"
                  : "Injected";
          found.push({
            info: { uuid: prov?.id || `injected-${idx}`, name },
            provider: prov,
          });
        });
      }

      const unique = dedupe(found);
      discoveredInternal.splice(0, discoveredInternal.length, ...unique);
      resolve(unique);
    }, timeout);
  });
}

function dedupe(list: DiscoveredWallet[]) {
  const map = new Map<string, DiscoveredWallet>();
  for (const w of list) {
    const key = w.info.rdns || w.info.name;
    if (!map.has(key)) map.set(key, w);
  }
  return Array.from(map.values());
}

export function onWalletDiscovered(cb: (w: DiscoveredWallet) => void) {
  subscribers.push(cb);
  return () => {
    const i = subscribers.indexOf(cb);
    if (i >= 0) subscribers.splice(i, 1);
  };
}

export function getDiscovered(): DiscoveredWallet[] {
  return [...discoveredInternal];
}
