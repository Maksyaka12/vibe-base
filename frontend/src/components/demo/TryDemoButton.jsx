import { useEffect, useRef, useState, useSyncExternalStore } from 'react';
import { Info, PlayCircle, X } from 'lucide-react';
import { enterDemo } from '../../config/demo';
import { useDemoMode } from '../../hooks/useDemoMode';
import { startTour } from './tourState';
import './demo.css';

// "Try demo" is always offered, with or without a connected wallet: in the middle of the header on desktop,
// and as a strip above the header on phones that can be closed until the next page load.

const INFO_TITLE = 'What is the demo?';
const INFO_TEXT =
  'Walk through Vibe Hub as a real $VIBE holder, with a short guided tour. It is read-only: claims, swaps and mints ' +
  'only show the transaction they would send. Nothing is signed or sent, and your own wallet is not touched. ' +
  'Leave any time with Exit demo.';

function startDemo() {
  enterDemo();
  startTour(); // the welcome card, then the tour
  if (typeof window !== 'undefined') window.scrollTo({ top: 0 });
}

/** The (i) next to Try demo: hover or tap shows what the demo is, like the info on achievements. */
export function DemoInfo({ align = 'center' }) {
  const [open, setOpen] = useState(false);
  const ref = useRef(null);

  useEffect(() => {
    if (!open) return undefined;
    const onDown = (e) => {
      if (ref.current && !ref.current.contains(e.target)) setOpen(false);
    };
    const onKey = (e) => e.key === 'Escape' && setOpen(false);
    document.addEventListener('pointerdown', onDown);
    window.addEventListener('keydown', onKey);
    return () => {
      document.removeEventListener('pointerdown', onDown);
      window.removeEventListener('keydown', onKey);
    };
  }, [open]);

  return (
    <span
      ref={ref}
      className={`vibe-demo-info is-${align}`}
      onPointerEnter={(e) => e.pointerType === 'mouse' && setOpen(true)}
      onPointerLeave={(e) => e.pointerType === 'mouse' && setOpen(false)}
    >
      <button
        type="button"
        className="vibe-demo-info-trigger"
        aria-label="What is the demo?"
        aria-expanded={open}
        onClick={(e) => {
          e.stopPropagation();
          setOpen((v) => !v);
        }}
      >
        <Info size={14} />
      </button>
      {open && (
        <span className="vibe-demo-info-pop" role="tooltip" data-testid="demo-info">
          <span className="vibe-demo-info-title">{INFO_TITLE}</span>
          <span className="vibe-demo-info-text">{INFO_TEXT}</span>
        </span>
      )}
    </span>
  );
}

/** Desktop: the pill in the middle of the header. Hidden while the demo is on (the banner has Tour and Exit). */
export default function TryDemoButton() {
  const { demo } = useDemoMode();
  if (demo) return null;
  return (
    <div className="vibe-demo-try-group">
      <button
        type="button"
        className="btn btn-secondary vibe-demo-try vibe-demo-try-desktop"
        onClick={startDemo}
        data-testid="try-demo"
      >
        <PlayCircle size={16} strokeWidth={1.75} />
        <span>Try demo</span>
      </button>
      <DemoInfo />
    </div>
  );
}

/* ── Phones: a strip above the header, closed with ×; it comes back on the next page load ───────────── */

let stripClosed = false;
const stripListeners = new Set();
const closeStrip = () => {
  stripClosed = true;
  stripListeners.forEach((cb) => cb());
};
const subscribeStrip = (cb) => {
  stripListeners.add(cb);
  return () => stripListeners.delete(cb);
};

export function TryDemoStrip() {
  const { demo } = useDemoMode();
  const closed = useSyncExternalStore(subscribeStrip, () => stripClosed, () => false);
  if (demo || closed) return null;
  return (
    <div className="vibe-demo-strip" data-testid="try-demo-strip">
      <button type="button" className="vibe-demo-strip-main" onClick={startDemo} data-testid="try-demo">
        <PlayCircle size={15} strokeWidth={1.75} />
        <span className="vibe-demo-strip-label">Try demo</span>
        <span className="vibe-demo-strip-sub">See the hub as a holder</span>
      </button>
      <DemoInfo align="end" />
      <button type="button" className="vibe-demo-strip-close" onClick={closeStrip} aria-label="Close">
        <X size={15} />
      </button>
    </div>
  );
}
