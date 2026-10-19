import { useEffect, useMemo, useState } from 'react';
import { stringToHex } from 'viem';
import { Plus, Trash2, Upload, RotateCcw, History, CheckCircle2, AlertCircle, Link2, ImageUp } from 'lucide-react';
import { SCHEDULE } from '../../../data/rewardsSchedule';
import { validateSchedule, hashScheduleJson, scheduleSignMessage } from '../../../data/scheduleSchema';
import { fetchPublishedSchedule, applyPublishedSchedule } from '../../../data/scheduleLoader';
import { Card, Button, Alert } from './ui';
import { pickAdminWallet, adminSessionHeaders, compressImage } from './adminSession';

const TABS = [
  { id: 'staking', label: 'Staking epochs' },
  { id: 'royalties', label: 'Vibe Club royalties' },
  { id: 'holderUnlocks', label: 'Holder unlocks' },
  { id: 'giveaways', label: 'Giveaways' },
];

const DAY = 86400000;
const clone = (v) => JSON.parse(JSON.stringify(v));
const toInput = (iso) => (iso ? iso.slice(0, 16) : '');
const fromInput = (value) => (value ? `${value}:00Z` : '');
const shift = (iso, ms) => new Date(new Date(iso).getTime() + ms).toISOString().replace('.000Z', 'Z');
const short = (a) => (a ? `${a.slice(0, 6)}…${a.slice(-4)}` : '');
const when = (iso) => {
  const d = new Date(iso);
  return `${d.getUTCDate()} ${d.toLocaleString('en-US', { month: 'short', timeZone: 'UTC' })} ${d.getUTCFullYear()}, ${String(d.getUTCHours()).padStart(2, '0')}:${String(d.getUTCMinutes()).padStart(2, '0')} UTC`;
};
const VAULT_IN_TEXT = /0x[0-9a-fA-F]{64}/;

// New row = last row moved forward by the same interval it had to the row before it.
function nextRow(tab, list) {
  const last = list[list.length - 1];
  const prev = list[list.length - 2];
  if (tab === 'staking') {
    if (!last) return { epoch: 1, start: shift(new Date().toISOString(), 0), end: shift(new Date().toISOString(), 10 * DAY), pool: 'TBA', vaultId: '' };
    return { epoch: last.epoch + 1, start: last.end, end: shift(last.end, new Date(last.end) - new Date(last.start)), pool: 'TBA', vaultId: '' };
  }
  if (tab === 'giveaways') {
    const id = list.reduce((m, g) => Math.max(m, g.id), 0) + 1;
    return { id, title: '', image: '', winners: '', prizePool: 'TBA', burnNote: '', status: 'ongoing', distribution: 'Not Started', link: '' };
  }
  const dateKey = tab === 'royalties' ? 'claim' : 'unlock';
  const step = tab === 'royalties' ? 10 * DAY : 30 * DAY;
  if (!last) return { round: 1, snapshot: new Date().toISOString(), [dateKey]: new Date().toISOString(), pool: 'TBA' };
  const interval = prev ? new Date(last.snapshot) - new Date(prev.snapshot) : step;
  const gap = new Date(last[dateKey]) - new Date(last.snapshot);
  const snapshot = shift(last.snapshot, interval);
  return { round: last.round + 1, snapshot, [dateKey]: shift(snapshot, gap), pool: 'TBA' };
}

function Field({ label, children, wide }) {
  return (
    <label className={`o1-sched-field${wide ? ' wide' : ''}`}>
      <span className="o1-admin-label">{label}</span>
      {children}
    </label>
  );
}

// Built-in banner files used when no image was uploaded for the round.
const defaultBanner = (round) => (Number(round) === 1 ? '/vibe-club-royalties-banner.jpg' : `/vibe-club-royalties-${round}.jfif`);

// "Claimed" banner of a royalty round: shown in the claim modal, the share dialog and its download.
function BannerField({ round, value, onChange, wallet }) {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [broken, setBroken] = useState(false);
  const preview = value || defaultBanner(round);

  const upload = async (file) => {
    if (!file) return;
    setError('');
    setBusy(true);
    try {
      const image = await compressImage(file);
      const res = await fetch(`/api/banner?round=${round}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json', ...(await adminSessionHeaders(wallet)) },
        body: JSON.stringify({ type: image.type, data: image.data }),
      });
      const body = await res.json();
      if (!res.ok) throw new Error(body.error || `Upload failed (${res.status})`);
      setBroken(false);
      onChange(body.url);
    } catch (e) {
      setError(e?.shortMessage || e?.message || 'Upload failed');
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="o1-sched-field o1-sched-banner">
      <span className="o1-admin-label">Claimed banner {value ? '(uploaded)' : '(built-in file)'}</span>
      <div className="o1-sched-banner-row">
        {broken ? (
          <div className="o1-sched-banner-thumb empty">No image</div>
        ) : (
          <img className="o1-sched-banner-thumb" src={preview} alt={`Royalty ${round} banner`} onError={() => setBroken(true)} />
        )}
        <div className="o1-sched-banner-actions">
          <label className={`btn btn-secondary btn-sm${busy ? ' is-busy' : ''}`}>
            <ImageUp size={14} /> {busy ? 'Uploading…' : 'Upload image'}
            <input type="file" accept="image/*" hidden disabled={busy} onChange={(e) => { upload(e.target.files?.[0]); e.target.value = ''; }} />
          </label>
          {value && (
            <Button variant="ghost" size="sm" onClick={() => { setBroken(false); onChange(''); }}>
              Use built-in file
            </Button>
          )}
          <span className="o1-sched-hint">
            {error ? <span style={{ color: 'var(--red)' }}>{error}</span> : 'JPEG/PNG, compressed automatically. Publish the schedule to apply.'}
          </span>
        </div>
      </div>
    </div>
  );
}

export function AdminScheduleEditor({ activeAddress, wallets }) {
  const [tab, setTab] = useState('staking');
  const [baseline, setBaseline] = useState(() => clone(SCHEDULE));
  const [draft, setDraft] = useState(() => clone(SCHEDULE));
  const [published, setPublished] = useState(null); // { updatedAt, updatedBy } | 'none' | null (loading)
  const [history, setHistory] = useState(null);
  const [status, setStatus] = useState(null); // { tone, text }
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    fetchPublishedSchedule({ fresh: true })
      .then((record) => {
        if (record.schedule) {
          setBaseline(clone(record.schedule));
          setDraft(clone(record.schedule));
          setPublished({ updatedAt: record.updatedAt, updatedBy: record.updatedBy });
        } else {
          setPublished('none');
        }
      })
      .catch(() => setStatus({ tone: 'danger', text: 'Could not reach the schedule service. Editing the built-in schedule.' }));
  }, []);

  const dirty = useMemo(() => JSON.stringify(draft) !== JSON.stringify(baseline), [draft, baseline]);
  const validation = useMemo(() => {
    try {
      validateSchedule(draft);
      return null;
    } catch (e) {
      return e.message;
    }
  }, [draft]);

  const rows = draft[tab];
  const setRows = (next) => setDraft((d) => ({ ...d, [tab]: next }));
  const update = (i, patch) => setRows(rows.map((r, idx) => (idx === i ? { ...r, ...patch } : r)));
  const remove = (i) => setRows(rows.filter((_, idx) => idx !== i));
  const add = () => setRows([...rows, nextRow(tab, rows)]);

  const loadHistory = async () => {
    try {
      const res = await fetch('/api/schedule?history=1', { cache: 'no-store' });
      const data = await res.json();
      setHistory(data.history || []);
    } catch (e) {
      setStatus({ tone: 'danger', text: 'Could not load history.' });
    }
  };

  const publish = async () => {
    setStatus(null);
    let normalized;
    try {
      normalized = validateSchedule(draft);
    } catch (e) {
      setStatus({ tone: 'danger', text: e.message });
      return;
    }
    const wallet = wallets.find((w) => w.address.toLowerCase() === activeAddress?.toLowerCase()) || wallets[0];
    if (!wallet) {
      setStatus({ tone: 'danger', text: 'Connect the admin wallet to publish.' });
      return;
    }
    setBusy(true);
    try {
      const json = JSON.stringify(normalized);
      const issuedAt = new Date().toISOString();
      const message = scheduleSignMessage({ address: wallet.address, issuedAt, hash: await hashScheduleJson(json) });
      const provider = await wallet.getEthereumProvider();
      const signature = await provider.request({ method: 'personal_sign', params: [stringToHex(message), wallet.address] });
      const res = await fetch('/api/schedule', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ schedule: json, address: wallet.address, issuedAt, signature }),
      });
      const record = await res.json();
      if (!res.ok) throw new Error(record.error || `Publish failed (${res.status})`);
      applyPublishedSchedule(record.schedule);
      setBaseline(clone(record.schedule));
      setDraft(clone(record.schedule));
      setPublished({ updatedAt: record.updatedAt, updatedBy: record.updatedBy });
      setHistory(null);
      setStatus({ tone: 'success', text: 'Published. Visitors get the new schedule within about 15 seconds.' });
    } catch (e) {
      setStatus({ tone: 'danger', text: e?.shortMessage || e?.message || 'Publish failed' });
    } finally {
      setBusy(false);
    }
  };

  const dateKey = tab === 'royalties' ? 'claim' : 'unlock';

  return (
    <div className="o1-sched">
      <Card style={{ padding: '18px 20px', display: 'flex', flexDirection: 'column', gap: '6px' }}>
        <div style={{ fontSize: '16px', fontWeight: 600, color: 'var(--text)' }}>Reward schedule</div>
        <div style={{ fontSize: '13px', color: 'var(--text-2)' }}>
          Pools, dates and vault links shown in Rewards Hub, Claim Portal and Profile, for both themes. All times are UTC.
        </div>
        <div style={{ fontSize: '12px', color: 'var(--text-3)', fontFamily: 'var(--font-mono)' }}>
          {published === null && 'Loading published schedule…'}
          {published === 'none' && 'Nothing published yet: the site uses the built-in schedule.'}
          {published && published !== 'none' && `Published ${when(published.updatedAt)} by ${short(published.updatedBy)}`}
        </div>
      </Card>

      <div className="seg o1-sched-tabs" role="tablist">
        {TABS.map((t) => (
          <button key={t.id} type="button" role="tab" aria-selected={tab === t.id} onClick={() => setTab(t.id)}>
            {t.label} <span className="o1-sched-count">{draft[t.id].length}</span>
          </button>
        ))}
      </div>

      <div className="o1-sched-list">
        {rows.map((r, i) => (
          <Card key={i} className="o1-sched-row">
            {tab === 'staking' && (
              <>
                <Field label="Epoch"><input className="o1-admin-input" type="number" min="1" value={r.epoch} onChange={(e) => update(i, { epoch: Number(e.target.value) })} /></Field>
                <Field label="Start (UTC)"><input className="o1-admin-input" type="datetime-local" value={toInput(r.start)} onChange={(e) => update(i, { start: fromInput(e.target.value) })} /></Field>
                <Field label="End (UTC)"><input className="o1-admin-input" type="datetime-local" value={toInput(r.end)} onChange={(e) => update(i, { end: fromInput(e.target.value) })} /></Field>
                <Field label="Pool ($VIBE or TBA)"><input className="o1-admin-input" value={r.pool} onChange={(e) => update(i, { pool: e.target.value })} /></Field>
                <Field label="o1 vault link or id" wide>
                  <input
                    className="o1-admin-input"
                    placeholder="Paste the vault link from launch.o1.exchange"
                    value={r.vaultId}
                    onChange={(e) => {
                      const v = e.target.value.trim();
                      const m = v.match(VAULT_IN_TEXT);
                      update(i, { vaultId: m ? m[0] : v });
                    }}
                  />
                  <span className={`o1-sched-hint ${r.vaultId ? 'ok' : ''}`}>
                    <Link2 size={12} /> {r.vaultId ? 'Vault linked' : 'No vault yet: buttons open the o1 vault list'}
                  </span>
                </Field>
              </>
            )}

            {(tab === 'royalties' || tab === 'holderUnlocks') && (
              <>
                <Field label={tab === 'royalties' ? 'Royalty' : 'Unlock'}><input className="o1-admin-input" type="number" min="1" value={r.round} onChange={(e) => update(i, { round: Number(e.target.value) })} /></Field>
                <Field label="Snapshot (UTC)"><input className="o1-admin-input" type="datetime-local" value={toInput(r.snapshot)} onChange={(e) => update(i, { snapshot: fromInput(e.target.value) })} /></Field>
                <Field label={tab === 'royalties' ? 'Claim opens (UTC)' : 'Unlock (UTC)'}><input className="o1-admin-input" type="datetime-local" value={toInput(r[dateKey])} onChange={(e) => update(i, { [dateKey]: fromInput(e.target.value) })} /></Field>
                <Field label="Pool ($VIBE or TBA)"><input className="o1-admin-input" value={r.pool} onChange={(e) => update(i, { pool: e.target.value })} /></Field>
                {tab === 'royalties' && (
                  <BannerField
                    round={r.round}
                    value={r.banner || ''}
                    onChange={(banner) => update(i, { banner })}
                    wallet={pickAdminWallet(wallets, activeAddress)}
                  />
                )}
              </>
            )}

            {tab === 'giveaways' && (
              <>
                <Field label="Title" wide><input className="o1-admin-input" value={r.title} onChange={(e) => update(i, { title: e.target.value })} /></Field>
                <Field label="Prize pool"><input className="o1-admin-input" value={r.prizePool} onChange={(e) => update(i, { prizePool: e.target.value })} /></Field>
                <Field label="Winners"><input className="o1-admin-input" value={r.winners} onChange={(e) => update(i, { winners: e.target.value })} /></Field>
                <Field label="Status">
                  <select className="o1-admin-input" value={r.status} onChange={(e) => update(i, { status: e.target.value })}>
                    <option value="ongoing">Active</option>
                    <option value="ended">Ended</option>
                  </select>
                </Field>
                <Field label="Distribution"><input className="o1-admin-input" value={r.distribution} onChange={(e) => update(i, { distribution: e.target.value })} /></Field>
                <Field label="Post link" wide><input className="o1-admin-input" placeholder="https://x.com/…" value={r.link} onChange={(e) => update(i, { link: e.target.value })} /></Field>
                <Field label="Image (optional)"><input className="o1-admin-input" placeholder="/event1.png" value={r.image} onChange={(e) => update(i, { image: e.target.value })} /></Field>
                <Field label="Burn note (optional)"><input className="o1-admin-input" value={r.burnNote} onChange={(e) => update(i, { burnNote: e.target.value })} /></Field>
              </>
            )}

            <button type="button" className="o1-sched-remove" onClick={() => remove(i)} aria-label="Remove row" title="Remove row">
              <Trash2 size={15} />
            </button>
          </Card>
        ))}

        <Button variant="secondary" size="md" onClick={add} style={{ alignSelf: 'flex-start' }}>
          <Plus size={15} />
          {tab === 'staking' ? 'Add epoch' : tab === 'giveaways' ? 'Add giveaway' : tab === 'royalties' ? 'Add royalty' : 'Add unlock'}
        </Button>
      </div>

      {status && (
        <Alert tone={status.tone === 'success' ? 'success' : 'danger'} icon={status.tone === 'success' ? <CheckCircle2 size={16} /> : <AlertCircle size={16} />}>
          {status.text}
        </Alert>
      )}

      <div className="o1-sched-actions">
        <span className="o1-sched-state">
          {validation ? <span className="err">{validation}</span> : dirty ? 'Unsaved changes' : 'No changes'}
        </span>
        <Button variant="ghost" size="md" onClick={() => { setDraft(clone(baseline)); setStatus(null); }} disabled={!dirty || busy}>
          <RotateCcw size={15} /> Discard
        </Button>
        <Button variant="primary" size="md" onClick={publish} disabled={!dirty || !!validation || busy}>
          <Upload size={15} /> {busy ? 'Publishing…' : 'Sign & publish'}
        </Button>
      </div>

      <div>
        {history === null ? (
          <Button variant="ghost" size="sm" onClick={loadHistory}>
            <History size={14} /> Show previous versions
          </Button>
        ) : (
          <Card style={{ padding: '12px 16px' }}>
            <div className="o1-admin-label" style={{ marginBottom: '8px' }}>Previous versions</div>
            {history.length === 0 && <div style={{ fontSize: '13px', color: 'var(--text-3)' }}>No previous versions yet.</div>}
            {history.map((h, i) => (
              <div key={i} className="o1-sched-history-row">
                <span>{when(h.updatedAt)} · {short(h.updatedBy)}</span>
                <Button variant="secondary" size="sm" onClick={() => { setDraft(clone(h.schedule)); setStatus({ tone: 'success', text: 'Loaded into the editor. Publish to restore it.' }); }}>
                  Load
                </Button>
              </div>
            ))}
          </Card>
        )}
      </div>
    </div>
  );
}
