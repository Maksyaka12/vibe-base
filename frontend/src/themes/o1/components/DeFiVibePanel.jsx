import { ArrowUpDown } from 'lucide-react';
import { Button } from './ui';
import { useVibeSwap } from '../../../hooks/useVibeSwap';

export default function DeFiVibePanel({ player }) {
  const {
    authenticated, login, balances, mode, fromAmount, setFromAmount, toAmount, slippage, setSlippage,
    isFetchingQuote, swapping, txStatus, fromUsd, toUsd, handlePercentage, handleToggleMode, handleSwap, blocker, engine,
  } = useVibeSwap();

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
            }}
          />
          <div className="o1-swap-token-pill">
            <img
              src={mode === 'buy' ? 'https://assets.coingecko.com/coins/images/279/small/ethereum.png' : '/new-logo.png'}
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
              src={mode === 'buy' ? '/new-logo.png' : 'https://assets.coingecko.com/coins/images/279/small/ethereum.png'}
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
          <span style={{ color: 'var(--text)' }}>{engine || 'Best of KyberSwap and LI.FI'}</span>
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
          disabled={swapping || Boolean(blocker)}
          variant="primary"
          size="lg"
          fullWidth
        >
          {swapping
            ? 'Processing swap...'
            : blocker
            ? blocker
            : mode === 'buy'
            ? 'Swap ETH for $VIBE'
            : 'Swap $VIBE for ETH'}
        </Button>
      )}
    </div>
  );
}
