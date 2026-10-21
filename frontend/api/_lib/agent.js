// Core of the public agent API (no login, read-only), shared by the Vercel functions and the Vite dev server.
//
// GET /api/claims?address=0x...  every reward round the wallet has an allocation in: amount, proof, contract,
//                                claim window, status and a ready transaction to send.
// GET /api/status?address=0x...  wallet overview: $VIBE, Vibe Club NFTs, daily check-in, achievements, mint,
//                                with ready transactions for the actions available right now.
//
// Rounds, windows and contracts come from the same modules the site uses, so an agent sees what the site shows.

import { createRequire } from 'node:module';
import { encodeFunctionData, formatEther, getAddress, isAddress, parseAbi } from 'viem';
import { json, store } from './common.js';
import { publicClient } from '../../src/config/rpc.js';
import { DEFAULT_SCHEDULE, applySchedule } from '../../src/data/rewardsSchedule.js';
import * as schedule from '../../src/data/rewardsSchedule.js';
import { validateSchedule } from '../../src/data/scheduleSchema.js';
import { distributorFor, V2_ABI } from '../../src/config/distributors.js';
import { VIBE_TOKEN, VIBE_CLUB_NFT } from '../../src/data/snapshot/constants.js';
import { findOwnedVibeClubNfts } from '../../src/data/vibeClubNft.js';

const require = createRequire(import.meta.url);
// Rounds shipped with the site (their snapshots are not in the store).
const BUILT_IN = {
  holder: { 1: require('../../src/data/round_1_proofs.json'), 2: require('../../src/data/round_2_proofs.json') },
  royalty: {
    1: require('../../src/data/royalty_1_proofs.json'),
    2: require('../../src/data/royalty_2_proofs.json'),
    3: require('../../src/data/royalty_3_proofs.json'),
    4: require('../../src/data/royalty_4_proofs.json'),
    5: require('../../src/data/royalty_5_proofs.json'),
  },
};

const CHECK_IN = '0x1938BA215ef556e51eE6AaF909e0970AE0167634';
const ACHIEVEMENTS = '0x1336E381768c98c8A6e79d99Ec065684c41925A5';
const CLOSED_ROOT = `0x${'0'.repeat(63)}1`; // what the admin sets to close an old v1 royalty round
const ZERO_ROOT = `0x${'0'.repeat(64)}`;

const V1_ABI = {
  holder: parseAbi([
    'function epochMerkleRoot(uint256) view returns (bytes32)',
    'function hasClaimed(uint256, address) view returns (bool)',
    'function claim(uint256 epochId, uint256 amount, bytes32[] merkleProof)',
  ]),
  royalty: parseAbi([
    'function merkleRoots(uint256) view returns (bytes32)',
    'function hasClaimed(uint256, address) view returns (bool)',
    'function claim(uint256 epochId, uint256 amount, bytes32[] merkleProof)',
  ]),
};
const ERC20 = parseAbi(['function balanceOf(address) view returns (uint256)']);
const NFT = parseAbi([
  'function balanceOf(address) view returns (uint256)',
  'function walletMintCount(address) view returns (uint256)',
  'function mintLive() view returns (bool)',
  'function getCurrentEthPrice() view returns (uint256)',
  'function totalMintedCount() view returns (uint256)',
]);
const CHECK_IN_ABI = parseAbi([
  'function getCheckInInfo(address) view returns (uint256 currentStreak, uint256 longestStreak, uint256 totalCheckIns, uint256 lastCheckInTimestamp, bool canCheckInToday, uint256 secondsUntilNextCheckIn)',
  'function checkIn()',
]);
const ACH_ABI = parseAbi([
  'function statusOf(address) view returns (uint256[] ids, bool[] claimed, bool[] claimable)',
  'function progressOf(address) view returns (uint256 longestStreak, uint256 vaultsJoined, uint256 largestStake)',
  'function getAchievement(uint256) view returns ((uint8 kind, bool active, uint256 threshold, uint256 totalClaimed, string name, string uri))',
  'function claimAllFor(address account) returns (uint256)',
]);

const iso = (s) => new Date(s).toISOString();

function readAddress(query) {
  const raw = String(query.address || '');
  return isAddress(raw) ? getAddress(raw) : null;
}

// Published schedule (admin) over the built-in one, exactly as the site applies it.
async function loadSchedule(db) {
  try {
    const record = await db.get('vibe:schedule');
    if (record?.schedule) {
      applySchedule(validateSchedule(record.schedule));
      return;
    }
  } catch {}
  applySchedule(DEFAULT_SCHEDULE);
}

async function proofsFor(db, type, round) {
  if (BUILT_IN[type][round]) return BUILT_IN[type][round];
  try {
    return await db.get(`vibe:snapshot:${type}:${round}`);
  } catch {
    return null;
  }
}

// ─────────────────────────────── /api/claims ───────────────────────────────

export async function handleClaims({ method, query = {} }) {
  if (method !== 'GET') return json(405, { error: 'Method not allowed' }, { Allow: 'GET' });
  const account = readAddress(query);
  if (!account) return json(400, { error: 'Pass a wallet: /api/claims?address=0x...' });

  try {
    const db = await store();
    await loadSchedule(db);
    const now = Date.now();
    const lower = account.toLowerCase();

    // every round whose snapshot has happened and where the wallet has an allocation
    const found = [];
    for (const [type, rounds] of [['holder', schedule.HOLDER_ROUNDS], ['royalty', schedule.VIBECLUB_ROUNDS]]) {
      for (const r of rounds) {
        if (now < new Date(r.snapshotIso).getTime()) continue;
        const proofs = await proofsFor(db, type, r.id);
        const claim = proofs?.claims?.[lower];
        const contract = distributorFor(type, r.id);
        if (claim && contract) found.push({ type, r, claim, contract });
      }
    }

    // onchain state of those rounds in one multicall: hasClaimed + root (v1) / round (v2)
    const calls = found.flatMap(({ type, r, contract }) => contract.version === 2
      ? [
          { address: contract.address, abi: V2_ABI, functionName: 'hasClaimed', args: [BigInt(r.id), account] },
          { address: contract.address, abi: V2_ABI, functionName: 'getRound', args: [BigInt(r.id)] },
        ]
      : [
          { address: contract.address, abi: V1_ABI[type], functionName: 'hasClaimed', args: [BigInt(r.id), account] },
          { address: contract.address, abi: V1_ABI[type], functionName: type === 'holder' ? 'epochMerkleRoot' : 'merkleRoots', args: [BigInt(r.id)] },
        ]);
    const results = calls.length ? await publicClient.multicall({ contracts: calls, allowFailure: true }) : [];

    const rounds = found.map(({ type, r, claim, contract }, i) => {
      const claimedRes = results[i * 2];
      const rootRes = results[i * 2 + 1];
      const claimed = claimedRes?.status === 'success' ? claimedRes.result === true : null;
      const onchainRoot = rootRes?.status === 'success' ? (contract.version === 2 ? rootRes.result.merkleRoot : rootRes.result) : null;
      // v2 stores the window with the round; v1 windows follow the schedule (old holder deadlines already applied)
      const claimStart = contract.version === 2 && onchainRoot && onchainRoot !== ZERO_ROOT ? Number(rootRes.result.claimStart) * 1000 : new Date(r.targetDate).getTime();
      const claimEnd = contract.version === 2 && onchainRoot && onchainRoot !== ZERO_ROOT ? Number(rootRes.result.claimEnd) * 1000 : new Date(r.nextSnapshotDate).getTime();

      let status;
      if (claimed) status = 'claimed';
      else if (now >= claimEnd || onchainRoot?.toLowerCase() === CLOSED_ROOT) status = 'expired';
      else if (!onchainRoot || onchainRoot === ZERO_ROOT) status = 'not_opened'; // snapshot done, the admin has not published it onchain yet
      else if (now < claimStart) status = 'upcoming';
      else status = 'open';

      const amountWei = String(claim.amountWei);
      const proof = claim.proof;
      // v2: anyone (an agent) can send claimFor and the tokens go to the wallet; v1: the wallet itself must send claim
      const tx = status !== 'open' ? null : contract.version === 2
        ? { to: contract.address, data: encodeFunctionData({ abi: V2_ABI, functionName: 'claimFor', args: [account, BigInt(r.id), BigInt(amountWei), proof] }), value: '0', sender: 'any' }
        : { to: contract.address, data: encodeFunctionData({ abi: V1_ABI[type], functionName: 'claim', args: [BigInt(r.id), BigInt(amountWei), proof] }), value: '0', sender: account };

      return {
        type,
        round: r.id,
        name: type === 'holder' ? `Unlock ${r.id}` : `Royalty ${r.id}`,
        status,
        amount: Number(claim.amount),
        amountWei,
        proof,
        contract: contract.address,
        contractVersion: contract.version,
        claimStart: iso(claimStart),
        claimEnd: iso(claimEnd),
        tx,
      };
    });

    return json(200, {
      address: account,
      rounds,
      claimableNow: rounds.filter((r) => r.status === 'open').length,
      notes: {
        statuses: 'open = claim now; not_opened = snapshot done, waiting for the round to be published onchain; upcoming = claim opens at claimStart; claimed; expired = window closed, cannot be claimed.',
        tx: 'Send tx.to / tx.data / tx.value on Base (chain 8453). sender "any" means any wallet may send it (the tokens still go to this address); otherwise only that wallet can.',
      },
    }, { 'Cache-Control': 'public, max-age=0, s-maxage=15, stale-while-revalidate=60' });
  } catch (e) {
    return json(500, { error: e.message || 'Server error' });
  }
}

// ─────────────────────────────── /api/agent ───────────────────────────────

/** Entry point for agents: what they can do, where, and how transactions are returned. */
export async function handleAgentIndex({ method }) {
  if (method !== 'GET') return json(405, { error: 'Method not allowed' }, { Allow: 'GET' });
  return json(200, {
    name: 'Vibe Hub agent API',
    chain: { name: 'Base', chainId: 8453 },
    howItWorks: 'Read-only, no login. Endpoints return state plus ready transactions { to, data, value, sender } that the agent signs and sends from its own wallet on Base. sender "any" means any wallet may send it (the result still goes to the address in the request).',
    endpoints: {
      'GET /api/status?address=': 'Wallet overview: $VIBE balance, Vibe Club NFTs, daily check-in (with checkIn tx), achievements with progress (with claimAllFor tx), current staking epoch.',
      'GET /api/claims?address=': 'Holder rewards and Vibe Club royalties: every round with an allocation, its claim window, status and claim tx.',
      'GET /api/staking?address=[&deposit=amount]': 'o1 staking vaults: stake, lots, claimable rewards (claim tx), unlocked lots (withdraw tx), and approve + deposit txs into the open vault.',
      'GET /api/swap?address=&side=buy|sell&amount=[&slippage=1]': 'Swap ETH <-> $VIBE through KyberSwap: quote and ready txs (approve first when selling).',
    },
    rules: {
      rewards: 'Snapshot at 00:00 UTC on the round day, claim opens at 14:00 UTC, closes at 00:00 UTC on the next snapshot day. Expired rounds cannot be claimed.',
      achievements: 'Soulbound; the contract checks streak (check-in), staking vaults joined and current stake itself.',
      checkIn: 'Once per UTC day; the streak continues when the previous check-in was the day before.',
    },
    contracts: {
      vibeToken: VIBE_TOKEN,
      vibeClubNft: VIBE_CLUB_NFT,
      dailyCheckIn: CHECK_IN,
      achievements: ACHIEVEMENTS,
      staking: '0x6f25a9e1e677616c1bF7ab54b470b0c82839Adb4',
      holderRewards: { v1: distributorFor('holder', 1)?.address, v2: distributorFor('holder', 99)?.address },
      royalties: { v1: distributorFor('royalty', 1)?.address, v2: distributorFor('royalty', 99)?.address },
    },
  }, { 'Cache-Control': 'public, max-age=300' });
}

// ─────────────────────────────── /api/staking ───────────────────────────────

const STAKING = '0x6f25a9e1e677616c1bF7ab54b470b0c82839Adb4';
const STAKING_ABI = parseAbi([
  'function getVault(bytes32 vaultId) view returns (((address stakingToken, address rewardCurrency, uint64 startTime, uint64 epochDuration, uint64 epochCount, uint192 rewardPerEpoch, uint8 earlyExitMode, uint16 penaltyBps) config, address creator, uint64 endTime, uint192 totalStaked, uint256 rewardRemaining) vault, uint64 depositOpenTime)',
  'function getUserState(bytes32 vaultId, address user) view returns (uint64 nextLotId, uint192 totalStaked, uint16 penaltyRemainder)',
  'function getUserLots(bytes32 vaultId, address user, uint64 cursor, uint64 limit) view returns ((uint192 remainingAmount, uint64 eligibleAt, uint64 unlockAt)[] lots, uint64 nextCursor, uint64 totalLots)',
  'function isClaimed(bytes32 vaultId, address user, uint64 epoch) view returns (bool)',
  'function previewClaim(bytes32 vaultId, address user, uint64[] epochs) view returns (uint256)',
  'function deposit(bytes32 vaultId, uint256 amount)',
  'function claim(bytes32 vaultId, uint64[] epochs, address to)',
  'function withdrawLots(bytes32 vaultId, uint64[] lotIds, uint256[] amounts, address to)',
]);
const ERC20_RW = parseAbi([
  'function balanceOf(address) view returns (uint256)',
  'function allowance(address owner, address spender) view returns (uint256)',
  'function approve(address spender, uint256 amount) returns (bool)',
]);

const parseAmount = (raw) => {
  const s = String(raw ?? '').trim();
  if (!/^\d+(\.\d{1,18})?$/.test(s) || Number(s) <= 0) return null;
  const [int, frac = ''] = s.split('.');
  return BigInt(int) * 10n ** 18n + BigInt((frac + '0'.repeat(18)).slice(0, 18));
};

export async function handleStaking({ method, query = {} }) {
  if (method !== 'GET') return json(405, { error: 'Method not allowed' }, { Allow: 'GET' });
  const account = readAddress(query);
  if (!account) return json(400, { error: 'Pass a wallet: /api/staking?address=0x...[&deposit=amount]' });
  const depositWei = query.deposit !== undefined ? parseAmount(query.deposit) : null;
  if (query.deposit !== undefined && !depositWei) return json(400, { error: 'deposit must be a positive $VIBE amount, e.g. deposit=1000000' });

  try {
    const db = await store();
    await loadSchedule(db);
    const epochs = schedule.SCHEDULE.staking.filter((e) => /^0x[0-9a-fA-F]{64}$/.test(e.vaultId || ''));
    const reads = await publicClient.multicall({
      allowFailure: true,
      contracts: epochs.flatMap((e) => [
        { address: STAKING, abi: STAKING_ABI, functionName: 'getVault', args: [e.vaultId] },
        { address: STAKING, abi: STAKING_ABI, functionName: 'getUserState', args: [e.vaultId, account] },
        { address: STAKING, abi: STAKING_ABI, functionName: 'getUserLots', args: [e.vaultId, account, 0n, 50n] },
      ]),
    });

    const nowSec = BigInt(Math.floor(Date.now() / 1000));
    const vaults = [];
    for (let i = 0; i < epochs.length; i++) {
      const e = epochs[i];
      const v = reads[i * 3]?.status === 'success' ? reads[i * 3].result : null;
      if (!v) continue;
      const [vault, depositOpenTime] = v;
      const stateRes = reads[i * 3 + 1]?.status === 'success' ? reads[i * 3 + 1].result : null; // [nextLotId, totalStaked, penaltyRemainder]
      const state = stateRes && { nextLotId: stateRes[0], totalStaked: stateRes[1] };
      const lotsRes = reads[i * 3 + 2]?.status === 'success' ? reads[i * 3 + 2].result : null;
      const lots = (lotsRes?.[0] || []).map((l, lotId) => ({
        lotId,
        amount: Number(formatEther(l.remainingAmount)),
        unlockAt: new Date(Number(l.unlockAt) * 1000).toISOString(),
        withdrawable: l.remainingAmount > 0n && BigInt(l.unlockAt) <= nowSec,
      }));

      // finished vault epochs (index 0..epochCount-1) the wallet has not claimed yet
      const epochCount = Number(vault.config.epochCount);
      const ended = [];
      for (let k = 0; k < epochCount; k++) {
        if (BigInt(vault.config.startTime) + BigInt(vault.config.epochDuration) * BigInt(k + 1) <= nowSec) ended.push(BigInt(k));
      }
      let claimableEpochs = [];
      let reward = 0n;
      if (ended.length && state && state.nextLotId > 0n) {
        const claimed = await publicClient.multicall({ allowFailure: true, contracts: ended.map((k) => ({ address: STAKING, abi: STAKING_ABI, functionName: 'isClaimed', args: [e.vaultId, account, k] })) });
        claimableEpochs = ended.filter((_, j) => claimed[j]?.status === 'success' && claimed[j].result === false);
        if (claimableEpochs.length) {
          reward = await publicClient.readContract({ address: STAKING, abi: STAKING_ABI, functionName: 'previewClaim', args: [e.vaultId, account, claimableEpochs] }).catch(() => 0n);
        }
      }

      const start = BigInt(vault.config.startTime);
      const end = BigInt(vault.endTime);
      const phase = nowSec < BigInt(depositOpenTime) ? 'upcoming' : nowSec < start ? 'deposits_open' : nowSec < end ? 'active' : 'ended';
      const withdrawable = lots.filter((l) => l.withdrawable);

      vaults.push({
        epoch: e.epoch,
        vaultId: e.vaultId,
        link: schedule.STAKING_EPOCHS.find((s) => s.epoch === `Epoch ${e.epoch}`)?.link || null,
        phase,
        depositOpen: new Date(Number(depositOpenTime) * 1000).toISOString(),
        start: new Date(Number(start) * 1000).toISOString(),
        end: new Date(Number(end) * 1000).toISOString(),
        rewardPool: Number(formatEther(vault.config.rewardPerEpoch * BigInt(epochCount))),
        totalStaked: Number(formatEther(vault.totalStaked)),
        yourStake: state ? Number(formatEther(state.totalStaked)) : null,
        everDeposited: state ? state.nextLotId > 0n : null,
        lots,
        claimableReward: Number(formatEther(reward)),
        txs: {
          claimReward: reward > 0n
            ? { to: STAKING, data: encodeFunctionData({ abi: STAKING_ABI, functionName: 'claim', args: [e.vaultId, claimableEpochs, account] }), value: '0', sender: account }
            : null,
          withdrawUnlocked: withdrawable.length
            ? { to: STAKING, data: encodeFunctionData({ abi: STAKING_ABI, functionName: 'withdrawLots', args: [e.vaultId, withdrawable.map((l) => BigInt(l.lotId)), withdrawable.map((l) => lotsRes[0][l.lotId].remainingAmount), account] }), value: '0', sender: account }
            : null,
        },
      });
    }

    // deposit into the vault that currently accepts deposits (approve first when the allowance is short)
    let deposit = null;
    if (depositWei) {
      const target = vaults.find((v) => v.phase === 'deposits_open') || vaults.find((v) => v.phase === 'active');
      if (!target) {
        deposit = { error: 'No vault accepts deposits right now' };
      } else {
        const [balance, allowance] = await Promise.all([
          publicClient.readContract({ address: VIBE_TOKEN, abi: ERC20_RW, functionName: 'balanceOf', args: [account] }),
          publicClient.readContract({ address: VIBE_TOKEN, abi: ERC20_RW, functionName: 'allowance', args: [account, STAKING] }),
        ]);
        deposit = {
          epoch: target.epoch,
          vaultId: target.vaultId,
          amount: Number(formatEther(depositWei)),
          enoughBalance: balance >= depositWei,
          txs: [
            ...(allowance < depositWei ? [{ to: VIBE_TOKEN, data: encodeFunctionData({ abi: ERC20_RW, functionName: 'approve', args: [STAKING, depositWei] }), value: '0', sender: account }] : []),
            { to: STAKING, data: encodeFunctionData({ abi: STAKING_ABI, functionName: 'deposit', args: [target.vaultId, depositWei] }), value: '0', sender: account },
          ],
        };
      }
    }

    return json(200, {
      address: account,
      stakingContract: STAKING,
      vaults,
      deposit,
      notes: 'Staking runs on o1 Exchange. Send the txs in order from this wallet on Base (8453). A deposit counts from the next epoch; lots unlock at unlockAt.',
    }, { 'Cache-Control': 'public, max-age=0, s-maxage=15, stale-while-revalidate=60' });
  } catch (e) {
    return json(500, { error: e.message || 'Server error' });
  }
}

// ─────────────────────────────── /api/swap ───────────────────────────────

const KYBER = 'https://aggregator-api.kyberswap.com/base/api/v1';
const KYBER_ETH = '0xEeeeeEeeeEeEeeEeEeEeeEEEeeeeEeeeeeeeEEeE';

export async function handleSwap({ method, query = {} }) {
  if (method !== 'GET') return json(405, { error: 'Method not allowed' }, { Allow: 'GET' });
  const account = readAddress(query);
  const side = String(query.side || '');
  const amountWei = parseAmount(query.amount);
  const slippage = query.slippage !== undefined ? Number(query.slippage) : 1;
  if (!account || !['buy', 'sell'].includes(side) || !amountWei || !(slippage > 0 && slippage <= 50)) {
    return json(400, { error: 'Use /api/swap?address=0x...&side=buy|sell&amount=<ETH to spend when buying, $VIBE to sell>[&slippage=1]' });
  }

  try {
    const tokenIn = side === 'buy' ? KYBER_ETH : VIBE_TOKEN;
    const tokenOut = side === 'buy' ? VIBE_TOKEN : KYBER_ETH;
    const headers = { 'x-client-id': 'vibehub' };
    const route = await fetch(`${KYBER}/routes?tokenIn=${tokenIn}&tokenOut=${tokenOut}&amountIn=${amountWei}`, { headers }).then((r) => r.json());
    if (route?.code !== 0 || !route.data?.routeSummary) return json(502, { error: `No swap route: ${route?.message || 'KyberSwap did not answer'}` });
    const built = await fetch(`${KYBER}/route/build`, {
      method: 'POST',
      headers: { ...headers, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        routeSummary: route.data.routeSummary,
        sender: account,
        recipient: account,
        slippageTolerance: Math.round(slippage * 100),
        deadline: Math.floor(Date.now() / 1000) + 20 * 60,
      }),
    }).then((r) => r.json());
    if (built?.code !== 0 || !built.data?.data) return json(502, { error: `Could not build the swap: ${built?.message || 'KyberSwap did not answer'}` });

    const router = built.data.routerAddress || route.data.routerAddress;
    const txs = [];
    if (side === 'sell') {
      const allowance = await publicClient.readContract({ address: VIBE_TOKEN, abi: ERC20_RW, functionName: 'allowance', args: [account, router] });
      if (allowance < amountWei) txs.push({ to: VIBE_TOKEN, data: encodeFunctionData({ abi: ERC20_RW, functionName: 'approve', args: [router, amountWei] }), value: '0', sender: account });
    }
    txs.push({ to: router, data: built.data.data, value: side === 'buy' ? amountWei.toString() : '0', sender: account });

    const out = BigInt(built.data.amountOut || route.data.routeSummary.amountOut);
    const minOut = out - (out * BigInt(Math.round(slippage * 100))) / 10000n;
    return json(200, {
      address: account,
      side,
      amountIn: Number(formatEther(amountWei)),
      tokenIn: side === 'buy' ? 'ETH' : '$VIBE',
      expectedOut: Number(formatEther(out)),
      minimumOut: Number(formatEther(minOut)),
      tokenOut: side === 'buy' ? '$VIBE' : 'ETH',
      slippagePercent: slippage,
      router,
      txs,
      notes: 'Send the txs in order from this wallet on Base (8453). The quote is valid for about 20 minutes; request a new one after that.',
    }, { 'Cache-Control': 'no-store' });
  } catch (e) {
    return json(500, { error: e.message || 'Server error' });
  }
}

// ─────────────────────────────── /api/status ───────────────────────────────

export async function handleStatus({ method, query = {} }) {
  if (method !== 'GET') return json(405, { error: 'Method not allowed' }, { Allow: 'GET' });
  const account = readAddress(query);
  if (!account) return json(400, { error: 'Pass a wallet: /api/status?address=0x...' });

  try {
    const db = await store();
    await loadSchedule(db);
    const r = await publicClient.multicall({
      allowFailure: true,
      contracts: [
        { address: VIBE_TOKEN, abi: ERC20, functionName: 'balanceOf', args: [account] },
        { address: VIBE_CLUB_NFT, abi: NFT, functionName: 'balanceOf', args: [account] },
        { address: VIBE_CLUB_NFT, abi: NFT, functionName: 'walletMintCount', args: [account] },
        { address: VIBE_CLUB_NFT, abi: NFT, functionName: 'mintLive' },
        { address: VIBE_CLUB_NFT, abi: NFT, functionName: 'getCurrentEthPrice' },
        { address: VIBE_CLUB_NFT, abi: NFT, functionName: 'totalMintedCount' },
        { address: CHECK_IN, abi: CHECK_IN_ABI, functionName: 'getCheckInInfo', args: [account] },
        { address: ACHIEVEMENTS, abi: ACH_ABI, functionName: 'statusOf', args: [account] },
        { address: ACHIEVEMENTS, abi: ACH_ABI, functionName: 'progressOf', args: [account] },
      ],
    });
    const ok = (i) => (r[i]?.status === 'success' ? r[i].result : null);

    // achievement names/conditions
    const status = ok(7);
    const ids = status ? status[0] : [];
    const defs = ids.length
      ? await publicClient.multicall({ allowFailure: true, contracts: ids.map((id) => ({ address: ACHIEVEMENTS, abi: ACH_ABI, functionName: 'getAchievement', args: [id] })) })
      : [];
    const KINDS = ['none', 'streak', 'vaults_joined', 'stake_in_vault', 'manual'];
    const achievements = ids.map((id, i) => {
      const d = defs[i]?.status === 'success' ? defs[i].result : null;
      const kind = d ? KINDS[d.kind] : null;
      return {
        id: Number(id),
        name: d?.name || null,
        condition: kind,
        threshold: d ? (kind === 'stake_in_vault' ? Number(formatEther(d.threshold)) : Number(d.threshold)) : null,
        claimed: Boolean(status[1][i]),
        claimable: Boolean(status[2][i]),
      };
    });
    const progress = ok(8);
    const checkIn = ok(6);
    const owned = await findOwnedVibeClubNfts(publicClient, account).catch(() => null);

    const now = Date.now();
    const stakingEpoch = schedule.STAKING_EPOCHS.find((e) => now >= e.startDateObj && now < e.endDateObj) || null;

    return json(200, {
      address: account,
      vibeBalance: ok(0) !== null ? Number(formatEther(ok(0))) : null,
      vibeClub: {
        nftCount: ok(1) !== null ? Number(ok(1)) : null,
        tokenIds: owned,
        mintedByThisWallet: ok(2) !== null ? Number(ok(2)) : null,
        mint: {
          live: ok(3),
          priceEth: ok(4) !== null ? formatEther(ok(4)) : null,
          minted: ok(5) !== null ? Number(ok(5)) : null,
          maxSupply: 333,
          contract: VIBE_CLUB_NFT,
          note: 'One mint per wallet. Mint with ETH (mintWithETHAndSwap with a KyberSwap route to $VIBE, or mintWithETH) or with $VIBE (approve, then mintWithVIBE(amount)).',
        },
      },
      checkIn: checkIn && {
        currentStreak: Number(checkIn[0]),
        longestStreak: Number(checkIn[1]),
        totalCheckIns: Number(checkIn[2]),
        lastCheckIn: checkIn[3] > 0n ? new Date(Number(checkIn[3]) * 1000).toISOString() : null,
        canCheckInToday: checkIn[4],
        secondsUntilNext: Number(checkIn[5]),
        contract: CHECK_IN,
        tx: checkIn[4] ? { to: CHECK_IN, data: encodeFunctionData({ abi: CHECK_IN_ABI, functionName: 'checkIn' }), value: '0', sender: account } : null,
      },
      achievements: {
        contract: ACHIEVEMENTS,
        progress: progress && {
          longestStreak: Number(progress[0]),
          vaultsJoined: Number(progress[1]),
          largestStake: Number(formatEther(progress[2])),
        },
        items: achievements,
        // claims every earned one in one transaction; anyone may send it, badges go to this wallet
        tx: achievements.some((a) => a.claimable)
          ? { to: ACHIEVEMENTS, data: encodeFunctionData({ abi: ACH_ABI, functionName: 'claimAllFor', args: [account] }), value: '0', sender: 'any' }
          : null,
      },
      staking: {
        currentEpoch: stakingEpoch && {
          epoch: stakingEpoch.epoch,
          pool: stakingEpoch.poolAmount,
          ends: stakingEpoch.endDateObj.toISOString(),
          vault: stakingEpoch.link,
        },
        note: 'Staking happens on o1 Exchange (vault link above).',
      },
      rewards: 'See /api/claims?address= for reward rounds with proofs and ready transactions.',
    }, { 'Cache-Control': 'public, max-age=0, s-maxage=15, stale-while-revalidate=60' });
  } catch (e) {
    return json(500, { error: e.message || 'Server error' });
  }
}
