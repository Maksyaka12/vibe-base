// Shared by the /api handlers: admin list, signature check and key-value storage.
//
// Storage: Upstash Redis REST (env KV_REST_API_URL/KV_REST_API_TOKEN or UPSTASH_REDIS_REST_URL/TOKEN).
// Without those env vars: local dev keeps files in frontend/.data, on Vercel writes fail with a clear message.

import { createPublicClient, recoverMessageAddress } from 'viem';
import { base } from 'viem/chains';
import { rpcTransports } from '../../src/config/rpc.js';
import { adminSessionMessage } from '../../src/data/snapshot/publish.js';

const MAX_SIGNATURE_AGE_MS = 10 * 60 * 1000;
const DEFAULT_ADMINS = ['0x4c91d3bed372c11795b9ce9a9017dfe447bf050a'];

export const env = (name) => (typeof process !== 'undefined' && process.env ? process.env[name] : undefined);

export const json = (status, body, headers = {}) => ({ status, body, headers: { 'Content-Type': 'application/json', ...headers } });

export function isAdmin(address) {
  const list = env('SCHEDULE_ADMINS');
  const admins = (list ? list.split(',') : DEFAULT_ADMINS).map((a) => a.trim().toLowerCase()).filter(Boolean);
  return typeof address === 'string' && admins.includes(address.toLowerCase());
}

const verifier = createPublicClient({ chain: base, transport: rpcTransports });

// Returns an error response, or null when the admin signature is valid and fresh.
export async function checkAdminSignature({ address, issuedAt, signature, message }) {
  if (!isAdmin(address)) return json(403, { error: 'This wallet is not an admin' });
  const issued = Date.parse(issuedAt);
  if (Number.isNaN(issued) || Math.abs(Date.now() - issued) > MAX_SIGNATURE_AGE_MS) return json(400, { error: 'Signature expired, please sign again' });
  let valid = false;
  try {
    valid = await verifier.verifyMessage({ address, message, signature });
  } catch {
    valid = false;
  }
  return valid ? null : json(401, { error: 'Signature check failed' });
}

// Short admin "session": the admin signs adminSessionMessage once, then sends address/issuedAt/signature
// as headers. Plain wallets are checked locally (no RPC), smart wallets fall back to an onchain check.
const SESSION_MAX_AGE_MS = 2 * 60 * 60 * 1000;

export async function checkAdminSession(headers = {}) {
  const address = headers['x-admin-address'];
  const issuedAt = headers['x-admin-issued'];
  const signature = headers['x-admin-signature'];
  if (!isAdmin(address)) return json(403, { error: 'Admin wallet required' });
  const issued = Date.parse(issuedAt);
  if (Number.isNaN(issued) || Date.now() - issued > SESSION_MAX_AGE_MS || issued - Date.now() > 60000) return json(401, { error: 'Admin session expired, run again to re-sign' });
  const message = adminSessionMessage({ address, issuedAt });
  try {
    const recovered = await recoverMessageAddress({ message, signature });
    if (recovered.toLowerCase() === address.toLowerCase()) return null;
  } catch {}
  try {
    if (await verifier.verifyMessage({ address, message, signature })) return null;
  } catch {}
  return json(401, { error: 'Admin signature check failed' });
}

// ---- key-value storage ----

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

const redisStore = {
  async get(key) {
    const { result } = await redis('', ['GET', key]);
    return result ? JSON.parse(result) : null;
  },
  async list(key, limit) {
    const { result } = await redis('', ['LRANGE', key, 0, limit - 1]);
    return (result || []).map((r) => JSON.parse(r));
  },
  async hgetall(key) {
    const { result } = await redis('', ['HGETALL', key]);
    const out = {};
    for (let i = 0; i < (result || []).length; i += 2) out[result[i]] = JSON.parse(result[i + 1]);
    return out;
  },
  // ops: [['set', key, value] | ['push', key, value, limit] | ['hset', key, field, value]]
  async write(ops) {
    const commands = ops.flatMap(([op, key, a, b]) => {
      if (op === 'set') return [['SET', key, JSON.stringify(a)]];
      if (op === 'push') return [['LPUSH', key, JSON.stringify(a)], ['LTRIM', key, 0, b - 1]];
      if (op === 'hset') return [['HSET', key, a, JSON.stringify(b)]];
      throw new Error(`Unknown op ${op}`);
    });
    const results = await redis('/pipeline', commands);
    if (results.some((r) => r.error)) throw new Error('Storage error');
  },
};

async function fileStore() {
  const fs = await import('node:fs/promises');
  const path = await import('node:path');
  const dir = path.resolve(process.cwd(), '.data');
  const file = (key) => path.join(dir, `${key.replace(/[^a-z0-9_-]+/gi, '_')}.json`);
  const read = async (key, fallback) => {
    try { return JSON.parse(await fs.readFile(file(key), 'utf8')); } catch { return fallback; }
  };
  const save = async (key, value) => {
    await fs.mkdir(dir, { recursive: true });
    await fs.writeFile(file(key), JSON.stringify(value));
  };
  return {
    get: (key) => read(key, null),
    async list(key, limit) { return (await read(key, [])).slice(0, limit); },
    hgetall: (key) => read(key, {}),
    async write(ops) {
      for (const [op, key, a, b] of ops) {
        if (op === 'set') await save(key, a);
        else if (op === 'push') await save(key, [a, ...(await read(key, []))].slice(0, b));
        else if (op === 'hset') await save(key, { ...(await read(key, {})), [a]: b });
      }
    },
  };
}

// On Vercel before Redis is connected: reads return nothing, writes explain why they fail.
const unconfiguredStore = {
  async get() { return null; },
  async list() { return []; },
  async hgetall() { return {}; },
  async write() { throw new Error('Storage is not connected: add Upstash Redis in Vercel → Storage and redeploy'); },
};

export async function store() {
  if (redisConfig()) return redisStore;
  return env('VERCEL') ? unconfiguredStore : fileStore();
}
