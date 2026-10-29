// Core of /api/transfers: $VIBE transfer history through Alchemy's Transfers API, with the key from
// env ALCHEMY_API_KEY. Admin-only (signed session headers) and limited to this one token, so the key
// cannot be used for anything else.
//
// GET ?fromBlock=&toBlock=&pageKey= -> { transfers: [{ to, block }], pageKey }

import { json, env, checkAdminSession } from './common.js';
import { VIBE_TOKEN } from '../../src/data/snapshot/constants.js';

const isUint = (v) => typeof v === 'string' && /^\d{1,12}$/.test(v);
const hex = (n) => `0x${BigInt(n).toString(16)}`;

export async function handleTransfers({ method, query = {}, headers = {} }) {
  if (method !== 'GET') return json(405, { error: 'Method not allowed' }, { Allow: 'GET' });
  const key = env('ALCHEMY_API_KEY');
  if (!key) return json(503, { error: 'ALCHEMY_API_KEY is not set in Vercel' });

  const denied = await checkAdminSession(headers);
  if (denied) return denied;

  const { fromBlock, toBlock, pageKey } = query;
  if (!isUint(fromBlock) || !isUint(toBlock) || (pageKey && !/^[\w-]{1,200}$/.test(pageKey))) return json(400, { error: 'Invalid query' });

  const params = {
    fromBlock: hex(fromBlock),
    toBlock: hex(toBlock),
    contractAddresses: [VIBE_TOKEN],
    category: ['erc20'],
    excludeZeroValue: false,
    withMetadata: false,
    order: 'asc',
    maxCount: '0x3e8',
  };
  if (pageKey) params.pageKey = pageKey;

  try {
    const res = await fetch(`https://base-mainnet.g.alchemy.com/v2/${key}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ jsonrpc: '2.0', id: 1, method: 'alchemy_getAssetTransfers', params: [params] }),
    });
    const body = await res.json().catch(() => null);
    if (!res.ok || !body || body.error) {
      return json(res.ok ? 502 : res.status, { error: `Alchemy: ${body?.error?.message || res.status}` });
    }
    const transfers = (body.result?.transfers || []).map((t) => ({ to: t.to, block: Number(BigInt(t.blockNum)) }));
    return json(200, { transfers, pageKey: body.result?.pageKey || null }, { 'Cache-Control': 'no-store' });
  } catch (e) {
    return json(502, { error: 'Alchemy is not reachable' });
  }
}
