// GET /api/activity?address=0x...  every transaction of a wallet for the Wallet page: swaps, sends, receives,
// reward claims, staking, Vibe Club mints, achievement SBTs and daily check-ins, newest first.
//
// Source: Alchemy (env ALCHEMY_API_KEY). Token movements come from alchemy_getAssetTransfers in both directions
// and are grouped by tx hash; check-ins move no tokens, so they come from the check-in contract's CheckedIn logs.
// Incoming tokens and NFTs that are not ours are skipped (airdrop spam on Base).

import { encodeEventTopics, parseAbi, pad } from 'viem';
import { json, env } from './common.js';
import { distributorAddresses } from '../../src/config/distributors.js';
import { VIBE_TOKEN, VIBE_CLUB_NFT } from '../../src/data/snapshot/constants.js';

const CHECK_IN = '0x1938ba215ef556e51ee6aaf909e0970ae0167634';
const ACHIEVEMENTS = '0x1336e381768c98c8a6e79d99ec065684c41925a5';
const STAKING = '0x6f25a9e1e677616c1bf7ab54b470b0c82839adb4';
const USDC = '0x833589fcd6edb6e08f4c7c32d4f71b54bda02913';
const WETH = '0x4200000000000000000000000000000000000006';
const ZERO = '0x0000000000000000000000000000000000000000';
// DEX routers a swap goes through (KyberSwap, Uniswap Universal Router v4 / v2)
const ROUTERS = ['0x6131b5fae19ea4f9d964eac0408e4408b66337b5', '0x6ff5693b99212da76ad316178a184ab56d299b43', '0x3fc91a3afd70395cd496c647d5a6cc9d4b2b7fad'];
const KNOWN_IN = [VIBE_TOKEN.toLowerCase(), USDC, WETH, VIBE_CLUB_NFT.toLowerCase(), ACHIEVEMENTS];
const CHECKED_IN = encodeEventTopics({ abi: parseAbi(['event CheckedIn(address indexed user, uint256 currentStreak, uint256 totalCheckIns, uint256 timestamp)']), eventName: 'CheckedIn' })[0];

const lower = (a) => String(a || '').toLowerCase();

async function alchemy(key, method, params) {
  const res = await fetch(`https://base-mainnet.g.alchemy.com/v2/${key}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ jsonrpc: '2.0', id: 1, method, params }),
  }).then((r) => r.json());
  if (res.error) throw new Error(`Alchemy: ${res.error.message}`);
  return res.result;
}

const transfers = (key, dir, address, limit) => alchemy(key, 'alchemy_getAssetTransfers', [{
  fromBlock: '0x0',
  toBlock: 'latest',
  [dir === 'out' ? 'fromAddress' : 'toAddress']: address,
  category: ['external', 'erc20', 'erc721', 'erc1155'],
  withMetadata: true,
  excludeZeroValue: false,
  order: 'desc',
  maxCount: `0x${limit.toString(16)}`,
}]).then((r) => r?.transfers || []);

// Check-ins of the wallet. Older RPC plans limit log ranges, so a failure only drops the check-ins.
async function checkIns(key, address) {
  try {
    const logs = await alchemy(key, 'eth_getLogs', [{ address: CHECK_IN, fromBlock: '0x0', toBlock: 'latest', topics: [CHECKED_IN, pad(address)] }]);
    return (logs || []).map((l) => ({ hash: l.transactionHash, block: Number(l.blockNumber), streak: Number(BigInt(`0x${l.data.slice(2, 66)}`)), time: Number(BigInt(`0x${l.data.slice(130, 194)}`)) }));
  } catch {
    return [];
  }
}

function describe(asset, t) {
  const nft = t.category === 'erc721' || t.category === 'erc1155';
  const tokenId = nft ? Number(BigInt(t.erc721TokenId || t.erc1155Metadata?.[0]?.tokenId || '0')) : null;
  return {
    symbol: lower(t.rawContract?.address) === lower(VIBE_TOKEN) ? 'VIBE' : (asset || (nft ? 'NFT' : '?')),
    token: t.rawContract?.address || null,
    amount: nft ? 1 : Number(t.value || 0),
    tokenId,
  };
}

export async function handleActivity({ method, query = {} }) {
  if (method !== 'GET') return json(405, { error: 'Method not allowed' }, { Allow: 'GET' });
  const address = /^0x[0-9a-fA-F]{40}$/.test(query.address || '') ? lower(query.address) : null;
  if (!address) return json(400, { error: 'Pass a wallet: /api/activity?address=0x...' });
  const key = env('ALCHEMY_API_KEY');
  if (!key) return json(503, { error: 'Activity is not configured (ALCHEMY_API_KEY)' });
  const limit = Math.min(Math.max(Number(query.limit) || 100, 10), 500);

  try {
    const [outs, ins, checks] = await Promise.all([transfers(key, 'out', address, limit), transfers(key, 'in', address, limit), checkIns(key, address)]);
    const distributors = [...distributorAddresses('holder'), ...distributorAddresses('royalty')];
    const txs = new Map();
    const tx = (hash, block, time) => {
      if (!txs.has(hash)) txs.set(hash, { hash, block, time, out: [], in: [], to: null, from: null, checkIn: null });
      const e = txs.get(hash);
      if (!e.time && time) e.time = time;
      return e;
    };

    for (const t of outs) {
      const e = tx(t.hash, Number(t.blockNum), t.metadata?.blockTimestamp);
      e.out.push(describe(t.asset, t));
      e.to = e.to || lower(t.to);
    }
    for (const t of ins) {
      const contract = lower(t.rawContract?.address);
      if (t.category !== 'external' && !KNOWN_IN.includes(contract)) continue; // spam airdrops
      const e = tx(t.hash, Number(t.blockNum), t.metadata?.blockTimestamp);
      e.in.push({ ...describe(t.asset, t), contract, fromZero: lower(t.from) === ZERO });
      e.from = e.from || lower(t.from);
    }
    for (const c of checks) {
      const e = tx(c.hash, c.block, new Date(c.time * 1000).toISOString());
      e.checkIn = c;
    }

    const items = [...txs.values()].map((e) => {
      const nftIn = e.in.find((p) => p.contract === lower(VIBE_CLUB_NFT) && p.fromZero);
      const sbtIn = e.in.find((p) => p.contract === ACHIEVEMENTS);
      let type;
      let title;
      let counterparty = null;
      if (e.checkIn) { type = 'checkin'; title = `Daily check-in · day ${e.checkIn.streak}`; }
      else if (sbtIn) { type = 'achievement'; title = 'Achievement SBT'; }
      else if (nftIn) { type = 'mint'; title = `Vibe Club NFT #${nftIn.tokenId}`; }
      else if (e.in.length && distributors.includes(e.from)) { type = 'claim'; title = 'Reward claim'; }
      else if (e.in.length && e.from === STAKING) { type = 'staking'; title = 'Staking payout'; }
      else if (e.out.length && e.to === STAKING) { type = 'stake'; title = 'Stake in vault'; }
      else if ((e.out.length && e.in.length) || ROUTERS.includes(e.to)) { type = 'swap'; title = 'Swap'; }
      else if (e.out.length) { type = 'send'; title = 'Sent'; counterparty = e.to; }
      else { type = 'receive'; title = 'Received'; counterparty = e.from; }
      const parts = [
        ...e.out.filter((p) => p.amount > 0).map((p) => ({ dir: 'out', symbol: p.symbol, amount: p.amount, tokenId: p.tokenId })),
        ...e.in.filter((p) => p.amount > 0).map((p) => ({ dir: 'in', symbol: p.symbol, amount: p.amount, tokenId: p.tokenId })),
      ];
      return { hash: e.hash, time: e.time, block: e.block, type, title, counterparty, parts, link: `https://basescan.org/tx/${e.hash}` };
    });
    items.sort((a, b) => b.block - a.block);

    return json(200, { address, items: items.slice(0, limit) }, { 'Cache-Control': 'public, max-age=0, s-maxage=10' });
  } catch (e) {
    return json(500, { error: e.message || 'Server error' });
  }
}
