// Core of /api/blockscout: $VIBE Transfer log search through Blockscout PRO API with the key from
// env BLOCKSCOUT_API_KEY. Admin-only (signed session headers) and limited to that one query, so the
// key cannot be used for anything else.
//
// GET ?fromBlock=&toBlock=&page=&offset= -> Etherscan-style { status, message, result }

import { json, env, checkAdminSession } from './common.js';
import { VIBE_TOKEN, TRANSFER_TOPIC } from '../../src/data/snapshot/constants.js';

const PRO_API = 'https://api.blockscout.com/v2/api';
const isUint = (v) => typeof v === 'string' && /^\d{1,12}$/.test(v);

export async function handleBlockscout({ method, query = {}, headers = {} }) {
  if (method !== 'GET') return json(405, { error: 'Method not allowed' }, { Allow: 'GET' });
  const key = env('BLOCKSCOUT_API_KEY');
  if (!key) return json(503, { error: 'BLOCKSCOUT_API_KEY is not set' });

  const denied = await checkAdminSession(headers);
  if (denied) return denied;

  const { fromBlock, toBlock, page, offset } = query;
  if (![fromBlock, toBlock, page, offset].every(isUint) || Number(offset) > 1000 || Number(page) > 10) return json(400, { error: 'Invalid query' });

  const params = new URLSearchParams({
    chain_id: '8453',
    module: 'logs',
    action: 'getLogs',
    address: VIBE_TOKEN,
    topic0: TRANSFER_TOPIC,
    fromBlock,
    toBlock,
    page,
    offset,
    apikey: key,
  });
  try {
    const res = await fetch(`${PRO_API}?${params}`);
    const body = await res.json().catch(() => ({ error: `Blockscout ${res.status}` }));
    return json(res.status, body, { 'Cache-Control': 'no-store' });
  } catch (e) {
    return json(502, { error: 'Blockscout is not reachable' });
  }
}
