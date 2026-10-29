import { useCallback, useEffect, useState } from 'react';
import { usePrivy } from '@privy-io/react-auth';
import { ArrowLeftRight, Layers, Gem, Send, Bot, Infinity as InfinityIcon, RotateCcw } from 'lucide-react';
import { useVibeWallets } from '../../hooks/useVibeWallets';
import { TOKENS, tokenAmount, useWalletAssets } from '../../hooks/useWalletAssets';
import { CopyButton, shortAddr } from './WalletPage';
import './WalletPages.css';

// Settings of the Vibe Agent Wallet: what the agent may do and its daily caps for transfers to other addresses.
// Stored on the server (/api/agent/settings) and enforced on every agent action.

const PERMISSIONS = [
  { key: 'swaps', icon: ArrowLeftRight, title: 'Swaps', text: 'Swap ETH ↔ $VIBE' },
  { key: 'staking', icon: Layers, title: 'Staking', text: 'Stake $VIBE, claim staking rewards, withdraw' },
  { key: 'mint', icon: Gem, title: 'Vibe Club NFT mint', text: 'Mint one NFT with ETH at the contract price' },
  { key: 'transfers', icon: Send, title: 'Transfers to other addresses', text: 'Within the daily limits below' },
];

const fmt = (v) => Number(v).toLocaleString('en-US', { maximumFractionDigits: 6 });
const compact = (v) => Number(v).toLocaleString('en-US', { notation: 'compact', maximumFractionDigits: 2 });
const usd = (v) => `$${(v || 0).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

function Switch({ on, onChange, disabled }) {
  return (
    <button type="button" role="switch" aria-checked={on} className={`vwp-switch ${on ? 'on' : ''}`} onClick={() => onChange(!on)} disabled={disabled}>
      <span />
    </button>
  );
}

export default function SettingsPage({ theme = 'o1', onOpenAgents }) {
  const { getAccessToken } = usePrivy();
  const { mainAddress, agentAddress, hasAgentWallet } = useVibeWallets();
  const [data, setData] = useState(null);
  const [limits, setLimits] = useState({});
  const [error, setError] = useState('');
  const [saved, setSaved] = useState('');
  const [busy, setBusy] = useState(false);

  const assets = useWalletAssets();
  const [status, setStatus] = useState(null);

  const api = useCallback(async (method, body, path = '/api/agent/settings') => {
    const token = await getAccessToken();
    const res = await fetch(path, {
      method,
      headers: { Authorization: `Bearer ${token}`, ...(body ? { 'Content-Type': 'application/json' } : {}) },
      body: body ? JSON.stringify(body) : undefined,
    });
    const json = await res.json().catch(() => ({}));
    if (!res.ok) throw new Error(json.error || `Request failed (${res.status})`);
    return json;
  }, [getAccessToken]);

  const apply = (d) => {
    setData(d);
    setLimits(d.limits);
  };

  useEffect(() => {
    if (!hasAgentWallet) return;
    api('GET').then(apply).catch((e) => setError(e.message));
    api('GET', null, '/api/agent/token').then(setStatus).catch(() => {});
  }, [hasAgentWallet, api]);

  const save = async (body, message) => {
    setBusy(true);
    setError('');
    setSaved('');
    try {
      apply(await api('PUT', body));
      setSaved(message);
      setTimeout(() => setSaved(''), 2500);
    } catch (e) {
      setError(e.message);
    } finally {
      setBusy(false);
    }
  };

  if (!mainAddress) {
    return <div className={`vwp vwp-${theme}`}><div className="vwp-card vwp-empty">Log in to see your settings.</div></div>;
  }
  if (!hasAgentWallet) {
    return <div className={`vwp vwp-${theme}`}><div className="vwp-card vwp-empty">This account has no agent wallet, so there is nothing to set up yet.</div></div>;
  }

  const dirty = data && TOKENS.some((t) => String(limits[t.symbol] ?? '') !== String(data.limits[t.symbol]));
  const transfersOn = data?.allow.transfers;
  const enabled = Boolean(status?.signer && status?.hasKey);
  const ethLeft = tokenAmount('ETH', assets.balancesOf(agentAddress)?.ETH);

  return (
    <div className={`vwp vwp-${theme}`}>
      <div className="vwp-agent-hero">
        <div className="vwp-agent-hero-top">
          <span className={`vwp-agent-avatar ${enabled ? 'on' : ''}`}><Bot size={24} /></span>
          <div className="vwp-agent-id">
            <div className="vwp-agent-name">
              Vibe Agent Wallet
              {status && (
                <span className={`vwp-agent-status ${enabled ? 'on' : ''}`}>
                  <i /> {enabled ? 'Agent active' : 'Agent off'}
                </span>
              )}
            </div>
            <div className="vwp-address-line">
              <span className="vwp-mono vwp-muted">{shortAddr(agentAddress)}</span>
              <CopyButton value={agentAddress} />
            </div>
          </div>
        </div>
        <div className="vwp-agent-stats">
          <div>
            <span>Balance</span>
            <b>{usd(assets.usdValue(agentAddress))}</b>
          </div>
          <div>
            <span>ETH for gas</span>
            <b>{ethLeft == null ? '…' : fmt(ethLeft)}</b>
          </div>
          <div>
            <span>Agent key</span>
            <b>{!status ? '…' : status.hasKey ? new Date(status.keyCreatedAt).toLocaleDateString('en-GB', { day: 'numeric', month: 'short' }) : 'Not created'}</b>
          </div>
        </div>
        <div className="vwp-agent-foot">
          <p>The rules below apply to everything your agent does. Check-ins and reward claims are always allowed, your main wallet is never touched.</p>
          {onOpenAgents && (
            <button type="button" className="vwp-agent-cta" onClick={onOpenAgents}>
              <Bot size={15} /> {enabled ? 'Agent Zone' : 'Enable agent'}
            </button>
          )}
        </div>
      </div>

      <div className="vwp-card">
        <div className="vwp-card-title">What your agent can do</div>
        <div className="vwp-settings-list">
          {PERMISSIONS.map(({ key, icon: Icon, title, text }) => (
            <div key={key} className="vwp-setting-row">
              <span className="vwp-wallet-icon"><Icon size={17} /></span>
              <span className="vwp-wallet-text">
                <span className="vwp-wallet-name">{title}</span>
                <span className="vwp-muted">{text}</span>
              </span>
              <Switch on={Boolean(data?.allow[key])} disabled={!data || busy} onChange={(v) => save({ allow: { [key]: v } }, 'Saved')} />
            </div>
          ))}
        </div>
      </div>

      <div className={`vwp-card ${transfersOn === false ? 'vwp-dim' : ''}`}>
        <div className="vwp-card-head">
          <div className="vwp-card-title">Daily limits for transfers</div>
          {data && (
            <button
              type="button"
              className="vwp-icon-btn"
              title="Back to defaults"
              disabled={busy}
              onClick={() => save({ limits: data.defaults.limits }, 'Limits reset')}
            >
              <RotateCcw size={15} />
            </button>
          )}
        </div>
        <p className="vwp-hint">
          The most your agent can send to other addresses per day (resets at 00:00 UTC). Set 0 to block a token.
        </p>
        <div className="vwp-main-free">
          <InfinityIcon size={15} /> <span>To your main wallet{mainAddress && <> <span className="vwp-mono">{shortAddr(mainAddress)}</span></>}: no limit</span>
        </div>
        {data ? (
          <div className="vwp-limits">
            {TOKENS.map((t) => {
              const cap = Number(data.limits[t.symbol]) || 0;
              const spent = Number(data.spentToday[t.symbol]) || 0;
              const pct = cap > 0 ? Math.min(100, (spent / cap) * 100) : 100;
              return (
                <div key={t.symbol} className="vwp-limit">
                  <div className="vwp-limit-head">
                    <img src={t.icon} alt="" className="vwp-token-icon" />
                    <span className="vwp-wallet-name">{t.symbol === 'VIBE' ? '$VIBE' : t.symbol}</span>
                  </div>
                  <div className="vwp-limit-bar"><span style={{ width: `${pct}%` }} /></div>
                  <span className="vwp-muted vwp-limit-used">Sent today: {compact(spent)} of {compact(cap)}</span>
                  <label className="vwp-field">
                    <span>Per day <span className="vwp-muted">max {compact(data.max[t.symbol])}</span></span>
                    <input
                      inputMode="decimal"
                      value={limits[t.symbol] ?? ''}
                      onChange={(e) => setLimits((l) => ({ ...l, [t.symbol]: e.target.value.replace(',', '.').replace(/[^\d.]/g, '') }))}
                      disabled={busy}
                    />
                  </label>
                </div>
              );
            })}
          </div>
        ) : (
          !error && <div className="vwp-muted">Loading…</div>
        )}
        {data && (
          <button type="button" className="vwp-btn vwp-btn-primary vwp-btn-full" disabled={!dirty || busy} onClick={() => save({ limits }, 'Limits saved')}>
            {busy ? 'Saving…' : 'Save limits'}
          </button>
        )}
      </div>

      {saved && <div className="vwp-notice ok">{saved}</div>}
      {error && <div className="vwp-notice err">{error}</div>}
    </div>
  );
}
