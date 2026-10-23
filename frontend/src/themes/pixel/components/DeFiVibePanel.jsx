import { ArrowUpDown } from 'lucide-react';
import { useVibeSwap } from '../../../hooks/useVibeSwap';

export default function DeFiVibePanel({ player }) {
  const {
    authenticated, login, balances, mode, fromAmount, setFromAmount, toAmount, slippage, setSlippage,
    isFetchingQuote, swapping, txStatus, fromUsd, toUsd, handlePercentage, handleToggleMode, handleSwap, blocker, engine,
  } = useVibeSwap();

  return (
    <div className="vv-defi-panel-wrap" style={{ fontFamily: 'var(--vv-pixel)', color: '#fff', fontSize: '9px', padding: '2px', width: '100%', boxSizing: 'border-box' }}>
      {/* Header & Mode Switcher (Single row: BUY $VIBE left, Slippage right) */}
      <div className="vv-defi-header-row" style={{
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: '12px',
        width: '100%',
        boxSizing: 'border-box',
        gap: '6px'
      }}>
        <div className="vv-defi-mode-title" style={{ fontSize: '9.5px', color: '#ffd700', fontWeight: 900, letterSpacing: '0.4px', whiteSpace: 'nowrap' }}>
          {mode === 'buy' ? 'BUY $VIBE' : 'SELL $VIBE'}
        </div>

        {/* Slippage Tolerance Selector (Single row, compact) */}
        <div className="vv-defi-slippage-row" style={{ display: 'flex', alignItems: 'center', gap: '3px', marginLeft: 'auto', flexShrink: 0 }}>
          <span className="vv-defi-slippage-label" style={{ fontSize: '5.5px', color: '#88aacc', fontWeight: 900 }}>SLIPPAGE:</span>
          {[0.5, 1.0, 3.0, 5.0].map((s) => (
            <button
              key={s}
              className={`vv-defi-slippage-btn ${slippage === s ? 'active' : ''}`}
              onClick={() => setSlippage(s)}
              style={{
                fontFamily: 'var(--vv-pixel)',
                fontSize: '6.5px',
                padding: '2.5px 4px',
                borderRadius: '4px',
                border: slippage === s ? '1px solid #00f5ff' : '1px solid rgba(255, 255, 255, 0.15)',
                background: slippage === s ? 'rgba(0, 245, 255, 0.25)' : 'rgba(2, 11, 26, 0.6)',
                color: slippage === s ? '#00f5ff' : '#aaa',
                cursor: 'pointer',
                fontWeight: 900,
                lineHeight: 1
              }}
            >
              {s}%
            </button>
          ))}
        </div>
      </div>

      {/* INPUT CARD 1: YOU PAY */}
      <div className="vv-defi-input-card" style={{
        background: '#020b1a',
        border: '1.5px solid rgba(0, 245, 255, 0.35)',
        borderRadius: '12px',
        padding: '12px 14px',
        marginBottom: '8px',
        width: '100%',
        boxSizing: 'border-box'
      }}>
        <div className="vv-defi-card-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', color: '#aaa', fontSize: '6.5px', marginBottom: '8px', fontWeight: 900, gap: '4px' }}>
          <span className="vv-defi-card-label" style={{ color: '#88aacc' }}>YOU PAY</span>
          <span className="vv-defi-card-balance" style={{ whiteSpace: 'nowrap', textAlign: 'right' }}>
            BALANCE:{' '}
            <strong style={{ color: mode === 'buy' ? '#00f5ff' : '#ffd700' }}>
              {balances.loading
                ? '...'
                : mode === 'buy'
                ? `${balances.ethFormatted} ETH`
                : `${balances.vibeFormatted} $VIBE`}
            </strong>
          </span>
        </div>

        <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
          <input
            type="number"
            className="vv-defi-amount-input"
            placeholder="0.00"
            value={fromAmount}
            onChange={(e) => {
              setFromAmount(e.target.value);
            }}
            style={{
              flex: 1,
              width: '100%',
              minWidth: '0',
              fontFamily: 'var(--vv-pixel)',
              fontSize: '14px',
              background: 'transparent',
              border: 'none',
              color: '#ffffff',
              outline: 'none',
              fontWeight: 900
            }}
          />
          <span className="vv-defi-token-badge" style={{
            fontFamily: 'var(--vv-pixel)',
            fontSize: '8px',
            fontWeight: 900,
            color: mode === 'buy' ? '#00f5ff' : '#ffd700',
            background: mode === 'buy' ? 'rgba(0, 245, 255, 0.15)' : 'rgba(255, 215, 0, 0.15)',
            border: mode === 'buy' ? '1px solid #00f5ff' : '1px solid #ffd700',
            padding: '4px 8px',
            borderRadius: '6px',
            whiteSpace: 'nowrap',
            flexShrink: 0
          }}>
            {mode === 'buy' ? 'ETH' : '$VIBE'}
          </span>
        </div>

        {/* Small USD Equivalent Display */}
        <div className="vv-defi-usd-val" style={{ color: 'rgba(255, 255, 255, 0.5)', fontSize: '6.5px', marginTop: '4px', fontWeight: 700 }}>
          {fromUsd}
        </div>

        {/* Percentage Preset Buttons (25%, 50%, 75%, MAX) */}
        <div className="vv-defi-pct-row" style={{ display: 'flex', gap: '5px', marginTop: '8px' }}>
          {[25, 50, 75, 100].map((p) => (
            <button
              key={p}
              className="vv-defi-pct-btn"
              onClick={() => handlePercentage(p)}
              style={{
                flex: 1,
                fontFamily: 'var(--vv-pixel)',
                fontSize: '6.5px',
                background: mode === 'buy' ? 'rgba(0, 245, 255, 0.12)' : 'rgba(255, 215, 0, 0.12)',
                border: mode === 'buy' ? '1px solid rgba(0, 245, 255, 0.35)' : '1px solid rgba(255, 215, 0, 0.35)',
                color: mode === 'buy' ? '#00f5ff' : '#ffd700',
                padding: '5px 0',
                borderRadius: '5px',
                cursor: 'pointer',
                fontWeight: 900,
                lineHeight: 1
              }}
            >
              {p === 100 ? 'MAX' : `${p}%`}
            </button>
          ))}
        </div>
      </div>

      {/* FLIP DIRECTION BUTTON ↕ (Two crisp arrows side-by-side: UP & DOWN) */}
      <div className="vv-defi-flip-wrap" style={{ textAlign: 'center', margin: '-4px 0 6px 0', display: 'flex', justifyContent: 'center' }}>
        <button
          className="vv-defi-flip-btn"
          onClick={handleToggleMode}
          title="Switch Swap Direction"
          style={{
            background: 'rgba(4, 20, 48, 0.95)',
            border: '1.5px solid #00f5ff',
            width: '38px',
            height: '38px',
            borderRadius: '50%',
            cursor: 'pointer',
            boxShadow: '0 0 14px rgba(0, 245, 255, 0.45)',
            transition: 'all 0.2s ease',
            display: 'inline-flex',
            alignItems: 'center',
            justifyContent: 'center',
            padding: 0,
            outline: 'none'
          }}
        >
          <ArrowUpDown size={18} color="#00f5ff" strokeWidth={2.6} />
        </button>
      </div>

      {/* INPUT CARD 2: YOU RECEIVE */}
      <div className="vv-defi-input-card" style={{
        background: '#020b1a',
        border: '1.5px solid rgba(0, 245, 255, 0.35)',
        borderRadius: '12px',
        padding: '12px 14px',
        marginBottom: '12px',
        width: '100%',
        boxSizing: 'border-box'
      }}>
        <div className="vv-defi-card-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', color: '#aaa', fontSize: '6.5px', marginBottom: '8px', fontWeight: 900, gap: '4px' }}>
          <span className="vv-defi-card-label" style={{ color: '#88aacc' }}>YOU RECEIVE</span>
          <span className="vv-defi-card-balance" style={{ whiteSpace: 'nowrap', textAlign: 'right' }}>
            BALANCE:{' '}
            <strong style={{ color: mode === 'buy' ? '#ffd700' : '#00f5ff' }}>
              {balances.loading
                ? '...'
                : mode === 'buy'
                ? `${balances.vibeFormatted} $VIBE`
                : `${balances.ethFormatted} ETH`}
            </strong>
          </span>
        </div>

        <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
          <div className="vv-defi-receive-val" style={{
            flex: 1,
            width: '100%',
            minWidth: '0',
            fontFamily: 'var(--vv-pixel)',
            fontSize: '14px',
            color: '#00ff88',
            fontWeight: 900
          }}>
            {isFetchingQuote ? 'CALC...' : (toAmount || '0.00')}
          </div>
          <span className="vv-defi-token-badge" style={{
            fontFamily: 'var(--vv-pixel)',
            fontSize: '8px',
            fontWeight: 900,
            color: mode === 'buy' ? '#ffd700' : '#00f5ff',
            background: mode === 'buy' ? 'rgba(255, 215, 0, 0.15)' : 'rgba(0, 245, 255, 0.15)',
            border: mode === 'buy' ? '1px solid #ffd700' : '1px solid #00f5ff',
            padding: '4px 8px',
            borderRadius: '6px',
            whiteSpace: 'nowrap',
            flexShrink: 0
          }}>
            {mode === 'buy' ? '$VIBE' : 'ETH'}
          </span>
        </div>

        {/* Small USD Equivalent Display */}
        <div className="vv-defi-usd-val" style={{ color: 'rgba(255, 255, 255, 0.5)', fontSize: '6.5px', marginTop: '4px', fontWeight: 700 }}>
          {toUsd}
        </div>
      </div>

      {/* Status Toast Message */}
      {txStatus.msg && (
        <div className="vv-defi-status-msg" style={{
          marginBottom: '12px',
          padding: '8px 10px',
          borderRadius: '8px',
          background: txStatus.type === 'success'
            ? 'rgba(0, 255, 136, 0.15)'
            : txStatus.type === 'error'
            ? 'rgba(255, 68, 102, 0.15)'
            : 'rgba(0, 245, 255, 0.15)',
          border: txStatus.type === 'success'
            ? '1.5px solid #00ff88'
            : txStatus.type === 'error'
            ? '1.5px solid #ff4466'
            : '1.5px solid #00f5ff',
          color: txStatus.type === 'success'
            ? '#00ff88'
            : txStatus.type === 'error'
            ? '#ff4466'
            : '#00f5ff',
          fontSize: '6.5px',
          fontWeight: 800,
          lineHeight: 1.4,
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          gap: '6px',
          wordBreak: 'break-word'
        }}>
          <span style={{ flex: 1 }}>{txStatus.msg}</span>
          {txStatus.hash && (
            <a
              href={`https://basescan.org/tx/${txStatus.hash}`}
              target="_blank"
              rel="noreferrer"
              style={{ color: '#00f5ff', textDecoration: 'underline', fontSize: '6px', whiteSpace: 'nowrap', flexShrink: 0 }}
            >
              BASESCAN ↗
            </a>
          )}
        </div>
      )}

      {/* MAIN SWAP ACTION BUTTON */}
      <button
        className="vv-defi-swap-btn"
        onClick={handleSwap}
        disabled={swapping || Boolean(blocker)}
        style={{
          width: '100%',
          height: '46px',
          fontFamily: 'var(--vv-pixel)',
          fontSize: '10px',
          fontWeight: 900,
          background: mode === 'buy'
            ? 'linear-gradient(135deg, #00f5ff 0%, #00b8ff 100%)'
            : 'linear-gradient(135deg, #ffd700 0%, #ff6b35 100%)',
          border: '2px solid #ffffff',
          borderRadius: '10px',
          padding: '10px',
          color: mode === 'buy' ? '#020b1a' : '#ffffff',
          cursor: swapping || !fromAmount || Number(fromAmount) <= 0 ? 'not-allowed' : 'pointer',
          opacity: swapping || blocker ? 0.6 : 1,
          boxShadow: mode === 'buy'
            ? '0 0 20px rgba(0, 245, 255, 0.5)'
            : '0 0 16px rgba(255, 215, 0, 0.4)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          gap: '8px',
          letterSpacing: '0.4px',
          transition: 'all 0.15s ease'
        }}
      >
        {swapping ? 'PROCESSING...' : blocker ? blocker.toUpperCase() : (mode === 'buy' ? 'SWAP ETH FOR $VIBE' : 'SWAP $VIBE FOR ETH')}
      </button>
    </div>
  );
}
