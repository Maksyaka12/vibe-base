import React, { useState, useEffect } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { BaseAppHeader } from './BaseAppHeader';
import { BaseAppSidebar } from './BaseAppSidebar';
import { BaseAppBottomNav } from './BaseAppBottomNav';
import Checker from '../Checker';
import NftClubPage from '../pages/NftClubPage';
import DeFiVibePanel from './DeFiVibePanel';
import TokenomicsPage from '../pages/TokenomicsPage';
import WalletPage from '../../../components/wallet/WalletPage';
import AccountPage from '../../../components/wallet/AccountPage';
import WalletToggle from '../../../components/wallet/WalletToggle';
import ContractsPage from '../pages/ContractsPage';
import BaseAppAdminView from './BaseAppAdminView';
import { PageHeader } from './ui';
import './BaseAppTheme.css';

class BaseAppErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null };
  }
  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }
  componentDidCatch(error, errorInfo) {
    console.error('BaseAppView Error:', error, errorInfo);
  }
  render() {
    if (this.state.hasError) {
      return (
        <div style={{ padding: '40px 20px', textAlign: 'center', color: 'var(--accent)', fontFamily: 'var(--font-sans)' }}>
          <h2 style={{ fontSize: '14px', marginBottom: '16px', color: 'var(--red)' }}>UNEXPECTED ERROR</h2>
          <p style={{ fontSize: '9px', lineHeight: 1.6, color: 'var(--text-2)', marginBottom: '20px' }}>
            {this.state.error?.message || 'Failed to load Base App view.'}
          </p>
          <button
            onClick={() => window.location.reload()}
            style={{
              padding: '10px 18px',
              background: 'var(--accent)',
              color: 'var(--bg)',
              border: 'none',
              borderRadius: '8px',
              fontWeight: 900,
              fontFamily: 'var(--font-sans)',
              fontSize: '8px',
              cursor: 'pointer'
            }}
          >
            RELOAD
          </button>
        </div>
      );
    }
    return this.props.children;
  }
}

export function BaseAppView({ RewardsComponent }) {
  const location = useLocation();
  const navigate = useNavigate();
  
  // Mobile drawer state
  const [isMobileSidebarOpen, setIsMobileSidebarOpen] = useState(false);

  // Desktop viewport check (>= 1024px)
  const [isDesktop, setIsDesktop] = useState(() => {
    if (typeof window !== 'undefined') {
      return window.innerWidth >= 1024;
    }
    return false;
  });

  // Desktop sidebar collapsed state with localStorage persistence
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(() => {
    if (typeof window !== 'undefined') {
      try {
        return localStorage.getItem('vibe_sidebar_collapsed') === 'true';
      } catch (e) {
        return false;
      }
    }
    return false;
  });

  useEffect(() => {
    const handleResize = () => {
      const desktop = window.innerWidth >= 1024;
      setIsDesktop(desktop);
      if (desktop) {
        setIsMobileSidebarOpen(false);
      }
    };
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  const toggleSidebarCollapse = () => {
    setIsSidebarCollapsed(prev => {
      const next = !prev;
      try {
        localStorage.setItem('vibe_sidebar_collapsed', String(next));
      } catch (e) {}
      return next;
    });
  };

  const getInitialTab = () => {
    const path = location.pathname.toLowerCase();
    if (path.includes('admin')) return 'admin';
    if (path.includes('buy') || path.includes('swap') || path.includes('exchange') || path.includes('trade')) return 'buy';
    if (path.includes('claim') || path.includes('checker') || path.includes('portal')) return 'claim';
    if (path.includes('vibeclub') || path.includes('vibe-club') || path.includes('mint') || path.includes('nft') || path.includes('nft-club')) return 'vibeclub';
    if (path.includes('profile') || path.includes('dashboard')) return 'profile';
    if (path.includes('wallet')) return 'wallet';
    if (path.includes('account')) return 'account';
    if (path.includes('tokenomics')) return 'tokenomics';
    if (path.includes('contracts') || path.includes('adresses') || path.includes('addresses') || path.includes('docs')) return 'contracts';
    if (path.includes('hub') || path.includes('rewards') || path.includes('events')) return 'hub';
    return 'hub';
  };

  const [activeTab, setActiveTab] = useState(getInitialTab);

  useEffect(() => {
    const current = getInitialTab();
    if (current !== activeTab) {
      setActiveTab(current);
    }
  }, [location.pathname]);

  const handleSelectTab = (tabId) => {
    setActiveTab(tabId);
    const isAppPrefix = location.pathname.startsWith('/app');
    const prefix = isAppPrefix ? '/app' : '';

    if (tabId === 'home') {
      navigate(prefix ? '/app/hub' : '/hub', { replace: false });
    } else if (tabId === 'admin') {
      navigate(prefix ? '/app/admin' : '/admin', { replace: false });
    } else if (tabId === 'buy') {
      navigate(prefix ? '/app/buy' : '/buy', { replace: false });
    } else if (tabId === 'claim') {
      navigate(prefix ? '/app/claim' : '/claim', { replace: false });
    } else if (tabId === 'vibeclub') {
      navigate(prefix ? '/app/vibeclub' : '/vibeclub', { replace: false });
    } else if (tabId === 'wallet' || tabId === 'account') {
      navigate(`${prefix}/${tabId}`, { replace: false });
    } else if (tabId === 'profile') {
      navigate(prefix ? '/app/profile' : '/profile', { replace: false });
    } else if (tabId === 'tokenomics') {
      navigate(prefix ? '/app/tokenomics' : '/tokenomics', { replace: false });
    } else if (tabId === 'contracts') {
      navigate(prefix ? '/app/contracts' : '/contracts', { replace: false });
    } else {
      navigate(prefix ? '/app/hub' : '/hub', { replace: false });
    }
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  // Compute desktop margin-left based on sidebar state (248px expanded, 64px collapsed)
  const desktopMarginLeft = isDesktop ? (isSidebarCollapsed ? '64px' : '248px') : '0px';

  return (
    <BaseAppErrorBoundary>
      <div className="base-app-pixel-theme" style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column', width: '100%', maxWidth: '100vw', margin: 0, padding: 0 }}>
        
        {/* Desktop Persistent Left Sidebar */}
        {isDesktop && (
          <BaseAppSidebar
            isDesktop={true}
            isCollapsed={isSidebarCollapsed}
            onToggleCollapse={toggleSidebarCollapse}
            activeTab={activeTab}
            onSelectTab={handleSelectTab}
            isOpen={true}
            onClose={() => {}}
          />
        )}

        {/* Mobile Drawer Sidebar */}
        {!isDesktop && (
          <BaseAppSidebar
            isDesktop={false}
            isOpen={isMobileSidebarOpen}
            onClose={() => setIsMobileSidebarOpen(false)}
            activeTab={activeTab}
            onSelectTab={handleSelectTab}
          />
        )}

        {/* Main Application Container (Adapts margin-left on Desktop) */}
        <div
          className="base-app-main-content-wrap"
          style={{
            marginLeft: desktopMarginLeft,
            transition: 'margin-left 0.25s cubic-bezier(0.16, 1, 0.3, 1)',
            minHeight: '100vh',
            display: 'flex',
            flexDirection: 'column',
            width: isDesktop ? `calc(100% - ${desktopMarginLeft})` : '100%',
            maxWidth: '100%',
            boxSizing: 'border-box'
          }}
        >
          {/* Top Header */}
          <BaseAppHeader
            isDesktop={isDesktop}
            onOpenSidebar={() => setIsMobileSidebarOpen(true)}
            activeTab={activeTab}
          />

          {/* View Content: Buy, Claim, Profile, Vibe Club, Tokenomics, Contracts, Rewards Hub */}
          <main style={{ flex: 1, paddingBottom: isDesktop ? '40px' : '90px' }}>
            {activeTab === 'buy' ? (
              <section style={{ padding: '24px 0 60px 0' }}>
                <div style={{ maxWidth: '480px', margin: '0 auto', padding: '0 14px' }}>
                  <PageHeader
                    title="Swap"
                    description="Instant exchange on Base via optimal liquidity routing"
                  />
                  <WalletToggle theme="o1" size="md" label="Swap with" />
                  <DeFiVibePanel />
                </div>
              </section>
            ) : (activeTab === 'claim' || activeTab === 'profile') ? (
              <Checker isBaseAppMode={true} isProfileMode={activeTab === 'profile'} />
            ) : activeTab === 'vibeclub' ? (
              <section style={{ padding: '24px 0 60px 0' }}>
                <div style={{ maxWidth: '1040px', margin: '0 auto', padding: '0 14px' }}>
                  <PageHeader
                    title="Vibe Club NFT"
                    description="Exclusive 333 genesis membership pass with lifetime royalty payouts"
                  />
                  <NftClubPage isEmbeddedInBaseApp={true} />
                </div>
              </section>
            ) : activeTab === 'tokenomics' ? (
              <section style={{ padding: '24px 0 60px 0' }}>
                <div style={{ maxWidth: '1040px', margin: '0 auto', padding: '0 14px' }}>
                  <PageHeader
                    title="Tokenomics"
                    description="Fair launch with zero team allocations, deflationary buybacks, and community rewards"
                  />
                  <TokenomicsPage isBaseAppMode={true} />
                </div>
              </section>
            ) : activeTab === 'contracts' ? (
              <section style={{ padding: '24px 0 60px 0' }}>
                <div style={{ maxWidth: '1040px', margin: '0 auto', padding: '0 14px' }}>
                  <PageHeader
                    title="Official addresses"
                    description="Verified smart contracts and operational protocol addresses on Base"
                  />
                  <ContractsPage isBaseAppMode={true} />
                </div>
              </section>
            ) : activeTab === 'wallet' ? (
              <section style={{ padding: '24px 0 60px 0' }}>
                <div style={{ maxWidth: '560px', margin: '0 auto', padding: '0 14px' }}>
                  <PageHeader
                    title="Wallet"
                    description="Balances, deposits and transfers for your Vibe Hub wallets"
                  />
                  <WalletPage theme="o1" onSwap={() => handleSelectTab('buy')} />
                </div>
              </section>
            ) : activeTab === 'account' ? (
              <section style={{ padding: '24px 0 60px 0' }}>
                <div style={{ maxWidth: '560px', margin: '0 auto', padding: '0 14px' }}>
                  <AccountPage theme="o1" onOpenWallet={() => handleSelectTab('wallet')} />
                </div>
              </section>
            ) : activeTab === 'admin' ? (
              <section style={{ padding: '24px 0 60px 0' }}>
                <div style={{ maxWidth: '1040px', margin: '0 auto', padding: '0 14px' }}>
                  <PageHeader
                    title="Admin controls"
                    description="Merkle root publishers, distributor controls, and NFT contract operations"
                  />
                  <BaseAppAdminView />
                </div>
              </section>
            ) : (
              RewardsComponent ? <RewardsComponent isBaseAppMode={true} /> : null
            )}
          </main>

          {/* Fixed Bottom Pixel Navigation Bar (Mobile Only) */}
          {!isDesktop && (
            <BaseAppBottomNav
              activeTab={activeTab}
              onSelectTab={handleSelectTab}
            />
          )}
        </div>

      </div>
    </BaseAppErrorBoundary>
  );
}

