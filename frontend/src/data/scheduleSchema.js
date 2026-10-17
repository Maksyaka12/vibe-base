// Validation and signing helpers for the admin-editable reward schedule.
// Shared by the site (main.jsx, admin editor) and the /api/schedule function.

export const MAX_SCHEDULE_BYTES = 64 * 1024;
const MAX_ROWS = 200;

const VAULT_ID = /^0x[0-9a-fA-F]{64}$/;
const POOL = /^(TBA|[0-9][0-9,.]*)$/;

function fail(msg) {
  throw new Error(msg);
}

function iso(value, label) {
  if (typeof value !== 'string' || Number.isNaN(Date.parse(value))) fail(`${label}: invalid date`);
  return new Date(value).toISOString().replace('.000Z', 'Z');
}

function text(value, label, max = 200, { required = false } = {}) {
  if (value == null) value = '';
  if (typeof value !== 'string') fail(`${label}: must be text`);
  const v = value.trim();
  if (required && !v) fail(`${label}: required`);
  if (v.length > max) fail(`${label}: too long`);
  return v;
}

function pool(value, label) {
  const v = text(value || 'TBA', label, 32).toUpperCase() === 'TBA' ? 'TBA' : text(value, label, 32);
  if (!POOL.test(v)) fail(`${label}: use a number like 1,100,000 or TBA`);
  return v;
}

function int(value, label) {
  const n = Number(value);
  if (!Number.isInteger(n) || n < 1 || n > 9999) fail(`${label}: must be a whole number`);
  return n;
}

function url(value, label) {
  const v = text(value, label, 300);
  if (v && !/^https:\/\//.test(v) && !v.startsWith('/')) fail(`${label}: must start with https:// or /`);
  return v;
}

function rows(list, label) {
  if (!Array.isArray(list)) fail(`${label}: missing list`);
  if (list.length > MAX_ROWS) fail(`${label}: too many rows`);
  return list;
}

function unique(list, key, label) {
  const seen = new Set();
  for (const r of list) {
    if (seen.has(r[key])) fail(`${label}: number ${r[key]} is used twice`);
    seen.add(r[key]);
  }
}

// Returns a normalized copy or throws an Error with a readable message.
export function validateSchedule(input) {
  if (!input || typeof input !== 'object') fail('Schedule is empty');

  const staking = rows(input.staking, 'Staking').map((e, i) => {
    const l = `Staking row ${i + 1}`;
    const out = {
      epoch: int(e.epoch, `${l} epoch`),
      start: iso(e.start, `${l} start`),
      end: iso(e.end, `${l} end`),
      pool: pool(e.pool, `${l} pool`),
      vaultId: text(e.vaultId, `${l} vault`, 66),
    };
    if (new Date(out.end) <= new Date(out.start)) fail(`${l}: end must be after start`);
    if (out.vaultId && !VAULT_ID.test(out.vaultId)) fail(`${l}: vault id must be 0x + 64 hex characters`);
    return out;
  });
  unique(staking, 'epoch', 'Staking');

  const roundRows = (list, label, dateKey) => rows(list, label).map((r, i) => {
    const l = `${label} row ${i + 1}`;
    const out = {
      round: int(r.round, `${l} number`),
      snapshot: iso(r.snapshot, `${l} snapshot`),
      [dateKey]: iso(r[dateKey], `${l} ${dateKey}`),
      pool: pool(r.pool, `${l} pool`),
    };
    if (r.nextSnapshot) out.nextSnapshot = iso(r.nextSnapshot, `${l} next snapshot`);
    if (new Date(out[dateKey]) < new Date(out.snapshot)) fail(`${l}: ${dateKey} must not be before the snapshot`);
    return out;
  });
  const royalties = roundRows(input.royalties, 'Royalties', 'claim');
  unique(royalties, 'round', 'Royalties');
  const holderUnlocks = roundRows(input.holderUnlocks, 'Holder unlocks', 'unlock');
  unique(holderUnlocks, 'round', 'Holder unlocks');

  const giveaways = rows(input.giveaways, 'Giveaways').map((g, i) => {
    const l = `Giveaway row ${i + 1}`;
    const status = text(g.status, `${l} status`, 10);
    if (status !== 'ongoing' && status !== 'ended') fail(`${l}: status must be ongoing or ended`);
    return {
      id: int(g.id, `${l} id`),
      title: text(g.title, `${l} title`, 80, { required: true }),
      image: url(g.image, `${l} image`),
      winners: text(g.winners, `${l} winners`, 40),
      prizePool: text(g.prizePool, `${l} prize`, 40),
      burnNote: text(g.burnNote, `${l} burn note`, 60),
      status,
      distribution: text(g.distribution, `${l} distribution`, 40),
      link: url(g.link, `${l} link`),
    };
  });
  unique(giveaways, 'id', 'Giveaways');

  const out = { staking, royalties, holderUnlocks, giveaways };
  if (JSON.stringify(out).length > MAX_SCHEDULE_BYTES) fail('Schedule is too large');
  return out;
}

export async function hashScheduleJson(json) {
  const bytes = new TextEncoder().encode(json);
  const digest = await globalThis.crypto.subtle.digest('SHA-256', bytes);
  return Array.from(new Uint8Array(digest), (b) => b.toString(16).padStart(2, '0')).join('');
}

// The exact text the admin wallet signs; the server rebuilds it to verify.
export function scheduleSignMessage({ address, issuedAt, hash }) {
  return [
    'Vibe Hub: publish reward schedule',
    `Admin: ${address.toLowerCase()}`,
    `Issued: ${issuedAt}`,
    `Schedule SHA-256: ${hash}`,
  ].join('\n');
}
