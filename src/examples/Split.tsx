
import { useCallback, useEffect, useMemo, useState } from "react";
import { Address, parseEther, zeroAddress } from "viem";
import { Button } from "../components/button";
import { useTokenBalances } from "../wallet/index";
import { useClient } from "../wallet/hooks/useClient";
import {
  useAccount,
  useChainId,

} from "../wallet/hooks/hooks";
import { getAddress, parseAmount } from "../utils";
import "../utils/parseError";
import { TradingNetworks } from "../contract/config/trading";
import { useSplit } from "../contract";

export function SplitCompoent() {
  const account = useAccount();
  const chainId = useChainId();

  const [payinAmount, setPayinAmount] = useState("2");
  const [payinToken, setPayinToken] = useState<Address | undefined>('0x14484a7A8B72018E33bb6d1E84DcaBb04896b3Da');
  const [trading, setTrading] = useState<Address | undefined>(undefined);

  const { getTokenBalances } = useTokenBalances();
  const { publicClient } = useClient();
  const { approvalState, allowance, txStep, refetchAllowance, exchangeToken } =
    useSplit(
      payinToken,
      trading,
      BigInt(parseAmount(payinAmount, 6)),
    );

  const formatLargeValue = useCallback((value: unknown) => {
    const text = String(value ?? "-");
    if (text.length <= 16) {
      return text;
    }
    return `${text.slice(0, 8)}...${text.slice(-6)}`;
  }, []);

  useEffect(() => {
    
    setTimeout(() => {
      if (chainId) {
        const trading = getAddress(TradingNetworks, chainId)
        setTrading(trading);
      }
      
    }, 500);
  }, [publicClient, chainId]);

  useEffect(() => {
    if (account && payinToken) {
      getTokenBalances(account, [
        payinToken,
      ]).then((res) => {
        console.log('payinToken balance: ', res);
      });
    }
  }, [account, payinToken, getTokenBalances]);

  const handlePlaceOrder = useCallback(async () => {
    if (!payinToken) return
    const params = {
      payinToken: payinToken,
      payinAmount: parseAmount(payinAmount, 6),
    };
    console.log("params: ", params);
    const res = await exchangeToken(params, { wait: true });
    console.log("exchangeToken res:", res);
  }, [exchangeToken, payinAmount, payinToken]);


  return (
    <div className="rounded-3xl border border-slate-800 bg-slate-900/70 p-6">
      <div className="mb-5 text-sm font-medium text-slate-200">
        Split Contract
      </div>
      <div>
        <label>PayinToken: </label>
        <input 
          type="text" className='border bg-black' value={payinToken} onChange={e => {
          setPayinToken(e.target.value as Address)
        }} />
      </div>
      <div className="mt-2">
        <label>PayinAmout: </label>
        <input type="text" className='border bg-black' value={payinAmount} onChange={e => {
          setPayinAmount(e.target.value)
        }} />
      </div>
      <div className="flex flex-wrap items-center gap-3 text-sm text-slate-300">
        <span>approvalState: {String(approvalState)}</span>
        <span>allowance: {formatLargeValue(allowance)}</span>
        <span>txStep: {String(txStep)}</span>
      </div>
      <div className="mt-4 flex flex-wrap gap-3">
        <Button onClick={() => refetchAllowance()} label="Refetch Allowance" />
        <Button onClick={() => handlePlaceOrder()} label="ExchangeToken" />
      </div>
    </div>
  );
}
