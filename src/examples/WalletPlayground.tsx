import { useCallback, useEffect, useMemo, useState } from "react";
import { Address, parseEther, zeroAddress } from "viem";
import { Button } from "../components/button";
import { useCounter } from "../contract/hooks/useCounter";
import { useTradingV2 } from "../contract/hooks/useTradingV2";
import { useTradeUtilsV2 } from "../contract/hooks/useTradingUtilsV2";
import { useTokenBalances } from "../wallet/index";
import { useClient } from "../wallet/hooks/useClient";
import {
  useAccount,
  useChainId,
  useConnectedWallet,
  useConnect,
  useDisconnect,
  useSwitchChain,
  useWallets,
} from "../wallet/hooks/hooks";
import { ConnectorType } from "../wallet/types";
import { bscTestnet, xLayerTestnet } from "../wallet/config/chains";
import { parseAmount } from "../utils";
import { SessionType, SideType, TifType, TradeType } from "../contract/types";
import "../utils/parseError";
import { useMarket } from "../contract/hooks/useMarket";

export function WalletPlayground() {
  const wallets = useWallets();
  const connect = useConnect();
  const disconnect = useDisconnect();
  const account = useAccount();
  const connectedWallet = useConnectedWallet();
  const chainId = useChainId();
  const switchChain = useSwitchChain();
  const { handleGetX, handleInc, handleIncBy } = useCounter();
  const [xValue, setXValue] = useState(0);

  const [action, setAction] = useState("buy");
  const [limitPrice, setLimitPrice] = useState("231");
  const [size, setSize] = useState("2");
  const [trading, setTrading] = useState<Address | undefined>(undefined);

  const { getTokenBalances } = useTokenBalances();
  const { publicClient } = useClient();
  const { approvalState, allowance, txStep, refetchAllowance, placeOrder } =
    useTradingV2(
      "0xbeD5856646F1faBDFc565F47f8Ea18685466B745",
      trading,
      action !== "buy"
        ? BigInt(parseAmount(size, 6))
        : BigInt(parseAmount((BigInt(limitPrice) * BigInt(size)).toString(), 6)),
    );
  const { cancelOrder, txStep: cancelTxStep } = useTradeUtilsV2(trading);

  const injectedWallets = useMemo(
    () => wallets.filter((wallet) => wallet.type !== "walletConnect"),
    [wallets],
  );

  const walletConnectWallet = useMemo(
    () => wallets.find((wallet) => wallet.type === "walletConnect"),
    [wallets],
  );

  const getX = useCallback(async () => {
    const result = await handleGetX();
    setXValue(Number(result));
  }, [handleGetX]);

  const formatLargeValue = useCallback((value: unknown) => {
    const text = String(value ?? "-");
    if (text.length <= 16) {
      return text;
    }
    return `${text.slice(0, 8)}...${text.slice(-6)}`;
  }, []);

  useEffect(() => {
    publicClient?.getBlockNumber().then((res) => {
      console.log("BlockNumber: ", res);
    });

    setTimeout(() => {
      setTrading("0x6c5A81eC1D8cF4A389F6Cc9498A3096CF823cb88");
    }, 500);
  }, [publicClient]);

  useEffect(() => {
    if (account) {
      getTokenBalances(account, [
        "0xbeD5856646F1faBDFc565F47f8Ea18685466B745",
        "0x034f5688711aE01AAAc81AcFC9cB1Ce9c4Cc1Ec5",
      ]).then((res) => {
        console.log(res);
      });
    }
  }, [account, getTokenBalances]);

  const handlePlaceOrder = useCallback(async () => {
    const params = {
      stockId: "1",
      tradeType: TradeType.LIMIT,
      side: action === "buy" ? SideType.BUYLIMIT : SideType.SELL,
      tif: TifType.DAY,
      sessionType: SessionType.DEFAULT,
      paymentToken: "0xbeD5856646F1faBDFc565F47f8Ea18685466B745",
      validDate: "1",
      networkFee: "0",
      amount: "0",
      price: parseAmount(limitPrice, 6),
      size: parseAmount(size, 6),
      clientAddress: zeroAddress,
    };
    console.log("params: ", params);
    const res = await placeOrder(params, { wait: true, value: parseEther("0").toString() });
    console.log("placeOrder res:", res);
  }, [action, limitPrice, placeOrder, size]);

  const { getFeeConfig } = useMarket(trading)
  const handleGetFeeRules = useCallback(async () => {
    const result = await getFeeConfig();
    console.log(result)
  }, [handleGetX]);

  return (
    <div className="mx-auto flex min-h-screen max-w-[1700px] flex-col gap-8 bg-slate-950 px-6 py-10 text-slate-50">
      <section className="rounded-3xl border border-slate-800 bg-slate-900/70 p-6 shadow-2xl shadow-slate-950/40">
        <div className="flex flex-col gap-3 md:flex-row md:items-end md:justify-between">
          <div>
            <p className="text-sm uppercase tracking-[0.28em] text-cyan-400">
              Top Window Test Page
            </p>
            <h1 className="mt-2 text-3xl font-semibold text-white">
              TrustWallet Playground
            </h1>
            <p className="mt-2 max-w-2xl text-sm leading-6 text-slate-300">
              This page renders outside Storybook&apos;s preview iframe so
              injected wallets like Trust Wallet can be tested directly in the
              top-level browsing context.
            </p>
          </div>
          <div className="rounded-2xl border border-cyan-500/20 bg-cyan-500/10 px-4 py-3 text-sm text-cyan-100">
            <div>iframe: {window.self === window.top ? "no" : "yes"}</div>
            <div>detected wallets: {wallets.filter((wallet) => wallet.detected).length}</div>
          </div>
        </div>
      </section>

      <section className="grid gap-6 xl:grid-cols-3">
        <div className="flex flex-col gap-6">
          <div className="rounded-3xl border border-slate-800 bg-slate-900/70 p-6">
            <div className="text-sm font-medium text-slate-200">Switch chain</div>
            <div className="mt-4 flex flex-col gap-3">
              {[bscTestnet, xLayerTestnet].map((chain) => (
                <Button
                  key={chain.id}
                  onClick={() => switchChain(chain.id)}
                  label={chain.name}
                />
              ))}
            </div>
          </div>

          <div className="rounded-3xl border border-slate-800 bg-slate-900/70 p-6">
            <div className="text-sm font-medium text-slate-200">WalletConnect</div>
            <div className="mt-4 flex flex-wrap gap-3">
              <Button
                onClick={() => connect(ConnectorType.WalletConnect, walletConnectWallet)}
                label="WalletConnect"
              />
              <Button onClick={() => disconnect()} label="Disconnect WC" />
            </div>
          </div>
        </div>

        <div className="rounded-3xl border border-slate-800 bg-slate-900/70 p-6">
          <div className="flex items-center justify-between">
            <div className="text-sm font-medium text-slate-200">
              Injected wallets
            </div>
            {account ? (
              <Button onClick={() => disconnect()} label="Disconnect" />
            ) : null}
          </div>

          <div className="mt-5 grid gap-3">
            {injectedWallets.map((wallet) => {
              const isConnectedWallet =
                !!account &&
                (connectedWallet?.info.rdns || connectedWallet?.info.name) ===
                  (wallet.info.rdns || wallet.info.name);

              return (
                <div
                  key={wallet.info.rdns || wallet.info.name}
                  className="flex items-center justify-between rounded-2xl border border-slate-800 bg-slate-950/60 px-4 py-3"
                >
                  <div className="flex min-w-0 items-center gap-3">
                    {wallet.info.icon ? (
                      <img
                        src={wallet.info.icon}
                        style={{ width: 34, height: 34 }}
                        alt={wallet.info.name}
                      />
                    ) : null}
                    <div>
                      <div className="font-medium text-white">
                        {wallet.info.name}
                      </div>
                      <div className="text-xs text-slate-400">
                        {wallet.detected ? "Detected" : "Configured only"}
                      </div>
                    </div>
                  </div>
                  <Button
                    onClick={() =>
                      isConnectedWallet
                        ? disconnect()
                        : connect(ConnectorType.Injected, wallet)
                    }
                    label={isConnectedWallet ? "Disconnect" : "Connect"}
                  />
                </div>
              );
            })}
          </div>

          <div className="mt-5 grid gap-2 rounded-2xl border border-slate-800 bg-slate-950/60 p-4 text-sm text-slate-300">
            <div>Account: {account || "-"}</div>
            <div>ChainId: {chainId || "-"}</div>
          </div>
        </div>

        <div className="flex flex-col gap-6">
          <div className="rounded-3xl border border-slate-800 bg-slate-900/70 p-6">
            <div className="mb-5 text-sm font-medium text-slate-200">
              Contract Methods
            </div>
            <div className="flex flex-wrap items-center gap-4">
              <Button onClick={() => getX()} label="Get X" />
              <span className="text-sm text-slate-300">[{xValue}]</span>
              <Button onClick={() => handleInc()} label="Inc" />
              <Button onClick={() => handleIncBy("5")} label="IncBy" />
            </div>
          </div>
          <div className="rounded-3xl border border-slate-800 bg-slate-900/70 p-6">
            <div className="mb-5 text-sm font-medium text-slate-200">
              Market Methods
            </div>
            <div className="flex flex-wrap items-center gap-4">
              <Button onClick={() => handleGetFeeRules()} label="Get Fee" />
              <span className="text-sm text-slate-300">[{xValue}]</span>
              
            </div>
          </div>

          <div className="rounded-3xl border border-slate-800 bg-slate-900/70 p-6">
            <div className="mb-5 text-sm font-medium text-slate-200">
              Trading Contract
            </div>
            <div className="flex flex-wrap items-center gap-3 text-sm text-slate-300">
              <span>approvalState: {String(approvalState)}</span>
              <span>allowance: {formatLargeValue(allowance)}</span>
              <span>txStep: {String(txStep)}</span>
              <span>cancelTxStep: {String(cancelTxStep)}</span>
            </div>
            <div className="mt-4 flex flex-wrap gap-3">
              <Button onClick={() => refetchAllowance()} label="Refetch Allowance" />
              <Button onClick={() => handlePlaceOrder()} label="Place Order" />
              <Button onClick={() => cancelOrder("29532595632996353")} label="Cancel Order" />
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}
