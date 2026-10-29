import { parseAbi } from 'viem';

// VibeAchievementsV2 (contracts/src): soulbound, every condition checked by the contract itself.
// The first achievements contract (0x10667fF580e6fc2edfFC35991fACb05C2681E757) is no longer used.
export const VIBE_ACHIEVEMENTS_CONTRACT_ADDRESS =
  import.meta.env?.VITE_ACHIEVEMENTS_CONTRACT_ADDRESS ||
  '0x1336E381768c98c8A6e79d99Ec065684c41925A5';

export const ACHIEVEMENTS_ABI = parseAbi([
  'function claim(uint256 id)',
  'function claimFor(address account, uint256 id)',
  'function claimAllFor(address account) returns (uint256)',
  'function hasClaimed(address account, uint256 id) view returns (bool)',
  'function isClaimable(address account, uint256 id) view returns (bool)',
  'function statusOf(address account) view returns (uint256[] ids, bool[] claimed, bool[] claimable)',
  'function progressOf(address account) view returns (uint256 longestStreak, uint256 vaultsJoined, uint256 largestStake)',
  'function balanceOf(address account, uint256 id) view returns (uint256)',
  'event AchievementClaimed(address indexed account, uint256 indexed id, address indexed caller, bool granted)'
]);

// Mapping string achievement ID to onchain uint256 ID
export const ACHIEVEMENT_ID_MAP = {
  'starter-dog': 1,
  'loyal-dog': 2,
  'ultra-active-dog': 3,
  'novice-staker': 4,
  'confident-banker': 5,
  'wolf-of-wall-street': 6,
  'rich-dog': 7,
  'bank-founder': 8
};

// Numeric ID to string key
export const ACHIEVEMENT_NUMERIC_MAP = {
  1: 'starter-dog',
  2: 'loyal-dog',
  3: 'ultra-active-dog',
  4: 'novice-staker',
  5: 'confident-banker',
  6: 'wolf-of-wall-street',
  7: 'rich-dog',
  8: 'bank-founder'
};
