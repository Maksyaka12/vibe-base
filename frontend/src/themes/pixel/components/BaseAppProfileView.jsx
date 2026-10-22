import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { CheckCircle2, Gift, Clock, Coins, ArrowRight, Flame } from 'lucide-react';
import { formatUnits } from 'viem';
import { getPublicClient } from '../../../config/rpc';
import { STAKING_CONTRACT, STAKING_VAULTS_INFO } from '../Checker';
import { useVibeCheckIn } from '../../../hooks/useVibeCheckIn';
import { useVibeAchievements } from '../../../hooks/useVibeAchievements';

function InfoSvgIcon({ size = 14, color = '#00f5ff', className = '' }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
      style={{ display: 'block', flexShrink: 0 }}
    >
      <circle cx="12" cy="12" r="10" stroke={color} strokeWidth="2.2" fill="rgba(0, 245, 255, 0.15)" />
      <path
        d="M9.6 9a2.4 2.4 0 0 1 4.8 0c0 1.5-2.4 2-2.4 3.5"
        stroke={color}
        strokeWidth="2.3"
        strokeLinecap="round"
      />
      <circle cx="12" cy="16.5" r="1.3" fill={color} />
    </svg>
  );
}

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
    const key = `vibe_participated_vaults_v2_${addr.toLowerCase()}`;
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
    const key = `vibe_participated_vaults_v2_${addr.toLowerCase()}`;
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
    loading,
    fetchBalances,
    claimedHistory,
    isHolderEligibleLive,
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
    canCheckInToday,
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

          setStakingStats({ owner: address.toLowerCase(), participationByVault: results, loading: false });
        }
      } catch (err) {
        console.warn('Profile staking stats fetch error:', err);
      }
    };

    fetchStaking();
    return () => { isMounted = false; };
  }, [address]);

  const isAdmin = address && address.toLowerCase() === ADMIN_WALLET.toLowerCase();
  // After a wallet switch the previous wallet's vault reads are still in state until the new ones arrive.
  const ownStakingStats = address && stakingStats.owner === address.toLowerCase() ? stakingStats : { participationByVault: [] };

  // Exact Staking Rewards: sum of user's claimed rewards from Staking claims
  const stakingClaims = (claimedHistory || []).filter(c => c && (c.type === 'staking' || c.id?.startsWith('staking-')));
  const totalStakingEarned = stakingClaims.reduce((acc, curr) => acc + (Number(curr?.amount) || 0), 0);

  // Epochs participated: count of vaults where user either has on-chain stake or has a claim
  const storedVaults = getStoredParticipatedVaults(address);
  const claimRoundIds = stakingClaims.map(c => c?.roundId).filter(Boolean);
  const liveRoundIds = (ownStakingStats.participationByVault || []).filter(p => p && p.hasDeposit).map(p => p.roundId);
  const allParticipatedRoundIds = new Set([
    ...storedVaults,
    ...claimRoundIds,
    ...liveRoundIds,
  ]);

  const totalStakingEpochs = STAKING_VAULTS_INFO.filter(v => allParticipatedRoundIds.has(v.roundId)).length || allParticipatedRoundIds.size;

  // Maximum deposit amount into any single vault (in whole VIBE tokens) - permanently latched
  const liveMaxDeposit = (ownStakingStats.participationByVault || []).reduce((max, p) => {
    const dep = Number(p?.depositAmount) || 0;
    return dep > max ? dep : max;
  }, 0);

  const storedMaxDeposit = getStoredHistoricalDeposit(address);
  const maxSingleVaultDeposit = Math.max(liveMaxDeposit, storedMaxDeposit);

  if (address && maxSingleVaultDeposit > 0) {
    updateStoredHistoricalDeposit(address, maxSingleVaultDeposit);
  }

  // Effective streak considering on-chain longest streak and current streak
  const effectiveMaxStreak = Math.max(Number(streak) || 0, Number(longestStreak) || 0);

  // Portal Claimed (ONLY Holder Rewards & Vibe Club Royalties, Staking is counted separately in Tile 4)
  const portalClaims = (claimedHistory || []).filter(c => c && c.type !== 'staking' && !c.id?.startsWith('staking-'));
  const totalClaimedCount = portalClaims.length;
  const totalClaimedTokens = portalClaims.reduce((acc, curr) => acc + (Number(curr?.amount) || 0), 0);
  const hasNft = Boolean(nftCount && nftCount > 0);
  const nftDisplayName = hasNft ? (userNft?.name || `Vibe Club #${userNft?.id || 1}`) : 'Unknown Dog';

  // On-Chain Claimed state management for Active Dog & Dog Staker achievements (SBT)
  const {
    claimedMap,
    claimableMap,
    progress: achievementProgress,
    claimingId,
    claimAchievement: handleClaimAchievement
  } = useVibeAchievements(address);
  // Staking epochs joined: deposits seen by the achievements contract (kept after withdrawal) or staking claims
  const stakingEpochsShown = Math.max(totalStakingEpochs, achievementProgress.vaultsJoined || 0);
  const [activeAchievementTooltip, setActiveAchievementTooltip] = useState(null);

  useEffect(() => {
    if (!activeAchievementTooltip) return;
    const handleDocClick = () => setActiveAchievementTooltip(null);
    window.addEventListener('click', handleDocClick);
    return () => window.removeEventListener('click', handleDocClick);
  }, [activeAchievementTooltip]);

  // Dynamic achievement unlock calculations
  // 1. REWARDS ELIGIBILITY (Auto-unlocked & auto-highlighted)
  const isEligibleHolder = Boolean(balance !== null && Number(balance) >= 5000000);
  const isNftHolderUnlocked = Boolean(hasNft && nftCount > 0);

  // 2. ACTIVE DOG (Streak check-in rules: 7, 14, 30 days) - permanently latched once met
  const isStarterDogMet = Boolean(address && (claimedMap['starter-dog'] || claimableMap['starter-dog'])); // checked by the contract

  const isLoyalDogMet = Boolean(address && (claimedMap['loyal-dog'] || claimableMap['loyal-dog'])); // checked by the contract

  const isUltraActiveDogMet = Boolean(address && (claimedMap['ultra-active-dog'] || claimableMap['ultra-active-dog'])); // checked by the contract

  // 3. DOG STAKER (1, 3, 5 vaults, or single deposit 5M+ / 10M+ VIBE) - permanently latched once met
  const isNoviceStakerMet = Boolean(address && (claimedMap['novice-staker'] || claimableMap['novice-staker'])); // checked by the contract

  const isConfidentBankerMet = Boolean(address && (claimedMap['confident-banker'] || claimableMap['confident-banker'])); // checked by the contract

  const isWolfOfWallStreetMet = Boolean(address && (claimedMap['wolf-of-wall-street'] || claimableMap['wolf-of-wall-street'])); // checked by the contract

  const isRichDogMet = Boolean(address && (claimedMap['rich-dog'] || claimableMap['rich-dog'])); // checked by the contract

  const isBankFounderMet = Boolean(address && (claimedMap['bank-founder'] || claimableMap['bank-founder'])); // checked by the contract

  const REWARDS_ELIGIBILITY_ACHIEVEMENTS = [
    {
      id: 'eligible-holder',
      name: 'ELIGIBLE HOLDER',
      description: 'Hold at least 5,000,000 $VIBE in your connected wallet.',
      image: '/achievements/holder.jfif',
      conditionMet: isEligibleHolder,
      unlocked: isEligibleHolder,
      isClaimable: false
    },
    {
      id: 'nft-holder',
      name: 'VIBE CLUB MEMBER',
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
      name: 'STARTER DOG',
      description: 'Reach a 7-day daily check-in streak.',
      image: '/achievements/STARTER DOG.jfif',
      conditionMet: isStarterDogMet,
      unlocked: Boolean(claimedMap['starter-dog']),
      isClaimable: Boolean(isStarterDogMet && !claimedMap['starter-dog'])
    },
    {
      id: 'loyal-dog',
      name: 'LOYAL DOG',
      description: 'Reach a 14-day daily check-in streak.',
      image: '/achievements/LOYAL DOG.jfif',
      conditionMet: isLoyalDogMet,
      unlocked: Boolean(claimedMap['loyal-dog']),
      isClaimable: Boolean(isLoyalDogMet && !claimedMap['loyal-dog'])
    },
    {
      id: 'ultra-active-dog',
      name: 'ULTRA-ACTIVE DOG',
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
      name: 'NOVICE STAKER',
      description: 'Participate in at least 1 staking vault.',
      image: '/achievements/NOVICE STAKER.jfif',
      conditionMet: isNoviceStakerMet,
      unlocked: Boolean(claimedMap['novice-staker']),
      isClaimable: Boolean(isNoviceStakerMet && !claimedMap['novice-staker'])
    },
    {
      id: 'confident-banker',
      name: 'CONFIDENT BANKER',
      description: 'Participate in at least 3 staking vaults.',
      image: '/achievements/CONFIDENT BANKER.jfif',
      conditionMet: isConfidentBankerMet,
      unlocked: Boolean(claimedMap['confident-banker']),
      isClaimable: Boolean(isConfidentBankerMet && !claimedMap['confident-banker'])
    },
    {
      id: 'wolf-of-wall-street',
      name: 'WOLF OF WALL ST',
      description: 'Participate in at least 5 staking vaults.',
      image: '/achievements/WOLF OF WALL ST.jfif',
      conditionMet: isWolfOfWallStreetMet,
      unlocked: Boolean(claimedMap['wolf-of-wall-street']),
      isClaimable: Boolean(isWolfOfWallStreetMet && !claimedMap['wolf-of-wall-street'])
    },
    {
      id: 'rich-dog',
      name: 'RICH DOG',
      description: 'Have at least 5,000,000 $VIBE staked in one staking vault when you claim.',
      image: '/achievements/RICH DOG.jfif',
      conditionMet: isRichDogMet,
      unlocked: Boolean(claimedMap['rich-dog']),
      isClaimable: Boolean(isRichDogMet && !claimedMap['rich-dog'])
    },
    {
      id: 'bank-founder',
      name: 'BANK FOUNDER',
      description: 'Have at least 10,000,000 $VIBE staked in one staking vault when you claim.',
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

  return (
    <div className="profile-view-container" style={{ width: '100%', boxSizing: 'border-box' }}>
      {/* ── 1. MODERN PROFILE HERO HEADER ── */}
      <div
        className="rewards-hero-header"
        style={{
          width: '100%',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          textAlign: 'center',
          marginBottom: '22px',
          padding: '12px 8px 8px 8px'
        }}
      >
        <h2
          className="rewards-hero-title"
          style={{
            fontSize: '18px',
            margin: '0 0 12px 0',
            letterSpacing: '0.6px',
            color: '#ffffff',
            fontFamily: "'Press Start 2P', monospace",
            textAlign: 'center',
            width: '100%',
            lineHeight: 1.3
          }}
        >
          USER <span style={{ color: '#00f5ff' }}>PROFILE</span>
        </h2>

        {/* Subtitle Status Pill */}
        <div
          className="rewards-hero-pill"
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: '8px',
            background: 'rgba(0, 245, 255, 0.08)',
            border: '1.5px solid rgba(0, 245, 255, 0.35)',
            borderRadius: '99px',
            padding: '7px 16px',
            maxWidth: '100%',
            boxSizing: 'border-box'
          }}
        >
          <span style={{ width: '6px', height: '6px', borderRadius: '50%', background: '#00ff88', boxShadow: '0 0 8px #00ff88', flexShrink: 0 }} />
          <span className="rewards-hero-pill-text" style={{ fontSize: '6.5px', color: '#00f5ff', letterSpacing: '0.5px', fontFamily: "'Press Start 2P', monospace", fontWeight: 800, textAlign: 'center', lineHeight: 1.4 }}>
            BASE DOG IDENTITY &amp; DASHBOARD
          </span>
        </div>
      </div>

      {/* ── 2. USER PROFILE CARD (FULL HEIGHT NFT IMAGE + CLEAN RIGHT INFO) ── */}
      {!address ? (
        <div
          className="profile-user-card profile-connect-card"
          style={{
            background: 'linear-gradient(180deg, rgba(6, 26, 60, 0.95) 0%, rgba(2, 11, 26, 0.98) 100%)',
            border: '1.5px solid rgba(0, 245, 255, 0.3)',
            borderRadius: '18px',
            padding: '28px 16px',
            textAlign: 'center',
            marginBottom: '24px',
            boxShadow: '0 8px 24px rgba(0, 0, 0, 0.7)'
          }}
        >
          <div
            className="profile-avatar-box"
            style={{
              width: '84px',
              height: '84px',
              margin: '0 auto 16px auto',
              borderRadius: '16px',
              border: '2px solid rgba(0, 245, 255, 0.5)',
              overflow: 'hidden',
              background: '#020b1a',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              boxShadow: '0 0 20px rgba(0, 245, 255, 0.35)'
            }}
          >
            <img src="/new-logo-vibe.png" alt="Vibe" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
          </div>
          <div className="profile-connect-title" style={{ fontSize: '10px', color: '#ffffff', fontFamily: "'Press Start 2P', monospace", marginBottom: '8px', fontWeight: 900 }}>
            CONNECT YOUR WALLET
          </div>
          <p className="profile-connect-desc" style={{ fontSize: '7px', color: '#88aacc', fontFamily: "'Press Start 2P', monospace", lineHeight: 1.6, margin: '0 0 18px 0' }}>
            Connect to view your identity, holding balances and Vibe Club status.
          </p>
          <button
            onClick={login}
            className="profile-connect-btn"
            style={{
              background: 'linear-gradient(135deg, #00f5ff 0%, #00b8ff 100%)',
              border: '1.5px solid #00f5ff',
              color: '#020b1a',
              fontFamily: "'Press Start 2P', monospace",
              fontSize: '8.5px',
              fontWeight: 900,
              padding: '12px 24px',
              borderRadius: '12px',
              cursor: 'pointer',
              boxShadow: '0 0 18px rgba(0, 245, 255, 0.45)',
              display: 'inline-flex',
              alignItems: 'center',
              gap: '8px'
            }}
          >
            CONNECT WALLET ↗
          </button>
        </div>
      ) : (
        <div className="profile-user-card profile-connected-card">
          {/* Main NFT Card Frame (Identical to Vibe Club NFT section) */}
          <div className="profile-nft-card-frame">
            <img
              src={hasNft ? (userNft?.image || '/nft/images/5.png') : '/new-logo-vibe.png'}
              alt={nftDisplayName}
              className="profile-nft-main-img"
              style={{
                filter: hasNft ? 'none' : 'grayscale(1) brightness(0.7)'
              }}
            />

            {/* Top-left floating status badge (Green for Vibe Club Member, Orange for Unknown Dog) */}
            {hasNft ? (
              <div className="profile-nft-member-badge member-green">
                <span className="profile-nft-member-badge-dot member-green-dot" />
                <span>VIBE CLUB MEMBER</span>
              </div>
            ) : (
              <div className="profile-nft-member-badge member-orange">
                <span className="profile-nft-member-badge-dot member-orange-dot" />
                <span>UNKNOWN DOG</span>
              </div>
            )}

            {/* Bottom badge: NFT name if holder, or interactive MINT & JOIN CTA if non-holder */}
            {hasNft ? (
              <div className="profile-nft-name-badge">
                <span>{nftDisplayName.toUpperCase()}</span>
              </div>
            ) : (
              <Link to={getLinkPath('/nft')} className="profile-nft-name-badge profile-nft-mint-cta-badge mint-orange">
                <span>MINT YOUR NFT &amp; JOIN VIBE CLUB</span>
                <ArrowRight size={11} strokeWidth={2.5} className="profile-mint-arrow-icon mint-orange-arrow" />
              </Link>
            )}
          </div>

          {/* Desktop Right Column: Reward Dashboard + Daily Check-In with Section Headers */}
          <div className="profile-desktop-dashboard-panel">
            <div className="profile-card-dashboard-section">
              <div className="profile-card-dashboard-header">
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <span className="profile-section-dot" style={{ width: '8px', height: '8px', borderRadius: '50%', background: '#00f5ff', boxShadow: '0 0 8px #00f5ff', flexShrink: 0, display: 'inline-block' }} />
                  <h3 className="profile-section-title" style={{ fontSize: '12px', color: '#ffffff', fontFamily: "'Press Start 2P', monospace", margin: 0, fontWeight: 900, lineHeight: 1 }}>
                    REWARD DASHBOARD
                  </h3>
                </div>
              </div>

              <div className="profile-dashboard-grid-2x2">
                {/* Tile 1: Total Claimed (Green) */}
                <div
                  className="profile-stat-card profile-stat-card-claimed"
                  style={{
                    background: 'rgba(4, 20, 48, 0.9)',
                    border: '1.5px solid rgba(0, 255, 136, 0.35)',
                    borderRadius: '14px',
                    display: 'flex',
                    flexDirection: 'column',
                    justifyContent: 'space-between',
                    gap: '8px',
                    boxShadow: '0 4px 16px rgba(0, 0, 0, 0.5)'
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                    <span className="profile-stat-label" style={{ color: '#00ff88', fontFamily: "'Press Start 2P', monospace", fontWeight: 900 }}>
                      TOTAL CLAIMED
                    </span>
                    <CheckCircle2 size={16} color="#00ff88" className="profile-stat-icon" />
                  </div>
                  <div>
                    <div className="profile-stat-val" style={{ color: '#00ff88', fontFamily: "'Press Start 2P', monospace", fontWeight: 900, marginBottom: '4px', textShadow: '0 0 8px rgba(0, 255, 136, 0.3)' }}>
                      +{totalClaimedTokens > 0 ? Math.round(totalClaimedTokens).toLocaleString('en-US') : '0'} $VIBE
                    </div>
                    <div className="profile-stat-sub" style={{ color: '#88aacc', fontFamily: "'Press Start 2P', monospace" }}>
                      {totalClaimedCount} {totalClaimedCount === 1 ? 'CLAIM' : 'CLAIMS'} COMPLETED
                    </div>
                  </div>
                </div>

                {/* Tile 2: Staking Rewards (Signature Staking Purple) */}
                <div
                  className="profile-stat-card profile-stat-card-staking"
                  style={{
                    background: 'rgba(4, 20, 48, 0.9)',
                    border: totalStakingEarned > 0 ? '1.5px solid #a855f7' : '1.5px solid rgba(168, 85, 247, 0.35)',
                    borderRadius: '14px',
                    display: 'flex',
                    flexDirection: 'column',
                    justifyContent: 'space-between',
                    gap: '8px',
                    boxShadow: totalStakingEarned > 0 ? '0 0 16px rgba(168, 85, 247, 0.25)' : '0 4px 16px rgba(0, 0, 0, 0.5)'
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                    <span className="profile-stat-label" style={{ color: '#c084fc', fontFamily: "'Press Start 2P', monospace", fontWeight: 900 }}>
                      STAKING REWARDS
                    </span>
                    <Coins size={16} color="#c084fc" className="profile-stat-icon" />
                  </div>
                  <div>
                    <div className="profile-stat-val" style={{ color: '#c084fc', fontFamily: "'Press Start 2P', monospace", fontWeight: 900, marginBottom: '4px', textShadow: '0 0 8px rgba(168, 85, 247, 0.35)' }}>
                      +{totalStakingEarned > 0 ? Math.round(totalStakingEarned).toLocaleString('en-US') : '0'} $VIBE
                    </div>
                    <div className="profile-stat-sub" style={{ color: totalStakingEpochs > 0 ? '#d8b4fe' : '#88aacc', fontFamily: "'Press Start 2P', monospace" }}>
                      {stakingEpochsShown} {stakingEpochsShown === 1 ? 'EPOCH' : 'EPOCHS'} PARTICIPATED
                    </div>
                  </div>
                </div>

                {/* Tile 3: Available to Claim (Cyan) */}
                <div
                  className="profile-stat-card profile-stat-card-available"
                  style={{
                    background: 'rgba(4, 20, 48, 0.9)',
                    border: totalAvailableCount > 0 ? '1.5px solid #00f5ff' : '1.5px solid rgba(0, 245, 255, 0.25)',
                    borderRadius: '14px',
                    display: 'flex',
                    flexDirection: 'column',
                    justifyContent: 'space-between',
                    gap: '8px',
                    boxShadow: totalAvailableCount > 0 ? '0 0 16px rgba(0, 245, 255, 0.2)' : '0 4px 16px rgba(0, 0, 0, 0.5)'
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                    <span className="profile-stat-label" style={{ color: '#00f5ff', fontFamily: "'Press Start 2P', monospace", fontWeight: 900 }}>
                      AVAILABLE NOW
                    </span>
                    <Gift size={16} color="#00f5ff" className="profile-stat-icon" />
                  </div>
                  <div>
                    <div className="profile-stat-val" style={{ color: totalAvailableCount > 0 ? '#00f5ff' : '#88aacc', fontFamily: "'Press Start 2P', monospace", fontWeight: 900, marginBottom: '4px', textShadow: totalAvailableCount > 0 ? '0 0 8px rgba(0, 245, 255, 0.35)' : 'none' }}>
                      +{totalAvailableTokens > 0 ? Math.round(totalAvailableTokens).toLocaleString('en-US') : '0'} $VIBE
                    </div>
                    <div className="profile-stat-sub" style={{ color: totalAvailableCount > 0 ? '#00ff88' : '#88aacc', fontFamily: "'Press Start 2P', monospace" }}>
                      {totalAvailableCount} {totalAvailableCount === 1 ? 'REWARD' : 'REWARDS'} READY
                    </div>
                  </div>
                </div>

                {/* Tile 4: Expired Claims (Red/Muted) */}
                <div
                  className="profile-stat-card profile-stat-card-expired"
                  style={{
                    background: 'rgba(4, 20, 48, 0.9)',
                    border: totalExpiredCount > 0 ? '1.5px solid rgba(255, 68, 102, 0.5)' : '1.5px solid rgba(0, 245, 255, 0.2)',
                    borderRadius: '14px',
                    display: 'flex',
                    flexDirection: 'column',
                    justifyContent: 'space-between',
                    gap: '8px',
                    boxShadow: '0 4px 16px rgba(0, 0, 0, 0.5)'
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                    <span className="profile-stat-label" style={{ color: totalExpiredCount > 0 ? '#ff4466' : '#88aacc', fontFamily: "'Press Start 2P', monospace", fontWeight: 900 }}>
                      EXPIRED CLAIMS
                    </span>
                    <Clock size={16} color={totalExpiredCount > 0 ? '#ff4466' : '#88aacc'} className="profile-stat-icon" />
                  </div>
                  <div>
                    <div className="profile-stat-val" style={{ color: totalExpiredCount > 0 ? '#ff4466' : '#88aacc', fontFamily: "'Press Start 2P', monospace", fontWeight: 900, marginBottom: '4px' }}>
                      {totalExpiredTokens > 0 ? `${Math.round(totalExpiredTokens).toLocaleString('en-US')}` : '0'} $VIBE
                    </div>
                    <div className="profile-stat-sub" style={{ color: '#88aacc', fontFamily: "'Press Start 2P', monospace" }}>
                      {totalExpiredCount} {totalExpiredCount === 1 ? 'REWARD' : 'REWARDS'} MISSED
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Desktop Embedded Daily Check-In Section with Header */}
            <div className="profile-card-checkin-section">
              <div className="profile-card-checkin-header">
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <span className="profile-section-dot" style={{ width: '8px', height: '8px', borderRadius: '50%', background: hasCheckedInToday ? '#00ff88' : '#ffaa00', boxShadow: hasCheckedInToday ? '0 0 8px #00ff88' : '0 0 8px #ffaa00', flexShrink: 0, display: 'inline-block' }} />
                  <h3 className="profile-section-title" style={{ fontSize: '12px', color: '#ffffff', fontFamily: "'Press Start 2P', monospace", margin: 0, fontWeight: 900, lineHeight: 1 }}>
                    DAILY CHECK-IN
                  </h3>
                </div>
              </div>

              <div className="profile-dashboard-grid-checkin">
                {/* Tile 1: Current Streak (Clean High Web3 Card) */}
                <div
                  className={`profile-checkin-streak-box ${hasCheckedInToday ? 'checked-in' : ''}`}
                >
                  <div className="profile-checkin-streak-label">
                    CURRENT STREAK:
                  </div>
                  <div className="profile-checkin-streak-val-wrap">
                    <div className="profile-checkin-streak-val">
                      <span className="profile-checkin-streak-num">{streak}</span>
                      <span className="profile-checkin-streak-unit">{streak === 1 ? 'DAY' : 'DAYS'}</span>
                    </div>
                  </div>
                </div>

                {/* Tile 2: Check-In Action Button (Entire Plate is a stylish Web3 Button) */}
                {!address ? (
                  <button
                    onClick={login}
                    className="profile-checkin-big-btn connect-mode"
                  >
                    <span>CONNECT WALLET</span>
                  </button>
                ) : hasCheckedInToday ? (
                  <div
                    className="profile-checkin-big-btn checked-mode"
                    title={`Next check-in resets at 00:00 UTC (in ${timeUntilNext})`}
                  >
                    <div className="profile-checkin-big-btn-title">
                      <CheckCircle2 size={16} color="#00ff88" strokeWidth={2.5} style={{ flexShrink: 0 }} />
                      <span>CHECKED IN TODAY</span>
                    </div>
                    <div className="profile-checkin-big-btn-timer">NEXT IN {timeUntilNext}</div>
                  </div>
                ) : (
                  <button
                    onClick={performCheckIn}
                    disabled={isCheckingIn}
                    className="profile-checkin-big-btn active-mode"
                  >
                    <span>{isCheckingIn ? 'CHECKING...' : 'CHECK-IN'}</span>
                  </button>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ── 3. REWARD DASHBOARD ZONE (MOBILE ONLY - ON DESKTOP IT IS IN THE USER CARD) ── */}
      <div className="profile-dashboard-zone profile-dashboard-zone-mobile-only" style={{ marginBottom: '24px' }}>
        <div className="profile-section-header" style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '12px' }}>
          <span className="profile-section-dot" style={{ width: '8px', height: '8px', borderRadius: '50%', background: '#00f5ff', boxShadow: '0 0 8px #00f5ff', flexShrink: 0, display: 'inline-block' }} />
          <h3 className="profile-section-title" style={{ fontSize: '10px', color: '#ffffff', fontFamily: "'Press Start 2P', monospace", margin: 0, fontWeight: 900, lineHeight: 1 }}>
            REWARD DASHBOARD
          </h3>
        </div>

        <div className="profile-stat-grid" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
          {/* Tile 1: Total Claimed (Green) */}
          <div
            className="profile-stat-card"
            style={{
              background: 'rgba(4, 20, 48, 0.9)',
              border: '1px solid rgba(0, 255, 136, 0.35)',
              borderRadius: '14px',
              padding: '12px 10px',
              display: 'flex',
              flexDirection: 'column',
              justifyContent: 'space-between',
              gap: '6px',
              boxShadow: '0 4px 16px rgba(0, 0, 0, 0.5)'
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <span className="profile-stat-label" style={{ fontSize: '6px', color: '#00ff88', fontFamily: "'Press Start 2P', monospace", fontWeight: 900 }}>
                TOTAL CLAIMED
              </span>
              <CheckCircle2 size={13} color="#00ff88" className="profile-stat-icon" />
            </div>
            <div>
              <div className="profile-stat-val" style={{ fontSize: '9px', color: '#00ff88', fontFamily: "'Press Start 2P', monospace", fontWeight: 900, marginBottom: '3px', textShadow: '0 0 8px rgba(0, 255, 136, 0.3)' }}>
                +{totalClaimedTokens > 0 ? Math.round(totalClaimedTokens).toLocaleString('en-US') : '0'} $VIBE
              </div>
              <div className="profile-stat-sub" style={{ fontSize: '5.5px', color: '#88aacc', fontFamily: "'Press Start 2P', monospace" }}>
                {totalClaimedCount} {totalClaimedCount === 1 ? 'CLAIM' : 'CLAIMS'} COMPLETED
              </div>
            </div>
          </div>

          {/* Tile 2: Staking Rewards (Signature Staking Purple) */}
          <div
            className="profile-stat-card"
            style={{
              background: 'rgba(4, 20, 48, 0.9)',
              border: totalStakingEarned > 0 ? '1.5px solid #a855f7' : '1px solid rgba(168, 85, 247, 0.35)',
              borderRadius: '14px',
              padding: '12px 10px',
              display: 'flex',
              flexDirection: 'column',
              justifyContent: 'space-between',
              gap: '6px',
              boxShadow: totalStakingEarned > 0 ? '0 0 16px rgba(168, 85, 247, 0.25)' : '0 4px 16px rgba(0, 0, 0, 0.5)'
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <span className="profile-stat-label" style={{ fontSize: '6px', color: '#c084fc', fontFamily: "'Press Start 2P', monospace", fontWeight: 900 }}>
                STAKING REWARDS
              </span>
              <Coins size={13} color="#c084fc" className="profile-stat-icon" />
            </div>
            <div>
              <div className="profile-stat-val" style={{ fontSize: '9px', color: '#c084fc', fontFamily: "'Press Start 2P', monospace", fontWeight: 900, marginBottom: '3px', textShadow: '0 0 8px rgba(168, 85, 247, 0.35)' }}>
                +{totalStakingEarned > 0 ? Math.round(totalStakingEarned).toLocaleString('en-US') : '0'} $VIBE
              </div>
              <div className="profile-stat-sub" style={{ fontSize: '5.5px', color: totalStakingEpochs > 0 ? '#d8b4fe' : '#88aacc', fontFamily: "'Press Start 2P', monospace" }}>
                {stakingEpochsShown} {stakingEpochsShown === 1 ? 'EPOCH' : 'EPOCHS'} PARTICIPATED
              </div>
            </div>
          </div>

          {/* Tile 3: Available to Claim (Cyan) */}
          <div
            className="profile-stat-card"
            style={{
              background: 'rgba(4, 20, 48, 0.9)',
              border: totalAvailableCount > 0 ? '1.5px solid #00ff88' : '1px solid rgba(0, 245, 255, 0.25)',
              borderRadius: '14px',
              padding: '12px 10px',
              display: 'flex',
              flexDirection: 'column',
              justifyContent: 'space-between',
              gap: '6px',
              boxShadow: totalAvailableCount > 0 ? '0 0 16px rgba(0, 245, 255, 0.2)' : '0 4px 16px rgba(0, 0, 0, 0.5)'
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <span className="profile-stat-label" style={{ fontSize: '6px', color: '#00ff88', fontFamily: "'Press Start 2P', monospace", fontWeight: 900 }}>
                AVAILABLE NOW
              </span>
              <Gift size={13} color="#00ff88" className="profile-stat-icon" />
            </div>
            <div>
              <div className="profile-stat-val" style={{ fontSize: '9px', color: totalAvailableCount > 0 ? '#00ff88' : '#88aacc', fontFamily: "'Press Start 2P', monospace", fontWeight: 900, marginBottom: '3px', textShadow: totalAvailableCount > 0 ? '0 0 8px rgba(0, 255, 136, 0.35)' : 'none' }}>
                +{totalAvailableTokens > 0 ? Math.round(totalAvailableTokens).toLocaleString('en-US') : '0'} $VIBE
              </div>
              <div className="profile-stat-sub" style={{ fontSize: '5.5px', color: totalAvailableCount > 0 ? '#00ff88' : '#88aacc', fontFamily: "'Press Start 2P', monospace" }}>
                {totalAvailableCount} {totalAvailableCount === 1 ? 'REWARD' : 'REWARDS'} READY
              </div>
            </div>
          </div>

          {/* Tile 4: Expired Claims (Red/Muted) */}
          <div
            className="profile-stat-card"
            style={{
              background: 'rgba(4, 20, 48, 0.9)',
              border: totalExpiredCount > 0 ? '1.5px solid rgba(255, 68, 102, 0.5)' : '1px solid rgba(0, 245, 255, 0.2)',
              borderRadius: '14px',
              padding: '12px 10px',
              display: 'flex',
              flexDirection: 'column',
              justifyContent: 'space-between',
              gap: '6px',
              boxShadow: '0 4px 16px rgba(0, 0, 0, 0.5)'
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <span className="profile-stat-label" style={{ fontSize: '6px', color: totalExpiredCount > 0 ? '#ff4466' : '#88aacc', fontFamily: "'Press Start 2P', monospace", fontWeight: 900 }}>
                EXPIRED CLAIMS
              </span>
              <Clock size={13} color={totalExpiredCount > 0 ? '#ff4466' : '#88aacc'} className="profile-stat-icon" />
            </div>
            <div>
              <div className="profile-stat-val" style={{ fontSize: '9px', color: totalExpiredCount > 0 ? '#ff4466' : '#88aacc', fontFamily: "'Press Start 2P', monospace", fontWeight: 900, marginBottom: '3px' }}>
                {totalExpiredTokens > 0 ? `${Math.round(totalExpiredTokens).toLocaleString('en-US')}` : '0'} $VIBE
              </div>
              <div className="profile-stat-sub" style={{ fontSize: '5.5px', color: '#88aacc', fontFamily: "'Press Start 2P', monospace" }}>
                {totalExpiredCount} {totalExpiredCount === 1 ? 'REWARD' : 'REWARDS'} MISSED
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* ── 4. DAILY CHECK-IN & STREAK ZONE (MOBILE ONLY - EMBEDDED IN USER CARD ON DESKTOP) ── */}
      <div className="profile-checkin-zone profile-checkin-zone-mobile-only" style={{ marginBottom: '24px' }}>
        <div
          className="profile-section-header"
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            marginBottom: '14px',
            flexWrap: 'wrap',
            gap: '8px'
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <span
              className="profile-section-dot"
              style={{
                width: '8px',
                height: '8px',
                borderRadius: '50%',
                background: '#ffaa00',
                boxShadow: '0 0 10px #ffaa00',
                flexShrink: 0,
                display: 'inline-block'
              }}
            />
            <h3
              className="profile-section-title"
              style={{
                fontSize: '11px',
                color: '#ffffff',
                fontFamily: "'Press Start 2P', monospace",
                margin: 0,
                fontWeight: 900,
                lineHeight: 1
              }}
            >
              DAILY CHECK-IN
            </h3>
          </div>

          {/* Current Streak Badge in Section Header */}
          <div className="profile-checkin-header-streak">
            <Flame size={12} color="#ffaa00" style={{ filter: 'drop-shadow(0 0 4px #ffaa00)' }} />
            <span>{streak} {streak === 1 ? 'DAY' : 'DAYS'} STREAK</span>
          </div>
        </div>

        {/* Main Check-In Card */}
        <div className="profile-checkin-card">
          {/* Left: Flame Icon + Dynamic Title + Subtitle */}
          <div className="profile-checkin-left">
            <div className={`profile-checkin-icon-box ${hasCheckedInToday ? 'checked-in' : ''}`}>
              {hasCheckedInToday ? (
                <CheckCircle2 size={24} color="#00ff88" style={{ filter: 'drop-shadow(0 0 6px rgba(0, 255, 136, 0.9))' }} />
              ) : (
                <Flame size={26} color="#ffaa00" style={{ filter: 'drop-shadow(0 0 8px rgba(255, 170, 0, 0.9))' }} />
              )}
            </div>
            <div>
              <div className="profile-checkin-title">
                {!address ? (
                  <>DAILY <span style={{ color: '#00f5ff' }}>STREAK</span></>
                ) : hasCheckedInToday ? (
                  <>CHECKED IN <span style={{ color: '#00ff88' }}>TODAY</span></>
                ) : (
                  <>KEEP YOUR <span style={{ color: '#ffaa00' }}>STREAK</span></>
                )}
              </div>
              <div className="profile-checkin-sub">
                {!address ? (
                  'Connect wallet to start your daily on-chain streak.'
                ) : hasCheckedInToday ? (
                  <>Next check-in unlocks in <span style={{ color: '#00f5ff', fontVariantNumeric: 'tabular-nums' }}>{timeUntilNext}</span>.</>
                ) : (
                  'Check in every 24h to keep your daily streak alive.'
                )}
              </div>
            </div>
          </div>

          {/* Right: Clean Action Button */}
          <div className="profile-checkin-right">
            {!address ? (
              <button onClick={login} className="profile-checkin-connect-btn">
                CONNECT WALLET
              </button>
            ) : hasCheckedInToday ? (
              <div className="profile-checkin-checked" title={`Checked in today! Next reset in ${timeUntilNext}`}>
                <CheckCircle2 size={13} color="#00ff88" strokeWidth={2.5} style={{ flexShrink: 0 }} />
                <span>NEXT: {timeUntilNext}</span>
              </div>
            ) : (
              <button onClick={performCheckIn} disabled={isCheckingIn} className="profile-checkin-btn">
                <Flame size={14} color="#020b1a" strokeWidth={2.5} />
                <span>{isCheckingIn ? 'CHECKING IN...' : 'CHECK IN NOW'}</span>
              </button>
            )}
          </div>
        </div>
      </div>

      {/* ── 5. ACHIEVEMENTS SECTION (CATEGORIZED TIERS) ── */}
      <div className="profile-achievements-zone" style={{ marginBottom: '24px' }}>
        <div className="profile-section-header" style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '14px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <span className="profile-section-dot" style={{ width: '8px', height: '8px', borderRadius: '50%', background: '#00ff88', boxShadow: '0 0 8px #00ff88', flexShrink: 0, display: 'inline-block' }} />
            <h3 className="profile-section-title" style={{ fontSize: '10px', color: '#ffffff', fontFamily: "'Press Start 2P', monospace", margin: 0, fontWeight: 900, lineHeight: 1 }}>
              ACHIEVEMENTS
            </h3>
          </div>
          <div className="profile-achievements-tracker" style={{ background: 'rgba(0, 255, 136, 0.12)', border: '1px solid rgba(0, 255, 136, 0.4)', borderRadius: '8px', padding: '5px 10px', fontSize: '6px', color: '#00ff88', fontFamily: "'Press Start 2P', monospace", fontWeight: 800, display: 'inline-flex', alignItems: 'center', gap: '4px' }}>
            <span style={{ width: '4px', height: '4px', borderRadius: '50%', background: '#00ff88', boxShadow: '0 0 5px #00ff88' }} />
            <span>{unlockedCount}/{totalAchievementsCount} UNLOCKED</span>
          </div>
        </div>

        {/* Top Container: 2 Sub-categories (Side-by-side on desktop) */}
        <div className="profile-achievements-top-row">
          {/* Sub-category 1: REWARDS ELIGIBILITY */}
          <div className="profile-achievements-subgroup">
            <div className="profile-achievements-subgroup-header">
              <div className="profile-achievements-subgroup-title">
                <span className="profile-subgroup-dot" />
                <span>REWARDS ELIGIBILITY</span>
              </div>
              <div className="profile-achievements-subgroup-count">
                {REWARDS_ELIGIBILITY_ACHIEVEMENTS.filter(a => a.unlocked).length}/{REWARDS_ELIGIBILITY_ACHIEVEMENTS.length}
              </div>
            </div>
            <div className="profile-achievements-subgrid profile-grid-2-col">
              {REWARDS_ELIGIBILITY_ACHIEVEMENTS.map((ach) => (
                <div
                  key={ach.id}
                  className={`profile-achievement-card ${ach.unlocked ? 'unlocked' : 'locked'} ${activeAchievementTooltip === ach.id ? 'has-active-tooltip' : ''}`}
                >
                  <div className="profile-achievement-info-wrap">
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        setActiveAchievementTooltip(activeAchievementTooltip === ach.id ? null : ach.id);
                      }}
                      onMouseEnter={() => setActiveAchievementTooltip(ach.id)}
                      onMouseLeave={() => setActiveAchievementTooltip(null)}
                      className="profile-achievement-info-btn"
                      aria-label={`${ach.name} info`}
                    >
                      <InfoSvgIcon size={12} className="profile-achievement-info-icon" />
                    </button>

                    {activeAchievementTooltip === ach.id && (
                      <div
                        className="profile-achievement-tooltip"
                        onClick={(e) => e.stopPropagation()}
                      >
                        <div className="profile-achievement-tooltip-title">
                          <InfoSvgIcon size={11} color="#00f5ff" />
                          <span>{ach.name}</span>
                        </div>
                        <div className="profile-achievement-tooltip-desc">
                          {ach.description}
                        </div>
                      </div>
                    )}
                  </div>

                  <div className="profile-achievement-img-box">
                    <img
                      src={ach.image}
                      alt={ach.name}
                      className="profile-achievement-img"
                    />
                  </div>
                  <div className="profile-achievement-name" title={ach.name}>
                    {ach.name}
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Sub-category 2: ACTIVE DOG */}
          <div className="profile-achievements-subgroup">
            <div className="profile-achievements-subgroup-header">
              <div className="profile-achievements-subgroup-title">
                <span className="profile-subgroup-dot" />
                <span>ACTIVE DOG</span>
              </div>
              <div className="profile-achievements-subgroup-count">
                {ACTIVE_DOG_ACHIEVEMENTS.filter(a => a.unlocked).length}/{ACTIVE_DOG_ACHIEVEMENTS.length}
              </div>
            </div>
            <div className="profile-achievements-subgrid profile-grid-3-col">
              {ACTIVE_DOG_ACHIEVEMENTS.map((ach) => (
                <div
                  key={ach.id}
                  className={`profile-achievement-card ${ach.unlocked ? 'unlocked' : ach.isClaimable ? 'claimable' : 'locked'} ${activeAchievementTooltip === ach.id ? 'has-active-tooltip' : ''}`}
                >
                  <div className="profile-achievement-info-wrap">
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        setActiveAchievementTooltip(activeAchievementTooltip === ach.id ? null : ach.id);
                      }}
                      onMouseEnter={() => setActiveAchievementTooltip(ach.id)}
                      onMouseLeave={() => setActiveAchievementTooltip(null)}
                      className="profile-achievement-info-btn"
                      aria-label={`${ach.name} info`}
                    >
                      <InfoSvgIcon size={12} className="profile-achievement-info-icon" />
                    </button>

                    {activeAchievementTooltip === ach.id && (
                      <div
                        className="profile-achievement-tooltip"
                        onClick={(e) => e.stopPropagation()}
                      >
                        <div className="profile-achievement-tooltip-title">
                          <InfoSvgIcon size={11} color="#00f5ff" />
                          <span>{ach.name}</span>
                        </div>
                        <div className="profile-achievement-tooltip-desc">
                          {ach.description}
                        </div>
                      </div>
                    )}
                  </div>

                  <div className="profile-achievement-img-box">
                    <img
                      src={ach.image}
                      alt={ach.name}
                      className="profile-achievement-img"
                    />
                    {ach.isClaimable && (
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          handleClaimAchievement(ach.id);
                        }}
                        disabled={claimingId === ach.id}
                        className="profile-achievement-claim-btn"
                        title="Claim this achievement"
                      >
                        {claimingId === ach.id ? 'CLAIMING...' : 'CLAIM'}
                      </button>
                    )}
                  </div>
                  <div className="profile-achievement-name" title={ach.name}>
                    {ach.name}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Bottom Container: DOG STAKER (Full Width, 5 items) */}
        <div className="profile-achievements-subgroup profile-achievements-staker-group">
          <div className="profile-achievements-subgroup-header">
            <div className="profile-achievements-subgroup-title">
              <span className="profile-subgroup-dot" />
              <span>DOG STAKER</span>
            </div>
            <div className="profile-achievements-subgroup-count">
              {DOG_STAKER_ACHIEVEMENTS.filter(a => a.unlocked).length}/{DOG_STAKER_ACHIEVEMENTS.length}
            </div>
          </div>
          <div className="profile-achievements-subgrid profile-grid-5-col">
            {DOG_STAKER_ACHIEVEMENTS.map((ach) => (
              <div
                key={ach.id}
                className={`profile-achievement-card ${ach.unlocked ? 'unlocked' : ach.isClaimable ? 'claimable' : 'locked'} ${activeAchievementTooltip === ach.id ? 'has-active-tooltip' : ''}`}
              >
                <div className="profile-achievement-info-wrap">
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      setActiveAchievementTooltip(activeAchievementTooltip === ach.id ? null : ach.id);
                    }}
                    onMouseEnter={() => setActiveAchievementTooltip(ach.id)}
                    onMouseLeave={() => setActiveAchievementTooltip(null)}
                    className="profile-achievement-info-btn"
                    aria-label={`${ach.name} info`}
                  >
                    <InfoSvgIcon size={12} className="profile-achievement-info-icon" />
                  </button>

                  {activeAchievementTooltip === ach.id && (
                    <div
                      className="profile-achievement-tooltip"
                      onClick={(e) => e.stopPropagation()}
                    >
                      <div className="profile-achievement-tooltip-title">
                        <InfoSvgIcon size={11} color="#00f5ff" />
                        <span>{ach.name}</span>
                      </div>
                      <div className="profile-achievement-tooltip-desc">
                        {ach.description}
                      </div>
                    </div>
                  )}
                </div>

                <div className="profile-achievement-img-box">
                  <img
                    src={ach.image}
                    alt={ach.name}
                    className="profile-achievement-img"
                  />
                  {ach.isClaimable && (
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        handleClaimAchievement(ach.id);
                      }}
                      disabled={claimingId === ach.id}
                      className="profile-achievement-claim-btn"
                      title="Claim this achievement"
                    >
                      {claimingId === ach.id ? 'CLAIMING...' : 'CLAIM'}
                    </button>
                  )}
                </div>
                <div className="profile-achievement-name" title={ach.name}>
                  {ach.name}
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

