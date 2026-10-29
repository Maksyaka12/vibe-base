// Core of /api/minted-nft: which Vibe Club NFT a wallet minted, found through Alchemy's Transfers API
// (the mint is the transfer from the zero address). Public and read-only: it only ever asks about this
// one NFT contract, and a mint never changes, so a found answer is cached for a long time.
//
// GET ?address=0x... -> { tokenId: 123 } or { tokenId: null }

import { json, env } from './common.js';
import { VIBE_CLUB_NFT } from '../../src/data/snapshot/constants.js';

const ZERO = '0x0000000000000000000000000000000000000000';

export async function handleMintedNft({ method, query = {} }) {
  if (method !== 'GET') return json(405, { error: 'Method not allowed' }, { Allow: 'GET' });
  const key = env('ALCHEMY_API_KEY');
  if (!key) return json(503, { error: 'ALCHEMY_API_KEY is not set in Vercel' });

  const address = String(query.address || '').toLowerCase();
  if (!/^0x[0-9a-f]{40}$/.test(address)) return json(400, { error: 'Invalid address' });

  try {
    const res = await fetch(`https://base-mainnet.g.alchemy.com/v2/${key}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        jsonrpc: '2.0',
        id: 1,
        method: 'alchemy_getAssetTransfers',
        params: [{
          fromBlock: '0x0',
          toBlock: 'latest',
          fromAddress: ZERO,
          toAddress: address,
          contractAddresses: [VIBE_CLUB_NFT],
          category: ['erc721'],
          withMetadata: false,
          order: 'asc',
          maxCount: '0xa',
        }],
      }),
    });
    const body = await res.json().catch(() => null);
    if (!res.ok || !body || body.error) {
      return json(res.ok ? 502 : res.status, { error: `Alchemy: ${body?.error?.message || res.status}` });
    }
    const first = body.result?.transfers?.[0];
    const raw = first?.erc721TokenId || first?.tokenId;
    const tokenId = raw ? Number(BigInt(raw)) : null;
    return json(200, { tokenId }, {
      'Cache-Control': tokenId ? 'public, max-age=86400, s-maxage=31536000, immutable' : 'public, max-age=0, s-maxage=60',
    });
  } catch (e) {
    return json(502, { error: 'Alchemy is not reachable' });
  }
}
