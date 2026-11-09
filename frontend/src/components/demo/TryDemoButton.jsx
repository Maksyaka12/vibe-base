import { PlayCircle } from 'lucide-react';
import { usePrivy } from '@privy-io/react-auth';
import { enterDemo } from '../../config/demo';
import { useDemoMode } from '../../hooks/useDemoMode';
import './demo.css';

/** "Try demo" on the Rewards Hub, for visitors without a wallet. */
export default function TryDemoButton() {
  const { ready, authenticated } = usePrivy();
  const { demo } = useDemoMode();
  if (demo || (ready && authenticated)) return null;
  return (
    <div className="vibe-demo-cta" data-testid="try-demo">
      <div className="vibe-demo-cta-text">
        <strong>No wallet handy?</strong> Walk through the whole app as a real holder, read-only. Nothing is signed or sent.
      </div>
      <button className="btn btn-primary btn-sm" onClick={() => { enterDemo(); window.scrollTo({ top: 0, behavior: 'smooth' }); }}>
        <PlayCircle size={14} /> Try demo
      </button>
    </div>
  );
}
