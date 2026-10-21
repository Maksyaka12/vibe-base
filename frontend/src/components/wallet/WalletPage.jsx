import { useState } from 'react';
import { isAddress, formatUnits } from 'viem';
import { ArrowDownToLine, Send, ArrowLeftRight, Copy, Check, Bot, Wallet as WalletIcon } from 'lucide-react';
import { useWalletAssets, TOKENS, tokenAmount } from '../../hooks/useWalletAssets';
import { isWalletRejection } from '../../config/walletTx';
import './WalletPages.css';

// Wallet page shared by both themes (`theme` picks the palette): balances of the active wallet,
// switching between the main and the agent wallet, deposit, send and a shortcut to Swap.

export const shortAddr = (a) => (a ? `${a.slice(0, 6)}…${a.slice(-4)}` : '');
const usd = (n) => (n == null ? '…' : `$${n.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`);
const amt = (n, symbol) => (n == null ? '…' : n.toLocaleString('en-US', { maximumFractionDigits: symbol === 'VIBE' ? 0 : symbol === 'USDC' ? 2 : 5 }));

export function CopyButton({ value, size = 14 }) {
  const [done, setDone] = useState(false);
  return (
    <button
      type="button"
      className="vwp-icon-btn"
      title="Copy address"
      onClick={async () => {
        try {
          await navigator.clipboard.writeText(value);
          setDone(true);
          setTimeout(() => setDone(false), 1500);
        } catch (e) {}
      }}
    >
      {done ? <Check size={size} /> : <Copy size={size} />}
    </button>
  );
}

function TransferForm({ assets, from, defaultTo = '', lockTo = false, submitLabel, onDone }) {
  const [to, setTo] = useState(defaultTo);
  const [token, setToken] = useState('ETH');
  const [amount, setAmount] = useState('');
  const [busy, setBusy] = useState(false);
  const [notice, setNotice] = useState(null);

  const t = TOKENS.find((x) => x.symbol === token);
  const raw = assets.balancesOf(from)?.[token];
  const available = tokenAmount(token, raw);
  const num = Number(amount);
  const validTo = isAddress(to || '');
  const tooMuch = available != null && num > available;
  const canSend = validTo && num > 0 && !tooMuch && !busy && to.toLowerCase() !== from?.toLowerCase();

  const submit = async (e) => {
    e.preventDefault();
    if (!canSend) return;
    setBusy(true);
    setNotice(null);
    try {
      await assets.send({ from, to, token, amount });
      setAmount('');
      setNotice({ ok: true, text: `Sent ${amount} ${token} to ${shortAddr(to)}` });
      onDone?.();
    } catch (err) {
      setNotice({ ok: false, text: isWalletRejection(err) ? 'Transaction cancelled' : (err?.shortMessage || err?.message || 'Transaction failed') });
    } finally {
      setBusy(false);
    }
  };

  return (
    <form className="vwp-form" onSubmit={submit}>
      {!lockTo && (
        <label className="vwp-field">
          <span>Recipient</span>
          <input value={to} onChange={(e) => setTo(e.target.value.trim())} placeholder="0x…" spellCheck={false} />
        </label>
      )}
      <label className="vwp-field">
        <span>
          Amount
          {available != null && (
            <button type="button" className="vwp-link" onClick={() => setAmount(formatUnits(raw, t.decimals))}>
              Max {amt(available, token)}
            </button>
          )}
        </span>
        <div className="vwp-amount">
          <input
            inputMode="decimal"
            placeholder="0.0"
            value={amount}
            onChange={(e) => setAmount(e.target.value.replace(',', '.').replace(/[^0-9.]/g, ''))}
          />
          <select value={token} onChange={(e) => setToken(e.target.value)}>
            {TOKENS.map((x) => <option key={x.symbol} value={x.symbol}>{x.symbol}</option>)}
          </select>
        </div>
      </label>
      {to && !validTo && !lockTo && <div className="vwp-notice err">Enter a valid Base address</div>}
      {tooMuch && <div className="vwp-notice err">Not enough {token}</div>}
      <button type="submit" className="vwp-btn vwp-btn-primary" disabled={!canSend}>
        {busy ? 'Confirming…' : submitLabel}
      </button>
      {notice && <div className={`vwp-notice ${notice.ok ? 'ok' : 'err'}`}>{notice.text}</div>}
    </form>
  );
}

export default function WalletPage({ theme = 'o1', onSwap }) {
  const assets = useWalletAssets();
  const { mainAddress, agentAddress, hasAgentWallet, active, activeAddress, setActive, balancesOf, usdValue } = assets;
  const [panel, setPanel] = useState(null);

  if (!mainAddress) {
    return <div className={`vwp vwp-${theme}`}><div className="vwp-card vwp-empty">Log in to see your wallet.</div></div>;
  }

  const wallets = hasAgentWallet
    ? [
        { key: 'agent', name: 'Vibe Agent Wallet', sub: 'Created at login · used by your agent', address: agentAddress, icon: <Bot size={18} /> },
        { key: 'main', name: 'Main wallet', sub: 'The wallet you connected', address: mainAddress, icon: <WalletIcon size={18} /> },
      ]
    : [{ key: 'main', name: 'Vibe Wallet', sub: 'Created at login · used by you and your agent', address: mainAddress, icon: <Bot size={18} /> }];

  const activeWallet = wallets.find((w) => w.key === active) || wallets[0];
  const other = hasAgentWallet ? wallets.find((w) => w.key !== activeWallet.key) : null;
  const bal = balancesOf(activeAddress);

  return (
    <div className={`vwp vwp-${theme}`}>
      <div className="vwp-card">
        <div className="vwp-muted">Your balance</div>
        <div className="vwp-total">{usd(usdValue(activeAddress))}</div>

        <div className="vwp-section-label">{hasAgentWallet ? 'Active wallet' : 'Wallet'}</div>
        <div className="vwp-wallets">
          {wallets.map((w) => {
            const on = w.key === activeWallet.key;
            return (
              <button
                key={w.key}
                type="button"
                className={`vwp-wallet-row ${on ? 'on' : ''}`}
                onClick={() => hasAgentWallet && setActive(w.key)}
                disabled={!hasAgentWallet}
              >
                <span className="vwp-wallet-icon">{w.icon}</span>
                <span className="vwp-wallet-text">
                  <span className="vwp-wallet-name">{w.name}{on && hasAgentWallet && <span className="vwp-badge">Active</span>}</span>
                  <span className="vwp-mono vwp-muted">{shortAddr(w.address)}</span>
                </span>
                <span className="vwp-wallet-value">{usd(usdValue(w.address))}</span>
              </button>
            );
          })}
        </div>
        {hasAgentWallet && (
          <p className="vwp-hint">
            The site shows and acts with the active wallet. Each wallet is a separate participant with its own streak, rewards and achievements.
          </p>
        )}
      </div>

      <div className="vwp-card">
        <div className="vwp-card-head">
          <div>
            <div className="vwp-card-title">{activeWallet.name}</div>
            <div className="vwp-address-line">
              <a className="vwp-mono vwp-muted" href={`https://basescan.org/address/${activeAddress}`} target="_blank" rel="noopener noreferrer">{shortAddr(activeAddress)}</a>
              <CopyButton value={activeAddress} />
            </div>
          </div>
        </div>
        <div className="vwp-tokens">
          {TOKENS.map((t) => {
            const n = tokenAmount(t.symbol, bal?.[t.symbol]);
            return (
              <div key={t.symbol} className="vwp-token-row">
                <img src={t.icon} alt="" className="vwp-token-icon" />
                <div className="vwp-token-text">
                  <span className="vwp-token-name">{t.name}</span>
                  <span className="vwp-muted">{t.symbol === 'VIBE' ? '$VIBE' : t.symbol}</span>
                </div>
                <div className="vwp-token-amount">
                  <span>{amt(n, t.symbol)}</span>
                  <span className="vwp-muted">{n == null ? '' : `~ ${usd(n * (assets.prices[t.symbol] || 0))}`}</span>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      <div className="vwp-actions">
        <button type="button" className={`vwp-btn vwp-btn-primary ${panel === 'deposit' ? 'on' : ''}`} onClick={() => setPanel(panel === 'deposit' ? null : 'deposit')}>
          <ArrowDownToLine size={16} /> Deposit
        </button>
        <button type="button" className={`vwp-btn ${panel === 'send' ? 'on' : ''}`} onClick={() => setPanel(panel === 'send' ? null : 'send')}>
          <Send size={16} /> Send
        </button>
        <button type="button" className="vwp-btn" onClick={onSwap}>
          <ArrowLeftRight size={16} /> Swap
        </button>
      </div>

      {panel === 'deposit' && (
        <div className="vwp-card">
          <div className="vwp-card-title">Deposit to {activeWallet.name}</div>
          <p className="vwp-hint">Send ETH (needed for gas), $VIBE or USDC on the Base network to this address.</p>
          <div className="vwp-address-box">
            <span className="vwp-mono">{activeAddress}</span>
            <CopyButton value={activeAddress} />
          </div>
          {other && (
            <>
              <div className="vwp-section-label">Or move funds from your {other.key === 'main' ? 'main wallet' : 'agent wallet'}</div>
              <TransferForm
                key={`deposit-${activeAddress}`}
                assets={assets}
                from={other.address}
                defaultTo={activeAddress}
                lockTo
                submitLabel={`Transfer from ${other.key === 'main' ? 'main wallet' : 'agent wallet'}`}
              />
            </>
          )}
        </div>
      )}

      {panel === 'send' && (
        <div className="vwp-card">
          <div className="vwp-card-title">Send from {activeWallet.name}</div>
          {other && (
            <p className="vwp-hint">
              To your {other.key === 'main' ? 'main' : 'agent'} wallet:{' '}
              <span className="vwp-mono">{shortAddr(other.address)}</span> <CopyButton value={other.address} size={12} />
            </p>
          )}
          <TransferForm key={`send-${activeAddress}`} assets={assets} from={activeAddress} submitLabel="Send" />
        </div>
      )}
    </div>
  );
}
