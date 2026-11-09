import React, { useState, useEffect, lazy, Suspense } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { BaseAppHeader } from './BaseAppHeader';
import { BaseAppSidebar } from './BaseAppSidebar';
import { BaseAppBottomNav } from './BaseAppBottomNav';
import WalletToggle from '../../../components/wallet/WalletToggle';
import DemoBanner from '../../../components/demo/DemoBanner';
import { TryDemoStrip } from '../../../components/demo/TryDemoButton';
import { PageHeader } from './ui';
// The page stylesheets stay in the first bundle, in the order they always had, so lazy pages look exactly the same.
import '../../../components/wallet/WalletPages.css';
import '../../../components/agent/AgentsPage.css';
import '../../../components/agent/SkillPage.css';
import './BaseAppTheme.css';

// Pages other than the Rewards Hub load on demand, so the first visit downloads less. Once the app has shown,
// they are fetched in the background, so moving between pages stays instant.
const PAGES = {
  Checker: () => import('../Checker'),
  NftClubPage: () => import('../pages/NftClubPage'),
  DeFiVibePanel: () => import('./DeFiVibePanel'),
  TokenomicsPage: () => import('../pages/TokenomicsPage'),
  WalletPage: () => import('../../../components/wallet/WalletPage'),
  AccountPage: () => import('../../../components/wallet/AccountPage'),
  AgentsPage: () => import('../../../components/agent/AgentsPage'),
  SettingsPage: () => import('../../../components/wallet/SettingsPage'),
  SkillPage: () => import('../../../components/agent/SkillPage'),
  ContractsPage: () => import('../pages/ContractsPage'),
  BaseAppAdminView: () => import('./BaseAppAdminView'),
};
const Checker = lazy(PAGES.Checker);
const NftClubPage = lazy(PAGES.NftClubPage);
const DeFiVibePanel = lazy(PAGES.DeFiVibePanel);
const TokenomicsPage = lazy(PAGES.TokenomicsPage);
const WalletPage = lazy(PAGES.WalletPage);
const AccountPage = lazy(PAGES.AccountPage);
const AgentsPage = lazy(PAGES.AgentsPage);
const SettingsPage = lazy(PAGES.SettingsPage);
const SkillPage = lazy(PAGES.SkillPage);
const ContractsPage = lazy(PAGES.ContractsPage);
const BaseAppAdminView = lazy(PAGES.BaseAppAdminView);

let pagesWarm = false;
function warmPages() {
  if (pagesWarm) return;
  pagesWarm = true;
  const run = () => Object.values(PAGES).forEach((load) => load().catch(() => {}));
  if (typeof window.requestIdleCallback === 'function') window.requestIdleCallback(run, { timeout: 4000 });
  else setTimeout(run, 1500);
}

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
  useEffect(() => { warmPages(); }, []);
  
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
    if (path.includes('agents')) return 'agents';
    if (path.includes('settings')) return 'settings';
    if (path.includes('skill')) return 'skill';
    if (path.includes('wallet')) return 'wallet';
    if (path.includes('account')) return 'account';
    if (path.includes('tokenomics')) return 'tokenomics';
    if (path.includes('contracts') || path.includes('adresses') || path.includes('addresses')) return 'contracts';
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
    // The docs are a page of their own, outside this shell.
    if (tabId === 'docs') {
      navigate('/docs');
      return;
    }
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
    } else if (tabId === 'wallet' || tabId === 'account' || tabId === 'agents' || tabId === 'settings' || tabId === 'skill') {
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
      <div className="base-app-shell" style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column', width: '100%', maxWidth: '100vw', margin: 0, padding: 0 }}>
        
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
          {/* Phones: the Try demo strip (desktop has the button in the header). While the demo is on: its banner. */}
          {!isDesktop && <TryDemoStrip />}
          <DemoBanner />

          {/* Top Header */}
          <BaseAppHeader
            isDesktop={isDesktop}
            onOpenSidebar={() => setIsMobileSidebarOpen(true)}
            activeTab={activeTab}
          />

          {/* View Content: Buy, Claim, Profile, Vibe Club, Tokenomics, Contracts, Rewards Hub */}
          <main key={activeTab} style={{ flex: 1, paddingBottom: isDesktop ? '40px' : '90px' }}>
            <Suspense fallback={null}>
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
              <Checker isProfileMode={activeTab === 'profile'} />
            ) : activeTab === 'vibeclub' ? (
              <section style={{ padding: '24px 0 60px 0' }}>
                <div style={{ maxWidth: '1040px', margin: '0 auto', padding: '0 14px' }}>
                  <PageHeader
                    title="Vibe Club NFT"
                    description="Exclusive 333 genesis membership pass with lifetime royalty payouts"
                  />
                  <NftClubPage />
                </div>
              </section>
            ) : activeTab === 'tokenomics' ? (
              <section style={{ padding: '24px 0 60px 0' }}>
                <div style={{ maxWidth: '1040px', margin: '0 auto', padding: '0 14px' }}>
                  <PageHeader
                    title="Tokenomics"
                    description="Fair launch with zero team allocations, deflationary buybacks, and community rewards"
                  />
                  <TokenomicsPage />
                </div>
              </section>
            ) : activeTab === 'contracts' ? (
              <section style={{ padding: '24px 0 60px 0' }}>
                <div style={{ maxWidth: '1040px', margin: '0 auto', padding: '0 14px' }}>
                  <PageHeader
                    title="Official addresses"
                    description="Verified smart contracts and operational protocol addresses on Base"
                  />
                  <ContractsPage />
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
            ) : activeTab === 'agents' ? (
              <section style={{ padding: '24px 0 60px 0' }}>
                <div style={{ maxWidth: '1040px', margin: '0 auto', padding: '0 14px' }}>
                  <AgentsPage theme="o1" />
                </div>
              </section>
            ) : activeTab === 'skill' ? (
              <section style={{ padding: '24px 0 60px 0' }}>
                <div style={{ maxWidth: '1040px', margin: '0 auto', padding: '0 14px' }}>
                  <SkillPage theme="o1" onOpenAgents={() => handleSelectTab('agents')} />
                </div>
              </section>
            ) : activeTab === 'settings' ? (
              <section style={{ padding: '24px 0 60px 0' }}>
                <div style={{ maxWidth: '640px', margin: '0 auto', padding: '0 14px' }}>
                  <PageHeader title="Settings" description="What your agent can do with the Vibe Agent Wallet and its daily limits" />
                  <SettingsPage theme="o1" onOpenAgents={() => handleSelectTab('agents')} />
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
              RewardsComponent ? <RewardsComponent /> : null
            )}
            </Suspense>
          </main>

          {/* Fixed Bottom Navigation Bar (Mobile Only) */}
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

