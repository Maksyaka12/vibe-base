// Core of /api/schedule, shared by the Vercel function (api/schedule.js) and the Vite dev server.
//
// GET  -> { schedule, updatedAt, updatedBy } (schedule is null until the admin publishes one)
// GET ?history=1 -> { history: [{ schedule, updatedAt, updatedBy }, ...] } newest first
// PUT  { schedule: "<json>", address, issuedAt, signature } -> saves after verifying the admin signature
//
// Storage: Upstash Redis REST (env KV_REST_API_URL/KV_REST_API_TOKEN or UPSTASH_REDIS_REST_URL/TOKEN);
// without those env vars (local dev) it falls back to frontend/.data/*.json.

import { createPublicClient } from 'viem';
import { base } from 'viem/chains';
import { rpcTransports } from '../../src/config/rpc.js';
import { validateSchedule, hashScheduleJson, scheduleSignMessage, MAX_SCHEDULE_BYTES } from '../../src/data/scheduleSchema.js';

const KEY = 'vibe:schedule';
const HISTORY_KEY = 'vibe:schedule:history';
const HISTORY_LIMIT = 50;
const MAX_SIGNATURE_AGE_MS = 10 * 60 * 1000;
const DEFAULT_ADMINS = ['0x4c91d3bed372c11795b9ce9a9017dfe447bf050a'];

const env = (name) => (typeof process !== 'undefined' && process.env ? process.env[name] : undefined);

function admins() {
  const list = env('SCHEDULE_ADMINS');
  return (list ? list.split(',') : DEFAULT_ADMINS).map((a) => a.trim().toLowerCase()).filter(Boolean);
}

// ---- storage ----

function redisConfig() {
  const url = env('KV_REST_API_URL') || env('UPSTASH_REDIS_REST_URL');
  const token = env('KV_REST_API_TOKEN') || env('UPSTASH_REDIS_REST_TOKEN');
  return url && token ? { url: url.replace(/\/$/, ''), token } : null;
}

async function redis(path, body) {
  const { url, token } = redisConfig();
  const res = await fetch(`${url}${path}`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
  if (!res.ok) throw new Error(`Storage error ${res.status}`);
  return res.json();
}

async function fileStore() {
  const fs = await import('node:fs/promises');
  const path = await import('node:path');
  const dir = path.resolve(process.cwd(), '.data');
  const file = (name) => path.join(dir, name);
  const read = async (name, fallback) => {
    try { return JSON.parse(await fs.readFile(file(name), 'utf8')); } catch { return fallback; }
  };
  return {
    async get() { return read('schedule.json', null); },
    async history() { return read('schedule-history.json', []); },
    async save(record, previous) {
      await fs.mkdir(dir, { recursive: true });
      const history = await read('schedule-history.json', []);
      if (previous) history.unshift(previous);
      await fs.writeFile(file('schedule-history.json'), JSON.stringify(history.slice(0, HISTORY_LIMIT)));
      await fs.writeFile(file('schedule.json'), JSON.stringify(record));
    },
  };
}

// On Vercel before Redis is connected: reads fall back to the built-in schedule, writes explain why they fail.
const unconfiguredStore = {
  async get() { return null; },
  async history() { return []; },
  async save() { throw new Error('Storage is not connected: add Upstash Redis in Vercel → Storage and redeploy'); },
};

async function store() {
  if (!redisConfig()) return env('VERCEL') ? unconfiguredStore : fileStore();
  return {
    async get() {
      const { result } = await redis('', ['GET', KEY]);
      return result ? JSON.parse(result) : null;
    },
    async history() {
      const { result } = await redis('', ['LRANGE', HISTORY_KEY, 0, HISTORY_LIMIT - 1]);
      return (result || []).map((r) => JSON.parse(r));
    },
    async save(record, previous) {
      const ops = [['SET', KEY, JSON.stringify(record)]];
      if (previous) ops.push(['LPUSH', HISTORY_KEY, JSON.stringify(previous)], ['LTRIM', HISTORY_KEY, 0, HISTORY_LIMIT - 1]);
      const results = await redis('/pipeline', ops);
      if (results.some((r) => r.error)) throw new Error('Storage error');
    },
  };
}

// ---- handler ----

const json = (status, body, headers = {}) => ({ status, body, headers: { 'Content-Type': 'application/json', ...headers } });

const verifier = createPublicClient({ chain: base, transport: rpcTransports });

export async function handleSchedule({ method, query = {}, body }) {
  try {
    const db = await store();

    if (method === 'GET') {
      if (query.history) return json(200, { history: await db.history() }, { 'Cache-Control': 'no-store' });
      const record = await db.get();
      return json(200, record || { schedule: null }, {
        'Cache-Control': query.fresh ? 'no-store' : 'public, max-age=0, s-maxage=15, stale-while-revalidate=60',
      });
    }

    if (method === 'PUT') {
      const { schedule: scheduleJson, address, issuedAt, signature } = body || {};
      if (typeof scheduleJson !== 'string' || scheduleJson.length > MAX_SCHEDULE_BYTES) return json(400, { error: 'Invalid schedule payload' });
      if (typeof address !== 'string' || !admins().includes(address.toLowerCase())) return json(403, { error: 'This wallet is not an admin' });
      const issued = Date.parse(issuedAt);
      if (Number.isNaN(issued) || Math.abs(Date.now() - issued) > MAX_SIGNATURE_AGE_MS) return json(400, { error: 'Signature expired, please sign again' });

      let schedule;
      try {
        schedule = validateSchedule(JSON.parse(scheduleJson));
      } catch (e) {
        return json(400, { error: e.message });
      }

      const message = scheduleSignMessage({ address, issuedAt, hash: await hashScheduleJson(scheduleJson) });
      let valid = false;
      try {
        valid = await verifier.verifyMessage({ address, message, signature });
      } catch {
        valid = false;
      }
      if (!valid) return json(401, { error: 'Signature check failed' });

      const previous = await db.get();
      const record = { schedule, updatedAt: new Date().toISOString(), updatedBy: address.toLowerCase() };
      await db.save(record, previous);
      return json(200, record, { 'Cache-Control': 'no-store' });
    }

    return json(405, { error: 'Method not allowed' }, { Allow: 'GET, PUT' });
  } catch (e) {
    return json(500, { error: e.message || 'Server error' });
  }
}
