import { useState, useEffect } from 'react';
import { BrowserRouter, Routes, Route, Link, useLocation, Navigate } from 'react-router-dom';
import { ArrowRight, ArrowUpRight, Clock, Flame, Gift, Users, ShieldCheck, Calendar, Coins, Sparkles, Lock, ChevronDown, CheckCircle2 } from 'lucide-react';
import { PrivyProvider, dataSuffix } from '@privy-io/react-auth';
import { WagmiProvider as PrivyWagmiProvider } from '@privy-io/wagmi';
import { privyWagmiConfig } from '../../config/privyWagmi';
import { DATA_SUFFIX } from '../../config/builderCode';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { createPublicClient, http, parseAbi } from 'viem';
import { base } from 'viem/chains';
import { BaseAppView } from './components/BaseAppView';
import BaseAppRewardsView from './components/BaseAppRewardsView';
import { O1_STAKING_VAULT, STAKING_EPOCHS, VIBECLUB_EPOCHS, GIVEAWAYS_DATA, HOLDER_UNLOCKS } from '../../data/rewardsSchedule';
import './index.css';

function ScrollToTop() {
  const { pathname } = useLocation();
  useEffect(() => {
    window.scrollTo(0, 0);
  }, [pathname]);
  return null;
}

export function getStakingEpochStatus(ep, currentTime = new Date()) {
  const current = currentTime instanceof Date ? currentTime : new Date(currentTime);
  if (ep.endDateObj && current >= ep.endDateObj) {
    return 'ended';
  }
  if (ep.startDateObj && current >= ep.startDateObj) {
    return 'active';
  }
  return 'upcoming';
}

export function getRewardEpochStatus(ep, currentTime = new Date()) {
  const current = currentTime instanceof Date ? currentTime : new Date(currentTime);
  if (ep.status === 'ended' || ep.status === 'completed' || (ep.nextSnapshotDate && current >= ep.nextSnapshotDate)) {
    return 'ended';
  }
  const start = ep.snapshotDateObj || ep.dateObj;
  if (start && current >= start) {
    return 'active';
  }
  return 'upcoming';
}

function formatCountdown(targetDate) {
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
    return `${days}D:${pad(hours)}H:${pad(minutes)}M:${pad(seconds)}S`;
  }
  return `${pad(hours)}H:${pad(minutes)}M:${pad(seconds)}S`;
}

function GiveawayCountdown({ targetDate, isOngoing }) {
  const [timeLeft, setTimeLeft] = useState(() => formatCountdown(targetDate));

  useEffect(() => {
    const interval = setInterval(() => {
      setTimeLeft(formatCountdown(targetDate));
    }, 1000);
    return () => clearInterval(interval);
  }, [targetDate]);

  return (
    <strong
      style={{
        color: isOngoing ? 'var(--ink)' : '#475569',
        fontWeight: 800,
        fontSize: '0.76rem',
        whiteSpace: 'nowrap',
        textAlign: 'right',
        fontVariantNumeric: 'tabular-nums',
        letterSpacing: '0.02em'
      }}
    >
      {timeLeft}
    </strong>
  );
}

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
    return `${days}d ${pad(hours)}h ${pad(minutes)}m`;
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

  return <span>{timeLeft}</span>;
}

function ClaimCountdownButton({ targetDate, href = "/claim" }) {
  const [isLive, setIsLive] = useState(() => {
    if (!targetDate) return true;
    return new Date().getTime() >= new Date(targetDate).getTime();
  });
  const [timeLeft, setTimeLeft] = useState(() => formatCountdown(targetDate));

  useEffect(() => {
    if (!targetDate) return;
    const interval = setInterval(() => {
      const nowMs = new Date().getTime();
      const targetMs = new Date(targetDate).getTime();
      if (nowMs >= targetMs) {
        setIsLive(true);
      } else {
        setTimeLeft(formatCountdown(targetDate));
      }
    }, 1000);
    return () => clearInterval(interval);
  }, [targetDate]);

  if (isLive) {
    return (
      <Link
        to={href}
        className="btn-fill"
        style={{
          background: 'var(--blue)',
          color: '#ffffff',
          padding: '11px 14px',
          fontSize: '0.86rem',
          fontWeight: 800,
          borderRadius: '12px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          gap: '6px',
          width: '100%',
          textDecoration: 'none',
          whiteSpace: 'nowrap',
          boxShadow: '0 4px 16px rgba(0, 0, 255, 0.3)',
          transition: 'all 0.15s'
        }}
      >
        <span>Claim</span> <ArrowUpRight size={15} strokeWidth={2.5} />
      </Link>
    );
  }

  return (
    <button
      disabled
      style={{
        width: '100%',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '11px 14px',
        fontSize: '0.86rem',
        fontWeight: 800,
        borderRadius: '12px',
        background: 'rgba(5, 150, 105, 0.12)',
        border: '1.5px solid #059669',
        color: '#059669',
        cursor: 'default',
        whiteSpace: 'nowrap',
        gap: '6px',
        fontVariantNumeric: 'tabular-nums',
        boxShadow: '0 0 16px rgba(5, 150, 105, 0.2)'
      }}
    >
      <Clock size={14} color="#059669" /> Claim in {timeLeft}
    </button>
  );
}

function Rewards({ isBaseAppMode = false } = {}) {
  const [activeTab, setActiveTab] = useState(null);
  const [stakingFilter, setStakingFilter] = useState('all');
  const [giveawayFilter, setGiveawayFilter] = useState('all');
  const [holderFilter, setHolderFilter] = useState('all');
  const [vibeClubFilter, setVibeClubFilter] = useState('all');
  const [nftHoldersCount, setNftHoldersCount] = useState(103);
  const [openFaq, setOpenFaq] = useState(null);
  const now = new Date();

  useEffect(() => {
    let mounted = true;
    async function fetchNftHolders() {
      try {
        const client = createPublicClient({ chain: base, transport: http('https://mainnet.base.org') });
        const total = Number(await client.readContract({
          address: '0x9E92307Dbec2d0aE4BBF14cA93E1cA00edC4b886',
          abi: parseAbi(['function totalMintedCount() view returns (uint256)']),
          functionName: 'totalMintedCount'
        }));
        if (total > 0 && mounted) {
          setNftHoldersCount(total);
        }
      } catch (err) {
        console.error('Failed to fetch NFT holders:', err);
      }
    }
    fetchNftHolders();
    const interval = setInterval(fetchNftHolders, 10000);
    return () => {
      mounted = false;
      clearInterval(interval);
    };
  }, []);

  const filteredStakingEpochs = STAKING_EPOCHS.filter(e => {
    const status = getStakingEpochStatus(e, now);
    if (stakingFilter === 'all') return true;
    if (stakingFilter === 'active') return status === 'active';
    if (stakingFilter === 'upcoming') return status === 'upcoming';
    if (stakingFilter === 'ended' || stakingFilter === 'completed') return status === 'ended';
    return true;
  });

  const stakingCounts = {
    all: STAKING_EPOCHS.length,
    active: STAKING_EPOCHS.filter(e => getStakingEpochStatus(e, now) === 'active').length,
    upcoming: STAKING_EPOCHS.filter(e => getStakingEpochStatus(e, now) === 'upcoming').length,
    ended: STAKING_EPOCHS.filter(e => getStakingEpochStatus(e, now) === 'ended').length,
  };

  const filteredHolderUnlocks = HOLDER_UNLOCKS.filter(u => {
    const status = getRewardEpochStatus(u, now);
    if (holderFilter === 'all') return true;
    if (holderFilter === 'active') return status === 'active';
    if (holderFilter === 'upcoming' || holderFilter === 'locked') return status === 'upcoming';
    if (holderFilter === 'ended' || holderFilter === 'completed') return status === 'ended';
    return true;
  });

  const holderCounts = {
    all: HOLDER_UNLOCKS.length,
    active: HOLDER_UNLOCKS.filter(u => getRewardEpochStatus(u, now) === 'active').length,
    upcoming: HOLDER_UNLOCKS.filter(u => getRewardEpochStatus(u, now) === 'upcoming').length,
    ended: HOLDER_UNLOCKS.filter(u => getRewardEpochStatus(u, now) === 'ended').length
  };

  const filteredVibeClubEpochs = VIBECLUB_EPOCHS.filter(u => {
    const status = getRewardEpochStatus(u, now);
    if (vibeClubFilter === 'all') return true;
    if (vibeClubFilter === 'active') return status === 'active';
    if (vibeClubFilter === 'upcoming' || vibeClubFilter === 'locked') return status === 'upcoming';
    if (vibeClubFilter === 'ended' || vibeClubFilter === 'completed') return status === 'ended';
    return true;
  });

  const vibeClubCounts = {
    all: VIBECLUB_EPOCHS.length,
    active: VIBECLUB_EPOCHS.filter(u => getRewardEpochStatus(u, now) === 'active').length,
    upcoming: VIBECLUB_EPOCHS.filter(u => getRewardEpochStatus(u, now) === 'upcoming').length,
    ended: VIBECLUB_EPOCHS.filter(u => getRewardEpochStatus(u, now) === 'ended').length
  };

  const filteredGiveaways = GIVEAWAYS_DATA.filter(e => {
    if (giveawayFilter === 'all') return true;
    if (giveawayFilter === 'active' || giveawayFilter === 'ongoing') return e.status === 'ongoing';
    if (giveawayFilter === 'upcoming') return e.status === 'upcoming';
    if (giveawayFilter === 'ended') return e.status === 'ended';
    return true;
  });

  const giveawayCounts = {
    all: GIVEAWAYS_DATA.length,
    active: GIVEAWAYS_DATA.filter(e => e.status === 'ongoing').length,
    upcoming: GIVEAWAYS_DATA.filter(e => e.status === 'upcoming').length,
    ended: GIVEAWAYS_DATA.filter(e => e.status === 'ended').length
  };

  const categoryCards = [
    {
      id: 'holders',
      label: 'Holder Rewards',
      image: '/rewards/holder-rewards.jfif',
    },
    {
      id: 'vibe-club',
      label: 'Vibe Club',
      image: '/rewards/vibe-club.jfif',
    },
    {
      id: 'staking',
      label: 'Staking',
      image: '/rewards/staking.jfif',
    },
    {
      id: 'giveaways',
      label: 'Giveaways',
      image: '/rewards/giveaways.jfif',
    },
  ];

  const activeCategoryCards = categoryCards;

  const getCategoryBadges = (catId) => {
    let active = 0;
    let upcoming = 0;

    if (catId === 'holders') {
      active = HOLDER_UNLOCKS.filter(u => getRewardEpochStatus(u, now) === 'active').length;
      upcoming = HOLDER_UNLOCKS.filter(u => getRewardEpochStatus(u, now) === 'upcoming').length;
    } else if (catId === 'staking') {
      active = STAKING_EPOCHS.filter(e => getStakingEpochStatus(e, now) === 'active').length;
      upcoming = STAKING_EPOCHS.filter(e => getStakingEpochStatus(e, now) === 'upcoming').length;
    } else if (catId === 'vibe-club') {
      active = VIBECLUB_EPOCHS.filter(u => getRewardEpochStatus(u, now) === 'active').length;
      upcoming = VIBECLUB_EPOCHS.filter(u => getRewardEpochStatus(u, now) === 'upcoming').length;
    } else if (catId === 'giveaways') {
      active = GIVEAWAYS_DATA.filter(e => e.status === 'ongoing').length;
      upcoming = GIVEAWAYS_DATA.filter(e => e.status !== 'ended' && e.status !== 'ongoing').length;
    }

    const badges = [];
    if (active > 0) {
      badges.push({ type: 'active', label: `Active: ${active}` });
    }
    if (active === 0) {
      badges.push({ type: 'upcoming', label: `Upcoming: 1` });
    } else if (upcoming > 0) {
      badges.push({ type: 'upcoming', label: `Upcoming: 1` });
    }
    return badges;
  };

  if (isBaseAppMode) {
    return (
      <section id="rewards" className="alt" style={{ padding: '24px 0 60px 0' }}>
        <div className="wrap">
          <BaseAppRewardsView
            HOLDER_UNLOCKS={HOLDER_UNLOCKS}
            VIBECLUB_EPOCHS={VIBECLUB_EPOCHS}
            STAKING_EPOCHS={STAKING_EPOCHS}
            GIVEAWAYS_DATA={GIVEAWAYS_DATA}
            O1_STAKING_VAULT={O1_STAKING_VAULT}
            now={now}
          />
        </div>
      </section>
    );
  }

  return (
    <section id="rewards" className="alt" style={{ padding: '140px 0 100px 0' }}>
      <div className="wrap">
        {/* Main Rewards Hub Header (when no specific category is selected) */}
        {activeTab === null ? (
          <>
            <div className="sec-head" style={{ marginBottom: '36px' }}>
              <h2>Rewards <span className="bl">Hub</span>.</h2>
              <p className="sec-sub">Track active reward epochs and community events.</p>
            </div>

            {/* 5 Graphic Category Cards Grid */}
            <div
              style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(auto-fit, minmax(min(100%, 340px), 1fr))',
                gap: '24px',
                marginBottom: '40px'
              }}
            >
              {activeCategoryCards.map(cat => (
                <div
                  key={cat.id}
                  onClick={() => {
                    setActiveTab(cat.id);
                    window.scrollTo({ top: 0, behavior: 'smooth' });
                  }}
                  role="button"
                  tabIndex={0}
                  style={{
                    background: '#ffffff',
                    borderRadius: '24px',
                    border: '2px solid rgba(0, 82, 255, 0.18)',
                    overflow: 'hidden',
                    cursor: 'pointer',
                    boxShadow: '0 8px 30px rgba(0, 82, 255, 0.08)',
                    transition: 'all 0.25s cubic-bezier(0.4, 0, 0.2, 1)',
                    display: 'flex',
                    flexDirection: 'column'
                  }}
                  onMouseEnter={e => {
                    e.currentTarget.style.transform = 'translateY(-6px)';
                    e.currentTarget.style.borderColor = 'var(--blue)';
                    e.currentTarget.style.boxShadow = '0 16px 36px -4px rgba(0, 82, 255, 0.25)';
                  }}
                  onMouseLeave={e => {
                    e.currentTarget.style.transform = 'none';
                    e.currentTarget.style.borderColor = 'rgba(0, 82, 255, 0.18)';
                    e.currentTarget.style.boxShadow = '0 8px 30px rgba(0, 82, 255, 0.08)';
                  }}
                >
                  {/* Card Image Banner */}
                  <div style={{ position: 'relative', width: '100%', paddingTop: '56.25%', background: '#f8fafc', overflow: 'hidden' }}>
                    <img
                      src={cat.image}
                      alt={cat.label}
                      style={{
                        position: 'absolute',
                        top: 0,
                        left: 0,
                        width: '100%',
                        height: '100%',
                        objectFit: 'cover'
                      }}
                    />

                    {/* Top Right Status Badges (Crisp dark design) */}
                    <div style={{ position: 'absolute', top: '10px', right: '10px', display: 'flex', gap: '5px', zIndex: 2, flexWrap: 'wrap', justifyContent: 'flex-end' }}>
                      {getCategoryBadges(cat.id).map((b, idx) => (
                        <div
                          key={idx}
                          style={{
                            background: '#090d16',
                            color: b.type === 'active' ? '#22c55e' : b.type === 'coming-soon' ? '#f59e0b' : '#94a3b8',
                            border: b.type === 'active' ? '1px solid rgba(34, 197, 94, 0.4)' : b.type === 'coming-soon' ? '1px solid rgba(245, 158, 11, 0.4)' : '1px solid rgba(148, 163, 184, 0.25)',
                            backdropFilter: 'blur(8px)',
                            padding: '3px 8px',
                            borderRadius: '99px',
                            fontSize: '0.66rem',
                            fontWeight: 800,
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: '5px',
                            boxShadow: '0 4px 12px rgba(0, 0, 0, 0.45)',
                            letterSpacing: '0.03em',
                            textTransform: 'uppercase'
                          }}
                        >
                          {b.type === 'active' && (
                            <span
                              style={{
                                width: '5px',
                                height: '5px',
                                borderRadius: '50%',
                                background: '#22c55e',
                                boxShadow: '0 0 6px #22c55e',
                                display: 'inline-block'
                              }}
                            />
                          )}
                          {b.type === 'coming-soon' && (
                            <Lock size={10} color="#f59e0b" strokeWidth={2.3} />
                          )}
                          {b.type === 'upcoming' && (
                            <Clock size={10} color="#94a3b8" strokeWidth={2.3} />
                          )}
                          {b.label}
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Card Body: Left Title, Right Compact Explore Button */}
                  <div style={{ padding: isBaseAppMode ? '12px 14px' : '16px 20px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', background: isBaseAppMode ? 'rgba(4, 20, 48, 0.95)' : '#ffffff', gap: '12px', width: '100%', boxSizing: 'border-box' }}>
                    <h3 style={{ margin: 0, fontSize: isBaseAppMode ? '9px' : '1.18rem', fontWeight: 900, color: isBaseAppMode ? '#ffffff' : 'var(--ink)', letterSpacing: isBaseAppMode ? '0.3px' : '-0.02em', whiteSpace: 'nowrap', fontFamily: isBaseAppMode ? "'Press Start 2P', monospace" : 'inherit' }}>
                      {cat.label}
                    </h3>
                    <div
                      className="rewards-explore-badge"
                      style={{
                        background: isBaseAppMode ? 'transparent' : 'var(--blue)',
                        color: isBaseAppMode ? '#00f5ff' : '#ffffff',
                        border: isBaseAppMode ? '1.5px solid #00f5ff' : 'none',
                        boxShadow: isBaseAppMode ? '0 0 10px rgba(0, 245, 255, 0.25)' : '0 3px 12px rgba(0, 82, 255, 0.25)',
                        padding: isBaseAppMode ? '7px 10px' : '9px 18px',
                        fontSize: isBaseAppMode ? '7px' : '0.84rem',
                        fontFamily: isBaseAppMode ? "'Press Start 2P', monospace" : 'inherit',
                        fontWeight: 800,
                        borderRadius: isBaseAppMode ? '8px' : '10px',
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: '6px',
                        whiteSpace: 'nowrap',
                        flexShrink: 0,
                        width: 'auto',
                        minWidth: 'auto',
                        maxWidth: 'max-content',
                        transition: 'all 0.2s'
                      }}
                    >
                      <span>Explore</span> <ArrowRight size={isBaseAppMode ? 11 : 14} color={isBaseAppMode ? '#00f5ff' : '#ffffff'} strokeWidth={2.5} />
                    </div>
                  </div>
                </div>
              ))}
            </div>

            {/* Rewards Hub FAQ Section (Underneath Category Cards) */}
            <div style={{ marginTop: '54px' }}>
              <div style={{ textAlign: 'center', marginBottom: '24px' }}>
                <h3 style={{ fontSize: '1.65rem', fontWeight: 900, color: 'var(--ink)', letterSpacing: '-0.02em', margin: 0 }}>
                  Rules &amp; <span style={{ color: 'var(--blue)' }}>FAQ</span>
                </h3>
              </div>

              <div
                style={{
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '12px',
                  maxWidth: '820px',
                  margin: '0 auto'
                }}
              >
                {[
                  {
                    question: 'Where do I claim Holder Rewards & Vibe Club rewards?',
                    answer: 'Holder Rewards & Vibe Club rewards are claimed directly in the Rewards Hub.',
                    icon: <Sparkles size={18} color="var(--blue)" />,
                    iconBg: 'rgba(0, 82, 255, 0.08)',
                    renderAnswer: () => (
                      <span>
                        <strong style={{ color: 'var(--ink)' }}>Holder Rewards</strong> &amp; <strong style={{ color: 'var(--ink)' }}>Vibe Club</strong> rewards are claimed directly in the Rewards Hub.
                      </span>
                    )
                  },
                  {
                    question: 'How are Staking and Giveaway rewards distributed?',
                    answer: 'Staking rewards are claimed on o1. Giveaways are sent directly to winners.',
                    icon: <Coins size={18} color="#8b5cf6" />,
                    iconBg: 'rgba(139, 92, 246, 0.08)',
                    renderAnswer: () => (
                      <span>
                        <strong style={{ color: 'var(--ink)' }}>Staking</strong> rewards are claimed on o1. <strong style={{ color: 'var(--ink)' }}>Giveaways</strong> are sent directly to winners.
                      </span>
                    )
                  },
                  {
                    question: 'What is the rule for unclaimed reward tokens?',
                    answer: 'All unclaimed tokens within the claim period are permanently burned.',
                    icon: <Flame size={18} color="#ff5500" />,
                    iconBg: 'rgba(255, 85, 0, 0.08)',
                    renderAnswer: () => (
                      <span>
                        All unclaimed tokens within the claim period are <strong style={{ color: '#ff5500' }}>permanently burned</strong>.
                      </span>
                    )
                  }
                ].map((faq, idx) => {
                  const isOpen = openFaq === idx;
                  return (
                    <div
                      key={idx}
                      className="rewards-faq-item"
                      style={{
                        borderRadius: '18px',
                        overflow: 'hidden',
                        transition: 'all 0.2s ease',
                      }}
                    >
                      <button
                        type="button"
                        onClick={() => setOpenFaq(isOpen ? null : idx)}
                        style={{
                          width: '100%',
                          padding: '16px 20px',
                          background: 'transparent',
                          border: 'none',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'space-between',
                          gap: '12px',
                          cursor: 'pointer',
                          textAlign: 'left'
                        }}
                      >
                        <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
                          <div
                            style={{
                              width: '36px',
                              height: '36px',
                              borderRadius: '10px',
                              background: faq.iconBg,
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'center',
                              flexShrink: 0
                            }}
                          >
                            {faq.icon}
                          </div>
                          <div>
                            <span style={{ fontSize: '0.96rem', fontWeight: 800, color: 'var(--ink)', display: 'block' }}>
                              {faq.question}
                            </span>
                          </div>
                        </div>
                        <div
                          style={{
                            transform: isOpen ? 'rotate(180deg)' : 'none',
                            transition: 'transform 0.25s ease',
                            color: 'var(--blue)',
                            display: 'flex',
                            alignItems: 'center',
                            flexShrink: 0
                          }}
                        >
                          <ChevronDown size={20} strokeWidth={2.5} />
                        </div>
                      </button>

                      {isOpen && (
                        <div
                          style={{
                            padding: '0 20px 18px 70px',
                            fontSize: '0.88rem',
                            color: 'var(--ink2)',
                            lineHeight: 1.55,
                            borderTop: '1px solid rgba(0, 82, 255, 0.08)'
                          }}
                        >
                          <div style={{ paddingTop: '12px' }}>
                            {faq.renderAnswer()}
                          </div>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          </>
        ) : (
          /* Detail View for Selected Category with Back Button (No switcher on Base App) */
          <div style={{ marginBottom: isBaseAppMode ? '20px' : '32px' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '14px', marginBottom: isBaseAppMode ? '16px' : '24px' }}>
              <button
                onClick={() => setActiveTab(null)}
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '8px',
                  background: isBaseAppMode ? 'rgba(2, 11, 26, 0.85)' : '#ffffff',
                  border: isBaseAppMode ? '1.5px solid rgba(0, 245, 255, 0.35)' : '1.5px solid rgba(0, 82, 255, 0.25)',
                  color: isBaseAppMode ? '#00f5ff' : 'var(--blue)',
                  fontWeight: 800,
                  fontSize: isBaseAppMode ? '7.5px' : '0.88rem',
                  fontFamily: isBaseAppMode ? "'Press Start 2P', monospace" : 'var(--font)',
                  padding: isBaseAppMode ? '8px 14px' : '10px 20px',
                  borderRadius: isBaseAppMode ? '10px' : '14px',
                  cursor: 'pointer',
                  boxShadow: isBaseAppMode ? '0 0 10px rgba(0, 245, 255, 0.2)' : '0 2px 8px rgba(0, 82, 255, 0.08)',
                  transition: 'all 0.15s'
                }}
              >
                <ArrowRight size={isBaseAppMode ? 12 : 16} style={{ transform: 'rotate(180deg)' }} /> Back to Rewards Hub
              </button>

              {!isBaseAppMode && (
                <div style={{ display: 'flex', gap: '6px', background: '#f1f5f9', padding: '4px', borderRadius: '14px', border: '1px solid #e2e8f0', flexWrap: 'wrap' }}>
                  {categoryCards.map(c => (
                    <button
                      key={c.id}
                      onClick={() => setActiveTab(c.id)}
                      style={{
                        fontFamily: 'var(--font)',
                        background: activeTab === c.id ? 'var(--blue)' : 'transparent',
                        color: activeTab === c.id ? '#ffffff' : '#64748b',
                        border: 'none',
                        padding: '6px 14px',
                        borderRadius: '10px',
                        fontSize: '0.78rem',
                        fontWeight: 800,
                        cursor: 'pointer',
                        transition: 'all 0.15s'
                      }}
                    >
                      {c.label}
                    </button>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}

        {/* ── 1. STAKING REWARDS SECTION ── */}
        {activeTab === 'staking' && (
          <div style={{ marginBottom: '40px' }}>
            {/* 1. 3-Point Staking Info Grid (Signature Brand Turquoise) */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '14px', marginBottom: '28px' }}>
              <div
                style={{
                  background: 'linear-gradient(135deg, rgba(190, 241, 255, 0.55) 0%, rgba(225, 249, 255, 0.75) 100%)',
                  border: '1px solid rgba(0, 160, 255, 0.25)',
                  borderRadius: '16px',
                  padding: '16px 18px',
                  boxShadow: '0 2px 8px rgba(0, 82, 255, 0.04)'
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '6px' }}>
                  <span style={{ fontSize: '0.72rem', fontWeight: 900, color: 'var(--blue)', background: 'rgba(0, 0, 255, 0.12)', width: '22px', height: '22px', borderRadius: '6px', display: 'inline-flex', alignItems: 'center', justifyContent: 'center' }}>1</span>
                  <strong style={{ fontSize: '0.92rem', color: 'var(--ink)', fontWeight: 800 }}>Stake</strong>
                </div>
                <p style={{ margin: 0, fontSize: '0.84rem', color: 'var(--ink2)', lineHeight: 1.45 }}>
                  Lock $VIBE tokens directly into the verified staking pool on <a href={O1_STAKING_VAULT} target="_blank" rel="noreferrer" style={{ color: 'var(--blue)', textDecoration: 'underline', fontWeight: 700, display: 'inline-flex', alignItems: 'center', gap: '3px' }}>o1.exchange <ArrowUpRight size={13} strokeWidth={2.5} /></a> on Base.
                </p>
              </div>

              <div
                style={{
                  background: 'linear-gradient(135deg, rgba(190, 241, 255, 0.55) 0%, rgba(225, 249, 255, 0.75) 100%)',
                  border: '1px solid rgba(0, 160, 255, 0.25)',
                  borderRadius: '16px',
                  padding: '16px 18px',
                  boxShadow: '0 2px 8px rgba(0, 82, 255, 0.04)'
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '6px' }}>
                  <span style={{ fontSize: '0.72rem', fontWeight: 900, color: 'var(--blue)', background: 'rgba(0, 0, 255, 0.12)', width: '22px', height: '22px', borderRadius: '6px', display: 'inline-flex', alignItems: 'center', justifyContent: 'center' }}>2</span>
                  <strong style={{ fontSize: '0.92rem', color: 'var(--ink)', fontWeight: 800 }}>10-Day Epochs</strong>
                </div>
                <p style={{ margin: 0, fontSize: '0.84rem', color: 'var(--ink2)', lineHeight: 1.45 }}>
                  Staking rewards are distributed every 10 days, followed by the start of a new epoch.
                </p>
              </div>

              <div
                style={{
                  background: 'linear-gradient(135deg, rgba(190, 241, 255, 0.55) 0%, rgba(225, 249, 255, 0.75) 100%)',
                  border: '1px solid rgba(0, 160, 255, 0.25)',
                  borderRadius: '16px',
                  padding: '16px 18px',
                  boxShadow: '0 2px 8px rgba(0, 82, 255, 0.04)'
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '6px' }}>
                  <span style={{ fontSize: '0.72rem', fontWeight: 900, color: '#059669', background: 'rgba(16, 185, 129, 0.14)', width: '22px', height: '22px', borderRadius: '6px', display: 'inline-flex', alignItems: 'center', justifyContent: 'center' }}>3</span>
                  <strong style={{ fontSize: '0.92rem', color: 'var(--ink)', fontWeight: 800 }}>Epoch Reward Pool</strong>
                </div>
                <p style={{ margin: 0, fontSize: '0.84rem', color: 'var(--ink2)', lineHeight: 1.45 }}>
                  Equals 15% of the total Community Pool available at the start of each epoch.
                </p>
              </div>
            </div>

            {/* 2. Sub-Header with Filter Tabs (Left Aligned Next to Title) */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '16px', flexWrap: 'wrap', marginBottom: '18px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <h3 style={{ margin: 0, fontSize: '1.2rem', fontWeight: 900, color: 'var(--ink)', letterSpacing: '-0.02em' }}>Staking Epochs</h3>
                <span style={{ fontSize: '0.75rem', fontWeight: 800, color: '#64748b', background: '#ffffff', border: '1px solid #e2e8f0', padding: '2px 8px', borderRadius: '99px' }}>
                  {filteredStakingEpochs.length}
                </span>
              </div>

              {/* Status Filter for Staking Epochs (Aligned to Left) */}
              <div
                style={{
                  display: 'flex',
                  gap: isBaseAppMode ? '4px' : '4px',
                  background: isBaseAppMode ? 'rgba(2, 11, 26, 0.85)' : '#ffffff',
                  padding: '3px 4px',
                  borderRadius: '10px',
                  border: isBaseAppMode ? '1px solid rgba(0, 245, 255, 0.25)' : '1px solid #e2e8f0',
                  flexWrap: 'nowrap',
                  overflowX: 'auto',
                  maxWidth: '100%',
                  boxSizing: 'border-box'
                }}
              >
                {[
                  { id: 'all', label: `All (${stakingCounts.all})` },
                  { id: 'active', label: `Active (${stakingCounts.active})` },
                  { id: 'upcoming', label: `Upcoming (${stakingCounts.upcoming})` },
                  { id: 'ended', label: `Ended (${stakingCounts.ended})` }
                ].map(f => {
                  const isFActive = stakingFilter === f.id;
                  return (
                    <button
                      key={f.id}
                      onClick={() => setStakingFilter(f.id)}
                      style={{
                        fontFamily: isBaseAppMode ? "'Press Start 2P', monospace" : 'var(--font)',
                        padding: isBaseAppMode ? '6px 8px' : '4px 10px',
                        borderRadius: '8px',
                        border: 'none',
                        background: isFActive ? (isBaseAppMode ? '#0052ff' : 'var(--blue)') : 'transparent',
                        color: isFActive ? '#ffffff' : (isBaseAppMode ? '#cbd5e1' : '#64748b'),
                        fontWeight: 800,
                        fontSize: isBaseAppMode ? '6.5px' : '0.72rem',
                        letterSpacing: '-0.01em',
                        whiteSpace: 'nowrap',
                        flexShrink: 0,
                        cursor: 'pointer',
                        transition: 'all 0.15s',
                        boxShadow: isFActive && isBaseAppMode ? '0 0 8px rgba(0, 82, 255, 0.4)' : 'none'
                      }}
                    >
                      {f.label}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* 3. Modern Web3 DeFi Epoch Cards Grid with Mascot Integration */}
            {filteredStakingEpochs.length === 0 ? (
              <div style={{ padding: '36px 20px', textAlign: 'center', background: '#ffffff', borderRadius: '20px', border: '1px solid #e2e8f0', color: '#64748b', fontSize: '0.9rem' }}>
                No epochs found for this filter.
              </div>
            ) : (
              <div
                style={{
                  display: 'grid',
                  gridTemplateColumns: 'repeat(auto-fill, minmax(min(100%, 270px), 1fr))',
                  gap: '16px'
                }}
              >
                {filteredStakingEpochs.map(ep => {
                  const epStatus = getStakingEpochStatus(ep, now);
                  const isActive = epStatus === 'active';
                  const isCompleted = epStatus === 'ended';
                  const isUpcoming = epStatus === 'upcoming';

                  return (
                    <div
                      key={ep.epoch}
                      style={{
                        background: isActive
                          ? 'linear-gradient(145deg, rgba(215, 246, 255, 0.85) 0%, rgba(240, 252, 255, 0.95) 100%)'
                          : isCompleted
                          ? 'linear-gradient(145deg, rgba(241, 245, 249, 0.9) 0%, rgba(248, 250, 252, 0.95) 100%)'
                          : 'linear-gradient(145deg, rgba(225, 248, 255, 0.55) 0%, rgba(245, 253, 255, 0.8) 100%)',
                        border: isActive ? '2px solid var(--blue)' : isCompleted ? '1.5px solid #cbd5e1' : '1.5px solid rgba(0, 160, 255, 0.25)',
                        borderRadius: '22px',
                        padding: '18px 20px',
                        display: 'flex',
                        flexDirection: 'column',
                        justifyContent: 'space-between',
                        boxShadow: isActive ? '0 12px 36px -4px rgba(0, 82, 255, 0.16), 0 2px 10px rgba(0, 0, 0, 0.04)' : '0 4px 16px rgba(0, 82, 255, 0.05)',
                        position: 'relative',
                        transition: 'all 0.2s'
                      }}
                    >
                      <div>
                        {/* Header with Mascot & Status Badge */}
                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '14px', gap: '8px' }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flexShrink: 0 }}>
                            <img
                              src="/new-logo-vibe.png"
                              alt="VIBE"
                              style={{
                                width: '38px',
                                height: '38px',
                                borderRadius: '50%',
                                objectFit: 'cover',
                                border: isActive ? '2px solid var(--blue)' : '1.5px solid rgba(0, 160, 255, 0.3)',
                                boxShadow: '0 2px 8px rgba(0, 82, 255, 0.15)',
                                flexShrink: 0
                              }}
                            />
                            <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                              <h4 style={{ margin: 0, fontSize: '1.05rem', fontWeight: 900, color: 'var(--ink)', letterSpacing: '-0.02em', whiteSpace: 'nowrap' }}>
                                {ep.epoch}
                              </h4>
                              <span style={{ fontSize: '0.66rem', fontWeight: 800, color: 'var(--blue)', background: 'rgba(0, 0, 255, 0.08)', padding: '2px 6px', borderRadius: '6px', whiteSpace: 'nowrap', border: '1px solid rgba(0, 0, 255, 0.12)' }}>
                                {ep.duration || '10 Days'}
                              </span>
                            </div>
                          </div>

                          <span
                            style={{
                              padding: '4px 10px',
                              borderRadius: '99px',
                              fontSize: '0.66rem',
                              fontWeight: 900,
                              textTransform: 'uppercase',
                              letterSpacing: '0.04em',
                              background: isActive ? '#ecfdf5' : isCompleted ? '#f1f5f9' : 'rgba(255, 255, 255, 0.9)',
                              color: isActive ? '#059669' : isCompleted ? '#64748b' : '#64748b',
                              border: isActive ? '1px solid #a7f3d0' : isCompleted ? '1px solid #cbd5e1' : '1px solid rgba(0, 160, 255, 0.25)',
                              display: 'inline-flex',
                              alignItems: 'center',
                              gap: '5px',
                              whiteSpace: 'nowrap',
                              flexShrink: 0,
                              boxShadow: isActive ? '0 2px 8px rgba(16, 185, 129, 0.15)' : 'none'
                            }}
                          >
                            {isActive && <span style={{ width: '6px', height: '6px', borderRadius: '50%', background: '#10b981', boxShadow: '0 0 6px #10b981', flexShrink: 0 }} />}
                            {isActive ? 'Active' : isCompleted ? 'Ended' : 'Upcoming'}
                          </span>
                        </div>

                        {/* Metric Box (Rewards Pool) */}
                        <div
                          style={{
                            background: '#ffffff',
                            borderRadius: '16px',
                            padding: '14px 16px',
                            border: '1px solid rgba(0, 160, 255, 0.22)',
                            boxShadow: '0 3px 12px rgba(0, 82, 255, 0.05)',
                            marginBottom: '14px'
                          }}
                        >
                          <div style={{ fontSize: isBaseAppMode ? '6.5px' : '0.66rem', color: '#88aacc', textTransform: 'uppercase', fontWeight: 800, letterSpacing: '0.05em', display: 'flex', alignItems: 'center', gap: '4px', whiteSpace: 'nowrap', marginBottom: '4px', fontFamily: isBaseAppMode ? "'Press Start 2P', monospace" : 'inherit' }}>
                            <Coins size={12} color={isBaseAppMode ? '#00f5ff' : 'var(--blue)'} /> Rewards Pool
                          </div>
                          <div style={{ fontSize: isBaseAppMode ? '10px' : '1.42rem', fontWeight: 900, color: isBaseAppMode ? '#00f5ff' : isActive ? 'var(--ink)' : '#64748b', marginTop: '2px', letterSpacing: isBaseAppMode ? '0.2px' : '-0.02em', display: 'flex', alignItems: 'baseline', gap: '5px', whiteSpace: 'nowrap', fontFamily: isBaseAppMode ? "'Press Start 2P', monospace" : 'inherit', textShadow: isBaseAppMode ? '0 0 10px rgba(0, 245, 255, 0.45)' : 'none' }}>
                            {ep.poolAmount} {ep.poolAmount !== 'TBA' && <span style={{ fontSize: isBaseAppMode ? '7.5px' : '0.88rem', color: isBaseAppMode ? '#00f5ff' : isActive ? 'var(--blue)' : '#94a3b8', fontWeight: 800, fontFamily: isBaseAppMode ? "'Press Start 2P', monospace" : 'inherit' }}>$VIBE</span>}
                          </div>
                        </div>

                        {/* Schedule Key-Values with Icons */}
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', marginBottom: '16px' }}>
                          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: 'rgba(255, 255, 255, 0.65)', padding: '7px 11px', borderRadius: '10px', border: '1px solid rgba(0, 160, 255, 0.12)', gap: '8px' }}>
                            <span style={{ color: '#64748b', fontWeight: 700, fontSize: '0.74rem', whiteSpace: 'nowrap', display: 'inline-flex', alignItems: 'center', gap: '5px', flexShrink: 0 }}>
                              <Calendar size={12} color="#0284c7" /> Start Time
                            </span>
                            <strong style={{ color: isActive ? 'var(--ink)' : '#475569', fontWeight: 700, fontSize: '0.76rem', whiteSpace: 'nowrap', textAlign: 'right' }}>{ep.startTime}</strong>
                          </div>
                          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: 'rgba(255, 255, 255, 0.65)', padding: '7px 11px', borderRadius: '10px', border: '1px solid rgba(0, 160, 255, 0.12)', gap: '8px' }}>
                            <span style={{ color: '#64748b', fontWeight: 700, fontSize: '0.74rem', whiteSpace: 'nowrap', display: 'inline-flex', alignItems: 'center', gap: '5px', flexShrink: 0 }}>
                              <Clock size={12} color="#0284c7" /> End Time
                            </span>
                            <strong style={{ color: isActive ? 'var(--ink)' : '#475569', fontWeight: 700, fontSize: '0.76rem', whiteSpace: 'nowrap', textAlign: 'right' }}>{ep.endTime}</strong>
                          </div>
                        </div>
                      </div>

                      {/* Action Button */}
                      {isActive ? (
                        <a
                          href={ep.link || O1_STAKING_VAULT}
                          target="_blank"
                          rel="noreferrer"
                          className="btn-fill"
                          style={{
                            background: 'var(--blue)',
                            color: '#ffffff',
                            padding: '11px 14px',
                            fontSize: '0.86rem',
                            fontWeight: 800,
                            borderRadius: '12px',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            gap: '6px',
                            width: '100%',
                            textDecoration: 'none',
                            whiteSpace: 'nowrap',
                            boxShadow: '0 4px 16px rgba(0, 0, 255, 0.3)',
                            transition: 'all 0.15s'
                          }}
                        >
                          <span>Stake & Earn</span> <ArrowUpRight size={15} strokeWidth={2.5} />
                        </a>
                      ) : isCompleted ? (
                        <a
                          href={ep.link || O1_STAKING_VAULT}
                          target="_blank"
                          rel="noreferrer"
                          className="btn-fill"
                          style={{
                            background: 'var(--blue)',
                            color: '#ffffff',
                            padding: '11px 14px',
                            fontSize: '0.86rem',
                            fontWeight: 800,
                            borderRadius: '12px',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            gap: '6px',
                            width: '100%',
                            textDecoration: 'none',
                            whiteSpace: 'nowrap',
                            boxShadow: '0 4px 16px rgba(0, 82, 255, 0.3)',
                            transition: 'all 0.15s'
                          }}
                        >
                          <span>Withdraw & Claim Yield</span> <ArrowUpRight size={15} strokeWidth={2.5} />
                        </a>
                      ) : (
                        <button
                          disabled
                          style={{
                            width: '100%',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            padding: '11px 14px',
                            fontSize: '0.86rem',
                            fontWeight: 800,
                            borderRadius: '12px',
                            background: 'rgba(255, 255, 255, 0.75)',
                            color: '#94a3b8',
                            border: '1.5px solid rgba(0, 160, 255, 0.18)',
                            cursor: 'not-allowed',
                            whiteSpace: 'nowrap'
                          }}
                        >
                          Coming Soon
                        </button>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
            {/* Bottom Info Strip: More Epochs Appearing Continuously */}
            <div
              style={{
                marginTop: '24px',
                padding: '14px 20px',
                background: 'rgba(255, 255, 255, 0.65)',
                border: '1px dashed rgba(0, 160, 255, 0.35)',
                borderRadius: '16px',
                textAlign: 'center',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '8px',
                color: '#475569',
                fontSize: '0.84rem',
                fontWeight: 700
              }}
            >
              <Sparkles size={15} color="var(--blue)" />
              <span>More staking epochs will be added continuously</span>
            </div>
          </div>
        )}

        {/* ── 2. VIBE CLUB NFT REWARDS SECTION ── */}
        {activeTab === 'vibe-club' && (
          <div style={{ marginTop: '20px' }}>
            {/* 1. Top 3 Step Action Cards (Signature Brand Turquoise) */}
            <div
              style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))',
                gap: '14px',
                marginBottom: '28px'
              }}
            >
              {/* Step 1 */}
              <div
                style={{
                  background: 'linear-gradient(135deg, rgba(190, 241, 255, 0.55) 0%, rgba(225, 249, 255, 0.75) 100%)',
                  border: '1px solid rgba(0, 160, 255, 0.25)',
                  borderRadius: '16px',
                  padding: '16px 18px',
                  boxShadow: '0 2px 8px rgba(0, 82, 255, 0.04)'
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '6px' }}>
                  <span style={{ fontSize: '0.72rem', fontWeight: 900, color: 'var(--blue)', background: 'rgba(0, 0, 255, 0.12)', width: '22px', height: '22px', borderRadius: '6px', display: 'inline-flex', alignItems: 'center', justifyContent: 'center' }}>1</span>
                  <strong style={{ fontSize: '0.92rem', color: 'var(--ink)', fontWeight: 800 }}>Join Vibe Club</strong>
                </div>
                <p style={{ margin: 0, fontSize: '0.84rem', color: 'var(--ink2)', lineHeight: 1.45 }}>
                  Mint your Vibe Club NFT on the <a href="https://vibeverse.dog/vibeclub" target="_blank" rel="noreferrer" style={{ color: 'var(--blue)', textDecoration: 'underline', fontWeight: 700, display: 'inline-flex', alignItems: 'center', gap: '3px' }}>Mint Page <ArrowUpRight size={13} strokeWidth={2.5} /></a> to become eligible for club royalties.
                </p>
              </div>

              {/* Step 2 */}
              <div
                style={{
                  background: 'linear-gradient(135deg, rgba(190, 241, 255, 0.55) 0%, rgba(225, 249, 255, 0.75) 100%)',
                  border: '1px solid rgba(0, 160, 255, 0.25)',
                  borderRadius: '16px',
                  padding: '16px 18px',
                  boxShadow: '0 2px 8px rgba(0, 82, 255, 0.04)'
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '6px' }}>
                  <span style={{ fontSize: '0.72rem', fontWeight: 900, color: 'var(--blue)', background: 'rgba(0, 0, 255, 0.12)', width: '22px', height: '22px', borderRadius: '6px', display: 'inline-flex', alignItems: 'center', justifyContent: 'center' }}>2</span>
                  <strong style={{ fontSize: '0.92rem', color: 'var(--ink)', fontWeight: 800 }}>Claim Club Royalties</strong>
                </div>
                <p style={{ margin: 0, fontSize: '0.84rem', color: 'var(--ink2)', lineHeight: 1.45 }}>
                  Available to all Vibe Club NFT holders at the time of snapshots at 00:00 UTC on claim day.
                </p>
              </div>

              {/* Step 3 */}
              <div
                style={{
                  background: 'linear-gradient(135deg, rgba(190, 241, 255, 0.55) 0%, rgba(225, 249, 255, 0.75) 100%)',
                  border: '1px solid rgba(0, 160, 255, 0.25)',
                  borderRadius: '16px',
                  padding: '16px 18px',
                  boxShadow: '0 2px 8px rgba(0, 82, 255, 0.04)'
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '6px' }}>
                  <span style={{ fontSize: '0.72rem', fontWeight: 900, color: '#059669', background: 'rgba(16, 185, 129, 0.14)', width: '22px', height: '22px', borderRadius: '6px', display: 'inline-flex', alignItems: 'center', justifyContent: 'center' }}>3</span>
                  <strong style={{ fontSize: '0.92rem', color: 'var(--ink)', fontWeight: 800 }}>Vibe Club Royalty Pool</strong>
                </div>
                <p style={{ margin: 0, fontSize: '0.84rem', color: 'var(--ink2)', lineHeight: 1.45 }}>
                  Equals 15% of the total Community Pool available at the start of each epoch.
                </p>
              </div>
            </div>

            {/* 2. Sub-Header: Title & Filter Tabs */}
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'flex-start', flexWrap: 'wrap', gap: '16px', marginBottom: '20px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <h3 style={{ fontSize: '1.25rem', fontWeight: 900, margin: 0, color: 'var(--ink)', letterSpacing: '-0.02em' }}>
                  Vibe Club Royalties
                </h3>
                <span style={{ fontSize: '0.72rem', fontWeight: 800, background: '#f1f5f9', color: '#475569', padding: '2px 8px', borderRadius: '99px', border: '1px solid #cbd5e1' }}>
                  {filteredVibeClubEpochs.length}
                </span>
              </div>

              {/* Status Filters */}
              <div
                style={{
                  display: 'flex',
                  gap: isBaseAppMode ? '4px' : '4px',
                  background: isBaseAppMode ? 'rgba(2, 11, 26, 0.85)' : '#f1f5f9',
                  padding: '3px 4px',
                  borderRadius: '10px',
                  border: isBaseAppMode ? '1px solid rgba(0, 245, 255, 0.25)' : '1px solid #e2e8f0',
                  flexWrap: 'nowrap',
                  overflowX: 'auto',
                  maxWidth: '100%',
                  boxSizing: 'border-box'
                }}
              >
                {[
                  { id: 'all', label: `All (${vibeClubCounts.all})` },
                  { id: 'active', label: `Active (${vibeClubCounts.active})` },
                  { id: 'upcoming', label: `Upcoming (${vibeClubCounts.upcoming})` },
                  { id: 'ended', label: `Ended (${vibeClubCounts.ended})` }
                ].map(f => {
                  const isFActive = vibeClubFilter === f.id;
                  return (
                    <button
                      key={f.id}
                      onClick={() => setVibeClubFilter(f.id)}
                      style={{
                        fontFamily: isBaseAppMode ? "'Press Start 2P', monospace" : 'var(--font)',
                        background: isFActive ? (isBaseAppMode ? '#0052ff' : 'var(--blue)') : 'transparent',
                        color: isFActive ? '#ffffff' : (isBaseAppMode ? '#cbd5e1' : '#64748b'),
                        border: 'none',
                        padding: isBaseAppMode ? '6px 8px' : '4px 10px',
                        borderRadius: '8px',
                        fontSize: isBaseAppMode ? '6.5px' : '0.72rem',
                        fontWeight: 800,
                        whiteSpace: 'nowrap',
                        flexShrink: 0,
                        cursor: 'pointer',
                        transition: 'all 0.15s',
                        boxShadow: isFActive && isBaseAppMode ? '0 0 8px rgba(0, 82, 255, 0.4)' : 'none'
                      }}
                    >
                      {f.label}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* 3. 4 Scalable Vibe Club Epoch Cards Grid */}
            {filteredVibeClubEpochs.length === 0 ? (
              <div style={{ padding: '36px 20px', textAlign: 'center', background: '#ffffff', borderRadius: '20px', border: '1px solid #e2e8f0', color: '#64748b', fontSize: '0.9rem' }}>
                No royalty rounds found for this filter.
              </div>
            ) : (
              <div
                style={{
                  display: 'grid',
                  gridTemplateColumns: 'repeat(auto-fill, minmax(min(100%, 270px), 1fr))',
                  gap: '16px'
                }}
              >
                {filteredVibeClubEpochs.map((ep, idx) => {
                  const status = getRewardEpochStatus(ep, now);
                  const isActive = status === 'active';
                  const isCompleted = status === 'ended';
                  const isUpcoming = status === 'upcoming';
                  const isClaimLive = isActive && ep.dateObj && now >= ep.dateObj;

                  return (
                    <div
                      key={ep.epoch || idx}
                      style={{
                        background: isActive
                          ? 'linear-gradient(145deg, rgba(215, 246, 255, 0.85) 0%, rgba(240, 252, 255, 0.95) 100%)'
                          : isCompleted
                          ? 'linear-gradient(145deg, rgba(241, 245, 249, 0.9) 0%, rgba(248, 250, 252, 0.95) 100%)'
                          : 'linear-gradient(145deg, rgba(225, 248, 255, 0.55) 0%, rgba(245, 253, 255, 0.8) 100%)',
                        border: isActive ? '2px solid var(--blue)' : isCompleted ? '1.5px solid #cbd5e1' : '1.5px solid rgba(0, 160, 255, 0.25)',
                        borderRadius: '22px',
                        padding: '18px 20px',
                        display: 'flex',
                        flexDirection: 'column',
                        justifyContent: 'space-between',
                        boxShadow: isActive ? '0 12px 36px -4px rgba(0, 82, 255, 0.16), 0 2px 10px rgba(0, 0, 0, 0.04)' : '0 4px 16px rgba(0, 82, 255, 0.05)',
                        position: 'relative',
                        transition: 'all 0.2s'
                      }}
                    >
                      <div>
                        {/* Header with Mascot & Status Badge */}
                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '14px', gap: '8px' }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flexShrink: 0 }}>
                            <img
                              src="/new-logo-vibe.png"
                              alt="VIBE"
                              style={{
                                width: '38px',
                                height: '38px',
                                borderRadius: '50%',
                                objectFit: 'cover',
                                border: isActive ? '2px solid var(--blue)' : isCompleted ? '1.5px solid #cbd5e1' : '1.5px solid rgba(0, 160, 255, 0.3)',
                                boxShadow: isActive ? '0 2px 8px rgba(0, 82, 255, 0.15)' : 'none',
                                flexShrink: 0
                              }}
                            />
                            <h4 style={{ margin: 0, fontSize: '1.05rem', fontWeight: 900, color: 'var(--ink)', letterSpacing: '-0.02em', whiteSpace: 'nowrap' }}>
                              {ep.epoch}
                            </h4>
                          </div>

                          <span
                            style={{
                              padding: '4px 10px',
                              borderRadius: '99px',
                              fontSize: '0.66rem',
                              fontWeight: 900,
                              textTransform: 'uppercase',
                              letterSpacing: '0.04em',
                              background: (isClaimLive || isActive) ? '#ecfdf5' : isCompleted ? '#f1f5f9' : 'rgba(255, 255, 255, 0.9)',
                              color: (isClaimLive || isActive) ? '#059669' : isCompleted ? '#64748b' : '#64748b',
                              border: (isClaimLive || isActive) ? '1px solid #a7f3d0' : isCompleted ? '1px solid #cbd5e1' : '1px solid rgba(0, 160, 255, 0.25)',
                              display: 'inline-flex',
                              alignItems: 'center',
                              gap: '5px',
                              whiteSpace: 'nowrap',
                              flexShrink: 0,
                              boxShadow: (isClaimLive || isActive) ? '0 2px 8px rgba(16, 185, 129, 0.15)' : 'none'
                            }}
                          >
                            {isClaimLive ? (
                              <>
                                <span style={{ width: '6px', height: '6px', borderRadius: '50%', background: '#10b981', boxShadow: '0 0 6px #10b981', flexShrink: 0 }} />
                                <ActiveClaimCountdown targetDate={ep.nextSnapshotDate} />
                              </>
                            ) : isActive ? (
                              <>
                                <span style={{ width: '6px', height: '6px', borderRadius: '50%', background: '#10b981', boxShadow: '0 0 6px #10b981', flexShrink: 0 }} />
                                Active
                              </>
                            ) : isCompleted ? (
                              'Ended'
                            ) : (
                              <>
                                <Lock size={11} color="#64748b" style={{ flexShrink: 0 }} />
                                Locked
                              </>
                            )}
                          </span>
                        </div>

                        {/* Metric Box (Royalty Pool) */}
                        <div
                          style={{
                            background: '#ffffff',
                            borderRadius: '16px',
                            padding: '14px 16px',
                            border: '1px solid rgba(0, 160, 255, 0.22)',
                            boxShadow: '0 3px 12px rgba(0, 82, 255, 0.05)',
                            marginBottom: '14px'
                          }}
                        >
                          <div style={{ fontSize: isBaseAppMode ? '6.5px' : '0.66rem', color: '#88aacc', textTransform: 'uppercase', fontWeight: 800, letterSpacing: '0.05em', display: 'flex', alignItems: 'center', gap: '4px', whiteSpace: 'nowrap', marginBottom: '4px', fontFamily: isBaseAppMode ? "'Press Start 2P', monospace" : 'inherit' }}>
                            <Coins size={12} color={isBaseAppMode ? '#00f5ff' : 'var(--blue)'} /> Royalty Pool
                          </div>
                          <div style={{ fontSize: isBaseAppMode ? '10px' : '1.42rem', fontWeight: 900, color: isBaseAppMode ? '#00f5ff' : isActive ? 'var(--ink)' : '#64748b', marginTop: '2px', letterSpacing: isBaseAppMode ? '0.2px' : '-0.02em', display: 'flex', alignItems: 'baseline', gap: '5px', whiteSpace: 'nowrap', fontFamily: isBaseAppMode ? "'Press Start 2P', monospace" : 'inherit', textShadow: isBaseAppMode ? '0 0 10px rgba(0, 245, 255, 0.45)' : 'none' }}>
                            {ep.poolAmount}
                          </div>
                        </div>

                        {/* Schedule Key-Values with Icons */}
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', marginBottom: '16px' }}>
                          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: 'rgba(255, 255, 255, 0.65)', padding: '7px 11px', borderRadius: '10px', border: '1px solid rgba(0, 160, 255, 0.12)', gap: '8px' }}>
                            <span style={{ color: '#64748b', fontWeight: 700, fontSize: '0.74rem', whiteSpace: 'nowrap', display: 'inline-flex', alignItems: 'center', gap: '5px', flexShrink: 0 }}>
                              <ShieldCheck size={12} color="#0284c7" /> Requirement
                            </span>
                            <strong style={{ color: isActive ? 'var(--ink)' : '#475569', fontWeight: 700, fontSize: '0.76rem', whiteSpace: 'nowrap', textAlign: 'right' }}>NFT Holder</strong>
                          </div>
                          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: 'rgba(255, 255, 255, 0.65)', padding: '7px 11px', borderRadius: '10px', border: '1px solid rgba(0, 160, 255, 0.12)', gap: '8px' }}>
                            <span style={{ color: '#64748b', fontWeight: 700, fontSize: '0.74rem', whiteSpace: 'nowrap', display: 'inline-flex', alignItems: 'center', gap: '5px', flexShrink: 0 }}>
                              <Clock size={12} color="#0284c7" /> Holder Snapshot
                            </span>
                            <strong style={{ color: isActive ? 'var(--ink)' : '#475569', fontWeight: 700, fontSize: '0.76rem', whiteSpace: 'nowrap', textAlign: 'right' }}>{ep.snapshotTime}</strong>
                          </div>
                          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: 'rgba(255, 255, 255, 0.65)', padding: '7px 11px', borderRadius: '10px', border: '1px solid rgba(0, 160, 255, 0.12)', gap: '8px' }}>
                            <span style={{ color: '#64748b', fontWeight: 700, fontSize: '0.74rem', whiteSpace: 'nowrap', display: 'inline-flex', alignItems: 'center', gap: '5px', flexShrink: 0 }}>
                              <Calendar size={12} color="#0284c7" /> Claim Date
                            </span>
                            <strong style={{ color: isActive ? 'var(--ink)' : '#475569', fontWeight: 700, fontSize: '0.76rem', whiteSpace: 'nowrap', textAlign: 'right' }}>{ep.claimDate}</strong>
                          </div>
                        </div>
                      </div>

                      {/* Action Button: Claim redirect, Pre-claim countdown, Claim Ended, or Locked */}
                      {isCompleted ? (
                        <button
                          disabled
                          style={{
                            width: '100%',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            padding: '11px 14px',
                            fontSize: '0.86rem',
                            fontWeight: 800,
                            borderRadius: '12px',
                            background: '#f1f5f9',
                            color: '#94a3b8',
                            border: '1.5px solid #cbd5e1',
                            cursor: 'not-allowed',
                            whiteSpace: 'nowrap',
                            gap: '6px'
                          }}
                        >
                          <Clock size={13} /> Claim Ended
                        </button>
                      ) : isClaimLive ? (
                        <>
                          <Link
                            to="/claim"
                            className="btn-fill"
                            style={{
                              background: 'var(--blue)',
                              color: '#ffffff',
                              padding: '11px 14px',
                              fontSize: '0.86rem',
                              fontWeight: 800,
                              borderRadius: '12px',
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'center',
                              gap: '6px',
                              width: '100%',
                              textDecoration: 'none',
                              whiteSpace: 'nowrap',
                              boxShadow: '0 4px 16px rgba(0, 0, 255, 0.3)',
                              transition: 'all 0.15s'
                            }}
                          >
                            <span>Claim</span> <ArrowUpRight size={15} strokeWidth={2.5} />
                          </Link>
                          <div
                            style={{
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'center',
                              gap: '5px',
                              fontSize: '0.72rem',
                              fontWeight: 700,
                              color: '#059669',
                              marginTop: '8px'
                            }}
                          >
                            <CheckCircle2 size={13} color="#059669" strokeWidth={2.5} />
                            Snapshot Completed: {ep.snapshotTime}
                          </div>
                        </>
                      ) : isActive ? (
                        <>
                          <ClaimCountdownButton targetDate={ep.dateObj} />
                          <div
                            style={{
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'center',
                              gap: '5px',
                              fontSize: '0.72rem',
                              fontWeight: 700,
                              color: '#059669',
                              marginTop: '8px'
                            }}
                          >
                            <CheckCircle2 size={13} color="#059669" strokeWidth={2.5} />
                            Snapshot Completed: {ep.snapshotTime}
                          </div>
                        </>
                      ) : (
                        <button
                          disabled
                          style={{
                            width: '100%',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            padding: '11px 14px',
                            fontSize: '0.86rem',
                            fontWeight: 800,
                            borderRadius: '12px',
                            background: 'rgba(255, 255, 255, 0.75)',
                            color: '#94a3b8',
                            border: '1.5px solid rgba(0, 160, 255, 0.18)',
                            cursor: 'not-allowed',
                            whiteSpace: 'nowrap',
                            gap: '6px'
                          }}
                        >
                          <Lock size={13} /> Locked
                        </button>
                      )}
                    </div>
                  );
                })}
              </div>
            )}

            {/* Bottom Info Strip */}
            <div
              style={{
                marginTop: '24px',
                padding: '14px 20px',
                background: 'rgba(255, 255, 255, 0.65)',
                border: '1px dashed rgba(0, 160, 255, 0.35)',
                borderRadius: '16px',
                textAlign: 'center',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '8px',
                color: '#475569',
                fontSize: '0.84rem',
                fontWeight: 700
              }}
            >
              <Sparkles size={15} color="var(--blue)" />
              <span>More Vibe Club epochs will be added continuously</span>
            </div>
          </div>
        )}

        {/* ── 4. HOLDER REWARDS VESTING SECTION ── */}
        {activeTab === 'holders' && (
          <div style={{ marginTop: '20px' }}>
            {/* 1. Top 3 Step Action Cards (Signature Brand Turquoise) */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '14px', marginBottom: '28px' }}>
              <div
                style={{
                  background: 'linear-gradient(135deg, rgba(190, 241, 255, 0.55) 0%, rgba(225, 249, 255, 0.75) 100%)',
                  border: '1px solid rgba(0, 160, 255, 0.25)',
                  borderRadius: '16px',
                  padding: '16px 18px',
                  boxShadow: '0 2px 8px rgba(0, 82, 255, 0.04)'
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '6px' }}>
                  <span style={{ fontSize: '0.72rem', fontWeight: 900, color: 'var(--blue)', background: 'rgba(0, 0, 255, 0.12)', width: '22px', height: '22px', borderRadius: '6px', display: 'inline-flex', alignItems: 'center', justifyContent: 'center' }}>1</span>
                  <strong style={{ fontSize: '0.92rem', color: 'var(--ink)', fontWeight: 800 }}>Explore Holder Rewards Details</strong>
                </div>
                <p style={{ margin: 0, fontSize: '0.84rem', color: 'var(--ink2)', lineHeight: 1.45 }}>
                  All vesting details and schedule are available in the <a href="/tokenomics#vesting-details" target="_blank" rel="noreferrer" style={{ color: 'var(--blue)', textDecoration: 'underline', fontWeight: 700, display: 'inline-flex', alignItems: 'center', gap: '3px' }}>Tokenomics <ArrowUpRight size={13} strokeWidth={2.5} /></a> section under Vesting Details.
                </p>
              </div>

              <div
                style={{
                  background: 'linear-gradient(135deg, rgba(190, 241, 255, 0.55) 0%, rgba(225, 249, 255, 0.75) 100%)',
                  border: '1px solid rgba(0, 160, 255, 0.25)',
                  borderRadius: '16px',
                  padding: '16px 18px',
                  boxShadow: '0 2px 8px rgba(0, 82, 255, 0.04)'
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '6px' }}>
                  <span style={{ fontSize: '0.72rem', fontWeight: 900, color: 'var(--blue)', background: 'rgba(0, 0, 255, 0.12)', width: '22px', height: '22px', borderRadius: '6px', display: 'inline-flex', alignItems: 'center', justifyContent: 'center' }}>2</span>
                  <strong style={{ fontSize: '0.92rem', color: 'var(--ink)', fontWeight: 800 }}>Buy &amp; Hold</strong>
                </div>
                <p style={{ margin: 0, fontSize: '0.84rem', color: 'var(--ink2)', lineHeight: 1.45 }}>
                  Hold 5M+ $VIBE tokens at the time of each unlock snapshot to share the pool.
                </p>
              </div>

              <div
                style={{
                  background: 'linear-gradient(135deg, rgba(190, 241, 255, 0.55) 0%, rgba(225, 249, 255, 0.75) 100%)',
                  border: '1px solid rgba(0, 160, 255, 0.25)',
                  borderRadius: '16px',
                  padding: '16px 18px',
                  boxShadow: '0 2px 8px rgba(0, 82, 255, 0.04)'
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '6px' }}>
                  <span style={{ fontSize: '0.72rem', fontWeight: 900, color: '#059669', background: 'rgba(16, 185, 129, 0.14)', width: '22px', height: '22px', borderRadius: '6px', display: 'inline-flex', alignItems: 'center', justifyContent: 'center' }}>3</span>
                  <strong style={{ fontSize: '0.92rem', color: 'var(--ink)', fontWeight: 800 }}>Holder Rewards Pool</strong>
                </div>
                <p style={{ margin: 0, fontSize: '0.84rem', color: 'var(--ink2)', lineHeight: 1.45 }}>
                  100M $VIBE vested with 10M monthly unlocks distributed among all eligible holders.
                </p>
              </div>
            </div>

            {/* 2. Sub-Header: Title & Filter Tabs */}
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'flex-start', flexWrap: 'wrap', gap: '16px', marginBottom: '20px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <h3 style={{ fontSize: '1.25rem', fontWeight: 900, margin: 0, color: 'var(--ink)', letterSpacing: '-0.02em' }}>
                  Holder Rewards
                </h3>
                <span style={{ fontSize: '0.72rem', fontWeight: 800, background: '#f1f5f9', color: '#475569', padding: '2px 8px', borderRadius: '99px', border: '1px solid #cbd5e1' }}>
                  {filteredHolderUnlocks.length}
                </span>
              </div>

              {/* Status Filters */}
              <div
                style={{
                  display: 'flex',
                  gap: isBaseAppMode ? '4px' : '4px',
                  background: isBaseAppMode ? 'rgba(2, 11, 26, 0.85)' : '#f1f5f9',
                  padding: '3px 4px',
                  borderRadius: '10px',
                  border: isBaseAppMode ? '1px solid rgba(0, 245, 255, 0.25)' : '1px solid #e2e8f0',
                  flexWrap: 'nowrap',
                  overflowX: 'auto',
                  maxWidth: '100%',
                  boxSizing: 'border-box'
                }}
              >
                {[
                  { id: 'all', label: `All (${holderCounts.all})` },
                  { id: 'active', label: `Active (${holderCounts.active})` },
                  { id: 'upcoming', label: `Upcoming (${holderCounts.upcoming})` },
                  { id: 'ended', label: `Ended (${holderCounts.ended})` }
                ].map(f => {
                  const isFActive = holderFilter === f.id;
                  return (
                    <button
                      key={f.id}
                      onClick={() => setHolderFilter(f.id)}
                      style={{
                        fontFamily: isBaseAppMode ? "'Press Start 2P', monospace" : 'var(--font)',
                        background: isFActive ? (isBaseAppMode ? '#0052ff' : 'var(--blue)') : 'transparent',
                        color: isFActive ? '#ffffff' : (isBaseAppMode ? '#cbd5e1' : '#64748b'),
                        border: 'none',
                        padding: isBaseAppMode ? '6px 8px' : '4px 10px',
                        borderRadius: '8px',
                        fontSize: isBaseAppMode ? '6.5px' : '0.72rem',
                        fontWeight: 800,
                        whiteSpace: 'nowrap',
                        flexShrink: 0,
                        cursor: 'pointer',
                        transition: 'all 0.15s',
                        boxShadow: isFActive && isBaseAppMode ? '0 0 8px rgba(0, 82, 255, 0.4)' : 'none'
                      }}
                    >
                      {f.label}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* 3. 10 Scalable Holder Unlock Cards Grid */}
            {filteredHolderUnlocks.length === 0 ? (
              <div style={{ padding: '36px 20px', textAlign: 'center', background: '#ffffff', borderRadius: '20px', border: '1px solid #e2e8f0', color: '#64748b', fontSize: '0.9rem' }}>
                No unlock rounds found for this filter.
              </div>
            ) : (
              <div
                style={{
                  display: 'grid',
                  gridTemplateColumns: 'repeat(auto-fill, minmax(min(100%, 270px), 1fr))',
                  gap: '16px'
                }}
              >
                {filteredHolderUnlocks.map((u, idx) => {
                  const status = getRewardEpochStatus(u, now);
                  const isActive = status === 'active';
                  const isCompleted = status === 'ended';
                  const isUpcoming = status === 'upcoming';
                  const isClaimLive = isActive && u.dateObj && now >= u.dateObj;

                  return (
                    <div
                      key={u.unlock || idx}
                      style={{
                        background: isActive
                          ? 'linear-gradient(145deg, rgba(215, 246, 255, 0.85) 0%, rgba(240, 252, 255, 0.95) 100%)'
                          : isCompleted
                          ? 'linear-gradient(145deg, rgba(241, 245, 249, 0.9) 0%, rgba(248, 250, 252, 0.95) 100%)'
                          : 'linear-gradient(145deg, rgba(225, 248, 255, 0.55) 0%, rgba(245, 253, 255, 0.8) 100%)',
                        border: isActive ? '2px solid var(--blue)' : isCompleted ? '1.5px solid #cbd5e1' : '1.5px solid rgba(0, 160, 255, 0.25)',
                        borderRadius: '22px',
                        padding: '18px 20px',
                        display: 'flex',
                        flexDirection: 'column',
                        justifyContent: 'space-between',
                        boxShadow: isActive ? '0 12px 36px -4px rgba(0, 82, 255, 0.16), 0 2px 10px rgba(0, 0, 0, 0.04)' : '0 4px 16px rgba(0, 82, 255, 0.05)',
                        position: 'relative',
                        transition: 'all 0.2s'
                      }}
                    >
                      <div>
                        {/* Header with Mascot & Status Badge */}
                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '14px', gap: '8px' }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flexShrink: 0 }}>
                            <img
                              src="/new-logo-vibe.png"
                              alt="VIBE"
                              style={{
                                width: '38px',
                                height: '38px',
                                borderRadius: '50%',
                                objectFit: 'cover',
                                border: isActive ? '2px solid var(--blue)' : isCompleted ? '1.5px solid #cbd5e1' : '1.5px solid rgba(0, 160, 255, 0.3)',
                                boxShadow: isActive ? '0 2px 8px rgba(0, 82, 255, 0.15)' : 'none',
                                flexShrink: 0
                              }}
                            />
                            <h4 style={{ margin: 0, fontSize: '1.05rem', fontWeight: 900, color: 'var(--ink)', letterSpacing: '-0.02em', whiteSpace: 'nowrap' }}>
                              {u.unlock}
                            </h4>
                          </div>

                          <span
                            style={{
                              padding: '4px 10px',
                              borderRadius: '99px',
                              fontSize: '0.66rem',
                              fontWeight: 900,
                              textTransform: 'uppercase',
                              letterSpacing: '0.04em',
                              background: (isClaimLive || isActive) ? '#ecfdf5' : isCompleted ? '#f1f5f9' : 'rgba(255, 255, 255, 0.9)',
                              color: (isClaimLive || isActive) ? '#059669' : isCompleted ? '#64748b' : '#64748b',
                              border: (isClaimLive || isActive) ? '1px solid #a7f3d0' : isCompleted ? '1px solid #cbd5e1' : '1px solid rgba(0, 160, 255, 0.25)',
                              display: 'inline-flex',
                              alignItems: 'center',
                              gap: '5px',
                              whiteSpace: 'nowrap',
                              flexShrink: 0,
                              boxShadow: (isClaimLive || isActive) ? '0 2px 8px rgba(16, 185, 129, 0.15)' : 'none'
                            }}
                          >
                            {isClaimLive ? (
                              <>
                                <span style={{ width: '6px', height: '6px', borderRadius: '50%', background: '#10b981', boxShadow: '0 0 6px #10b981', flexShrink: 0 }} />
                                <ActiveClaimCountdown targetDate={u.nextSnapshotDate} />
                              </>
                            ) : isActive ? (
                              <>
                                <span style={{ width: '6px', height: '6px', borderRadius: '50%', background: '#10b981', boxShadow: '0 0 6px #10b981', flexShrink: 0 }} />
                                Active
                              </>
                            ) : isCompleted ? (
                              'Ended'
                            ) : (
                              <>
                                <Lock size={11} color="#64748b" style={{ flexShrink: 0 }} />
                                Locked
                              </>
                            )}
                          </span>
                        </div>

                        {/* Metric Box (Rewards Pool) */}
                        <div
                          style={{
                            background: '#ffffff',
                            borderRadius: '16px',
                            padding: '14px 16px',
                            border: '1px solid rgba(0, 160, 255, 0.22)',
                            boxShadow: '0 3px 12px rgba(0, 82, 255, 0.05)',
                            marginBottom: '14px'
                          }}
                        >
                          <div style={{ fontSize: isBaseAppMode ? '6.5px' : '0.66rem', color: '#88aacc', textTransform: 'uppercase', fontWeight: 800, letterSpacing: '0.05em', display: 'flex', alignItems: 'center', gap: '4px', whiteSpace: 'nowrap', marginBottom: '4px', fontFamily: isBaseAppMode ? "'Press Start 2P', monospace" : 'inherit' }}>
                            <Coins size={12} color={isBaseAppMode ? '#00f5ff' : 'var(--blue)'} /> Rewards Pool
                          </div>
                          <div style={{ fontSize: isBaseAppMode ? '10px' : '1.42rem', fontWeight: 900, color: isBaseAppMode ? '#00f5ff' : isActive ? 'var(--ink)' : '#64748b', marginTop: '2px', letterSpacing: isBaseAppMode ? '0.2px' : '-0.02em', display: 'flex', alignItems: 'baseline', gap: '5px', whiteSpace: 'nowrap', fontFamily: isBaseAppMode ? "'Press Start 2P', monospace" : 'inherit', textShadow: isBaseAppMode ? '0 0 10px rgba(0, 245, 255, 0.45)' : 'none' }}>
                            {u.poolAmount} <span style={{ fontSize: isBaseAppMode ? '7.5px' : '0.88rem', color: isBaseAppMode ? '#00f5ff' : isActive ? 'var(--blue)' : '#94a3b8', fontWeight: 800, fontFamily: isBaseAppMode ? "'Press Start 2P', monospace" : 'inherit' }}>$VIBE</span>
                          </div>
                        </div>

                        {/* Schedule Key-Values with Icons */}
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', marginBottom: '16px' }}>
                          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: 'rgba(255, 255, 255, 0.65)', padding: '7px 11px', borderRadius: '10px', border: '1px solid rgba(0, 160, 255, 0.12)', gap: '8px' }}>
                            <span style={{ color: '#64748b', fontWeight: 700, fontSize: '0.74rem', whiteSpace: 'nowrap', display: 'inline-flex', alignItems: 'center', gap: '5px', flexShrink: 0 }}>
                              <ShieldCheck size={12} color="#0284c7" /> Requirement
                            </span>
                            <strong style={{ color: isActive ? 'var(--ink)' : '#475569', fontWeight: 700, fontSize: '0.76rem', whiteSpace: 'nowrap', textAlign: 'right' }}>5M+ $VIBE Balance</strong>
                          </div>
                          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: 'rgba(255, 255, 255, 0.65)', padding: '7px 11px', borderRadius: '10px', border: '1px solid rgba(0, 160, 255, 0.12)', gap: '8px' }}>
                            <span style={{ color: '#64748b', fontWeight: 700, fontSize: '0.74rem', whiteSpace: 'nowrap', display: 'inline-flex', alignItems: 'center', gap: '5px', flexShrink: 0 }}>
                              <Clock size={12} color="#0284c7" /> Balance Snapshot
                            </span>
                            <strong style={{ color: isActive ? 'var(--ink)' : '#475569', fontWeight: 700, fontSize: '0.76rem', whiteSpace: 'nowrap', textAlign: 'right' }}>{u.snapshotTime}</strong>
                          </div>
                          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: 'rgba(255, 255, 255, 0.65)', padding: '7px 11px', borderRadius: '10px', border: '1px solid rgba(0, 160, 255, 0.12)', gap: '8px' }}>
                            <span style={{ color: '#64748b', fontWeight: 700, fontSize: '0.74rem', whiteSpace: 'nowrap', display: 'inline-flex', alignItems: 'center', gap: '5px', flexShrink: 0 }}>
                              <Calendar size={12} color="#0284c7" /> Unlock Date
                            </span>
                            <strong style={{ color: isActive ? 'var(--ink)' : '#475569', fontWeight: 700, fontSize: '0.76rem', whiteSpace: 'nowrap', textAlign: 'right' }}>{u.unlockDate}</strong>
                          </div>
                        </div>
                      </div>

                      {/* Action Button: Claim redirect, Pre-claim countdown, Claim Ended, or Locked */}
                      {isCompleted ? (
                        <button
                          disabled
                          style={{
                            width: '100%',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            padding: '11px 14px',
                            fontSize: '0.86rem',
                            fontWeight: 800,
                            borderRadius: '12px',
                            background: '#f1f5f9',
                            color: '#94a3b8',
                            border: '1.5px solid #cbd5e1',
                            cursor: 'not-allowed',
                            whiteSpace: 'nowrap',
                            gap: '6px'
                          }}
                        >
                          <Clock size={13} /> Claim Ended
                        </button>
                      ) : isClaimLive ? (
                        <>
                          <Link
                            to="/claim"
                            className="btn-fill"
                            style={{
                              background: 'var(--blue)',
                              color: '#ffffff',
                              padding: '11px 14px',
                              fontSize: '0.86rem',
                              fontWeight: 800,
                              borderRadius: '12px',
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'center',
                              gap: '6px',
                              width: '100%',
                              textDecoration: 'none',
                              whiteSpace: 'nowrap',
                              boxShadow: '0 4px 16px rgba(0, 0, 255, 0.3)',
                              transition: 'all 0.15s'
                            }}
                          >
                            <span>Claim</span> <ArrowUpRight size={15} strokeWidth={2.5} />
                          </Link>
                          <div
                            style={{
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'center',
                              gap: '5px',
                              fontSize: '0.72rem',
                              fontWeight: 700,
                              color: '#059669',
                              marginTop: '8px'
                            }}
                          >
                            <CheckCircle2 size={13} color="#059669" strokeWidth={2.5} />
                            Snapshot Completed: {u.snapshotTime}
                          </div>
                        </>
                      ) : isActive ? (
                        <>
                          <ClaimCountdownButton targetDate={u.dateObj} />
                          <div
                            style={{
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'center',
                              gap: '5px',
                              fontSize: '0.72rem',
                              fontWeight: 700,
                              color: '#059669',
                              marginTop: '8px'
                            }}
                          >
                            <CheckCircle2 size={13} color="#059669" strokeWidth={2.5} />
                            Snapshot Completed: {u.snapshotTime}
                          </div>
                        </>
                      ) : (
                        <button
                          disabled
                          style={{
                            width: '100%',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            padding: '11px 14px',
                            fontSize: '0.86rem',
                            fontWeight: 800,
                            borderRadius: '12px',
                            background: 'rgba(255, 255, 255, 0.75)',
                            color: '#94a3b8',
                            border: '1.5px solid rgba(0, 160, 255, 0.18)',
                            cursor: 'not-allowed',
                            whiteSpace: 'nowrap',
                            gap: '6px'
                          }}
                        >
                          <Lock size={13} /> Locked
                        </button>
                      )}
                    </div>
                  );
                })}
              </div>
            )}

          </div>
        )}

        {/* ── 5. GIVEAWAYS SECTION ── */}
        {activeTab === 'giveaways' && (
          <div style={{ marginTop: '20px' }}>
            {/* Sub-Header: Title & Filter Tabs */}
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'flex-start', flexWrap: 'wrap', gap: '16px', marginBottom: '20px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <h3 style={{ fontSize: '1.25rem', fontWeight: 900, margin: 0, color: 'var(--ink)', letterSpacing: '-0.02em' }}>
                  Giveaways
                </h3>
                <span style={{ fontSize: '0.72rem', fontWeight: 800, background: '#f1f5f9', color: '#475569', padding: '2px 8px', borderRadius: '99px', border: '1px solid #cbd5e1' }}>
                  {filteredGiveaways.length}
                </span>
              </div>

              {/* Status Filters */}
              <div
                style={{
                  display: 'flex',
                  gap: isBaseAppMode ? '4px' : '4px',
                  background: isBaseAppMode ? 'rgba(2, 11, 26, 0.85)' : '#f1f5f9',
                  padding: '3px 4px',
                  borderRadius: '10px',
                  border: isBaseAppMode ? '1px solid rgba(0, 245, 255, 0.25)' : '1px solid #e2e8f0',
                  flexWrap: 'nowrap',
                  overflowX: 'auto',
                  maxWidth: '100%',
                  boxSizing: 'border-box'
                }}
              >
                {[
                  { id: 'all', label: `All (${giveawayCounts.all})` },
                  { id: 'active', label: `Active (${giveawayCounts.active})` },
                  { id: 'ended', label: `Ended (${giveawayCounts.ended})` }
                ].map(f => {
                  const isFActive = (giveawayFilter === f.id || (f.id === 'active' && giveawayFilter === 'ongoing'));
                  return (
                    <button
                      key={f.id}
                      onClick={() => setGiveawayFilter(f.id)}
                      style={{
                        fontFamily: isBaseAppMode ? "'Press Start 2P', monospace" : 'var(--font)',
                        background: isFActive ? (isBaseAppMode ? '#0052ff' : 'var(--blue)') : 'transparent',
                        color: isFActive ? '#ffffff' : (isBaseAppMode ? '#cbd5e1' : '#64748b'),
                        border: 'none',
                        padding: isBaseAppMode ? '6px 8px' : '4px 10px',
                        borderRadius: '8px',
                        fontSize: isBaseAppMode ? '6.5px' : '0.72rem',
                        fontWeight: 800,
                        whiteSpace: 'nowrap',
                        flexShrink: 0,
                        cursor: 'pointer',
                        transition: 'all 0.15s',
                        boxShadow: isFActive && isBaseAppMode ? '0 0 8px rgba(0, 82, 255, 0.4)' : 'none'
                      }}
                    >
                      {f.label}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Giveaways Grid */}
            {filteredGiveaways.length === 0 ? (
              <div style={{ padding: '36px 20px', textAlign: 'center', background: '#ffffff', borderRadius: '20px', border: '1px solid #e2e8f0', color: '#64748b', fontSize: '0.9rem' }}>
                No giveaways found for this filter.
              </div>
            ) : (
              <div
                style={{
                  display: 'grid',
                  gridTemplateColumns: 'repeat(auto-fill, minmax(min(100%, 270px), 1fr))',
                  gap: '16px'
                }}
              >
                {filteredGiveaways.map((ev) => {
                  const isOngoing = ev.status === 'ongoing';

                  return (
                    <div
                      key={ev.id}
                      style={{
                        background: isOngoing
                          ? 'linear-gradient(145deg, rgba(215, 246, 255, 0.85) 0%, rgba(240, 252, 255, 0.95) 100%)'
                          : 'linear-gradient(145deg, rgba(225, 248, 255, 0.55) 0%, rgba(245, 253, 255, 0.8) 100%)',
                        border: isOngoing ? '2px solid var(--blue)' : '1.5px solid rgba(0, 160, 255, 0.25)',
                        borderRadius: '22px',
                        padding: '18px 20px',
                        display: 'flex',
                        flexDirection: 'column',
                        justifyContent: 'space-between',
                        boxShadow: isOngoing
                          ? '0 12px 36px -4px rgba(0, 82, 255, 0.16), 0 2px 10px rgba(0, 0, 0, 0.04)'
                          : '0 4px 16px rgba(0, 82, 255, 0.05)',
                        position: 'relative',
                        transition: 'all 0.2s'
                      }}
                    >
                      <div>
                        {/* Header with Mascot & Status Badge */}
                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '14px', gap: '8px' }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '10px', minWidth: 0 }}>
                            <img
                              src="/new-logo-vibe.png"
                              alt="VIBE"
                              style={{
                                width: '38px',
                                height: '38px',
                                borderRadius: '50%',
                                objectFit: 'cover',
                                border: isOngoing ? '2px solid var(--blue)' : '1.5px solid rgba(0, 160, 255, 0.3)',
                                boxShadow: '0 2px 8px rgba(0, 82, 255, 0.15)',
                                flexShrink: 0
                              }}
                            />
                            <h4
                              style={{
                                margin: 0,
                                fontSize: '1.02rem',
                                fontWeight: 900,
                                color: 'var(--ink)',
                                letterSpacing: '-0.02em',
                                lineHeight: 1.25
                              }}
                            >
                              {ev.title}
                            </h4>
                          </div>

                          <span
                            style={{
                              padding: '4px 10px',
                              borderRadius: '99px',
                              fontSize: '0.66rem',
                              fontWeight: 900,
                              textTransform: 'uppercase',
                              letterSpacing: '0.04em',
                              background: isOngoing ? '#ecfdf5' : 'rgba(255, 255, 255, 0.9)',
                              color: isOngoing ? '#059669' : '#64748b',
                              border: isOngoing ? '1px solid #a7f3d0' : '1px solid rgba(0, 160, 255, 0.25)',
                              display: 'inline-flex',
                              alignItems: 'center',
                              gap: '5px',
                              whiteSpace: 'nowrap',
                              flexShrink: 0,
                              boxShadow: isOngoing ? '0 2px 8px rgba(16, 185, 129, 0.15)' : 'none'
                            }}
                          >
                            {isOngoing ? (
                              <>
                                <span style={{ width: '6px', height: '6px', borderRadius: '50%', background: '#10b981', boxShadow: '0 0 6px #10b981', flexShrink: 0 }} />
                                Ongoing
                              </>
                            ) : (
                              <>
                                <Clock size={11} color="#64748b" style={{ flexShrink: 0 }} />
                                Ended
                              </>
                            )}
                          </span>
                        </div>

                        {/* Metric Box (Prize Pool) */}
                        <div
                          style={{
                            background: '#ffffff',
                            borderRadius: '16px',
                            padding: '14px 16px',
                            border: '1px solid rgba(0, 160, 255, 0.22)',
                            boxShadow: '0 3px 12px rgba(0, 82, 255, 0.05)',
                            marginBottom: '14px'
                          }}
                        >
                          <div style={{ fontSize: isBaseAppMode ? '6.5px' : '0.66rem', color: '#88aacc', textTransform: 'uppercase', fontWeight: 800, letterSpacing: '0.05em', display: 'flex', alignItems: 'center', gap: '4px', whiteSpace: 'nowrap', marginBottom: '4px', fontFamily: isBaseAppMode ? "'Press Start 2P', monospace" : 'inherit' }}>
                            <Coins size={12} color={isBaseAppMode ? '#00f5ff' : 'var(--blue)'} /> Prize Pool
                          </div>
                          <div style={{ fontSize: isBaseAppMode ? '10px' : '1.38rem', fontWeight: 900, color: isBaseAppMode ? '#00f5ff' : isOngoing ? 'var(--ink)' : '#64748b', marginTop: '2px', letterSpacing: isBaseAppMode ? '0.2px' : '-0.02em', display: 'flex', alignItems: 'center', flexWrap: 'wrap', gap: '6px', fontFamily: isBaseAppMode ? "'Press Start 2P', monospace" : 'inherit', textShadow: isBaseAppMode ? '0 0 10px rgba(0, 245, 255, 0.45)' : 'none' }}>
                            <span>{ev.prizePool}</span>
                            {ev.burnNote && (
                              <span style={{ fontSize: isBaseAppMode ? '6.5px' : '0.72rem', color: '#ef4444', fontWeight: 800, background: 'rgba(239, 68, 68, 0.08)', border: '1px solid rgba(239, 68, 68, 0.2)', padding: '2px 7px', borderRadius: '99px', display: 'inline-flex', alignItems: 'center', gap: '3px', fontFamily: isBaseAppMode ? "'Press Start 2P', monospace" : 'inherit' }}>
                                🔥 {ev.burnNote}
                              </span>
                            )}
                          </div>
                        </div>

                        {/* Key-Values with Icons */}
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', marginBottom: '16px' }}>
                          {ev.distribution && (
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: 'rgba(255, 255, 255, 0.65)', padding: '7px 11px', borderRadius: '10px', border: '1px solid rgba(0, 160, 255, 0.12)', gap: '8px' }}>
                              <span style={{ color: '#64748b', fontWeight: 700, fontSize: '0.74rem', whiteSpace: 'nowrap', display: 'inline-flex', alignItems: 'center', gap: '5px', flexShrink: 0 }}>
                                <Gift size={12} color="#0284c7" /> Distribution
                              </span>
                              <strong style={{ color: isOngoing ? 'var(--ink)' : '#475569', fontWeight: 700, fontSize: '0.76rem', whiteSpace: 'nowrap', textAlign: 'right' }}>{ev.distribution}</strong>
                            </div>
                          )}
                          {ev.winners && (
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: 'rgba(255, 255, 255, 0.65)', padding: '7px 11px', borderRadius: '10px', border: '1px solid rgba(0, 160, 255, 0.12)', gap: '8px' }}>
                              <span style={{ color: '#64748b', fontWeight: 700, fontSize: '0.74rem', whiteSpace: 'nowrap', display: 'inline-flex', alignItems: 'center', gap: '5px', flexShrink: 0 }}>
                                <Users size={12} color="#0284c7" /> Winners
                              </span>
                              <strong style={{ color: isOngoing ? 'var(--ink)' : '#475569', fontWeight: 700, fontSize: '0.76rem', whiteSpace: 'nowrap', textAlign: 'right' }}>{ev.winners}</strong>
                            </div>
                          )}
                          {ev.deadlineDate && (
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: 'rgba(255, 255, 255, 0.65)', padding: '7px 11px', borderRadius: '10px', border: '1px solid rgba(0, 160, 255, 0.12)', gap: '8px' }}>
                              <span style={{ color: '#64748b', fontWeight: 700, fontSize: '0.74rem', whiteSpace: 'nowrap', display: 'inline-flex', alignItems: 'center', gap: '5px', flexShrink: 0 }}>
                                <Clock size={12} color="#0284c7" /> Deadline
                              </span>
                              <GiveawayCountdown targetDate={ev.deadlineDate} isOngoing={isOngoing} />
                            </div>
                          )}
                        </div>
                      </div>

                      {/* Action Button */}
                      <a
                        href={ev.link}
                        target="_blank"
                        rel="noreferrer"
                        className={isOngoing ? 'btn-fill' : ''}
                        style={{
                          background: isOngoing ? 'var(--blue)' : '#ffffff',
                          color: isOngoing ? '#ffffff' : 'var(--ink)',
                          border: isOngoing ? 'none' : '1.5px solid rgba(0, 160, 255, 0.35)',
                          padding: '11px 14px',
                          fontSize: '0.86rem',
                          fontWeight: 800,
                          borderRadius: '12px',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          gap: '6px',
                          width: '100%',
                          textDecoration: 'none',
                          whiteSpace: 'nowrap',
                          boxShadow: isOngoing ? '0 4px 16px rgba(0, 0, 255, 0.3)' : '0 1px 4px rgba(0,0,0,0.02)',
                          transition: 'all 0.15s'
                        }}
                      >
                        <span>{isOngoing ? 'Participate' : 'View Event'}</span>
                        <ArrowUpRight size={15} strokeWidth={2.5} color={isOngoing ? '#ffffff' : 'var(--blue)'} />
                      </a>
                    </div>
                  );
                })}
              </div>
            )}

            {/* Bottom Info Strip */}
            <div
              style={{
                marginTop: '24px',
                padding: '14px 20px',
                background: 'rgba(255, 255, 255, 0.65)',
                border: '1px dashed rgba(0, 160, 255, 0.35)',
                borderRadius: '16px',
                textAlign: 'center',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '8px',
                color: '#475569',
                fontSize: '0.84rem',
                fontWeight: 700
              }}
            >
              <Sparkles size={15} color="var(--blue)" />
              <span>More giveaways coming soon</span>
            </div>
          </div>
        )}

      </div>
    </section>
  );
}

function DomainRouter() {
  const location = useLocation();

  useEffect(() => {
    document.title = "Vibe Hub";
  }, []);

  return (
    <Routes>
      {/* ── Standalone VIBE Club NFT Mint Page / Redirect ── */}
      <Route path="/vibeclub" element={<BaseAppView RewardsComponent={Rewards} />} />
      <Route path="/vibe-club" element={<BaseAppView RewardsComponent={Rewards} />} />
      <Route path="/nft-club" element={<BaseAppView RewardsComponent={Rewards} />} />
      <Route path="/nft" element={<BaseAppView RewardsComponent={Rewards} />} />
      <Route path="/mint" element={<BaseAppView RewardsComponent={Rewards} />} />

      {/* ── Dedicated Base App / Vibe Hub Routes ── */}
      <Route path="/app" element={<BaseAppView RewardsComponent={Rewards} />} />
      <Route path="/app/*" element={<BaseAppView RewardsComponent={Rewards} />} />

      {/* ── Welcome & Main App Routes (Direct to Unified BaseAppView) ── */}
      <Route path="/" element={<BaseAppView RewardsComponent={Rewards} />} />
      <Route path="/home" element={<Navigate to="/" replace />} />

      {/* ── Main App Routes (Unified BaseAppView with Collapsible Sidebar) ── */}
      <Route path="/app" element={<BaseAppView RewardsComponent={Rewards} />} />
      <Route path="/app/*" element={<BaseAppView RewardsComponent={Rewards} />} />
      <Route path="/admin" element={<BaseAppView RewardsComponent={Rewards} />} />
      <Route path="/tokenomics" element={<BaseAppView RewardsComponent={Rewards} />} />
      <Route path="/hub" element={<BaseAppView RewardsComponent={Rewards} />} />
      <Route path="/rewards" element={<BaseAppView RewardsComponent={Rewards} />} />
      <Route path="/events" element={<BaseAppView RewardsComponent={Rewards} />} />
      <Route path="/buy" element={<BaseAppView RewardsComponent={Rewards} />} />
      <Route path="/swap" element={<BaseAppView RewardsComponent={Rewards} />} />
      <Route path="/trade" element={<BaseAppView RewardsComponent={Rewards} />} />
      <Route path="/claim" element={<BaseAppView RewardsComponent={Rewards} />} />
      <Route path="/checker" element={<Navigate to="/claim" replace />} />
      <Route path="/portal" element={<Navigate to="/claim" replace />} />
      <Route path="/profile" element={<BaseAppView RewardsComponent={Rewards} />} />
      <Route path="/dashboard" element={<Navigate to="/profile" replace />} />
      <Route path="/contracts" element={<BaseAppView RewardsComponent={Rewards} />} />
      <Route path="/adresses" element={<Navigate to="/contracts" replace />} />
      <Route path="/addresses" element={<Navigate to="/contracts" replace />} />
      <Route path="/docs" element={<Navigate to="/contracts" replace />} />
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}

const queryClient = new QueryClient();

export default function App() {
  return (
    <PrivyProvider
      appId="cmrugdvds02q60cl7tegmrnx7"
      config={{
        plugins: DATA_SUFFIX ? [dataSuffix(DATA_SUFFIX)] : [],
        loginMethods: ['wallet', 'email', 'twitter', 'telegram'],
        defaultChain: base,
        supportedChains: [base],
        appearance: {
          theme: 'dark',
          accentColor: '#00f5ff',
          logo: '/new-logo-vibe.png',
          showWalletLoginFirst: true,
        },
        embeddedWallets: {
          createOnLogin: 'all-users'
        }
      }}
    >
      <QueryClientProvider client={queryClient}>
        <PrivyWagmiProvider config={privyWagmiConfig}>
          <BrowserRouter>
            <ScrollToTop />
            <DomainRouter />
          </BrowserRouter>
        </PrivyWagmiProvider>
      </QueryClientProvider>
    </PrivyProvider>
  );
}
