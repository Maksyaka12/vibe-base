import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { usePrivy } from '@privy-io/react-auth';
import { Coins, ArrowUpRight, ArrowRight, ChevronDown, Info, Clock, ExternalLink } from 'lucide-react';
import { roundProofs } from '../../../data/claimRounds';
import { Button, Card, Tile, Badge, StatusPill, PageHeader, SectionTitle, Alert } from './ui';

function formatClaimCountdown(targetDate) {
  if (!targetDate) return '';
  const now = new Date().getTime();
  const target = new Date(targetDate).getTime();
  const diff = target - now;

  if (diff <= 0) return 'Ended';

  const days = Math.floor(diff / (1000 * 60 * 60 * 24));
  const hours = Math.floor((diff / (1000 * 60 * 60)) % 24);
  const minutes = Math.floor((diff / (1000 * 60)) % 60);
  const seconds = Math.floor((diff / 1000) % 60);

  const pad = (n) => String(n).padStart(2, '0');

  if (days > 0) {
    return `${days}d ${pad(hours)}h ${pad(minutes)}m ${pad(seconds)}s`;
  }
  return `${pad(hours)}h ${pad(minutes)}m ${pad(seconds)}s`;
}

function ActiveClaimCountdown({ targetDate }) {
  const [timeLeft, setTimeLeft] = useState(() => formatClaimCountdown(targetDate));

  useEffect(() => {
    const interval = setInterval(() => {
      setTimeLeft(formatClaimCountdown(targetDate));
    }, 1000);
    return () => clearInterval(interval);
  }, [targetDate]);

  return <span style={{ fontVariantNumeric: 'tabular-nums', fontFamily: 'var(--mono)' }}>{timeLeft}</span>;
}

const stripYear = (str) => {
  if (!str) return '';
  return str.replace(/\s\d{4},/, ',');
};

const formatStakingDates = (ep) => `${stripYear(ep.startTime)} – ${stripYear(ep.endTime)}`;

const formatPool = (amount) => {
  if (!amount || amount === 'TBA') return 'TBA';
  return amount.includes('$VIBE') ? amount : `${amount} $VIBE`;
};

const getEpochStatus = (ep,currentTime = new Date()) => {
  const current = currentTime instanceof Date ? currentTime : new Date(currentTime);
  if (ep.endDateObj && current >= ep.endDateObj) {
    return 'ended';
  }
  if (ep.startDateObj && current >= ep.startDateObj) {
    return 'active';
  }
  return 'upcoming';
};

const getRewardEpochStatus = (ep, currentTime = new Date()) => {
  const current = currentTime instanceof Date ? currentTime : new Date(currentTime);
  if (ep.status === 'ended' || ep.status === 'completed' || (ep.nextSnapshotDate && current >= ep.nextSnapshotDate)) {
    return 'ended';
  }
  const start = ep.snapshotDateObj || ep.dateObj;
  if (start && current >= start) {
    return 'active';
  }
  return 'upcoming';
};

export default function BaseAppRewardsView({
  HOLDER_UNLOCKS = [],
  VIBECLUB_EPOCHS = [],
  STAKING_EPOCHS = [],
  GIVEAWAYS_DATA = [],
  O1_STAKING_VAULT = '',
  now = new Date()
}) {
  const { authenticated, user } = usePrivy();
  const address = user?.wallet?.address;
  const userAddress = address ? address.toLowerCase() : null;

  const [currentTab, setCurrentTab] = useState('holders');
  const [openFaq, setOpenFaq] = useState(null);

  // Cached balances
  const [userBalance, setUserBalance] = useState(() => {
    if (!userAddress) return 0;
    return Number(localStorage.getItem(`vibe_balance_${userAddress}`) || 0);
  });
  const [userNftCount, setUserNftCount] = useState(() => {
    if (!userAddress) return 0;
    return Number(localStorage.getItem(`vibe_nfts_${userAddress}`) || 0);
  });

  useEffect(() => {
    if (!userAddress) return;
    const cachedBal = Number(localStorage.getItem(`vibe_balance_${userAddress}`) || 0);
    const cachedNfts = Number(localStorage.getItem(`vibe_nfts_${userAddress}`) || 0);
    setUserBalance(cachedBal);
    setUserNftCount(cachedNfts);
  }, [userAddress]);

  // Holder calculations
  const activeHolders = HOLDER_UNLOCKS.filter(u => getRewardEpochStatus(u, now) === 'active');
  const endedHolders = HOLDER_UNLOCKS.filter(u => getRewardEpochStatus(u, now) === 'ended');
  const upcomingHolders = HOLDER_UNLOCKS.filter(u => getRewardEpochStatus(u, now) === 'upcoming');

  const featuredHolder = activeHolders[0] || upcomingHolders[0] || endedHolders[endedHolders.length - 1] || HOLDER_UNLOCKS[0];
  const featuredHolderStatus = featuredHolder ? getRewardEpochStatus(featuredHolder, now) : 'upcoming';
  const isFeaturedHolderClaimLive = featuredHolderStatus === 'active' && featuredHolder?.dateObj && now >= featuredHolder.dateObj;
  const otherEndedHolders = endedHolders.filter(u => u.unlock !== featuredHolder?.unlock);

  const isHolderActiveEligible = (() => {
    if (!authenticated || !userAddress) return false;
    const unlockNum = parseInt(featuredHolder?.unlock?.replace(/\D/g, '') || '1', 10);
    // Once the round has a snapshot, eligibility is whatever the snapshot says.
    const snapshot = roundProofs('holder', unlockNum);
    if (snapshot) return Boolean(snapshot.claims?.[userAddress]);
    return userBalance >= 5000000;
  })();

  // Vibe Club calculations
  const activeVibeClubs = VIBECLUB_EPOCHS.filter(u => getRewardEpochStatus(u, now) === 'active');
  const endedVibeClubs = VIBECLUB_EPOCHS.filter(u => getRewardEpochStatus(u, now) === 'ended');
  const upcomingVibeClubs = VIBECLUB_EPOCHS.filter(u => getRewardEpochStatus(u, now) === 'upcoming');

  const featuredVibeClub = activeVibeClubs[0] || upcomingVibeClubs[0] || endedVibeClubs[endedVibeClubs.length - 1] || VIBECLUB_EPOCHS[0];
  const featuredVibeClubStatus = featuredVibeClub ? getRewardEpochStatus(featuredVibeClub, now) : 'upcoming';
  const isFeaturedVibeClubClaimLive = featuredVibeClubStatus === 'active' && featuredVibeClub?.dateObj && now >= featuredVibeClub.dateObj;
  const otherEndedVibeClubs = endedVibeClubs.filter(u => u.epoch !== featuredVibeClub?.epoch);

  const isVibeClubActiveEligible = (() => {
    if (!authenticated || !userAddress) return false;
    const epochNum = parseInt(featuredVibeClub?.epoch?.replace(/\D/g, '') || '1', 10);
    // Once the round has a snapshot, eligibility is whatever the snapshot says.
    const snapshot = roundProofs('royalty', epochNum);
    if (snapshot) return Boolean(snapshot.claims?.[userAddress]);
    return userNftCount > 0;
  })();

  // Staking calculations
  const activeStakings = STAKING_EPOCHS.filter(e => getEpochStatus(e, now) === 'active');
  const endedStakings = STAKING_EPOCHS.filter(e => getEpochStatus(e, now) === 'ended');
  const upcomingStakings = STAKING_EPOCHS.filter(e => getEpochStatus(e, now) === 'upcoming');

  const featuredStaking = activeStakings[activeStakings.length - 1] || upcomingStakings[0] || endedStakings[endedStakings.length - 1] || STAKING_EPOCHS[0];
  const featuredStakingStatus = featuredStaking ? getEpochStatus(featuredStaking, now) : 'upcoming';
  const otherEndedStakings = endedStakings.filter(e => e.epoch !== featuredStaking?.epoch);
  const currentStakings = upcomingStakings.filter(e => e !== featuredStaking);

  // Giveaways calculations
  const activeGiveaways = GIVEAWAYS_DATA.filter(e => e.status === 'ongoing');
  const pastGiveaways = GIVEAWAYS_DATA.filter(e => e.status === 'ended');

  const tabs = [
    { id: 'holders', label: 'Holders', image: '/rewards-hub/holders.jfif', count: `${activeHolders.length} live`, tone: activeHolders.length > 0 ? 'success' : 'neutral' },
    { id: 'vibe-club', label: 'Vibe Club', image: '/rewards-hub/vibe-club.jfif', count: `${activeVibeClubs.length} live`, tone: activeVibeClubs.length > 0 ? 'success' : 'neutral' },
    { id: 'staking', label: 'Staking', image: '/rewards-hub/staking.jfif', count: `${activeStakings.length} live`, tone: activeStakings.length > 0 ? 'success' : 'neutral' },
    { id: 'giveaways', label: 'Giveaways', image: '/rewards-hub/giveaways.jfif', count: `${activeGiveaways.length} active`, tone: activeGiveaways.length > 0 ? 'accent' : 'neutral' }
  ];

  return (
    <div className="o1-hub-container">
      <PageHeader
        title="Rewards Hub"
        description="Campaign distribution schedules, holder royalties, and staking yields"
      />

      {/* ── 1. Campaign Switcher 4-Card Grid ── */}
      <div className="o1-campaign-grid">
        {tabs.map((tab) => {
          const isActive = currentTab === tab.id;
          return (
            <button
              key={tab.id}
              type="button"
              className={`o1-campaign-card ${isActive ? 'active' : ''}`}
              onClick={() => setCurrentTab(tab.id)}
              aria-label={tab.label}
            >
              <div className="o1-campaign-card-badge">
                <Badge tone={tab.tone} pill>{tab.count}</Badge>
              </div>
              <img src={tab.image} alt={tab.label} className="o1-campaign-card-img" />
              <div className="o1-campaign-card-overlay" />
              <div className="o1-campaign-card-title">{tab.label}</div>
            </button>
          );
        })}
      </div>

      {/* ── 2. HOLDER REWARDS TAB ── */}
      {currentTab === 'holders' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
          <Alert
            tone="warn"
            icon={<Info size={16} />}
            action={
              <a
                href="/tokenomics#vesting-details"
                target="_blank"
                rel="noreferrer"
                style={{
                  color: 'var(--amber)',
                  textDecoration: 'none',
                  fontSize: '12px',
                  fontWeight: 600,
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '4px'
                }}
              >
                <span>View rules</span>
                <ArrowRight size={13} />
              </a>
            }
          >
            Hold 5M+ $VIBE at snapshot time to share the rewards pool.
          </Alert>

          {featuredHolder && (
            <Card className="o1-hub-featured-card">
              <div className="o1-hub-featured-head">
                <div className="o1-hub-featured-title-wrap">
                  <div className="o1-hub-featured-icon">
                    <img src="/new-logo-vibe.png" alt="VIBE" />
                  </div>
                  <div>
                    <div className="o1-hub-featured-name">{featuredHolder.unlock}</div>
                    <div className="o1-hub-featured-sub">
                      Snapshot: {stripYear(featuredHolder.snapshotTime)}
                    </div>
                  </div>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <StatusPill
                    status={isFeaturedHolderClaimLive ? 'Live' : featuredHolderStatus === 'ended' ? 'Ended' : 'Upcoming'}
                    tone={isFeaturedHolderClaimLive ? 'success' : featuredHolderStatus === 'ended' ? 'neutral' : 'warn'}
                  />
                  {isFeaturedHolderClaimLive && featuredHolder.nextSnapshotDate && (
                    <Badge tone="success" pill>
                      <Clock size={12} style={{ marginRight: 4 }} />
                      <ActiveClaimCountdown targetDate={featuredHolder.nextSnapshotDate} />
                    </Badge>
                  )}
                </div>
              </div>

              <div className="o1-hub-tiles-3">
                <Tile
                  label="Rewards pool"
                  value={`${featuredHolder.poolAmount} $VIBE`}
                  sub="Distributed proportionally to eligible holders"
                />
                <Tile
                  label="Requirement"
                  value="5M+ $VIBE"
                  sub="Balance held at snapshot block"
                />
                <Tile
                  label="Your status"
                  value={
                    !authenticated ? (
                      <Badge tone="neutral" pill>Connect wallet</Badge>
                    ) : isHolderActiveEligible ? (
                      <Badge tone="success" pill>Eligible</Badge>
                    ) : (
                      <Badge tone="neutral" pill>Not eligible</Badge>
                    )
                  }
                  sub={
                    !authenticated
                      ? 'Connect wallet to verify'
                      : isHolderActiveEligible
                      ? 'Snapshot requirement satisfied'
                      : 'Minimum 5M $VIBE holding required'
                  }
                />
              </div>

              <div className="o1-hub-action-row">
                <Button
                  as={Link}
                  to="/claim"
                  variant="primary"
                  size="lg"
                  icon={<ArrowRight size={15} />}
                >
                  Go to Claim Portal
                </Button>
              </div>
            </Card>
          )}

          {/* Schedule list */}
          {upcomingHolders.length > 0 && (
            <div>
              <SectionTitle title="Upcoming unlocks" count={upcomingHolders.length} />
              <div className="o1-schedule-card">
                <div className="o1-schedule-head">
                  <div>Epoch</div>
                  <div>Date</div>
                  <div>Allocation</div>
                  <div>Status</div>
                </div>
                {upcomingHolders.map((u, idx) => (
                  <div key={idx} className="o1-schedule-row">
                    <div className="o1-schedule-col-name">{u.unlock}</div>
                    <div className="o1-schedule-col-date">{stripYear(u.unlockDate)}</div>
                    <div className="o1-schedule-col-amount">{formatPool(u.poolAmount)}</div>
                    <div className="o1-schedule-col-status">
                      <StatusPill status="Locked" tone="neutral" />
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Previous Unlocks */}
          {otherEndedHolders.length > 0 && (
            <div>
              <SectionTitle title="Previous unlocks" count={otherEndedHolders.length} />
              <div className="o1-schedule-card">
                <div className="o1-schedule-head">
                  <div>Epoch</div>
                  <div>Date</div>
                  <div>Allocation</div>
                  <div>Status</div>
                </div>
                {otherEndedHolders.map((u, idx) => (
                  <div key={idx} className="o1-schedule-row">
                    <div className="o1-schedule-col-name">{u.unlock}</div>
                    <div className="o1-schedule-col-date">{stripYear(u.unlockDate)}</div>
                    <div className="o1-schedule-col-amount">{formatPool(u.poolAmount)}</div>
                    <div className="o1-schedule-col-status">
                      <StatusPill status="Completed" tone="success" />
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {/* ── 3. VIBE CLUB ROYALTIES TAB ── */}
      {currentTab === 'vibe-club' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
          <Alert
            tone="warn"
            icon={<Info size={16} />}
            action={
              <Link
                to="/nft"
                style={{
                  color: 'var(--amber)',
                  textDecoration: 'none',
                  fontSize: '12px',
                  fontWeight: 600,
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '4px'
                }}
              >
                <span>Mint NFT</span>
                <ArrowRight size={13} />
              </Link>
            }
          >
            Hold Vibe Club NFT at snapshot time to share royalty pool.
          </Alert>

          {featuredVibeClub && (
            <Card className="o1-hub-featured-card">
              <div className="o1-hub-featured-head">
                <div className="o1-hub-featured-title-wrap">
                  <div className="o1-hub-featured-icon">
                    <img src="/new-logo-vibe.png" alt="VIBE" />
                  </div>
                  <div>
                    <div className="o1-hub-featured-name">{featuredVibeClub.epoch}</div>
                    <div className="o1-hub-featured-sub">
                      Snapshot: {stripYear(featuredVibeClub.snapshotTime)}
                    </div>
                  </div>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <StatusPill
                    status={isFeaturedVibeClubClaimLive ? 'Live' : featuredVibeClubStatus === 'ended' ? 'Ended' : 'Upcoming'}
                    tone={isFeaturedVibeClubClaimLive ? 'success' : featuredVibeClubStatus === 'ended' ? 'neutral' : 'warn'}
                  />
                  {isFeaturedVibeClubClaimLive && featuredVibeClub.nextSnapshotDate && (
                    <Badge tone="success" pill>
                      <Clock size={12} style={{ marginRight: 4 }} />
                      <ActiveClaimCountdown targetDate={featuredVibeClub.nextSnapshotDate} />
                    </Badge>
                  )}
                </div>
              </div>

              <div className="o1-hub-tiles-3">
                <Tile
                  label="Rewards pool"
                  value={`${featuredVibeClub.poolAmount} $VIBE`}
                  sub="Distributed equally among all NFT holders"
                />
                <Tile
                  label="Requirement"
                  value="1+ Vibe Club NFT"
                  sub="Must be held in wallet during snapshot"
                />
                <Tile
                  label="Your status"
                  value={
                    !authenticated ? (
                      <Badge tone="neutral" pill>Connect wallet</Badge>
                    ) : isVibeClubActiveEligible ? (
                      <Badge tone="success" pill>Eligible</Badge>
                    ) : (
                      <Badge tone="neutral" pill>Not eligible</Badge>
                    )
                  }
                  sub={
                    !authenticated
                      ? 'Connect wallet to verify'
                      : isVibeClubActiveEligible
                      ? 'NFT holder requirement satisfied'
                      : 'Must hold at least 1 Vibe Club NFT'
                  }
                />
              </div>

              <div className="o1-hub-action-row">
                <Button
                  as={Link}
                  to="/claim"
                  variant="primary"
                  size="lg"
                  icon={<ArrowRight size={15} />}
                >
                  Go to Claim Portal
                </Button>
              </div>
            </Card>
          )}

          {upcomingVibeClubs.length > 0 && (
            <div>
              <SectionTitle title="Upcoming royalties" count={upcomingVibeClubs.length} />
              <div className="o1-schedule-card">
                <div className="o1-schedule-head">
                  <div>Epoch</div>
                  <div>Date</div>
                  <div>Allocation</div>
                  <div>Status</div>
                </div>
                {upcomingVibeClubs.map((u, idx) => (
                  <div key={idx} className="o1-schedule-row">
                    <div className="o1-schedule-col-name">{u.epoch}</div>
                    <div className="o1-schedule-col-date">{stripYear(u.claimDate)}</div>
                    <div className="o1-schedule-col-amount">{formatPool(u.poolAmount)}</div>
                    <div className="o1-schedule-col-status">
                      <StatusPill status="Locked" tone="neutral" />
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Previous Royalty Payouts */}
          {otherEndedVibeClubs.length > 0 && (
            <div>
              <SectionTitle title="Previous royalty payouts" count={otherEndedVibeClubs.length} />
              <div className="o1-schedule-card">
                <div className="o1-schedule-head">
                  <div>Epoch</div>
                  <div>Date</div>
                  <div>Allocation</div>
                  <div>Status</div>
                </div>
                {otherEndedVibeClubs.map((u, idx) => (
                  <div key={idx} className="o1-schedule-row">
                    <div className="o1-schedule-col-name">{u.epoch}</div>
                    <div className="o1-schedule-col-date">{stripYear(u.claimDate)}</div>
                    <div className="o1-schedule-col-amount">{formatPool(u.poolAmount)}</div>
                    <div className="o1-schedule-col-status">
                      <StatusPill status="Completed" tone="success" />
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {/* ── 4. STAKING VAULTS TAB ── */}
      {currentTab === 'staking' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
          <Alert
            tone="info"
            icon={<Info size={16} />}
            action={
              <a
                href={O1_STAKING_VAULT}
                target="_blank"
                rel="noreferrer"
                style={{
                  color: 'var(--accent)',
                  textDecoration: 'none',
                  fontSize: '12px',
                  fontWeight: 600,
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '4px'
                }}
              >
                <span>Open o1 Exchange</span>
                <ExternalLink size={13} />
              </a>
            }
          >
            Stake $VIBE in active vault on o1 exchange to earn passive yield.
          </Alert>

          {featuredStaking && (
            <Card className="o1-hub-featured-card">
              <div className="o1-hub-featured-head">
                <div className="o1-hub-featured-title-wrap">
                  <div className="o1-hub-featured-icon">
                    <Coins size={22} color="var(--accent)" />
                  </div>
                  <div>
                    <div className="o1-hub-featured-name">{featuredStaking.epoch}</div>
                    <div className="o1-hub-featured-sub">Verified vault on o1 Exchange</div>
                  </div>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <StatusPill
                    status={featuredStakingStatus === 'active' ? 'Live' : featuredStakingStatus === 'ended' ? 'Ended' : 'Upcoming'}
                    tone={featuredStakingStatus === 'active' ? 'success' : featuredStakingStatus === 'ended' ? 'neutral' : 'warn'}
                  />
                  {featuredStakingStatus === 'active' && featuredStaking.endDateObj && (
                    <Badge tone="success" pill>
                      <Clock size={12} style={{ marginRight: 4 }} />
                      <ActiveClaimCountdown targetDate={featuredStaking.endDateObj} />
                    </Badge>
                  )}
                </div>
              </div>

              <div className="o1-hub-tiles-3">
                <Tile
                  label="Epoch pool"
                  value={formatPool(featuredStaking.poolAmount)}
                  sub="Proportional rewards for stakers"
                />
                <Tile
                  label="Duration"
                  value="10 days"
                  sub="Epoch locking period"
                />
                <Tile
                  label="Platform"
                  value="o1 Exchange"
                  sub="Verified staking vaults"
                />
              </div>

              <div className="o1-hub-action-row">
                <Button
                  as="a"
                  href={featuredStaking.link || O1_STAKING_VAULT}
                  target="_blank"
                  rel="noreferrer"
                  variant="primary"
                  size="lg"
                  icon={<ExternalLink size={15} />}
                >
                  Stake on o1 Exchange
                </Button>
              </div>
            </Card>
          )}

          {currentStakings.length > 0 && (
            <div>
              <SectionTitle title="Upcoming staking epochs" count={currentStakings.length} />
              <div className="o1-schedule-card">
                <div className="o1-schedule-head">
                  <div>Epoch</div>
                  <div>Dates</div>
                  <div>Rewards</div>
                  <div>Vault</div>
                </div>
                {currentStakings.map((e, idx) => {
                  const status = getEpochStatus(e, now);
                  return (
                    <div key={idx} className="o1-schedule-row">
                      <div className="o1-schedule-col-name">{e.epoch}</div>
                      <div className="o1-schedule-col-date">{formatStakingDates(e)}</div>
                      <div className="o1-schedule-col-amount">{formatPool(e.poolAmount)}</div>
                      <div className="o1-schedule-col-status">
                        <a
                          href={e.link || O1_STAKING_VAULT}
                          target="_blank"
                          rel="noreferrer"
                          style={{
                            color: 'var(--accent)',
                            fontSize: '12px',
                            fontWeight: 600,
                            textDecoration: 'none',
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: '4px'
                          }}
                        >
                          <span>{status === 'active' ? 'Stake' : 'View'}</span>
                          <ExternalLink size={12} />
                        </a>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* Previous Staking Epochs */}
          {otherEndedStakings.length > 0 && (
            <div>
              <SectionTitle title="Previous staking epochs" count={otherEndedStakings.length} />
              <div className="o1-schedule-card">
                <div className="o1-schedule-head">
                  <div>Epoch</div>
                  <div>Dates</div>
                  <div>Rewards</div>
                  <div>Vault</div>
                </div>
                {otherEndedStakings.map((e, idx) => (
                  <div key={idx} className="o1-schedule-row">
                    <div className="o1-schedule-col-name">{e.epoch}</div>
                    <div className="o1-schedule-col-date">{formatStakingDates(e)}</div>
                    <div className="o1-schedule-col-amount">{formatPool(e.poolAmount)}</div>
                    <div className="o1-schedule-col-status">
                      <Button
                        as="a"
                        href={e.link || O1_STAKING_VAULT}
                        target="_blank"
                        rel="noreferrer"
                        variant="secondary"
                        size="sm"
                      >
                        Withdraw &amp; claim
                        <ArrowUpRight size={14} />
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {/* ── 5. GIVEAWAYS TAB ── */}
      {currentTab === 'giveaways' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
          <Alert tone="info" icon={<Info size={16} />}>
            Community giveaways distributed directly to eligible winners.
          </Alert>

          {activeGiveaways.length > 0 && (
            <div>
              <SectionTitle title="Active events" count={activeGiveaways.length} />
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: '14px' }}>
                {activeGiveaways.map((g, idx) => (
                  <Card key={idx} style={{ padding: '16px', display: 'flex', flexDirection: 'column', gap: '12px' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <span style={{ fontSize: '14px', fontWeight: 600, color: 'var(--text)' }}>{g.title}</span>
                      <StatusPill status="Active" tone="success" />
                    </div>
                    <Tile label="Prize pool" value={g.prizePool || 'TBA'} />
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px' }}>
                      <Tile label="Distribution" value={g.distribution || 'Not started'} />
                      <Tile label="Winners" value={g.winners || 'TBA'} />
                    </div>
                    {g.link && (
                      <Button as="a" href={g.link} target="_blank" rel="noreferrer" variant="secondary" size="sm">
                        Participate
                        <ExternalLink size={13} />
                      </Button>
                    )}
                  </Card>
                ))}
              </div>
            </div>
          )}

          {/* Past Giveaways */}
          {pastGiveaways.length > 0 && (
            <div>
              <SectionTitle title="Past giveaways" count={pastGiveaways.length} />
              <div className="o1-schedule-card">
                <div className="o1-schedule-head">
                  <div>Event</div>
                  <div>Winners</div>
                  <div>Prize pool</div>
                  <div>Post</div>
                </div>
                {pastGiveaways.map((g, idx) => (
                  <div key={g.id || idx} className="o1-schedule-row">
                    <div className="o1-schedule-col-name">{g.title}</div>
                    <div className="o1-schedule-col-date">{g.winners}</div>
                    <div className="o1-schedule-col-amount">{g.prizePool}</div>
                    <div className="o1-schedule-col-status">
                      {g.link ? (
                        <Button as="a" href={g.link} target="_blank" rel="noreferrer" variant="secondary" size="sm">
                          View
                          <ArrowUpRight size={14} />
                        </Button>
                      ) : (
                        <StatusPill status="Ended" tone="neutral" />
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {/* ── 6. FAQ Accordion ── */}
      <div>
        <SectionTitle title="FAQ & Info" />
        <div className="o1-faq-card">
          {[
            {
              question: 'How to claim rewards?',
              answer: (
                <span>
                  Claim active Holder rewards &amp; Vibe Club royalties directly in the{' '}
                  <Link to="/claim" style={{ color: 'var(--accent)', textDecoration: 'underline' }}>
                    Claim Portal
                  </Link>.
                </span>
              )
            },
            {
              question: 'How does staking yield work?',
              answer: (
                <span>
                  Stake $VIBE into active staking vaults on{' '}
                  <a href={O1_STAKING_VAULT} target="_blank" rel="noreferrer" style={{ color: 'var(--accent)', textDecoration: 'underline' }}>
                    o1 Exchange
                  </a>{' '}
                  to earn passive yields every 10 days.
                </span>
              )
            },
            {
              question: 'How long do I have to claim rewards?',
              answer: (
                <span>
                  You can claim your Holder Rewards and Vibe Club Royalties during the active claim window indicated by the countdown timer. Staking Rewards have no deadline and can be claimed at any time.
                </span>
              )
            },
            {
              question: 'What happens to unclaimed tokens?',
              answer: (
                <span>
                  Unclaimed Holder rewards and Vibe Club Royalties after the claim deadline are permanently burned.
                </span>
              )
            }
          ].map((faq, idx) => {
            const isOpen = openFaq === idx;
            return (
              <div key={idx} className="o1-faq-item">
                <button
                  type="button"
                  className="o1-faq-trigger"
                  onClick={() => setOpenFaq(isOpen ? null : idx)}
                >
                  <span>{faq.question}</span>
                  <ChevronDown
                    size={15}
                    style={{
                      transform: isOpen ? 'rotate(180deg)' : 'none',
                      transition: 'transform var(--ease-fast)',
                      color: 'var(--text-3)'
                    }}
                  />
                </button>
                {isOpen && <div className="o1-faq-content">{faq.answer}</div>}
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
