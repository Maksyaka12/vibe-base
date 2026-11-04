import { useState, useEffect } from 'react';
import { BrowserRouter, Routes, Route, useLocation, Navigate } from 'react-router-dom';
import { PrivyProvider, dataSuffix } from '@privy-io/react-auth';
import { WagmiProvider as PrivyWagmiProvider } from '@privy-io/wagmi';
import { privyWagmiConfig } from '../../config/privyWagmi';
import { DATA_SUFFIX } from '../../config/builderCode';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { base } from 'viem/chains';
import { BaseAppView } from './components/BaseAppView';
import BaseAppRewardsView from './components/BaseAppRewardsView';
import { O1_STAKING_VAULT, STAKING_EPOCHS, VIBECLUB_EPOCHS, GIVEAWAYS_DATA, HOLDER_UNLOCKS } from '../../data/rewardsSchedule';
import './index.css';

function ScrollToTop() {
  const { pathname } = useLocation();
  useEffect(() => {
    window.scrollTo(0, 0);
  }, [pathname]);
  return null;
}

function Rewards() {
  // Ticks every second so cards move between upcoming, live and previous when their time comes.
  const [now, setNow] = useState(() => new Date());
  useEffect(() => {
    const timer = setInterval(() => setNow(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  return (
    <section id="rewards" className="alt" style={{ padding: '24px 0 60px 0' }}>
      <div className="wrap">
        <BaseAppRewardsView
          HOLDER_UNLOCKS={HOLDER_UNLOCKS}
          VIBECLUB_EPOCHS={VIBECLUB_EPOCHS}
          STAKING_EPOCHS={STAKING_EPOCHS}
          GIVEAWAYS_DATA={GIVEAWAYS_DATA}
          O1_STAKING_VAULT={O1_STAKING_VAULT}
          now={now}
        />
      </div>
    </section>
  );
}

function DomainRouter() {
  useEffect(() => {
    document.title = "Vibe Hub";
  }, []);

  return (
    <Routes>
      {/* ── Standalone VIBE Club NFT Mint Page / Redirect ── */}
      <Route path="/vibeclub" element={<BaseAppView RewardsComponent={Rewards} />} />
      <Route path="/vibe-club" element={<BaseAppView RewardsComponent={Rewards} />} />
      <Route path="/nft-club" element={<BaseAppView RewardsComponent={Rewards} />} />
      <Route path="/nft" element={<BaseAppView RewardsComponent={Rewards} />} />
      <Route path="/mint" element={<BaseAppView RewardsComponent={Rewards} />} />

      {/* ── Dedicated Base App / Vibe Hub Routes ── */}
      <Route path="/app" element={<BaseAppView RewardsComponent={Rewards} />} />
      <Route path="/app/*" element={<BaseAppView RewardsComponent={Rewards} />} />

      {/* ── Welcome & Main App Routes (Direct to Unified BaseAppView) ── */}
      <Route path="/" element={<BaseAppView RewardsComponent={Rewards} />} />
      <Route path="/home" element={<Navigate to="/" replace />} />

      {/* ── Main App Routes (Unified BaseAppView with Collapsible Sidebar) ── */}
      <Route path="/admin" element={<BaseAppView RewardsComponent={Rewards} />} />
      <Route path="/tokenomics" element={<BaseAppView RewardsComponent={Rewards} />} />
      <Route path="/hub" element={<BaseAppView RewardsComponent={Rewards} />} />
      <Route path="/rewards" element={<BaseAppView RewardsComponent={Rewards} />} />
      <Route path="/events" element={<BaseAppView RewardsComponent={Rewards} />} />
      <Route path="/buy" element={<BaseAppView RewardsComponent={Rewards} />} />
      <Route path="/swap" element={<BaseAppView RewardsComponent={Rewards} />} />
      <Route path="/trade" element={<BaseAppView RewardsComponent={Rewards} />} />
      <Route path="/claim" element={<BaseAppView RewardsComponent={Rewards} />} />
      <Route path="/checker" element={<Navigate to="/claim" replace />} />
      <Route path="/portal" element={<Navigate to="/claim" replace />} />
      <Route path="/profile" element={<BaseAppView RewardsComponent={Rewards} />} />
      <Route path="/wallet" element={<BaseAppView RewardsComponent={Rewards} />} />
      <Route path="/account" element={<BaseAppView RewardsComponent={Rewards} />} />
      <Route path="/agents" element={<BaseAppView RewardsComponent={Rewards} />} />
      <Route path="/settings" element={<BaseAppView RewardsComponent={Rewards} />} />
      <Route path="/skill" element={<BaseAppView RewardsComponent={Rewards} />} />
      <Route path="/dashboard" element={<Navigate to="/profile" replace />} />
      <Route path="/contracts" element={<BaseAppView RewardsComponent={Rewards} />} />
      <Route path="/adresses" element={<Navigate to="/contracts" replace />} />
      <Route path="/addresses" element={<Navigate to="/contracts" replace />} />
      <Route path="/docs" element={<Navigate to="/contracts" replace />} />
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}

const queryClient = new QueryClient();

export default function App() {
  return (
    <PrivyProvider
      appId="cmrugdvds02q60cl7tegmrnx7"
      config={{
        plugins: DATA_SUFFIX ? [dataSuffix(DATA_SUFFIX)] : [],
        loginMethods: ['wallet'],
        defaultChain: base,
        supportedChains: [base],
        appearance: {
          theme: 'dark',
          accentColor: '#66BEFF',
          logo: '/logo.png',
          showWalletLoginFirst: true,
        },
        embeddedWallets: {
          ethereum: { createOnLogin: 'all-users' }
        }
      }}
    >
      <QueryClientProvider client={queryClient}>
        <PrivyWagmiProvider config={privyWagmiConfig}>
          <BrowserRouter>
            <ScrollToTop />
            <DomainRouter />
          </BrowserRouter>
        </PrivyWagmiProvider>
      </QueryClientProvider>
    </PrivyProvider>
  );
}
