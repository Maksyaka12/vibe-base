// The guided tour of the read-only demo: a welcome card, then one step per feature. Each step opens its page,
// highlights one block and says what to try there. Only DemoController mounts it, and only in demo mode.

export const TOUR_STEPS = [
  {
    id: 'programs',
    route: '/hub',
    targets: ['.o1-campaign-grid'],
    title: 'Four ways to earn',
    text: 'Holder rewards, Vibe Club royalties, staking and giveaways. Pick a card to see its rounds, pools and rules.',
    hint: 'Tap any card',
  },
  {
    id: 'status',
    route: '/hub',
    targets: ['.o1-hub-featured-card .o1-hub-tiles-3', '.o1-hub-featured-card'],
    title: 'Your status, live',
    text: 'For the live round the hub reads this wallet onchain and shows whether it qualifies and how much the pool holds.',
  },
  {
    id: 'claim',
    route: '/claim',
    targets: ['.o1-claim-active-card', '.o1-claim-stats-grid'],
    title: 'Claim rewards',
    text: 'Every round this wallet earned, with the amount and a Merkle proof. Press Claim: instead of a wallet prompt you see the exact transaction that would be sent.',
    hint: 'Try Claim',
    tryIt: true,
  },
  {
    id: 'checkin',
    route: '/profile',
    targets: ['.o1-checkin-card'],
    title: 'Daily check-in',
    text: 'One onchain check-in a day builds a streak. Streaks and activity unlock achievements.',
    hint: 'Try Check in',
    tryIt: true,
  },
  {
    id: 'achievements',
    route: '/profile',
    targets: ['.o1-achievements-group', '.o1-achievements-container'],
    title: 'Achievements',
    text: 'Soulbound badges for holding, claiming, minting and streaks. Unlocked ones can be claimed to the wallet.',
  },
  {
    id: 'swap',
    route: '/buy',
    targets: ['.o1-swap-card'],
    title: 'Swap ETH and $VIBE',
    text: 'Live quotes from LI.FI and KyberSwap, and the hub takes the better one. Enter an amount and press Swap to preview the route.',
    hint: 'Enter an amount, then Swap',
    tryIt: true,
  },
  {
    id: 'mint',
    route: '/vibeclub',
    targets: ['.o1-nft-controls-card', '.o1-nft-mint-grid'],
    title: 'Vibe Club NFT',
    text: 'Mint with ETH or $VIBE. ETH is swapped to $VIBE on the way in and 80% of it is burned. Holders share the royalty rounds.',
    hint: 'Preview a mint',
    tryIt: true,
  },
  {
    id: 'agents',
    route: '/agents',
    targets: ['[data-testid="api-playground"]', '.agp-hero'],
    title: 'Agent Zone',
    text: 'AI agents use the same public API to check in, claim and swap. Run an endpoint to see the live JSON for this wallet.',
    hint: 'Press Run',
  },
];

/* ── Tour state: which step is open (null = closed, -1 = welcome). Shared by the banner and the tour. ── */

const KEY = 'vibe_demo_tour';
const EVENT = 'vibe_demo_tour_change';
let current = null;

const readSeen = () => {
  try {
    return sessionStorage.getItem(KEY) === 'seen';
  } catch (e) {
    return false;
  }
};
const markSeen = () => {
  try {
    sessionStorage.setItem(KEY, 'seen');
  } catch (e) {}
};

const emit = () => {
  if (typeof window !== 'undefined') window.dispatchEvent(new Event(EVENT));
};

export const getTourStep = () => current;

export function setTourStep(step) {
  current = step;
  if (step !== null) markSeen();
  emit();
}

/** Opens the welcome card the first time the demo starts in this browser session. */
export function openWelcomeOnce() {
  if (current === null && !readSeen()) setTourStep(-1);
}

export const startTour = () => setTourStep(-1);
export const closeTour = () => setTourStep(null);

export function subscribeTour(cb) {
  if (typeof window === 'undefined') return () => {};
  window.addEventListener(EVENT, cb);
  return () => window.removeEventListener(EVENT, cb);
}
