import React, { useState, useEffect, useRef, useCallback } from 'react';
import { BrowserRouter, Routes, Route, Link, useLocation, Navigate } from 'react-router-dom';
import { Copy, Check, Menu, X, ArrowRight, ArrowUpRight, ArrowRightCircle, TrendingUp, Clock, Rocket, Globe, Star, Crown, Laptop, Loader2, Flame, Gift, Users, ShieldCheck, Calculator, Calendar, RotateCcw, Gamepad2, Coins, Sparkles, Lock, ChevronDown, HelpCircle, CheckCircle2 } from 'lucide-react';
import { PrivyProvider, dataSuffix } from '@privy-io/react-auth';
import { WagmiProvider as PrivyWagmiProvider } from '@privy-io/wagmi';
import { privyWagmiConfig } from './config/privyWagmi';
import { DATA_SUFFIX } from './config/builderCode';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { createPublicClient, http, formatUnits, parseAbiItem, parseAbi } from 'viem';
import { base } from 'viem/chains';
import { publicClient } from './config/rpc';
import Checker from './Checker';
import { BaseAppView } from './components/BaseAppView';
import NftClubPage from './pages/NftClubPage';
import ContractsPage from './pages/ContractsPage';
import BaseAppRewardsView from './components/BaseAppRewardsView';
import './index.css';

const CA      = '0xb200000000000000000000df24ecb8bf51100a01';
const O1      = 'https://launch.o1.exchange/token/0xb200000000000000000000df24ecb8bf51100a01?chain=8453';
const O1_STAKING_VAULT = 'https://launch.o1.exchange/staking/vaults?chain=8453&token=0xb200000000000000000000df24ecb8bf51100a01';
const O1_STAKING_VAULT_EPOCH_1 = 'https://launch.o1.exchange/staking/vaults/0xafa3ce23e0043b651d98e5a89b55a80b71be2f4a945a745cd6e37316b5075663?chain=8453';
const O1_STAKING_VAULT_EPOCH_2 = 'https://launch.o1.exchange/staking/vaults/0x5dcabfeb83e84ad87572c531dfa8de915e0b5d8c11e4ca39598a3c6b4fc1e446?chain=8453';
const O1_STAKING_VAULT_EPOCH_3 = 'https://launch.o1.exchange/staking/vaults/0x5a0d6075197085da4e2b9a790f3be8c297d08effcfca677992489668ebcf8b0c?chain=8453';
const O1_STAKING_VAULT_EPOCH_4 = 'https://launch.o1.exchange/staking/vaults/0xdd9b4d063653fcc4d8b64d42edfe156002e863b15297d059463554182fa50dd9?chain=8453';
const O1_STAKING_VAULT_EPOCH_5 = 'https://launch.o1.exchange/staking/vaults/0x795d393bdf9582ac8678aceb6f2228118ae2456406da38a8cb35967c033c0713?chain=8453';
const O1_STAKING_VAULT_EPOCH_6 = 'https://launch.o1.exchange/staking/vaults/0x110cf0164a5244daf1e3f804d9bcc2b55b1cfbc95ff327aadf82ca3d664d2d08?chain=8453';
const DEX     = 'https://dexscreener.com/base/0xa1a4159e61ac9fc48aa9e9992c8d4870ef8a496d5749af1d219e8002f74835c5';
const DEX_EMB = 'https://dexscreener.com/base/0xa1a4159e61ac9fc48aa9e9992c8d4870ef8a496d5749af1d219e8002f74835c5?embed=1&theme=dark&activeTab=chart';

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

const BUYBACK_WALLET = '0x067c66aDdD3C6D484c1882B68E197B614f7f3Ebf';
const BURN_WALLET = '0x000000000000000000000000000000000000dEaD';
const DIST_WALLET = '0x3b277d566b4557a53392712b1dc830da5d13ba91';

// Historical data constants (RPC getLogs is impossible for 31M block range on frontend)
const CONST_TOTAL_BUYBACK = 8441747.16191129 + 585682 + 2822654 + 2070000 + 422000 + 2250000 + 1421729 + 2602000 + 2684253 + 3578868 + 2889541 + 1455000;
const CONST_DISTRIBUTED = 920000;

const TICKS = [
  '🐾 $VIBE ON BASE','🐶 THE BASE DOG','✨ B20 STANDARD','💙 GOOD BOY COIN',
  '🚀 UNLIMITED VIBES','🐾 HAPPY PAWS','💎 COMMUNITY FIRST','🌊 RIDE THE VIBE',
  '🤝 BASED & LOYAL','🔥 MALTIPOO COIN',
];

/* hooks */
function useCopy(txt) {
  const [ok, setOk] = useState(false);
  const go = useCallback(() => {
    navigator.clipboard.writeText(txt).catch(()=>{});
    setOk(true); setTimeout(() => setOk(false), 2000);
  }, [txt]);
  return { ok, go };
}
function useRev() {
  const ref = useRef(null);
  useEffect(() => {
    const el = ref.current; if (!el) return;
    const io = new IntersectionObserver(([e]) => { if (e.isIntersecting) el.classList.add('on'); }, { threshold: 0.1 });
    io.observe(el); return () => io.disconnect();
  }, []);
  return ref;
}

function ScrollToTop() {
  const { pathname } = useLocation();
  useEffect(() => {
    window.scrollTo(0, 0);
  }, [pathname]);
  return null;
}

/* NAV */
function Nav() {
  const [stuck, setStuck] = useState(false);
  const [open, setOpen]   = useState(false);
  useEffect(() => {
    const h = () => setStuck(window.scrollY > 50);
    window.addEventListener('scroll', h); return () => window.removeEventListener('scroll', h);
  }, []);

  const navLinks = [
    // { id: 'about', label: 'About' },
    { id: 'tokenomics', label: 'Tokenomics' },
    { id: 'hub', label: 'Rewards Hub' },
    { id: 'claim', label: 'Claim Portal' },
    { id: 'contracts', label: 'Official Addresses' },
    // { id: 'roadmap', label: 'Roadmap' },
    { id: 'chart', label: 'Chart' },
    { id: 'trade', label: 'Trade' }
  ];

  return (
    <>
      <nav className={stuck ? 'stuck' : ''}>
        <div className="nav-inner">
          <Link to="/" className="nav-brand" onClick={() => setOpen(false)}>
            <img src="/new-logo-vibe.png" className="nav-logo" alt="$VIBE" />
            $VIBE
          </Link>
          <ul className="nav-menu">
            {navLinks.map(({ id, label }) => (
              <li key={id}>
                <Link
                  to={`/${id}`}
                  onClick={() => setOpen(false)}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '6px',
                    ...(id === 'hub' ? {
                      color: 'var(--amber)',
                      fontWeight: 800
                    } : (id === 'claim' || id === 'checker') ? {
                      color: 'var(--blue)',
                      fontWeight: 800
                    } : {})
                  }}
                >
                  {label}
                </Link>
              </li>
            ))}
          </ul>
          <div style={{display:'flex', alignItems:'center', gap:'6px'}}>
            <a href="https://vibeverse.dog/vibeclub" target="_blank" rel="noreferrer" className="nav-mint">
              Mint NFT <ArrowUpRight size={14} strokeWidth={2.5} />
            </a>
            <a href={O1} target="_blank" rel="noreferrer" className="nav-buy">
              Buy $VIBE <ArrowUpRight size={14} strokeWidth={2.5} />
            </a>
            <button className="ham" onClick={() => setOpen(!open)}>
              {open ? <X size={24} color="var(--ink)" /> : <Menu size={24} color="var(--ink)" />}
            </button>
          </div>
        </div>
      </nav>
      <div className={`mob-menu ${open ? 'open' : ''}`}>
        <div className="mob-links">
          {navLinks.map(({ id, label }) => (
            <Link
              key={id}
              to={`/${id}`}
              onClick={() => setOpen(false)}
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '6px',
                ...(id === 'hub' || id === 'rewards' ? {
                  color: 'var(--amber)',
                  fontWeight: 800
                } : (id === 'claim' || id === 'checker') ? {
                  color: 'var(--blue)',
                  fontWeight: 800
                } : {})
              }}
            >
              {label}
            </Link>
          ))}
          <a href="https://vibeverse.dog/vibeclub" target="_blank" rel="noreferrer" className="mob-mint" onClick={() => setOpen(false)}>
            Mint NFT <ArrowUpRight size={20} strokeWidth={2.5} />
          </a>
          <a href={O1} target="_blank" rel="noreferrer" className="mob-buy" style={{display:'flex', alignItems:'center', justifyContent:'center', gap:'8px'}} onClick={() => setOpen(false)}>
            Buy $VIBE <ArrowUpRight size={20} strokeWidth={2.5} />
          </a>
        </div>
      </div>
    </>
  );
}

/* HERO */
function Hero() {
  const { ok, go } = useCopy(CA);
  return (
    <section id="hero">
      <div className="hero-inner">
        <div>
          <div className="hero-eyebrow">
            <div className="eyebrow-dot"/>
            Live on Base B20
          </div>
          <h1>I AM THE <span className="blue">VIBE.</span><br/>THE <span className="blue">BASE</span> DOG.</h1>
          
          <div className="hero-quote-box">
            <div className="hero-quote-line">
              Dog Vibe belongs to only one owner <strong>offchain</strong>.
            </div>
            <div className="hero-quote-line blue-line">
              Base Dog <strong>$VIBE</strong> belongs to everyone <strong>onchain</strong>.
            </div>
          </div>

          <p className="hero-desc">
            Not just a meme. The real maltipoo dog and the ultimate mood maker on Base B20. Good vibes and positive energy only. Every great journey starts with a single paw print 🐾
          </p>
          <div className="hero-btns">
            <a href={O1} target="_blank" rel="noreferrer" className="btn-fill">
              Buy $VIBE <ArrowRight size={20} strokeWidth={2.5} />
            </a>
            <a href={DEX} target="_blank" rel="noreferrer" className="btn-line">
              Dexscreener <ArrowUpRight size={20} strokeWidth={2.5} />
            </a>
          </div>
          <div className="hero-ca-wrap">
            <div className="hero-ca-lbl">$VIBE Contract Address (Base)</div>
            <div className="hero-ca-box">
              <span className="hero-ca-addr">{CA}</span>
              <button className={`hero-ca-btn${ok?' ok':''}`} onClick={go} title="Copy Address">
                {ok ? <Check size={20} strokeWidth={3} /> : <Copy size={20} />}
              </button>
            </div>
          </div>
        </div>
        <div className="dog-wrap">
          <img
            src="/new-logo-vibe.png"
            onError={e=>{e.target.onerror=null;e.target.src='/mascot.png';}}
            alt="$VIBE The Base Dog"
            className="dog-img"
          />
        </div>
      </div>
    </section>
  );
}






/* ABOUT */
function About() {
  const r1=useRev(), r2=useRev();
  return (
    <section id="about">
      <div className="wrap">
        <div className="sec-head rv" ref={r1}>
          <h2>More than a meme.<br/>The real <span className="bl">Base Dog</span>.</h2>
          <p className="sec-sub">The fluffiest, most loyal dog onchain & offchain.</p>
          <div style={{
            marginTop: '20px',
            background: 'rgba(255, 255, 255, 0.65)',
            borderLeft: '4px solid var(--blue)',
            borderRadius: '0 12px 12px 0',
            padding: '12px 18px',
            display: 'inline-block',
            borderTop: '1px solid color-mix(in srgb, var(--accent) 12%, transparent)',
            borderRight: '1px solid color-mix(in srgb, var(--accent) 12%, transparent)',
            borderBottom: '1px solid color-mix(in srgb, var(--accent) 12%, transparent)'
          }}>
            <p style={{ margin: 0, fontStyle: 'italic', fontSize: '0.95rem', fontWeight: 600, color: 'var(--ink)', lineHeight: '1.5' }}>
              Vibe belongs to only one owner offchain.<br/>
              <span style={{ color: 'var(--blue)', fontWeight: 700 }}>$VIBE belongs to everyone onchain.</span>
            </p>
          </div>
        </div>
        <div className="about-grid">
          <div className="rv d1" ref={r2}>
            <p>
              $VIBE is a real Maltipoo Dog who came to B20 to become the ultimate mood maker,
              spread positive energy and immaculate vibes with the based community.
            </p>
            <div className="traits">
              <div className="trait"><span className="t-ico">🐶</span><div className="t-txt"><strong>Real Dog Energy</strong>Inspired by a real Maltipoo — the cutest, most vibing dog alive</div></div>
              <div className="trait"><div className="t-ico-img-wrap"><img src="/b20-logo.png" alt="B20" /></div><div className="t-txt"><strong>B20 on Base</strong>Community-driven standard, fully transparent tokenomics</div></div>
              <div className="trait"><span className="t-ico">🤝</span><div className="t-txt"><strong>100% to Holders</strong>Every vested token distributed to the community — zero team bags</div></div>
              <div className="trait"><span className="t-ico">🐾</span><div className="t-txt"><strong>Good Vibes Only</strong>Every paw print forward is a step toward the moon</div></div>
            </div>
          </div>
          <div className="about-img-wrap">
            <img src="/picture-vibe.jfif" alt="The real VIBE dog" className="about-img" />
          </div>
        </div>
      </div>
    </section>
  );
}

/* TOKENOMICS */
const REVENUE_STATS_CACHE_KEY = 'vibe_revenue_stats_cache_v2';

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

function useRevenueStats() {
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
        console.warn("Notice: Live stats fallback used", err);
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

function Tokenomics() {
  const r = useRev();
  const { totalBurned, totalBurnedNum, totalBuybacks, communityRewards, distributedRewards, loading } = useRevenueStats();
  
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

  const circulatingStr = loading ? <Loader2 size={24} className="spin"/> : formatSupply(currentCirculating);
  const totalSupplyStr = loading ? <Loader2 size={24} className="spin"/> : (totalBurnedNum > 0 ? formatSupply(currentTotalSupply) : '1B');

  return (
    <section id="tokenomics" className="alt">
      <div className="wrap">
        
        {/* BLOCK 1: TOKENOMICS INFO */}
        <div className="sec-head rv" ref={r} style={{ marginBottom: '40px' }}>
          <h2>$VIBE <span className="bl">Tokenomics</span>.</h2>
          <p className="sec-sub">Fair launch via o1.exchange. $VIBE B20 launch time was publicly announced in advance. Zero BS. No team allocations. No insider buys.</p>
        </div>
        
        <div className="stat-tiles wide-stats" style={{ marginBottom: '60px' }}>
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
        <div className="sec-head" style={{ marginBottom: '40px', marginTop: '40px' }}>
          <h2>Revenue <span className="bl">Economy</span>.</h2>
          <p className="sec-sub">Creator Revenue is going towards buybacks and actions aimed at strengthening the token economy, driving long-term value for all holders.</p>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(min(100%, 400px), 1fr))', gap: '24px', marginBottom: '60px' }}>
          
          {/* Left Side: Stat Tiles */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '16px', height: '100%' }}>
            {/* Top 2 Tiles: expand to fill top section */}
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
                    <stop offset="100%" stopColor="var(--accent)" />
                  </linearGradient>

                  <filter id="redGlow" x="-20%" y="-20%" width="140%" height="140%">
                    <feDropShadow dx="0" dy="4" stdDeviation="6" floodColor="#ef4444" floodOpacity="0.25" />
                  </filter>
                  <filter id="blueGlow" x="-20%" y="-20%" width="140%" height="140%">
                    <feDropShadow dx="0" dy="4" stdDeviation="6" floodColor="var(--accent)" floodOpacity="0.25" />
                  </filter>
                </defs>

                <g transform="translate(210, 140)">
                  {/* Track Ring */}
                  <circle cx="0" cy="0" r="80" fill="none" stroke="var(--text-2)" strokeWidth="18" />

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
                  <circle cx="47" cy="65" r="4" fill="var(--accent)" />
                  <polyline points="47,65 75,90 115,90" fill="none" stroke="var(--accent)" strokeWidth="1.2" strokeDasharray="3 3" />
                  <text x="122" y="94" fill="var(--accent)" fontSize="13" fontWeight="800" textAnchor="start">Community 70%</text>

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
              <div style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', background: 'color-mix(in srgb, var(--accent) 8%, transparent)', border: '1px solid color-mix(in srgb, var(--accent) 20%, transparent)', padding: '5px 12px', borderRadius: '99px', fontSize: '0.8rem', fontWeight: 800, color: 'var(--blue)' }}>
                <Users size={14} /> Community 70%
              </div>
            </div>
          </div>
        </div>

        {/* BLOCK 3: REWARDS ECONOMY */}
        <div className="sec-head" style={{ marginBottom: '40px', marginTop: '60px' }}>
          <h2>Rewards <span className="bl">Economy</span>.</h2>
          <p className="sec-sub">Constitutes the 70% reserved for the community in the Buyback Program.</p>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(min(100%, 400px), 1fr))', gap: '24px', marginBottom: '60px' }}>
          
          {/* Left Side: Unified Distribution Breakdown Block */}
          <div className="tok-card" style={{ display: 'flex', flexDirection: 'column', justifyContent: 'space-between' }}>
            <div>
              <h3>Distribution Breakdown</h3>

              <div className="who">
                
                {/* 1. 10-Day Epoch Distribution */}
                <div className="who-r">
                  <div className="who-ico" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    <Clock color="#7c3aed" size={20} />
                  </div>
                  <div className="who-t">
                    10-Day Rolling Epochs
                    <span>Reward distribution across all pools happens every 10 days</span>
                  </div>
                </div>

                {/* 2. Epoch Allocation Size */}
                <div className="who-r">
                  <div className="who-ico" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    <Calculator color="var(--blue)" size={20} />
                  </div>
                  <div className="who-t">
                    Epoch Allocation Size
                    <span>Equals designated % of Community Pool</span>
                  </div>
                </div>

                {/* 3. $VIBE Staking (15%) */}
                <div className="who-r">
                  <div className="who-ico" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    <Coins color="var(--text-2)" size={20} />
                  </div>
                  <div className="who-t">
                    $VIBE Staking <span style={{ color: 'var(--text-2)', fontWeight: 900, display: 'inline', marginLeft: '4px' }}>(15%)</span>
                    <span>Yield for locking $VIBE in verified staking pool on o1</span>
                  </div>
                </div>

                {/* 4. Vibe Club NFTs (15%) */}
                <div className="who-r">
                  <div className="who-ico" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    <Crown color="#f59e0b" size={20} />
                  </div>
                  <div className="who-t">
                    Vibe Club NFTs <span style={{ color: '#f59e0b', fontWeight: 900, display: 'inline', marginLeft: '4px' }}>(15%)</span>
                    <span>Direct royalties for holders of the 333 Vibe Club NFTs</span>
                  </div>
                </div>

                {/* 5. Reserve (70%) */}
                <div className="who-r">
                  <div className="who-ico" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    <ShieldCheck color="var(--green)" size={20} />
                  </div>
                  <div className="who-t">
                    Reserve <span style={{ color: 'var(--green)', fontWeight: 900, display: 'inline', marginLeft: '4px' }}>(70%)</span>
                    <span>Buffer for continuous reward refills</span>
                  </div>
                </div>

                {/* 6. Action Button: Explore Rewards Hub */}
                <Link to="/hub" className="who-r" style={{ textDecoration: 'none', cursor: 'pointer', background: 'var(--blue)' }}>
                  <div className="who-ico" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    <Gift color="var(--text)" size={20} />
                  </div>
                  <div className="who-t" style={{ color: 'var(--text)' }}>
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
          <div className="tok-card" style={{ padding: '32px 24px', textAlign: 'center', display: 'flex', flexDirection: 'column', justifyContent: 'space-between', position: 'relative' }}>
            <div>
              <h3 style={{ fontSize: '1.25rem', fontWeight: 800, marginBottom: '4px', color: 'var(--ink)' }}>Community Pool Distribution</h3>
              <p className="sub" style={{ fontSize: '0.85rem', color: 'var(--muted)', margin: 0 }}>Allocation of the 70% Revenue Share (Normalized to 100%).</p>
            </div>

            <div style={{ position: 'relative', width: '100%', maxWidth: '420px', margin: '16px auto 8px', flexShrink: 0 }}>
              <svg viewBox="0 0 420 280" style={{ width: '100%', height: 'auto', display: 'block', overflow: 'visible' }}>
                <defs>
                  <linearGradient id="commPurpleGrad" x1="0%" y1="0%" x2="100%" y2="100%">
                    <stop offset="0%" stopColor="var(--text-2)" />
                    <stop offset="100%" stopColor="#7c3aed" />
                  </linearGradient>
                  <linearGradient id="commGreenGrad" x1="0%" y1="0%" x2="100%" y2="100%">
                    <stop offset="0%" stopColor="#34d399" />
                    <stop offset="100%" stopColor="var(--green)" />
                  </linearGradient>
                  <linearGradient id="commAmberGrad" x1="0%" y1="0%" x2="100%" y2="100%">
                    <stop offset="0%" stopColor="#fbbf24" />
                    <stop offset="100%" stopColor="#f59e0b" />
                  </linearGradient>

                  <filter id="commPurpleGlow" x="-20%" y="-20%" width="140%" height="140%">
                    <feDropShadow dx="0" dy="4" stdDeviation="6" floodColor="#7c3aed" floodOpacity="0.25" />
                  </filter>
                  <filter id="commGreenGlow" x="-20%" y="-20%" width="140%" height="140%">
                    <feDropShadow dx="0" dy="4" stdDeviation="6" floodColor="var(--green)" floodOpacity="0.25" />
                  </filter>
                  <filter id="commAmberGlow" x="-20%" y="-20%" width="140%" height="140%">
                    <feDropShadow dx="0" dy="4" stdDeviation="6" floodColor="#f59e0b" floodOpacity="0.25" />
                  </filter>
                </defs>

                <g transform="translate(210, 140)">
                  {/* Track Ring */}
                  <circle cx="0" cy="0" r="80" fill="none" stroke="var(--text-2)" strokeWidth="18" />

                  {/* 1. $VIBE Staking 15% */}
                  <circle cx="0" cy="0" r="80" fill="none" stroke="url(#commPurpleGrad)" strokeWidth="18"
                          strokeLinecap="round" pathLength="100" strokeDasharray="11 100" strokeDashoffset="-2"
                          transform="rotate(-90)" filter="url(#commPurpleGlow)" style={{ transition: 'all 0.5s ease' }} />

                  {/* 2. Vibe Club NFT 15% */}
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
                  <circle cx="-65" cy="47" r="4" fill="var(--green)" />
                  <polyline points="-65,47 -100,75 -140,75" fill="none" stroke="var(--green)" strokeWidth="1.2" strokeDasharray="3 3" />
                  <text x="-145" y="80" fill="var(--green)" fontSize="12" fontWeight="800" textAnchor="end">Reserve 70%</text>

                  {/* Center Text */}
                  <text x="0" y="-3" fill="var(--ink)" fontSize="28" fontWeight="900" textAnchor="middle" letterSpacing="-0.5px">100%</text>
                  <text x="0" y="16" fill="var(--muted)" fontSize="9" fontWeight="800" textAnchor="middle" letterSpacing="1px">COMMUNITY</text>
                </g>
              </svg>
            </div>

            {/* Legend Pills */}
            <div style={{ display: 'flex', justifyContent: 'center', gap: '8px', marginTop: '8px', flexWrap: 'wrap' }}>
              <div style={{ display: 'inline-flex', alignItems: 'center', gap: '5px', background: 'rgba(124, 58, 237, 0.08)', border: '1px solid rgba(124, 58, 237, 0.2)', padding: '4px 10px', borderRadius: '99px', fontSize: '0.75rem', fontWeight: 800, color: '#7c3aed' }}>
                <Coins size={13} /> Staking 15%
              </div>
              <div style={{ display: 'inline-flex', alignItems: 'center', gap: '5px', background: 'rgba(245, 158, 11, 0.08)', border: '1px solid rgba(245, 158, 11, 0.2)', padding: '4px 10px', borderRadius: '99px', fontSize: '0.75rem', fontWeight: 800, color: '#f59e0b' }}>
                <Crown size={13} /> NFT Club 15%
              </div>
              <div style={{ display: 'inline-flex', alignItems: 'center', gap: '5px', background: 'color-mix(in srgb, var(--green) 8%, transparent)', border: '1px solid color-mix(in srgb, var(--green) 20%, transparent)', padding: '4px 10px', borderRadius: '99px', fontSize: '0.75rem', fontWeight: 800, color: 'var(--green)' }}>
                <ShieldCheck size={13} /> Reserve 70%
              </div>
            </div>
          </div>

        </div>

        {/* BLOCK 4: VIBE CLUB ECONOMY */}
        <div className="sec-head" style={{ marginBottom: '40px', marginTop: '60px' }}>
          <h2>Vibe Club <span className="bl">Economy</span>.</h2>
          <p className="sec-sub">Official $VIBE NFT collection fully integrated into B20 economy.</p>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(min(100%, 400px), 1fr))', gap: '24px', marginBottom: '60px' }}>
          
          {/* Left Side: Vibe Club Breakdown */}
          <div className="tok-card" style={{ display: 'flex', flexDirection: 'column', justifyContent: 'space-between' }}>
            <div>
              <h3>Vibe Club Breakdown</h3>

              <div className="who">
                
                {/* 1. Deflationary Mint Burn */}
                <div className="who-r">
                  <div className="who-ico" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    <Flame color="#ef4444" size={20} />
                  </div>
                  <div className="who-t">
                    Deflationary Mint Burn
                    <span>Every mint triggers an instant burn, reducing total $VIBE supply</span>
                  </div>
                </div>

                {/* 2. NFTs Utility */}
                <div className="who-r">
                  <div className="who-ico" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    <Crown color="var(--green)" size={20} />
                  </div>
                  <div className="who-t">
                    NFTs Utility
                    <span>Holders receive regular royalty payouts distributed every 10 days</span>
                  </div>
                </div>

                {/* 3. Mint Process */}
                <div className="who-r">
                  <div className="who-ico" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    <Coins color="#7c3aed" size={20} />
                  </div>
                  <div className="who-t">
                    Mint Process
                    <span>Minting is available with both ETH and native $VIBE tokens</span>
                  </div>
                </div>

                {/* 4. Royalties Pool */}
                <div className="who-r">
                  <div className="who-ico" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    <Coins color="var(--accent)" size={20} />
                  </div>
                  <div className="who-t">
                    Royalties Pool
                    <span>15% of the Community Pool, refilled every 10 days for each royalty payout</span>
                  </div>
                </div>

                {/* 5. Equal Holder Rewards */}
                <div className="who-r">
                  <div className="who-ico" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    <Users color="var(--blue)" size={20} />
                  </div>
                  <div className="who-t">
                    Equal Holder Rewards
                    <span>All holders receive equal royalty payouts</span>
                  </div>
                </div>

                {/* 6. Action Button: Join Vibe Club */}
                <a href="https://vibeverse.dog/vibeclub" target="_blank" rel="noreferrer" className="who-r" style={{ textDecoration: 'none', cursor: 'pointer', background: 'var(--blue)' }}>
                  <div className="who-ico" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    <Crown color="var(--text)" size={20} />
                  </div>
                  <div className="who-t" style={{ color: 'var(--text)' }}>
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
          <div className="tok-card" style={{ padding: '32px 24px', textAlign: 'center', display: 'flex', flexDirection: 'column', justifyContent: 'space-between', position: 'relative' }}>
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
                    <stop offset="100%" stopColor="var(--accent)" />
                  </linearGradient>

                  <filter id="nftRedGlow" x="-20%" y="-20%" width="140%" height="140%">
                    <feDropShadow dx="0" dy="4" stdDeviation="6" floodColor="#ef4444" floodOpacity="0.25" />
                  </filter>
                  <filter id="nftBlueGlow" x="-20%" y="-20%" width="140%" height="140%">
                    <feDropShadow dx="0" dy="4" stdDeviation="6" floodColor="var(--accent)" floodOpacity="0.25" />
                  </filter>
                </defs>

                <g transform="translate(210, 140)">
                  {/* Track Ring */}
                  <circle cx="0" cy="0" r="80" fill="none" stroke="var(--text-2)" strokeWidth="18" />

                  {/* 20% Reserved for Community (Spans 0 to 20 -> Offset -2.5, length 15) */}
                  <circle cx="0" cy="0" r="80" fill="none" stroke="url(#nftBlueGrad)" strokeWidth="18"
                          strokeLinecap="round" pathLength="100" strokeDasharray="15 100" strokeDashoffset="-2.5"
                          transform="rotate(-90)" filter="url(#nftBlueGlow)" style={{ transition: 'all 0.5s ease' }} />

                  {/* 80% Burn (Spans 20 to 100 -> Offset -22.5, length 75) */}
                  <circle cx="0" cy="0" r="80" fill="none" stroke="url(#nftBurnGrad)" strokeWidth="18"
                          strokeLinecap="round" pathLength="100" strokeDasharray="75 100" strokeDashoffset="-22.5"
                          transform="rotate(-90)" filter="url(#nftRedGlow)" style={{ transition: 'all 0.5s ease' }} />

                  {/* Left Callout (Burn 80% - Top Left at 85% of circle) */}
                  <circle cx="-65" cy="-47" r="4" fill="#ef4444" />
                  <polyline points="-65,-47 -95,-70 -125,-70" fill="none" stroke="#ef4444" strokeWidth="1.2" strokeDasharray="3 3" />
                  <text x="-130" y="-64" fill="#ef4444" fontSize="13" fontWeight="800" textAnchor="end">Burn 80%</text>

                  {/* Right Callout (Community 20% - Top Right at 10% of circle) */}
                  <circle cx="47" cy="-65" r="4" fill="var(--accent)" />
                  <polyline points="47,-65 80,-80 120,-80" fill="none" stroke="var(--accent)" strokeWidth="1.2" strokeDasharray="3 3" />
                  <text x="125" y="-76" fill="var(--accent)" fontSize="13" fontWeight="800" textAnchor="start">Community 20%</text>

                  {/* Center Text */}
                  <text x="0" y="-3" fill="var(--ink)" fontSize="30" fontWeight="900" textAnchor="middle" letterSpacing="-0.5px">100%</text>
                  <text x="0" y="18" fill="var(--muted)" fontSize="10" fontWeight="800" textAnchor="middle" letterSpacing="1.5px">MINT REVENUE</text>
                </g>
              </svg>
            </div>

            {/* Bottom Legend Pills */}
            <div style={{ display: 'flex', justifyContent: 'center', gap: '10px', marginTop: '8px', flexWrap: 'wrap' }}>
              <div style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', background: 'rgba(239, 68, 68, 0.08)', border: '1px solid rgba(239, 68, 68, 0.2)', padding: '5px 12px', borderRadius: '99px', fontSize: '0.8rem', fontWeight: 800, color: '#ef4444' }}>
                <Flame size={14} /> Burn 80%
              </div>
              <div style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', background: 'color-mix(in srgb, var(--accent) 8%, transparent)', border: '1px solid color-mix(in srgb, var(--accent) 20%, transparent)', padding: '5px 12px', borderRadius: '99px', fontSize: '0.8rem', fontWeight: 800, color: 'var(--blue)' }}>
                <Users size={14} /> Community 20%
              </div>
            </div>
          </div>

        </div>

        {/* BLOCK 4: VESTING DETAILS */}
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
                <Link to="/claim" className="who-r" style={{textDecoration:'none', cursor:'pointer', background:'var(--blue)'}}>
                  <div className="who-ico" style={{display:'flex', alignItems:'center', justifyContent:'center'}}><Check color="var(--text)" size={20}/></div>
                  <div className="who-t" style={{color:'var(--text)'}}>Check your eligibility<span style={{color:'rgba(255,255,255,0.8)'}}>Qualify for the next distribution <ArrowRightCircle size={14} style={{verticalAlign:'middle', marginLeft:4}}/></span></div>
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

/* CHART */
function Chart() {
  const r=useRev();
  return (
    <section id="chart">
      <div className="wrap">
        <div className="chart-hd rv" ref={r}>
          <div>
            <h2>Live <span className="bl">Chart</span>.</h2>
          </div>
        </div>
        <div className="chart-box desk-chart-box">
          <iframe
            src={DEX_EMB}
            title="$VIBE chart"
            width="100%" height="600"
            frameBorder="0" allowFullScreen
          />
        </div>
        <div className="chart-links">
          <a href={DEX} target="_blank" rel="noreferrer" className="chart-big-btn">
            <img src="/dexscreener-logo.jpg" alt="Dexscreener" className="chart-big-logo" />
            <span>View on Dexscreener</span>
            <ArrowUpRight size={22} strokeWidth={2.5} />
          </a>
          <a href="https://www.geckoterminal.com/uk/base/pools/0xa1a4159e61ac9fc48aa9e9992c8d4870ef8a496d5749af1d219e8002f74835c5" target="_blank" rel="noreferrer" className="chart-big-btn">
            <img src="/geckoterminal-logo.jpg" alt="GeckoTerminal" className="chart-big-logo" />
            <span>View on GeckoTerminal</span>
            <ArrowUpRight size={22} strokeWidth={2.5} />
          </a>
        </div>
      </div>
    </section>
  );
}

/* SWAP / TRADE */
function Swap() {
  const r=useRev();
  return (
    <section id="trade" className="alt">
      <div className="wrap">
        <div className="swap-hd rv" ref={r}>
          <div>
            <h2>Trade <span className="bl">$VIBE</span>.</h2>
            <p className="sec-sub">Live on Base. Zero BS. Start vibing.</p>
          </div>
          <a href={O1} target="_blank" rel="noreferrer" className="btn-fill desk-chart-btn">Open on o1.exchange <ArrowUpRight size={20} strokeWidth={2.5} /></a>
        </div>
        
        <div className="swap-grid">
          <div className="swap-iframe-wrap">
            <iframe
              src="https://launch.o1.exchange/token/0xb200000000000000000000df24ecb8bf51100a01?chain=8453"
              title="$VIBE Trade"
              className="swap-iframe"
              frameBorder="0"
              allowFullScreen
            />
            <div className="swap-fallback">
              Widget not loading? <a href={O1} target="_blank" rel="noreferrer">Open directly on o1.exchange <ArrowUpRight size={14} strokeWidth={2.5} /></a>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}



/* ROADMAP */
function Roadmap() {
  const r=useRev();
  return (
    <section id="roadmap" className="alt" style={{ padding: '140px 0 100px 0' }}>
      <div className="wrap">
        <div className="sec-head rv" ref={r} style={{ textAlign: 'center' }}>
          <h2>The <span className="bl">Masterplan</span>.</h2>
          <p className="sec-sub" style={{ margin: '0 auto' }}>Every great journey starts with a single Base Dog paw print.</p>
        </div>
        
        <div className="roadmap-timeline">
          {/* Phase 1 */}
          <div className="roadmap-phase rv" ref={useRev()}>
            <div className="roadmap-phase-title">Phase 1: The Foundation</div>
            <div className="roadmap-items">
              <div className="roadmap-item done">
                <div className="r-title"><Rocket size={24} color="var(--blue)"/> Fair Launch via o1 <span className="badge-rm done"><Check size={14} strokeWidth={3}/> DONE</span></div>
                <div className="r-desc">A 100% fair launch on o1 Exchange. No presales, no team allocations, no insider buys. Public launch time: July 27, 14:00 UTC.</div>
              </div>
              <div className="roadmap-item done">
                <div className="r-title"><Star size={24} color="var(--blue)"/> Community Rewards <span className="badge-rm done"><Check size={14} strokeWidth={3}/> DONE</span></div>
                <div className="r-desc">Develop a transparent smart contract to distribute a vested 10% of the total supply (100M $VIBE) as monthly rewards for the community.</div>
              </div>
            </div>
          </div>
          
          {/* Phase 2 */}
          <div className="roadmap-phase rv" ref={useRev()}>
            <div className="roadmap-phase-title">Phase 2: Global Recognition</div>
            <div className="roadmap-items">
              <div className="roadmap-item done">
                <div className="r-title"><Laptop size={24} color="var(--blue)"/> Interactive Web Portal <span className="badge-rm done"><Check size={14} strokeWidth={3}/> DONE</span></div>
                <div className="r-desc">Launch of a comprehensive dApp featuring an eligibility checker for rewards, integrated seamless swaps, real-time holder analytics, tokenomics, and project details.</div>
              </div>
              <div className="roadmap-item done">
                <div className="r-title"><Globe size={24} color="var(--blue)"/> Enhance $VIBE Visibility <span className="badge-rm done"><Check size={14} strokeWidth={3}/> DONE</span></div>
                <div className="r-desc">Securing top-tier visibility and native support across major platforms including the X Token Card, Base App, OKX Wallet, and the broader Web3 ecosystem.</div>
              </div>
              <div className="roadmap-item in-progress">
                <div className="r-title"><TrendingUp size={24} color="var(--blue)"/> Premier Listings <span className="badge-rm prog"><Loader2 size={14} className="spin"/> IN PROGRESS</span></div>
                <div className="r-desc">Cementing our presence on industry-leading tracking platforms: Dexscreener, CoinGecko, CoinMarketCap, and others.</div>
                <div className="r-subnote done">
                  <span className="r-subnote-dot done"></span>
                  <span>DEX &amp; GeckoTerminal updated</span>
                  <span className="badge-rm done" style={{marginLeft:'auto',fontSize:'0.65rem',padding:'4px 8px'}}><Check size={11} strokeWidth={3}/> DONE</span>
                </div>
                <div className="r-subnote">
                  <span className="r-subnote-dot"></span>
                  <span>Working on CoinGecko &amp; CoinMarketCap updating</span>
                  <span className="badge-rm prog" style={{marginLeft:'auto',fontSize:'0.65rem',padding:'4px 8px'}}><Loader2 size={11} className="spin"/> IN PROGRESS</span>
                </div>
                <div className="r-subnote">
                  <span className="r-subnote-dot"></span>
                  <span>Fixing DEX LP displaying issue directly with both o1 &amp; DEX teams</span>
                  <span className="badge-rm prog" style={{marginLeft:'auto',fontSize:'0.65rem',padding:'4px 8px'}}><Loader2 size={11} className="spin"/> IN PROGRESS</span>
                </div>
              </div>
            </div>
          </div>
          
          {/* Phase 3 */}
          <div className="roadmap-phase rv" ref={useRev()}>
            <div className="roadmap-phase-title">Phase 3: $VIBE Ecosystem</div>
            <div className="roadmap-items">
              <div className="roadmap-item done">
                <div className="r-title"><Users size={24} color="var(--blue)"/> Vibe Club NFTs on B20 <span className="badge-rm done"><Check size={14} strokeWidth={3}/> DONE</span></div>
                <div className="r-desc">Introducing the first-ever NFT collection officially integrated into the o1 B20 ecosystem and directly tied to the $VIBE token economy.</div>
                <div className="r-subnote done">
                  <span className="r-subnote-dot done"></span>
                  <span>Vibe Club mint is live &rarr; <a href="https://vibeverse.dog/vibeclub" target="_blank" rel="noreferrer" style={{color:'var(--blue)',textDecoration:'underline',fontWeight:600}}>vibeverse.dog/vibeclub</a></span>
                  <span className="badge-rm done" style={{marginLeft:'auto',fontSize:'0.65rem',padding:'4px 8px'}}><Check size={11} strokeWidth={3}/> DONE</span>
                </div>
              </div>
              <div className="roadmap-item in-progress">
                <div className="r-title"><Rocket size={24} color="var(--blue)"/> Product Launch: Vibe Verse <span className="badge-rm prog"><Loader2 size={14} className="spin"/> IN PROGRESS</span></div>
                <div className="r-desc">Launching Vibe Verse — an interactive Web3 pixel-art gaming world where $VIBE serves as the native in-game utility currency.</div>
                <div className="r-subnote done">
                  <span className="r-subnote-dot done"></span>
                  <span>Introducing the Vibe Club NFT Collection</span>
                  <span className="badge-rm done" style={{marginLeft:'auto',fontSize:'0.65rem',padding:'4px 8px'}}><Check size={11} strokeWidth={3}/> DONE</span>
                </div>
                <div className="r-subnote">
                  <span className="r-subnote-dot"></span>
                  <span>Introducing Vibe Verse: B20 $VIBE Onchain World</span>
                  <span className="badge-rm prog" style={{marginLeft:'auto',fontSize:'0.65rem',padding:'4px 8px'}}><Loader2 size={11} className="spin"/> IN PROGRESS</span>
                </div>
              </div>
              <div className="roadmap-item">
                <div className="r-title"><Flame size={24} color="var(--blue)"/> Vibe Verse Ecosystem</div>
                <div className="r-desc">Expanding the interactive gaming and DeFi ecosystem built around $VIBE as the core infrastructural utility token.</div>
              </div>
            </div>
          </div>

          {/* Phase 4 */}
          <div className="roadmap-phase rv" ref={useRev()}>
            <div className="roadmap-phase-title">Phase 4: Global Awareness</div>
            <div className="roadmap-items">
              <div className="roadmap-item">
                <div className="r-title"><Globe size={24} color="var(--blue)"/> Top Tier Listings</div>
                <div className="r-desc">Expanding liquidity and accessibility globally through strategic listings on prominent Centralized and Decentralized Exchanges.</div>
              </div>
            </div>
          </div>

          <div className="roadmap-more rv" ref={useRev()}>
            More coming soon...
          </div>
        </div>
      </div>
    </section>
  );
}

/* FOOTER */
function Footer() {
  return (
    <footer>
      <div className="foot-inner">
        <div className="foot-brand">
          <img src="/new-logo-vibe.png" alt="Vibe" className="foot-logo" />
          <span>$VIBE</span> · The Base Dog
        </div>
        <div className="foot-mid">
          <p className="foot-copy">© 2026 $VIBE · Not financial advice · Just a very good boy 🐾</p>
          <a href="https://x.com/o1_exchange" target="_blank" rel="noreferrer" className="foot-pow">powered by <img src="/o1-logo.png" alt="o1" /> o1_exchange <ArrowUpRight size={12} strokeWidth={2.5} /></a>
        </div>
        <div className="foot-soc">
          <a href="https://x.com/vibeb20" target="_blank" rel="noreferrer" className="soc soc-img" title="$VIBE X">
            <img src="/x-logo.jpg" alt="X" />
          </a>
          <a href="https://x.com/mksvibe" target="_blank" rel="noreferrer" className="soc soc-img" title="Founder X">
            <img src="/x-logo.jpg" alt="Founder X" />
          </a>
          <a href="https://t.me/vibe_b20" target="_blank" rel="noreferrer" className="soc soc-img" title="Telegram">
            <img src="/tg-logo.png" alt="Telegram" />
          </a>
          <a href={O1} target="_blank" rel="noreferrer" className="soc soc-img" title="o1.exchange">
            <img src="/o1-logo.png" alt="o1" />
          </a>
          <a href={DEX} target="_blank" rel="noreferrer" className="soc soc-img" title="Dexscreener">
            <img src="/dexscreener-logo.jpg" alt="Dex" />
          </a>
          <a href="https://www.geckoterminal.com/uk/base/pools/0xa1a4159e61ac9fc48aa9e9992c8d4870ef8a496d5749af1d219e8002f74835c5" target="_blank" rel="noreferrer" className="soc soc-img" title="GeckoTerminal">
            <img src="/geckoterminal-logo.jpg" alt="GeckoTerminal" />
          </a>
        </div>
      </div>
    </footer>
  );
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

const STAKING_EPOCHS = [
  {
    epoch: 'Epoch 1',
    duration: '10 Days',
    poolAmount: '2,200,000',
    startTime: '21 Aug, 15:00 UTC',
    endTime: '31 Aug, 15:00 UTC',
    startDateObj: new Date('2026-08-21T15:00:00Z'),
    endDateObj: new Date('2026-08-31T15:00:00Z'),
    link: O1_STAKING_VAULT_EPOCH_1
  },
  {
    epoch: 'Epoch 2',
    duration: '10 Days',
    poolAmount: '2,200,000',
    startTime: '31 Aug, 16:00 UTC',
    endTime: '10 Sep, 16:00 UTC',
    startDateObj: new Date('2026-08-31T16:00:00Z'),
    endDateObj: new Date('2026-09-10T16:00:00Z'),
    link: O1_STAKING_VAULT_EPOCH_2
  },
  {
    epoch: 'Epoch 3',
    duration: '10 Days',
    poolAmount: '2,200,000',
    startTime: '10 Sep, 15:00 UTC',
    endTime: '20 Sep, 15:00 UTC',
    startDateObj: new Date('2026-09-10T15:00:00Z'),
    endDateObj: new Date('2026-09-20T15:00:00Z'),
    link: O1_STAKING_VAULT_EPOCH_3
  },
  {
    epoch: 'Epoch 4',
    duration: '10 Days',
    poolAmount: '1,800,000',
    startTime: '20 Sep, 15:00 UTC',
    endTime: '30 Sep, 15:00 UTC',
    startDateObj: new Date('2026-09-20T15:00:00Z'),
    endDateObj: new Date('2026-09-30T15:00:00Z'),
    link: O1_STAKING_VAULT_EPOCH_4
  },
  {
    epoch: 'Epoch 5',
    duration: '10 Days',
    poolAmount: '1,100,000',
    startTime: '30 Sep, 15:00 UTC',
    endTime: '10 Oct, 15:00 UTC',
    startDateObj: new Date('2026-09-30T15:00:00Z'),
    endDateObj: new Date('2026-10-10T15:00:00Z'),
    link: O1_STAKING_VAULT_EPOCH_5
  },
  {
    epoch: 'Epoch 6',
    duration: '10 Days',
    poolAmount: '1,100,000',
    startTime: '10 Oct, 15:00 UTC',
    endTime: '20 Oct, 15:00 UTC',
    startDateObj: new Date('2026-10-10T15:00:00Z'),
    endDateObj: new Date('2026-10-20T15:00:00Z'),
    link: O1_STAKING_VAULT_EPOCH_6
  },
  {
    epoch: 'Epoch 7',
    duration: '10 Days',
    poolAmount: 'TBA',
    startTime: '20 Oct, 15:00 UTC',
    endTime: '30 Oct, 15:00 UTC',
    startDateObj: new Date('2026-10-20T15:00:00Z'),
    endDateObj: new Date('2026-10-30T15:00:00Z'),
    link: O1_STAKING_VAULT
  },
  {
    epoch: 'Epoch 8',
    duration: '10 Days',
    poolAmount: 'TBA',
    startTime: '30 Oct, 15:00 UTC',
    endTime: '09 Nov, 15:00 UTC',
    startDateObj: new Date('2026-10-30T15:00:00Z'),
    endDateObj: new Date('2026-11-09T15:00:00Z'),
    link: O1_STAKING_VAULT
  },
  {
    epoch: 'Epoch 9',
    duration: '10 Days',
    poolAmount: 'TBA',
    startTime: '09 Nov, 15:00 UTC',
    endTime: '19 Nov, 15:00 UTC',
    startDateObj: new Date('2026-11-09T15:00:00Z'),
    endDateObj: new Date('2026-11-19T15:00:00Z'),
    link: O1_STAKING_VAULT
  },
  {
    epoch: 'Epoch 10',
    duration: '10 Days',
    poolAmount: 'TBA',
    startTime: '19 Nov, 15:00 UTC',
    endTime: '29 Nov, 15:00 UTC',
    startDateObj: new Date('2026-11-19T15:00:00Z'),
    endDateObj: new Date('2026-11-29T15:00:00Z'),
    link: O1_STAKING_VAULT
  }
];


const VIBECLUB_EPOCHS = [
  { epoch: 'Royalty 1', snapshotTime: '28 Aug, 00:00 UTC', claimDate: '28 Aug, 14:00 UTC', snapshotDateObj: new Date('2026-08-28T00:00:00Z'), dateObj: new Date('2026-08-28T14:00:00Z'), nextSnapshotDate: new Date('2026-09-07T00:00:00Z'), poolAmount: '2,500,000 $VIBE' },
  { epoch: 'Royalty 2', snapshotTime: '7 Sep, 00:00 UTC', claimDate: '7 Sep, 14:00 UTC', snapshotDateObj: new Date('2026-09-07T00:00:00Z'), dateObj: new Date('2026-09-07T14:00:00Z'), nextSnapshotDate: new Date('2026-09-17T00:00:00Z'), poolAmount: '1,900,000 $VIBE' },
  { epoch: 'Royalty 3', snapshotTime: '17 Sep, 00:00 UTC', claimDate: '17 Sep, 14:00 UTC', snapshotDateObj: new Date('2026-09-17T00:00:00Z'), dateObj: new Date('2026-09-17T14:00:00Z'), nextSnapshotDate: new Date('2026-09-27T00:00:00Z'), poolAmount: '2,000,000 $VIBE' },
  { epoch: 'Royalty 4', snapshotTime: '27 Sep, 00:00 UTC', claimDate: '27 Sep, 14:00 UTC', snapshotDateObj: new Date('2026-09-27T00:00:00Z'), dateObj: new Date('2026-09-27T14:00:00Z'), nextSnapshotDate: new Date('2026-10-07T00:00:00Z'), poolAmount: '1,100,000 $VIBE' },
  { epoch: 'Royalty 5', snapshotTime: '7 Oct, 00:00 UTC', claimDate: '7 Oct, 14:00 UTC', snapshotDateObj: new Date('2026-10-07T00:00:00Z'), dateObj: new Date('2026-10-07T14:00:00Z'), nextSnapshotDate: new Date('2026-10-17T00:00:00Z'), poolAmount: '800,000 $VIBE' },
  { epoch: 'Royalty 6', snapshotTime: '17 Oct, 00:00 UTC', claimDate: '17 Oct, 14:00 UTC', snapshotDateObj: new Date('2026-10-17T00:00:00Z'), dateObj: new Date('2026-10-17T14:00:00Z'), nextSnapshotDate: new Date('2026-10-27T00:00:00Z'), poolAmount: 'TBA' },
  { epoch: 'Royalty 7', snapshotTime: '27 Oct, 00:00 UTC', claimDate: '27 Oct, 14:00 UTC', snapshotDateObj: new Date('2026-10-27T00:00:00Z'), dateObj: new Date('2026-10-27T14:00:00Z'), nextSnapshotDate: new Date('2026-11-06T00:00:00Z'), poolAmount: 'TBA' },
  { epoch: 'Royalty 8', snapshotTime: '6 Nov, 00:00 UTC', claimDate: '6 Nov, 14:00 UTC', snapshotDateObj: new Date('2026-11-06T00:00:00Z'), dateObj: new Date('2026-11-06T14:00:00Z'), nextSnapshotDate: new Date('2026-11-16T00:00:00Z'), poolAmount: 'TBA' },
  { epoch: 'Royalty 9', snapshotTime: '16 Nov, 00:00 UTC', claimDate: '16 Nov, 14:00 UTC', snapshotDateObj: new Date('2026-11-16T00:00:00Z'), dateObj: new Date('2026-11-16T14:00:00Z'), nextSnapshotDate: new Date('2026-11-26T00:00:00Z'), poolAmount: 'TBA' },
  { epoch: 'Royalty 10', snapshotTime: '26 Nov, 00:00 UTC', claimDate: '26 Nov, 14:00 UTC', snapshotDateObj: new Date('2026-11-26T00:00:00Z'), dateObj: new Date('2026-11-26T14:00:00Z'), nextSnapshotDate: new Date('2026-12-06T00:00:00Z'), poolAmount: 'TBA' },
];

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

const GIVEAWAYS_DATA = [
  {
    id: 5,
    title: 'Meme & Art',
    winners: '6 Winners',
    prizePool: '$50 in ETH',
    status: 'ended',
    distribution: 'Completed',
    link: 'https://x.com/noelle_base/status/2094038840927203494'
  },
  {
    id: 4,
    title: '7 NFTs Vibe Club',
    image: '/rewards/vibe-club.jfif',
    winners: '7 Winners',
    prizePool: '7 NFTs',
    burnNote: '~3M $VIBE burn',
    status: 'ended',
    distribution: 'Completed',
    link: 'https://x.com/vibeB20/status/2092000984671129772'
  },
  {
    id: 3,
    title: '1000 Holders',
    image: '/event3.png',
    winners: '33 Winners',
    prizePool: 'TBA',
    status: 'ongoing',
    distribution: 'Not Started',
    link: 'https://x.com/vibeB20/status/2085778007960977418'
  },
  {
    id: 1,
    title: '$1M MC',
    image: '/event1.png',
    winners: '50 Winners',
    prizePool: 'TBA',
    status: 'ongoing',
    distribution: 'Not Started',
    link: 'https://x.com/mksvibe/status/2083993197861073025'
  },
  {
    id: 2,
    title: 'Base App Welcome Bonus',
    image: '/event2.png',
    winners: '350 Winners',
    prizePool: '1M $VIBE',
    status: 'ended',
    distribution: 'In Progress (92%)',
    link: 'https://x.com/mksvibe/status/2084601445844689003'
  }
];

const HOLDER_UNLOCKS = [
  { unlock: 'Unlock 1', snapshotTime: '26 Aug, 00:00 UTC', unlockDate: '26 Aug, 14:00 UTC', snapshotDateObj: new Date('2026-08-26T00:00:00Z'), dateObj: new Date('2026-08-26T14:00:00Z'), nextSnapshotDate: new Date('2026-09-25T00:00:00Z'), poolAmount: '10,000,000' },
  { unlock: 'Unlock 2', snapshotTime: '25 Sep, 00:00 UTC', unlockDate: '25 Sep, 14:00 UTC', snapshotDateObj: new Date('2026-09-25T00:00:00Z'), dateObj: new Date('2026-09-25T14:00:00Z'), nextSnapshotDate: new Date('2026-10-25T00:00:00Z'), poolAmount: '10,000,000' },
  { unlock: 'Unlock 3', snapshotTime: '25 Oct, 00:00 UTC', unlockDate: '25 Oct, 14:00 UTC', snapshotDateObj: new Date('2026-10-25T00:00:00Z'), dateObj: new Date('2026-10-25T14:00:00Z'), nextSnapshotDate: new Date('2026-11-24T00:00:00Z'), poolAmount: '10,000,000' },
  { unlock: 'Unlock 4', snapshotTime: '24 Nov, 00:00 UTC', unlockDate: '24 Nov, 14:00 UTC', snapshotDateObj: new Date('2026-11-24T00:00:00Z'), dateObj: new Date('2026-11-24T14:00:00Z'), nextSnapshotDate: new Date('2026-12-24T00:00:00Z'), poolAmount: '10,000,000' },
  { unlock: 'Unlock 5', snapshotTime: '24 Dec, 00:00 UTC', unlockDate: '24 Dec, 14:00 UTC', snapshotDateObj: new Date('2026-12-24T00:00:00Z'), dateObj: new Date('2026-12-24T14:00:00Z'), nextSnapshotDate: new Date('2027-01-23T00:00:00Z'), poolAmount: '10,000,000' },
  { unlock: 'Unlock 6', snapshotTime: '23 Jan, 00:00 UTC', unlockDate: '23 Jan, 14:00 UTC', snapshotDateObj: new Date('2027-01-23T00:00:00Z'), dateObj: new Date('2027-01-23T14:00:00Z'), nextSnapshotDate: new Date('2027-02-22T00:00:00Z'), poolAmount: '10,000,000' },
  { unlock: 'Unlock 7', snapshotTime: '22 Feb, 00:00 UTC', unlockDate: '22 Feb, 14:00 UTC', snapshotDateObj: new Date('2027-02-22T00:00:00Z'), dateObj: new Date('2027-02-22T14:00:00Z'), nextSnapshotDate: new Date('2027-03-24T00:00:00Z'), poolAmount: '10,000,000' },
  { unlock: 'Unlock 8', snapshotTime: '24 Mar, 00:00 UTC', unlockDate: '24 Mar, 14:00 UTC', snapshotDateObj: new Date('2027-03-24T00:00:00Z'), dateObj: new Date('2027-03-24T14:00:00Z'), nextSnapshotDate: new Date('2027-04-23T00:00:00Z'), poolAmount: '10,000,000' },
  { unlock: 'Unlock 9', snapshotTime: '23 Apr, 00:00 UTC', unlockDate: '23 Apr, 14:00 UTC', snapshotDateObj: new Date('2027-04-23T00:00:00Z'), dateObj: new Date('2027-04-23T14:00:00Z'), nextSnapshotDate: new Date('2027-05-23T00:00:00Z'), poolAmount: '10,000,000' },
  { unlock: 'Unlock 10', snapshotTime: '23 May, 00:00 UTC', unlockDate: '23 May, 14:00 UTC', snapshotDateObj: new Date('2027-05-23T00:00:00Z'), dateObj: new Date('2027-05-23T14:00:00Z'), nextSnapshotDate: new Date('2027-06-23T00:00:00Z'), poolAmount: '10,000,000' },
];

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
          color: 'var(--text)',
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
        background: 'color-mix(in srgb, var(--green) 12%, transparent)',
        border: '1.5px solid var(--green)',
        color: 'var(--green)',
        cursor: 'default',
        whiteSpace: 'nowrap',
        gap: '6px',
        fontVariantNumeric: 'tabular-nums',
        }}
    >
      <Clock size={14} color="var(--green)" /> Claim in {timeLeft}
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
                    background: 'var(--surface-2)',
                    borderRadius: '24px',
                    border: '2px solid color-mix(in srgb, var(--accent) 18%, transparent)',
                    overflow: 'hidden',
                    cursor: 'pointer',
                    
                    transition: 'all 0.25s cubic-bezier(0.4, 0, 0.2, 1)',
                    display: 'flex',
                    flexDirection: 'column'
                  }}
                  onMouseEnter={e => {
                    e.currentTarget.style.transform = 'translateY(-6px)';
                    e.currentTarget.style.borderColor = 'var(--blue)';
                    e.currentTarget.style.boxShadow = '0 16px 36px -4px color-mix(in srgb, var(--accent) 25%, transparent)';
                  }}
                  onMouseLeave={e => {
                    e.currentTarget.style.transform = 'none';
                    e.currentTarget.style.borderColor = 'color-mix(in srgb, var(--accent) 18%, transparent)';
                    e.currentTarget.style.boxShadow = '0 8px 30px color-mix(in srgb, var(--accent) 8%, transparent)';
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
                            color: b.type === 'active' ? '#22c55e' : b.type === 'coming-soon' ? '#f59e0b' : 'var(--text-3)',
                            border: b.type === 'active' ? '1px solid rgba(34, 197, 94, 0.4)' : b.type === 'coming-soon' ? '1px solid rgba(245, 158, 11, 0.4)' : '1px solid rgba(148, 163, 184, 0.25)',
                            
                            padding: '3px 8px',
                            borderRadius: '99px',
                            fontSize: '0.66rem',
                            fontWeight: 800,
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: '5px',
                            
                            letterSpacing: '0.03em',
                            }}
                        >
                          {b.type === 'active' && (
                            <span
                              style={{
                                width: '5px',
                                height: '5px',
                                borderRadius: '50%',
                                background: '#22c55e',
                                
                                display: 'inline-block'
                              }}
                            />
                          )}
                          {b.type === 'coming-soon' && (
                            <Lock size={10} color="#f59e0b" strokeWidth={2.3} />
                          )}
                          {b.type === 'upcoming' && (
                            <Clock size={10} color="var(--text-3)" strokeWidth={2.3} />
                          )}
                          {b.label}
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Card Body: Left Title, Right Compact Explore Button */}
                  <div style={{ padding: isBaseAppMode ? '12px 14px' : '16px 20px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', background: isBaseAppMode ? 'color-mix(in srgb, var(--surface) 95%, transparent)' : 'var(--text)', gap: '12px', width: '100%', boxSizing: 'border-box' }}>
                    <h3 style={{ margin: 0, fontSize: isBaseAppMode ? '9px' : '1.18rem', fontWeight: 900, color: isBaseAppMode ? 'var(--text)' : 'var(--ink)', letterSpacing: isBaseAppMode ? '0.3px' : '-0.02em', whiteSpace: 'nowrap', fontFamily: isBaseAppMode ? 'var(--font-sans)' : 'inherit' }}>
                      {cat.label}
                    </h3>
                    <div
                      className="rewards-explore-badge"
                      style={{
                        background: isBaseAppMode ? 'transparent' : 'var(--blue)',
                        color: isBaseAppMode ? 'var(--accent)' : 'var(--text)',
                        border: isBaseAppMode ? '1.5px solid var(--accent)' : 'none',
                        
                        padding: isBaseAppMode ? '7px 10px' : '9px 18px',
                        fontSize: isBaseAppMode ? '7px' : '0.84rem',
                        fontFamily: isBaseAppMode ? 'var(--font-sans)' : 'inherit',
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
                      <span>Explore</span> <ArrowRight size={isBaseAppMode ? 11 : 14} color={isBaseAppMode ? 'var(--accent)' : 'var(--text)'} strokeWidth={2.5} />
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
                    iconBg: 'color-mix(in srgb, var(--accent) 8%, transparent)',
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
                    icon: <Flame size={18} color="var(--amber)" />,
                    iconBg: 'rgba(255, 85, 0, 0.08)',
                    renderAnswer: () => (
                      <span>
                        All unclaimed tokens within the claim period are <strong style={{ color: 'var(--amber)' }}>permanently burned</strong>.
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
                            borderTop: '1px solid color-mix(in srgb, var(--accent) 8%, transparent)'
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
                  background: isBaseAppMode ? 'color-mix(in srgb, var(--bg) 85%, transparent)' : 'var(--text)',
                  border: isBaseAppMode ? '1.5px solid color-mix(in srgb, var(--accent) 35%, transparent)' : '1.5px solid color-mix(in srgb, var(--accent) 25%, transparent)',
                  color: isBaseAppMode ? 'var(--accent)' : 'var(--blue)',
                  fontWeight: 800,
                  fontSize: isBaseAppMode ? '7.5px' : '0.88rem',
                  fontFamily: isBaseAppMode ? 'var(--font-sans)' : 'var(--font)',
                  padding: isBaseAppMode ? '8px 14px' : '10px 20px',
                  borderRadius: isBaseAppMode ? '10px' : '14px',
                  cursor: 'pointer',
                  
                  transition: 'all 0.15s'
                }}
              >
                <ArrowRight size={isBaseAppMode ? 12 : 16} style={{ transform: 'rotate(180deg)' }} /> Back to Rewards Hub
              </button>

              {!isBaseAppMode && (
                <div style={{ display: 'flex', gap: '6px', background: 'var(--text-2)', padding: '4px', borderRadius: '14px', border: '1px solid var(--text-2)', flexWrap: 'wrap' }}>
                  {categoryCards.map(c => (
                    <button
                      key={c.id}
                      onClick={() => setActiveTab(c.id)}
                      style={{
                        fontFamily: 'var(--font)',
                        background: activeTab === c.id ? 'var(--blue)' : 'transparent',
                        color: activeTab === c.id ? 'var(--text)' : 'var(--text-3)',
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
                  background: 'color-mix(in srgb, var(--text-2) 55%, transparent)',
                  border: '1px solid rgba(0, 160, 255, 0.25)',
                  borderRadius: '16px',
                  padding: '16px 18px',
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
                  background: 'color-mix(in srgb, var(--text-2) 55%, transparent)',
                  border: '1px solid rgba(0, 160, 255, 0.25)',
                  borderRadius: '16px',
                  padding: '16px 18px',
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
                  background: 'color-mix(in srgb, var(--text-2) 55%, transparent)',
                  border: '1px solid rgba(0, 160, 255, 0.25)',
                  borderRadius: '16px',
                  padding: '16px 18px',
                  }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '6px' }}>
                  <span style={{ fontSize: '0.72rem', fontWeight: 900, color: 'var(--green)', background: 'color-mix(in srgb, var(--green) 14%, transparent)', width: '22px', height: '22px', borderRadius: '6px', display: 'inline-flex', alignItems: 'center', justifyContent: 'center' }}>3</span>
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
                <span style={{ fontSize: '0.75rem', fontWeight: 800, color: 'var(--text-3)', background: 'var(--surface-2)', border: '1px solid var(--text-2)', padding: '2px 8px', borderRadius: '99px' }}>
                  {filteredStakingEpochs.length}
                </span>
              </div>

              {/* Status Filter for Staking Epochs (Aligned to Left) */}
              <div
                style={{
                  display: 'flex',
                  gap: isBaseAppMode ? '4px' : '4px',
                  background: isBaseAppMode ? 'color-mix(in srgb, var(--bg) 85%, transparent)' : 'var(--text)',
                  padding: '3px 4px',
                  borderRadius: '10px',
                  border: isBaseAppMode ? '1px solid color-mix(in srgb, var(--accent) 25%, transparent)' : '1px solid var(--text-2)',
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
                        fontFamily: isBaseAppMode ? 'var(--font-sans)' : 'var(--font)',
                        padding: isBaseAppMode ? '6px 8px' : '4px 10px',
                        borderRadius: '8px',
                        border: 'none',
                        background: isFActive ? (isBaseAppMode ? 'var(--accent)' : 'var(--blue)') : 'transparent',
                        color: isFActive ? 'var(--text)' : (isBaseAppMode ? 'var(--text-2)' : 'var(--text-3)'),
                        fontWeight: 800,
                        fontSize: isBaseAppMode ? '6.5px' : '0.72rem',
                        letterSpacing: '-0.01em',
                        whiteSpace: 'nowrap',
                        flexShrink: 0,
                        cursor: 'pointer',
                        transition: 'all 0.15s',
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
              <div style={{ padding: '36px 20px', textAlign: 'center', background: 'var(--surface-2)', borderRadius: '20px', border: '1px solid var(--text-2)', color: 'var(--text-3)', fontSize: '0.9rem' }}>
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
                          ? 'rgba(215, 246, 255, 0.85)'
                          : isCompleted
                          ? 'rgba(241, 245, 249, 0.9)'
                          : 'rgba(225, 248, 255, 0.55)',
                        border: isActive ? '2px solid var(--blue)' : isCompleted ? '1.5px solid var(--text-2)' : '1.5px solid rgba(0, 160, 255, 0.25)',
                        borderRadius: '22px',
                        padding: '18px 20px',
                        display: 'flex',
                        flexDirection: 'column',
                        justifyContent: 'space-between',
                        
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
                              
                              letterSpacing: '0.04em',
                              background: isActive ? '#ecfdf5' : isCompleted ? 'var(--text-2)' : 'rgba(255, 255, 255, 0.9)',
                              color: isActive ? 'var(--green)' : isCompleted ? 'var(--text-3)' : 'var(--text-3)',
                              border: isActive ? '1px solid #a7f3d0' : isCompleted ? '1px solid var(--text-2)' : '1px solid rgba(0, 160, 255, 0.25)',
                              display: 'inline-flex',
                              alignItems: 'center',
                              gap: '5px',
                              whiteSpace: 'nowrap',
                              flexShrink: 0,
                              }}
                          >
                            {isActive && <span style={{ width: '6px', height: '6px', borderRadius: '50%', background: 'var(--green)',  flexShrink: 0 }} />}
                            {isActive ? 'Active' : isCompleted ? 'Ended' : 'Upcoming'}
                          </span>
                        </div>

                        {/* Metric Box (Rewards Pool) */}
                        <div
                          style={{
                            background: 'var(--surface-2)',
                            borderRadius: '16px',
                            padding: '14px 16px',
                            border: '1px solid rgba(0, 160, 255, 0.22)',
                            
                            marginBottom: '14px'
                          }}
                        >
                          <div style={{ fontSize: isBaseAppMode ? '6.5px' : '0.66rem', color: 'var(--text-3)',  fontWeight: 800, letterSpacing: '0.05em', display: 'flex', alignItems: 'center', gap: '4px', whiteSpace: 'nowrap', marginBottom: '4px', fontFamily: isBaseAppMode ? 'var(--font-sans)' : 'inherit' }}>
                            <Coins size={12} color={isBaseAppMode ? 'var(--accent)' : 'var(--blue)'} /> Rewards Pool
                          </div>
                          <div style={{ fontSize: isBaseAppMode ? '10px' : '1.42rem', fontWeight: 900, color: isBaseAppMode ? 'var(--accent)' : isActive ? 'var(--ink)' : 'var(--text-3)', marginTop: '2px', letterSpacing: isBaseAppMode ? '0.2px' : '-0.02em', display: 'flex', alignItems: 'baseline', gap: '5px', whiteSpace: 'nowrap', fontFamily: isBaseAppMode ? 'var(--font-sans)' : 'inherit', }}>
                            {ep.poolAmount} {ep.poolAmount !== 'TBA' && <span style={{ fontSize: isBaseAppMode ? '7.5px' : '0.88rem', color: isBaseAppMode ? 'var(--accent)' : isActive ? 'var(--blue)' : 'var(--text-3)', fontWeight: 800, fontFamily: isBaseAppMode ? 'var(--font-sans)' : 'inherit' }}>$VIBE</span>}
                          </div>
                        </div>

                        {/* Schedule Key-Values with Icons */}
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', marginBottom: '16px' }}>
                          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: 'rgba(255, 255, 255, 0.65)', padding: '7px 11px', borderRadius: '10px', border: '1px solid rgba(0, 160, 255, 0.12)', gap: '8px' }}>
                            <span style={{ color: 'var(--text-3)', fontWeight: 700, fontSize: '0.74rem', whiteSpace: 'nowrap', display: 'inline-flex', alignItems: 'center', gap: '5px', flexShrink: 0 }}>
                              <Calendar size={12} color="#0284c7" /> Start Time
                            </span>
                            <strong style={{ color: isActive ? 'var(--ink)' : '#475569', fontWeight: 700, fontSize: '0.76rem', whiteSpace: 'nowrap', textAlign: 'right' }}>{ep.startTime}</strong>
                          </div>
                          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: 'rgba(255, 255, 255, 0.65)', padding: '7px 11px', borderRadius: '10px', border: '1px solid rgba(0, 160, 255, 0.12)', gap: '8px' }}>
                            <span style={{ color: 'var(--text-3)', fontWeight: 700, fontSize: '0.74rem', whiteSpace: 'nowrap', display: 'inline-flex', alignItems: 'center', gap: '5px', flexShrink: 0 }}>
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
                            color: 'var(--text)',
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
                            color: 'var(--text)',
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
                            color: 'var(--text-3)',
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
                  background: 'color-mix(in srgb, var(--text-2) 55%, transparent)',
                  border: '1px solid rgba(0, 160, 255, 0.25)',
                  borderRadius: '16px',
                  padding: '16px 18px',
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
                  background: 'color-mix(in srgb, var(--text-2) 55%, transparent)',
                  border: '1px solid rgba(0, 160, 255, 0.25)',
                  borderRadius: '16px',
                  padding: '16px 18px',
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
                  background: 'color-mix(in srgb, var(--text-2) 55%, transparent)',
                  border: '1px solid rgba(0, 160, 255, 0.25)',
                  borderRadius: '16px',
                  padding: '16px 18px',
                  }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '6px' }}>
                  <span style={{ fontSize: '0.72rem', fontWeight: 900, color: 'var(--green)', background: 'color-mix(in srgb, var(--green) 14%, transparent)', width: '22px', height: '22px', borderRadius: '6px', display: 'inline-flex', alignItems: 'center', justifyContent: 'center' }}>3</span>
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
                <span style={{ fontSize: '0.72rem', fontWeight: 800, background: 'var(--text-2)', color: '#475569', padding: '2px 8px', borderRadius: '99px', border: '1px solid var(--text-2)' }}>
                  {filteredVibeClubEpochs.length}
                </span>
              </div>

              {/* Status Filters */}
              <div
                style={{
                  display: 'flex',
                  gap: isBaseAppMode ? '4px' : '4px',
                  background: isBaseAppMode ? 'color-mix(in srgb, var(--bg) 85%, transparent)' : 'var(--text-2)',
                  padding: '3px 4px',
                  borderRadius: '10px',
                  border: isBaseAppMode ? '1px solid color-mix(in srgb, var(--accent) 25%, transparent)' : '1px solid var(--text-2)',
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
                        fontFamily: isBaseAppMode ? 'var(--font-sans)' : 'var(--font)',
                        background: isFActive ? (isBaseAppMode ? 'var(--accent)' : 'var(--blue)') : 'transparent',
                        color: isFActive ? 'var(--text)' : (isBaseAppMode ? 'var(--text-2)' : 'var(--text-3)'),
                        border: 'none',
                        padding: isBaseAppMode ? '6px 8px' : '4px 10px',
                        borderRadius: '8px',
                        fontSize: isBaseAppMode ? '6.5px' : '0.72rem',
                        fontWeight: 800,
                        whiteSpace: 'nowrap',
                        flexShrink: 0,
                        cursor: 'pointer',
                        transition: 'all 0.15s',
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
              <div style={{ padding: '36px 20px', textAlign: 'center', background: 'var(--surface-2)', borderRadius: '20px', border: '1px solid var(--text-2)', color: 'var(--text-3)', fontSize: '0.9rem' }}>
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
                          ? 'rgba(215, 246, 255, 0.85)'
                          : isCompleted
                          ? 'rgba(241, 245, 249, 0.9)'
                          : 'rgba(225, 248, 255, 0.55)',
                        border: isActive ? '2px solid var(--blue)' : isCompleted ? '1.5px solid var(--text-2)' : '1.5px solid rgba(0, 160, 255, 0.25)',
                        borderRadius: '22px',
                        padding: '18px 20px',
                        display: 'flex',
                        flexDirection: 'column',
                        justifyContent: 'space-between',
                        
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
                                border: isActive ? '2px solid var(--blue)' : isCompleted ? '1.5px solid var(--text-2)' : '1.5px solid rgba(0, 160, 255, 0.3)',
                                
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
                              
                              letterSpacing: '0.04em',
                              background: (isClaimLive || isActive) ? '#ecfdf5' : isCompleted ? 'var(--text-2)' : 'rgba(255, 255, 255, 0.9)',
                              color: (isClaimLive || isActive) ? 'var(--green)' : isCompleted ? 'var(--text-3)' : 'var(--text-3)',
                              border: (isClaimLive || isActive) ? '1px solid #a7f3d0' : isCompleted ? '1px solid var(--text-2)' : '1px solid rgba(0, 160, 255, 0.25)',
                              display: 'inline-flex',
                              alignItems: 'center',
                              gap: '5px',
                              whiteSpace: 'nowrap',
                              flexShrink: 0,
                              }}
                          >
                            {isClaimLive ? (
                              <>
                                <span style={{ width: '6px', height: '6px', borderRadius: '50%', background: 'var(--green)',  flexShrink: 0 }} />
                                <ActiveClaimCountdown targetDate={ep.nextSnapshotDate} />
                              </>
                            ) : isActive ? (
                              <>
                                <span style={{ width: '6px', height: '6px', borderRadius: '50%', background: 'var(--green)',  flexShrink: 0 }} />
                                Active
                              </>
                            ) : isCompleted ? (
                              'Ended'
                            ) : (
                              <>
                                <Lock size={11} color="var(--text-3)" style={{ flexShrink: 0 }} />
                                Locked
                              </>
                            )}
                          </span>
                        </div>

                        {/* Metric Box (Royalty Pool) */}
                        <div
                          style={{
                            background: 'var(--surface-2)',
                            borderRadius: '16px',
                            padding: '14px 16px',
                            border: '1px solid rgba(0, 160, 255, 0.22)',
                            
                            marginBottom: '14px'
                          }}
                        >
                          <div style={{ fontSize: isBaseAppMode ? '6.5px' : '0.66rem', color: 'var(--text-3)',  fontWeight: 800, letterSpacing: '0.05em', display: 'flex', alignItems: 'center', gap: '4px', whiteSpace: 'nowrap', marginBottom: '4px', fontFamily: isBaseAppMode ? 'var(--font-sans)' : 'inherit' }}>
                            <Coins size={12} color={isBaseAppMode ? 'var(--accent)' : 'var(--blue)'} /> Royalty Pool
                          </div>
                          <div style={{ fontSize: isBaseAppMode ? '10px' : '1.42rem', fontWeight: 900, color: isBaseAppMode ? 'var(--accent)' : isActive ? 'var(--ink)' : 'var(--text-3)', marginTop: '2px', letterSpacing: isBaseAppMode ? '0.2px' : '-0.02em', display: 'flex', alignItems: 'baseline', gap: '5px', whiteSpace: 'nowrap', fontFamily: isBaseAppMode ? 'var(--font-sans)' : 'inherit', }}>
                            {ep.poolAmount}
                          </div>
                        </div>

                        {/* Schedule Key-Values with Icons */}
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', marginBottom: '16px' }}>
                          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: 'rgba(255, 255, 255, 0.65)', padding: '7px 11px', borderRadius: '10px', border: '1px solid rgba(0, 160, 255, 0.12)', gap: '8px' }}>
                            <span style={{ color: 'var(--text-3)', fontWeight: 700, fontSize: '0.74rem', whiteSpace: 'nowrap', display: 'inline-flex', alignItems: 'center', gap: '5px', flexShrink: 0 }}>
                              <ShieldCheck size={12} color="#0284c7" /> Requirement
                            </span>
                            <strong style={{ color: isActive ? 'var(--ink)' : '#475569', fontWeight: 700, fontSize: '0.76rem', whiteSpace: 'nowrap', textAlign: 'right' }}>NFT Holder</strong>
                          </div>
                          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: 'rgba(255, 255, 255, 0.65)', padding: '7px 11px', borderRadius: '10px', border: '1px solid rgba(0, 160, 255, 0.12)', gap: '8px' }}>
                            <span style={{ color: 'var(--text-3)', fontWeight: 700, fontSize: '0.74rem', whiteSpace: 'nowrap', display: 'inline-flex', alignItems: 'center', gap: '5px', flexShrink: 0 }}>
                              <Clock size={12} color="#0284c7" /> Holder Snapshot
                            </span>
                            <strong style={{ color: isActive ? 'var(--ink)' : '#475569', fontWeight: 700, fontSize: '0.76rem', whiteSpace: 'nowrap', textAlign: 'right' }}>{ep.snapshotTime}</strong>
                          </div>
                          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: 'rgba(255, 255, 255, 0.65)', padding: '7px 11px', borderRadius: '10px', border: '1px solid rgba(0, 160, 255, 0.12)', gap: '8px' }}>
                            <span style={{ color: 'var(--text-3)', fontWeight: 700, fontSize: '0.74rem', whiteSpace: 'nowrap', display: 'inline-flex', alignItems: 'center', gap: '5px', flexShrink: 0 }}>
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
                            background: 'var(--text-2)',
                            color: 'var(--text-3)',
                            border: '1.5px solid var(--text-2)',
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
                              color: 'var(--text)',
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
                              color: 'var(--green)',
                              marginTop: '8px'
                            }}
                          >
                            <CheckCircle2 size={13} color="var(--green)" strokeWidth={2.5} />
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
                              color: 'var(--green)',
                              marginTop: '8px'
                            }}
                          >
                            <CheckCircle2 size={13} color="var(--green)" strokeWidth={2.5} />
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
                            color: 'var(--text-3)',
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
                  background: 'color-mix(in srgb, var(--text-2) 55%, transparent)',
                  border: '1px solid rgba(0, 160, 255, 0.25)',
                  borderRadius: '16px',
                  padding: '16px 18px',
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
                  background: 'color-mix(in srgb, var(--text-2) 55%, transparent)',
                  border: '1px solid rgba(0, 160, 255, 0.25)',
                  borderRadius: '16px',
                  padding: '16px 18px',
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
                  background: 'color-mix(in srgb, var(--text-2) 55%, transparent)',
                  border: '1px solid rgba(0, 160, 255, 0.25)',
                  borderRadius: '16px',
                  padding: '16px 18px',
                  }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '6px' }}>
                  <span style={{ fontSize: '0.72rem', fontWeight: 900, color: 'var(--green)', background: 'color-mix(in srgb, var(--green) 14%, transparent)', width: '22px', height: '22px', borderRadius: '6px', display: 'inline-flex', alignItems: 'center', justifyContent: 'center' }}>3</span>
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
                <span style={{ fontSize: '0.72rem', fontWeight: 800, background: 'var(--text-2)', color: '#475569', padding: '2px 8px', borderRadius: '99px', border: '1px solid var(--text-2)' }}>
                  {filteredHolderUnlocks.length}
                </span>
              </div>

              {/* Status Filters */}
              <div
                style={{
                  display: 'flex',
                  gap: isBaseAppMode ? '4px' : '4px',
                  background: isBaseAppMode ? 'color-mix(in srgb, var(--bg) 85%, transparent)' : 'var(--text-2)',
                  padding: '3px 4px',
                  borderRadius: '10px',
                  border: isBaseAppMode ? '1px solid color-mix(in srgb, var(--accent) 25%, transparent)' : '1px solid var(--text-2)',
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
                        fontFamily: isBaseAppMode ? 'var(--font-sans)' : 'var(--font)',
                        background: isFActive ? (isBaseAppMode ? 'var(--accent)' : 'var(--blue)') : 'transparent',
                        color: isFActive ? 'var(--text)' : (isBaseAppMode ? 'var(--text-2)' : 'var(--text-3)'),
                        border: 'none',
                        padding: isBaseAppMode ? '6px 8px' : '4px 10px',
                        borderRadius: '8px',
                        fontSize: isBaseAppMode ? '6.5px' : '0.72rem',
                        fontWeight: 800,
                        whiteSpace: 'nowrap',
                        flexShrink: 0,
                        cursor: 'pointer',
                        transition: 'all 0.15s',
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
              <div style={{ padding: '36px 20px', textAlign: 'center', background: 'var(--surface-2)', borderRadius: '20px', border: '1px solid var(--text-2)', color: 'var(--text-3)', fontSize: '0.9rem' }}>
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
                          ? 'rgba(215, 246, 255, 0.85)'
                          : isCompleted
                          ? 'rgba(241, 245, 249, 0.9)'
                          : 'rgba(225, 248, 255, 0.55)',
                        border: isActive ? '2px solid var(--blue)' : isCompleted ? '1.5px solid var(--text-2)' : '1.5px solid rgba(0, 160, 255, 0.25)',
                        borderRadius: '22px',
                        padding: '18px 20px',
                        display: 'flex',
                        flexDirection: 'column',
                        justifyContent: 'space-between',
                        
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
                                border: isActive ? '2px solid var(--blue)' : isCompleted ? '1.5px solid var(--text-2)' : '1.5px solid rgba(0, 160, 255, 0.3)',
                                
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
                              
                              letterSpacing: '0.04em',
                              background: (isClaimLive || isActive) ? '#ecfdf5' : isCompleted ? 'var(--text-2)' : 'rgba(255, 255, 255, 0.9)',
                              color: (isClaimLive || isActive) ? 'var(--green)' : isCompleted ? 'var(--text-3)' : 'var(--text-3)',
                              border: (isClaimLive || isActive) ? '1px solid #a7f3d0' : isCompleted ? '1px solid var(--text-2)' : '1px solid rgba(0, 160, 255, 0.25)',
                              display: 'inline-flex',
                              alignItems: 'center',
                              gap: '5px',
                              whiteSpace: 'nowrap',
                              flexShrink: 0,
                              }}
                          >
                            {isClaimLive ? (
                              <>
                                <span style={{ width: '6px', height: '6px', borderRadius: '50%', background: 'var(--green)',  flexShrink: 0 }} />
                                <ActiveClaimCountdown targetDate={u.nextSnapshotDate} />
                              </>
                            ) : isActive ? (
                              <>
                                <span style={{ width: '6px', height: '6px', borderRadius: '50%', background: 'var(--green)',  flexShrink: 0 }} />
                                Active
                              </>
                            ) : isCompleted ? (
                              'Ended'
                            ) : (
                              <>
                                <Lock size={11} color="var(--text-3)" style={{ flexShrink: 0 }} />
                                Locked
                              </>
                            )}
                          </span>
                        </div>

                        {/* Metric Box (Rewards Pool) */}
                        <div
                          style={{
                            background: 'var(--surface-2)',
                            borderRadius: '16px',
                            padding: '14px 16px',
                            border: '1px solid rgba(0, 160, 255, 0.22)',
                            
                            marginBottom: '14px'
                          }}
                        >
                          <div style={{ fontSize: isBaseAppMode ? '6.5px' : '0.66rem', color: 'var(--text-3)',  fontWeight: 800, letterSpacing: '0.05em', display: 'flex', alignItems: 'center', gap: '4px', whiteSpace: 'nowrap', marginBottom: '4px', fontFamily: isBaseAppMode ? 'var(--font-sans)' : 'inherit' }}>
                            <Coins size={12} color={isBaseAppMode ? 'var(--accent)' : 'var(--blue)'} /> Rewards Pool
                          </div>
                          <div style={{ fontSize: isBaseAppMode ? '10px' : '1.42rem', fontWeight: 900, color: isBaseAppMode ? 'var(--accent)' : isActive ? 'var(--ink)' : 'var(--text-3)', marginTop: '2px', letterSpacing: isBaseAppMode ? '0.2px' : '-0.02em', display: 'flex', alignItems: 'baseline', gap: '5px', whiteSpace: 'nowrap', fontFamily: isBaseAppMode ? 'var(--font-sans)' : 'inherit', }}>
                            {u.poolAmount} <span style={{ fontSize: isBaseAppMode ? '7.5px' : '0.88rem', color: isBaseAppMode ? 'var(--accent)' : isActive ? 'var(--blue)' : 'var(--text-3)', fontWeight: 800, fontFamily: isBaseAppMode ? 'var(--font-sans)' : 'inherit' }}>$VIBE</span>
                          </div>
                        </div>

                        {/* Schedule Key-Values with Icons */}
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', marginBottom: '16px' }}>
                          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: 'rgba(255, 255, 255, 0.65)', padding: '7px 11px', borderRadius: '10px', border: '1px solid rgba(0, 160, 255, 0.12)', gap: '8px' }}>
                            <span style={{ color: 'var(--text-3)', fontWeight: 700, fontSize: '0.74rem', whiteSpace: 'nowrap', display: 'inline-flex', alignItems: 'center', gap: '5px', flexShrink: 0 }}>
                              <ShieldCheck size={12} color="#0284c7" /> Requirement
                            </span>
                            <strong style={{ color: isActive ? 'var(--ink)' : '#475569', fontWeight: 700, fontSize: '0.76rem', whiteSpace: 'nowrap', textAlign: 'right' }}>5M+ $VIBE Balance</strong>
                          </div>
                          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: 'rgba(255, 255, 255, 0.65)', padding: '7px 11px', borderRadius: '10px', border: '1px solid rgba(0, 160, 255, 0.12)', gap: '8px' }}>
                            <span style={{ color: 'var(--text-3)', fontWeight: 700, fontSize: '0.74rem', whiteSpace: 'nowrap', display: 'inline-flex', alignItems: 'center', gap: '5px', flexShrink: 0 }}>
                              <Clock size={12} color="#0284c7" /> Balance Snapshot
                            </span>
                            <strong style={{ color: isActive ? 'var(--ink)' : '#475569', fontWeight: 700, fontSize: '0.76rem', whiteSpace: 'nowrap', textAlign: 'right' }}>{u.snapshotTime}</strong>
                          </div>
                          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: 'rgba(255, 255, 255, 0.65)', padding: '7px 11px', borderRadius: '10px', border: '1px solid rgba(0, 160, 255, 0.12)', gap: '8px' }}>
                            <span style={{ color: 'var(--text-3)', fontWeight: 700, fontSize: '0.74rem', whiteSpace: 'nowrap', display: 'inline-flex', alignItems: 'center', gap: '5px', flexShrink: 0 }}>
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
                            background: 'var(--text-2)',
                            color: 'var(--text-3)',
                            border: '1.5px solid var(--text-2)',
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
                              color: 'var(--text)',
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
                              color: 'var(--green)',
                              marginTop: '8px'
                            }}
                          >
                            <CheckCircle2 size={13} color="var(--green)" strokeWidth={2.5} />
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
                              color: 'var(--green)',
                              marginTop: '8px'
                            }}
                          >
                            <CheckCircle2 size={13} color="var(--green)" strokeWidth={2.5} />
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
                            color: 'var(--text-3)',
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
                <span style={{ fontSize: '0.72rem', fontWeight: 800, background: 'var(--text-2)', color: '#475569', padding: '2px 8px', borderRadius: '99px', border: '1px solid var(--text-2)' }}>
                  {filteredGiveaways.length}
                </span>
              </div>

              {/* Status Filters */}
              <div
                style={{
                  display: 'flex',
                  gap: isBaseAppMode ? '4px' : '4px',
                  background: isBaseAppMode ? 'color-mix(in srgb, var(--bg) 85%, transparent)' : 'var(--text-2)',
                  padding: '3px 4px',
                  borderRadius: '10px',
                  border: isBaseAppMode ? '1px solid color-mix(in srgb, var(--accent) 25%, transparent)' : '1px solid var(--text-2)',
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
                        fontFamily: isBaseAppMode ? 'var(--font-sans)' : 'var(--font)',
                        background: isFActive ? (isBaseAppMode ? 'var(--accent)' : 'var(--blue)') : 'transparent',
                        color: isFActive ? 'var(--text)' : (isBaseAppMode ? 'var(--text-2)' : 'var(--text-3)'),
                        border: 'none',
                        padding: isBaseAppMode ? '6px 8px' : '4px 10px',
                        borderRadius: '8px',
                        fontSize: isBaseAppMode ? '6.5px' : '0.72rem',
                        fontWeight: 800,
                        whiteSpace: 'nowrap',
                        flexShrink: 0,
                        cursor: 'pointer',
                        transition: 'all 0.15s',
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
              <div style={{ padding: '36px 20px', textAlign: 'center', background: 'var(--surface-2)', borderRadius: '20px', border: '1px solid var(--text-2)', color: 'var(--text-3)', fontSize: '0.9rem' }}>
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
                          ? 'rgba(215, 246, 255, 0.85)'
                          : 'rgba(225, 248, 255, 0.55)',
                        border: isOngoing ? '2px solid var(--blue)' : '1.5px solid rgba(0, 160, 255, 0.25)',
                        borderRadius: '22px',
                        padding: '18px 20px',
                        display: 'flex',
                        flexDirection: 'column',
                        justifyContent: 'space-between',
                        
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
                              
                              letterSpacing: '0.04em',
                              background: isOngoing ? '#ecfdf5' : 'rgba(255, 255, 255, 0.9)',
                              color: isOngoing ? 'var(--green)' : 'var(--text-3)',
                              border: isOngoing ? '1px solid #a7f3d0' : '1px solid rgba(0, 160, 255, 0.25)',
                              display: 'inline-flex',
                              alignItems: 'center',
                              gap: '5px',
                              whiteSpace: 'nowrap',
                              flexShrink: 0,
                              }}
                          >
                            {isOngoing ? (
                              <>
                                <span style={{ width: '6px', height: '6px', borderRadius: '50%', background: 'var(--green)',  flexShrink: 0 }} />
                                Ongoing
                              </>
                            ) : (
                              <>
                                <Clock size={11} color="var(--text-3)" style={{ flexShrink: 0 }} />
                                Ended
                              </>
                            )}
                          </span>
                        </div>

                        {/* Metric Box (Prize Pool) */}
                        <div
                          style={{
                            background: 'var(--surface-2)',
                            borderRadius: '16px',
                            padding: '14px 16px',
                            border: '1px solid rgba(0, 160, 255, 0.22)',
                            
                            marginBottom: '14px'
                          }}
                        >
                          <div style={{ fontSize: isBaseAppMode ? '6.5px' : '0.66rem', color: 'var(--text-3)',  fontWeight: 800, letterSpacing: '0.05em', display: 'flex', alignItems: 'center', gap: '4px', whiteSpace: 'nowrap', marginBottom: '4px', fontFamily: isBaseAppMode ? 'var(--font-sans)' : 'inherit' }}>
                            <Coins size={12} color={isBaseAppMode ? 'var(--accent)' : 'var(--blue)'} /> Prize Pool
                          </div>
                          <div style={{ fontSize: isBaseAppMode ? '10px' : '1.38rem', fontWeight: 900, color: isBaseAppMode ? 'var(--accent)' : isOngoing ? 'var(--ink)' : 'var(--text-3)', marginTop: '2px', letterSpacing: isBaseAppMode ? '0.2px' : '-0.02em', display: 'flex', alignItems: 'center', flexWrap: 'wrap', gap: '6px', fontFamily: isBaseAppMode ? 'var(--font-sans)' : 'inherit', }}>
                            <span>{ev.prizePool}</span>
                            {ev.burnNote && (
                              <span style={{ fontSize: isBaseAppMode ? '6.5px' : '0.72rem', color: '#ef4444', fontWeight: 800, background: 'rgba(239, 68, 68, 0.08)', border: '1px solid rgba(239, 68, 68, 0.2)', padding: '2px 7px', borderRadius: '99px', display: 'inline-flex', alignItems: 'center', gap: '3px', fontFamily: isBaseAppMode ? 'var(--font-sans)' : 'inherit' }}>
                                🔥 {ev.burnNote}
                              </span>
                            )}
                          </div>
                        </div>

                        {/* Key-Values with Icons */}
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', marginBottom: '16px' }}>
                          {ev.distribution && (
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: 'rgba(255, 255, 255, 0.65)', padding: '7px 11px', borderRadius: '10px', border: '1px solid rgba(0, 160, 255, 0.12)', gap: '8px' }}>
                              <span style={{ color: 'var(--text-3)', fontWeight: 700, fontSize: '0.74rem', whiteSpace: 'nowrap', display: 'inline-flex', alignItems: 'center', gap: '5px', flexShrink: 0 }}>
                                <Gift size={12} color="#0284c7" /> Distribution
                              </span>
                              <strong style={{ color: isOngoing ? 'var(--ink)' : '#475569', fontWeight: 700, fontSize: '0.76rem', whiteSpace: 'nowrap', textAlign: 'right' }}>{ev.distribution}</strong>
                            </div>
                          )}
                          {ev.winners && (
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: 'rgba(255, 255, 255, 0.65)', padding: '7px 11px', borderRadius: '10px', border: '1px solid rgba(0, 160, 255, 0.12)', gap: '8px' }}>
                              <span style={{ color: 'var(--text-3)', fontWeight: 700, fontSize: '0.74rem', whiteSpace: 'nowrap', display: 'inline-flex', alignItems: 'center', gap: '5px', flexShrink: 0 }}>
                                <Users size={12} color="#0284c7" /> Winners
                              </span>
                              <strong style={{ color: isOngoing ? 'var(--ink)' : '#475569', fontWeight: 700, fontSize: '0.76rem', whiteSpace: 'nowrap', textAlign: 'right' }}>{ev.winners}</strong>
                            </div>
                          )}
                          {ev.deadlineDate && (
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: 'rgba(255, 255, 255, 0.65)', padding: '7px 11px', borderRadius: '10px', border: '1px solid rgba(0, 160, 255, 0.12)', gap: '8px' }}>
                              <span style={{ color: 'var(--text-3)', fontWeight: 700, fontSize: '0.74rem', whiteSpace: 'nowrap', display: 'inline-flex', alignItems: 'center', gap: '5px', flexShrink: 0 }}>
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
                          background: isOngoing ? 'var(--blue)' : 'var(--text)',
                          color: isOngoing ? 'var(--text)' : 'var(--ink)',
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
                          
                          transition: 'all 0.15s'
                        }}
                      >
                        <span>{isOngoing ? 'Participate' : 'View Event'}</span>
                        <ArrowUpRight size={15} strokeWidth={2.5} color={isOngoing ? 'var(--text)' : 'var(--blue)'} />
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

function LandingPage() {
  return (
    <>
      <Hero/>
      {/* <div className="divr"/>
      <About/> */}
      <div className="divr"/>
      <Tokenomics/>
      {/* <div className="divr"/>
      <Roadmap/> */}
      <div className="divr"/>
      <Chart/>
      <div className="divr"/>
      <Swap/>
    </>
  );
}

class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null };
  }
  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }
  componentDidCatch(error, errorInfo) {
    console.error("ErrorBoundary caught:", error, errorInfo);
  }
  render() {
    if (this.state.hasError) {
      return (
        <div style={{ padding: '140px 20px 100px 20px', textAlign: 'center', maxWidth: '640px', margin: '0 auto' }}>
          <div style={{ background: 'var(--surface-2)', border: '1.5px solid #fecaca', borderRadius: '24px', padding: '32px 24px', }}>
            <h3 style={{ color: '#ef4444', fontWeight: 900, fontSize: '1.35rem', marginBottom: '10px' }}>Something went wrong</h3>
            <p style={{ color: 'var(--muted)', fontSize: '0.88rem', marginBottom: '16px' }}>An error occurred while loading this view.</p>
            <pre style={{ background: '#fef2f2', padding: '14px', borderRadius: '12px', textAlign: 'left', overflow: 'auto', border: '1px solid #fecaca', color: '#991b1b', fontSize: '0.8rem', whiteSpace: 'pre-wrap', wordBreak: 'break-word', maxHeight: '180px' }}>
              {this.state.error?.toString() || 'Unknown error'}
            </pre>
            <button
              onClick={() => window.location.reload()}
              className="btn-fill"
              style={{ marginTop: '20px', padding: '10px 24px', background: 'var(--blue)', color: 'var(--text)', border: 'none', borderRadius: '12px', fontWeight: 800, cursor: 'pointer', display: 'inline-flex', alignItems: 'center', gap: '6px' }}
            >
              <RotateCcw size={16} /> Reload Page
            </button>
          </div>
        </div>
      );
    }
    return this.props.children;
  }
}

function StandaloneLayout({ children }) {
  return (
    <div className="standalone-page">
      <Nav />
      <ErrorBoundary>
        {children}
      </ErrorBoundary>
      <Footer />
    </div>
  );
}

function VibeClubRedirect() {
  useEffect(() => {
    window.location.href = 'https://vibeverse.dog/vibeclub';
  }, []);
  return (
    <div style={{ minHeight: '80vh', display: 'flex', alignItems: 'center', justifyContent: 'center', flexDirection: 'column', gap: '16px' }}>
      <Loader2 size={32} className="spin" color="var(--blue)" />
      <p style={{ fontWeight: 600, color: 'var(--muted)' }}>Redirecting to Vibe Club Mint on VibeVerse...</p>
    </div>
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
          accentColor: 'var(--accent)',
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
