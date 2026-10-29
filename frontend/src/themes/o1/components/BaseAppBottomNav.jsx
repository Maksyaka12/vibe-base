import { useState } from 'react';
import {
  User,
  ArrowLeftRight,
  Coins,
  Gift,
  MoreHorizontal,
  Crown,
  TrendingUp,
  Puzzle,
  Bot,
  Shield,
  ArrowUpRight,
  X,
  Palette
} from 'lucide-react';
import { usePrivy, useWallets } from '@privy-io/react-auth';
import { useAccount } from 'wagmi';
import { THEMES, getTheme, setTheme } from '../../../theme';
import { useVibeWallets } from '../../../hooks/useVibeWallets';

const ADMIN_WALLET = '0x4c91d3bed372c11795b9ce9a9017dfe447bf050a';

export function BaseAppBottomNav({ activeTab, onSelectTab }) {
  const [isMoreOpen, setIsMoreOpen] = useState(false);
  const currentTheme = getTheme();
  const { user } = usePrivy();
  const { wallets } = useWallets();
  const { address: wagmiAddress } = useAccount();

  const { activeAddress: vibeActiveAddress } = useVibeWallets();
  const activeAddress = vibeActiveAddress || wallets?.[0]?.address || wagmiAddress;
  const isAdmin = !!activeAddress && activeAddress.toLowerCase() === ADMIN_WALLET.toLowerCase();

  const handleTabClick = (tabId) => {
    onSelectTab(tabId);
    setIsMoreOpen(false);
  };

  return (
    <>
      {/* Bottom Tab Bar (o1-dark-ui-design §5.12) */}
      <nav
        className="base-app-bottom-nav"
        style={{
          position: 'fixed',
          bottom: 0,
          left: 0,
          right: 0,
          width: '100%',
          height: '64px',
          zIndex: 99999,
          background: 'rgba(11, 12, 15, 0.95)',
          backdropFilter: 'blur(16px)',
          WebkitBackdropFilter: 'blur(16px)',
          borderTop: '1px solid var(--border)',
          paddingBottom: 'env(safe-area-inset-bottom, 0px)',
          boxSizing: 'border-box',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-around'
        }}
      >
        <div
          style={{
            width: '100%',
            maxWidth: '480px',
            margin: '0 auto',
            height: '100%',
            display: 'grid',
            gridTemplateColumns: 'repeat(5, 1fr)',
            alignItems: 'center'
          }}
        >
          {/* 1. Profile */}
          <button
            type="button"
            onClick={() => handleTabClick('profile')}
            style={{
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '4px',
              background: 'transparent',
              border: 'none',
              cursor: 'pointer',
              color: activeTab === 'profile' ? 'var(--accent)' : 'var(--text-3)'
            }}
          >
            <User size={22} strokeWidth={1.75} />
            <span style={{ fontSize: '11px', fontWeight: 500 }}>Profile</span>
          </button>

          {/* 2. Swap */}
          <button
            type="button"
            onClick={() => handleTabClick('buy')}
            style={{
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '4px',
              background: 'transparent',
              border: 'none',
              cursor: 'pointer',
              color: activeTab === 'buy' ? 'var(--accent)' : 'var(--text-3)'
            }}
          >
            <ArrowLeftRight size={22} strokeWidth={1.75} />
            <span style={{ fontSize: '11px', fontWeight: 500 }}>Swap</span>
          </button>

          {/* 3. Center Raised Action: Rewards Hub */}
          <button
            type="button"
            onClick={() => handleTabClick('hub')}
            style={{
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              justifyContent: 'flex-start',
              background: 'transparent',
              border: 'none',
              cursor: 'pointer',
              position: 'relative'
            }}
          >
            <div
              style={{
                position: 'absolute',
                top: '-20px',
                width: '52px',
                height: '52px',
                borderRadius: '50%',
                background: 'var(--accent)',
                color: 'var(--on-accent)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                border: '2px solid var(--bg-bar)',
                transition: 'transform 0.15s ease'
              }}
            >
              <Gift size={24} strokeWidth={2} />
            </div>
            <span
              style={{
                fontSize: '11px',
                fontWeight: 600,
                color: 'var(--accent)',
                marginTop: '34px',
                whiteSpace: 'nowrap'
              }}
            >
              Rewards Hub
            </span>
          </button>

          {/* 4. Claim */}
          <button
            type="button"
            onClick={() => handleTabClick('claim')}
            style={{
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '4px',
              background: 'transparent',
              border: 'none',
              cursor: 'pointer',
              color: activeTab === 'claim' ? 'var(--accent)' : 'var(--text-3)'
            }}
          >
            <Coins size={22} strokeWidth={1.75} />
            <span style={{ fontSize: '11px', fontWeight: 500 }}>Claim</span>
          </button>

          {/* 5. More */}
          <button
            type="button"
            onClick={() => setIsMoreOpen(true)}
            style={{
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '4px',
              background: 'transparent',
              border: 'none',
              cursor: 'pointer',
              color: isMoreOpen ? 'var(--accent)' : 'var(--text-3)'
            }}
          >
            <MoreHorizontal size={22} strokeWidth={1.75} />
            <span style={{ fontSize: '11px', fontWeight: 500 }}>More</span>
          </button>
        </div>
      </nav>

      {/* "More" Bottom Sheet Modal */}
      {isMoreOpen && (
        <>
          <div
            onClick={() => setIsMoreOpen(false)}
            style={{
              position: 'fixed',
              inset: 0,
              background: 'rgba(0, 0, 0, 0.7)',
              zIndex: 100000
            }}
          />
          <div
            style={{
              position: 'fixed',
              bottom: 0,
              left: 0,
              right: 0,
              background: 'var(--surface)',
              borderTop: '1px solid var(--border)',
              borderTopLeftRadius: '20px',
              borderTopRightRadius: '20px',
              zIndex: 100001,
              padding: '20px 20px calc(24px + env(safe-area-inset-bottom, 0px))',
              boxSizing: 'border-box',
              maxHeight: '80vh',
              overflowY: 'auto'
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '16px' }}>
              <span style={{ fontSize: '16px', fontWeight: 600, color: 'var(--text)' }}>More options</span>
              <button
                onClick={() => setIsMoreOpen(false)}
                style={{
                  background: 'transparent',
                  border: 'none',
                  color: 'var(--text-3)',
                  cursor: 'pointer',
                  padding: '4px'
                }}
              >
                <X size={20} />
              </button>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
              <button
                onClick={() => handleTabClick('vibeclub')}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '12px',
                  padding: '12px 14px',
                  borderRadius: '12px',
                  background: 'var(--surface-2)',
                  border: '1px solid var(--border)',
                  color: 'var(--text)',
                  fontSize: '14px',
                  fontWeight: 500,
                  cursor: 'pointer',
                  textAlign: 'left'
                }}
              >
                <Crown size={18} color="var(--accent)" />
                <span>Vibe Club NFT</span>
              </button>

              <button
                onClick={() => handleTabClick('tokenomics')}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '12px',
                  padding: '12px 14px',
                  borderRadius: '12px',
                  background: 'var(--surface-2)',
                  border: '1px solid var(--border)',
                  color: 'var(--text)',
                  fontSize: '14px',
                  fontWeight: 500,
                  cursor: 'pointer',
                  textAlign: 'left'
                }}
              >
                <TrendingUp size={18} color="var(--accent)" />
                <span>Tokenomics</span>
              </button>

              <button
                onClick={() => handleTabClick('skill')}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '12px',
                  padding: '12px 14px',
                  borderRadius: '12px',
                  background: 'var(--surface-2)',
                  border: '1px solid var(--border)',
                  color: 'var(--text)',
                  fontSize: '14px',
                  fontWeight: 500,
                  cursor: 'pointer',
                  textAlign: 'left'
                }}
              >
                <Puzzle size={18} color="var(--accent)" />
                <span>Skill</span>
              </button>

              {/* Agent Zone: in the agent colour, like the header button */}
              <button
                onClick={() => handleTabClick('agents')}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '12px',
                  padding: '12px 14px',
                  borderRadius: '12px',
                  background: 'var(--agent)',
                  border: '1px solid var(--agent)',
                  color: 'var(--on-agent)',
                  fontSize: '14px',
                  fontWeight: 600,
                  cursor: 'pointer',
                  textAlign: 'left'
                }}
              >
                <Bot size={18} />
                <span>Agent Zone</span>
              </button>

              {isAdmin && (
                <button
                  onClick={() => handleTabClick('admin')}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '12px',
                    padding: '12px 14px',
                    borderRadius: '12px',
                    background: 'var(--surface-2)',
                    border: '1px solid var(--border)',
                    color: 'var(--text)',
                    fontSize: '14px',
                    fontWeight: 500,
                    cursor: 'pointer',
                    textAlign: 'left'
                  }}
                >
                  <Shield size={18} color="var(--red)" />
                  <span>Admin panel</span>
                </button>
              )}

              {/* Theme picker (the header switcher is hidden while the bottom nav is shown) */}
              <div style={{ marginTop: '8px', paddingTop: '12px', borderTop: '1px solid var(--border)', display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '12px' }}>
                <span style={{ display: 'flex', alignItems: 'center', gap: '12px', fontSize: '14px', fontWeight: 500, color: 'var(--text)' }}>
                  <Palette size={18} color="var(--accent)" />
                  Theme
                </span>
                <div className="seg" role="radiogroup" aria-label="Theme">
                  {THEMES.map((t) => (
                    <button
                      key={t.id}
                      type="button"
                      role="radio"
                      aria-checked={t.id === currentTheme}
                      aria-selected={t.id === currentTheme}
                      onClick={() => setTheme(t.id)}
                    >
                      {t.label}
                    </button>
                  ))}
                </div>
              </div>

              <div style={{ marginTop: '8px', paddingTop: '12px', borderTop: '1px solid var(--border)', display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px' }}>
                <a
                  href="https://launch.o1.exchange/token/0xb200000000000000000000df24ecb8bf51100a01?chain=8453"
                  target="_blank"
                  rel="noopener noreferrer"
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    padding: '10px 12px',
                    borderRadius: '10px',
                    background: 'var(--surface-2)',
                    border: '1px solid var(--border)',
                    color: 'var(--text-2)',
                    fontSize: '13px',
                    textDecoration: 'none'
                  }}
                >
                  <span>O1 Exchange</span>
                  <ArrowUpRight size={14} />
                </a>

                <a
                  href="https://dexscreener.com/base/0xa1a4159e61ac9fc48aa9e9992c8d4870ef8a496d5749af1d219e8002f74835c5"
                  target="_blank"
                  rel="noopener noreferrer"
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    padding: '10px 12px',
                    borderRadius: '10px',
                    background: 'var(--surface-2)',
                    border: '1px solid var(--border)',
                    color: 'var(--text-2)',
                    fontSize: '13px',
                    textDecoration: 'none'
                  }}
                >
                  <span>Dexscreener</span>
                  <ArrowUpRight size={14} />
                </a>
              </div>
            </div>
          </div>
        </>
      )}
    </>
  );
}
