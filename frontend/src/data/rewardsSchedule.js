// Reward schedules shared by every theme (src/themes/*).
//
// DEFAULT_SCHEDULE is the built-in copy. The admin panel can publish an updated schedule
// (stored via /api/schedule); main.jsx loads it and calls applySchedule() before a theme
// renders. Every export below is a live binding, so themes always read the applied data.

export const O1_STAKING_VAULT = 'https://launch.o1.exchange/staking/vaults?chain=8453&token=0xb200000000000000000000df24ecb8bf51100a01';
export const stakingVaultLink = (vaultId) => `https://launch.o1.exchange/staking/vaults/${vaultId}?chain=8453`;

// Dates are ISO strings in UTC. Pools are display strings without the "$VIBE" suffix, or "TBA".
// vaultId is the o1 staking vault id (0x + 64 hex) once the vault exists, otherwise ''.
// nextSnapshot is optional; when omitted it is the next round's snapshot (or one interval later).
// Royalties may carry banner: URL of the 'claimed' image (uploaded in the admin panel).
export const DEFAULT_SCHEDULE = {
  staking: [
    { epoch: 1, start: '2026-08-21T15:00:00Z', end: '2026-08-31T15:00:00Z', pool: '2,200,000', vaultId: '0xafa3ce23e0043b651d98e5a89b55a80b71be2f4a945a745cd6e37316b5075663' },
    { epoch: 2, start: '2026-08-31T16:00:00Z', end: '2026-09-10T16:00:00Z', pool: '2,200,000', vaultId: '0x5dcabfeb83e84ad87572c531dfa8de915e0b5d8c11e4ca39598a3c6b4fc1e446' },
    { epoch: 3, start: '2026-09-10T15:00:00Z', end: '2026-09-20T15:00:00Z', pool: '2,200,000', vaultId: '0x5a0d6075197085da4e2b9a790f3be8c297d08effcfca677992489668ebcf8b0c' },
    { epoch: 4, start: '2026-09-20T15:00:00Z', end: '2026-09-30T15:00:00Z', pool: '1,800,000', vaultId: '0xdd9b4d063653fcc4d8b64d42edfe156002e863b15297d059463554182fa50dd9' },
    { epoch: 5, start: '2026-09-30T15:00:00Z', end: '2026-10-10T15:00:00Z', pool: '1,100,000', vaultId: '0x795d393bdf9582ac8678aceb6f2228118ae2456406da38a8cb35967c033c0713' },
    { epoch: 6, start: '2026-10-10T15:00:00Z', end: '2026-10-20T15:00:00Z', pool: '1,100,000', vaultId: '0x110cf0164a5244daf1e3f804d9bcc2b55b1cfbc95ff327aadf82ca3d664d2d08' },
    { epoch: 7, start: '2026-10-20T15:00:00Z', end: '2026-10-30T15:00:00Z', pool: 'TBA', vaultId: '' },
    { epoch: 8, start: '2026-10-30T15:00:00Z', end: '2026-11-09T15:00:00Z', pool: 'TBA', vaultId: '' },
    { epoch: 9, start: '2026-11-09T15:00:00Z', end: '2026-11-19T15:00:00Z', pool: 'TBA', vaultId: '' },
    { epoch: 10, start: '2026-11-19T15:00:00Z', end: '2026-11-29T15:00:00Z', pool: 'TBA', vaultId: '' },
  ],
  royalties: [
    { round: 1, snapshot: '2026-08-28T00:00:00Z', claim: '2026-08-28T14:00:00Z', pool: '2,500,000' },
    { round: 2, snapshot: '2026-09-07T00:00:00Z', claim: '2026-09-07T14:00:00Z', pool: '1,900,000' },
    { round: 3, snapshot: '2026-09-17T00:00:00Z', claim: '2026-09-17T14:00:00Z', pool: '2,000,000' },
    { round: 4, snapshot: '2026-09-27T00:00:00Z', claim: '2026-09-27T14:00:00Z', pool: '1,100,000' },
    { round: 5, snapshot: '2026-10-07T00:00:00Z', claim: '2026-10-07T14:00:00Z', pool: '800,000' },
    { round: 6, snapshot: '2026-10-17T00:00:00Z', claim: '2026-10-17T14:00:00Z', pool: 'TBA' },
    { round: 7, snapshot: '2026-10-27T00:00:00Z', claim: '2026-10-27T14:00:00Z', pool: 'TBA' },
    { round: 8, snapshot: '2026-11-06T00:00:00Z', claim: '2026-11-06T14:00:00Z', pool: 'TBA' },
    { round: 9, snapshot: '2026-11-16T00:00:00Z', claim: '2026-11-16T14:00:00Z', pool: 'TBA' },
    { round: 10, snapshot: '2026-11-26T00:00:00Z', claim: '2026-11-26T14:00:00Z', pool: 'TBA' },
  ],
  holderUnlocks: [
    { round: 1, snapshot: '2026-08-26T00:00:00Z', unlock: '2026-08-26T14:00:00Z', pool: '10,000,000' },
    { round: 2, snapshot: '2026-09-25T00:00:00Z', unlock: '2026-09-25T14:00:00Z', pool: '10,000,000' },
    { round: 3, snapshot: '2026-10-25T00:00:00Z', unlock: '2026-10-25T14:00:00Z', pool: '10,000,000' },
    { round: 4, snapshot: '2026-11-24T00:00:00Z', unlock: '2026-11-24T14:00:00Z', pool: '10,000,000' },
    { round: 5, snapshot: '2026-12-24T00:00:00Z', unlock: '2026-12-24T14:00:00Z', pool: '10,000,000' },
    { round: 6, snapshot: '2027-01-23T00:00:00Z', unlock: '2027-01-23T14:00:00Z', pool: '10,000,000' },
    { round: 7, snapshot: '2027-02-22T00:00:00Z', unlock: '2027-02-22T14:00:00Z', pool: '10,000,000' },
    { round: 8, snapshot: '2027-03-24T00:00:00Z', unlock: '2027-03-24T14:00:00Z', pool: '10,000,000' },
    { round: 9, snapshot: '2027-04-23T00:00:00Z', unlock: '2027-04-23T14:00:00Z', pool: '10,000,000' },
    { round: 10, snapshot: '2027-05-23T00:00:00Z', unlock: '2027-05-23T14:00:00Z', pool: '10,000,000', nextSnapshot: '2027-06-23T00:00:00Z' },
  ],
  // status: 'ongoing' | 'ended'
  giveaways: [
    { id: 5, title: 'Meme & Art', image: '', winners: '6 Winners', prizePool: '$50 in ETH', burnNote: '', status: 'ended', distribution: 'Completed', link: 'https://x.com/noelle_base/status/2094038840927203494' },
    { id: 4, title: '7 NFTs Vibe Club', image: '/rewards/vibe-club.jfif', winners: '7 Winners', prizePool: '7 NFTs', burnNote: '~3M $VIBE burn', status: 'ended', distribution: 'Completed', link: 'https://x.com/vibeB20/status/2092000984671129772' },
    { id: 3, title: '1000 Holders', image: '/event3.png', winners: '33 Winners', prizePool: 'TBA', burnNote: '', status: 'ongoing', distribution: 'Not Started', link: 'https://x.com/vibeB20/status/2085778007960977418' },
    { id: 1, title: '$1M MC', image: '/event1.png', winners: '50 Winners', prizePool: 'TBA', burnNote: '', status: 'ongoing', distribution: 'Not Started', link: 'https://x.com/mksvibe/status/2083993197861073025' },
    { id: 2, title: 'Base App Welcome Bonus', image: '/event2.png', winners: '350 Winners', prizePool: '1M $VIBE', burnNote: '', status: 'ended', distribution: 'In Progress (92%)', link: 'https://x.com/mksvibe/status/2084601445844689003' },
  ],
};

export const ADMIN_WITHDRAWAL_TXS = new Set([
  '0x87d64cc5b391c51e8235124900d388bdb962aedec731f9f2e97f65ec5cc19caa'.toLowerCase(),
  '0xc5fe9349e0b588d94607417f20505c0de06e1730fb2602a7b263374970005d69'.toLowerCase(),
  '0x446037424b8644c1baad63e063463e64cb0c3428292d18c66b43622f1dfceeda'.toLowerCase(),
  '0x97814e0f70482aa7e14e467d5ee08775c166fc7d2eb7c685d388f61370337fb9'.toLowerCase(),
  '0x66ca9ba2a0b434fb265da1bc4241baffeb677556153522d4279cc301d55731b3'.toLowerCase(),
  '0xcc7c60604c8e2cc9c674c9070e7c03b118b6fad3d943006979fff76fc00c6623'.toLowerCase()
]);

// ---- formatting (kept identical to the strings the themes were built with) ----

const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
const pad = (n) => String(n).padStart(2, '0');
const time = (d) => `${pad(d.getUTCHours())}:${pad(d.getUTCMinutes())} UTC`;
const dayMonth = (iso, padDay = false) => {
  const d = new Date(iso);
  return `${padDay ? pad(d.getUTCDate()) : d.getUTCDate()} ${MONTHS[d.getUTCMonth()]}`;
};
const monthDay = (iso) => {
  const d = new Date(iso);
  return `${MONTHS[d.getUTCMonth()]} ${d.getUTCDate()}`;
};
const withTime = (label, iso) => `${label}, ${time(new Date(iso))}`;
const withVibe = (pool) => (pool && pool !== 'TBA' ? `${pool} $VIBE` : 'TBA');
const isoOf = (date) => date.toISOString().replace('.000Z', 'Z');

// Next snapshot after round i: explicit value, the following round's snapshot, or one interval later.
function nextSnapshots(rounds) {
  return rounds.map((r, i) => {
    if (r.nextSnapshot) return r.nextSnapshot;
    if (rounds[i + 1]) return rounds[i + 1].snapshot;
    const prev = rounds[i - 1];
    const step = prev ? new Date(r.snapshot) - new Date(prev.snapshot) : 10 * 86400000;
    return isoOf(new Date(new Date(r.snapshot).getTime() + step));
  });
}

const byNumber = (key) => (a, b) => a[key] - b[key];

function derive(schedule) {
  const staking = [...schedule.staking].sort(byNumber('epoch'));
  const royalties = [...schedule.royalties].sort(byNumber('round'));
  const holders = [...schedule.holderUnlocks].sort(byNumber('round'));
  const royaltyNext = nextSnapshots(royalties);
  const holderNext = nextSnapshots(holders);

  return {
    STAKING_EPOCHS: staking.map((e) => ({
      epoch: `Epoch ${e.epoch}`,
      duration: `${Math.round((new Date(e.end) - new Date(e.start)) / 86400000)} Days`,
      poolAmount: e.pool || 'TBA',
      startTime: withTime(dayMonth(e.start, true), e.start),
      endTime: withTime(dayMonth(e.end, true), e.end),
      startDateObj: new Date(e.start),
      endDateObj: new Date(e.end),
      link: e.vaultId ? stakingVaultLink(e.vaultId) : O1_STAKING_VAULT,
    })),
    STAKING_VAULTS_INFO: staking
      .filter((e) => e.vaultId)
      .map((e) => ({ roundId: e.epoch, id: e.vaultId, defaultTime: new Date(e.end).toISOString() })),
    VIBECLUB_EPOCHS: royalties.map((r, i) => ({
      epoch: `Royalty ${r.round}`,
      snapshotTime: withTime(dayMonth(r.snapshot), r.snapshot),
      claimDate: withTime(dayMonth(r.claim), r.claim),
      snapshotDateObj: new Date(r.snapshot),
      dateObj: new Date(r.claim),
      nextSnapshotDate: new Date(royaltyNext[i]),
      poolAmount: withVibe(r.pool),
    })),
    VIBECLUB_ROUNDS: royalties.map((r, i) => ({
      id: r.round,
      name: `Royalty ${r.round}`,
      pool: withVibe(r.pool),
      snapshotDate: withTime(monthDay(r.snapshot), r.snapshot),
      snapshotIso: r.snapshot,
      claimDate: monthDay(r.claim),
      targetDate: r.claim,
      nextSnapshotDate: royaltyNext[i],
    })),
    HOLDER_UNLOCKS: holders.map((h, i) => ({
      unlock: `Unlock ${h.round}`,
      snapshotTime: withTime(dayMonth(h.snapshot), h.snapshot),
      unlockDate: withTime(dayMonth(h.unlock), h.unlock),
      snapshotDateObj: new Date(h.snapshot),
      dateObj: new Date(h.unlock),
      nextSnapshotDate: new Date(holderNext[i]),
      poolAmount: h.pool || 'TBA',
    })),
    HOLDER_ROUNDS: holders.map((h, i) => ({
      id: h.round,
      name: `Unlock ${h.round}`,
      pool: withVibe(h.pool),
      snapshotDate: withTime(monthDay(h.snapshot), h.snapshot),
      snapshotIso: h.snapshot,
      unlockDate: monthDay(h.unlock),
      targetDate: h.unlock,
      nextSnapshotDate: holderNext[i],
    })),
    GIVEAWAYS_DATA: schedule.giveaways.map((g) => {
      const out = { ...g };
      for (const k of ['image', 'burnNote']) if (!out[k]) delete out[k];
      return out;
    }),
  };
}

// ---- live exports ----

export let SCHEDULE = DEFAULT_SCHEDULE;
export let STAKING_EPOCHS;
export let STAKING_VAULTS_INFO;
export let VIBECLUB_EPOCHS;
export let VIBECLUB_ROUNDS;
export let HOLDER_UNLOCKS;
export let HOLDER_ROUNDS;
export let GIVEAWAYS_DATA;

// Banner uploaded in the admin panel for a royalty round ('' when none, then themes use their own files).
export function royaltyBannerFor(round) {
  return SCHEDULE.royalties.find((r) => r.round === Number(round))?.banner || '';
}

export function applySchedule(schedule) {
  const next = derive(schedule);
  SCHEDULE = schedule;
  ({ STAKING_EPOCHS, STAKING_VAULTS_INFO, VIBECLUB_EPOCHS, VIBECLUB_ROUNDS, HOLDER_UNLOCKS, HOLDER_ROUNDS, GIVEAWAYS_DATA } = next);
}

applySchedule(DEFAULT_SCHEDULE);
