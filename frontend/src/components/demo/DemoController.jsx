import { useEffect } from 'react';
import { useLocation } from 'react-router-dom';
import { usePrivy } from '@privy-io/react-auth';
import { exitDemo, keepDemoHash } from '../../config/demo';
import { useDemoFlag } from '../../hooks/useDemoMode';
import DemoTxPreview from './DemoTxPreview';
import DemoTour from './DemoTour';
import { closeTour, openWelcomeOnce } from './tourState';

// Keeps the demo flag in the URL across in-app navigation, turns the demo off once a real wallet
// connects, and shows the welcome card, the guided tour and the transaction previews.
export default function DemoController() {
  const location = useLocation();
  const flag = useDemoFlag();
  const { ready, authenticated } = usePrivy();
  const demo = flag && !authenticated;

  useEffect(() => {
    if (flag) keepDemoHash();
  }, [flag, location.pathname, location.search, location.hash]);

  useEffect(() => {
    if (flag && ready && authenticated) exitDemo();
  }, [flag, ready, authenticated]);

  useEffect(() => {
    document.documentElement.classList.toggle('vibe-demo-on', demo);
  }, [demo]);

  // the welcome card opens once per browser session when the demo starts; leaving the demo closes the tour
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
