import { parseAbi } from 'viem';

export const VIBE_ACHIEVEMENTS_CONTRACT_ADDRESS =
  import.meta.env?.VITE_ACHIEVEMENTS_CONTRACT_ADDRESS ||
  '0x10667fF580e6fc2edfFC35991fACb05C2681E757';

export const ACHIEVEMENTS_ABI = parseAbi([
  'function claimAchievement(uint256 achievementId) external',
  'function claimAchievements(uint256[] calldata achievementIds) external',
  'function hasUserClaimed(address user, uint256 achievementId) view returns (bool)',
  'function getUserAchievements(address user, uint256[] calldata ids) view returns (bool[])',
  'function getAchievement(uint256 achievementId) view returns ((uint256 id, string name, string category, string uri, bool isActive, uint256 totalClaimed))',
  'function totalAchievements() view returns (uint256)',
  'function totalGlobalClaims() view returns (uint256)',
  'function balanceOf(address account, uint256 id) view returns (uint256)',
  'function owner() view returns (address)',
  'function transferOwnership(address newOwner) external',
  'function paused() view returns (bool)',
  'event AchievementClaimed(address indexed user, uint256 indexed achievementId, uint256 timestamp)',
  'event TransferSingle(address indexed operator, address indexed from, address indexed to, uint256 id, uint256 value)',
  'event TransferBatch(address indexed operator, address indexed from, address indexed to, uint256[] ids, uint256[] values)'
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
