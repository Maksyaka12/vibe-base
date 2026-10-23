import { useCallback, useEffect, useState } from 'react';
import { ArrowUpRight, ArrowDownLeft, ArrowLeftRight, Flame, Award, Crown, Gift, Lock, Coins, RefreshCw, ExternalLink } from 'lucide-react';

// Transaction history of the active wallet (from /api/activity), shown next to the balances on the Wallet page.

const ICONS = {
  send: ArrowUpRight,
  receive: ArrowDownLeft,
  swap: ArrowLeftRight,
  checkin: Flame,
  achievement: Award,
  mint: Crown,
  claim: Gift,
  stake: Lock,
  staking: Coins,
};

const short = (a) => (a ? `${a.slice(0, 6)}…${a.slice(-4)}` : '');
const fmtAmount = (n, symbol) => n.toLocaleString('en-US', { maximumFractionDigits: symbol === 'VIBE' ? 0 : symbol === 'USDC' ? 2 : 6 });

function timeAgo(iso) {
  if (!iso) return '';
  const s = Math.max(0, (Date.now() - Date.parse(iso)) / 1000);
  if (s < 60) return 'just now';
  if (s < 3600) return `${Math.floor(s / 60)}m ago`;
  if (s < 86400) return `${Math.floor(s / 3600)}h ago`;
  if (s < 86400 * 7) return `${Math.floor(s / 86400)}d ago`;
  return new Date(iso).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
}

function partText(p) {
  if (p.tokenId != null && (p.symbol === 'NFT' || p.amount === 1)) return p.symbol === 'NFT' ? `NFT #${p.tokenId}` : `${p.symbol} #${p.tokenId}`;
  return `${p.dir === 'in' ? '+' : '−'}${fmtAmount(p.amount, p.symbol)} ${p.symbol === 'VIBE' ? '$VIBE' : p.symbol}`;
}

export function useWalletActivity(address) {
  const [state, setState] = useState({ items: null, error: '' });
  const load = useCallback(async () => {
    if (!address) return;
    try {
      const res = await fetch(`/api/activity?address=${address}&t=${Date.now()}`);
      const body = await res.json();
      if (!res.ok) throw new Error(body.error || 'Could not load the history');
      setState({ owner: address.toLowerCase(), items: body.items || [], error: '' });
    } catch (e) {
      setState({ owner: address.toLowerCase(), items: null, error: e.message });
    }
  }, [address]);
  useEffect(() => {
    setState({ items: null, error: '' });
    load();
  }, [load]);
  // a late answer for the previous wallet must not show up after a switch
  const own = state.owner === address?.toLowerCase();
  return { items: own ? state.items : null, error: own ? state.error : '', reload: load };
}

export default function ActivityCard({ activity, walletName }) {
  const { items, error, reload } = activity;
  const [spinning, setSpinning] = useState(false);

  const refresh = async () => {
    setSpinning(true);
    await reload();
    setSpinning(false);
  };

  return (
    <div className="vwp-card vwp-activity">
      <div className="vwp-card-head">
        <div>
          <div className="vwp-card-title">Transaction history</div>
          <div className="vwp-muted">{walletName}</div>
        </div>
        <button type="button" className="vwp-icon-btn" onClick={refresh} title="Refresh" aria-label="Refresh history">
          <RefreshCw size={15} className={spinning ? 'vwp-spin' : ''} />
        </button>
      </div>

      <div className="vwp-activity-list">
        {error && <div className="vwp-empty-small vwp-notice err">{error}</div>}
        {!error && items == null && (
          [0, 1, 2, 3, 4].map((i) => <div key={i} className="vwp-activity-skeleton" />)
        )}
        {!error && items?.length === 0 && <div className="vwp-empty-small">No transactions yet</div>}
        {items?.map((it) => {
          const Icon = ICONS[it.type] || ArrowLeftRight;
          const sub = it.counterparty ? `${it.type === 'send' ? 'To' : 'From'} ${short(it.counterparty)}` : timeAgo(it.time);
          return (
            <a key={it.hash} className="vwp-activity-row" href={it.link} target="_blank" rel="noopener noreferrer">
              <span className={`vwp-activity-icon t-${it.type}`}><Icon size={16} /></span>
              <span className="vwp-activity-text">
                <span className="vwp-token-name">{it.title}</span>
                <span className="vwp-muted">{it.counterparty ? `${sub} · ${timeAgo(it.time)}` : sub}</span>
              </span>
              <span className="vwp-activity-parts">
                {it.parts.length === 0 && <ExternalLink size={13} className="vwp-muted" />}
                {it.parts.slice(0, 2).map((p, i) => (
                  <span key={i} className={p.dir === 'in' ? 'in' : 'out'}>{partText(p)}</span>
                ))}
              </span>
            </a>
          );
        })}
      </div>
    </div>
  );
}
