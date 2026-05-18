import React from "react";
import ReactDOM from "react-dom/client";
import { bscTestnet } from "viem/chains";
import "../index.css";
import { WalletPlayground } from "../examples/WalletPlayground";
import { WalletProvider } from "../wallet/providers/WalletProvider";
import { xLayerTestnet } from "../wallet/config/chains";

function TrustWalletTestApp() {
  return (
    <WalletProvider
      config={{ chains: [bscTestnet, xLayerTestnet], defaultChainId: 97 }}
    >
      <WalletPlayground />
    </WalletProvider>
  );
}

ReactDOM.createRoot(document.getElementById("root")!).render(
  <React.StrictMode>
    <TrustWalletTestApp />
  </React.StrictMode>,
);
