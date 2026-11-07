import { useState } from 'react';
import {
  User,
  ArrowLeftRight,
  Coins,
  Gift,
  BookOpen,
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
import { useWallets } from '@privy-io/react-auth';
import { useAccount } from 'wagmi';
import { THEMES, getTheme, setTheme } from '../../../theme';
import { useVibeWallets } from '../../../hooks/useVibeWallets';

const ADMIN_WALLET = '0x4c91d3bed372c11795b9ce9a9017dfe447bf050a';

const NAV_TABS = [
  { id: 'profile', label: 'Profile', Icon: User },
  { id: 'buy', label: 'Swap', Icon: ArrowLeftRight },
  { id: 'hub', label: 'Rewards Hub', Icon: Gift },
  { id: 'claim', label: 'Claim', Icon: Coins }
];

export function BaseAppBottomNav({ activeTab, onSelectTab }) {
  const [isMoreOpen, setIsMoreOpen] = useState(false);
  const currentTheme = getTheme();
  const { wallets } = useWallets();
  const { address: wagmiAddress } = useAccount();

  const { activeAddress: vibeActiveAddress } = useVibeWallets();
  const activeAddress = vibeActiveAddress || wallets?.[0]?.address || wagmiAddress;
  const isAdmin = !!activeAddress && activeAddress.toLowerCase() === ADMIN_WALLET.toLowerCase();

  // Pages without their own tab open from More, so the marker rests there
  const tabIndex = NAV_TABS.findIndex((tab) => tab.id === activeTab);
  const currentIndex = isMoreOpen || tabIndex < 0 ? NAV_TABS.length : tabIndex;

  const handleTabClick = (tabId) => {
    onSelectTab(tabId);
    setIsMoreOpen(false);
  };

  return (
    <>
      {/* Bottom Tab Bar. Styles: o1-components.css, Based glass version: based.css */}
      <nav className="base-app-bottom-nav">
        <div className="bnav-track">
          {/* Sliding marker on the current section, shown in Based */}
          <span className="bnav-glider" style={{ '--bnav-i': currentIndex }} aria-hidden="true" />

          {NAV_TABS.map(({ id, label, Icon }, index) => (
            id === 'hub' ? (
              /* Rewards Hub: the raised centre button in O1 */
              <button
                key={id}
                type="button"
                className="bnav-item bnav-item-hub"
                aria-current={currentIndex === index ? 'page' : undefined}
                onClick={() => handleTabClick(id)}
              >
                <div className="bnav-hub-icon">
                  <Icon size={24} strokeWidth={2} />
                </div>
                <span className="bnav-hub-label">{label}</span>
              </button>
            ) : (
              <button
                key={id}
                type="button"
                className={`bnav-item ${activeTab === id ? 'active' : ''}`.trim()}
                aria-current={currentIndex === index ? 'page' : undefined}
                onClick={() => handleTabClick(id)}
              >
                <Icon size={22} strokeWidth={1.75} />
                <span>{label}</span>
              </button>
            )
          ))}

          <button
            type="button"
            className={`bnav-item ${isMoreOpen ? 'active' : ''}`.trim()}
            aria-current={currentIndex === NAV_TABS.length ? 'page' : undefined}
            onClick={() => setIsMoreOpen(true)}
          >
            <MoreHorizontal size={22} strokeWidth={1.75} />
            <span>More</span>
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
                onClick={() => handleTabClick('docs')}
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
                <BookOpen size={18} color="var(--accent)" />
                <span>Docs</span>
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
