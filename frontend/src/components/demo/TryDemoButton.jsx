import { PlayCircle } from 'lucide-react';
import { usePrivy } from '@privy-io/react-auth';
import { enterDemo } from '../../config/demo';
import { useDemoMode } from '../../hooks/useDemoMode';
import './demo.css';

/**
 * "Try demo" for visitors without a wallet. Desktop: a pill in the header next to Connect wallet.
 * Mobile: a pill that hangs over the bottom edge of the header (the header is too narrow for one more button).
 * Hidden once a wallet is connected and while the demo is on (the demo banner has Exit demo).
 */
export default function TryDemoButton({ isDesktop = false }) {
  const { ready, authenticated } = usePrivy();
  const { demo } = useDemoMode();
  if (demo || !ready || authenticated) return null;
  return (
    <button
      type="button"
      className={`btn btn-secondary vibe-demo-try ${isDesktop ? 'vibe-demo-try-desktop' : 'vibe-demo-try-mobile'}`}
      onClick={enterDemo}
      title="Walk through the app as a real holder, read-only. Nothing is signed or sent."
      data-testid="try-demo"
    >
      <PlayCircle size={isDesktop ? 16 : 14} strokeWidth={1.75} />
      <span>Try demo</span>
    </button>
  );
}
