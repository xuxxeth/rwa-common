import React from "react";
import { createRoot } from "react-dom/client";
import {
  WalletProvider,
  useWallets,
  useConnect,
  useDisconnect,
  useAccount,
  useChainId,
  useClient,
  useSignature,
  useQrCodeData,
  useTrading,
} from "./wallet";
import { bscTestnet, xLayerTestnet } from "./wallet/config/chains";
import "./index.css";


// 测试组件
function WalletTestApp() {
  const wallets = useWallets();
  const connect = useConnect();
  const disconnect = useDisconnect();
  const account = useAccount();
  const chainId = useChainId();
  const { publicClient, walletClient } = useClient();
  const { requestSignature } = useSignature();
  const qrCodeData = useQrCodeData();


  // 连接钱包
  const handleConnect = async (type: "injected" | "walletconnect") => {
    try {
      if (type === "injected") {
        const metaMaskWallet = wallets.find((wallet) =>
          wallet.info.name.toLowerCase().includes("metamask")
        );
        if (metaMaskWallet) {
          await connect("injected", metaMaskWallet);
        } else {
          console.warn("MetaMask 钱包未找到");
        }
      } else if (type === "walletconnect") {
        await connect("walletconnect");
      }
    } catch (error) {
      console.error("连接失败:", error);
    }
  };

  // 断开连接
  const handleDisconnectClick = async () => {
    try {
      await disconnect();
    } catch (error) {
      console.error("断开连接失败:", error);
    }
  };

  // 签名测试
  const handleSign = async () => {
    if (!account) {
      console.warn("请先连接钱包");
      return;
    }

    try {
      console.log("开始签名...");
      const signature = await requestSignature(100);
      console.log("签名结果:", signature);
      alert(`签名成功: ${signature}`);
    } catch (error) {
      console.error("签名失败:", error);
      alert(`签名失败: ${error instanceof Error ? error.message : "未知错误"}`);
    }
  };

  return (
    <div style={{ padding: "20px", fontFamily: "Arial, sans-serif" }}>
      <h1>WalletProvider 测试应用</h1>

      {/* 钱包状态显示 */}
      <div
        style={{
          marginBottom: "20px",
          padding: "15px",
          border: "1px solid #ddd",
          borderRadius: "8px",
        }}
      >
        <h3>钱包状态</h3>
        <p>
          <strong>账户地址:</strong> {account || "未连接"}
        </p>
        <p>
          <strong>链 ID:</strong> {chainId || "未连接"}
        </p>
        <p>
          <strong>连接状态:</strong> {account ? "已连接" : "未连接"}
        </p>
        <p>
          <strong>客户端状态:</strong>{" "}
          {publicClient && walletClient ? "已初始化" : "未初始化"}
        </p>
      </div>

      {/* 可用钱包列表 */}
      <div style={{ marginBottom: "20px" }}>
        <h3>可用钱包 ({wallets.length})</h3>
        <div style={{ display: "flex", gap: "10px", flexWrap: "wrap" }}>
          {wallets.map((wallet, index) => (
            <div
              key={index}
              style={{
                padding: "10px",
                border: "1px solid #ccc",
                borderRadius: "6px",
                backgroundColor: wallet.detected ? "#f0f8ff" : "#f5f5f5",
              }}
            >
              <p>
                <strong>{wallet.info.name}</strong>
              </p>
              <p>类型: {wallet.info.type}</p>
              <p>状态: {wallet.detected ? "已检测" : "未检测"}</p>
            </div>
          ))}
        </div>
      </div>

      {qrCodeData && (
        <div>
          <h3>WalletConnect QR Code</h3>
          <img
            style={{ width: "200px", height: "200px" }}
            src={qrCodeData.dataUrl}
            alt="WalletConnect QR Code"
          />
        </div>
      )}

      {/* 操作按钮 */}
      <div style={{ display: "flex", gap: "10px", marginBottom: "20px" }}>
        <button
          onClick={() => handleConnect("injected")}
          style={{
            padding: "10px 20px",
            backgroundColor: "#007bff",
            color: "white",
            border: "none",
            borderRadius: "6px",
            cursor: "pointer",
          }}
        >
          连接 MetaMask
        </button>

        <button
          onClick={() => handleConnect("walletconnect")}
          style={{
            padding: "10px 20px",
            backgroundColor: "#28a745",
            color: "white",
            border: "none",
            borderRadius: "6px",
            cursor: "pointer",
          }}
        >
          连接 WalletConnect
        </button>

        <button
          onClick={handleDisconnectClick}
          style={{
            padding: "10px 20px",
            backgroundColor: "#dc3545",
            color: "white",
            border: "none",
            borderRadius: "6px",
            cursor: "pointer",
          }}
        >
          断开连接
        </button>

        <button
          onClick={handleSign}
          style={{
            padding: "10px 20px",
            backgroundColor: "#ffc107",
            color: "black",
            border: "none",
            borderRadius: "6px",
            cursor: "pointer",
          }}
        >
          测试签名
        </button>
      </div>

      {/* 调试信息 */}
      <div
        style={{
          marginTop: "30px",
          padding: "15px",
          backgroundColor: "#f8f9fa",
          borderRadius: "8px",
        }}
      >
        <h3>调试信息</h3>
        <details>
          <summary>查看详细状态</summary>
          <pre style={{ fontSize: "12px", overflow: "auto" }}>
            {JSON.stringify(
              {
                账户: account,
                链ID: chainId,
                钱包数量: wallets.length,
                公共客户端: !!publicClient,
                钱包客户端: !!walletClient,
                钱包列表: wallets.map((w) => ({
                  name: w.info.name,
                  detected: w.detected,
                })),
              },
              null,
              2
            )}
          </pre>
        </details>
      </div>
    </div>
  );
}

// 应用根组件
function App() {
  return (
    <WalletProvider
      config={{
        chains: [bscTestnet, xLayerTestnet],
        defaultChainId: bscTestnet.id,
      }}
    >
      <WalletTestApp />
    </WalletProvider>
  );
}

// 渲染应用
const container = document.getElementById("root");
if (container) {
  const root = createRoot(container);
  root.render(<App />);
} else {
  console.error("找不到根元素 #root");
}
