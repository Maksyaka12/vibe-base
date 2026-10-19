import { useEffect, useMemo, useRef, useState } from 'react';
import { stringToHex } from 'viem';
import { Play, Upload, Copy, Check, Download, ArrowUpRight, AlertCircle, CheckCircle2, Loader2, Eye } from 'lucide-react';
import { SCHEDULE } from '../../../data/rewardsSchedule';
import { hashScheduleJson } from '../../../data/scheduleSchema';
import { snapshotSignMessage } from '../../../data/snapshot/publish';
import { pickAdminWallet, adminSessionHeaders } from './adminSession';
import { Card, Button, Alert, Tile } from './ui';

const TYPES = [
  { id: 'royalty', label: 'Vibe Club royalties', rule: 'Every wallet holding a Vibe Club NFT at the snapshot gets an equal share.' },
  { id: 'holder', label: 'Holder rewards', rule: 'Wallets holding the minimum $VIBE at the snapshot share the pool by balance, capped per wallet.' },
];

const short = (a) => `${a.slice(0, 6)}…${a.slice(-4)}`;
const num = (n) => Number(n).toLocaleString('en-US');
const toInput = (iso) => (iso ? iso.slice(0, 19) : '');
const fromInput = (value) => (value ? `${value.length === 16 ? `${value}:00` : value}Z` : '');
const poolNumber = (pool) => (pool && pool !== 'TBA' ? Number(String(pool).replace(/,/g, '')) : '');
// The scanned transfer history is kept in this browser so later holder snapshots only fetch new transfers.
const CACHE_STORAGE = 'vibe_receivers_cache_v1';
const readLocal = (k, fallback) => { try { const v = localStorage.getItem(k); return v ? JSON.parse(v) : fallback; } catch { return fallback; } };
const writeLocal = (k, v) => { try { localStorage.setItem(k, JSON.stringify(v)); } catch {} };

const when = (iso) => (iso ? `${iso.slice(0, 10)} ${iso.slice(11, 16)} UTC` : '');

// Suggest the latest round whose snapshot time has passed.
function suggestion(type) {
  const rounds = type === 'royalty' ? SCHEDULE.royalties : SCHEDULE.holderUnlocks;
  const past = [...rounds].sort((a, b) => a.round - b.round).filter((r) => new Date(r.snapshot) <= new Date());
  const r = past[past.length - 1] || rounds[0];
  return r ? { round: r.round, at: r.snapshot, pool: poolNumber(r.pool) } : { round: 1, at: new Date().toISOString(), pool: '' };
}

function csvOf(snap) {
  const rows = Object.values(snap.claims);
  const head = snap.type === 'holder'
    ? 'Rank,Address,Balance,SharePercent,RewardAmount,IsCapped'
    : 'Rank,Address,NFT_Count,Token_IDs,Reward_VIBE,Share_Percent';
  const lines = rows.map((c, i) => (snap.type === 'holder'
    ? `${i + 1},${c.address},${c.balance},${c.sharePercent},${c.amount},${c.isCapped}`
    : `${i + 1},${c.address},${c.nftCount},"${c.tokenIds.join(';')}",${c.amount},${c.sharePercent}`));
  return [head, ...lines].join('\n');
}

function CopyButton({ text }) {
  const [done, setDone] = useState(false);
  return (
    <button
      type="button"
      className="o1-snap-icon-btn"
      title="Copy"
      onClick={() => {
        navigator.clipboard?.writeText(text);
        setDone(true);
        setTimeout(() => setDone(false), 1200);
      }}
    >
      {done ? <Check size={14} /> : <Copy size={14} />}
    </button>
  );
}

export function AdminSnapshotTool({ activeAddress, wallets, onUseRoot }) {
  const [type, setType] = useState('royalty');
  const initial = useMemo(() => suggestion('royalty'), []);
  const [round, setRound] = useState(initial.round);
  const [at, setAt] = useState(initial.at);
  const [pool, setPool] = useState(initial.pool);
  const [minBalance, setMinBalance] = useState(5000000);
  const [cap, setCap] = useState(500000);

  const [running, setRunning] = useState(false);
  const [progress, setProgress] = useState('');
  const [elapsed, setElapsed] = useState(0);
  const [result, setResult] = useState(null);
  const [published, setPublished] = useState([]);
  const [status, setStatus] = useState(null);
  const [busy, setBusy] = useState(false);
  const timer = useRef(null);

  const loadPublished = () =>
    fetch('/api/snapshots', { cache: 'no-store' })
      .then((r) => r.json())
      .then((d) => setPublished(d.snapshots || []))
      .catch(() => {});

  useEffect(() => {
    loadPublished();
    return () => clearInterval(timer.current);
  }, []);

  const pickType = (t) => {
    setType(t);
    const s = suggestion(t);
    setRound(s.round);
    setAt(s.at);
    setPool(s.pool);
    setResult(null);
    setStatus(null);
  };

  const alreadyPublished = published.find((p) => p.type === type && p.round === Number(round));

  const adminWallet = () => pickAdminWallet(wallets, activeAddress);

  // One signature lets the server use its Alchemy key (holder snapshots only).
  const blockscoutProxy = async () => {
    setProgress('Sign the message in your wallet to start…');
    return { url: '/api/transfers', headers: await adminSessionHeaders(adminWallet()) };
  };

  const run = async () => {
    setStatus(null);
    setResult(null);
    if (!(Number(pool) > 0)) {
      setStatus({ tone: 'danger', text: 'Enter the pool amount.' });
      return;
    }
    setRunning(true);
    setElapsed(0);
    const started = Date.now();
    timer.current = setInterval(() => setElapsed(Math.round((Date.now() - started) / 1000)), 1000);
    try {
      const engine = await import('../../../data/snapshot/engine');
      const params = { round: Number(round), pool: Number(pool), at };
      const snap = type === 'holder'
        ? await engine.runHolderSnapshot({ ...params, minBalance: Number(minBalance), cap: Number(cap) }, setProgress, {
            proxy: await blockscoutProxy(),
            cache: readLocal(CACHE_STORAGE, null),
            onCache: (c) => writeLocal(CACHE_STORAGE, c),
          })
        : await engine.runVibeClubSnapshot(params, setProgress);
      setResult(snap);
      setStatus({ tone: 'success', text: `Snapshot ready: ${snap.totalWallets} wallets. Check the table, then sign & publish.` });
    } catch (e) {
      setStatus({ tone: 'danger', text: e?.shortMessage || e?.message || 'Snapshot failed' });
    } finally {
      clearInterval(timer.current);
      setRunning(false);
    }
  };

  const publish = async () => {
    const wallet = adminWallet();
    if (!wallet) {
      setStatus({ tone: 'danger', text: 'Connect the admin wallet to publish.' });
      return;
    }
    setBusy(true);
    setStatus(null);
    try {
      const payload = JSON.stringify(result);
      const issuedAt = new Date().toISOString();
      const message = snapshotSignMessage({ address: wallet.address, issuedAt, type: result.type, round: result.round, root: result.merkleRoot, hash: await hashScheduleJson(payload) });
      const provider = await wallet.getEthereumProvider();
      const signature = await provider.request({ method: 'personal_sign', params: [stringToHex(message), wallet.address] });
      const res = await fetch('/api/snapshots', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ snapshot: payload, address: wallet.address, issuedAt, signature }),
      });
      const body = await res.json();
      if (!res.ok) throw new Error(body.error || `Publish failed (${res.status})`);
      setStatus({ tone: 'success', text: 'Snapshot published. Now set its Merkle root on the distributor contract.' });
      loadPublished();
    } catch (e) {
      setStatus({ tone: 'danger', text: e?.shortMessage || e?.message || 'Publish failed' });
    } finally {
      setBusy(false);
    }
  };

  const view = async (s) => {
    setStatus(null);
    try {
      const res = await fetch(`/api/snapshots?type=${s.type}&round=${s.round}`, { cache: 'no-store' });
      const body = await res.json();
      if (!res.ok) throw new Error(body.error);
      setType(s.type);
      setRound(s.round);
      setPool(s.pool);
      setAt(body.snapshotTime);
      setResult(body);
    } catch (e) {
      setStatus({ tone: 'danger', text: e?.message || 'Could not load the snapshot' });
    }
  };

  const download = () => {
    const blob = new Blob([csvOf(result)], { type: 'text/csv' });
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = `${result.type === 'holder' ? 'round' : 'royalty'}_${result.round}_table.csv`;
    a.click();
    URL.revokeObjectURL(a.href);
  };

  const rows = result ? Object.values(result.claims) : [];
  const typeInfo = TYPES.find((t) => t.id === type);

  return (
    <div className="o1-sched">
      <Card style={{ padding: '18px 20px', display: 'flex', flexDirection: 'column', gap: '14px' }}>
        <div>
          <div style={{ fontSize: '16px', fontWeight: 600, color: 'var(--text)' }}>Reward snapshot</div>
          <div style={{ fontSize: '13px', color: 'var(--text-2)', marginTop: '4px' }}>
            Reads balances onchain at the chosen time (UTC), builds the Merkle tree and the allocation table. Runs in this browser and can take a few minutes.
          </div>
        </div>

        <div className="seg o1-sched-tabs" role="tablist">
          {TYPES.map((t) => (
            <button key={t.id} type="button" role="tab" aria-selected={type === t.id} onClick={() => pickType(t.id)} disabled={running}>
              {t.label}
            </button>
          ))}
        </div>
        <div style={{ fontSize: '13px', color: 'var(--text-3)' }}>{typeInfo.rule}</div>

        <div className="o1-snap-form">
          <label className="o1-sched-field">
            <span className="o1-admin-label">{type === 'royalty' ? 'Royalty #' : 'Unlock #'}</span>
            <input className="o1-admin-input" type="number" min="1" value={round} onChange={(e) => setRound(Number(e.target.value))} disabled={running} />
          </label>
          <label className="o1-sched-field">
            <span className="o1-admin-label">Snapshot time (UTC)</span>
            <input className="o1-admin-input" type="datetime-local" step="1" value={toInput(at)} onChange={(e) => setAt(fromInput(e.target.value))} disabled={running} />
          </label>
          <label className="o1-sched-field">
            <span className="o1-admin-label">Pool ($VIBE)</span>
            <input className="o1-admin-input" type="number" min="1" value={pool} onChange={(e) => setPool(e.target.value)} placeholder="e.g. 1000000" disabled={running} />
          </label>
          {type === 'holder' && (
            <>
              <label className="o1-sched-field">
                <span className="o1-admin-label">Min balance ($VIBE)</span>
                <input className="o1-admin-input" type="number" min="0" value={minBalance} onChange={(e) => setMinBalance(e.target.value)} disabled={running} />
              </label>
              <label className="o1-sched-field">
                <span className="o1-admin-label">Cap per wallet ($VIBE)</span>
                <input className="o1-admin-input" type="number" min="1" value={cap} onChange={(e) => setCap(e.target.value)} disabled={running} />
              </label>
            </>
          )}
        </div>

        {alreadyPublished && !result && (
          <Alert tone="warn" icon={<AlertCircle size={16} />}>
            {typeInfo.label} #{round} was already published ({when(alreadyPublished.publishedAt)}). Publishing again replaces it.
          </Alert>
        )}

        <div style={{ display: 'flex', alignItems: 'center', gap: '12px', flexWrap: 'wrap' }}>
          <Button variant="primary" size="md" onClick={run} disabled={running}>
            {running ? <Loader2 size={15} className="o1-spin" /> : <Play size={15} />}
            {running ? 'Running…' : 'Run snapshot'}
          </Button>
          {running && <span className="o1-snap-progress">{progress} · {elapsed}s</span>}
        </div>
      </Card>

      {status && (
        <Alert tone={status.tone === 'success' ? 'success' : 'danger'} icon={status.tone === 'success' ? <CheckCircle2 size={16} /> : <AlertCircle size={16} />}>
          {status.text}
        </Alert>
      )}

      {result && (
        <>
          <div className="o1-snap-tiles">
            <Tile label="Eligible wallets" value={num(result.totalWallets)} sub={result.type === 'royalty' ? `${num(rows.reduce((a, c) => a + c.nftCount, 0))} NFTs` : `≥ ${num(result.rules.minBalance)} $VIBE`} />
            <Tile label="Distributed" value={`${num(result.totalDistributed)}`} sub={`of ${num(result.pool)} $VIBE pool`} />
            <Tile label="Snapshot block" value={`#${result.snapshotBlock}`} sub={`${result.snapshotTime.slice(0, 10)} ${result.snapshotTime.slice(11, 19)} UTC`} />
          </div>

          <Card style={{ padding: '14px 16px', display: 'flex', flexDirection: 'column', gap: '8px' }}>
            <span className="o1-admin-label">Merkle root · {result.type === 'holder' ? 'Holder round' : 'Royalty epoch'} #{result.round}</span>
            <div className="o1-snap-root">
              <code>{result.merkleRoot}</code>
              <CopyButton text={result.merkleRoot} />
            </div>
            <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
              <Button variant="primary" size="sm" onClick={publish} disabled={busy}>
                <Upload size={14} /> {busy ? 'Publishing…' : 'Sign & publish snapshot'}
              </Button>
              <Button variant="secondary" size="sm" onClick={() => onUseRoot({ type: result.type, round: result.round, root: result.merkleRoot })}>
                Use root in {result.type === 'holder' ? 'Holders' : 'Royalties'} tab <ArrowUpRight size={14} />
              </Button>
              <Button variant="secondary" size="sm" onClick={download}>
                <Download size={14} /> Download CSV
              </Button>
            </div>
          </Card>

          <Card style={{ padding: 0, overflow: 'hidden' }}>
            <div className="o1-snap-table-wrap">
              <table className="o1-snap-table">
                <thead>
                  <tr>
                    <th>#</th>
                    <th>Wallet</th>
                    <th>{result.type === 'holder' ? 'Balance' : 'NFTs'}</th>
                    <th>Share</th>
                    <th>Reward</th>
                  </tr>
                </thead>
                <tbody>
                  {rows.map((c, i) => (
                    <tr key={c.address}>
                      <td>{i + 1}</td>
                      <td>
                        <a href={`https://basescan.org/address/${c.address}`} target="_blank" rel="noreferrer">{short(c.address)}</a>
                      </td>
                      <td>{result.type === 'holder' ? num(c.balance) : c.nftCount}</td>
                      <td>{c.sharePercent}</td>
                      <td>
                        {num(c.amount)}
                        {c.isCapped && <span className="badge badge-warn" style={{ marginLeft: '6px' }}>cap</span>}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </Card>
        </>
      )}

      {published.length > 0 && (
        <Card style={{ padding: '12px 16px' }}>
          <div className="o1-admin-label" style={{ marginBottom: '8px' }}>Published snapshots</div>
          {published.map((p) => (
            <div key={`${p.type}:${p.round}`} className="o1-sched-history-row">
              <span>
                {p.type === 'holder' ? 'Holder' : 'Royalty'} #{p.round} · {num(p.totalWallets)} wallets · {num(p.pool)} $VIBE · {short(p.merkleRoot)}
              </span>
              <Button variant="secondary" size="sm" onClick={() => view(p)}>
                <Eye size={14} /> View
              </Button>
            </div>
          ))}
        </Card>
      )}
    </div>
  );
}
