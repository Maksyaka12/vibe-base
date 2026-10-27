import { Menu, Wallet, Flame } from 'lucide-react';
import { usePrivy, useWallets } from '@privy-io/react-auth';
import { useAccount } from 'wagmi';
import { useVibeBalances } from '../../../hooks/useVibeBalances';
import { useVibeCheckIn } from '../../../hooks/useVibeCheckIn';
import { ThemeSwitcher } from './ThemeSwitcher';
import WalletToggle from '../../../components/wallet/WalletToggle';
import AgentsButton from '../../../components/agent/AgentsButton';
import { useVibeWallets } from '../../../hooks/useVibeWallets';

const TAB_TITLES = {
  home: 'HOME · OVERVIEW',
  hub: 'REWARDS HUB',
  buy: 'SWAP $VIBE',
  vibeclub: 'VIBE CLUB NFT',
  claim: 'CLAIM PORTAL',
  profile: 'USER PROFILE',
  tokenomics: 'TOKENOMICS',
  contracts: 'OFFICIAL ADDRESSES'
};

export function BaseAppHeader({ onOpenSidebar, activeTab, isDesktop = false }) {
  const { login, authenticated, user } = usePrivy();
  const { wallets } = useWallets();
  const { address: wagmiAddress, isConnected: isWagmiConnected } = useAccount();

  const { activeAddress: vibeActiveAddress } = useVibeWallets();
  const activeAddress = vibeActiveAddress || wallets?.[0]?.address || wagmiAddress;
  const hasWallet = (authenticated && !!activeAddress) || (isWagmiConnected && !!wagmiAddress);

  const { balance, nftCount, formattedBalance } = useVibeBalances(activeAddress);
  const { streak } = useVibeCheckIn(activeAddress);

  const pageTitle = TAB_TITLES[activeTab] || '$VIBE';

  return (
    <header
      className="base-app-header"
      style={{
        height: '66px',
        background: 'rgba(2, 11, 26, 0.92)',
        borderBottom: '1px solid rgba(0, 245, 255, 0.2)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        padding: '0 12px',
        position: 'sticky',
        top: 0,
        zIndex: 50,
        color: '#FFFFFF',
        fontFamily: "'Press Start 2P', monospace",
        backdropFilter: 'blur(12px)',
        WebkitBackdropFilter: 'blur(12px)',
        textTransform: 'uppercase',
        boxSizing: 'border-box',
        flexWrap: 'nowrap'
      }}
    >
      {/* Left side: Hamburger + Logo on Mobile, OR Page Title on Desktop */}
      <div className="base-app-header-left" style={{ display: 'flex', alignItems: 'center', gap: '8px', flexShrink: 0, minWidth: 0 }}>
        {/* Mobile Hamburger Menu Button (Hidden on Desktop via CSS / isDesktop) */}
        <button
          onClick={onOpenSidebar}
          aria-label="Open Navigation Menu"
          className="mobile-hamburger-btn"
          style={{
            background: 'rgba(0, 245, 255, 0.08)',
            border: '1.5px solid rgba(0, 245, 255, 0.3)',
            borderRadius: '8px',
            color: '#00f5ff',
            cursor: 'pointer',
            padding: '6px',
            display: isDesktop ? 'none' : 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            outline: 'none',
            flexShrink: 0,
            transition: 'all 0.15s ease'
          }}
        >
          <Menu size={17} color="#00f5ff" strokeWidth={2.5} />
        </button>

        {/* Mobile Logo + $VIBE HUB */}
        <div
          className="mobile-brand-pill"
          style={{
            display: isDesktop ? 'none' : 'flex',
            alignItems: 'center',
            gap: '6px',
            userSelect: 'none',
            flexShrink: 0
          }}
        >
          <img
            src="/new-logo.png"
            alt="VIBE"
            style={{
              width: '24px',
              height: '24px',
              borderRadius: '6px',
              objectFit: 'cover',
              border: '1.5px solid #00f5ff',
              boxShadow: '0 0 8px rgba(0, 245, 255, 0.4)',
              flexShrink: 0
            }}
          />
          <span
            style={{
              fontSize: '9px',
              fontWeight: 900,
              color: '#00f5ff',
              letterSpacing: '0.3px',
              whiteSpace: 'nowrap'
            }}
          >
            $VIBE HUB
          </span>
        </div>

        {/* Desktop Active View Title / Breadcrumb */}
        <div
          className="desktop-header-title"
          style={{
            display: isDesktop ? 'flex' : 'none',
            alignItems: 'center',
            gap: '10px'
          }}
        >
          <span
            style={{
              fontSize: '11px',
              fontWeight: 900,
              color: '#ffffff',
              letterSpacing: '0.6px',
              whiteSpace: 'nowrap'
            }}
          >
            {pageTitle}
          </span>
        </div>
      </div>

      {/* Right side: Balances or Connect Wallet */}
      <div className="base-app-header-right" style={{ display: 'flex', alignItems: 'center', gap: '6px', flexShrink: 0 }}>
        <AgentsButton theme="pixel" />
        {hasWallet && <WalletToggle theme="pixel" size="sm" />}
        <ThemeSwitcher />
        {hasWallet ? (
          <div className="header-balances-wrap" style={{ display: 'flex', alignItems: 'center', gap: '5px' }}>
            {/* Daily Streak Pill */}
            <div
              className="header-balance-pill header-streak-pill"
              title={`Daily Check-In Streak: ${streak} ${streak === 1 ? 'Day' : 'Days'}`}
              style={{
                background: 'rgba(4, 14, 36, 0.9)',
                border: '1.5px solid rgba(255, 170, 0, 0.45)',
                boxShadow: '0 0 8px rgba(255, 170, 0, 0.2)',
                borderRadius: '8px',
                padding: '5px 8px',
                display: 'flex',
                alignItems: 'center',
                gap: '5px',
                userSelect: 'none',
                flexShrink: 0
              }}
            >
              <span
                className="header-balance-text"
                style={{
                  fontSize: '7.5px',
                  fontWeight: 900,
                  color: '#ffaa00',
                  letterSpacing: '0.2px',
                  fontVariantNumeric: 'tabular-nums',
                  textShadow: '0 0 8px rgba(255, 170, 0, 0.5)',
                  whiteSpace: 'nowrap'
                }}
              >
                {streak}
              </span>
              <Flame size={13} color="#ffaa00" strokeWidth={2.5} style={{ filter: 'drop-shadow(0 0 4px rgba(255, 170, 0, 0.8))', flexShrink: 0 }} />
            </div>

            {/* NFT Balance Pill */}
            <div
              className="header-balance-pill header-nft-pill"
              title="Vibe Club NFT Balance"
              style={{
                background: 'rgba(4, 14, 36, 0.9)',
                border: '1.5px solid rgba(0, 245, 255, 0.3)',
                boxShadow: '0 0 8px rgba(0, 245, 255, 0.15)',
                borderRadius: '8px',
                padding: '5px 7px',
                display: 'flex',
                alignItems: 'center',
                gap: '4px',
                userSelect: 'none',
                flexShrink: 0
              }}
            >
              <span
                className="header-balance-text"
                style={{
                  fontSize: '7px',
                  fontWeight: 900,
                  color: '#00f5ff',
                  letterSpacing: '0.2px',
                  fontVariantNumeric: 'tabular-nums',
                  whiteSpace: 'nowrap'
                }}
              >
                {nftCount} NFT
              </span>
              <img
                src="/new-logo.png"
                alt="NFT"
                className="header-balance-icon"
                style={{
                  width: '12px',
                  height: '12px',
                  borderRadius: '3px',
                  objectFit: 'cover',
                  flexShrink: 0
                }}
              />
            </div>

            {/* $VIBE Token Balance Pill */}
            <div
              className="header-balance-pill header-token-pill"
              title="$VIBE Token Balance"
              style={{
                background: 'rgba(4, 14, 36, 0.9)',
                border: '1.5px solid rgba(0, 255, 136, 0.35)',
                boxShadow: '0 0 8px rgba(0, 255, 136, 0.15)',
                borderRadius: '8px',
                padding: '5px 7px',
                display: 'flex',
                alignItems: 'center',
                gap: '4px',
                userSelect: 'none',
                flexShrink: 0
              }}
            >
              <span
                className="header-balance-text"
                style={{
                  fontSize: '7px',
                  fontWeight: 900,
                  color: '#00ff88',
                  letterSpacing: '0.2px',
                  fontVariantNumeric: 'tabular-nums',
                  textShadow: '0 0 8px rgba(0, 255, 136, 0.4)',
                  whiteSpace: 'nowrap'
                }}
              >
                {formattedBalance}
              </span>
              <img
                src="/new-logo.png"
                alt="$VIBE"
                className="header-balance-icon"
                style={{
                  width: '12px',
                  height: '12px',
                  borderRadius: '3px',
                  objectFit: 'cover',
                  flexShrink: 0
                }}
              />
            </div>
          </div>
        ) : (
          <button
            onClick={login}
            className="header-connect-btn"
            style={{
              background: 'linear-gradient(135deg, #00f5ff 0%, #00b8ff 100%)',
              color: '#020b1a',
              border: '1.5px solid #00f5ff',
              borderRadius: '8px',
              padding: '6px 10px',
              fontSize: '7px',
              fontWeight: 900,
              cursor: 'pointer',
              display: 'inline-flex',
              alignItems: 'center',
              gap: '5px',
              boxShadow: '0 0 12px rgba(0, 245, 255, 0.45)',
              transition: 'all 0.2s ease',
              outline: 'none',
              textTransform: 'uppercase',
              whiteSpace: 'nowrap',
              flexShrink: 0
            }}
          >
            <Wallet size={11} color="#020b1a" strokeWidth={2.5} />
            <span>CONNECT</span>
          </button>
        )}
      </div>
    </header>
  );
}

