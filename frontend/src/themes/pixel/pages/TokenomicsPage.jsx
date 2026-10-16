import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { Flame, Users, Clock, Calculator, Coins, Crown, ShieldCheck, Gift, ArrowRight, ArrowUpRight, ArrowRightCircle, Loader2, TrendingUp, Calendar, Check } from 'lucide-react';
import { parseAbiItem, formatUnits } from 'viem';
import { publicClient } from '../../../config/rpc';

const CA = '0xb200000000000000000000df24ecb8bf51100a01';
const BUYBACK_WALLET = '0x067c66aDdD3C6D484c1882B68E197B614f7f3Ebf';
const BURN_WALLET = '0x000000000000000000000000000000000000dEaD';
const CONST_TOTAL_BUYBACK = 8441747.16191129 + 585682 + 2822654 + 2070000 + 422000 + 2250000 + 1421729 + 2602000 + 2684253 + 3578868 + 2889541 + 1455000;
const CONST_DISTRIBUTED = 920000;
const REVENUE_STATS_CACHE_KEY = 'vibe_revenue_stats_cache_v2';

const UNLOCKS = [
  { d: 'Aug 26, 2026', a: '10M', iso: '2026-08-26T14:00:00Z' },
  { d: 'Sep 25, 2026', a: '10M', iso: '2026-09-25T14:00:00Z' },
  { d: 'Oct 25, 2026', a: '10M', iso: '2026-10-25T14:00:00Z' },
  { d: 'Nov 24, 2026', a: '10M', iso: '2026-11-24T14:00:00Z' },
  { d: 'Dec 24, 2026', a: '10M', iso: '2026-12-24T14:00:00Z' },
  { d: 'Jan 23, 2027', a: '10M', iso: '2027-01-23T14:00:00Z' },
  { d: 'Feb 22, 2027', a: '10M', iso: '2027-02-22T14:00:00Z' },
  { d: 'Mar 24, 2027', a: '10M', iso: '2027-03-24T14:00:00Z' },
  { d: 'Apr 23, 2027', a: '10M', iso: '2027-04-23T14:00:00Z' },
  { d: 'May 23, 2027', a: '10M', iso: '2027-05-23T14:00:00Z' },
];

const formatRevenueNumber = (numStr) => {
  const num = parseFloat(numStr);
  if (isNaN(num)) return '0';
  if (num >= 1000000) return (num / 1000000).toFixed(2).replace(/\.00$/, '') + 'M';
  if (num >= 1000) return (num / 1000).toFixed(1).replace(/\.0$/, '') + 'K';
  return num.toLocaleString();
};

const getInitialRevenueStats = () => {
  const fallbackStats = {
    totalBurned: '28.05M',
    totalBurnedNum: 28052274,
    communityRewards: '12.25M',
    totalBuybacks: formatRevenueNumber(CONST_TOTAL_BUYBACK),
    distributedRewards: formatRevenueNumber(CONST_DISTRIBUTED),
    loading: false
  };

  if (typeof window === 'undefined') return fallbackStats;
  try {
    const cached = localStorage.getItem(REVENUE_STATS_CACHE_KEY);
    if (cached) {
      const parsed = JSON.parse(cached);
      if (parsed && parsed.totalBurned && parsed.totalBuybacks && parsed.totalBurned !== '...') {
        return {
          ...fallbackStats,
          ...parsed,
          loading: false
        };
      }
    }
  } catch (e) {}
  return fallbackStats;
};

export function useRevenueStats() {
  const [stats, setStats] = useState(getInitialRevenueStats);

  useEffect(() => {
    let mounted = true;
    async function fetchStats() {
      try {
        const abiBalance = parseAbiItem('function balanceOf(address account) view returns (uint256)');
        
        const [burnedRaw, rewardsRaw] = await Promise.all([
          publicClient.readContract({ address: CA, abi: [abiBalance], functionName: 'balanceOf', args: [BURN_WALLET] }),
          publicClient.readContract({ address: CA, abi: [abiBalance], functionName: 'balanceOf', args: [BUYBACK_WALLET] })
        ]);

        const burnedNum = parseFloat(formatUnits(burnedRaw, 18));
        const newStats = {
          totalBurned: formatRevenueNumber(burnedNum),
          totalBurnedNum: burnedNum,
          communityRewards: formatRevenueNumber(formatUnits(rewardsRaw, 18)),
          totalBuybacks: formatRevenueNumber(CONST_TOTAL_BUYBACK),
          distributedRewards: formatRevenueNumber(CONST_DISTRIBUTED),
          loading: false
        };

        if (mounted) {
          setStats(newStats);
          try {
            localStorage.setItem(REVENUE_STATS_CACHE_KEY, JSON.stringify(newStats));
          } catch (e) {}
        }
      } catch (err) {
        console.warn('Notice: Live stats fallback used', err);
        if (mounted) {
          setStats(prev => ({ ...prev, loading: false }));
        }
      }
    }
    fetchStats();
    return () => { mounted = false; };
  }, []);

  return stats;
}

export default function TokenomicsPage({ isBaseAppMode = false }) {
  const { totalBurned, totalBurnedNum, totalBuybacks, communityRewards, loading } = useRevenueStats();
  
  useEffect(() => {
    if (typeof window !== 'undefined' && window.location.hash === '#vesting-details') {
      const scrollToVesting = () => {
        const el = document.getElementById('vesting-details');
        if (el) {
          const rect = el.getBoundingClientRect();
          const scrollTop = window.pageYOffset || document.documentElement.scrollTop;
          const targetY = scrollTop + rect.top - 80;
          window.scrollTo({ top: Math.max(0, targetY), behavior: 'smooth' });
        }
      };
      scrollToVesting();
      const timer = setTimeout(scrollToVesting, 200);
      return () => clearTimeout(timer);
    }
  }, []);

  const now = new Date();
  const unlockedCount = UNLOCKS.filter(u => new Date(u.d) <= now).length;
  const unlockedTokens = unlockedCount * 10_000_000;
  
  const baseCirculating = 900_000_000;
  const currentCirculating = baseCirculating + unlockedTokens - (totalBurnedNum || 0);
  const currentTotalSupply = 1_000_000_000 - (totalBurnedNum || 0);
  
  const formatSupply = (num) => {
    if (num >= 1000000) return (num / 1000000).toFixed(2).replace(/\.00$/, '') + 'M';
    if (num >= 1000) return (num / 1000).toFixed(1) + 'K';
    return num.toLocaleString();
  };

  const circulatingStr = loading ? <Loader2 size={16} className="spin"/> : formatSupply(currentCirculating);
  const totalSupplyStr = loading ? <Loader2 size={16} className="spin"/> : (totalBurnedNum > 0 ? formatSupply(currentTotalSupply) : '1B');

  const hubLink = isBaseAppMode ? '/app/hub' : '/hub';
  const claimLink = isBaseAppMode ? '/app/claim' : '/claim';
  const vibeClubLink = isBaseAppMode ? '/app/vibeclub' : 'https://vibeverse.dog/vibeclub';

  // ═════════════════════════════════════════════════════════════════════
  // ── BASE APP RETRO PIXEL RENDERING ──
  // ═════════════════════════════════════════════════════════════════════
  // ═════════════════════════════════════════════════════════════════════
  // ── BASE APP RETRO PIXEL RENDERING (RESPONSIVE MOBILE & DESKTOP) ──
  // ═════════════════════════════════════════════════════════════════════
  if (isBaseAppMode) {
    const cardStyle = {
      background: 'linear-gradient(180deg, rgba(6, 26, 60, 0.95) 0%, rgba(2, 11, 26, 0.98) 100%)',
      border: '1.5px solid rgba(0, 245, 255, 0.25)',
      borderRadius: '16px',
      padding: '16px 14px',
      boxShadow: '0 4px 20px rgba(0, 0, 0, 0.5)',
      display: 'flex',
      flexDirection: 'column',
      gap: '12px',
      boxSizing: 'border-box',
      width: '100%'
    };

    const tileStyle = {
      background: 'linear-gradient(180deg, rgba(6, 26, 60, 0.95) 0%, rgba(2, 11, 26, 0.98) 100%)',
      border: '1.5px solid rgba(0, 245, 255, 0.25)',
      borderRadius: '14px',
      padding: '14px 12px',
      textAlign: 'center',
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      justifyContent: 'center',
      gap: '6px',
      boxSizing: 'border-box'
    };

    const listRowStyle = {
      display: 'flex',
      alignItems: 'flex-start',
      gap: '12px',
      padding: '12px 12px',
      background: 'rgba(2, 11, 26, 0.7)',
      border: '1px solid rgba(0, 245, 255, 0.12)',
      borderRadius: '10px',
      boxSizing: 'border-box'
    };

    const iconBoxStyle = (bgColor, borderColor) => ({
      width: '28px',
      height: '28px',
      borderRadius: '7px',
      background: bgColor || 'rgba(0, 245, 255, 0.08)',
      border: borderColor ? `1px solid ${borderColor}` : '1px solid rgba(0, 245, 255, 0.2)',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      flexShrink: 0
    });

    return (
      <section className="tokenomics-baseapp-container" style={{ padding: '16px 12px 60px 12px', maxWidth: '1040px', margin: '0 auto', width: '100%', boxSizing: 'border-box' }}>
        
        {/* ── BLOCK 1: TOKENOMICS INFO ── */}
        <div className="rewards-hero-header" style={{ textAlign: 'center', marginBottom: '24px', padding: '12px 8px 8px 8px', width: '100%' }}>
          <h2 className="rewards-hero-title" style={{ fontSize: '18px', margin: '0 0 12px 0', letterSpacing: '0.6px', color: '#ffffff', fontFamily: "'Press Start 2P', monospace", lineHeight: 1.3, textAlign: 'center' }}>
            $VIBE <span style={{ color: '#00f5ff' }}>TOKENOMICS</span>
          </h2>
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
            <span className="rewards-hero-pill-text" style={{ fontSize: '6.5px', color: '#00f5ff', letterSpacing: '0.4px', fontFamily: "'Press Start 2P', monospace", fontWeight: 800, textAlign: 'center', lineHeight: 1.4 }}>
              FAIR LAUNCH. NO TEAM ALLOCATIONS. NO INSIDER BUYS.
            </span>
          </div>
        </div>

        {/* 4 Stat Tiles (2x2 on Mobile, 1x4 on Desktop) */}
        <div className="tokenomics-top-stats-grid" style={{ display: 'grid', gridTemplateColumns: 'repeat(2, minmax(0, 1fr))', gap: '12px', marginBottom: '36px' }}>
          {/* Total Supply */}
          <div className="tokenomics-top-stat-card" style={tileStyle}>
            <span className="tokenomics-top-stat-label" style={{ fontSize: '7.5px', color: '#88aacc', fontFamily: "'Press Start 2P', monospace", textTransform: 'uppercase', lineHeight: 1.3 }}>
              Total Supply
            </span>
            <span className="tokenomics-top-stat-val" style={{ fontSize: '14px', fontWeight: 900, color: '#00f5ff', fontFamily: "'Press Start 2P', monospace", lineHeight: 1.1 }}>
              {totalSupplyStr}
            </span>
            {!loading && totalBurnedNum > 0 && (
              <div className="tokenomics-top-stat-badge" style={{ display: 'inline-flex', alignItems: 'center', gap: '4px', fontSize: '7px', background: 'rgba(239, 68, 68, 0.15)', border: '1px solid rgba(239, 68, 68, 0.35)', color: '#ff4d4d', padding: '3px 7px', borderRadius: '6px', fontFamily: "'Press Start 2P', monospace", fontWeight: 900, marginTop: '2px' }}>
                <Flame size={11} color="#ff4d4d" strokeWidth={2.5} />
                <span>{totalBurned}</span>
              </div>
            )}
          </div>

          {/* Circulating */}
          <div className="tokenomics-top-stat-card" style={tileStyle}>
            <span className="tokenomics-top-stat-label" style={{ fontSize: '7.5px', color: '#88aacc', fontFamily: "'Press Start 2P', monospace", textTransform: 'uppercase', lineHeight: 1.3 }}>
              Circulating
            </span>
            <span className="tokenomics-top-stat-val" style={{ fontSize: '14px', fontWeight: 900, color: '#00f5ff', fontFamily: "'Press Start 2P', monospace", lineHeight: 1.1 }}>
              {circulatingStr}
            </span>
            {!loading && totalBurnedNum > 0 && (
              <div className="tokenomics-top-stat-badge" style={{ display: 'inline-flex', alignItems: 'center', gap: '4px', fontSize: '7px', background: 'rgba(239, 68, 68, 0.15)', border: '1px solid rgba(239, 68, 68, 0.35)', color: '#ff4d4d', padding: '3px 7px', borderRadius: '6px', fontFamily: "'Press Start 2P', monospace", fontWeight: 900, marginTop: '2px' }}>
                <Flame size={11} color="#ff4d4d" strokeWidth={2.5} />
                <span>{totalBurned}</span>
              </div>
            )}
          </div>

          {/* Vesting */}
          <div className="tokenomics-top-stat-card" style={tileStyle}>
            <span className="tokenomics-top-stat-label" style={{ fontSize: '7.5px', color: '#88aacc', fontFamily: "'Press Start 2P', monospace", textTransform: 'uppercase', lineHeight: 1.3 }}>
              Vesting Rewards
            </span>
            <span className="tokenomics-top-stat-val" style={{ fontSize: '14px', fontWeight: 900, color: '#00f5ff', fontFamily: "'Press Start 2P', monospace", lineHeight: 1.1 }}>
              100M
            </span>
            <span className="tokenomics-top-stat-badge" style={{ display: 'inline-block', fontSize: '7px', color: '#00ff88', background: 'rgba(0, 255, 136, 0.1)', border: '1px solid rgba(0, 255, 136, 0.25)', padding: '3px 7px', borderRadius: '6px', fontFamily: "'Press Start 2P', monospace", fontWeight: 800, marginTop: '2px' }}>
              10% MONTHLY
            </span>
          </div>

          {/* Monthly Unlock */}
          <div className="tokenomics-top-stat-card" style={tileStyle}>
            <span className="tokenomics-top-stat-label" style={{ fontSize: '7.5px', color: '#88aacc', fontFamily: "'Press Start 2P', monospace", textTransform: 'uppercase', lineHeight: 1.3 }}>
              Monthly Unlock
            </span>
            <span className="tokenomics-top-stat-val" style={{ fontSize: '14px', fontWeight: 900, color: '#00f5ff', fontFamily: "'Press Start 2P', monospace", lineHeight: 1.1 }}>
              10M
            </span>
            <span className="tokenomics-top-stat-badge" style={{ display: 'inline-block', fontSize: '7px', color: '#00ff88', background: 'rgba(0, 255, 136, 0.1)', border: '1px solid rgba(0, 255, 136, 0.25)', padding: '3px 7px', borderRadius: '6px', fontFamily: "'Press Start 2P', monospace", fontWeight: 800, marginTop: '2px' }}>
              TO HOLDERS
            </span>
          </div>
        </div>

        {/* ── BLOCK 2: REVENUE ECONOMY ── */}
        <div style={{ marginBottom: '20px', marginTop: '10px' }}>
          <h2 className="tokenomics-section-title" style={{ fontSize: '16px', margin: '0 0 10px 0', letterSpacing: '0.6px', color: '#ffffff', fontFamily: "'Press Start 2P', monospace", lineHeight: 1.3, textAlign: 'center' }}>
            REVENUE <span style={{ color: '#00f5ff' }}>ECONOMY</span>
          </h2>
          <p className="tokenomics-section-sub" style={{ fontSize: '7.5px', color: '#88aacc', fontFamily: "'Press Start 2P', monospace", lineHeight: 1.6, margin: '0', textAlign: 'center' }}>
            Creator Revenue is going towards buybacks and actions aimed at strengthening the token economy.
          </p>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: '16px', marginBottom: '40px' }}>
          {/* 4 Revenue Tiles (4 cols on Desktop, 2x2 grid on Mobile with pool & addr full width) */}
          <div className="tokenomics-revenue-stats-grid">
            <div className="tokenomics-rev-tile" style={tileStyle}>
              <span className="tokenomics-rev-label" style={{ fontSize: '7.5px', color: '#88aacc', fontFamily: "'Press Start 2P', monospace", textTransform: 'uppercase', lineHeight: 1.3 }}>
                Total Buyback
              </span>
              <span className="tokenomics-rev-val" style={{ fontSize: '14px', fontWeight: 900, color: '#00f5ff', fontFamily: "'Press Start 2P', monospace", lineHeight: 1.1 }}>
                {loading ? <Loader2 size={16} className="spin"/> : totalBuybacks}
              </span>
            </div>

            <div className="tokenomics-rev-tile" style={tileStyle}>
              <span className="tokenomics-rev-label" style={{ fontSize: '7.5px', color: '#88aacc', fontFamily: "'Press Start 2P', monospace", textTransform: 'uppercase', lineHeight: 1.3 }}>
                Total Burned
              </span>
              <span className="tokenomics-rev-val" style={{ fontSize: '14px', fontWeight: 900, color: '#ef4444', fontFamily: "'Press Start 2P', monospace", lineHeight: 1.1 }}>
                {loading ? <Loader2 size={16} className="spin"/> : totalBurned}
              </span>
            </div>

            {/* Current Community Pool Banner */}
            <div className="tokenomics-rev-tile tokenomics-rev-pool-tile" style={tileStyle}>
              <span className="tokenomics-rev-label" style={{ fontSize: '7px', color: '#88aacc', fontFamily: "'Press Start 2P', monospace", textTransform: 'uppercase' }}>
                Current community pool:
              </span>
              <span className="tokenomics-rev-val" style={{ fontSize: '14px', fontWeight: 900, color: '#00f5ff', fontFamily: "'Press Start 2P', monospace" }}>
                {loading ? <Loader2 size={16} className="spin"/> : communityRewards}
              </span>
            </div>

            {/* Buyback Address Card */}
            <div className="tokenomics-rev-tile tokenomics-rev-addr-tile" style={tileStyle}>
              <span className="tokenomics-rev-label" style={{ fontSize: '6.5px', color: '#88aacc', fontFamily: "'Press Start 2P', monospace", textTransform: 'uppercase', lineHeight: 1.3 }}>
                Buyback &amp; Burn, Rewards
              </span>
              <a
                href="https://basescan.org/token/0xb200000000000000000000df24ecb8bf51100a01?a=0x067c66aDdD3C6D484c1882B68E197B614f7f3Ebf#transactions"
                target="_blank"
                rel="noopener noreferrer"
                className="tokenomics-rev-btn"
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '6px',
                  background: 'rgba(0, 82, 255, 0.2)',
                  border: '1.5px solid #0052ff',
                  color: '#ffffff',
                  padding: '7px 12px',
                  borderRadius: '8px',
                  fontSize: '7px',
                  fontWeight: 900,
                  fontFamily: "'Press Start 2P', monospace",
                  textDecoration: 'none',
                  whiteSpace: 'nowrap'
                }}
              >
                <span>BASESCAN</span>
                <ArrowUpRight size={12} strokeWidth={2.5} />
              </a>
            </div>
          </div>

          {/* Buyback Program Card (Centered Title, Subtitle, SVG Donut Chart & 2 Badges) */}
          <div className="tokenomics-buyback-card" style={{ ...cardStyle, textAlign: 'center', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center' }}>
            <div style={{ width: '100%', textAlign: 'center' }}>
              <h3 className="tokenomics-buyback-title" style={{ fontSize: '11px', fontWeight: 900, margin: '0 0 8px 0', color: '#ffffff', fontFamily: "'Press Start 2P', monospace", textAlign: 'center' }}>
                BUYBACK PROGRAM
              </h3>
              <p className="tokenomics-buyback-sub" style={{ fontSize: '7.5px', color: '#88aacc', margin: 0, fontFamily: "'Press Start 2P', monospace", lineHeight: 1.6, textAlign: 'center' }}>
                Strategic utilization of revenue generated.
              </p>
            </div>

            {/* Centered SVG Donut Chart */}
            <div style={{ width: '100%', maxWidth: '420px', margin: '14px auto 10px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <svg viewBox="0 0 420 250" style={{ width: '100%', height: 'auto', display: 'block', overflow: 'visible' }}>
                <defs>
                  <linearGradient id="bpBurnGrad" x1="0%" y1="0%" x2="100%" y2="100%">
                    <stop offset="0%" stopColor="#ff5f5f" />
                    <stop offset="100%" stopColor="#ef4444" />
                  </linearGradient>
                  <linearGradient id="bpBlueGrad" x1="0%" y1="0%" x2="100%" y2="100%">
                    <stop offset="0%" stopColor="#00f5ff" />
                    <stop offset="100%" stopColor="#0052ff" />
                  </linearGradient>
                  <filter id="bpRedGlow" x="-20%" y="-20%" width="140%" height="140%">
                    <feDropShadow dx="0" dy="2" stdDeviation="4" floodColor="#ef4444" floodOpacity="0.4" />
                  </filter>
                  <filter id="bpBlueGlow" x="-20%" y="-20%" width="140%" height="140%">
                    <feDropShadow dx="0" dy="2" stdDeviation="4" floodColor="#00f5ff" floodOpacity="0.4" />
                  </filter>
                </defs>

                <g transform="translate(210, 125)">
                  {/* Track */}
                  <circle cx="0" cy="0" r="68" fill="none" stroke="rgba(0, 245, 255, 0.08)" strokeWidth="16" />

                  {/* Community 70% */}
                  <circle
                    cx="0" cy="0" r="68" fill="none" stroke="url(#bpBlueGrad)" strokeWidth="16"
                    strokeLinecap="round" pathLength="100" strokeDasharray="65 100" strokeDashoffset="-2.5"
                    transform="rotate(-90)" filter="url(#bpBlueGlow)"
                  />

                  {/* Burn 30% */}
                  <circle
                    cx="0" cy="0" r="68" fill="none" stroke="url(#bpBurnGrad)" strokeWidth="16"
                    strokeLinecap="round" pathLength="100" strokeDasharray="25 100" strokeDashoffset="-72.5"
                    transform="rotate(-90)" filter="url(#bpRedGlow)"
                  />

                  {/* Left Callout: Burn 30% */}
                  <circle cx="-56" cy="-40" r="3.5" fill="#ef4444" />
                  <polyline points="-56,-40 -85,-60 -115,-60" fill="none" stroke="#ef4444" strokeWidth="1.2" strokeDasharray="3 3" />
                  <text x="-120" y="-56" fill="#ef4444" fontSize="8" fontWeight="800" textAnchor="end" fontFamily="'Press Start 2P', monospace">Burn 30%</text>

                  {/* Right Callout: Community 70% */}
                  <circle cx="40" cy="56" r="3.5" fill="#00f5ff" />
                  <polyline points="40,56 68,78 100,78" fill="none" stroke="#00f5ff" strokeWidth="1.2" strokeDasharray="3 3" />
                  <text x="106" y="80" fill="#00f5ff" fontSize="8" fontWeight="800" textAnchor="start" fontFamily="'Press Start 2P', monospace">Community 70%</text>

                  {/* Center Text */}
                  <text x="0" y="-2" fill="#ffffff" fontSize="18" fontWeight="900" textAnchor="middle" fontFamily="'Press Start 2P', monospace">100%</text>
                  <text x="0" y="16" fill="#88aacc" fontSize="7" fontWeight="800" textAnchor="middle" fontFamily="'Press Start 2P', monospace">BUYBACKS</text>
                </g>
              </svg>
            </div>

            {/* Bottom 2 Badges */}
            <div style={{ display: 'flex', justifyContent: 'center', gap: '10px', flexWrap: 'wrap', width: '100%' }}>
              <div className="tokenomics-badge-pill" style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', background: 'rgba(239, 68, 68, 0.12)', border: '1.5px solid rgba(239, 68, 68, 0.3)', padding: '7px 14px', borderRadius: '8px', fontSize: '7.5px', fontWeight: 900, color: '#ef4444', fontFamily: "'Press Start 2P', monospace" }}>
                <Flame size={12} /> BURN 30%
              </div>
              <div className="tokenomics-badge-pill" style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', background: 'rgba(0, 245, 255, 0.1)', border: '1.5px solid rgba(0, 245, 255, 0.3)', padding: '7px 14px', borderRadius: '8px', fontSize: '7.5px', fontWeight: 900, color: '#00f5ff', fontFamily: "'Press Start 2P', monospace" }}>
                <Users size={12} /> COMMUNITY 70%
              </div>
            </div>
          </div>
        </div>

        {/* ── BLOCK 3: REWARDS ECONOMY (70% Community Allocation) ── */}
        <div style={{ marginBottom: '20px', marginTop: '10px' }}>
          <h2 className="tokenomics-section-title" style={{ fontSize: '16px', margin: '0 0 10px 0', letterSpacing: '0.6px', color: '#ffffff', fontFamily: "'Press Start 2P', monospace", lineHeight: 1.3, textAlign: 'center' }}>
            REWARDS <span style={{ color: '#00f5ff' }}>ECONOMY</span>
          </h2>
          <p className="tokenomics-section-sub" style={{ fontSize: '7.5px', color: '#88aacc', fontFamily: "'Press Start 2P', monospace", lineHeight: 1.6, margin: '0', textAlign: 'center' }}>
            Constitutes the 70% reserved for the community in the Buyback Program.
          </p>
        </div>

        {/* 2-Column Responsive Layout for Rewards Economy on Desktop */}
        <div className="tokenomics-two-col-grid" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(360px, 1fr))', gap: '16px', marginBottom: '40px', alignItems: 'stretch' }}>
          
          {/* Left Column: Distribution Breakdown */}
          <div className="tokenomics-content-card tokenomics-breakdown-card" style={cardStyle}>
            <h3 className="tokenomics-card-title" style={{ fontSize: '10px', fontWeight: 900, margin: '0 0 6px 0', color: '#ffffff', fontFamily: "'Press Start 2P', monospace" }}>
              DISTRIBUTION BREAKDOWN
            </h3>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
              {/* 10-Day Rolling Epochs (Cyan) */}
              <div className="tokenomics-list-row" style={listRowStyle}>
                <div className="tokenomics-list-icon" style={iconBoxStyle('rgba(0, 245, 255, 0.15)', 'rgba(0, 245, 255, 0.3)')}>
                  <Clock color="#00f5ff" size={15} />
                </div>
                <div style={{ flex: 1 }}>
                  <div className="tokenomics-list-title" style={{ fontSize: '8px', fontWeight: 800, color: '#ffffff', fontFamily: "'Press Start 2P', monospace", lineHeight: 1.4 }}>
                    10-Day Rolling Epochs
                  </div>
                  <div className="tokenomics-list-desc" style={{ fontSize: '6.5px', color: '#88aacc', fontFamily: "'Press Start 2P', monospace", lineHeight: 1.4, marginTop: '3px' }}>
                    Reward distribution across all pools happens every 10 days
                  </div>
                </div>
              </div>

              {/* Epoch Allocation Size (Cyan) */}
              <div className="tokenomics-list-row" style={listRowStyle}>
                <div className="tokenomics-list-icon" style={iconBoxStyle('rgba(0, 245, 255, 0.15)', 'rgba(0, 245, 255, 0.3)')}>
                  <Calculator color="#00f5ff" size={15} />
                </div>
                <div style={{ flex: 1 }}>
                  <div className="tokenomics-list-title" style={{ fontSize: '8px', fontWeight: 800, color: '#ffffff', fontFamily: "'Press Start 2P', monospace", lineHeight: 1.4 }}>
                    Epoch Allocation Size
                  </div>
                  <div className="tokenomics-list-desc" style={{ fontSize: '6.5px', color: '#88aacc', fontFamily: "'Press Start 2P', monospace", lineHeight: 1.4, marginTop: '3px' }}>
                    Equals designated % of Community Pool
                  </div>
                </div>
              </div>

              {/* $VIBE Staking (Purple) */}
              <div className="tokenomics-list-row" style={listRowStyle}>
                <div className="tokenomics-list-icon" style={iconBoxStyle('rgba(168, 85, 247, 0.15)', 'rgba(168, 85, 247, 0.3)')}>
                  <Coins color="#a855f7" size={15} />
                </div>
                <div style={{ flex: 1 }}>
                  <div className="tokenomics-list-title" style={{ fontSize: '8px', fontWeight: 800, color: '#ffffff', fontFamily: "'Press Start 2P', monospace", lineHeight: 1.4 }}>
                    $VIBE Staking (15%)
                  </div>
                  <div className="tokenomics-list-desc" style={{ fontSize: '6.5px', color: '#88aacc', fontFamily: "'Press Start 2P', monospace", lineHeight: 1.4, marginTop: '3px' }}>
                    Yield for locking $VIBE in verified staking pool on o1
                  </div>
                </div>
              </div>

              {/* Vibe Club NFTs (Orange/Amber) */}
              <div className="tokenomics-list-row" style={listRowStyle}>
                <div className="tokenomics-list-icon" style={iconBoxStyle('rgba(245, 158, 11, 0.15)', 'rgba(245, 158, 11, 0.3)')}>
                  <Crown color="#f59e0b" size={15} />
                </div>
                <div style={{ flex: 1 }}>
                  <div className="tokenomics-list-title" style={{ fontSize: '8px', fontWeight: 800, color: '#ffffff', fontFamily: "'Press Start 2P', monospace", lineHeight: 1.4 }}>
                    Vibe Club NFTs (15%)
                  </div>
                  <div className="tokenomics-list-desc" style={{ fontSize: '6.5px', color: '#88aacc', fontFamily: "'Press Start 2P', monospace", lineHeight: 1.4, marginTop: '3px' }}>
                    Direct royalties for holders of the 333 Vibe Club NFTs
                  </div>
                </div>
              </div>

              {/* Reserve (Green) */}
              <div className="tokenomics-list-row" style={listRowStyle}>
                <div className="tokenomics-list-icon" style={iconBoxStyle('rgba(16, 185, 129, 0.15)', 'rgba(16, 185, 129, 0.3)')}>
                  <ShieldCheck color="#10b981" size={15} />
                </div>
                <div style={{ flex: 1 }}>
                  <div className="tokenomics-list-title" style={{ fontSize: '8px', fontWeight: 800, color: '#ffffff', fontFamily: "'Press Start 2P', monospace", lineHeight: 1.4 }}>
                    Reserve (70%)
                  </div>
                  <div className="tokenomics-list-desc" style={{ fontSize: '6.5px', color: '#88aacc', fontFamily: "'Press Start 2P', monospace", lineHeight: 1.4, marginTop: '3px' }}>
                    Buffer for continuous reward refills
                  </div>
                </div>
              </div>

              {/* Hub Link CTA */}
              <Link
                to={hubLink}
                className="tokenomics-cta-btn"
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  padding: '13px 16px',
                  borderRadius: '10px',
                  background: 'linear-gradient(135deg, #00f5ff 0%, #00b8ff 100%)',
                  border: '1.5px solid #00f5ff',
                  textDecoration: 'none',
                  marginTop: '6px',
                  boxSizing: 'border-box'
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <div style={{ width: '24px', height: '24px', borderRadius: '6px', background: 'rgba(0, 0, 0, 0.25)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                    <Gift color="#020b1a" size={13} />
                  </div>
                  <span style={{ fontSize: '8px', fontWeight: 900, color: '#020b1a', fontFamily: "'Press Start 2P', monospace" }}>
                    EXPLORE REWARDS HUB
                  </span>
                </div>
                <ArrowRight size={15} color="#020b1a" strokeWidth={2.5} style={{ flexShrink: 0 }} />
              </Link>
            </div>
          </div>

          {/* Right Column: Donut Chart Card (Community Distribution) */}
          <div className="tokenomics-content-card tokenomics-chart-card" style={cardStyle}>
            <div style={{ textAlign: 'center' }}>
              <h3 className="tokenomics-card-title" style={{ fontSize: '10px', fontWeight: 900, margin: '0 0 6px 0', color: '#ffffff', fontFamily: "'Press Start 2P', monospace" }}>
                COMMUNITY ALLOCATION
              </h3>
              <p className="tokenomics-card-sub" style={{ fontSize: '7px', color: '#88aacc', margin: 0, fontFamily: "'Press Start 2P', monospace", lineHeight: 1.4 }}>
                Allocation of the 70% Revenue Share.
              </p>
            </div>

            {/* SVG Donut with Callout Branches */}
            <div style={{ width: '100%', maxWidth: '380px', margin: 'auto' }}>
              <svg viewBox="0 0 420 260" style={{ width: '100%', height: 'auto', display: 'block', overflow: 'visible' }}>
                <defs>
                  <linearGradient id="commPurpleGrad2" x1="0%" y1="0%" x2="100%" y2="100%">
                    <stop offset="0%" stopColor="#c084fc" />
                    <stop offset="100%" stopColor="#9333ea" />
                  </linearGradient>
                  <linearGradient id="commAmberGrad2" x1="0%" y1="0%" x2="100%" y2="100%">
                    <stop offset="0%" stopColor="#fbbf24" />
                    <stop offset="100%" stopColor="#f59e0b" />
                  </linearGradient>
                  <linearGradient id="commGreenGrad2" x1="0%" y1="0%" x2="100%" y2="100%">
                    <stop offset="0%" stopColor="#34d399" />
                    <stop offset="100%" stopColor="#10b981" />
                  </linearGradient>

                  <filter id="commPurpleGlow2" x="-20%" y="-20%" width="140%" height="140%">
                    <feDropShadow dx="0" dy="2" stdDeviation="4" floodColor="#7c3aed" floodOpacity="0.4" />
                  </filter>
                  <filter id="commAmberGlow2" x="-20%" y="-20%" width="140%" height="140%">
                    <feDropShadow dx="0" dy="2" stdDeviation="4" floodColor="#f59e0b" floodOpacity="0.4" />
                  </filter>
                  <filter id="commGreenGlow2" x="-20%" y="-20%" width="140%" height="140%">
                    <feDropShadow dx="0" dy="2" stdDeviation="4" floodColor="#10b981" floodOpacity="0.4" />
                  </filter>
                </defs>

                <g transform="translate(210, 130)">
                  <circle cx="0" cy="0" r="68" fill="none" stroke="rgba(0, 245, 255, 0.08)" strokeWidth="16" />

                  {/* Staking 15% */}
                  <circle
                    cx="0" cy="0" r="68" fill="none" stroke="url(#commPurpleGrad2)" strokeWidth="16"
                    strokeLinecap="round" pathLength="100" strokeDasharray="11 100" strokeDashoffset="-2"
                    transform="rotate(-90)" filter="url(#commPurpleGlow2)"
                  />
                  {/* NFT Club 15% (Amber/Orange) */}
                  <circle
                    cx="0" cy="0" r="68" fill="none" stroke="url(#commAmberGrad2)" strokeWidth="16"
                    strokeLinecap="round" pathLength="100" strokeDasharray="11 100" strokeDashoffset="-17"
                    transform="rotate(-90)" filter="url(#commAmberGlow2)"
                  />
                  {/* Reserve 70% (Green) */}
                  <circle
                    cx="0" cy="0" r="68" fill="none" stroke="url(#commGreenGrad2)" strokeWidth="16"
                    strokeLinecap="round" pathLength="100" strokeDasharray="66 100" strokeDashoffset="-32"
                    transform="rotate(-90)" filter="url(#commGreenGlow2)"
                  />

                  {/* Callouts */}
                  <circle cx="31" cy="-61" r="3.5" fill="#a855f7" />
                  <polyline points="31,-61 60,-80 95,-80" fill="none" stroke="#a855f7" strokeWidth="1.2" strokeDasharray="3 3" />
                  <text x="100" y="-76" fill="#a855f7" fontSize="8" fontWeight="800" textAnchor="start" fontFamily="'Press Start 2P', monospace">Staking 15%</text>

                  <circle cx="67" cy="-11" r="3.5" fill="#f59e0b" />
                  <polyline points="67,-11 95,10 125,10" fill="none" stroke="#f59e0b" strokeWidth="1.2" strokeDasharray="3 3" />
                  <text x="130" y="14" fill="#f59e0b" fontSize="8" fontWeight="800" textAnchor="start" fontFamily="'Press Start 2P', monospace">NFT Club 15%</text>

                  <circle cx="-55" cy="40" r="3.5" fill="#10b981" />
                  <polyline points="-55,40 -85,60 -115,60" fill="none" stroke="#10b981" strokeWidth="1.2" strokeDasharray="3 3" />
                  <text x="-120" y="64" fill="#10b981" fontSize="8" fontWeight="800" textAnchor="end" fontFamily="'Press Start 2P', monospace">Reserve 70%</text>

                  <text x="0" y="-2" fill="#ffffff" fontSize="18" fontWeight="900" textAnchor="middle" fontFamily="'Press Start 2P', monospace">100%</text>
                  <text x="0" y="16" fill="#88aacc" fontSize="7" fontWeight="800" textAnchor="middle" fontFamily="'Press Start 2P', monospace">COMMUNITY</text>
                </g>
              </svg>
            </div>

            {/* Badges */}
            <div style={{ display: 'flex', justifyContent: 'center', gap: '8px', flexWrap: 'wrap', marginTop: '10px' }}>
              <div className="tokenomics-donut-badge" style={{ display: 'inline-flex', alignItems: 'center', gap: '5px', background: 'rgba(168, 85, 247, 0.12)', border: '1px solid rgba(168, 85, 247, 0.3)', padding: '5px 9px', borderRadius: '6px', fontSize: '6.5px', fontWeight: 900, color: '#a855f7', fontFamily: "'Press Start 2P', monospace" }}>
                <Coins size={11} /> STAKING 15%
              </div>
              <div className="tokenomics-donut-badge" style={{ display: 'inline-flex', alignItems: 'center', gap: '5px', background: 'rgba(245, 158, 11, 0.12)', border: '1px solid rgba(245, 158, 11, 0.3)', padding: '5px 9px', borderRadius: '6px', fontSize: '6.5px', fontWeight: 900, color: '#f59e0b', fontFamily: "'Press Start 2P', monospace" }}>
                <Crown size={11} /> NFT CLUB 15%
              </div>
              <div className="tokenomics-donut-badge" style={{ display: 'inline-flex', alignItems: 'center', gap: '5px', background: 'rgba(16, 185, 129, 0.12)', border: '1px solid rgba(16, 185, 129, 0.3)', padding: '5px 9px', borderRadius: '6px', fontSize: '6.5px', fontWeight: 900, color: '#10b981', fontFamily: "'Press Start 2P', monospace" }}>
                <ShieldCheck size={11} /> RESERVE 70%
              </div>
            </div>
          </div>
        </div>

        {/* ── BLOCK 4: VIBE CLUB ECONOMY (Official NFT Collection) ── */}
        <div style={{ marginBottom: '20px', marginTop: '10px' }}>
          <h2 className="tokenomics-section-title" style={{ fontSize: '16px', margin: '0 0 10px 0', letterSpacing: '0.6px', color: '#ffffff', fontFamily: "'Press Start 2P', monospace", lineHeight: 1.3, textAlign: 'center' }}>
            VIBE CLUB <span style={{ color: '#ffd700' }}>ECONOMY</span>
          </h2>
          <p className="tokenomics-section-sub" style={{ fontSize: '7.5px', color: '#88aacc', fontFamily: "'Press Start 2P', monospace", lineHeight: 1.6, margin: '0', textAlign: 'center' }}>
            Official $VIBE NFT collection fully integrated into B20 economy.
          </p>
        </div>

        {/* 2-Column Responsive Layout for Vibe Club Economy on Desktop */}
        <div className="tokenomics-two-col-grid" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(360px, 1fr))', gap: '16px', marginBottom: '40px', alignItems: 'stretch' }}>
          
          {/* Left Column: Vibe Club Breakdown */}
          <div className="tokenomics-content-card tokenomics-breakdown-card" style={cardStyle}>
            <h3 className="tokenomics-card-title" style={{ fontSize: '10px', fontWeight: 900, margin: '0 0 6px 0', color: '#ffd700', fontFamily: "'Press Start 2P', monospace" }}>
              VIBE CLUB BREAKDOWN
            </h3>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
              {/* Deflationary Mint Burn (Red) */}
              <div className="tokenomics-list-row" style={listRowStyle}>
                <div className="tokenomics-list-icon" style={iconBoxStyle('rgba(239, 68, 68, 0.15)', 'rgba(239, 68, 68, 0.3)')}>
                  <Flame color="#ef4444" size={15} />
                </div>
                <div style={{ flex: 1 }}>
                  <div className="tokenomics-list-title" style={{ fontSize: '8px', fontWeight: 800, color: '#ffffff', fontFamily: "'Press Start 2P', monospace", lineHeight: 1.4 }}>
                    Deflationary Mint Burn
                  </div>
                  <div className="tokenomics-list-desc" style={{ fontSize: '6.5px', color: '#88aacc', fontFamily: "'Press Start 2P', monospace", lineHeight: 1.4, marginTop: '3px' }}>
                    Every mint triggers an instant burn, reducing total $VIBE supply
                  </div>
                </div>
              </div>

              {/* NFTs Utility (Cyan) */}
              <div className="tokenomics-list-row" style={listRowStyle}>
                <div className="tokenomics-list-icon" style={iconBoxStyle('rgba(0, 245, 255, 0.15)', 'rgba(0, 245, 255, 0.3)')}>
                  <Crown color="#00f5ff" size={15} />
                </div>
                <div style={{ flex: 1 }}>
                  <div className="tokenomics-list-title" style={{ fontSize: '8px', fontWeight: 800, color: '#ffffff', fontFamily: "'Press Start 2P', monospace", lineHeight: 1.4 }}>
                    NFTs Utility
                  </div>
                  <div className="tokenomics-list-desc" style={{ fontSize: '6.5px', color: '#88aacc', fontFamily: "'Press Start 2P', monospace", lineHeight: 1.4, marginTop: '3px' }}>
                    Holders receive regular royalty payouts distributed every 10 days
                  </div>
                </div>
              </div>

              {/* Mint Process (Cyan) */}
              <div className="tokenomics-list-row" style={listRowStyle}>
                <div className="tokenomics-list-icon" style={iconBoxStyle('rgba(0, 245, 255, 0.15)', 'rgba(0, 245, 255, 0.3)')}>
                  <Coins color="#00f5ff" size={15} />
                </div>
                <div style={{ flex: 1 }}>
                  <div className="tokenomics-list-title" style={{ fontSize: '8px', fontWeight: 800, color: '#ffffff', fontFamily: "'Press Start 2P', monospace", lineHeight: 1.4 }}>
                    Mint Process
                  </div>
                  <div className="tokenomics-list-desc" style={{ fontSize: '6.5px', color: '#88aacc', fontFamily: "'Press Start 2P', monospace", lineHeight: 1.4, marginTop: '3px' }}>
                    Minting is available with both ETH and native $VIBE tokens
                  </div>
                </div>
              </div>

              {/* Royalties Pool (Cyan) */}
              <div className="tokenomics-list-row" style={listRowStyle}>
                <div className="tokenomics-list-icon" style={iconBoxStyle('rgba(0, 245, 255, 0.15)', 'rgba(0, 245, 255, 0.3)')}>
                  <Coins color="#00f5ff" size={15} />
                </div>
                <div style={{ flex: 1 }}>
                  <div className="tokenomics-list-title" style={{ fontSize: '8px', fontWeight: 800, color: '#ffffff', fontFamily: "'Press Start 2P', monospace", lineHeight: 1.4 }}>
                    Royalties Pool
                  </div>
                  <div className="tokenomics-list-desc" style={{ fontSize: '6.5px', color: '#88aacc', fontFamily: "'Press Start 2P', monospace", lineHeight: 1.4, marginTop: '3px' }}>
                    15% of the Community Pool, refilled every 10 days for each royalty payout
                  </div>
                </div>
              </div>

              {/* Equal Holder Rewards (Cyan) */}
              <div className="tokenomics-list-row" style={listRowStyle}>
                <div className="tokenomics-list-icon" style={iconBoxStyle('rgba(0, 245, 255, 0.15)', 'rgba(0, 245, 255, 0.3)')}>
                  <Users color="#00f5ff" size={15} />
                </div>
                <div style={{ flex: 1 }}>
                  <div className="tokenomics-list-title" style={{ fontSize: '8px', fontWeight: 800, color: '#ffffff', fontFamily: "'Press Start 2P', monospace", lineHeight: 1.4 }}>
                    Equal Holder Rewards
                  </div>
                  <div className="tokenomics-list-desc" style={{ fontSize: '6.5px', color: '#88aacc', fontFamily: "'Press Start 2P', monospace", lineHeight: 1.4, marginTop: '3px' }}>
                    All holders receive equal royalty payouts
                  </div>
                </div>
              </div>

              {/* Join Vibe Club CTA */}
              <Link
                to={vibeClubLink}
                className="tokenomics-cta-btn"
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  padding: '13px 16px',
                  borderRadius: '10px',
                  background: '#f59e0b',
                  border: '1.5px solid #f59e0b',
                  textDecoration: 'none',
                  marginTop: '6px',
                  boxSizing: 'border-box'
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <div style={{ width: '24px', height: '24px', borderRadius: '6px', background: 'rgba(0, 0, 0, 0.25)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                    <Crown color="#020b1a" size={14} strokeWidth={2.5} />
                  </div>
                  <span style={{ fontSize: '8px', fontWeight: 900, color: '#020b1a', fontFamily: "'Press Start 2P', monospace" }}>
                    JOIN VIBE CLUB
                  </span>
                </div>
                <ArrowRight size={15} color="#020b1a" strokeWidth={2.5} style={{ flexShrink: 0 }} />
              </Link>
            </div>
          </div>

          {/* Right Column: Donut Chart Card (Mint Revenue) */}
          <div className="tokenomics-content-card tokenomics-chart-card" style={cardStyle}>
            <div style={{ textAlign: 'center' }}>
              <h3 className="tokenomics-card-title" style={{ fontSize: '10px', fontWeight: 900, margin: '0 0 6px 0', color: '#ffffff', fontFamily: "'Press Start 2P', monospace" }}>
                MINT REVENUE ALLOCATION
              </h3>
              <p className="tokenomics-card-sub" style={{ fontSize: '7px', color: '#88aacc', margin: 0, fontFamily: "'Press Start 2P', monospace", lineHeight: 1.4 }}>
                Utilization of revenue collected from NFT mint.
              </p>
            </div>

            {/* SVG Donut with Callout Branches */}
            <div style={{ width: '100%', maxWidth: '380px', margin: 'auto' }}>
              <svg viewBox="0 0 420 250" style={{ width: '100%', height: 'auto', display: 'block', overflow: 'visible' }}>
                <defs>
                  <linearGradient id="nftBurnGrad2" x1="0%" y1="0%" x2="100%" y2="100%">
                    <stop offset="0%" stopColor="#ff5f5f" />
                    <stop offset="100%" stopColor="#ef4444" />
                  </linearGradient>
                  <linearGradient id="nftBlueGrad2" x1="0%" y1="0%" x2="100%" y2="100%">
                    <stop offset="0%" stopColor="#00f5ff" />
                    <stop offset="100%" stopColor="#0052ff" />
                  </linearGradient>
                  <filter id="nftRedGlow2" x="-20%" y="-20%" width="140%" height="140%">
                    <feDropShadow dx="0" dy="2" stdDeviation="4" floodColor="#ef4444" floodOpacity="0.4" />
                  </filter>
                  <filter id="nftBlueGlow2" x="-20%" y="-20%" width="140%" height="140%">
                    <feDropShadow dx="0" dy="2" stdDeviation="4" floodColor="#0052ff" floodOpacity="0.4" />
                  </filter>
                </defs>

                <g transform="translate(210, 125)">
                  <circle cx="0" cy="0" r="68" fill="none" stroke="rgba(0, 245, 255, 0.08)" strokeWidth="16" />

                  {/* Community 20% */}
                  <circle
                    cx="0" cy="0" r="68" fill="none" stroke="url(#nftBlueGrad2)" strokeWidth="16"
                    strokeLinecap="round" pathLength="100" strokeDasharray="15 100" strokeDashoffset="-2.5"
                    transform="rotate(-90)" filter="url(#nftBlueGlow2)"
                  />
                  {/* Burn 80% */}
                  <circle
                    cx="0" cy="0" r="68" fill="none" stroke="url(#nftBurnGrad2)" strokeWidth="16"
                    strokeLinecap="round" pathLength="100" strokeDasharray="75 100" strokeDashoffset="-22.5"
                    transform="rotate(-90)" filter="url(#nftRedGlow2)"
                  />

                  {/* Right Callout: Community 20% */}
                  <circle cx="40" cy="56" r="3.5" fill="#00f5ff" />
                  <polyline points="40,56 68,78 100,78" fill="none" stroke="#00f5ff" strokeWidth="1.2" strokeDasharray="3 3" />
                  <text x="106" y="80" fill="#00f5ff" fontSize="8" fontWeight="800" textAnchor="start" fontFamily="'Press Start 2P', monospace">Community 20%</text>

                  {/* Left Callout: Burn 80% */}
                  <circle cx="-56" cy="-40" r="3.5" fill="#ef4444" />
                  <polyline points="-56,-40 -85,-60 -115,-60" fill="none" stroke="#ef4444" strokeWidth="1.2" strokeDasharray="3 3" />
                  <text x="-120" y="-56" fill="#ef4444" fontSize="8" fontWeight="800" textAnchor="end" fontFamily="'Press Start 2P', monospace">Burn 80%</text>

                  {/* Center text */}
                  <text x="0" y="-2" fill="#ffffff" fontSize="18" fontWeight="900" textAnchor="middle" fontFamily="'Press Start 2P', monospace">100%</text>
                  <text x="0" y="16" fill="#88aacc" fontSize="7" fontWeight="800" textAnchor="middle" fontFamily="'Press Start 2P', monospace">MINT REVENUE</text>
                </g>
              </svg>
            </div>

            {/* Badges */}
            <div style={{ display: 'flex', justifyContent: 'center', gap: '8px', flexWrap: 'wrap', marginTop: '10px' }}>
              <div className="tokenomics-donut-badge" style={{ display: 'inline-flex', alignItems: 'center', gap: '5px', background: 'rgba(239, 68, 68, 0.12)', border: '1.5px solid rgba(239, 68, 68, 0.3)', padding: '6px 12px', borderRadius: '8px', fontSize: '7px', fontWeight: 900, color: '#ef4444', fontFamily: "'Press Start 2P', monospace" }}>
                <Flame size={12} /> BURN 80%
              </div>
              <div className="tokenomics-donut-badge" style={{ display: 'inline-flex', alignItems: 'center', gap: '5px', background: 'rgba(0, 245, 255, 0.1)', border: '1.5px solid rgba(0, 245, 255, 0.3)', padding: '6px 12px', borderRadius: '8px', fontSize: '7px', fontWeight: 900, color: '#00f5ff', fontFamily: "'Press Start 2P', monospace" }}>
                <Users size={12} /> COMMUNITY 20%
              </div>
            </div>
          </div>
        </div>

        {/* ── BLOCK 5: VESTING DETAILS ── */}
        <div id="vesting-details" style={{ marginBottom: '20px', marginTop: '10px', scrollMarginTop: '80px' }}>
          <h2 className="tokenomics-section-title" style={{ fontSize: '16px', margin: '0 0 10px 0', letterSpacing: '0.6px', color: '#ffffff', fontFamily: "'Press Start 2P', monospace", lineHeight: 1.3, textAlign: 'center' }}>
            VESTING <span style={{ color: '#00f5ff' }}>DETAILS</span>
          </h2>
          <p className="tokenomics-section-sub" style={{ fontSize: '7.5px', color: '#88aacc', fontFamily: "'Press Start 2P', monospace", lineHeight: 1.6, margin: '0', textAlign: 'center' }}>
            100M tokens vested. Every month 10M unlocks and get distributed among holders.
          </p>
        </div>

        {/* 2-Column Responsive Layout for Vesting Details on Desktop */}
        <div className="tokenomics-two-col-grid" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(360px, 1fr))', gap: '16px', marginBottom: '20px', alignItems: 'stretch' }}>
          
          {/* Left Column: Holder Rewards Card */}
          <div className="tokenomics-content-card" style={cardStyle}>
            <h3 className="tokenomics-card-title" style={{ fontSize: '9.5px', fontWeight: 900, margin: '0 0 6px 0', color: '#ffffff', fontFamily: "'Press Start 2P', monospace", lineHeight: 1.4 }}>
              HOLDER REWARDS · 100M $VIBE
            </h3>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
              {/* $VIBE Holders (Cyan) */}
              <div className="tokenomics-list-row" style={listRowStyle}>
                <div className="tokenomics-list-icon" style={iconBoxStyle('rgba(0, 245, 255, 0.15)', 'rgba(0, 245, 255, 0.3)')}>
                  <img src="/vibe-logo.png" alt="Vibe" style={{ width: '18px', height: '18px', borderRadius: '4px', objectFit: 'cover' }} />
                </div>
                <div style={{ flex: 1 }}>
                  <div className="tokenomics-list-title" style={{ fontSize: '8px', fontWeight: 800, color: '#ffffff', fontFamily: "'Press Start 2P', monospace", lineHeight: 1.4 }}>
                    $VIBE Holders
                  </div>
                  <div className="tokenomics-list-desc" style={{ fontSize: '6.5px', color: '#88aacc', fontFamily: "'Press Start 2P', monospace", lineHeight: 1.4, marginTop: '3px' }}>
                    Hold 5M+ $VIBE to qualify
                  </div>
                </div>
              </div>

              {/* Allocation Size (Cyan) */}
              <div className="tokenomics-list-row" style={listRowStyle}>
                <div className="tokenomics-list-icon" style={iconBoxStyle('rgba(0, 245, 255, 0.15)', 'rgba(0, 245, 255, 0.3)')}>
                  <TrendingUp color="#00f5ff" size={15} />
                </div>
                <div style={{ flex: 1 }}>
                  <div className="tokenomics-list-title" style={{ fontSize: '8px', fontWeight: 800, color: '#ffffff', fontFamily: "'Press Start 2P', monospace", lineHeight: 1.4 }}>
                    Allocation Size
                  </div>
                  <div className="tokenomics-list-desc" style={{ fontSize: '6.5px', color: '#88aacc', fontFamily: "'Press Start 2P', monospace", lineHeight: 1.4, marginTop: '3px' }}>
                    The more you hold, the larger your allocation
                  </div>
                </div>
              </div>

              {/* Max Allocation Cap (Cyan) */}
              <div className="tokenomics-list-row" style={listRowStyle}>
                <div className="tokenomics-list-icon" style={iconBoxStyle('rgba(0, 245, 255, 0.15)', 'rgba(0, 245, 255, 0.3)')}>
                  <ShieldCheck color="#00f5ff" size={15} />
                </div>
                <div style={{ flex: 1 }}>
                  <div className="tokenomics-list-title" style={{ fontSize: '8px', fontWeight: 800, color: '#ffffff', fontFamily: "'Press Start 2P', monospace", lineHeight: 1.4 }}>
                    Max Allocation Cap
                  </div>
                  <div className="tokenomics-list-desc" style={{ fontSize: '6.5px', color: '#88aacc', fontFamily: "'Press Start 2P', monospace", lineHeight: 1.4, marginTop: '3px' }}>
                    Set to prevent whale dominance &amp; ensure fair distribution
                  </div>
                </div>
              </div>

              {/* Allocation Calculation (Cyan) */}
              <div className="tokenomics-list-row" style={listRowStyle}>
                <div className="tokenomics-list-icon" style={iconBoxStyle('rgba(0, 245, 255, 0.15)', 'rgba(0, 245, 255, 0.3)')}>
                  <Calculator color="#00f5ff" size={15} />
                </div>
                <div style={{ flex: 1 }}>
                  <div className="tokenomics-list-title" style={{ fontSize: '8px', fontWeight: 800, color: '#ffffff', fontFamily: "'Press Start 2P', monospace", lineHeight: 1.4 }}>
                    Allocation Calculation
                  </div>
                  <div className="tokenomics-list-desc" style={{ fontSize: '6.5px', color: '#88aacc', fontFamily: "'Press Start 2P', monospace", lineHeight: 1.4, marginTop: '3px' }}>
                    Proportionally calculated based on holding balance
                  </div>
                </div>
              </div>

              {/* Snapshot Schedule (Cyan) */}
              <div className="tokenomics-list-row" style={listRowStyle}>
                <div className="tokenomics-list-icon" style={iconBoxStyle('rgba(0, 245, 255, 0.15)', 'rgba(0, 245, 255, 0.3)')}>
                  <Clock color="#00f5ff" size={15} />
                </div>
                <div style={{ flex: 1 }}>
                  <div className="tokenomics-list-title" style={{ fontSize: '8px', fontWeight: 800, color: '#ffffff', fontFamily: "'Press Start 2P', monospace", lineHeight: 1.4 }}>
                    Snapshot Schedule
                  </div>
                  <div className="tokenomics-list-desc" style={{ fontSize: '6.5px', color: '#88aacc', fontFamily: "'Press Start 2P', monospace", lineHeight: 1.4, marginTop: '3px' }}>
                    Balance snapshot at 00:00 UTC on the day of unlock
                  </div>
                </div>
              </div>

              {/* Claim Window (Cyan) */}
              <div className="tokenomics-list-row" style={listRowStyle}>
                <div className="tokenomics-list-icon" style={iconBoxStyle('rgba(0, 245, 255, 0.15)', 'rgba(0, 245, 255, 0.3)')}>
                  <Calendar color="#00f5ff" size={15} />
                </div>
                <div style={{ flex: 1 }}>
                  <div className="tokenomics-list-title" style={{ fontSize: '8px', fontWeight: 800, color: '#ffffff', fontFamily: "'Press Start 2P', monospace", lineHeight: 1.4 }}>
                    Claim Window
                  </div>
                  <div className="tokenomics-list-desc" style={{ fontSize: '6.5px', color: '#88aacc', fontFamily: "'Press Start 2P', monospace", lineHeight: 1.4, marginTop: '3px' }}>
                    Stays open for 30 days until the next unlock
                  </div>
                </div>
              </div>

              {/* Unclaimed Tokens (Red) */}
              <div className="tokenomics-list-row" style={listRowStyle}>
                <div className="tokenomics-list-icon" style={iconBoxStyle('rgba(239, 68, 68, 0.15)', 'rgba(239, 68, 68, 0.3)')}>
                  <Flame color="#ef4444" size={15} />
                </div>
                <div style={{ flex: 1 }}>
                  <div className="tokenomics-list-title" style={{ fontSize: '8px', fontWeight: 800, color: '#ffffff', fontFamily: "'Press Start 2P', monospace", lineHeight: 1.4 }}>
                    Unclaimed Tokens
                  </div>
                  <div className="tokenomics-list-desc" style={{ fontSize: '6.5px', color: '#ef4444', fontFamily: "'Press Start 2P', monospace", lineHeight: 1.4, marginTop: '3px' }}>
                    Permanently burned
                  </div>
                </div>
              </div>

              {/* Claim Eligibility CTA */}
              <Link
                to={claimLink}
                className="tokenomics-cta-btn"
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  padding: '13px 16px',
                  borderRadius: '10px',
                  background: 'linear-gradient(135deg, #00f5ff 0%, #00b8ff 100%)',
                  border: '1.5px solid #00f5ff',
                  textDecoration: 'none',
                  marginTop: '6px',
                  boxSizing: 'border-box'
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <div style={{ width: '24px', height: '24px', borderRadius: '6px', background: 'rgba(0, 0, 0, 0.25)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                    <Check color="#020b1a" size={15} strokeWidth={3} />
                  </div>
                  <span style={{ fontSize: '8px', fontWeight: 900, color: '#020b1a', fontFamily: "'Press Start 2P', monospace" }}>
                    CHECK YOUR ELIGIBILITY
                  </span>
                </div>
                <ArrowRight size={15} color="#020b1a" strokeWidth={2.5} style={{ flexShrink: 0 }} />
              </Link>
            </div>
          </div>

          {/* Right Column: Unlock Schedule Card */}
          <div className="tokenomics-content-card" style={cardStyle}>
            <div>
              <h3 className="tokenomics-card-title" style={{ fontSize: '10px', fontWeight: 900, margin: '0 0 6px 0', color: '#ffffff', fontFamily: "'Press Start 2P', monospace" }}>
                UNLOCK SCHEDULE
              </h3>
              <p className="tokenomics-card-sub" style={{ fontSize: '7px', color: '#88aacc', margin: '0 0 14px 0', fontFamily: "'Press Start 2P', monospace", lineHeight: 1.4 }}>
                Aug 2026 → May 2027
              </p>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
              {UNLOCKS.map((u, i) => {
                const isUnlocked = new Date(u.iso || u.d) <= new Date();
                return (
                  <div
                    key={i}
                    className="tokenomics-unlock-row"
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      padding: '10px 12px',
                      background: 'rgba(2, 11, 26, 0.7)',
                      border: '1px solid rgba(0, 245, 255, 0.12)',
                      borderRadius: '8px',
                      gap: '8px'
                    }}
                  >
                    <span className="tokenomics-unlock-date" style={{ fontSize: '7px', color: '#cbd5e1', fontFamily: "'Press Start 2P', monospace" }}>
                      {u.d}
                    </span>
                    <span className="tokenomics-unlock-amount" style={{ fontSize: '8px', fontWeight: 900, color: '#00f5ff', fontFamily: "'Press Start 2P', monospace" }}>
                      {u.a}
                    </span>
                    <span
                      className="tokenomics-unlock-status"
                      style={{
                        fontSize: '6.5px',
                        fontWeight: 900,
                        fontFamily: "'Press Start 2P', monospace",
                        textTransform: 'uppercase',
                        padding: '4px 8px',
                        borderRadius: '4px',
                        background: isUnlocked ? 'rgba(0, 255, 136, 0.15)' : 'rgba(136, 170, 204, 0.1)',
                        border: isUnlocked ? '1px solid rgba(0, 255, 136, 0.3)' : '1px solid rgba(136, 170, 204, 0.2)',
                        color: isUnlocked ? '#00ff88' : '#88aacc'
                      }}
                    >
                      {isUnlocked ? 'UNLOCKED' : 'LOCKED'}
                    </span>
                  </div>
                );
              })}
            </div>
          </div>
        </div>

      </section>
    );
  }

  // ═════════════════════════════════════════════════════════════════════
  // ── ORIGINAL WEB THEME RENDERING (WITH COMM POOL & 70%/20% UPDATES) ──
  // ═════════════════════════════════════════════════════════════════════
  return (
    <section id="tokenomics" className="alt">
      <div className="wrap">
        
        {/* BLOCK 1: TOKENOMICS INFO */}
        <div className="sec-head">
          <h2>$VIBE <span className="bl">Tokenomics</span>.</h2>
          <p className="sec-sub">Fair launch via o1.exchange. $VIBE B20 launch time was publicly announced in advance. Zero BS. No team allocations. No insider buys.</p>
        </div>
        
        <div className="stat-tiles wide-stats">
          <div className="stile">
            <span className="v">{totalSupplyStr}</span>
            <span className="l">Total Supply</span>
            {!loading && totalBurnedNum > 0 && (
              <div className="d" style={{ marginTop: '8px' }}>
                <span style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '4px',
                  fontSize: '0.8rem',
                  background: 'rgba(239, 68, 68, 0.12)',
                  color: '#ef4444',
                  padding: '2px 8px',
                  borderRadius: '99px',
                  fontWeight: '800',
                  lineHeight: '1'
                }}>
                  <Flame size={14} strokeWidth={2.5} /> {totalBurned}
                </span>
              </div>
            )}
          </div>
          <div className="stile">
            <span className="v">{circulatingStr}</span>
            <span className="l">Circulating</span>
            {!loading && totalBurnedNum > 0 && (
              <div className="d" style={{ marginTop: '8px' }}>
                <span style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '4px',
                  fontSize: '0.8rem',
                  background: 'rgba(239, 68, 68, 0.12)',
                  color: '#ef4444',
                  padding: '2px 8px',
                  borderRadius: '99px',
                  fontWeight: '800',
                  lineHeight: '1'
                }}>
                  <Flame size={14} strokeWidth={2.5} /> {totalBurned}
                </span>
              </div>
            )}
          </div>
          <div className="stile"><span className="v">100M</span><span className="l">Vesting Community Rewards</span><div className="d">10% unlocks monthly</div></div>
          <div className="stile"><span className="v">10M</span><span className="l">Monthly Unlock</span><div className="d">Straight to holders</div></div>
        </div>

        {/* BLOCK 2: REVENUE ECONOMY */}
        <div className="sec-head" style={{ marginBottom: '32px', marginTop: '40px' }}>
          <h2>Revenue <span className="bl">Economy</span>.</h2>
          <p className="sec-sub">
            Creator Revenue is going towards buybacks and actions aimed at strengthening the token economy, driving long-term value for all holders.
          </p>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(min(100%, 360px), 1fr))', gap: '24px', marginBottom: '50px' }}>
          
          {/* Left Side: Stat Tiles */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '16px', height: '100%' }}>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px', flex: 1 }}>
              <div className="stile" style={{ margin: 0, padding: '28px 24px', display: 'flex', flexDirection: 'column', justifyContent: 'center' }}>
                <span className="v">{loading ? <Loader2 size={24} className="spin"/> : totalBuybacks}</span>
                <span className="l">Total Buyback</span>
              </div>
              <div className="stile" style={{ margin: 0, padding: '28px 24px', display: 'flex', flexDirection: 'column', justifyContent: 'center' }}>
                <span className="v" style={{ color: '#ef4444' }}>{loading ? <Loader2 size={24} className="spin"/> : totalBurned}</span>
                <span className="l">Total Burned</span>
              </div>
            </div>

            {/* Thinner Full-Width Card 1: Current community pool */}
            <div className="stile rev-thin-card">
              <span className="rev-thin-label">Current community pool:</span>
              <span className="rev-thin-val">
                {loading ? <Loader2 size={20} className="spin"/> : communityRewards}
              </span>
            </div>

            {/* Thinner Full-Width Card 2: Buyback & Burn & Rewards Address + View on Basescan */}
            <div className="stile rev-thin-card">
              <span className="rev-thin-label">
                Buyback & Burn & Rewards Address
              </span>
              <a
                href="https://basescan.org/token/0xb200000000000000000000df24ecb8bf51100a01?a=0x067c66aDdD3C6D484c1882B68E197B614f7f3Ebf#transactions"
                target="_blank"
                rel="noopener noreferrer"
                className="rev-basescan-btn"
              >
                <span>View on Basescan</span>
                <ArrowUpRight size={14} />
              </a>
            </div>
          </div>

          {/* Right Side: Buyback Program */}
          <div className="tok-card" style={{ padding: '32px 24px', textAlign: 'center', display: 'flex', flexDirection: 'column', justifyContent: 'space-between', position: 'relative' }}>
            <div>
              <h3 style={{ fontSize: '1.25rem', fontWeight: 800, marginBottom: '4px', color: 'var(--ink)' }}>Buyback Program</h3>
              <p className="sub" style={{ fontSize: '0.85rem', color: 'var(--muted)', margin: 0 }}>Strategic utilization of revenue generated.</p>
            </div>
            
            <div style={{ position: 'relative', width: '100%', maxWidth: '420px', margin: '16px auto 8px', flexShrink: 0 }}>
              <svg viewBox="0 0 420 280" style={{ width: '100%', height: 'auto', display: 'block', overflow: 'visible' }}>
                <defs>
                  <linearGradient id="burnGradient" x1="0%" y1="0%" x2="100%" y2="100%">
                    <stop offset="0%" stopColor="#ff5f5f" />
                    <stop offset="100%" stopColor="#ef4444" />
                  </linearGradient>
                  <linearGradient id="blueGradient" x1="0%" y1="0%" x2="100%" y2="100%">
                    <stop offset="0%" stopColor="#3b82f6" />
                    <stop offset="100%" stopColor="#0052ff" />
                  </linearGradient>

                  <filter id="redGlow" x="-20%" y="-20%" width="140%" height="140%">
                    <feDropShadow dx="0" dy="4" stdDeviation="6" floodColor="#ef4444" floodOpacity="0.25" />
                  </filter>
                  <filter id="blueGlow" x="-20%" y="-20%" width="140%" height="140%">
                    <feDropShadow dx="0" dy="4" stdDeviation="6" floodColor="#0052ff" floodOpacity="0.25" />
                  </filter>
                </defs>

                <g transform="translate(210, 140)">
                  <circle cx="0" cy="0" r="80" fill="none" stroke="#f1f5f9" strokeWidth="18" />

                  {/* 70% Community */}
                  <circle cx="0" cy="0" r="80" fill="none" stroke="url(#blueGradient)" strokeWidth="18"
                          strokeLinecap="round" pathLength="100" strokeDasharray="65 100" strokeDashoffset="-2.5"
                          transform="rotate(-90)" filter="url(#blueGlow)" style={{ transition: 'all 0.5s ease' }} />

                  {/* 30% Burn */}
                  <circle cx="0" cy="0" r="80" fill="none" stroke="url(#burnGradient)" strokeWidth="18"
                          strokeLinecap="round" pathLength="100" strokeDasharray="25 100" strokeDashoffset="-72.5"
                          transform="rotate(-90)" filter="url(#redGlow)" style={{ transition: 'all 0.5s ease' }} />

                  {/* Left Callout (Burn 30% - Top Left) */}
                  <circle cx="-65" cy="-47" r="4" fill="#ef4444" />
                  <polyline points="-65,-47 -95,-70 -125,-70" fill="none" stroke="#ef4444" strokeWidth="1.2" strokeDasharray="3 3" />
                  <text x="-130" y="-64" fill="#ef4444" fontSize="13" fontWeight="800" textAnchor="end">Burn 30%</text>

                  {/* Right Callout (Community 70% - Bottom Right) */}
                  <circle cx="47" cy="65" r="4" fill="#0052ff" />
                  <polyline points="47,65 75,90 115,90" fill="none" stroke="#0052ff" strokeWidth="1.2" strokeDasharray="3 3" />
                  <text x="122" y="94" fill="#0052ff" fontSize="13" fontWeight="800" textAnchor="start">Community 70%</text>

                  {/* Center Text */}
                  <text x="0" y="-3" fill="var(--ink)" fontSize="30" fontWeight="900" textAnchor="middle" letterSpacing="-0.5px">100%</text>
                  <text x="0" y="18" fill="var(--muted)" fontSize="10" fontWeight="800" textAnchor="middle" letterSpacing="1.5px">BUYBACKS</text>
                </g>
              </svg>
            </div>

            {/* Bottom Legend Pills */}
            <div style={{ display: 'flex', justifyContent: 'center', gap: '10px', marginTop: '8px', flexWrap: 'wrap' }}>
              <div style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', background: 'rgba(239, 68, 68, 0.08)', border: '1px solid rgba(239, 68, 68, 0.2)', padding: '5px 12px', borderRadius: '99px', fontSize: '0.8rem', fontWeight: 800, color: '#ef4444' }}>
                <Flame size={14} /> Burn 30%
              </div>
              <div style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', background: 'rgba(0, 82, 255, 0.08)', border: '1px solid rgba(0, 82, 255, 0.2)', padding: '5px 12px', borderRadius: '99px', fontSize: '0.8rem', fontWeight: 800, color: 'var(--blue)' }}>
                <Users size={14} /> Community 70%
              </div>
            </div>
          </div>
        </div>

        {/* BLOCK 3: REWARDS ECONOMY */}
        <div className="sec-head" style={{ marginBottom: '32px', marginTop: '50px' }}>
          <h2>Rewards <span className="bl">Economy</span>.</h2>
          <p className="sec-sub">
            Constitutes the 70% reserved for the community in the Buyback Program.
          </p>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(min(100%, 360px), 1fr))', gap: '24px', marginBottom: '50px' }}>
          
          {/* Left Side: Unified Distribution Breakdown Block */}
          <div className="tok-card" style={{ display: 'flex', flexDirection: 'column', justifyContent: 'space-between' }}>
            <div>
              <h3 style={{ fontSize: '1.25rem' }}>Distribution Breakdown</h3>

              <div className="who">
                <div className="who-r">
                  <div className="who-ico" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    <Clock color="#7c3aed" size={20} />
                  </div>
                  <div className="who-t">
                    10-Day Rolling Epochs
                    <span>Reward distribution across all pools happens every 10 days</span>
                  </div>
                </div>

                <div className="who-r">
                  <div className="who-ico" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    <Calculator color="var(--blue)" size={20} />
                  </div>
                  <div className="who-t">
                    Epoch Allocation Size
                    <span>Equals designated % of Community Pool</span>
                  </div>
                </div>

                <div className="who-r">
                  <div className="who-ico" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    <Coins color="#a855f7" size={20} />
                  </div>
                  <div className="who-t">
                    $VIBE Staking <span style={{ color: '#a855f7', fontWeight: 900, display: 'inline', marginLeft: '4px' }}>(15%)</span>
                    <span>Yield for locking $VIBE in verified staking pool on o1</span>
                  </div>
                </div>

                <div className="who-r">
                  <div className="who-ico" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    <Crown color="#f59e0b" size={20} />
                  </div>
                  <div className="who-t">
                    Vibe Club NFTs <span style={{ color: '#f59e0b', fontWeight: 900, display: 'inline', marginLeft: '4px' }}>(15%)</span>
                    <span>Direct royalties for holders of the 333 Vibe Club NFTs</span>
                  </div>
                </div>

                <div className="who-r">
                  <div className="who-ico" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    <ShieldCheck color="#10b981" size={20} />
                  </div>
                  <div className="who-t">
                    Reserve <span style={{ color: '#10b981', fontWeight: 900, display: 'inline', marginLeft: '4px' }}>(70%)</span>
                    <span>Buffer for continuous reward refills</span>
                  </div>
                </div>

                <Link to={hubLink} className="who-r" style={{ textDecoration: 'none', cursor: 'pointer', background: 'var(--blue)' }}>
                  <div className="who-ico" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    <Gift color="#fff" size={20} />
                  </div>
                  <div className="who-t" style={{ color: '#fff' }}>
                    Explore Rewards Hub
                    <span style={{ color: 'rgba(255,255,255,0.8)' }}>
                      Track available rewards <ArrowRightCircle size={14} style={{ verticalAlign: 'middle', marginLeft: 4 }} />
                    </span>
                  </div>
                </Link>
              </div>
            </div>
          </div>

          {/* Right Side: Donut Chart */}
          <div className="tok-card" style={{ padding: '28px 20px', textAlign: 'center', display: 'flex', flexDirection: 'column', justifyContent: 'space-between', position: 'relative' }}>
            <div>
              <h3 style={{ fontSize: '1.25rem', fontWeight: 800, marginBottom: '4px', color: 'var(--ink)' }}>Community Pool Distribution</h3>
              <p className="sub" style={{ fontSize: '0.85rem', color: 'var(--muted)', margin: 0 }}>Allocation of the 70% Revenue Share (Normalized to 100%).</p>
            </div>

            <div style={{ position: 'relative', width: '100%', maxWidth: '420px', margin: '16px auto 8px', flexShrink: 0 }}>
              <svg viewBox="0 0 420 280" style={{ width: '100%', height: 'auto', display: 'block', overflow: 'visible' }}>
                <defs>
                  <linearGradient id="commPurpleGrad" x1="0%" y1="0%" x2="100%" y2="100%">
                    <stop offset="0%" stopColor="#a855f7" />
                    <stop offset="100%" stopColor="#7c3aed" />
                  </linearGradient>
                  <linearGradient id="commAmberGrad" x1="0%" y1="0%" x2="100%" y2="100%">
                    <stop offset="0%" stopColor="#fbbf24" />
                    <stop offset="100%" stopColor="#f59e0b" />
                  </linearGradient>
                  <linearGradient id="commGreenGrad" x1="0%" y1="0%" x2="100%" y2="100%">
                    <stop offset="0%" stopColor="#34d399" />
                    <stop offset="100%" stopColor="#10b981" />
                  </linearGradient>

                  <filter id="commPurpleGlow" x="-20%" y="-20%" width="140%" height="140%">
                    <feDropShadow dx="0" dy="4" stdDeviation="6" floodColor="#7c3aed" floodOpacity="0.25" />
                  </filter>
                  <filter id="commAmberGlow" x="-20%" y="-20%" width="140%" height="140%">
                    <feDropShadow dx="0" dy="4" stdDeviation="6" floodColor="#f59e0b" floodOpacity="0.25" />
                  </filter>
                  <filter id="commGreenGlow" x="-20%" y="-20%" width="140%" height="140%">
                    <feDropShadow dx="0" dy="4" stdDeviation="6" floodColor="#10b981" floodOpacity="0.25" />
                  </filter>
                </defs>

                <g transform="translate(210, 140)">
                  <circle cx="0" cy="0" r="80" fill="none" stroke="#f1f5f9" strokeWidth="18" />

                  {/* 1. Staking 15% */}
                  <circle cx="0" cy="0" r="80" fill="none" stroke="url(#commPurpleGrad)" strokeWidth="18"
                          strokeLinecap="round" pathLength="100" strokeDasharray="11 100" strokeDashoffset="-2"
                          transform="rotate(-90)" filter="url(#commPurpleGlow)" style={{ transition: 'all 0.5s ease' }} />

                  {/* 2. NFT Club 15% */}
                  <circle cx="0" cy="0" r="80" fill="none" stroke="url(#commAmberGrad)" strokeWidth="18"
                          strokeLinecap="round" pathLength="100" strokeDasharray="11 100" strokeDashoffset="-17"
                          transform="rotate(-90)" filter="url(#commAmberGlow)" style={{ transition: 'all 0.5s ease' }} />

                  {/* 3. Reserve 70% */}
                  <circle cx="0" cy="0" r="80" fill="none" stroke="url(#commGreenGrad)" strokeWidth="18"
                          strokeLinecap="round" pathLength="100" strokeDasharray="66 100" strokeDashoffset="-32"
                          transform="rotate(-90)" filter="url(#commGreenGlow)" style={{ transition: 'all 0.5s ease' }} />

                  {/* Callout 1: Staking 15% */}
                  <circle cx="36" cy="-71" r="4" fill="#7c3aed" />
                  <polyline points="36,-71 70,-95 110,-95" fill="none" stroke="#7c3aed" strokeWidth="1.2" strokeDasharray="3 3" />
                  <text x="115" y="-90" fill="#7c3aed" fontSize="12" fontWeight="800" textAnchor="start">Staking 15%</text>

                  {/* Callout 2: NFT Club 15% */}
                  <circle cx="79" cy="-13" r="4" fill="#f59e0b" />
                  <polyline points="79,-13 110,15 145,15" fill="none" stroke="#f59e0b" strokeWidth="1.2" strokeDasharray="3 3" />
                  <text x="150" y="20" fill="#f59e0b" fontSize="12" fontWeight="800" textAnchor="start">NFT Club 15%</text>

                  {/* Callout 3: Reserve 70% */}
                  <circle cx="-65" cy="47" r="4" fill="#10b981" />
                  <polyline points="-65,47 -100,75 -140,75" fill="none" stroke="#10b981" strokeWidth="1.2" strokeDasharray="3 3" />
                  <text x="-145" y="80" fill="#10b981" fontSize="12" fontWeight="800" textAnchor="end">Reserve 70%</text>

                  <text x="0" y="-3" fill="var(--ink)" fontSize="28" fontWeight="900" textAnchor="middle" letterSpacing="-0.5px">100%</text>
                  <text x="0" y="16" fill="var(--muted)" fontSize="9" fontWeight="800" textAnchor="middle" letterSpacing="1px">COMMUNITY</text>
                </g>
              </svg>
            </div>

            <div style={{ display: 'flex', justifyContent: 'center', gap: '8px', marginTop: '8px', flexWrap: 'wrap' }}>
              <div style={{ display: 'inline-flex', alignItems: 'center', gap: '5px', background: 'rgba(124, 58, 237, 0.08)', border: '1px solid rgba(124, 58, 237, 0.2)', padding: '4px 10px', borderRadius: '99px', fontSize: '0.75rem', fontWeight: 800, color: '#7c3aed' }}>
                <Coins size={13} /> Staking 15%
              </div>
              <div style={{ display: 'inline-flex', alignItems: 'center', gap: '5px', background: 'rgba(245, 158, 11, 0.08)', border: '1px solid rgba(245, 158, 11, 0.2)', padding: '4px 10px', borderRadius: '99px', fontSize: '0.75rem', fontWeight: 800, color: '#f59e0b' }}>
                <Crown size={13} /> NFT Club 15%
              </div>
              <div style={{ display: 'inline-flex', alignItems: 'center', gap: '5px', background: 'rgba(16, 185, 129, 0.08)', border: '1px solid rgba(16, 185, 129, 0.2)', padding: '4px 10px', borderRadius: '99px', fontSize: '0.75rem', fontWeight: 800, color: '#10b981' }}>
                <ShieldCheck size={13} /> Reserve 70%
              </div>
            </div>
          </div>
        </div>

        {/* BLOCK 4: VIBE CLUB ECONOMY */}
        <div className="sec-head" style={{ marginBottom: '32px', marginTop: '50px' }}>
          <h2>Vibe Club <span className="bl">Economy</span>.</h2>
          <p className="sec-sub">
            Official $VIBE NFT collection fully integrated into B20 economy.
          </p>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(min(100%, 360px), 1fr))', gap: '24px', marginBottom: '40px' }}>
          
          {/* Left Side: Vibe Club Breakdown */}
          <div className="tok-card" style={{ display: 'flex', flexDirection: 'column', justifyContent: 'space-between' }}>
            <div>
              <h3 style={{ fontSize: '1.25rem' }}>Vibe Club Breakdown</h3>

              <div className="who">
                <div className="who-r">
                  <div className="who-ico" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    <Flame color="#ef4444" size={20} />
                  </div>
                  <div className="who-t">
                    Deflationary Mint Burn
                    <span>Every mint triggers an instant burn, reducing total $VIBE supply</span>
                  </div>
                </div>

                <div className="who-r">
                  <div className="who-ico" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    <Crown color="#10b981" size={20} />
                  </div>
                  <div className="who-t">
                    NFTs Utility
                    <span>Holders receive regular royalty payouts distributed every 10 days</span>
                  </div>
                </div>

                <div className="who-r">
                  <div className="who-ico" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    <Coins color="#7c3aed" size={20} />
                  </div>
                  <div className="who-t">
                    Mint Process
                    <span>Minting is available with both ETH and native $VIBE tokens</span>
                  </div>
                </div>

                <div className="who-r">
                  <div className="who-ico" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    <Coins color="#00f5ff" size={20} />
                  </div>
                  <div className="who-t">
                    Royalties Pool
                    <span>15% of the Community Pool, refilled every 10 days for each royalty payout</span>
                  </div>
                </div>

                <div className="who-r">
                  <div className="who-ico" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    <Users color="var(--blue)" size={20} />
                  </div>
                  <div className="who-t">
                    Equal Holder Rewards
                    <span>All holders receive equal royalty payouts</span>
                  </div>
                </div>

                <a href={vibeClubLink} target="_blank" rel="noreferrer" className="who-r" style={{ textDecoration: 'none', cursor: 'pointer', background: 'var(--blue)' }}>
                  <div className="who-ico" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    <Crown color="#fff" size={20} />
                  </div>
                  <div className="who-t" style={{ color: '#fff' }}>
                    Join Vibe Club
                    <span style={{ color: 'rgba(255,255,255,0.8)' }}>
                      Mint your NFT <ArrowUpRight size={14} style={{ verticalAlign: 'middle', marginLeft: 4 }} />
                    </span>
                  </div>
                </a>
              </div>
            </div>
          </div>

          {/* Right Side: Mint Revenue Donut Chart */}
          <div className="tok-card" style={{ padding: '28px 20px', textAlign: 'center', display: 'flex', flexDirection: 'column', justifyContent: 'space-between', position: 'relative' }}>
            <div>
              <h3 style={{ fontSize: '1.25rem', fontWeight: 800, marginBottom: '4px', color: 'var(--ink)' }}>Mint Revenue Allocation</h3>
              <p className="sub" style={{ fontSize: '0.85rem', color: 'var(--muted)', margin: 0 }}>Utilization of revenue collected from the Vibe Club NFT mint.</p>
            </div>

            <div style={{ position: 'relative', width: '100%', maxWidth: '420px', margin: '16px auto 8px', flexShrink: 0 }}>
              <svg viewBox="0 0 420 280" style={{ width: '100%', height: 'auto', display: 'block', overflow: 'visible' }}>
                <defs>
                  <linearGradient id="nftBurnGrad" x1="0%" y1="0%" x2="100%" y2="100%">
                    <stop offset="0%" stopColor="#ff5f5f" />
                    <stop offset="100%" stopColor="#ef4444" />
                  </linearGradient>
                  <linearGradient id="nftBlueGrad" x1="0%" y1="0%" x2="100%" y2="100%">
                    <stop offset="0%" stopColor="#3b82f6" />
                    <stop offset="100%" stopColor="#0052ff" />
                  </linearGradient>

                  <filter id="nftRedGlow" x="-20%" y="-20%" width="140%" height="140%">
                    <feDropShadow dx="0" dy="4" stdDeviation="6" floodColor="#ef4444" floodOpacity="0.25" />
                  </filter>
                  <filter id="nftBlueGlow" x="-20%" y="-20%" width="140%" height="140%">
                    <feDropShadow dx="0" dy="4" stdDeviation="6" floodColor="#0052ff" floodOpacity="0.25" />
                  </filter>
                </defs>

                <g transform="translate(210, 140)">
                  <circle cx="0" cy="0" r="80" fill="none" stroke="#f1f5f9" strokeWidth="18" />

                  {/* 20% Community */}
                  <circle cx="0" cy="0" r="80" fill="none" stroke="url(#nftBlueGrad)" strokeWidth="18"
                          strokeLinecap="round" pathLength="100" strokeDasharray="15 100" strokeDashoffset="-2.5"
                          transform="rotate(-90)" filter="url(#nftBlueGlow)" style={{ transition: 'all 0.5s ease' }} />

                  {/* 80% Burn */}
                  <circle cx="0" cy="0" r="80" fill="none" stroke="url(#nftBurnGrad)" strokeWidth="18"
                          strokeLinecap="round" pathLength="100" strokeDasharray="75 100" strokeDashoffset="-22.5"
                          transform="rotate(-90)" filter="url(#nftRedGlow)" style={{ transition: 'all 0.5s ease' }} />

                  {/* Left Callout (Burn 80% - Top Left) */}
                  <circle cx="-65" cy="-47" r="4" fill="#ef4444" />
                  <polyline points="-65,-47 -95,-70 -125,-70" fill="none" stroke="#ef4444" strokeWidth="1.2" strokeDasharray="3 3" />
                  <text x="-130" y="-64" fill="#ef4444" fontSize="13" fontWeight="800" textAnchor="end">Burn 80%</text>

                  {/* Right Callout (Community 20% - Top Right) */}
                  <circle cx="47" cy="-65" r="4" fill="#0052ff" />
                  <polyline points="47,-65 80,-80 120,-80" fill="none" stroke="#0052ff" strokeWidth="1.2" strokeDasharray="3 3" />
                  <text x="125" y="-76" fill="#0052ff" fontSize="13" fontWeight="800" textAnchor="start">Community 20%</text>

                  {/* Center Text */}
                  <text x="0" y="-3" fill="var(--ink)" fontSize="30" fontWeight="900" textAnchor="middle" letterSpacing="-0.5px">100%</text>
                  <text x="0" y="18" fill="var(--muted)" fontSize="10" fontWeight="800" textAnchor="middle" letterSpacing="1.5px">MINT REVENUE</text>
                </g>
              </svg>
            </div>

            <div style={{ display: 'flex', justifyContent: 'center', gap: '10px', marginTop: '8px', flexWrap: 'wrap' }}>
              <div style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', background: 'rgba(239, 68, 68, 0.08)', border: '1px solid rgba(239, 68, 68, 0.2)', padding: '5px 12px', borderRadius: '99px', fontSize: '0.8rem', fontWeight: 800, color: '#ef4444' }}>
                <Flame size={14} /> Burn 80%
              </div>
              <div style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', background: 'rgba(0, 82, 255, 0.08)', border: '1px solid rgba(0, 82, 255, 0.2)', padding: '5px 12px', borderRadius: '99px', fontSize: '0.8rem', fontWeight: 800, color: 'var(--blue)' }}>
                <Users size={14} /> Community 20%
              </div>
            </div>
          </div>
        </div>

        {/* BLOCK 5: VESTING DETAILS */}
        <div id="vesting-details" className="sec-head" style={{ marginBottom: '40px', marginTop: '40px', scrollMarginTop: '90px' }}>
          <h2>Vesting <span className="bl">Details</span>.</h2>
          <p className="sec-sub">100M tokens vested. Every month 10M unlocks and get distributed among holders.</p>
        </div>

        <div className="tok-layout">
          <div>
            <div className="tok-card">
              <h3 style={{ marginBottom: '20px' }}>Holder Rewards · 100M $VIBE</h3>
              <div className="who">
                <div className="who-r">
                  <div className="who-ico"><img src="/vibe-logo.png" className="who-img-sq" /></div>
                  <div className="who-t">$VIBE Holders<span>Hold 5M+ $VIBE to qualify</span></div>
                </div>
                <div className="who-r">
                  <div className="who-ico" style={{display:'flex', alignItems:'center', justifyContent:'center'}}><TrendingUp color="var(--blue)" size={20}/></div>
                  <div className="who-t">Allocation Size<span>The more you hold, the larger your allocation</span></div>
                </div>
                <div className="who-r">
                  <div className="who-ico" style={{display:'flex', alignItems:'center', justifyContent:'center'}}><ShieldCheck color="var(--blue)" size={20}/></div>
                  <div className="who-t">Max Allocation Cap<span>Set to prevent whale dominance & ensure fair distribution</span></div>
                </div>
                <div className="who-r">
                  <div className="who-ico" style={{display:'flex', alignItems:'center', justifyContent:'center'}}><Calculator color="var(--blue)" size={20}/></div>
                  <div className="who-t">Allocation Calculation<span>Proportionally calculated based on holding balance</span></div>
                </div>
                <div className="who-r">
                  <div className="who-ico" style={{display:'flex', alignItems:'center', justifyContent:'center'}}><Clock color="var(--blue)" size={20}/></div>
                  <div className="who-t">Snapshot Schedule<span>Balance snapshot at 00:00 UTC on the day of unlock</span></div>
                </div>
                <div className="who-r">
                  <div className="who-ico" style={{display:'flex', alignItems:'center', justifyContent:'center'}}><Calendar color="var(--blue)" size={20}/></div>
                  <div className="who-t">Claim Window<span>Stays open for 30 days until the next unlock</span></div>
                </div>
                <div className="who-r">
                  <div className="who-ico" style={{display:'flex', alignItems:'center', justifyContent:'center'}}><Flame color="#ef4444" size={20}/></div>
                  <div className="who-t">Unclaimed Tokens<span>Permanently burned</span></div>
                </div>
                <Link to={claimLink} className="who-r" style={{textDecoration:'none', cursor:'pointer', background:'var(--blue)'}}>
                  <div className="who-ico" style={{display:'flex', alignItems:'center', justifyContent:'center'}}><Check color="#fff" size={20}/></div>
                  <div className="who-t" style={{color:'#fff'}}>Check your eligibility<span style={{color:'rgba(255,255,255,0.8)'}}>Qualify for the next distribution <ArrowRightCircle size={14} style={{verticalAlign:'middle', marginLeft:4}}/></span></div>
                </Link>
              </div>
            </div>
          </div>
          <div className="sched">
            <h3>Unlock Schedule</h3>
            <p className="sub">Aug 2026 &rarr; May 2027</p>
            <div className="ul-wrap">
              {UNLOCKS.map((u,i)=>{
                const isUnlocked = new Date(u.iso || u.d) <= new Date();
                return (
                  <div key={i} className="ul-r">
                    <span className="ul-d">{u.d}</span>
                    <span className="ul-a">{u.a}</span>
                    <span className="ul-s" style={{ color: isUnlocked ? 'var(--blue)' : 'inherit', fontWeight: isUnlocked ? 'bold' : 'normal' }}>
                      {isUnlocked ? 'unlocked' : 'locked'}
                    </span>
                  </div>
                );
              })}
            </div>
          </div>
        </div>

      </div>
    </section>
  );
}
