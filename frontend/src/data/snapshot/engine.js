// Reward snapshots, run in the admin's browser (or Node for checks).
// Rules match scripts/makeSnapshot.cjs (holders) and scripts/makeVibeClubSnapshot.cjs (Vibe Club).
import { createPublicClient, http, fallback, parseAbi, parseUnits, formatUnits } from 'viem';
import { base } from 'viem/chains';
import { claimLeaf, buildMerkleTree } from './merkle.js';
import { VIBE_TOKEN, VIBE_CLUB_NFT, TRANSFER_TOPIC } from './constants.js';

export { VIBE_TOKEN, VIBE_CLUB_NFT };
const NFT_MAX_SUPPLY = 333;

export const HOLDER_DEFAULTS = { minBalance: 5000000, cap: 500000 };

const HOLDER_EXCLUSIONS = [
  '0xb200000000000000000000df24ecb8bf51100a01', // token itself
  '0x498581ff718922c3f8e6a244956af099b2652b2b', // Uniswap V4 PoolManager
  '0x3beea54db87a632a5faf20db6765d3af94c81b31', // vesting vault
  '0xfce13943c69b8cfe3de795dfe1a8447c8f8a99cb', // staking contract
  '0x000000000000000000000000000000000000dead',
  '0x0000000000000000000000000000000000000000',
  '0x77e04dd8c45725d2b2b3c8eebac2f3f1708fd089', // holder rewards distributor
];
const NFT_EXCLUSIONS = ['0x0000000000000000000000000000000000000000', '0x000000000000000000000000000000000000dead'];

// Free nodes that serve historical state (balances at any past block); mainnet.base.org rate-limits hardest.
const ARCHIVE_RPCS = ['https://base.drpc.org', 'https://1rpc.io/base', 'https://base-mainnet.public.blastapi.io', 'https://mainnet.base.org'];
// Etherscan-style log search on the public Base instance (~10 requests/hour without a key).
const BLOCKSCOUT_PUBLIC = 'https://base.blockscout.com/api?';

const archive = createPublicClient({
  chain: base,
  transport: fallback(ARCHIVE_RPCS.map((u) => http(u, { timeout: 20000, retryCount: 1 }))),
  batch: { multicall: false },
});

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

async function retry(fn, tries = 4) {
  let last;
  for (let i = 0; i < tries; i++) {
    try {
      return await fn();
    } catch (e) {
      last = e;
      await sleep(300 * (i + 1));
    }
  }
  throw last;
}

// Last block with timestamp <= unix seconds.
export async function blockAtTime(unix, onProgress = () => {}) {
  const latest = await retry(() => archive.getBlock({ blockTag: 'latest' }));
  if (unix >= Number(latest.timestamp)) return latest;
  let lo = 0n;
  let hi = latest.number;
  // Base produces a block every 2s: jump close first, then binary search.
  const guess = latest.number - BigInt(Math.ceil((Number(latest.timestamp) - unix) / 2));
  if (guess > 0n) {
    lo = guess - 2000n > 0n ? guess - 2000n : 0n;
    hi = guess + 2000n < latest.number ? guess + 2000n : latest.number;
    const lb = await retry(() => archive.getBlock({ blockNumber: lo }));
    const hb = await retry(() => archive.getBlock({ blockNumber: hi }));
    if (Number(lb.timestamp) > unix) lo = 0n;
    if (Number(hb.timestamp) <= unix) hi = latest.number;
  }
  onProgress(`Finding the block at ${new Date(unix * 1000).toISOString()}…`);
  while (lo < hi) {
    const mid = (lo + hi + 1n) / 2n;
    const b = await retry(() => archive.getBlock({ blockNumber: mid }));
    if (Number(b.timestamp) <= unix) lo = mid;
    else hi = mid - 1n;
  }
  return retry(() => archive.getBlock({ blockNumber: lo }));
}

class FatalFetchError extends Error {}

// Blockscout is slow and rate-limited: one request at a time, a pause between pages, retries on errors.
async function blockscoutJson(url, headers) {
  let limited = 0;
  let lastIssue = 'no response';
  for (let attempt = 0; attempt < 8; attempt++) {
    const ctrl = new AbortController();
    const timer = setTimeout(() => ctrl.abort(), 65000);
    try {
      const res = await fetch(url, { signal: ctrl.signal, headers });
      if (res.status === 503 || res.status === 401 || res.status === 403) {
        const body = await res.json().catch(() => ({}));
        throw new FatalFetchError(body.error || `Request refused (${res.status})`);
      }
      if (res.status === 429) {
        if (++limited >= 3) {
          throw new FatalFetchError('Blockscout request limit reached. Set BLOCKSCOUT_API_KEY in Vercel (free key from dev.blockscout.com) and run again.');
        }
        await sleep(5000);
        continue;
      }
      const text = await res.text();
      let data = null;
      try { data = JSON.parse(text); } catch {}
      if (res.ok && data && (data.status === '1' || data.message === 'No records found')) return data;
      lastIssue = `HTTP ${res.status}: ${(data ? JSON.stringify(data) : text).slice(0, 160)}`;
      await sleep(3000);
    } catch (e) {
      if (e instanceof FatalFetchError) throw e;
      lastIssue = e.name === 'AbortError' ? 'request timed out' : (e.message || String(e));
      await sleep(3000);
    } finally {
      clearTimeout(timer);
    }
  }
  throw new Error(`Blockscout did not return transfer logs (${lastIssue}). Please try again in a few minutes.`);
}

const LOGS_PAGE = 1000;
const LOGS_MAX_PAGES = 10; // Blockscout stops paging after 10,000 results; then we move the block window.

// Every wallet that received $VIBE up to the snapshot block. Only such wallets can hold tokens at it.
// (Blockscout's holder list is incomplete for this token, so it is not used.)
// cache = { block, receivers } from an earlier scan: only newer transfers are fetched, and a cache that
// already reaches past the snapshot is enough on its own (extra wallets are filtered by balance later).
// proxy = { url, headers }: our admin-only /api/blockscout (Blockscout PRO API with the server's key).
// Without it, the public Base instance is used directly (only ~10 log searches per hour).
async function receiversUntil(snapshotBlock, onProgress, { proxy = null, cache = null, onCache = () => {} } = {}) {
  const out = new Set(cache?.receivers || []);
  const cachedBlock = cache?.block ? BigInt(cache.block) : -1n;
  if (cachedBlock >= snapshotBlock) {
    onProgress(`Using saved transfer history: ${out.size} receiving wallets`);
    return { receivers: out, block: cachedBlock };
  }
  const pageUrl = (fromBlock, page) => {
    const q = `fromBlock=${fromBlock}&toBlock=${snapshotBlock}&page=${page}&offset=${LOGS_PAGE}`;
    return proxy
      ? `${proxy.url}?${q}`
      : `${BLOCKSCOUT_PUBLIC}module=logs&action=getLogs&address=${VIBE_TOKEN}&topic0=${TRANSFER_TOPIC}&${q}`;
  };
  let fromBlock = cachedBlock + 1n;
  let logs = 0;
  for (;;) {
    let lastBlock = fromBlock;
    let full = true;
    for (let page = 1; page <= LOGS_MAX_PAGES; page++) {
      const data = await blockscoutJson(pageUrl(fromBlock, page), proxy?.headers);
      const result = data.result || [];
      for (const l of result) {
        out.add(`0x${l.topics[2].slice(26)}`.toLowerCase());
        lastBlock = BigInt(l.blockNumber);
      }
      logs += result.length;
      // Logs come in block order, so everything before the last block seen is complete: save progress
      // so a run stopped by the rate limit continues from here next time.
      if (lastBlock > 0n) onCache({ block: (lastBlock - 1n).toString(), receivers: [...out] });
      onProgress(`Transfers up to the snapshot: ${logs.toLocaleString()} scanned, ${out.size} receiving wallets`);
      if (result.length < LOGS_PAGE) {
        full = false;
        break;
      }
      await sleep(400);
    }
    // Window exhausted the page limit: continue from the last block seen (it may repeat a few logs, harmless).
    if (!full || lastBlock <= fromBlock) break;
    fromBlock = lastBlock;
  }
  return { receivers: out, block: snapshotBlock };
}

async function multicallChunks(contracts, blockNumber, chunkSize, onChunk) {
  const results = [];
  for (let i = 0; i < contracts.length; i += chunkSize) {
    const chunk = contracts.slice(i, i + chunkSize);
    const res = await retry(() => archive.multicall({ contracts: chunk, blockNumber, allowFailure: true }), 6);
    results.push(...res);
    onChunk(Math.min(i + chunkSize, contracts.length), contracts.length);
  }
  return results;
}

// Proportional split with a per-wallet cap, redistributing what capped wallets leave (same loop as the script).
function proportionalWithCap(eligible, pool, cap) {
  let remainingPool = pool;
  let remaining = [...eligible];
  const rewards = new Map();
  while (remaining.length > 0) {
    const sum = remaining.reduce((a, h) => a + h.balance, 0);
    let capped = 0;
    const next = [];
    for (const h of remaining) {
      if ((h.balance / sum) * remainingPool >= cap) {
        rewards.set(h.address, { amount: cap, isCapped: true });
        remainingPool -= cap;
        capped++;
      } else next.push(h);
    }
    if (capped === 0) {
      const finalSum = remaining.reduce((a, h) => a + h.balance, 0);
      for (const h of remaining) {
        rewards.set(h.address, { amount: Math.min(cap, Math.round((h.balance / finalSum) * remainingPool)), isCapped: false });
      }
      break;
    }
    remaining = next;
  }
  return rewards;
}

function finalize({ type, round, pool, block, rows, rules }) {
  const elements = rows.map((r) => ({ ...r, amountWei: parseUnits(String(r.amount), 18).toString(), leaf: claimLeaf(r.address, round, parseUnits(String(r.amount), 18)) }));
  const { root, proofs } = buildMerkleTree(elements);
  const claims = {};
  elements.forEach((e, i) => {
    claims[e.address.toLowerCase()] = { ...e, proof: proofs[i] };
  });
  return {
    type,
    round,
    pool,
    rules,
    snapshotBlock: block.number.toString(),
    snapshotTime: new Date(Number(block.timestamp) * 1000).toISOString(),
    merkleRoot: root,
    totalWallets: elements.length,
    totalDistributed: elements.reduce((a, e) => a + e.amount, 0),
    claims,
  };
}

export async function runHolderSnapshot({ round, pool, at, block: blockOverride, minBalance = HOLDER_DEFAULTS.minBalance, cap = HOLDER_DEFAULTS.cap }, onProgress = () => {}, { proxy = null, cache = null, onCache = () => {} } = {}) {
  const block = blockOverride
    ? await retry(() => archive.getBlock({ blockNumber: BigInt(blockOverride) }))
    : await blockAtTime(Math.floor(new Date(at).getTime() / 1000), onProgress);
  onProgress(`Snapshot block #${block.number} (${new Date(Number(block.timestamp) * 1000).toISOString()})`);

  const scanned = await receiversUntil(block.number, onProgress, { proxy, cache, onCache });
  onCache({ block: scanned.block.toString(), receivers: [...scanned.receivers] });
  const candidates = scanned.receivers;
  const addrs = [...candidates].filter((a) => !HOLDER_EXCLUSIONS.includes(a));
  onProgress(`${addrs.length} candidate wallets, reading balances at the snapshot block…`);

  const abi = parseAbi(['function balanceOf(address) view returns (uint256)']);
  const res = await multicallChunks(
    addrs.map((a) => ({ address: VIBE_TOKEN, abi, functionName: 'balanceOf', args: [a] })),
    block.number,
    100,
    (done, total) => onProgress(`Balances: ${done} / ${total}`)
  );
  const failed = res.filter((r) => r.status !== 'success').length;
  if (failed) throw new Error(`${failed} balance reads failed, please run again`);

  const eligible = [];
  addrs.forEach((a, i) => {
    const balance = Number(formatUnits(res[i].result, 18));
    if (balance >= minBalance) eligible.push({ address: a, balance });
  });
  eligible.sort((a, b) => b.balance - a.balance);
  const rewards = proportionalWithCap(eligible, pool, cap);
  const rows = eligible.map((h) => {
    const r = rewards.get(h.address);
    return { address: h.address, balance: Math.round(h.balance), amount: r.amount, sharePercent: ((r.amount / pool) * 100).toFixed(2) + '%', isCapped: r.isCapped };
  });
  onProgress(`${rows.length} eligible wallets`);
  return finalize({ type: 'holder', round, pool, block, rows, rules: { minBalance, cap } });
}

export async function runVibeClubSnapshot({ round, pool, at, block: blockOverride }, onProgress = () => {}) {
  const block = blockOverride
    ? await retry(() => archive.getBlock({ blockNumber: BigInt(blockOverride) }))
    : await blockAtTime(Math.floor(new Date(at).getTime() / 1000), onProgress);
  onProgress(`Snapshot block #${block.number} (${new Date(Number(block.timestamp) * 1000).toISOString()})`);

  const abi = parseAbi(['function ownerOf(uint256 tokenId) view returns (address)']);
  const ids = Array.from({ length: NFT_MAX_SUPPLY }, (_, i) => i + 1);
  const res = await multicallChunks(
    ids.map((id) => ({ address: VIBE_CLUB_NFT, abi, functionName: 'ownerOf', args: [BigInt(id)] })),
    block.number,
    111,
    (done, total) => onProgress(`NFT owners: ${done} / ${total}`)
  );

  const holders = new Map();
  res.forEach((r, i) => {
    if (r.status !== 'success' || !r.result) return; // not minted yet
    const owner = r.result.toLowerCase();
    if (NFT_EXCLUSIONS.includes(owner)) return;
    if (!holders.has(owner)) holders.set(owner, []);
    holders.get(owner).push(ids[i]);
  });
  const list = [...holders.entries()].map(([address, tokenIds]) => ({ address, nftCount: tokenIds.length, tokenIds }));
  list.sort((a, b) => b.nftCount - a.nftCount || a.address.localeCompare(b.address));
  if (!list.length) throw new Error('No NFT holders at this block');

  const each = Math.floor(pool / list.length);
  const remainder = pool - each * list.length;
  const rows = list.map((h, i) => {
    const amount = i === 0 ? each + remainder : each;
    return { ...h, amount, sharePercent: ((amount / pool) * 100).toFixed(4) + '%' };
  });
  onProgress(`${rows.length} holder wallets, ${rows.reduce((a, r) => a + r.nftCount, 0)} NFTs`);
  return finalize({ type: 'royalty', round, pool, block, rows, rules: { split: 'equal per wallet' } });
}
