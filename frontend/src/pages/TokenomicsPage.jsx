import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import {
  Flame,
  Users,
  Clock,
  Calculator,
  Coins,
  Crown,
  ShieldCheck,
  Gift,
  ArrowRight,
  ArrowUpRight,
  TrendingUp,
  Calendar,
  Check,
  Loader2,
  Lock
} from 'lucide-react';
import { parseAbiItem, formatUnits } from 'viem';
import { publicClient } from '../config/rpc';
import {
  Card,
  Tile,
  Badge,
  StatusPill,
  Button,
  SectionTitle
} from '../components/ui';

const CA = '0xb200000000000000000000df24ecb8bf51100a01';
const BUYBACK_WALLET = '0x067c66aDdD3C6D484c1882B68E197B614f7f3Ebf';
const BURN_WALLET = '0x000000000000000000000000000000000000dEaD';
const CONST_TOTAL_BUYBACK = 8441747.16191129 + 585682 + 2822654 + 2070000 + 422000 + 2250000 + 1421729 + 2602000 + 2684253 + 3578868 + 2889541 + 1455000;
const CONST_DISTRIBUTED = 920000;
const REVENUE_STATS_CACHE_KEY = 'vibe_revenue_stats_cache_v2';

const UNLOCKS = [
  { d: 'Aug 26, 2026', a: '10M $VIBE', iso: '2026-08-26T14:00:00Z' },
  { d: 'Sep 25, 2026', a: '10M $VIBE', iso: '2026-09-25T14:00:00Z' },
  { d: 'Oct 25, 2026', a: '10M $VIBE', iso: '2026-10-25T14:00:00Z' },
  { d: 'Nov 24, 2026', a: '10M $VIBE', iso: '2026-11-24T14:00:00Z' },
  { d: 'Dec 24, 2026', a: '10M $VIBE', iso: '2026-12-24T14:00:00Z' },
  { d: 'Jan 23, 2027', a: '10M $VIBE', iso: '2027-01-23T14:00:00Z' },
  { d: 'Feb 22, 2027', a: '10M $VIBE', iso: '2027-02-22T14:00:00Z' },
  { d: 'Mar 24, 2027', a: '10M $VIBE', iso: '2027-03-24T14:00:00Z' },
  { d: 'Apr 23, 2027', a: '10M $VIBE', iso: '2027-04-23T14:00:00Z' },
  { d: 'May 23, 2027', a: '10M $VIBE', iso: '2027-05-23T14:00:00Z' },
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
  const unlockedCount = UNLOCKS.filter(u => new Date(u.iso || u.d) <= now).length;
  const unlockedTokens = unlockedCount * 10_000_000;
  
  const baseCirculating = 900_000_000;
  const currentCirculating = baseCirculating + unlockedTokens - (totalBurnedNum || 0);
  const currentTotalSupply = 1_000_000_000 - (totalBurnedNum || 0);
  
  const formatSupply = (num) => {
    if (num >= 1000000) return (num / 1000000).toFixed(2).replace(/\.00$/, '') + 'M';
    if (num >= 1000) return (num / 1000).toFixed(1) + 'K';
    return num.toLocaleString();
  };

  const circulatingStr = loading ? '...' : formatSupply(currentCirculating);
  const totalSupplyStr = loading ? '...' : (totalBurnedNum > 0 ? formatSupply(currentTotalSupply) : '1B');

  const hubLink = '/hub';
  const claimLink = '/claim';
  const vibeClubLink = '/vibeclub';

  return (
    <div className="o1-tokenomics-container">
      {/* ── Block 1: Top Supply Overview ── */}
      <div className="o1-tokenomics-stats-grid">
        <Tile
          label="Total supply"
          value={totalSupplyStr}
          sub={!loading && totalBurnedNum > 0 ? `Burned: ${totalBurned}` : 'Capped at 1B'}
          icon={Coins}
        />
        <Tile
          label="Circulating supply"
          value={circulatingStr}
          sub="Fair launch liquidity"
          icon={TrendingUp}
        />
        <Tile
          label="Vesting rewards"
          value="100M"
          sub="10% monthly schedule"
          icon={Calendar}
        />
        <Tile
          label="Monthly unlock"
          value="10M"
          sub="Distributed to holders"
          icon={Gift}
        />
      </div>

      {/* ── Block 2: Revenue Economy ── */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
        <SectionTitle
          title="Revenue economy"
          subtitle="Creator and protocol revenue goes entirely toward buybacks and community growth"
        />

        <div className="o1-tokenomics-stats-grid">
          <Tile
            label="Total buybacks"
            value={loading ? '...' : `${totalBuybacks} $VIBE`}
            icon={TrendingUp}
          />
          <Tile
            label="Total burned"
            value={loading ? '...' : `${totalBurned} $VIBE`}
            icon={Flame}
          />
          <Tile
            label="Community pool"
            value={loading ? '...' : `${communityRewards} $VIBE`}
            icon={Users}
          />
          <Card style={{ padding: '16px', display: 'flex', flexDirection: 'column', justifyContent: 'space-between', gap: '8px' }}>
            <span style={{ fontSize: '12px', color: 'var(--text-3)', fontWeight: 500 }}>Verified address</span>
            <a
              href="https://basescan.org/token/0xb200000000000000000000df24ecb8bf51100a01?a=0x067c66aDdD3C6D484c1882B68E197B614f7f3Ebf#transactions"
              target="_blank"
              rel="noopener noreferrer"
              style={{
                fontFamily: 'var(--mono)',
                fontSize: '12px',
                color: 'var(--accent)',
                textDecoration: 'none',
                display: 'inline-flex',
                alignItems: 'center',
                gap: '4px'
              }}
            >
              0x067c...3Ebf <ArrowUpRight size={13} />
            </a>
            <span style={{ fontSize: '11px', color: 'var(--text-3)' }}>Onchain transaction logs</span>
          </Card>
        </div>

        {/* Buyback Program 2-Col Card */}
        <div className="o1-tokenomics-two-col">
          <Card style={{ padding: '20px', display: 'flex', flexDirection: 'column', gap: '14px' }}>
            <div>
              <h3 style={{ fontSize: '16px', fontWeight: 600, margin: '0 0 4px 0', color: 'var(--text)' }}>
                Buyback program mechanics
              </h3>
              <p style={{ fontSize: '13px', color: 'var(--text-3)', margin: 0 }}>
                Strategic revenue utilization to strengthen token backing
              </p>
            </div>

            <div className="o1-tokenomics-list-stack">
              <div className="o1-tokenomics-item-row">
                <div className="o1-tokenomics-item-icon">
                  <Flame size={16} />
                </div>
                <div className="o1-tokenomics-item-content">
                  <span className="o1-tokenomics-item-title">30% Permanent burn</span>
                  <span className="o1-tokenomics-item-desc">
                    Sent directly to the dead burn address on Base, continuously reducing total circulating supply.
                  </span>
                </div>
              </div>

              <div className="o1-tokenomics-item-row">
                <div className="o1-tokenomics-item-icon">
                  <Users size={16} />
                </div>
                <div className="o1-tokenomics-item-content">
                  <span className="o1-tokenomics-item-title">70% Community allocation</span>
                  <span className="o1-tokenomics-item-desc">
                    Feeds rolling staking rewards, holder airdrops, and Vibe Club royalties.
                  </span>
                </div>
              </div>
            </div>
          </Card>

          {/* SVG Donut Card */}
          <Card className="o1-tokenomics-donut-card">
            <div className="o1-tokenomics-donut-wrap">
              <svg viewBox="0 0 200 200" style={{ width: '100%', height: 'auto', display: 'block' }}>
                <circle cx="100" cy="100" r="70" fill="none" stroke="var(--surface-3)" strokeWidth="16" />
                {/* 70% Community (Cyan) */}
                <circle
                  cx="100" cy="100" r="70" fill="none" stroke="var(--accent)" strokeWidth="16"
                  strokeLinecap="round" pathLength="100" strokeDasharray="68 100" strokeDashoffset="-1"
                  transform="rotate(-90 100 100)"
                />
                {/* 30% Burn (Danger) */}
                <circle
                  cx="100" cy="100" r="70" fill="none" stroke="var(--danger)" strokeWidth="16"
                  strokeLinecap="round" pathLength="100" strokeDasharray="28 100" strokeDashoffset="-71"
                  transform="rotate(-90 100 100)"
                />
                <text x="100" y="96" fill="var(--text)" fontSize="18" fontWeight="700" textAnchor="middle" fontFamily="var(--mono)">100%</text>
                <text x="100" y="114" fill="var(--text-3)" fontSize="10" textAnchor="middle" fontWeight="500">Buyback split</text>
              </svg>
            </div>
            <div className="o1-tokenomics-donut-legend">
              <Badge variant="info">Community 70%</Badge>
              <Badge variant="danger">Burn 30%</Badge>
            </div>
          </Card>
        </div>
      </div>

      {/* ── Block 3: Rewards Economy (70% Community Split) ── */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
        <SectionTitle
          title="Rewards economy"
          subtitle="Constitutes the 70% community allocation from the Buyback Program"
        />

        <div className="o1-tokenomics-two-col">
          <Card style={{ padding: '20px', display: 'flex', flexDirection: 'column', gap: '14px' }}>
            <div>
              <h3 style={{ fontSize: '16px', fontWeight: 600, margin: '0 0 4px 0', color: 'var(--text)' }}>
                Distribution breakdown
              </h3>
              <p style={{ fontSize: '13px', color: 'var(--text-3)', margin: 0 }}>
                Automated 10-day rolling epoch distribution
              </p>
            </div>

            <div className="o1-tokenomics-list-stack">
              <div className="o1-tokenomics-item-row">
                <div className="o1-tokenomics-item-icon">
                  <Clock size={16} />
                </div>
                <div className="o1-tokenomics-item-content">
                  <span className="o1-tokenomics-item-title">10-day rolling epochs</span>
                  <span className="o1-tokenomics-item-desc">Reward distribution across all pools happens every 10 days.</span>
                </div>
              </div>

              <div className="o1-tokenomics-item-row">
                <div className="o1-tokenomics-item-icon">
                  <Coins size={16} />
                </div>
                <div className="o1-tokenomics-item-content">
                  <span className="o1-tokenomics-item-title">$VIBE Staking (15%)</span>
                  <span className="o1-tokenomics-item-desc">Yield for locking $VIBE in verified staking vaults on o1 Exchange.</span>
                </div>
              </div>

              <div className="o1-tokenomics-item-row">
                <div className="o1-tokenomics-item-icon">
                  <Crown size={16} />
                </div>
                <div className="o1-tokenomics-item-content">
                  <span className="o1-tokenomics-item-title">Vibe Club NFTs (15%)</span>
                  <span className="o1-tokenomics-item-desc">Direct royalties for holders of the 333 genesis membership passes.</span>
                </div>
              </div>

              <div className="o1-tokenomics-item-row">
                <div className="o1-tokenomics-item-icon">
                  <ShieldCheck size={16} />
                </div>
                <div className="o1-tokenomics-item-content">
                  <span className="o1-tokenomics-item-title">Reserve buffer (70%)</span>
                  <span className="o1-tokenomics-item-desc">Protocol treasury buffer for long-term reward stability.</span>
                </div>
              </div>
            </div>

            <Button variant="primary" size="md" as={Link} to={hubLink} style={{ alignSelf: 'flex-start', marginTop: '6px' }}>
              <Gift size={14} /> Explore rewards hub <ArrowRight size={14} />
            </Button>
          </Card>

          {/* SVG Donut Card */}
          <Card className="o1-tokenomics-donut-card">
            <div className="o1-tokenomics-donut-wrap">
              <svg viewBox="0 0 200 200" style={{ width: '100%', height: 'auto', display: 'block' }}>
                <circle cx="100" cy="100" r="70" fill="none" stroke="var(--surface-3)" strokeWidth="16" />
                {/* 70% Reserve */}
                <circle
                  cx="100" cy="100" r="70" fill="none" stroke="var(--success)" strokeWidth="16"
                  strokeLinecap="round" pathLength="100" strokeDasharray="68 100" strokeDashoffset="-1"
                  transform="rotate(-90 100 100)"
                />
                {/* 15% Staking */}
                <circle
                  cx="100" cy="100" r="70" fill="none" stroke="var(--accent)" strokeWidth="16"
                  strokeLinecap="round" pathLength="100" strokeDasharray="14 100" strokeDashoffset="-70"
                  transform="rotate(-90 100 100)"
                />
                {/* 15% NFT Club */}
                <circle
                  cx="100" cy="100" r="70" fill="none" stroke="var(--warning)" strokeWidth="16"
                  strokeLinecap="round" pathLength="100" strokeDasharray="14 100" strokeDashoffset="-85"
                  transform="rotate(-90 100 100)"
                />
                <text x="100" y="96" fill="var(--text)" fontSize="18" fontWeight="700" textAnchor="middle" fontFamily="var(--mono)">70%</text>
                <text x="100" y="114" fill="var(--text-3)" fontSize="10" textAnchor="middle" fontWeight="500">Community pool</text>
              </svg>
            </div>
            <div className="o1-tokenomics-donut-legend">
              <Badge variant="success">Reserve 70%</Badge>
              <Badge variant="info">Staking 15%</Badge>
              <Badge variant="warning">NFT Club 15%</Badge>
            </div>
          </Card>
        </div>
      </div>

      {/* ── Block 4: Vibe Club Economy ── */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
        <SectionTitle
          title="Vibe Club economy"
          subtitle="Official genesis collection mint economics and deflationary mechanics"
        />

        <div className="o1-tokenomics-two-col">
          <Card style={{ padding: '20px', display: 'flex', flexDirection: 'column', gap: '14px' }}>
            <div>
              <h3 style={{ fontSize: '16px', fontWeight: 600, margin: '0 0 4px 0', color: 'var(--text)' }}>
                Mint proceeds allocation
              </h3>
              <p style={{ fontSize: '13px', color: 'var(--text-3)', margin: 0 }}>
                Every mint directly impacts token economics
              </p>
            </div>

            <div className="o1-tokenomics-list-stack">
              <div className="o1-tokenomics-item-row">
                <div className="o1-tokenomics-item-icon">
                  <Flame size={16} />
                </div>
                <div className="o1-tokenomics-item-content">
                  <span className="o1-tokenomics-item-title">80% Deflationary mint burn</span>
                  <span className="o1-tokenomics-item-desc">
                    80% of all mint fees are swapped to $VIBE and burned on contract execution.
                  </span>
                </div>
              </div>

              <div className="o1-tokenomics-item-row">
                <div className="o1-tokenomics-item-icon">
                  <Users size={16} />
                </div>
                <div className="o1-tokenomics-item-content">
                  <span className="o1-tokenomics-item-title">20% Community rewards pool</span>
                  <span className="o1-tokenomics-item-desc">
                    Transferred directly into the community reward balance for ongoing epoch payouts.
                  </span>
                </div>
              </div>
            </div>

            <Button variant="primary" size="md" as={Link} to={vibeClubLink} style={{ alignSelf: 'flex-start', marginTop: '6px' }}>
              <Crown size={14} /> Join Vibe Club <ArrowRight size={14} />
            </Button>
          </Card>

          {/* SVG Donut Card */}
          <Card className="o1-tokenomics-donut-card">
            <div className="o1-tokenomics-donut-wrap">
              <svg viewBox="0 0 200 200" style={{ width: '100%', height: 'auto', display: 'block' }}>
                <circle cx="100" cy="100" r="70" fill="none" stroke="var(--surface-3)" strokeWidth="16" />
                {/* 80% Burn */}
                <circle
                  cx="100" cy="100" r="70" fill="none" stroke="var(--danger)" strokeWidth="16"
                  strokeLinecap="round" pathLength="100" strokeDasharray="78 100" strokeDashoffset="-1"
                  transform="rotate(-90 100 100)"
                />
                {/* 20% Community */}
                <circle
                  cx="100" cy="100" r="70" fill="none" stroke="var(--accent)" strokeWidth="16"
                  strokeLinecap="round" pathLength="100" strokeDasharray="18 100" strokeDashoffset="-80"
                  transform="rotate(-90 100 100)"
                />
                <text x="100" y="96" fill="var(--text)" fontSize="18" fontWeight="700" textAnchor="middle" fontFamily="var(--mono)">100%</text>
                <text x="100" y="114" fill="var(--text-3)" fontSize="10" textAnchor="middle" fontWeight="500">Mint revenue</text>
              </svg>
            </div>
            <div className="o1-tokenomics-donut-legend">
              <Badge variant="danger">Burn 80%</Badge>
              <Badge variant="info">Community 20%</Badge>
            </div>
          </Card>
        </div>
      </div>

      {/* ── Block 5: Vesting Details & Unlock Schedule ── */}
      <div id="vesting-details" style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
        <SectionTitle
          title="Vesting details & unlock schedule"
          subtitle="100M total vested tokens, unlocking 10M monthly for community holders"
        />

        <div className="o1-tokenomics-two-col">
          {/* Holder Eligibility Requirements */}
          <Card style={{ padding: '20px', display: 'flex', flexDirection: 'column', gap: '14px' }}>
            <div>
              <h3 style={{ fontSize: '16px', fontWeight: 600, margin: '0 0 4px 0', color: 'var(--text)' }}>
                Holder rewards distribution rules
              </h3>
              <p style={{ fontSize: '13px', color: 'var(--text-3)', margin: 0 }}>
                Transparent qualification criteria
              </p>
            </div>

            <div className="o1-tokenomics-list-stack">
              <div className="o1-tokenomics-item-row">
                <div className="o1-tokenomics-item-icon">
                  <ShieldCheck size={16} />
                </div>
                <div className="o1-tokenomics-item-content">
                  <span className="o1-tokenomics-item-title">Minimum threshold</span>
                  <span className="o1-tokenomics-item-desc">Hold 5,000,000+ $VIBE at snapshot time to qualify.</span>
                </div>
              </div>

              <div className="o1-tokenomics-item-row">
                <div className="o1-tokenomics-item-icon">
                  <Calculator size={16} />
                </div>
                <div className="o1-tokenomics-item-content">
                  <span className="o1-tokenomics-item-title">Proportional allocation</span>
                  <span className="o1-tokenomics-item-desc">Larger balances receive higher allocation shares (anti-whale cap).</span>
                </div>
              </div>

              <div className="o1-tokenomics-item-row">
                <div className="o1-tokenomics-item-icon">
                  <Clock size={16} />
                </div>
                <div className="o1-tokenomics-item-content">
                  <span className="o1-tokenomics-item-title">Snapshot timing</span>
                  <span className="o1-tokenomics-item-desc">Onchain snapshot taken at 00:00 UTC on the day of unlock.</span>
                </div>
              </div>

              <div className="o1-tokenomics-item-row">
                <div className="o1-tokenomics-item-icon">
                  <Calendar size={16} />
                </div>
                <div className="o1-tokenomics-item-content">
                  <span className="o1-tokenomics-item-title">30-day claim window</span>
                  <span className="o1-tokenomics-item-desc">Unclaimed tokens after window expiry are permanently burned.</span>
                </div>
              </div>
            </div>

            <Button variant="primary" size="md" as={Link} to={claimLink} style={{ alignSelf: 'flex-start', marginTop: '6px' }}>
              <Check size={14} /> Check your eligibility <ArrowRight size={14} />
            </Button>
          </Card>

          {/* Unlock Schedule Table */}
          <Card style={{ padding: '20px', display: 'flex', flexDirection: 'column', gap: '14px' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <h3 style={{ fontSize: '16px', fontWeight: 600, margin: 0, color: 'var(--text)' }}>
                10-Month schedule
              </h3>
              <Badge variant="neutral">{unlockedCount}/10 unlocked</Badge>
            </div>

            <div className="o1-tokenomics-unlock-stack">
              {UNLOCKS.map((u, i) => {
                const isUnlocked = new Date(u.iso || u.d) <= now;
                return (
                  <div key={i} className="o1-tokenomics-unlock-row">
                    <span className="o1-tokenomics-unlock-date">{u.d}</span>
                    <span className="o1-tokenomics-unlock-amount">{u.a}</span>
                    <StatusPill
                      status={isUnlocked ? 'Active' : 'Locked'}
                      tone={isUnlocked ? 'success' : 'neutral'}
                    />
                  </div>
                );
              })}
            </div>
          </Card>
        </div>
      </div>
    </div>
  );
}
