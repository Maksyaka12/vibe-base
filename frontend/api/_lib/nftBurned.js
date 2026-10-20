// Core of /api/nft-burned: $VIBE the Vibe Club contract sent to the burn address, summed from Alchemy's
// Transfers API (key in env ALCHEMY_API_KEY). Public and read-only, fixed to this one contract/token pair.
//
// GET -> { burned: 16407500.5, transfers: 120 }

import { json, env } from './common.js';
import { VIBE_TOKEN, VIBE_CLUB_NFT } from '../../src/data/snapshot/constants.js';

const BURN_ADDRESS = '0x000000000000000000000000000000000000dead';
const MAX_PAGES = 20;

export async function handleNftBurned({ method }) {
  if (method !== 'GET') return json(405, { error: 'Method not allowed' }, { Allow: 'GET' });
  const key = env('ALCHEMY_API_KEY');
  if (!key) return json(503, { error: 'ALCHEMY_API_KEY is not set in Vercel' });

  try {
    let burned = 0n;
    let transfers = 0;
    let pageKey;
    for (let page = 0; page < MAX_PAGES; page++) {
      const params = {
        fromBlock: '0x0',
        toBlock: 'latest',
        fromAddress: VIBE_CLUB_NFT,
        toAddress: BURN_ADDRESS,
        contractAddresses: [VIBE_TOKEN],
        category: ['erc20'],
        withMetadata: false,
        excludeZeroValue: true,
        maxCount: '0x3e8',
      };
      if (pageKey) params.pageKey = pageKey;
      const res = await fetch(`https://base-mainnet.g.alchemy.com/v2/${key}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ jsonrpc: '2.0', id: 1, method: 'alchemy_getAssetTransfers', params: [params] }),
      });
      const body = await res.json().catch(() => null);
      if (!res.ok || !body || body.error) {
        return json(res.ok ? 502 : res.status, { error: `Alchemy: ${body?.error?.message || res.status}` });
      }
      for (const t of body.result?.transfers || []) {
        if (t.rawContract?.value) burned += BigInt(t.rawContract.value);
        transfers++;
      }
      pageKey = body.result?.pageKey;
      if (!pageKey) break;
    }
    return json(200, { burned: Number(burned / 10n ** 14n) / 10000, transfers }, {
      'Cache-Control': 'public, max-age=60, s-maxage=120, stale-while-revalidate=600',
    });
  } catch (e) {
    return json(502, { error: 'Alchemy is not reachable' });
  }
}
