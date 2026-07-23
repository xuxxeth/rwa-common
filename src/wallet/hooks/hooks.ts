import { useCallback, useState, useEffect, useMemo } from "react";
import { useWalletContext } from "../providers/WalletProvider";
import {
  ConnectorType,
  DiscoveredWallet,
  WalletConfig,
  QrCodeData,
} from "../types";
import { WalletConnectConnector } from "../connectors/walletConnectConnector";

export function useConnector() {
  return useWalletContext().connector;
}

export function useWallets() {
  return useWalletContext().wallets;
}

export function useChains() {
  return useWalletContext().chains;
}

export function useConnect() {
  const { connect } = useWalletContext();
  return useCallback(
    async (type: ConnectorType, chainId: number, wallet?: WalletConfig) => {
      await connect(type, chainId, wallet);
    },
    [connect]
  );
}

export function useInitialized() {
  const ctx =  useWalletContext()
  return ctx.initialized
}

export function useDisconnect() {
  const { disconnect } = useWalletContext();
  return useCallback(async () => {
    disconnect();
  }, [disconnect]);
}

export function useAccount() {
  const { state } = useWalletContext();
  return state.accounts[0];
}

export function useConnectedWallet() {
  const { state } = useWalletContext();
  return state.wallet;
}

export function useQrCodeData() {
  const connector = useConnector();
  const [qrCodeData, setQrCodeData] = useState<QrCodeData | null>(() => {
    if (connector instanceof WalletConnectConnector) {
      return connector.getQrCodeData();
    }
    return null;
  });

  useEffect(() => {
    if (!connector) return;
    if (!(connector instanceof WalletConnectConnector)) return;

    const unsubscribe = connector.on(
      "qrCodeDataChanged",
      (data: QrCodeData | null) => {
        setQrCodeData(data);
      }
    );

    return () => {
      if (unsubscribe) {
        unsubscribe();
      }
    };
  }, [connector]);

  return { dataUrl: qrCodeData?.dataUrl };
}

export function useChainId() {
  const { state } = useWalletContext();
  return state.chainId;
}

export function useChainIdAndIsSupported() {
  const { state } = useWalletContext();
  return { chainId: state.chainId, isChainSupported: state.isChainSupported }
}

export function useSwitchChain() {
  const { switchChain } = useWalletContext();
  return useCallback(
    async (targetChainId: number) => {
      await switchChain(targetChainId);
    },
    [switchChain]
  );
}

/**
 * 判断当前链是否是支持的链
 */

export function useIsSupportChain() {
  const chainId = useChainId()
  const chains = useChains()

  return useMemo(() => {
    return !!chains.find((chain) => chain.id === chainId);
  }, [chainId, chains])
}
