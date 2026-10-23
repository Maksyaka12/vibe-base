import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { usePrivy, useWallets } from '@privy-io/react-auth';
import { encodeFunctionData, formatUnits, parseAbi, parseUnits } from 'viem';
import { publicClient } from '../config/rpc';
import { sendWalletTx, isWalletRejection, waitUntil } from '../config/walletTx';
import { useUserBalances } from './useUserBalances';
import { useVibeWallets } from './useVibeWallets';

// ETH <-> $VIBE swap logic shared by the Swap panels of both themes.
// - Quotes LI.FI and KyberSwap in parallel and takes the one that gives the user more (LI.FI adds a 0.25% fee,
//   so KyberSwap usually wins); a quote older than 30 s or for other inputs is fetched again before swapping.
// - Never sends anything without a real route; approvals are for the exact amount and confirmed before the swap.
// - The result is read from the receipt: a reverted swap (e.g. price moved past slippage) is reported as failed.

const VIBE = '0xb200000000000000000000df24ecb8bf51100a01';
const LIFI_ETH = '0x0000000000000000000000000000000000000000';
const KYBER_ETH = '0xEeeeeEeeeEeEeeEeEeEeeEEEeeeeEeeeeeeeEEeE';
const KYBER = 'https://aggregator-api.kyberswap.com/base/api/v1';
const GAS_RESERVE = parseUnits('0.0001', 18); // left in the wallet when buying with "Max"
const QUOTE_TTL_MS = 30_000;
const ERC20 = parseAbi([
  'function allowance(address owner, address spender) view returns (uint256)',
  'function approve(address spender, uint256 amount) returns (bool)',
]);

const parseAmount = (s) => {
  if (!/^\d*\.?\d*$/.test(s || '') || !s || s === '.') return null;
  try {
    const v = parseUnits(s, 18);
    return v > 0n ? v : null;
  } catch {
    return null;
  }
};

const fmtVibe = (n) => (n >= 1e6 ? `${(n / 1e6).toFixed(2)}M` : n >= 1e3 ? `${(n / 1e3).toFixed(2)}K` : n.toFixed(2));
const fmtUsd = (n) => `~$${n.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })} USD`;

async function lifiQuote({ mode, amountWei, from, slippage }) {
  const params = new URLSearchParams({
    fromChain: '8453', toChain: '8453',
    fromToken: mode === 'buy' ? LIFI_ETH : VIBE,
    toToken: mode === 'buy' ? VIBE : LIFI_ETH,
    fromAmount: amountWei.toString(),
    fromAddress: from,
    slippage: String(slippage / 100),
  });
  const res = await fetch(`https://li.quest/v1/quote?${params}`);
  const data = await res.json();
  if (!res.ok || !data?.estimate || !data?.transactionRequest) throw new Error(data?.message || 'LI.FI: no route');
  return {
    engine: 'LI.FI',
    out: BigInt(data.estimate.toAmount),
    minOut: BigInt(data.estimate.toAmountMin),
    spender: data.estimate.approvalAddress || data.transactionRequest.to,
    build: async () => ({ to: data.transactionRequest.to, data: data.transactionRequest.data, value: BigInt(data.transactionRequest.value || 0) }),
  };
}

async function kyberQuote({ mode, amountWei, from, slippage }) {
  const headers = { 'x-client-id': 'vibehub' };
  const route = await fetch(`${KYBER}/routes?tokenIn=${mode === 'buy' ? KYBER_ETH : VIBE}&tokenOut=${mode === 'buy' ? VIBE : KYBER_ETH}&amountIn=${amountWei}`, { headers }).then((r) => r.json());
  if (route?.code !== 0 || !route.data?.routeSummary) throw new Error(route?.message || 'KyberSwap: no route');
  const out = BigInt(route.data.routeSummary.amountOut);
  return {
    engine: 'KyberSwap',
    out,
    minOut: out - (out * BigInt(Math.round(slippage * 100))) / 10000n,
    spender: route.data.routerAddress,
    build: async () => {
      const built = await fetch(`${KYBER}/route/build`, {
        method: 'POST',
        headers: { ...headers, 'Content-Type': 'application/json' },
        body: JSON.stringify({ routeSummary: route.data.routeSummary, sender: from, recipient: from, slippageTolerance: Math.round(slippage * 100), deadline: Math.floor(Date.now() / 1000) + 1200 }),
      }).then((r) => r.json());
      if (built?.code !== 0 || !built.data?.data) throw new Error(built?.message || 'KyberSwap could not build the swap');
      return { to: built.data.routerAddress || route.data.routerAddress, data: built.data.data, value: mode === 'buy' ? amountWei : 0n };
    },
  };
}

/** Best of LI.FI and KyberSwap for these inputs (most tokens out). */
async function bestQuote(args) {
  const results = await Promise.allSettled([kyberQuote(args), lifiQuote(args)]);
  const ok = results.filter((r) => r.status === 'fulfilled').map((r) => r.value);
  if (!ok.length) throw new Error('No swap route right now, try another amount');
  return ok.sort((a, b) => (b.out > a.out ? 1 : b.out < a.out ? -1 : 0))[0];
}

// USD prices from the deepest VIBE/ETH pool (DexScreener): VIBE = priceUsd, ETH = priceUsd / priceNative
function usePrices() {
  const [prices, setPrices] = useState({ vibe: 0, eth: 0 });
  useEffect(() => {
    let active = true;
    const load = async () => {
      try {
        const res = await fetch(`https://api.dexscreener.com/latest/dex/tokens/${VIBE}`).then((r) => r.json());
        const pair = (res?.pairs || []).filter((p) => p.chainId === 'base' && ['ETH', 'WETH'].includes(p.quoteToken?.symbol))
          .sort((a, b) => (b.liquidity?.usd || 0) - (a.liquidity?.usd || 0))[0];
        const vibe = Number(pair?.priceUsd) || 0;
        const native = Number(pair?.priceNative) || 0;
        if (active && vibe && native) setPrices({ vibe, eth: vibe / native });
      } catch (e) {}
    };
    load();
    const t = setInterval(load, 60_000);
    return () => { active = false; clearInterval(t); };
  }, []);
  return prices;
}

export function useVibeSwap() {
  const { authenticated, login } = usePrivy();
  const { wallets } = useWallets();
  const { activeAddress } = useVibeWallets();
  const balances = useUserBalances(activeAddress);
  const prices = usePrices();

  const [mode, setMode] = useState('buy'); // buy: ETH -> VIBE, sell: VIBE -> ETH
  const [fromAmount, setFromAmountRaw] = useState('');
  const [slippage, setSlippage] = useState(1.0);
  const [quote, setQuote] = useState(null); // { key, at, ...bestQuote }
  const [quoteError, setQuoteError] = useState('');
  const [isFetchingQuote, setIsFetchingQuote] = useState(false);
  const [swapping, setSwapping] = useState(false);
  const [txStatus, setTxStatus] = useState({ type: '', msg: '', hash: '' });
  const requestId = useRef(0);

  const amountWei = parseAmount(fromAmount);
  const from = activeAddress || '0x0000000000000000000000000000000000000001';
  const key = amountWei ? `${mode}:${amountWei}:${slippage}:${from.toLowerCase()}` : '';
  const balanceWei = mode === 'buy' ? balances.rawEth : balances.rawVibe;
  const insufficient = Boolean(activeAddress && amountWei && balanceWei != null && amountWei > balanceWei);

  const setFromAmount = (v) => {
    setTxStatus({ type: '', msg: '', hash: '' });
    setFromAmountRaw(String(v).replace(',', '.').replace(/[^0-9.]/g, ''));
  };

  // debounced quote; a late answer for older inputs is dropped
  useEffect(() => {
    if (!key) {
      setQuote(null);
      setQuoteError('');
      return undefined;
    }
    const id = ++requestId.current;
    const timer = setTimeout(async () => {
      setIsFetchingQuote(true);
      try {
        const q = await bestQuote({ mode, amountWei, from, slippage });
        if (id === requestId.current) {
          setQuote({ ...q, key, at: Date.now() });
          setQuoteError('');
        }
      } catch (e) {
        if (id === requestId.current) {
          setQuote(null);
          setQuoteError(e.message);
        }
      } finally {
        if (id === requestId.current) setIsFetchingQuote(false);
      }
    }, 400);
    return () => clearTimeout(timer);
  }, [key]); // eslint-disable-line react-hooks/exhaustive-deps

  const liveQuote = quote && quote.key === key ? quote : null;
  const outNum = liveQuote ? Number(formatUnits(liveQuote.out, 18)) : 0;
  const toAmount = liveQuote ? (mode === 'buy' ? fmtVibe(outNum) : outNum.toFixed(6)) : '';
  const inNum = amountWei ? Number(formatUnits(amountWei, 18)) : 0;
  const fromUsd = amountWei ? fmtUsd(inNum * (mode === 'buy' ? prices.eth : prices.vibe)) : '$0.00';
  const toUsd = liveQuote ? fmtUsd(outNum * (mode === 'buy' ? prices.vibe : prices.eth)) : '$0.00';

  // 25 / 50 / 75 / Max from the exact onchain balance
  const handlePercentage = (percent) => {
    const raw = mode === 'buy' ? balances.rawEth : balances.rawVibe;
    if (!raw) return;
    let v = (raw * BigInt(percent)) / 100n;
    if (mode === 'buy' && percent === 100) v = v > GAS_RESERVE ? v - GAS_RESERVE : 0n;
    if (v <= 0n) return;
    const text = formatUnits(v, 18);
    setFromAmount(percent === 100 && mode === 'sell' ? text : text.replace(/(\.\d{6})\d+$/, '$1'));
  };

  const handleToggleMode = () => {
    setMode((m) => (m === 'buy' ? 'sell' : 'buy'));
    setFromAmountRaw('');
    setQuote(null);
    setQuoteError('');
    setTxStatus({ type: '', msg: '', hash: '' });
  };

  const send = (tx) => sendWalletTx({ wallets, address: activeAddress, ...tx });

  const handleSwap = async () => {
    if (!authenticated || !activeAddress) {
      login?.();
      return;
    }
    if (!amountWei || insufficient) return;
    setSwapping(true);
    try {
      // a fresh quote for exactly these inputs
      let q = liveQuote;
      if (!q || Date.now() - q.at > QUOTE_TTL_MS) {
        setTxStatus({ type: 'info', msg: 'Refreshing the best price…', hash: '' });
        q = { ...(await bestQuote({ mode, amountWei, from: activeAddress, slippage })), key, at: Date.now() };
        setQuote(q);
      }

      if (mode === 'sell') {
        const allowance = await publicClient.readContract({ address: VIBE, abi: ERC20, functionName: 'allowance', args: [activeAddress, q.spender] }).catch(() => 0n);
        if (allowance < amountWei) {
          setTxStatus({ type: 'info', msg: 'Step 1/2: approve $VIBE in your wallet…', hash: '' });
          const approveHash = await send({ to: VIBE, data: encodeFunctionData({ abi: ERC20, functionName: 'approve', args: [q.spender, amountWei] }) });
          if (approveHash) await publicClient.waitForTransactionReceipt({ hash: approveHash, timeout: 90_000 });
          const ok = await waitUntil(async () => (await publicClient.readContract({ address: VIBE, abi: ERC20, functionName: 'allowance', args: [activeAddress, q.spender] })) >= amountWei);
          if (!ok) throw new Error('The approval did not confirm, try again');
        }
      }

      setTxStatus({ type: 'info', msg: mode === 'sell' ? 'Step 2/2: confirm the swap in your wallet…' : 'Confirm the swap in your wallet…', hash: '' });
      const tx = await q.build();
      const before = mode === 'buy' ? balances.rawVibe : balances.rawEth;
      const hash = await send(tx);
      setTxStatus({ type: 'info', msg: 'Swapping on Base…', hash: hash || '' });
      if (hash) {
        const receipt = await publicClient.waitForTransactionReceipt({ hash, timeout: 90_000 });
        if (receipt.status !== 'success') throw Object.assign(new Error('The swap reverted (the price moved more than your slippage). Nothing was swapped.'), { hash });
      } else {
        // smart wallet that reported no hash: wait until the received token arrives
        await waitUntil(async () => {
          const now = mode === 'buy'
            ? await publicClient.readContract({ address: VIBE, abi: parseAbi(['function balanceOf(address) view returns (uint256)']), functionName: 'balanceOf', args: [activeAddress] })
            : await publicClient.getBalance({ address: activeAddress });
          return now > before;
        });
      }
      setTxStatus({ type: 'success', msg: `Swapped via ${q.engine}`, hash: hash || '' });
      setFromAmountRaw('');
      setQuote(null);
      balances.refetch?.();
    } catch (err) {
      setTxStatus({
        type: 'error',
        msg: isWalletRejection(err) ? 'Transaction rejected in wallet' : `Swap failed: ${err?.shortMessage || err?.message || 'Error'}`,
        hash: err?.hash || '',
      });
    } finally {
      setSwapping(false);
    }
  };

  // why the swap button is disabled (null = ready)
  const blocker = useMemo(() => {
    if (!amountWei) return 'Enter an amount';
    if (insufficient) return `Insufficient ${mode === 'buy' ? 'ETH' : '$VIBE'}`;
    if (isFetchingQuote && !liveQuote) return 'Finding the best price…';
    if (!liveQuote) return quoteError || 'No route';
    return null;
  }, [amountWei, insufficient, isFetchingQuote, liveQuote, quoteError, mode]);

  return {
    authenticated, login, balances, mode, fromAmount, setFromAmount, toAmount, slippage, setSlippage,
    isFetchingQuote, swapping, txStatus, fromUsd, toUsd, handlePercentage, handleToggleMode, handleSwap,
    blocker, engine: liveQuote?.engine || null,
  };
}
