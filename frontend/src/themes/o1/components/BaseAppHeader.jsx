import { Menu, Wallet, Flame, Crown } from 'lucide-react';
import { usePrivy, useWallets } from '@privy-io/react-auth';
import { useAccount } from 'wagmi';
import { useVibeBalances } from '../../../hooks/useVibeBalances';
import { useVibeCheckIn } from '../../../hooks/useVibeCheckIn';
import { ThemeSwitcher } from './ThemeSwitcher';
import WalletToggle from '../../../components/wallet/WalletToggle';
import AgentsButton from '../../../components/agent/AgentsButton';
import { useVibeWallets } from '../../../hooks/useVibeWallets';

export function BaseAppHeader({ onOpenSidebar, isDesktop = false }) {
  const { login, authenticated, user } = usePrivy();
  const { wallets } = useWallets();
  const { address: wagmiAddress, isConnected: isWagmiConnected } = useAccount();

  const { activeAddress: vibeActiveAddress } = useVibeWallets();
  const activeAddress = vibeActiveAddress || wallets?.[0]?.address || wagmiAddress;
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
        padding: isDesktop ? '0 24px' : '0 8px',
        position: 'sticky',
        top: 0,
        zIndex: 50,
        color: 'var(--text)',
        fontFamily: 'var(--font-sans)',
        boxSizing: 'border-box'
      }}
    >
      {/* Left side: Mobile hamburger menu & logo */}
      <div style={{ display: 'flex', alignItems: 'center', gap: isDesktop ? '10px' : '4px', flexShrink: 0 }}>
        {!isDesktop && (
          <button
            onClick={onOpenSidebar}
            aria-label="Open menu"
            style={{
              background: 'transparent',
              border: 'none',
              color: 'var(--text-2)',
              cursor: 'pointer',
              padding: isDesktop ? '6px' : '4px',
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
              src="/new-logo.png"
              alt="VIBE"
              style={{
                width: '24px',
                height: '24px',
                borderRadius: '6px',
                objectFit: 'cover',
                border: '1px solid var(--border)'
              }}
            />
          </div>
        )}
      </div>

      {/* Right side: Three pills or Connect Wallet */}
      <div style={{ display: 'flex', alignItems: 'center', gap: isDesktop ? '8px' : '4px', minWidth: 0 }}>
        <AgentsButton theme="o1" />
        {hasWallet && <WalletToggle theme="o1" size="sm" />}
        {isDesktop && <ThemeSwitcher />}
        {hasWallet ? (
          <>
            {/* 1. Streak Pill */}
            <div
              className="vh-pill"
              title={`Daily streak: ${streak} ${streak === 1 ? 'day' : 'days'}`}
              style={{
                height: isDesktop ? '36px' : '32px',
                padding: isDesktop ? '0 12px' : '0 7px',
                borderRadius: '999px',
                background: 'var(--surface)',
                border: '1px solid var(--border)',
                display: 'flex',
                alignItems: 'center',
                gap: isDesktop ? '6px' : '4px',
                flexShrink: 0,
                whiteSpace: 'nowrap',
                userSelect: 'none'
              }}
            >
              <Flame size={isDesktop ? 16 : 14} color="var(--amber)" strokeWidth={1.75} />
              <span
                className="mono"
                style={{
                  fontSize: isDesktop ? '14px' : '13px',
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
              className="vh-pill"
              title="Vibe Club NFT balance"
              style={{
                height: isDesktop ? '36px' : '32px',
                padding: isDesktop ? '0 12px' : '0 7px',
                borderRadius: '999px',
                background: 'var(--surface)',
                border: '1px solid var(--border)',
                display: 'flex',
                alignItems: 'center',
                gap: isDesktop ? '6px' : '4px',
                flexShrink: 0,
                whiteSpace: 'nowrap',
                userSelect: 'none'
              }}
            >
              {isDesktop && <Crown size={16} color="var(--text-2)" strokeWidth={1.75} />}
              <span
                className="mono"
                style={{
                  fontSize: isDesktop ? '14px' : '13px',
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
              className="vh-pill"
              title="$VIBE token balance"
              style={{
                height: isDesktop ? '36px' : '32px',
                padding: isDesktop ? '0 12px' : '0 7px',
                borderRadius: '999px',
                background: 'var(--surface)',
                border: '1px solid var(--border)',
                display: 'flex',
                alignItems: 'center',
                gap: isDesktop ? '6px' : '4px',
                flexShrink: 0,
                whiteSpace: 'nowrap',
                userSelect: 'none'
              }}
            >
              <img
                src="/new-logo.png"
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
                  fontSize: isDesktop ? '14px' : '13px',
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
      </div>
    </header>
  );
}
