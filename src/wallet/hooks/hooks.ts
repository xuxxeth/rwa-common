import { useCallback, useState, useEffect } from "react";
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
    async (type: ConnectorType, wallet?: WalletConfig) => {
      connect(type, wallet);
    },
    [connect]
  );
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

export function useQrCodeData() {
  const connector = useConnector();
  const [qrCodeData, setQrCodeData] = useState<QrCodeData | null>(() => {
    if(connector instanceof WalletConnectConnector) {
      return connector.getQrCodeData()
    }
    return null
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

export function useSwitchChain() {
  const { connector } = useWalletContext();
  return useCallback(
    async (targetChainId: number) => {
      await connector?.switchChain(targetChainId);
    },
    [connector]
  );
}
