import React, { useState, useEffect } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { BaseAppHeader } from './BaseAppHeader';
import { BaseAppSidebar } from './BaseAppSidebar';
import { BaseAppBottomNav } from './BaseAppBottomNav';
import Checker from '../Checker';
import NftClubPage from '../pages/NftClubPage';
import DeFiVibePanel from './DeFiVibePanel';
import TokenomicsPage from '../pages/TokenomicsPage';
import ContractsPage from '../pages/ContractsPage';
import BaseAppAdminView from './BaseAppAdminView';
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
        <div style={{ padding: '40px 20px', textAlign: 'center', color: '#00f5ff', fontFamily: "'Press Start 2P', monospace" }}>
          <h2 style={{ fontSize: '14px', marginBottom: '16px', color: '#ff4466' }}>UNEXPECTED ERROR</h2>
          <p style={{ fontSize: '9px', lineHeight: 1.6, color: '#cbd5e1', marginBottom: '20px' }}>
            {this.state.error?.message || 'Failed to load Base App view.'}
          </p>
          <button
            onClick={() => window.location.reload()}
            style={{
              padding: '10px 18px',
              background: '#00f5ff',
              color: '#020b1a',
              border: 'none',
              borderRadius: '8px',
              fontWeight: 900,
              fontFamily: "'Press Start 2P', monospace",
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

  // Compute desktop margin-left based on sidebar state
  const desktopMarginLeft = isDesktop ? (isSidebarCollapsed ? '72px' : '290px') : '0px';

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
              <div className="swap-view-container" style={{ padding: '20px 12px 60px 12px', maxWidth: '560px', margin: '0 auto', width: '100%', boxSizing: 'border-box' }}>
                {/* Swap Hero Header */}
                <div
                  className="rewards-hero-header"
                  style={{
                    width: '100%',
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'center',
                    justifyContent: 'center',
                    textAlign: 'center',
                    marginBottom: '20px',
                    padding: '12px 8px 8px 8px'
                  }}
                >
                  <h2
                    className="rewards-hero-title"
                    style={{
                      fontSize: '18px',
                      margin: '0 0 12px 0',
                      letterSpacing: '0.6px',
                      color: '#ffffff',
                      fontFamily: "'Press Start 2P', monospace",
                      textAlign: 'center',
                      width: '100%',
                      lineHeight: 1.3
                    }}
                  >
                    SWAP <span style={{ color: '#00f5ff' }}>$VIBE</span>
                  </h2>

                  <div
                    className="rewards-hero-pill"
                    style={{
                      display: 'inline-flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      gap: '8px',
                      background: 'rgba(0, 245, 255, 0.08)',
                      border: '1.5px solid rgba(0, 245, 255, 0.35)',
                      borderRadius: '99px',
                      padding: '7px 16px',
                      maxWidth: '100%',
                      boxSizing: 'border-box'
                    }}
                  >
                    <span style={{ width: '6px', height: '6px', borderRadius: '50%', background: '#00ff88', boxShadow: '0 0 8px #00ff88', flexShrink: 0 }} />
                    <span className="rewards-hero-pill-text" style={{ fontSize: '6.5px', color: '#00f5ff', letterSpacing: '0.5px', fontFamily: "'Press Start 2P', monospace", fontWeight: 800, textAlign: 'center', lineHeight: 1.4 }}>
                      INSTANT ON-CHAIN SWAP · BASE MAINNET
                    </span>
                  </div>
                </div>

                {/* Embedded DeFi Swap Widget Card */}
                <div
                  className="swap-widget-card"
                  style={{
                    background: 'linear-gradient(180deg, rgba(6, 26, 60, 0.95) 0%, rgba(2, 11, 26, 0.98) 100%)',
                    border: '1.5px solid rgba(0, 245, 255, 0.35)',
                    borderRadius: '18px',
                    padding: '16px 14px',
                    boxShadow: '0 8px 32px rgba(0, 0, 0, 0.8), 0 0 16px rgba(0, 245, 255, 0.15)'
                  }}
                >
                  <DeFiVibePanel />
                </div>
              </div>
            ) : (activeTab === 'claim' || activeTab === 'profile') ? (
              <Checker isBaseAppMode={true} isProfileMode={activeTab === 'profile'} />
            ) : activeTab === 'vibeclub' ? (
              <div className="vibeclub-view-container" style={{ width: '100%', boxSizing: 'border-box', padding: '20px 12px 60px 12px' }}>
                {/* Vibe Club Hero Header */}
                <div
                  className="rewards-hero-header"
                  style={{
                    width: '100%',
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'center',
                    justifyContent: 'center',
                    textAlign: 'center',
                    marginBottom: '20px',
                    padding: '12px 8px 8px 8px'
                  }}
                >
                  <h2
                    className="rewards-hero-title"
                    style={{
                      fontSize: '18px',
                      margin: '0 0 12px 0',
                      letterSpacing: '0.6px',
                      color: '#ffffff',
                      fontFamily: "'Press Start 2P', monospace",
                      textAlign: 'center',
                      width: '100%',
                      lineHeight: 1.3
                    }}
                  >
                    VIBE CLUB <span style={{ color: '#00f5ff' }}>NFT</span>
                  </h2>

                  <div
                    className="rewards-hero-pill"
                    style={{
                      display: 'inline-flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      gap: '8px',
                      background: 'rgba(0, 245, 255, 0.08)',
                      border: '1.5px solid rgba(0, 245, 255, 0.35)',
                      borderRadius: '99px',
                      padding: '7px 16px',
                      maxWidth: '100%',
                      boxSizing: 'border-box'
                    }}
                  >
                    <span style={{ width: '6px', height: '6px', borderRadius: '50%', background: '#00ff88', boxShadow: '0 0 8px #00ff88', flexShrink: 0 }} />
                    <span className="rewards-hero-pill-text" style={{ fontSize: '6.5px', color: '#00f5ff', letterSpacing: '0.5px', fontFamily: "'Press Start 2P', monospace", fontWeight: 800, textAlign: 'center', lineHeight: 1.4 }}>
                      EXCLUSIVE 333 MEMBERSHIP · PASSIVE ROYALTIES
                    </span>
                  </div>
                </div>
                <NftClubPage isEmbeddedInBaseApp={true} />
              </div>
            ) : activeTab === 'tokenomics' ? (
              <TokenomicsPage isBaseAppMode={true} />
            ) : activeTab === 'contracts' ? (
              <ContractsPage isBaseAppMode={true} />
            ) : activeTab === 'admin' ? (
              <BaseAppAdminView />
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

