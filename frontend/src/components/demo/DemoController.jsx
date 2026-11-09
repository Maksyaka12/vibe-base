import { useEffect, useRef } from 'react';
import { useLocation } from 'react-router-dom';
import { usePrivy } from '@privy-io/react-auth';
import { exitDemo, installDemoFetchGuard, keepDemoHash } from '../../config/demo';
import { useDemoFlag } from '../../hooks/useDemoMode';
import DemoTxPreview from './DemoTxPreview';
import DemoTour from './DemoTour';
import { closeTour, openWelcomeOnce } from './tourState';

// Keeps the demo flag in the URL across in-app navigation, shows the welcome card, the guided tour and the
// transaction previews, and blocks writes to /api while the demo is on. The demo works with or without a
// connected wallet; logging in from inside the demo ends it, so the visitor lands in their own account.
export default function DemoController() {
  const location = useLocation();
  const demo = useDemoFlag();
  const { ready, authenticated } = usePrivy();
  const wasAuthenticated = useRef(null); // null until Privy is ready, so a restored session is not a login

  useEffect(() => {
    installDemoFetchGuard();
  }, []);

  useEffect(() => {
    if (demo) keepDemoHash();
  }, [demo, location.pathname, location.search, location.hash]);

  useEffect(() => {
    if (!ready) return;
    if (wasAuthenticated.current === false && authenticated && demo) exitDemo();
    wasAuthenticated.current = authenticated;
  }, [ready, authenticated, demo]);

  useEffect(() => {
    document.documentElement.classList.toggle('vibe-demo-on', demo);
  }, [demo]);

  // a shared #demo link opens the welcome card once per browser session; leaving the demo closes the tour
  useEffect(() => {
    if (demo) openWelcomeOnce();
    else closeTour();
  }, [demo]);

  return (
    <>
      <DemoTxPreview />
      {demo && <DemoTour />}
    </>
  );
}
