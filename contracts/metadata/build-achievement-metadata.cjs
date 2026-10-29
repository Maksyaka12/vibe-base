// Builds the public files VibeAchievementsV2 points to (uri(id) = https://vibeverse.dog/api/achievements/{id}.json).
// Output mirrors the site root, ready to copy into the public folder of vibeverse.dog:
//   vibeverse.dog/api/achievements/{id}.json   ERC-1155 metadata (name, description, image, attributes)
//   vibeverse.dog/achievements/{slug}.jpg      artwork (copied from frontend/public/achievements)
//   node contracts/metadata/build-achievement-metadata.cjs
const fs = require('fs');
const path = require('path');

const SITE = 'https://vibeverse.dog';
const ROOT = path.join(__dirname, 'vibeverse.dog');
const ART = path.join(__dirname, '..', '..', 'frontend', 'public', 'achievements');

const ACHIEVEMENTS = [
  { id: 1, slug: 'starter-dog', name: 'Starter Dog', file: 'STARTER DOG.jfif', category: 'Active Dog', condition: 'Longest daily check-in streak of 7 days' },
  { id: 2, slug: 'loyal-dog', name: 'Loyal Dog', file: 'LOYAL DOG.jfif', category: 'Active Dog', condition: 'Longest daily check-in streak of 14 days' },
  { id: 3, slug: 'ultra-active-dog', name: 'Ultra-Active Dog', file: 'ULTRA-ACTIVE DOG.jfif', category: 'Active Dog', condition: 'Longest daily check-in streak of 30 days' },
  { id: 4, slug: 'novice-staker', name: 'Novice Staker', file: 'NOVICE STAKER.jfif', category: 'Dog Staker', condition: 'Deposited $VIBE into 1 official staking vault' },
  { id: 5, slug: 'confident-banker', name: 'Confident Banker', file: 'CONFIDENT BANKER.jfif', category: 'Dog Staker', condition: 'Deposited $VIBE into 3 official staking vaults' },
  { id: 6, slug: 'wolf-of-wall-st', name: 'Wolf of Wall St', file: 'WOLF OF WALL ST.jfif', category: 'Dog Staker', condition: 'Deposited $VIBE into 5 official staking vaults' },
  { id: 7, slug: 'rich-dog', name: 'Rich Dog', file: 'RICH DOG.jfif', category: 'Dog Staker', condition: 'Staked at least 5,000,000 $VIBE in one official staking vault' },
  { id: 8, slug: 'bank-founder', name: 'Bank Founder', file: 'BANK FOUNDER.jfif', category: 'Dog Staker', condition: 'Staked at least 10,000,000 $VIBE in one official staking vault' },
];

fs.mkdirSync(path.join(ROOT, 'api', 'achievements'), { recursive: true });
fs.mkdirSync(path.join(ROOT, 'achievements'), { recursive: true });

for (const a of ACHIEVEMENTS) {
  fs.copyFileSync(path.join(ART, a.file), path.join(ROOT, 'achievements', `${a.slug}.jpg`));
  const metadata = {
    name: a.name,
    description: `Vibe Hub soulbound achievement. ${a.condition}. Verified onchain by the achievements contract and not transferable.`,
    image: `${SITE}/achievements/${a.slug}.jpg`,
    external_url: 'https://vibehome.dog/profile',
    attributes: [
      { trait_type: 'Category', value: a.category },
      { trait_type: 'Condition', value: a.condition },
      { trait_type: 'Soulbound', value: 'Yes' },
    ],
  };
  fs.writeFileSync(path.join(ROOT, 'api', 'achievements', `${a.id}.json`), JSON.stringify(metadata, null, 2) + '\n');
}

// Collection-level metadata for marketplaces/explorers that read contractURI-style files.
fs.writeFileSync(path.join(ROOT, 'api', 'achievements', 'contract.json'), JSON.stringify({
  name: 'Vibe Hub Achievements',
  description: 'Soulbound achievements of Vibe Hub on Base: daily check-in streaks and $VIBE staking milestones, each checked onchain.',
  image: `${SITE}/achievements/bank-founder.jpg`,
  external_link: 'https://vibehome.dog',
}, null, 2) + '\n');

console.log(`Written to ${ROOT}`);
