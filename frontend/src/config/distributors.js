// Which contract holds each reward round, and how to talk to it.
//
// v1: the first distributors. They keep Unlock 1-2 and Royalty 1-6 and stay as they are.
// v2: VibeRewardsDistributor (contracts/src). Every round from Unlock 3 / Royalty 7 is opened there with
//     its own pool and claim window, which the contract enforces. claim(round, amount, proof) and
//     hasClaimed(round, account) have the same signatures as v1, so claiming works the same way.
import { parseAbi, encodeFunctionData } from 'viem';

export const VIBE_TOKEN = '0xb200000000000000000000df24ecb8bf51100a01';

const env = (name) => (typeof import.meta !== 'undefined' && import.meta.env ? import.meta.env[name] : undefined) || '';

export const DISTRIBUTORS = {
  holder: {
    v1: '0x77e04dd8c45725d2b2b3c8eebac2f3f1708fd089',
    v2: env('VITE_HOLDER_DISTRIBUTOR_V2'), // set once deployed
    v2From: 3,
  },
  royalty: {
    v1: '0x3753EE7fa9538087f901aa5E4afc12dBA57B97c1',
    v2: env('VITE_ROYALTY_DISTRIBUTOR_V2'), // set once deployed
    v2From: 7,
  },
};

// Checker and the claim views call royalties 'vibeclub'.
const kind = (type) => (type === 'holder' ? 'holder' : 'royalty');

/** { address, version } for a round, or null when its v2 contract is not deployed yet. */
export function distributorFor(type, round) {
  const d = DISTRIBUTORS[kind(type)];
  if (Number(round) >= d.v2From) return d.v2 ? { address: d.v2, version: 2 } : null;
  return { address: d.v1, version: 1 };
}

/** Every distributor address of a type (for matching claim transfers in the history). */
export function distributorAddresses(type) {
  const d = DISTRIBUTORS[kind(type)];
  return [d.v1, d.v2].filter(Boolean).map((a) => a.toLowerCase());
}

export const V2_ABI = parseAbi([
  'function openRound(uint256 roundId, bytes32 merkleRoot, uint128 pool, uint64 claimStart, uint64 claimEnd)',
  'function updateRound(uint256 roundId, bytes32 merkleRoot, uint128 pool, uint64 claimStart, uint64 claimEnd)',
  'function withdrawExpired(uint256 roundId, address to)',
  'function emergencyWithdraw(address token, address to, uint256 amount)',
  'function getRound(uint256 roundId) view returns ((bytes32 merkleRoot, uint64 claimStart, uint64 claimEnd, uint128 pool, uint128 claimed, bool expiredWithdrawn))',
  'function claim(uint256 roundId, uint256 amount, bytes32[] proof)',
  'function claimFor(address account, uint256 roundId, uint256 amount, bytes32[] proof)',
  'function hasClaimed(uint256 roundId, address account) view returns (bool)',
]);

const V1_ROOT_ABI = {
  holder: parseAbi(['function epochMerkleRoot(uint256) view returns (bytes32)']),
  royalty: parseAbi(['function merkleRoots(uint256) view returns (bytes32)']),
};
const V1_WITHDRAW_ABI = parseAbi(['function emergencyWithdraw(address token, uint256 amount)']);

/** Multicall entry that reads a round's Merkle root (v1 per-contract getter, v2 getRound). */
export function rootCall(type, round) {
  const d = distributorFor(type, round);
  if (!d) return null;
  if (d.version === 2) return { address: d.address, abi: V2_ABI, functionName: 'getRound', args: [BigInt(round)] };
  return { address: d.address, abi: V1_ROOT_ABI[kind(type)], functionName: kind(type) === 'holder' ? 'epochMerkleRoot' : 'merkleRoots', args: [BigInt(round)] };
}

/** The root from a rootCall result. */
export function rootFromResult(version, result) {
  if (result === undefined || result === null) return null;
  return version === 2 ? result.merkleRoot : result;
}

/** Calldata that withdraws `amountWei` $VIBE from a distributor to `to` (v1 always pays its owner). */
export function withdrawCalldata(version, amountWei, to) {
  return version === 2
    ? encodeFunctionData({ abi: V2_ABI, functionName: 'emergencyWithdraw', args: [VIBE_TOKEN, to, amountWei] })
    : encodeFunctionData({ abi: V1_WITHDRAW_ABI, functionName: 'emergencyWithdraw', args: [VIBE_TOKEN, amountWei] });
}
