import React, { useState } from 'react';
import {
  X,
  Gift,
  Coins,
  Crown,
  LogOut,
  Wallet,
  Check,
  Copy,
  User,
  ArrowLeftRight,
  TrendingUp,
  FileCode2,
  ChevronDown,
  ArrowUpRight,
  Shield,
  Send
} from 'lucide-react';
import { usePrivy, useWallets } from '@privy-io/react-auth';
import { useAccount, useDisconnect } from 'wagmi';

const ADMIN_WALLET = '0x4c91d3bed372c11795b9ce9a9017dfe447bf050a';

const shortAddress = (a) => (a ? `${a.slice(0, 6)}…${a.slice(-4)}` : '');

const DEX_ITEMS = [
  {
    name: 'O1 Exchange',
    url: 'https://launch.o1.exchange/token/0xb200000000000000000000df24ecb8bf51100a01?chain=8453',
    logo: '/o1-logo.png'
  },
  {
    name: 'Dexscreener',
    url: 'https://dexscreener.com/base/0xa1a4159e61ac9fc48aa9e9992c8d4870ef8a496d5749af1d219e8002f74835c5',
    logo: '/dexscreener-logo.jpg'
  },
  {
    name: 'GeckoTerminal',
    url: 'https://www.geckoterminal.com/uk/base/pools/0xa1a4159e61ac9fc48aa9e9992c8d4870ef8a496d5749af1d219e8002f74835c5',
    logo: '/geckoterminal-logo.jpg'
  }
];

const XIcon = () => (
  <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor">
    <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z"/>
  </svg>
);

const SidebarToggleIcon = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round">
    <rect x="3" y="3" width="18" height="18" rx="3" ry="3" />
    <line x1="9" y1="3" x2="9" y2="21" />
  </svg>
);

const SOCIAL_ITEMS = [
  {
    name: 'Telegram channel',
    url: 'https://t.me/vibe_b20',
    icon: <Send size={15} strokeWidth={1.75} />
  },
  {
    name: 'Telegram chat',
    url: 'https://t.me/vibe_b20_chat',
    icon: <Send size={15} strokeWidth={1.75} />
  },
  {
    name: 'Follow on X',
    url: 'https://x.com/vibeb20',
    icon: <XIcon />
  }
];

export function BaseAppSidebar({
  isOpen,
  onClose,
  activeTab,
  onSelectTab,
  isCollapsed = false,
  onToggleCollapse,
  isDesktop = false
}) {
  const { login, logout, authenticated, user } = usePrivy();
  const { wallets } = useWallets();
  const { address: wagmiAddress, isConnected: isWagmiConnected } = useAccount();
  const { disconnect } = useDisconnect();
  const [copied, setCopied] = useState(false);

  const [isAppMenuOpen, setIsAppMenuOpen] = useState(true);
  const [isDocsOpen, setIsDocsOpen] = useState(true);
  const [isDexOpen, setIsDexOpen] = useState(true);
  const [isSocialsOpen, setIsSocialsOpen] = useState(true);

  const activeAddress = user?.wallet?.address || wallets?.[0]?.address || wagmiAddress;
  const hasWallet = (authenticated && !!activeAddress) || (isWagmiConnected && !!wagmiAddress);
  const isAdmin = hasWallet && !!activeAddress && activeAddress.toLowerCase() === ADMIN_WALLET.toLowerCase();

  const handleCopy = () => {
    if (!activeAddress) return;
    navigator.clipboard.writeText(activeAddress);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleDisconnect = () => {
    disconnect?.();
    logout?.();
    if (!isDesktop) onClose();
  };

  if (!isDesktop && !isOpen) return null;

  const appMenuItems = [
    { id: 'profile', name: 'Profile', icon: <User size={18} strokeWidth={1.75} /> },
    { id: 'buy', name: 'Swap', icon: <ArrowLeftRight size={18} strokeWidth={1.75} /> },
    { id: 'vibeclub', name: 'Vibe Club NFT', icon: <Crown size={18} strokeWidth={1.75} /> },
    { id: 'hub', name: 'Rewards Hub', icon: <Gift size={18} strokeWidth={1.75} /> },
    { id: 'claim', name: 'Claim Portal', icon: <Coins size={18} strokeWidth={1.75} /> }
  ];

  const docsItems = [
    { id: 'tokenomics', name: 'Tokenomics', icon: <TrendingUp size={18} strokeWidth={1.75} /> },
    { id: 'contracts', name: 'Official addresses', icon: <FileCode2 size={18} strokeWidth={1.75} /> }
  ];

  const sidebarWidth = isDesktop ? (isCollapsed ? '64px' : '248px') : '260px';

  return (
    <>
      {/* Mobile Backdrop */}
      {!isDesktop && isOpen && (
        <div
          onClick={onClose}
          style={{
            position: 'fixed',
            inset: 0,
            background: 'rgba(0, 0, 0, 0.7)',
            zIndex: 999998,
            transition: 'opacity 0.15s ease'
          }}
        />
      )}

      {/* Sidebar Container */}
      <aside
        className={`base-app-sidebar ${isDesktop ? (isCollapsed ? 'collapsed' : 'expanded') : 'mobile-drawer'}`}
        style={{
          position: 'fixed',
          top: 0,
          left: 0,
          bottom: 0,
          width: sidebarWidth,
          maxWidth: isDesktop ? 'none' : '85vw',
          height: '100vh',
          background: 'var(--bg-bar)',
          borderRight: '1px solid var(--border)',
          zIndex: isDesktop ? 60 : 999999,
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'space-between',
          padding: isCollapsed ? '12px 8px' : '12px',
          boxSizing: 'border-box',
          fontFamily: 'var(--font-sans)',
          transition: isDesktop ? 'width 0.2s ease, padding 0.2s ease' : 'none',
          overflowY: 'auto',
          overflowX: 'hidden'
        }}
      >
        <div style={{ display: 'flex', flexDirection: 'column' }}>
          {/* Header: 12px sidebar padding + 56px = 68px, so its bottom border lines up with the 68px top bar */}
          <div
            style={{
              height: '56px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: isCollapsed ? 'center' : 'space-between',
              padding: isCollapsed ? '0' : '0 4px',
              borderBottom: '1px solid var(--border)',
              marginBottom: '12px',
              boxSizing: 'border-box'
            }}
          >
            {isCollapsed ? (
              <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '8px' }}>
                <img
                  src="/new-logo-vibe.png"
                  alt="VIBE"
                  onClick={() => onSelectTab('hub')}
                  style={{
                    width: '28px',
                    height: '28px',
                    borderRadius: '8px',
                    objectFit: 'cover',
                    border: '1px solid var(--border)',
                    cursor: 'pointer'
                  }}
                />
                {onToggleCollapse && (
                  <button
                    onClick={onToggleCollapse}
                    title="Expand sidebar"
                    style={{
                      background: 'transparent',
                      border: 'none',
                      color: 'var(--text-3)',
                      cursor: 'pointer',
                      padding: '4px',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      borderRadius: '6px'
                    }}
                  >
                    <SidebarToggleIcon />
                  </button>
                )}
              </div>
            ) : (
              <>
                <div
                  onClick={() => {
                    onSelectTab('hub');
                    if (!isDesktop) onClose();
                  }}
                  style={{ display: 'flex', alignItems: 'center', gap: '10px', cursor: 'pointer' }}
                >
                  <img
                    src="/new-logo-vibe.png"
                    alt="VIBE"
                    style={{
                      width: '28px',
                      height: '28px',
                      borderRadius: '8px',
                      objectFit: 'cover',
                      border: '1px solid var(--border)'
                    }}
                  />
                  <span
                    className="vh-brand"
                    style={{
                      fontFamily: 'var(--font-sans)',
                      fontSize: '16px',
                      fontWeight: 800,
                      color: 'var(--text)',
                      letterSpacing: '-0.02em',
                      whiteSpace: 'nowrap'
                    }}
                  >
                    $VIBE HUB
                  </span>
                </div>

                {isDesktop ? (
                  <button
                    onClick={onToggleCollapse}
                    title="Collapse sidebar"
                    aria-label="Toggle sidebar"
                    style={{
                      width: '32px',
                      height: '32px',
                      background: 'transparent',
                      border: 'none',
                      borderRadius: '8px',
                      color: 'var(--text-3)',
                      cursor: 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      transition: 'color 0.15s ease, background 0.15s ease'
                    }}
                    onMouseEnter={(e) => {
                      e.currentTarget.style.color = 'var(--text)';
                      e.currentTarget.style.background = 'var(--surface-2)';
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.color = 'var(--text-3)';
                      e.currentTarget.style.background = 'transparent';
                    }}
                  >
                    <SidebarToggleIcon />
                  </button>
                ) : (
                  <button
                    onClick={onClose}
                    aria-label="Close menu"
                    style={{
                      width: '32px',
                      height: '32px',
                      background: 'transparent',
                      border: 'none',
                      borderRadius: '8px',
                      color: 'var(--text-2)',
                      cursor: 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center'
                    }}
                  >
                    <X size={18} strokeWidth={1.75} />
                  </button>
                )}
              </>
            )}
          </div>

          {/* Section 1: App menu */}
          <div style={{ marginBottom: '8px' }}>
            {!isCollapsed && (
              <div
                onClick={() => setIsAppMenuOpen(!isAppMenuOpen)}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  padding: '12px 8px 6px',
                  cursor: 'pointer',
                  userSelect: 'none'
                }}
              >
                <span
                  style={{
                    fontSize: '11px',
                    fontWeight: 600,
                    textTransform: 'uppercase',
                    letterSpacing: '0.06em',
                    color: 'var(--text-3)'
                  }}
                >
                  App menu
                </span>
                <ChevronDown
                  size={14}
                  color="var(--text-3)"
                  style={{
                    transform: isAppMenuOpen ? 'rotate(0deg)' : 'rotate(-90deg)',
                    transition: 'transform 0.15s ease'
                  }}
                />
              </div>
            )}

            {(isCollapsed || isAppMenuOpen) && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '2px' }}>
                {appMenuItems.map((item) => {
                  const isActive = activeTab === item.id;
                  return (
                    <button
                      key={item.id}
                      title={item.name}
                      onClick={() => {
                        onSelectTab(item.id);
                        if (!isDesktop) onClose();
                      }}
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: isCollapsed ? 'center' : 'flex-start',
                        gap: '10px',
                        width: '100%',
                        height: '40px',
                        padding: isCollapsed ? '0' : '0 10px',
                        borderRadius: '10px',
                        border: 'none',
                        background: isActive ? 'var(--accent-soft)' : 'transparent',
                        color: isActive ? 'var(--accent)' : 'var(--text-2)',
                        fontSize: '14px',
                        fontWeight: 500,
                        cursor: 'pointer',
                        textAlign: 'left',
                        fontFamily: 'var(--font-sans)',
                        transition: 'background 0.15s ease, color 0.15s ease'
                      }}
                      onMouseEnter={(e) => {
                        if (!isActive) {
                          e.currentTarget.style.background = 'var(--surface-2)';
                          e.currentTarget.style.color = 'var(--text)';
                        }
                      }}
                      onMouseLeave={(e) => {
                        if (!isActive) {
                          e.currentTarget.style.background = 'transparent';
                          e.currentTarget.style.color = 'var(--text-2)';
                        }
                      }}
                    >
                      <span style={{ display: 'flex', alignItems: 'center', color: isActive ? 'var(--accent)' : 'currentColor' }}>
                        {item.icon}
                      </span>
                      {!isCollapsed && (
                        <span style={{ flex: 1, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                          {item.name}
                        </span>
                      )}
                    </button>
                  );
                })}
              </div>
            )}
          </div>

          {/* Section 2: $VIBE docs */}
          <div style={{ marginBottom: '8px' }}>
            {!isCollapsed && (
              <div
                onClick={() => setIsDocsOpen(!isDocsOpen)}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  padding: '12px 8px 6px',
                  cursor: 'pointer',
                  userSelect: 'none'
                }}
              >
                <span
                  style={{
                    fontSize: '11px',
                    fontWeight: 600,
                    textTransform: 'uppercase',
                    letterSpacing: '0.06em',
                    color: 'var(--text-3)'
                  }}
                >
                  $VIBE docs
                </span>
                <ChevronDown
                  size={14}
                  color="var(--text-3)"
                  style={{
                    transform: isDocsOpen ? 'rotate(0deg)' : 'rotate(-90deg)',
                    transition: 'transform 0.15s ease'
                  }}
                />
              </div>
            )}

            {(isCollapsed || isDocsOpen) && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '2px' }}>
                {docsItems.map((item) => {
                  const isActive = activeTab === item.id;
                  return (
                    <button
                      key={item.id}
                      title={item.name}
                      onClick={() => {
                        onSelectTab(item.id);
                        if (!isDesktop) onClose();
                      }}
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: isCollapsed ? 'center' : 'flex-start',
                        gap: '10px',
                        width: '100%',
                        height: '40px',
                        padding: isCollapsed ? '0' : '0 10px',
                        borderRadius: '10px',
                        border: 'none',
                        background: isActive ? 'var(--accent-soft)' : 'transparent',
                        color: isActive ? 'var(--accent)' : 'var(--text-2)',
                        fontSize: '14px',
                        fontWeight: 500,
                        cursor: 'pointer',
                        textAlign: 'left',
                        fontFamily: 'var(--font-sans)',
                        transition: 'background 0.15s ease, color 0.15s ease'
                      }}
                      onMouseEnter={(e) => {
                        if (!isActive) {
                          e.currentTarget.style.background = 'var(--surface-2)';
                          e.currentTarget.style.color = 'var(--text)';
                        }
                      }}
                      onMouseLeave={(e) => {
                        if (!isActive) {
                          e.currentTarget.style.background = 'transparent';
                          e.currentTarget.style.color = 'var(--text-2)';
                        }
                      }}
                    >
                      <span style={{ display: 'flex', alignItems: 'center', color: isActive ? 'var(--accent)' : 'currentColor' }}>
                        {item.icon}
                      </span>
                      {!isCollapsed && (
                        <span style={{ flex: 1, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                          {item.name}
                        </span>
                      )}
                    </button>
                  );
                })}
              </div>
            )}
          </div>

          {/* Section 3: DEX */}
          <div style={{ marginBottom: '8px' }}>
            {!isCollapsed && (
              <div
                onClick={() => setIsDexOpen(!isDexOpen)}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  padding: '12px 8px 6px',
                  cursor: 'pointer',
                  userSelect: 'none'
                }}
              >
                <span
                  style={{
                    fontSize: '11px',
                    fontWeight: 600,
                    textTransform: 'uppercase',
                    letterSpacing: '0.06em',
                    color: 'var(--text-3)'
                  }}
                >
                  DEX
                </span>
                <ChevronDown
                  size={14}
                  color="var(--text-3)"
                  style={{
                    transform: isDexOpen ? 'rotate(0deg)' : 'rotate(-90deg)',
                    transition: 'transform 0.15s ease'
                  }}
                />
              </div>
            )}

            {(isCollapsed || isDexOpen) && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '2px' }}>
                {DEX_ITEMS.map((item) => (
                  <a
                    key={item.name}
                    href={item.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    title={item.name}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: isCollapsed ? 'center' : 'flex-start',
                      gap: '10px',
                      width: '100%',
                      height: '40px',
                      padding: isCollapsed ? '0' : '0 10px',
                      borderRadius: '10px',
                      textDecoration: 'none',
                      color: 'var(--text-2)',
                      fontSize: '14px',
                      fontWeight: 500,
                      boxSizing: 'border-box',
                      transition: 'background 0.15s ease, color 0.15s ease'
                    }}
                    onMouseEnter={(e) => {
                      e.currentTarget.style.background = 'var(--surface-2)';
                      e.currentTarget.style.color = 'var(--text)';
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.background = 'transparent';
                      e.currentTarget.style.color = 'var(--text-2)';
                    }}
                  >
                    <img
                      src={item.logo}
                      alt={item.name}
                      style={{ width: '18px', height: '18px', borderRadius: '4px', objectFit: 'cover' }}
                    />
                    {!isCollapsed && (
                      <>
                        <span style={{ flex: 1, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                          {item.name}
                        </span>
                        <ArrowUpRight size={14} color="var(--text-3)" strokeWidth={1.75} />
                      </>
                    )}
                  </a>
                ))}
              </div>
            )}
          </div>

          {/* Section 4: Socials */}
          <div style={{ marginBottom: '8px' }}>
            {!isCollapsed && (
              <div
                onClick={() => setIsSocialsOpen(!isSocialsOpen)}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  padding: '12px 8px 6px',
                  cursor: 'pointer',
                  userSelect: 'none'
                }}
              >
                <span
                  style={{
                    fontSize: '11px',
                    fontWeight: 600,
                    textTransform: 'uppercase',
                    letterSpacing: '0.06em',
                    color: 'var(--text-3)'
                  }}
                >
                  Socials
                </span>
                <ChevronDown
                  size={14}
                  color="var(--text-3)"
                  style={{
                    transform: isSocialsOpen ? 'rotate(0deg)' : 'rotate(-90deg)',
                    transition: 'transform 0.15s ease'
                  }}
                />
              </div>
            )}

            {(isCollapsed || isSocialsOpen) && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '2px' }}>
                {SOCIAL_ITEMS.map((item) => (
                  <a
                    key={item.name}
                    href={item.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    title={item.name}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: isCollapsed ? 'center' : 'flex-start',
                      gap: '10px',
                      width: '100%',
                      height: '40px',
                      padding: isCollapsed ? '0' : '0 10px',
                      borderRadius: '10px',
                      textDecoration: 'none',
                      color: 'var(--text-2)',
                      fontSize: '14px',
                      fontWeight: 500,
                      boxSizing: 'border-box',
                      transition: 'background 0.15s ease, color 0.15s ease'
                    }}
                    onMouseEnter={(e) => {
                      e.currentTarget.style.background = 'var(--surface-2)';
                      e.currentTarget.style.color = 'var(--text)';
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.background = 'transparent';
                      e.currentTarget.style.color = 'var(--text-2)';
                    }}
                  >
                    <span style={{ display: 'flex', alignItems: 'center' }}>
                      {item.icon}
                    </span>
                    {!isCollapsed && (
                      <>
                        <span style={{ flex: 1, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                          {item.name}
                        </span>
                        <ArrowUpRight size={14} color="var(--text-3)" strokeWidth={1.75} />
                      </>
                    )}
                  </a>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Bottom block: Divider, Admin Panel, Wallet pill */}
        <div style={{ borderTop: '1px solid var(--border)', paddingTop: '12px', display: 'flex', flexDirection: 'column', gap: '8px' }}>
          {isAdmin && (
            <button
              onClick={() => {
                onSelectTab('admin');
                if (!isDesktop) onClose();
              }}
              title="Admin panel"
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: isCollapsed ? 'center' : 'flex-start',
                gap: '10px',
                width: '100%',
                height: '40px',
                padding: isCollapsed ? '0' : '0 10px',
                borderRadius: '10px',
                border: 'none',
                background: activeTab === 'admin' ? 'var(--accent-soft)' : 'transparent',
                color: activeTab === 'admin' ? 'var(--accent)' : 'var(--text-2)',
                fontSize: '14px',
                fontWeight: 500,
                cursor: 'pointer',
                fontFamily: 'var(--font-sans)',
                transition: 'background 0.15s ease, color 0.15s ease'
              }}
              onMouseEnter={(e) => {
                if (activeTab !== 'admin') {
                  e.currentTarget.style.background = 'var(--surface-2)';
                  e.currentTarget.style.color = 'var(--text)';
                }
              }}
              onMouseLeave={(e) => {
                if (activeTab !== 'admin') {
                  e.currentTarget.style.background = 'transparent';
                  e.currentTarget.style.color = 'var(--text-2)';
                }
              }}
            >
              <Shield size={18} strokeWidth={1.75} />
              {!isCollapsed && <span>Admin panel</span>}
            </button>
          )}

          {hasWallet ? (
            isCollapsed ? (
              <button
                onClick={handleCopy}
                title={`Wallet: ${activeAddress}`}
                style={{
                  width: '40px',
                  height: '40px',
                  borderRadius: '12px',
                  background: 'var(--surface)',
                  border: '1px solid var(--border)',
                  color: 'var(--text)',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  margin: '0 auto'
                }}
              >
                {copied ? <Check size={16} color="var(--green)" /> : <Wallet size={16} />}
              </button>
            ) : (
              <div
                style={{
                  height: '40px',
                  padding: '0 8px 0 10px',
                  borderRadius: '12px',
                  background: 'var(--surface)',
                  border: '1px solid var(--border)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  gap: '8px'
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', minWidth: 0 }}>
                  <div
                    style={{
                      width: '8px',
                      height: '8px',
                      borderRadius: '50%',
                      background: 'var(--green)',
                      flexShrink: 0
                    }}
                  />
                  <span
                    className="mono"
                    style={{
                      fontSize: '13px',
                      color: 'var(--text)',
                      fontFamily: 'var(--font-mono)'
                    }}
                  >
                    {shortAddress(activeAddress)}
                  </span>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                  <button
                    onClick={handleCopy}
                    title="Copy address"
                    style={{
                      background: 'transparent',
                      border: 'none',
                      color: 'var(--text-3)',
                      cursor: 'pointer',
                      padding: '4px',
                      borderRadius: '6px',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center'
                    }}
                    onMouseEnter={(e) => { e.currentTarget.style.color = 'var(--text)'; }}
                    onMouseLeave={(e) => { e.currentTarget.style.color = 'var(--text-3)'; }}
                  >
                    {copied ? <Check size={14} color="var(--green)" /> : <Copy size={14} />}
                  </button>
                  <button
                    onClick={handleDisconnect}
                    title="Disconnect wallet"
                    style={{
                      background: 'transparent',
                      border: 'none',
                      color: 'var(--text-3)',
                      cursor: 'pointer',
                      padding: '4px',
                      borderRadius: '6px',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center'
                    }}
                    onMouseEnter={(e) => { e.currentTarget.style.color = 'var(--red)'; }}
                    onMouseLeave={(e) => { e.currentTarget.style.color = 'var(--text-3)'; }}
                  >
                    <LogOut size={14} />
                  </button>
                </div>
              </div>
            )
          ) : (
            <button
              onClick={() => {
                login();
                if (!isDesktop) onClose();
              }}
              title="Connect wallet"
              className="btn btn-primary"
              style={{
                width: '100%',
                height: '40px',
                borderRadius: '12px',
                fontSize: '14px',
                fontWeight: 600,
                padding: isCollapsed ? '0' : '0 16px'
              }}
            >
              <Wallet size={16} strokeWidth={1.75} />
              {!isCollapsed && <span>Connect wallet</span>}
            </button>
          )}
        </div>
      </aside>
    </>
  );
}
