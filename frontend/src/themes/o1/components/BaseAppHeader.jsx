import { Menu, Wallet, Flame, Crown } from 'lucide-react';
import { usePrivy, useWallets } from '@privy-io/react-auth';
import { useAccount } from 'wagmi';
import { useVibeBalances } from '../../../hooks/useVibeBalances';
import { useVibeCheckIn } from '../../../hooks/useVibeCheckIn';
import { ThemeSwitcher } from './ThemeSwitcher';

export function BaseAppHeader({ onOpenSidebar, isDesktop = false }) {
  const { login, authenticated, user } = usePrivy();
  const { wallets } = useWallets();
  const { address: wagmiAddress, isConnected: isWagmiConnected } = useAccount();

  const activeAddress = user?.wallet?.address || wallets?.[0]?.address || wagmiAddress;
  const hasWallet = (authenticated && !!activeAddress) || (isWagmiConnected && !!wagmiAddress);

  const { nftCount, formattedBalance } = useVibeBalances(activeAddress);
  const { streak } = useVibeCheckIn(activeAddress);

  return (
    <header
      className="base-app-header"
      style={{
        height: '64px',
        background: 'var(--bg-bar)',
        borderBottom: '1px solid var(--border)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        padding: '0 24px',
        position: 'sticky',
        top: 0,
        zIndex: 50,
        color: 'var(--text)',
        fontFamily: 'var(--font-sans)',
        boxSizing: 'border-box'
      }}
    >
      {/* Left side: Mobile hamburger menu & logo */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
        {!isDesktop && (
          <button
            onClick={onOpenSidebar}
            aria-label="Open menu"
            style={{
              background: 'transparent',
              border: 'none',
              color: 'var(--text-2)',
              cursor: 'pointer',
              padding: '6px',
              borderRadius: '8px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center'
            }}
          >
            <Menu size={20} strokeWidth={1.75} />
          </button>
        )}

        {!isDesktop && (
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', userSelect: 'none' }}>
            <img
              src="/new-logo-vibe.png"
              alt="VIBE"
              style={{
                width: '24px',
                height: '24px',
                borderRadius: '6px',
                objectFit: 'cover',
                border: '1px solid var(--border)'
              }}
            />
            <span
              className="vh-brand"
              style={{
                fontFamily: 'var(--font-sans)',
                fontSize: '15px',
                fontWeight: 800,
                letterSpacing: '-0.02em',
                color: 'var(--text)'
              }}
            >
              $VIBE HUB
            </span>
          </div>
        )}
      </div>

      {/* Right side: Three pills or Connect Wallet */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
        {hasWallet ? (
          <>
            {/* 1. Streak Pill */}
            <div
              title={`Daily streak: ${streak} ${streak === 1 ? 'day' : 'days'}`}
              style={{
                height: '36px',
                padding: '0 12px',
                borderRadius: '999px',
                background: 'var(--surface)',
                border: '1px solid var(--border)',
                display: 'flex',
                alignItems: 'center',
                gap: '6px',
                userSelect: 'none'
              }}
            >
              <Flame size={16} color="var(--amber)" strokeWidth={1.75} />
              <span
                className="mono"
                style={{
                  fontSize: '14px',
                  fontWeight: 500,
                  color: 'var(--text)',
                  fontFamily: 'var(--font-mono)'
                }}
              >
                {streak || 0}
              </span>
            </div>

            {/* 2. NFT Count Pill */}
            <div
              title="Vibe Club NFT balance"
              style={{
                height: '36px',
                padding: '0 12px',
                borderRadius: '999px',
                background: 'var(--surface)',
                border: '1px solid var(--border)',
                display: 'flex',
                alignItems: 'center',
                gap: '6px',
                userSelect: 'none'
              }}
            >
              <Crown size={16} color="var(--text-2)" strokeWidth={1.75} />
              <span
                className="mono"
                style={{
                  fontSize: '14px',
                  fontWeight: 500,
                  color: 'var(--text)',
                  fontFamily: 'var(--font-mono)'
                }}
              >
                {nftCount || 0} NFT
              </span>
            </div>

            {/* 3. Balance Pill */}
            <div
              title="$VIBE token balance"
              style={{
                height: '36px',
                padding: '0 12px',
                borderRadius: '999px',
                background: 'var(--surface)',
                border: '1px solid var(--border)',
                display: 'flex',
                alignItems: 'center',
                gap: '6px',
                userSelect: 'none'
              }}
            >
              <img
                src="/new-logo-vibe.png"
                alt="$VIBE"
                style={{
                  width: '16px',
                  height: '16px',
                  borderRadius: '50%',
                  objectFit: 'cover'
                }}
              />
              <span
                className="mono"
                style={{
                  fontSize: '14px',
                  fontWeight: 500,
                  color: 'var(--text)',
                  fontFamily: 'var(--font-mono)'
                }}
              >
                {formattedBalance || '0'}
              </span>
            </div>
          </>
        ) : (
          <button
            onClick={login}
            className="btn btn-primary"
            style={{
              height: '36px',
              padding: '0 16px',
              borderRadius: '999px',
              fontSize: '14px'
            }}
          >
            <Wallet size={16} strokeWidth={1.75} />
            <span>Connect wallet</span>
          </button>
        )}
        <ThemeSwitcher />
      </div>
    </header>
  );
}
