import React, { useState, useCallback } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import {
  Copy,
  Check,
  ArrowRight,
  ArrowUpRight,
  Gift,
  Coins,
  Crown,
  ArrowLeftRight
} from 'lucide-react';

const CA = '0xb200000000000000000000df24ecb8bf51100a01';
const O1 = 'https://launch.o1.exchange/token/0xb200000000000000000000df24ecb8bf51100a01?chain=8453';
const DEX = 'https://dexscreener.com/base/0xa1a4159e61ac9fc48aa9e9992c8d4870ef8a496d5749af1d219e8002f74835c5';

function useCopy(text) {
  const [copied, setCopied] = useState(false);
  const copy = useCallback(() => {
    if (!text) return;
    navigator.clipboard.writeText(text).catch(() => {});
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }, [text]);
  return { copied, copy };
}

export default function DarkPixelLandingPage() {
  const { copied, copy } = useCopy(CA);
  const navigate = useNavigate();

  return (
    <div className="base-app-pixel-theme" style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column' }}>
      
      {/* ── INLINE ANIMATIONS FOR VIBRATING LOGO & PULSING AURA ── */}
      <style>{`
        @keyframes vibeLogoVibrate {
          0% { transform: translate(0px, 0px) rotate(0deg); }
          10% { transform: translate(-2px, -1.5px) rotate(-0.6deg); }
          20% { transform: translate(2px, 1.5px) rotate(0.6deg); }
          30% { transform: translate(-1.5px, 2px) rotate(-0.4deg); }
          40% { transform: translate(1.5px, -2px) rotate(0.4deg); }
          50% { transform: translate(-2px, 1.5px) rotate(0deg); }
          60% { transform: translate(2px, -1.5px) rotate(-0.6deg); }
          70% { transform: translate(-1.5px, -2px) rotate(0.6deg); }
          80% { transform: translate(1.5px, 2px) rotate(-0.4deg); }
          90% { transform: translate(-1.5px, 1.5px) rotate(0.4deg); }
          100% { transform: translate(0px, 0px) rotate(0deg); }
        }

        @keyframes stormAuraPulse1 {
          0% { transform: scale(1); opacity: 0.8; }
          100% { transform: scale(1.24); opacity: 0; }
        }

        @keyframes stormAuraPulse2 {
          0% { transform: scale(1); opacity: 0.8; }
          100% { transform: scale(1.36); opacity: 0; }
        }

        .landing-vibrating-logo {
          animation: vibeLogoVibrate 1.8s ease-in-out infinite;
          transform-origin: center center;
        }

        .landing-aura-ring-1 {
          position: absolute;
          inset: -4px;
          border-radius: 28px;
          border: 2px solid #00f5ff;
          box-shadow: 0 0 24px rgba(0, 245, 255, 0.4), inset 0 0 20px rgba(0, 80, 255, 0.3);
          z-index: 0;
          animation: stormAuraPulse1 2.8s cubic-bezier(0.16, 1, 0.3, 1) infinite;
          pointer-events: none;
        }

        .landing-aura-ring-2 {
          position: absolute;
          inset: -4px;
          border-radius: 28px;
          border: 2px solid #0050ff;
          box-shadow: 0 0 30px rgba(0, 80, 255, 0.5), inset 0 0 25px rgba(0, 245, 255, 0.3);
          z-index: 0;
          animation: stormAuraPulse2 2.8s cubic-bezier(0.16, 1, 0.3, 1) infinite;
          animation-delay: 1.4s;
          pointer-events: none;
        }
      `}</style>

      {/* ── TOP STANDALONE LANDING NAVBAR ($VIBE HUB + ENTER APP) ── */}
      <header
        style={{
          height: '72px',
          background: 'rgba(2, 11, 26, 0.95)',
          borderBottom: '1.5px solid rgba(0, 245, 255, 0.25)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          padding: '0 28px',
          position: 'sticky',
          top: 0,
          zIndex: 100,
          backdropFilter: 'blur(12px)',
          WebkitBackdropFilter: 'blur(12px)',
          boxSizing: 'border-box'
        }}
      >
        {/* Brand: $VIBE HUB */}
        <Link
          to="/"
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '12px',
            textDecoration: 'none',
            color: '#00f5ff'
          }}
        >
          <img
            src="/new-logo-vibe.png"
            alt="VIBE"
            style={{
              width: '34px',
              height: '34px',
              borderRadius: '8px',
              objectFit: 'cover',
              border: '1.5px solid #00f5ff',
              boxShadow: '0 0 14px rgba(0, 245, 255, 0.45)'
            }}
          />
          <span style={{ fontSize: '13px', fontWeight: 900, letterSpacing: '0.8px', color: '#00f5ff' }}>
            $VIBE HUB
          </span>
        </Link>

        {/* Right Action Button: ENTER APP */}
        <div style={{ display: 'flex', alignItems: 'center' }}>
          <button
            onClick={() => navigate('/hub')}
            style={{
              background: 'linear-gradient(135deg, #00f5ff 0%, #0050ff 100%)',
              color: '#ffffff',
              border: '1.5px solid #ffffff',
              borderRadius: '10px',
              padding: '11px 18px',
              fontSize: '9px',
              fontWeight: 900,
              cursor: 'pointer',
              display: 'inline-flex',
              alignItems: 'center',
              gap: '8px',
              boxShadow: '0 0 18px rgba(0, 245, 255, 0.45)',
              fontFamily: "'Press Start 2P', monospace",
              textTransform: 'uppercase',
              transition: 'all 0.15s ease'
            }}
          >
            <span>ENTER APP</span>
            <ArrowRight size={14} strokeWidth={2.5} />
          </button>
        </div>
      </header>

      {/* ── MAIN LANDING CONTENT CONTAINER (EXPANDED WIDE DESKTOP) ── */}
      <main style={{ flex: 1, width: '100%', maxWidth: '1360px', margin: '0 auto', padding: '40px 24px 80px 24px', boxSizing: 'border-box' }}>
        
        {/* ── 1. HERO SECTION ── */}
        <section
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(360px, 1fr))',
            gap: '48px',
            alignItems: 'center',
            marginBottom: '64px',
            padding: '10px 0'
          }}
        >
          {/* Left Column: Text & CTAs */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '22px' }}>
            
            {/* Live Badge */}
            <div style={{ display: 'flex', alignItems: 'center' }}>
              <div
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '9px',
                  background: 'rgba(0, 245, 255, 0.08)',
                  border: '1.5px solid rgba(0, 245, 255, 0.4)',
                  borderRadius: '99px',
                  padding: '7px 18px',
                  boxShadow: '0 0 14px rgba(0, 245, 255, 0.2)'
                }}
              >
                <span
                  style={{
                    width: '8px',
                    height: '8px',
                    borderRadius: '50%',
                    background: '#00ff88',
                    boxShadow: '0 0 10px #00ff88'
                  }}
                />
                <span
                  style={{
                    fontSize: '8.5px',
                    color: '#00f5ff',
                    letterSpacing: '0.6px',
                    fontWeight: 900
                  }}
                >
                  LIVE ON BASE B20
                </span>
              </div>
            </div>

            {/* Main Title */}
            <h1
              style={{
                fontSize: 'clamp(24px, 4.2vw, 40px)',
                lineHeight: 1.35,
                margin: 0,
                color: '#ffffff',
                letterSpacing: '0.6px'
              }}
            >
              I AM THE <span style={{ color: '#00f5ff', textShadow: '0 0 20px rgba(0, 245, 255, 0.55)' }}>VIBE.</span><br />
              THE <span style={{ color: '#00f5ff', textShadow: '0 0 20px rgba(0, 245, 255, 0.55)' }}>BASE</span> DOG.
            </h1>

            {/* Cyberpunk Quote Box */}
            <div
              style={{
                background: 'rgba(4, 20, 48, 0.95)',
                border: '1.5px solid rgba(0, 245, 255, 0.35)',
                borderRadius: '14px',
                padding: '14px 18px',
                display: 'flex',
                flexDirection: 'column',
                gap: '8px',
                boxShadow: '0 6px 24px rgba(0, 0, 0, 0.65)'
              }}
            >
              <div style={{ fontSize: '9px', color: '#cbd5e1', lineHeight: 1.6 }}>
                Dog Vibe belongs to only one owner <strong style={{ color: '#ff4466' }}>offchain</strong>.
              </div>
              <div style={{ fontSize: '9px', color: '#00f5ff', lineHeight: 1.6, fontWeight: 900 }}>
                Base Dog $VIBE belongs to everyone <strong style={{ color: '#00ff88' }}>onchain</strong>.
              </div>
            </div>

            {/* Description (Without emoji) */}
            <p
              style={{
                fontSize: '9.5px',
                lineHeight: 1.8,
                color: '#88aacc',
                margin: 0,
                letterSpacing: '0.3px'
              }}
            >
              Not just a meme. The real maltipoo dog and the ultimate mood maker on Base B20. Good vibes and positive energy only. Every great journey starts with a single paw print
            </p>

            {/* Exactly 2 Action CTAs */}
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '14px', alignItems: 'center', marginTop: '4px' }}>
              <button
                onClick={() => navigate('/hub')}
                style={{
                  background: 'linear-gradient(135deg, #00f5ff 0%, #0050ff 100%)',
                  color: '#ffffff',
                  border: '2px solid #ffffff',
                  borderRadius: '12px',
                  padding: '15px 24px',
                  fontSize: '9.5px',
                  fontWeight: 900,
                  cursor: 'pointer',
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '9px',
                  boxShadow: '0 0 22px rgba(0, 245, 255, 0.5)',
                  fontFamily: "'Press Start 2P', monospace",
                  textTransform: 'uppercase',
                  transition: 'all 0.15s ease'
                }}
              >
                <span>GO TO VIBE HUB PORTAL</span>
                <ArrowRight size={16} strokeWidth={2.5} />
              </button>

              <a
                href={O1}
                target="_blank"
                rel="noreferrer"
                style={{
                  background: 'rgba(0, 245, 255, 0.12)',
                  border: '1.5px solid #00f5ff',
                  color: '#00f5ff',
                  borderRadius: '12px',
                  padding: '15px 22px',
                  fontSize: '9.5px',
                  fontWeight: 900,
                  cursor: 'pointer',
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '8px',
                  fontFamily: "'Press Start 2P', monospace",
                  textTransform: 'uppercase',
                  boxShadow: '0 0 14px rgba(0, 245, 255, 0.25)',
                  textDecoration: 'none'
                }}
              >
                <span>BUY $VIBE</span>
                <ArrowUpRight size={15} strokeWidth={2.5} />
              </a>
            </div>

            {/* Contract Address Box */}
            <div style={{ marginTop: '8px' }}>
              <div style={{ fontSize: '8px', color: '#88aacc', marginBottom: '8px', letterSpacing: '0.5px' }}>
                $VIBE CONTRACT ADDRESS (BASE)
              </div>
              <div
                style={{
                  background: 'rgba(2, 11, 26, 0.95)',
                  border: '1.5px solid rgba(0, 245, 255, 0.35)',
                  borderRadius: '12px',
                  padding: '12px 16px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  gap: '12px',
                  boxShadow: '0 0 14px rgba(0, 245, 255, 0.12)'
                }}
              >
                <span
                  style={{
                    fontSize: '8.5px',
                    color: '#00f5ff',
                    wordBreak: 'break-all',
                    letterSpacing: '0.3px',
                    fontFamily: "'Press Start 2P', monospace"
                  }}
                >
                  {CA}
                </span>
                <button
                  onClick={copy}
                  title="Copy Address"
                  style={{
                    background: copied ? 'rgba(0, 255, 136, 0.25)' : 'rgba(0, 245, 255, 0.15)',
                    border: copied ? '1.5px solid #00ff88' : '1.5px solid rgba(0, 245, 255, 0.35)',
                    borderRadius: '8px',
                    color: copied ? '#00ff88' : '#00f5ff',
                    padding: '8px 12px',
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '6px',
                    flexShrink: 0,
                    fontSize: '8px',
                    fontFamily: "'Press Start 2P', monospace"
                  }}
                >
                  {copied ? <Check size={14} /> : <Copy size={14} />}
                  <span>{copied ? 'COPIED' : 'COPY'}</span>
                </button>
              </div>
            </div>

          </div>

          {/* Right Column: Vibrating Dog Mascot Artwork Card with Magnetic Storm Aura */}
          <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center' }}>
            <div
              style={{
                position: 'relative',
                background: 'radial-gradient(circle at 50% 50%, rgba(0, 80, 255, 0.25) 0%, rgba(2, 11, 26, 0.95) 80%)',
                border: '2px solid rgba(0, 245, 255, 0.45)',
                borderRadius: '28px',
                padding: '24px',
                boxShadow: '0 16px 48px rgba(0, 0, 0, 0.85), 0 0 36px rgba(0, 245, 255, 0.3)',
                maxWidth: '460px',
                width: '100%',
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                boxSizing: 'border-box'
              }}
            >
              {/* Storm Aura Rings */}
              <div className="landing-aura-ring-1" />
              <div className="landing-aura-ring-2" />

              {/* Mascot Image Frame with Dynamic Vibration */}
              <div
                className="landing-vibrating-logo"
                style={{
                  width: '100%',
                  aspectRatio: '1/1',
                  borderRadius: '20px',
                  overflow: 'hidden',
                  border: '2.5px solid #00f5ff',
                  boxShadow: '0 0 24px rgba(0, 245, 255, 0.45)',
                  background: '#041430',
                  position: 'relative',
                  zIndex: 2
                }}
              >
                <img
                  src="/new-logo-vibe.png"
                  onError={(e) => { e.target.onerror = null; e.target.src = '/mascot.png'; }}
                  alt="$VIBE The Base Dog"
                  style={{
                    width: '100%',
                    height: '100%',
                    objectFit: 'cover',
                    display: 'block'
                  }}
                />
              </div>
            </div>
          </div>
        </section>

        {/* ── 2. ECOSYSTEM FEATURES GRID ── */}
        <section style={{ marginBottom: '40px' }}>
          <div style={{ textAlign: 'center', marginBottom: '32px' }}>
            <h2 style={{ fontSize: '18px', color: '#00f5ff', margin: '0 0 12px 0', letterSpacing: '0.6px' }}>
              $VIBE ECOSYSTEM
            </h2>
            <p style={{ fontSize: '9.5px', color: '#88aacc', margin: 0, letterSpacing: '0.4px' }}>
              EVERYTHING YOU NEED IN ONE DECENTRALIZED HUB
            </p>
          </div>

          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))',
              gap: '22px'
            }}
          >
            {/* Card 1: Rewards Hub */}
            <div
              onClick={() => navigate('/hub')}
              style={{
                background: 'rgba(4, 20, 48, 0.9)',
                border: '1.5px solid rgba(0, 245, 255, 0.3)',
                borderRadius: '18px',
                padding: '24px 20px',
                cursor: 'pointer',
                display: 'flex',
                flexDirection: 'column',
                justifyContent: 'space-between',
                boxShadow: '0 8px 24px rgba(0, 0, 0, 0.65)',
                transition: 'all 0.2s ease'
              }}
            >
              <div>
                <div
                  style={{
                    width: '44px',
                    height: '44px',
                    borderRadius: '12px',
                    background: 'rgba(0, 245, 255, 0.15)',
                    border: '1.5px solid rgba(0, 245, 255, 0.35)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    color: '#00f5ff',
                    marginBottom: '16px'
                  }}
                >
                  <Gift size={24} />
                </div>
                <h3 style={{ fontSize: '12px', color: '#ffffff', margin: '0 0 12px 0' }}>REWARDS HUB</h3>
                <p style={{ fontSize: '8.5px', color: '#88aacc', lineHeight: 1.7, margin: 0 }}>
                  Track active rewards. Join. Earn.
                </p>
              </div>
              <div style={{ marginTop: '20px', display: 'flex', alignItems: 'center', gap: '8px', color: '#00f5ff', fontSize: '8.5px', fontWeight: 900 }}>
                <span>OPEN VIBE HUB</span>
                <ArrowRight size={14} strokeWidth={2.5} />
              </div>
            </div>

            {/* Card 2: Claim Portal */}
            <div
              onClick={() => navigate('/claim')}
              style={{
                background: 'rgba(4, 20, 48, 0.9)',
                border: '1.5px solid rgba(0, 245, 255, 0.3)',
                borderRadius: '18px',
                padding: '24px 20px',
                cursor: 'pointer',
                display: 'flex',
                flexDirection: 'column',
                justifyContent: 'space-between',
                boxShadow: '0 8px 24px rgba(0, 0, 0, 0.65)',
                transition: 'all 0.2s ease'
              }}
            >
              <div>
                <div
                  style={{
                    width: '44px',
                    height: '44px',
                    borderRadius: '12px',
                    background: 'rgba(0, 255, 136, 0.15)',
                    border: '1.5px solid rgba(0, 255, 136, 0.35)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    color: '#00ff88',
                    marginBottom: '16px'
                  }}
                >
                  <Coins size={24} />
                </div>
                <h3 style={{ fontSize: '12px', color: '#ffffff', margin: '0 0 12px 0' }}>CLAIM PORTAL</h3>
                <p style={{ fontSize: '8.5px', color: '#88aacc', lineHeight: 1.7, margin: 0 }}>
                  Check your eligibility for upcoming rewards. Claim your unlocked $VIBE rewards.
                </p>
              </div>
              <div style={{ marginTop: '20px', display: 'flex', alignItems: 'center', gap: '8px', color: '#00ff88', fontSize: '8.5px', fontWeight: 900 }}>
                <span>OPEN CLAIM PORTAL</span>
                <ArrowRight size={14} strokeWidth={2.5} />
              </div>
            </div>

            {/* Card 3: Vibe Club NFT */}
            <div
              onClick={() => navigate('/vibeclub')}
              style={{
                background: 'rgba(4, 20, 48, 0.9)',
                border: '1.5px solid rgba(255, 215, 0, 0.35)',
                borderRadius: '18px',
                padding: '24px 20px',
                cursor: 'pointer',
                display: 'flex',
                flexDirection: 'column',
                justifyContent: 'space-between',
                boxShadow: '0 8px 24px rgba(0, 0, 0, 0.65)',
                transition: 'all 0.2s ease'
              }}
            >
              <div>
                <div
                  style={{
                    width: '44px',
                    height: '44px',
                    borderRadius: '12px',
                    background: 'rgba(255, 215, 0, 0.18)',
                    border: '1.5px solid rgba(255, 215, 0, 0.45)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    color: '#ffd700',
                    marginBottom: '16px'
                  }}
                >
                  <Crown size={24} />
                </div>
                <h3 style={{ fontSize: '12px', color: '#ffd700', margin: '0 0 12px 0' }}>VIBE CLUB NFT</h3>
                <p style={{ fontSize: '8.5px', color: '#88aacc', lineHeight: 1.7, margin: 0 }}>
                  Official $VIBE NFT collection with royalty payouts every 10 days to holders.
                </p>
              </div>
              <div style={{ marginTop: '20px', display: 'flex', alignItems: 'center', gap: '8px', color: '#ffd700', fontSize: '8.5px', fontWeight: 900 }}>
                <span>JOIN VIBE CLUB</span>
                <ArrowRight size={14} strokeWidth={2.5} />
              </div>
            </div>

            {/* Card 4: DeFi Swap */}
            <div
              onClick={() => navigate('/buy')}
              style={{
                background: 'rgba(4, 20, 48, 0.9)',
                border: '1.5px solid rgba(0, 245, 255, 0.3)',
                borderRadius: '18px',
                padding: '24px 20px',
                cursor: 'pointer',
                display: 'flex',
                flexDirection: 'column',
                justifyContent: 'space-between',
                boxShadow: '0 8px 24px rgba(0, 0, 0, 0.65)',
                transition: 'all 0.2s ease'
              }}
            >
              <div>
                <div
                  style={{
                    width: '44px',
                    height: '44px',
                    borderRadius: '12px',
                    background: 'rgba(0, 245, 255, 0.15)',
                    border: '1.5px solid rgba(0, 245, 255, 0.35)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    color: '#00f5ff',
                    marginBottom: '16px'
                  }}
                >
                  <ArrowLeftRight size={24} />
                </div>
                <h3 style={{ fontSize: '12px', color: '#ffffff', margin: '0 0 12px 0' }}>DEFI SWAP</h3>
                <p style={{ fontSize: '8.5px', color: '#88aacc', lineHeight: 1.7, margin: 0 }}>
                  Instant swap directly on the vibe hub, with automatic best-rate routing.
                </p>
              </div>
              <div style={{ marginTop: '20px', display: 'flex', alignItems: 'center', gap: '8px', color: '#00f5ff', fontSize: '8.5px', fontWeight: 900 }}>
                <span>TRADE $VIBE</span>
                <ArrowRight size={14} strokeWidth={2.5} />
              </div>
            </div>
          </div>
        </section>

      </main>

      {/* ── FOOTER ── */}
      <footer
        style={{
          borderTop: '1.5px solid rgba(0, 245, 255, 0.2)',
          background: 'rgba(2, 11, 26, 0.95)',
          padding: '22px 28px',
          textAlign: 'center',
          fontSize: '8px',
          color: '#88aacc',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          flexWrap: 'wrap',
          gap: '14px',
          boxSizing: 'border-box'
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <img src="/new-logo-vibe.png" alt="VIBE" style={{ width: '20px', height: '20px', borderRadius: '4px' }} />
          <span>$VIBE · THE BASE DOG</span>
        </div>
        <div style={{ display: 'flex', gap: '16px', flexWrap: 'wrap' }}>
          <a href="https://t.me/vibe_b20" target="_blank" rel="noreferrer" style={{ color: '#00f5ff', textDecoration: 'none' }}>TELEGRAM</a>
          <a href="https://x.com/vibeb20" target="_blank" rel="noreferrer" style={{ color: '#00f5ff', textDecoration: 'none' }}>X (TWITTER)</a>
          <a href={DEX} target="_blank" rel="noreferrer" style={{ color: '#00f5ff', textDecoration: 'none' }}>DEXSCREENER</a>
          <a href={O1} target="_blank" rel="noreferrer" style={{ color: '#00f5ff', textDecoration: 'none' }}>O1 EXCHANGE</a>
        </div>
      </footer>
    </div>
  );
}

