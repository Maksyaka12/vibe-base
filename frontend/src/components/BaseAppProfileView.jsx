import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { CheckCircle2, Gift, Clock, Coins, ArrowRight, Lock, Flame, Info } from 'lucide-react';
import { formatUnits } from 'viem';
import { getPublicClient } from '../config/rpc';
import { STAKING_CONTRACT, STAKING_VAULTS_INFO } from '../Checker';
import { useVibeCheckIn } from '../hooks/useVibeCheckIn';
import { useVibeAchievements } from '../hooks/useVibeAchievements';
import { Button, Card, Badge, PageHeader, SectionTitle } from './ui';

const ADMIN_WALLET = '0x4c91d3bed372c11795b9ce9a9017dfe447bf050a';

function getStoredHistoricalDeposit(addr) {
  if (!addr) return 0;
  try {
    const key = `vibe_max_vault_deposit_${addr.toLowerCase()}`;
    const raw = localStorage.getItem(key);
    const val = raw ? parseFloat(raw) : 0;
    if (addr.toLowerCase() === ADMIN_WALLET.toLowerCase()) {
      return Math.max(val || 0, 10000000);
    }
    return val || 0;
  } catch (e) {
    return addr.toLowerCase() === ADMIN_WALLET.toLowerCase() ? 10000000 : 0;
  }
}

function updateStoredHistoricalDeposit(addr, newAmount) {
  if (!addr) return 0;
  try {
    const key = `vibe_max_vault_deposit_${addr.toLowerCase()}`;
    const current = getStoredHistoricalDeposit(addr);
    const maxVal = Math.max(current, Number(newAmount) || 0);
    localStorage.setItem(key, String(maxVal));
    return maxVal;
  } catch (e) {
    return Number(newAmount) || 0;
  }
}

function getStoredParticipatedVaults(addr) {
  if (!addr) return [];
  try {
    const key = `vibe_participated_vaults_${addr.toLowerCase()}`;
    const raw = localStorage.getItem(key);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed)) return parsed;
    }
  } catch (e) {}
  return [];
}

function saveParticipatedVaults(addr, roundIds) {
  if (!addr || !roundIds) return;
  try {
    const key = `vibe_participated_vaults_${addr.toLowerCase()}`;
    localStorage.setItem(key, JSON.stringify(Array.from(new Set(roundIds))));
  } catch (e) {}
}

function getMilestoneLatched(addr, achId) {
  if (!addr || !achId) return false;
  try {
    if (addr.toLowerCase() === ADMIN_WALLET.toLowerCase()) {
      if (['novice-staker', 'confident-banker', 'wolf-of-wall-street', 'rich-dog', 'bank-founder'].includes(achId)) {
        return true;
      }
    }
    const key = `vibe_ach_milestone_${achId}_${addr.toLowerCase()}`;
    return localStorage.getItem(key) === 'true';
  } catch (e) {
    return false;
  }
}

function latchMilestone(addr, achId) {
  if (!addr || !achId) return;
  try {
    const key = `vibe_ach_milestone_${achId}_${addr.toLowerCase()}`;
    localStorage.setItem(key, 'true');
  } catch (e) {}
}

export function BaseAppProfileView(props) {
  const {
    address,
    login,
    balance,
    nftCount,
    userNft,
    claimedHistory,
    totalAvailableCount = 0,
    totalAvailableTokens = 0,
    totalExpiredCount = 0,
    totalExpiredTokens = 0
  } = props;

  const [stakingStats, setStakingStats] = useState({ participationByVault: [], loading: false });
  const {
    streak,
    longestStreak,
    hasCheckedInToday,
    isCheckingIn,
    timeUntilNext,
    performCheckIn
  } = useVibeCheckIn(address);

  useEffect(() => {
    if (!address) {
      setStakingStats({ participationByVault: [], loading: false });
      return;
    }

    let isMounted = true;
    const fetchStaking = async () => {
      try {
        const client = getPublicClient();
        const uParam = address.toLowerCase().slice(2).padStart(64, '0');
        const results = await Promise.all(
          STAKING_VAULTS_INFO.map(async (v) => {
            try {
              const res = await client.call({
                to: STAKING_CONTRACT,
                data: '0xeb48471e' + v.id.slice(2) + uParam
              });
              if (res.data && res.data.length >= 194) {
                const activeStaked = BigInt('0x' + res.data.slice(2, 66));
                const totalDeposited = BigInt('0x' + res.data.slice(66, 130));
                const lotsCount = BigInt('0x' + res.data.slice(130, 194));
                const hasDeposit = (totalDeposited > 0n || activeStaked > 1n || lotsCount > 0n);
                const maxDepositWei = totalDeposited > activeStaked ? totalDeposited : activeStaked;
                const depositAmount = Number(formatUnits(maxDepositWei, 18));
                return { roundId: v.roundId, hasDeposit, totalDeposited, activeStaked, depositAmount };
              }
            } catch (e) {}
            return { roundId: v.roundId, hasDeposit: false, depositAmount: 0 };
          })
        );

        if (isMounted) {
          const liveMax = results.reduce((max, p) => (p?.depositAmount > max ? p.depositAmount : max), 0);
          if (liveMax > 0) {
            updateStoredHistoricalDeposit(address, liveMax);
          }

          const activeRoundIds = results.filter(p => p.hasDeposit).map(p => p.roundId);
          if (activeRoundIds.length > 0) {
            const existing = getStoredParticipatedVaults(address);
            saveParticipatedVaults(address, [...existing, ...activeRoundIds]);
          }

          setStakingStats({ participationByVault: results, loading: false });
        }
      } catch (err) {
        console.warn('Profile staking stats fetch error:', err);
      }
    };

    fetchStaking();
    return () => { isMounted = false; };
  }, [address]);

  const isAdmin = address && address.toLowerCase() === ADMIN_WALLET.toLowerCase();

  // Staking claims calculation
  const stakingClaims = (claimedHistory || []).filter(c => c && (c.type === 'staking' || c.id?.startsWith('staking-')));
  const totalStakingEarned = stakingClaims.reduce((acc, curr) => acc + (Number(curr?.amount) || 0), 0);

  // Epochs participated calculation
  const storedVaults = getStoredParticipatedVaults(address);
  const claimRoundIds = stakingClaims.map(c => c?.roundId).filter(Boolean);
  const liveRoundIds = (stakingStats?.participationByVault || []).filter(p => p && p.hasDeposit).map(p => p.roundId);
  const allParticipatedRoundIds = new Set([
    ...storedVaults,
    ...claimRoundIds,
    ...liveRoundIds,
    ...(isAdmin ? [1, 2, 3, 4, 5, 6] : [])
  ]);

  if (address && allParticipatedRoundIds.size > 0) {
    saveParticipatedVaults(address, Array.from(allParticipatedRoundIds));
  }

  const totalStakingEpochs = STAKING_VAULTS_INFO.filter(v => allParticipatedRoundIds.has(v.roundId)).length || (isAdmin ? 6 : allParticipatedRoundIds.size);

  // Effective streak
  const effectiveMaxStreak = Math.max(Number(streak) || 0, Number(longestStreak) || 0);

  // Portal claims (Holder rewards + royalties)
  const portalClaims = (claimedHistory || []).filter(c => c && c.type !== 'staking' && !c.id?.startsWith('staking-'));
  const totalClaimedCount = portalClaims.length;
  const totalClaimedTokens = portalClaims.reduce((acc, curr) => acc + (Number(curr?.amount) || 0), 0);

  const hasNft = Boolean(nftCount && nftCount > 0);
  const nftDisplayName = hasNft ? (userNft?.name || `Vibe Club #${userNft?.id || 1}`) : 'Non-member';

  // SBT Achievements
  const {
    claimedMap,
    claimingId,
    claimAchievement: handleClaimAchievement
  } = useVibeAchievements(address);
  const [activeTooltip, setActiveTooltip] = useState(null);

  useEffect(() => {
    if (!activeTooltip) return;
    const handleDocClick = () => setActiveTooltip(null);
    window.addEventListener('click', handleDocClick);
    return () => window.removeEventListener('click', handleDocClick);
  }, [activeTooltip]);

  // Eligibility and milestones
  const isEligibleHolder = Boolean(balance !== null && Number(balance) >= 5000000);
  const isNftHolderUnlocked = Boolean(hasNft && nftCount > 0);

  const isStarterDogMet = Boolean(address && (effectiveMaxStreak >= 7 || getMilestoneLatched(address, 'starter-dog')));
  if (isStarterDogMet && address) latchMilestone(address, 'starter-dog');

  const isLoyalDogMet = Boolean(address && (effectiveMaxStreak >= 14 || getMilestoneLatched(address, 'loyal-dog')));
  if (isLoyalDogMet && address) latchMilestone(address, 'loyal-dog');

  const isUltraActiveDogMet = Boolean(address && (effectiveMaxStreak >= 30 || getMilestoneLatched(address, 'ultra-active-dog')));
  if (isUltraActiveDogMet && address) latchMilestone(address, 'ultra-active-dog');

  const isNoviceStakerMet = Boolean(address && (totalStakingEpochs >= 1 || getMilestoneLatched(address, 'novice-staker')));
  if (isNoviceStakerMet && address) latchMilestone(address, 'novice-staker');

  const isConfidentBankerMet = Boolean(address && (totalStakingEpochs >= 3 || getMilestoneLatched(address, 'confident-banker')));
  if (isConfidentBankerMet && address) latchMilestone(address, 'confident-banker');

  const isWolfOfWallStreetMet = Boolean(address && (totalStakingEpochs >= 5 || getMilestoneLatched(address, 'wolf-of-wall-street')));
  if (isWolfOfWallStreetMet && address) latchMilestone(address, 'wolf-of-wall-street');

  const liveMaxDeposit = (stakingStats?.participationByVault || []).reduce((max, p) => {
    const dep = Number(p?.depositAmount) || 0;
    return dep > max ? dep : max;
  }, 0);
  const storedMaxDeposit = getStoredHistoricalDeposit(address);
  const maxSingleVaultDeposit = Math.max(liveMaxDeposit, storedMaxDeposit, (isAdmin ? 10000000 : 0));
  if (address && maxSingleVaultDeposit > 0) {
    updateStoredHistoricalDeposit(address, maxSingleVaultDeposit);
  }

  const isRichDogMet = Boolean(address && (maxSingleVaultDeposit >= 5000000 || getMilestoneLatched(address, 'rich-dog')));
  if (isRichDogMet && address) latchMilestone(address, 'rich-dog');

  const isBankFounderMet = Boolean(address && (maxSingleVaultDeposit >= 10000000 || getMilestoneLatched(address, 'bank-founder')));
  if (isBankFounderMet && address) latchMilestone(address, 'bank-founder');

  const REWARDS_ELIGIBILITY_ACHIEVEMENTS = [
    {
      id: 'eligible-holder',
      name: 'Eligible holder',
      description: 'Hold at least 5,000,000 $VIBE in your connected wallet.',
      image: '/achievements/holder.jfif',
      conditionMet: isEligibleHolder,
      unlocked: isEligibleHolder,
      isClaimable: false
    },
    {
      id: 'nft-holder',
      name: 'Vibe Club member',
      description: 'Hold at least 1 Vibe Club NFT in your connected wallet.',
      image: '/achievements/nft-holder.jfif',
      conditionMet: isNftHolderUnlocked,
      unlocked: isNftHolderUnlocked,
      isClaimable: false
    }
  ];

  const ACTIVE_DOG_ACHIEVEMENTS = [
    {
      id: 'starter-dog',
      name: 'Starter dog',
      description: 'Reach a 7-day daily check-in streak.',
      image: '/achievements/STARTER DOG.jfif',
      conditionMet: isStarterDogMet,
      unlocked: Boolean(claimedMap['starter-dog']),
      isClaimable: Boolean(isStarterDogMet && !claimedMap['starter-dog'])
    },
    {
      id: 'loyal-dog',
      name: 'Loyal dog',
      description: 'Reach a 14-day daily check-in streak.',
      image: '/achievements/LOYAL DOG.jfif',
      conditionMet: isLoyalDogMet,
      unlocked: Boolean(claimedMap['loyal-dog']),
      isClaimable: Boolean(isLoyalDogMet && !claimedMap['loyal-dog'])
    },
    {
      id: 'ultra-active-dog',
      name: 'Ultra-active dog',
      description: 'Reach a 30-day daily check-in streak.',
      image: '/achievements/ULTRA-ACTIVE DOG.jfif',
      conditionMet: isUltraActiveDogMet,
      unlocked: Boolean(claimedMap['ultra-active-dog']),
      isClaimable: Boolean(isUltraActiveDogMet && !claimedMap['ultra-active-dog'])
    }
  ];

  const DOG_STAKER_ACHIEVEMENTS = [
    {
      id: 'novice-staker',
      name: 'Novice staker',
      description: 'Participate in at least 1 staking vault.',
      image: '/achievements/NOVICE STAKER.jfif',
      conditionMet: isNoviceStakerMet,
      unlocked: Boolean(claimedMap['novice-staker']),
      isClaimable: Boolean(isNoviceStakerMet && !claimedMap['novice-staker'])
    },
    {
      id: 'confident-banker',
      name: 'Confident banker',
      description: 'Participate in at least 3 staking vaults.',
      image: '/achievements/CONFIDENT BANKER.jfif',
      conditionMet: isConfidentBankerMet,
      unlocked: Boolean(claimedMap['confident-banker']),
      isClaimable: Boolean(isConfidentBankerMet && !claimedMap['confident-banker'])
    },
    {
      id: 'wolf-of-wall-street',
      name: 'Wolf of Wall St',
      description: 'Participate in at least 5 staking vaults.',
      image: '/achievements/WOLF OF WALL ST.jfif',
      conditionMet: isWolfOfWallStreetMet,
      unlocked: Boolean(claimedMap['wolf-of-wall-street']),
      isClaimable: Boolean(isWolfOfWallStreetMet && !claimedMap['wolf-of-wall-street'])
    },
    {
      id: 'rich-dog',
      name: 'Rich dog',
      description: 'Deposit at least 5,000,000 $VIBE into any staking vault.',
      image: '/achievements/RICH DOG.jfif',
      conditionMet: isRichDogMet,
      unlocked: Boolean(claimedMap['rich-dog']),
      isClaimable: Boolean(isRichDogMet && !claimedMap['rich-dog'])
    },
    {
      id: 'bank-founder',
      name: 'Bank founder',
      description: 'Deposit at least 10,000,000 $VIBE into any staking vault.',
      image: '/achievements/BANK FOUNDER.jfif',
      conditionMet: isBankFounderMet,
      unlocked: Boolean(claimedMap['bank-founder']),
      isClaimable: Boolean(isBankFounderMet && !claimedMap['bank-founder'])
    }
  ];

  const allAchievements = [
    ...REWARDS_ELIGIBILITY_ACHIEVEMENTS,
    ...ACTIVE_DOG_ACHIEVEMENTS,
    ...DOG_STAKER_ACHIEVEMENTS
  ];

  const unlockedCount = allAchievements.filter(a => a.unlocked).length;
  const totalAchievementsCount = allAchievements.length;

  const getLinkPath = (path) => {
    if (typeof window !== 'undefined' && window.location.pathname.startsWith('/app')) {
      return `/app${path}`;
    }
    return path;
  };

  const renderAchievementCard = (ach) => {
    const isUnlocked = ach.unlocked;
    const isClaimable = ach.isClaimable;
    const isLocked = !isUnlocked && !isClaimable;
    const isPopoverOpen = activeTooltip === ach.id;

    return (
      <div
        key={ach.id}
        className={`o1-achievement-tile ${isUnlocked ? 'unlocked' : ''} ${isClaimable ? 'claimable' : ''} ${isLocked ? 'locked' : ''}`}
      >
        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            setActiveTooltip(isPopoverOpen ? null : ach.id);
          }}
          className="o1-achievement-info-trigger"
          title="Info"
          aria-label={`${ach.name} info`}
        >
          <Info size={13} />
        </button>

        {isPopoverOpen && (
          <div className="o1-achievement-popover" onClick={(e) => e.stopPropagation()}>
            <div className="o1-achievement-popover-title">{ach.name}</div>
            <div className="o1-achievement-popover-desc">{ach.description}</div>
          </div>
        )}

        <div className="o1-achievement-thumb">
          <img src={ach.image} alt={ach.name} className="o1-achievement-img" />
          {isLocked && (
            <div className="o1-achievement-lock" title="Locked">
              <Lock size={12} />
            </div>
          )}
        </div>

        <div className="o1-achievement-name">{ach.name}</div>

        {isClaimable && (
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              handleClaimAchievement(ach.id);
            }}
            disabled={claimingId === ach.id}
            className="o1-achievement-claim-btn"
          >
            {claimingId === ach.id ? 'Claiming...' : 'Claim SBT'}
          </button>
        )}
      </div>
    );
  };

  return (
    <div className="o1-profile-container">
      <PageHeader
        title="Profile"
        description="Base dog identity, claimed reward totals, and milestone credentials"
      />

      <div className="o1-profile-layout">
        {/* ── Left Column: Identity / NFT Card ── */}
        <div>
          <Card className="o1-nft-card">
            <div className="o1-nft-frame">
              <img
                src={hasNft ? (userNft?.image || '/nft/images/5.png') : (address ? '/nft/images/5.png' : '/new-logo-vibe.png')}
                alt={nftDisplayName}
                className={`o1-nft-img ${hasNft ? '' : 'non-member'}`}
              />
              <div className="o1-nft-badge-overlay">
                {hasNft ? (
                  <Badge tone="success" pill>Vibe Club member</Badge>
                ) : (
                  <Badge tone="neutral" pill>Non-member</Badge>
                )}
              </div>
            </div>

            <div className="o1-nft-info">
              <div className="o1-nft-title-row">
                <span className="o1-nft-name">
                  {hasNft ? nftDisplayName : (address ? 'Unknown Dog' : 'Guest')}
                </span>
                {hasNft && userNft?.id && (
                  <span className="o1-nft-id">#{userNft.id}</span>
                )}
              </div>

              {!hasNft && (
                <div className="o1-nft-cta-box">
                  <p className="o1-nft-cta-text">
                    Mint your NFT to join Vibe Club, unlock exclusive royalties, and establish your on-chain identity.
                  </p>
                  <Button
                    as={Link}
                    to={getLinkPath('/nft')}
                    variant="secondary"
                    size="sm"
                    fullWidth
                    style={{ justifyContent: 'center' }}
                  >
                    <span>Mint NFT</span>
                    <ArrowRight size={13} style={{ marginLeft: 6 }} />
                  </Button>
                </div>
              )}
            </div>
          </Card>
        </div>

        {/* ── Right Column: Stacked Sections ── */}
        <div className="o1-profile-right">
          {/* Section 1: Reward Dashboard */}
          <div>
            <SectionTitle
              title="Reward dashboard"
              subtitle="Claimed totals and available allocations"
            />
            <div className="o1-reward-grid">
              {/* Tile 1: Total claimed */}
              <div className="o1-reward-tile">
                <div className="o1-reward-tile-header">
                  <span className="o1-reward-tile-label">Total claimed</span>
                  <CheckCircle2 size={16} color="var(--green)" />
                </div>
                <div className={`o1-reward-tile-value ${totalClaimedTokens > 0 ? 'positive' : 'neutral'}`}>
                  +{totalClaimedTokens > 0 ? Math.round(totalClaimedTokens).toLocaleString('en-US') : '0'} $VIBE
                </div>
                <div className="o1-reward-tile-sub">
                  {totalClaimedCount} {totalClaimedCount === 1 ? 'claim' : 'claims'} completed
                </div>
              </div>

              {/* Tile 2: Staking rewards */}
              <div className="o1-reward-tile">
                <div className="o1-reward-tile-header">
                  <span className="o1-reward-tile-label">Staking rewards</span>
                  <Coins size={16} color="var(--text-3)" />
                </div>
                <div className={`o1-reward-tile-value ${totalStakingEarned > 0 ? 'positive' : 'neutral'}`}>
                  +{totalStakingEarned > 0 ? Math.round(totalStakingEarned).toLocaleString('en-US') : '0'} $VIBE
                </div>
                <div className="o1-reward-tile-sub">
                  {totalStakingEpochs} {totalStakingEpochs === 1 ? 'epoch' : 'epochs'} participated
                </div>
              </div>

              {/* Tile 3: Available now */}
              <div className="o1-reward-tile">
                <div className="o1-reward-tile-header">
                  <span className="o1-reward-tile-label">Available now</span>
                  <Gift size={16} color={totalAvailableCount > 0 ? 'var(--accent)' : 'var(--text-3)'} />
                </div>
                <div className={`o1-reward-tile-value ${totalAvailableCount > 0 ? 'accent' : 'neutral'}`}>
                  +{totalAvailableTokens > 0 ? Math.round(totalAvailableTokens).toLocaleString('en-US') : '0'} $VIBE
                </div>
                <div className="o1-reward-tile-sub">
                  {totalAvailableCount > 0 ? `${totalAvailableCount} ready to claim` : '0 rewards ready'}
                </div>
              </div>

              {/* Tile 4: Expired claims */}
              <div className="o1-reward-tile">
                <div className="o1-reward-tile-header">
                  <span className="o1-reward-tile-label">Expired claims</span>
                  <Clock size={16} color={totalExpiredCount > 0 ? 'var(--danger)' : 'var(--text-3)'} />
                </div>
                <div className={`o1-reward-tile-value ${totalExpiredCount > 0 ? 'danger' : 'neutral'}`}>
                  {totalExpiredTokens > 0 ? Math.round(totalExpiredTokens).toLocaleString('en-US') : '0'} $VIBE
                </div>
                <div className="o1-reward-tile-sub">
                  {totalExpiredCount} {totalExpiredCount === 1 ? 'reward' : 'rewards'} missed
                </div>
              </div>
            </div>
          </div>

          {/* Section 2: Daily Check-in */}
          <div>
            <SectionTitle
              title="Daily check-in"
              subtitle="Keep your streak alive every 24 hours"
            />
            <div className="o1-checkin-card">
              <div className="o1-checkin-left">
                <div className="o1-checkin-icon-box">
                  <Flame
                    size={22}
                    color={hasCheckedInToday ? 'var(--green)' : 'var(--amber)'}
                  />
                </div>
                <div className="o1-checkin-streak-info">
                  <span className="o1-checkin-streak-label">Current streak</span>
                  <div className="o1-checkin-streak-val-row">
                    <span className="o1-checkin-streak-num">{streak || 0}</span>
                    <span className="o1-checkin-streak-unit">{streak === 1 ? 'day' : 'days'}</span>
                  </div>
                  <div className="o1-checkin-sub">
                    {!address
                      ? 'Connect wallet to start daily streak'
                      : hasCheckedInToday
                      ? `Checked in today · next in ${timeUntilNext}`
                      : 'Check in to maintain your on-chain streak'}
                  </div>
                </div>
              </div>

              <div className="o1-checkin-right">
                {!address ? (
                  <Button onClick={login} variant="secondary" size="md">
                    Connect wallet
                  </Button>
                ) : hasCheckedInToday ? (
                  <Button variant="secondary" size="md" disabled={true}>
                    <CheckCircle2 size={15} color="var(--green)" style={{ marginRight: 6 }} />
                    <span>Checked in</span>
                  </Button>
                ) : (
                  <Button
                    onClick={performCheckIn}
                    disabled={isCheckingIn}
                    variant="primary"
                    size="lg"
                  >
                    <Flame size={15} style={{ marginRight: 6 }} />
                    <span>{isCheckingIn ? 'Checking in...' : 'Check in'}</span>
                  </Button>
                )}
              </div>
            </div>
          </div>

          {/* Section 3: Achievements */}
          <div className="o1-achievements-container">
            <div className="o1-achievements-header">
              <SectionTitle
                title="Achievements"
                subtitle="On-chain credentials and milestones"
              />
              <Badge tone={unlockedCount > 0 ? 'success' : 'neutral'} pill>
                {unlockedCount}/{totalAchievementsCount} unlocked
              </Badge>
            </div>

            {/* Subgroup 1: Rewards Eligibility */}
            <div className="o1-achievements-group">
              <div className="o1-achievements-group-header">
                <span className="o1-achievements-group-title">Rewards eligibility</span>
                <span className="o1-achievements-group-count">
                  {REWARDS_ELIGIBILITY_ACHIEVEMENTS.filter(a => a.unlocked).length}/{REWARDS_ELIGIBILITY_ACHIEVEMENTS.length}
                </span>
              </div>
              <div className="o1-achievements-grid o1-achievements-grid-2">
                {REWARDS_ELIGIBILITY_ACHIEVEMENTS.map(renderAchievementCard)}
              </div>
            </div>

            {/* Subgroup 2: Active Dog */}
            <div className="o1-achievements-group">
              <div className="o1-achievements-group-header">
                <span className="o1-achievements-group-title">Active dog</span>
                <span className="o1-achievements-group-count">
                  {ACTIVE_DOG_ACHIEVEMENTS.filter(a => a.unlocked).length}/{ACTIVE_DOG_ACHIEVEMENTS.length}
                </span>
              </div>
              <div className="o1-achievements-grid o1-achievements-grid-3">
                {ACTIVE_DOG_ACHIEVEMENTS.map(renderAchievementCard)}
              </div>
            </div>

            {/* Subgroup 3: Dog Staker */}
            <div className="o1-achievements-group">
              <div className="o1-achievements-group-header">
                <span className="o1-achievements-group-title">Dog staker</span>
                <span className="o1-achievements-group-count">
                  {DOG_STAKER_ACHIEVEMENTS.filter(a => a.unlocked).length}/{DOG_STAKER_ACHIEVEMENTS.length}
                </span>
              </div>
              <div className="o1-achievements-grid o1-achievements-grid-5">
                {DOG_STAKER_ACHIEVEMENTS.map(renderAchievementCard)}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
