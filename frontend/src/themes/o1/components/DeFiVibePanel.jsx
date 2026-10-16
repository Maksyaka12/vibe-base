import { useState, useEffect, useMemo } from 'react';
import { ArrowUpDown } from 'lucide-react';
import { usePrivy, useWallets } from '@privy-io/react-auth';
import { parseUnits, formatUnits, encodeFunctionData } from 'viem';
import { publicClient } from '../../../config/rpc';
import { useUserBalances } from '../../../hooks/useUserBalances';
import { Button } from './ui';
import { DATA_SUFFIX, appendBuilderSuffix } from '../../../config/builderCode';

const ETH_ZERO_ADDRESS = '0x0000000000000000000000000000000000000000';
const KYBER_ETH_ADDRESS = '0xEeeeeEeeeEeEeeEeEeEeeEEEeeeeEeeeeeeeEEeE';
const VIBE_TOKEN_ADDRESS = '0xb200000000000000000000df24ecb8bf51100a01';

const ERC20_ABI = [
  {
    constant: true,
    inputs: [{ name: 'owner', type: 'address' }, { name: 'spender', type: 'address' }],
    name: 'allowance',
    outputs: [{ name: '', type: 'uint256' }],
    type: 'function'
  },
  {
    constant: false,
    inputs: [{ name: 'spender', type: 'address' }, { name: 'amount', type: 'uint256' }],
    name: 'approve',
    outputs: [{ name: '', type: 'bool' }],
    type: 'function'
  }
];

export default function DeFiVibePanel({ player }) {
  const { authenticated, user, sendTransaction, login } = usePrivy();
  const { wallets } = useWallets();
  const rawAddress = user?.wallet?.address;
  const balances = useUserBalances(rawAddress);

  const [mode, setMode] = useState('buy'); // 'buy' (ETH -> VIBE) | 'sell' (VIBE -> ETH)
  const [fromAmount, setFromAmount] = useState('');
  const [toAmount, setToAmount] = useState('');
  const [rawEthOutput, setRawEthOutput] = useState(0);
  const [slippage, setSlippage] = useState(1.0); // 1%
  const [quoteData, setQuoteData] = useState(null);
  const [isFetchingQuote, setIsFetchingQuote] = useState(false);
  const [swapping, setSwapping] = useState(false);
  const [txStatus, setTxStatus] = useState({ type: '', msg: '', hash: '' });
  const [ethPriceUsd, setEthPriceUsd] = useState(2700);

  // Fetch ETH USD price from public API
  useEffect(() => {
    let active = true;
    async function fetchEthPrice() {
      try {
        const res = await fetch('https://api.coingecko.com/api/v3/simple/price?ids=ethereum&vs_currencies=usd');
        const data = await res.json();
        if (active && data?.ethereum?.usd) {
          setEthPriceUsd(data.ethereum.usd);
        }
      } catch (e) {
        // Fallback default ~2700 USD
      }
    }
    fetchEthPrice();
    const interval = setInterval(fetchEthPrice, 30000);
    return () => { active = false; clearInterval(interval); };
  }, []);

  // Optimized Direct Route Quote Fetching (LI.FI Engine with KyberSwap fallback)
  useEffect(() => {
    if (!fromAmount || isNaN(fromAmount) || Number(fromAmount) <= 0) {
      setQuoteData(null);
      setToAmount('');
      setRawEthOutput(0);
      return;
    }

    const timer = setTimeout(async () => {
      setIsFetchingQuote(true);
      try {
        const tokenIn = mode === 'buy' ? ETH_ZERO_ADDRESS : VIBE_TOKEN_ADDRESS;
        const tokenOut = mode === 'buy' ? VIBE_TOKEN_ADDRESS : ETH_ZERO_ADDRESS;
        const amountInWei = parseUnits(fromAmount, 18).toString();
        const userAddr = rawAddress || '0x0000000000000000000000000000000000000001';
        const slippageDecimal = slippage / 100;

        // Try LI.FI Direct Route Quote API (Optimal Uniswap v4 / Direct Pool Routing)
        const lifiUrl = `https://li.quest/v1/quote?fromChain=8453&toChain=8453&fromToken=${tokenIn}&toToken=${tokenOut}&fromAmount=${amountInWei}&fromAddress=${userAddr}&slippage=${slippageDecimal}`;
        const res = await fetch(lifiUrl);
        const data = await res.json();

        if (res.ok && data && data.estimate && data.transactionRequest) {
          setQuoteData({
            engine: 'lifi',
            txRequest: data.transactionRequest,
            toAmountWei: data.estimate.toAmount
          });
          const outWei = BigInt(data.estimate.toAmount);
          const outFormatted = formatUnits(outWei, 18);
          const outNum = Number(outFormatted);

          if (mode === 'sell') {
            setRawEthOutput(outNum);
            setToAmount(outNum.toFixed(6));
          } else {
            setRawEthOutput(Number(fromAmount));
            setToAmount(outNum > 1000000
              ? (outNum / 1000000).toFixed(2) + 'M'
              : outNum > 1000
              ? (outNum / 1000).toFixed(2) + 'K'
              : outNum.toFixed(2)
            );
          }
        } else {
          // Fallback KyberSwap Route Fetcher
          const kTokenIn = mode === 'buy' ? KYBER_ETH_ADDRESS : VIBE_TOKEN_ADDRESS;
          const kTokenOut = mode === 'buy' ? VIBE_TOKEN_ADDRESS : KYBER_ETH_ADDRESS;
          const kRes = await fetch(`https://aggregator-api.kyberswap.com/base/api/v1/routes?tokenIn=${kTokenIn}&tokenOut=${kTokenOut}&amountIn=${amountInWei}`);
          const kData = await kRes.json();

          if (kData.code === 0 && kData.data?.routeSummary) {
            setQuoteData({
              engine: 'kyberswap',
              summary: kData.data.routeSummary,
              routerAddress: kData.data.routerAddress
            });
            const outWei = BigInt(kData.data.routeSummary.amountOut);
            const outFormatted = formatUnits(outWei, 18);
            const outNum = Number(outFormatted);

            if (mode === 'sell') {
              setRawEthOutput(outNum);
              setToAmount(outNum.toFixed(6));
            } else {
              setRawEthOutput(Number(fromAmount));
              setToAmount(outNum > 1000000
                ? (outNum / 1000000).toFixed(2) + 'M'
                : outNum > 1000
                ? (outNum / 1000).toFixed(2) + 'K'
                : outNum.toFixed(2)
              );
            }
          } else {
            // Estimated rate fallback
            const vibeRate = 238000000;
            if (mode === 'buy') {
              const out = Number(fromAmount) * vibeRate;
              setRawEthOutput(Number(fromAmount));
              setToAmount(out >= 1000000 ? (out / 1000000).toFixed(2) + 'M' : out.toLocaleString());
            } else {
              const outEth = Number(fromAmount) / vibeRate;
              setRawEthOutput(outEth);
              setToAmount(outEth.toFixed(6));
            }
          }
        }
      } catch (e) {
        console.error('Quote fetch error:', e);
      } finally {
        setIsFetchingQuote(false);
      }
    }, 400);

    return () => clearTimeout(timer);
  }, [fromAmount, mode, slippage, rawAddress]);

  // Calculate ~$ USD Equivalence (Exact Market USD Price)
  const fromUsd = useMemo(() => {
    if (!fromAmount || isNaN(fromAmount) || Number(fromAmount) <= 0) return '$0.00';
    if (mode === 'buy') {
      const usd = Number(fromAmount) * ethPriceUsd;
      return `~$${usd.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })} USD`;
    } else {
      const ethVal = rawEthOutput || (Number(fromAmount) / 238000000);
      const usd = ethVal * ethPriceUsd;
      return `~$${usd.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })} USD`;
    }
  }, [fromAmount, mode, ethPriceUsd, rawEthOutput]);

  const toUsd = useMemo(() => {
    if (!fromAmount || isNaN(fromAmount) || Number(fromAmount) <= 0) return '$0.00';
    if (mode === 'buy') {
      const usd = Number(fromAmount) * ethPriceUsd;
      return `~$${usd.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })} USD`;
    } else {
      const ethVal = rawEthOutput || (Number(fromAmount) / 238000000);
      const usd = ethVal * ethPriceUsd;
      return `~$${usd.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })} USD`;
    }
  }, [fromAmount, mode, ethPriceUsd, rawEthOutput]);

  // Percentage Button Handler (25%, 50%, 75%, MAX)
  const handlePercentage = (percent) => {
    setTxStatus({ type: '', msg: '', hash: '' });
    if (mode === 'buy') {
      const ethStr = (balances.ethFormatted || '0').replace(',', '.');
      const rawEth = parseFloat(ethStr);
      if (isNaN(rawEth) || rawEth <= 0) return;
      if (percent === 100) {
        // Reserve 0.0001 ETH for gas when selecting 100% ETH
        const maxEth = Math.max(0, rawEth - 0.0001);
        setFromAmount(maxEth > 0 ? maxEth.toFixed(6).replace(/\.?0+$/, '') : '0');
      } else {
        const ethVal = rawEth * (percent / 100);
        setFromAmount(ethVal.toFixed(6).replace(/\.?0+$/, ''));
      }
    } else {
      // Robust VIBE Balance Extraction using exact numeric string
      const vibeStr = (balances.exactVibeStr || balances.vibe || '0').toString().replace(',', '.');
      const rawVibe = parseFloat(vibeStr);
      if (isNaN(rawVibe) || rawVibe <= 0) return;

      if (percent === 100) {
        // Truncate to 2 decimals without rounding (e.g. 400000.326745 -> 400000.32)
        const [intPart, fracPart] = vibeStr.split('.');
        if (!fracPart) {
          setFromAmount(intPart);
        } else {
          setFromAmount(`${intPart}.${fracPart.slice(0, 2)}`);
        }
      } else {
        const vibeVal = (rawVibe * (percent / 100)).toString();
        const [intPart, fracPart] = vibeVal.split('.');
        if (!fracPart) {
          setFromAmount(intPart);
        } else {
          setFromAmount(`${intPart}.${fracPart.slice(0, 2)}`);
        }
      }
    }
  };

  // Universal Web3 transaction executor
  const executeWeb3Tx = async (to, valueBigInt, dataHex) => {
    const connectedWallet = wallets.find(
      (w) => w.address?.toLowerCase() === rawAddress?.toLowerCase()
    ) || wallets[0];

    const provider = connectedWallet ? await connectedWallet.getEthereumProvider() : window.ethereum;

    const valueHex = valueBigInt ? '0x' + valueBigInt.toString(16) : '0x0';
    const calldataWithSuffix = appendBuilderSuffix(dataHex);

    if (!provider) {
      if (sendTransaction) {
        const res = await sendTransaction({
          to,
          value: valueBigInt,
          data: calldataWithSuffix
        });
        return res?.transactionHash || res?.hash || '';
      }
      throw new Error('No active Web3 wallet found');
    }

    // 1. Try EIP-5792 wallet_sendCalls for Base Smart Wallet / Coinbase Smart Wallet / Base App / Mobile
    try {
      const callsResponse = await provider.request({
        method: 'wallet_sendCalls',
        params: [{
          version: '1.0',
          chainId: '0x2105', // Base Mainnet (8453)
          from: rawAddress,
          calls: [{
            to,
            value: valueHex,
            data: calldataWithSuffix
          }],
          capabilities: {
            dataSuffix: {
              value: DATA_SUFFIX,
              optional: true
            }
          }
        }]
      });

      if (callsResponse) {
        if (typeof callsResponse === 'string' && callsResponse.startsWith('0x') && callsResponse.length === 66) {
          return callsResponse;
        }
        const callId = typeof callsResponse === 'object' ? (callsResponse.id || callsResponse) : callsResponse;
        for (let i = 0; i < 30; i++) {
          await new Promise((r) => setTimeout(r, 1000));
          try {
            const status = await provider.request({
              method: 'wallet_getCallsStatus',
              params: [callId]
            });
            if (status?.receipts?.[0]?.transactionHash) {
              return status.receipts[0].transactionHash;
            }
            if (status?.status === 'CONFIRMED' || status?.status === 'SUCCESS') {
              if (status.receipts?.[0]?.transactionHash) return status.receipts[0].transactionHash;
              return callId;
            }
          } catch (err) {
            // Ignore polling errors
          }
        }
        return callId;
      }
    } catch (e) {
      console.log('wallet_sendCalls not supported, falling back to eth_sendTransaction:', e?.message || e);
    }

    // 2. Fallback to standard eth_sendTransaction with data suffix for EOA (MetaMask, Rabby, etc.)
    const hash = await provider.request({
      method: 'eth_sendTransaction',
      params: [{
        from: rawAddress,
        to,
        value: valueHex,
        data: calldataWithSuffix
      }]
    });
    return hash;
  };

  const handleToggleMode = () => {
    setMode((prev) => (prev === 'buy' ? 'sell' : 'buy'));
    setFromAmount('');
    setToAmount('');
    setRawEthOutput(0);
    setQuoteData(null);
    setTxStatus({ type: '', msg: '', hash: '' });
  };

  const handleSwap = async () => {
    if (!authenticated || !rawAddress) {
      if (login) login();
      return;
    }
    if (!fromAmount || isNaN(fromAmount) || Number(fromAmount) <= 0) {
      setTxStatus({ type: 'error', msg: '⚠️ Enter a valid swap amount' });
      return;
    }

    setSwapping(true);
    setTxStatus({ type: 'info', msg: '⌛ Confirming in your Web3 wallet...' });

    try {
      let targetAddress = '0x1231DEB6f5749EF6cE6943a275A1D3E7486F4EaE';
      let calldataHex = '';
      let txValue = 0n;

      if (quoteData && quoteData.engine === 'lifi' && quoteData.txRequest) {
        setTxStatus({ type: 'info', msg: '⌛ Executing optimal Direct DEX swap...' });
        targetAddress = quoteData.txRequest.to || targetAddress;
        calldataHex = quoteData.txRequest.data || '0x';
        txValue = quoteData.txRequest.value ? BigInt(quoteData.txRequest.value) : 0n;
      } else if (quoteData && quoteData.engine === 'kyberswap' && quoteData.summary) {
        setTxStatus({ type: 'info', msg: '⌛ Building KyberSwap route...' });

        const buildRes = await fetch('https://aggregator-api.kyberswap.com/base/api/v1/route/build', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            routeSummary: quoteData.summary,
            sender: rawAddress,
            recipient: rawAddress,
            slippageTolerance: Math.round(slippage * 100),
            deadline: Math.floor(Date.now() / 1000) + 1200
          })
        });

        const buildData = await buildRes.json();
        if (buildData.code === 0 && buildData.data) {
          targetAddress = buildData.data.routerAddress || quoteData.routerAddress || targetAddress;
          calldataHex = buildData.data.data;
          txValue = buildData.data.value ? BigInt(buildData.data.value) : 0n;
          if (mode === 'buy') txValue = parseUnits(fromAmount, 18);
        }
      }

      if (mode === 'sell') {
        const amountVibeWei = parseUnits(fromAmount, 18);
        setTxStatus({ type: 'info', msg: '⌛ Step 1/2: Approving $VIBE for Swap Router...' });

        const allowance = await publicClient.readContract({
          address: VIBE_TOKEN_ADDRESS,
          abi: ERC20_ABI,
          functionName: 'allowance',
          args: [rawAddress, targetAddress]
        }).catch(() => 0n);

        if (allowance < amountVibeWei) {
          const maxApproval = parseUnits('999999999999999', 18);
          const approveCalldata = encodeFunctionData({
            abi: ERC20_ABI,
            functionName: 'approve',
            args: [targetAddress, maxApproval]
          });
          await executeWeb3Tx(VIBE_TOKEN_ADDRESS, 0n, approveCalldata);
        }

        setTxStatus({ type: 'info', msg: '⌛ Step 2/2: Confirming $VIBE ➔ ETH Swap in wallet...' });
      }

      if (!calldataHex) {
        calldataHex = '0x';
        if (mode === 'buy') txValue = parseUnits(fromAmount, 18);
      }

      const txHash = await executeWeb3Tx(targetAddress, txValue, calldataHex);

      setTxStatus({
        type: 'success',
        msg: '🎉 Swap Submitted to Base Mainnet!',
        hash: txHash
      });
    } catch (err) {
      console.error('Swap execution error:', err);
      if (err?.message?.includes('user rejected') || err?.message?.includes('User rejected')) {
        setTxStatus({ type: 'error', msg: '✕ Transaction rejected in wallet' });
      } else {
        setTxStatus({ type: 'error', msg: `⚠️ Swap failed: ${err?.shortMessage || err?.message || 'Error'}` });
      }
    } finally {
      setSwapping(false);
    }
  };

  return (
    <div className="o1-swap-card">
      {/* Header & Mode Switcher */}
      <div className="o1-swap-header">
        <span className="o1-swap-title">
          {mode === 'buy' ? 'Buy $VIBE' : 'Sell $VIBE'}
        </span>

        {/* Slippage Tolerance Selector */}
        <div className="o1-swap-slippage-wrap">
          <span className="o1-swap-slippage-label">Slippage</span>
          {[0.5, 1.0, 3.0].map((s) => (
            <button
              key={s}
              type="button"
              className={`o1-swap-slippage-btn ${slippage === s ? 'active' : ''}`}
              onClick={() => setSlippage(s)}
            >
              {s}%
            </button>
          ))}
        </div>
      </div>

      {/* INPUT BOX 1: YOU PAY */}
      <div className="o1-swap-box">
        <div className="o1-swap-box-header">
          <span>You pay</span>
          <span className="o1-swap-box-balance">
            Balance: {balances.loading ? '...' : (mode === 'buy' ? `${balances.ethFormatted} ETH` : `${balances.vibeFormatted} $VIBE`)}
          </span>
        </div>

        <div className="o1-swap-input-row">
          <input
            type="number"
            className="o1-swap-input"
            placeholder="0"
            value={fromAmount}
            onChange={(e) => {
              setFromAmount(e.target.value);
              setTxStatus({ type: '', msg: '', hash: '' });
            }}
          />
          <div className="o1-swap-token-pill">
            <img
              src={mode === 'buy' ? 'https://assets.coingecko.com/coins/images/279/small/ethereum.png' : '/new-logo-vibe.png'}
              alt={mode === 'buy' ? 'ETH' : '$VIBE'}
              className="o1-swap-token-icon"
            />
            <span>{mode === 'buy' ? 'ETH' : '$VIBE'}</span>
          </div>
        </div>

        <div className="o1-swap-box-footer">
          <span>{fromUsd}</span>
          <div className="o1-swap-presets">
            {[25, 50, 75, 100].map((p) => (
              <button
                key={p}
                type="button"
                className="o1-swap-preset-btn"
                onClick={() => handlePercentage(p)}
              >
                {p === 100 ? 'Max' : `${p}%`}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* REVERSE / FLIP BUTTON */}
      <div className="o1-swap-reverse-wrap">
        <button
          type="button"
          className="o1-swap-reverse-btn"
          onClick={handleToggleMode}
          title="Switch direction"
          aria-label="Switch direction"
        >
          <ArrowUpDown size={16} />
        </button>
      </div>

      {/* INPUT BOX 2: YOU RECEIVE */}
      <div className="o1-swap-box">
        <div className="o1-swap-box-header">
          <span>You receive</span>
          <span className="o1-swap-box-balance">
            Balance: {balances.loading ? '...' : (mode === 'buy' ? `${balances.vibeFormatted} $VIBE` : `${balances.ethFormatted} ETH`)}
          </span>
        </div>

        <div className="o1-swap-input-row">
          <div className="o1-swap-input" style={{ color: toAmount ? 'var(--text)' : 'var(--text-3)' }}>
            {isFetchingQuote ? 'Calculating...' : (toAmount || '0')}
          </div>
          <div className="o1-swap-token-pill">
            <img
              src={mode === 'buy' ? '/new-logo-vibe.png' : 'https://assets.coingecko.com/coins/images/279/small/ethereum.png'}
              alt={mode === 'buy' ? '$VIBE' : 'ETH'}
              className="o1-swap-token-icon"
            />
            <span>{mode === 'buy' ? '$VIBE' : 'ETH'}</span>
          </div>
        </div>

        <div className="o1-swap-box-footer">
          <span>{toUsd}</span>
          <span style={{ fontSize: '11px', color: 'var(--text-3)' }}>Estimated</span>
        </div>
      </div>

      {/* Route & Fee Breakdown */}
      <div className="o1-swap-route-details">
        <div className="o1-swap-route-row">
          <span>Network cost</span>
          <span style={{ fontFamily: 'var(--mono)', color: 'var(--text)' }}>~0.0001 ETH</span>
        </div>
        <div className="o1-swap-route-row">
          <span>Routing engine</span>
          <span style={{ color: 'var(--text)' }}>{quoteData?.engine === 'lifi' ? 'LI.FI Protocol' : 'KyberSwap Base'}</span>
        </div>
      </div>

      {/* Status Alert Message */}
      {txStatus.msg && (
        <div
          style={{
            padding: '10px 12px',
            borderRadius: 'var(--r-sm)',
            fontSize: '12px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            gap: '8px',
            background: txStatus.type === 'success'
              ? 'color-mix(in srgb, var(--green) 15%, transparent)'
              : txStatus.type === 'error'
              ? 'color-mix(in srgb, var(--danger) 15%, transparent)'
              : 'var(--surface-2)',
            border: txStatus.type === 'success'
              ? '1px solid var(--green)'
              : txStatus.type === 'error'
              ? '1px solid var(--danger)'
              : '1px solid var(--border)',
            color: txStatus.type === 'success' ? 'var(--green)' : txStatus.type === 'error' ? 'var(--danger)' : 'var(--text)'
          }}
        >
          <span>{txStatus.msg}</span>
          {txStatus.hash && (
            <a
              href={`https://basescan.org/tx/${txStatus.hash}`}
              target="_blank"
              rel="noreferrer"
              style={{ color: 'var(--accent)', textDecoration: 'underline', flexShrink: 0 }}
            >
              BaseScan ↗
            </a>
          )}
        </div>
      )}

      {/* Action Button */}
      {!authenticated ? (
        <Button onClick={login} variant="primary" size="lg" fullWidth>
          Connect wallet
        </Button>
      ) : (
        <Button
          onClick={handleSwap}
          disabled={swapping || !fromAmount || Number(fromAmount) <= 0}
          variant="primary"
          size="lg"
          fullWidth
        >
          {swapping
            ? 'Processing swap...'
            : !fromAmount || Number(fromAmount) <= 0
            ? 'Enter an amount'
            : mode === 'buy'
            ? 'Swap ETH for $VIBE'
            : 'Swap $VIBE for ETH'}
        </Button>
      )}
    </div>
  );
}
