// Merkle proofs for every claim round: the ones bundled with the site plus the snapshots
// published from Admin → Snapshots (loaded once at startup by loadPublishedRounds).
import round1Data from './round_1_proofs.json';
import round2Data from './round_2_proofs.json';
import royalty1Data from './royalty_1_proofs.json';
import royalty2Data from './royalty_2_proofs.json';
import royalty3Data from './royalty_3_proofs.json';
import royalty4Data from './royalty_4_proofs.json';
import royalty5Data from './royalty_5_proofs.json';
import royalty6Data from './royalty_6_proofs.json';

const BUILT_IN = {
  holder: { 1: round1Data, 2: round2Data },
  royalty: { 1: royalty1Data, 2: royalty2Data, 3: royalty3Data, 4: royalty4Data, 5: royalty5Data, 6: royalty6Data },
};
const published = { holder: {}, royalty: {} };

// Checker calls royalties 'vibeclub'.
const kind = (type) => (type === 'holder' ? 'holder' : 'royalty');

export const isBuiltInRound = (type, round) => Boolean(BUILT_IN[kind(type)][Number(round)]);

// { merkleRoot, claims: { [lowercase address]: { amount, amountWei, proof, ... } } } or null
export function roundProofs(type, round) {
  const t = kind(type);
  return BUILT_IN[t][Number(round)] || published[t][Number(round)] || null;
}

export function userClaim(type, round, address) {
  return (address && roundProofs(type, round)?.claims?.[address.toLowerCase()]) || null;
}

// Rounds that come from the admin panel rather than bundled files.
export function publishedRounds() {
  return Object.entries(published).flatMap(([type, rounds]) => Object.entries(rounds).map(([round, data]) => ({ type, round: Number(round), data })));
}

// Fetches snapshots that are new or were republished since the last call; the rest stay as loaded.
export async function loadPublishedRounds() {
  try {
    const index = await fetch('/api/snapshots').then((r) => (r.ok ? r.json() : null));
    const wanted = (index?.snapshots || []).filter((s) => !isBuiltInRound(s.type, s.round) && published[kind(s.type)][s.round]?.publishedAt !== s.publishedAt);
    await Promise.all(
      wanted.map(async (s) => {
        const snap = await fetch(`/api/snapshots?type=${s.type}&round=${s.round}`).then((r) => (r.ok ? r.json() : null));
        if (snap?.claims && snap.merkleRoot) published[kind(s.type)][s.round] = snap;
      })
    );
  } catch (e) {
    console.warn('Could not load published reward snapshots:', e);
  }
}

// Keeps open pages up to date when a snapshot is published while they are open.
export function watchPublishedRounds(intervalMs = 60000) {
  setInterval(loadPublishedRounds, intervalMs);
}
