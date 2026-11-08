// Merkle proofs for every claim round: the ones bundled with the site plus the snapshots
// published from Admin → Snapshots (loaded once at startup by loadPublishedRounds).
//
// The bundled rounds are about 0.5 MB of proofs, so they are a separate file fetched at startup next to the app
// (loadBuiltInRounds), not part of the first script. main.jsx waits for them before the first render.
const BUILT_IN_FILES = {
  holder: { 1: () => import('./round_1_proofs.json'), 2: () => import('./round_2_proofs.json') },
  royalty: {
    1: () => import('./royalty_1_proofs.json'),
    2: () => import('./royalty_2_proofs.json'),
    3: () => import('./royalty_3_proofs.json'),
    4: () => import('./royalty_4_proofs.json'),
    5: () => import('./royalty_5_proofs.json'),
    6: () => import('./royalty_6_proofs.json'),
  },
};
const BUILT_IN = { holder: {}, royalty: {} };

let builtInLoad;
/** Loads the bundled rounds once; later calls return the same promise. */
export function loadBuiltInRounds() {
  builtInLoad ||= Promise.all(
    Object.entries(BUILT_IN_FILES).flatMap(([type, rounds]) =>
      Object.entries(rounds).map(async ([round, load]) => {
        BUILT_IN[type][round] = (await load()).default;
      })
    )
  );
  return builtInLoad;
}
const published = { holder: {}, royalty: {} };

// Checker calls royalties 'vibeclub'.
const kind = (type) => (type === 'holder' ? 'holder' : 'royalty');

export const isBuiltInRound = (type, round) => Boolean(BUILT_IN_FILES[kind(type)][Number(round)]);

// { merkleRoot, claims: { [lowercase address]: { amount, amountWei, proof, ... } } } or null
export function roundProofs(type, round) {
  const t = kind(type);
  return BUILT_IN[t][Number(round)] || published[t][Number(round)] || null;
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
