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
