import { useCallback, useEffect, useLayoutEffect, useRef, useState, useSyncExternalStore } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { usePrivy } from '@privy-io/react-auth';
import { ArrowDown, ArrowLeft, ArrowRight, ArrowUp, Check, Eye, ExternalLink, MousePointerClick, X } from 'lucide-react';
import { DEMO_ADDRESS, basescanAddress, exitDemo, subscribeDemoPreview } from '../../config/demo';
import { useVibeBalances } from '../../hooks/useVibeBalances';
import { TOUR_STEPS, closeTour, getTourStep, setTourStep, subscribeTour } from './tourState';
import './demo.css';

const short = (a) => `${a.slice(0, 6)}…${a.slice(-4)}`;
const PAD = 8; // space between a highlighted block and its ring
const GAP = 14; // space between the ring and the card
const CARD_W = 340;

const reducedMotion = () => typeof window !== 'undefined' && window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;
const isNarrow = () => typeof window !== 'undefined' && window.innerWidth < 768;

/** The part of the viewport the page shows: under the sticky header (and demo banner), above the bottom bar. */
function viewportInsets() {
  const header = document.querySelector('.base-app-header')?.getBoundingClientRect();
  const banner = document.querySelector('.vibe-demo-banner')?.getBoundingClientRect();
  const nav = document.querySelector('.base-app-bottom-nav')?.getBoundingClientRect();
  const top = Math.max(0, header?.bottom || 0, banner?.bottom || 0);
  const bottom = nav && nav.height > 0 && nav.top < window.innerHeight ? window.innerHeight - nav.top : 0;
  return { top, bottom };
}

/** True while most of the block is on screen. */
function inView(el) {
  const r = el.getBoundingClientRect();
  const { top, bottom } = viewportInsets();
  const visible = Math.min(r.bottom, window.innerHeight - bottom) - Math.max(r.top, top);
  return visible > Math.min(r.height, window.innerHeight - top - bottom) * 0.6;
}

function findTarget(selectors) {
  for (const s of selectors) {
    const el = document.querySelector(s);
    if (el && el.getBoundingClientRect().height > 0) return el;
  }
  return null;
}

/**
 * Scrolls so the block sits in the free part of the screen, with room for the tour card under it. A block too
 * tall for that shows its lower part, where its buttons are.
 */
function scrollToTarget(el, cardSpace) {
  const r = el.getBoundingClientRect();
  const { top, bottom } = viewportInsets();
  const avail = window.innerHeight - top - bottom - cardSpace;
  const y = r.height + PAD * 2 < avail
    ? r.top - (top + (avail - r.height) / 2)
    : r.bottom - (window.innerHeight - bottom - cardSpace - PAD);
  window.scrollTo({ top: Math.max(0, y + window.scrollY), behavior: reducedMotion() ? 'auto' : 'smooth' });
}

export function useTourStep() {
  return useSyncExternalStore(subscribeTour, getTourStep, () => null);
}

/* ── Welcome: what the visitor is looking at ─────────────────────────────────────────────────────── */

function Welcome() {
  const { formattedBalance, nftCount } = useVibeBalances(DEMO_ADDRESS);
  return (
    <div className="vibe-demo-modal-backdrop vibe-tour-fade" onClick={closeTour}>
      <div
        className="vibe-demo-modal vibe-tour-welcome"
        role="dialog"
        aria-modal="true"
        aria-labelledby="vibe-tour-welcome-title"
        data-testid="demo-welcome"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="vibe-demo-modal-head">
          <span className="vibe-demo-modal-icon"><Eye size={16} /></span>
          <div>
            <div id="vibe-tour-welcome-title" className="vibe-demo-modal-title">You are viewing Vibe Hub as a $VIBE holder</div>
            <div className="vibe-demo-modal-sub">Live onchain data of one real holder’s wallet. Read-only: nothing can be signed or sent.</div>
          </div>
          <button className="vibe-demo-modal-close" onClick={closeTour} aria-label="Close"><X size={16} /></button>
        </div>

        <div className="vibe-tour-stats">
          <a className="vibe-tour-stat" href={basescanAddress(DEMO_ADDRESS)} target="_blank" rel="noopener noreferrer">
            <span className="vibe-tour-stat-label">Wallet</span>
            <span className="vibe-tour-stat-value mono">{short(DEMO_ADDRESS)} <ExternalLink size={11} /></span>
          </a>
          <div className="vibe-tour-stat">
            <span className="vibe-tour-stat-label">$VIBE</span>
            <span className="vibe-tour-stat-value mono">{formattedBalance || '…'}</span>
          </div>
          <div className="vibe-tour-stat">
            <span className="vibe-tour-stat-label">Vibe Club NFT</span>
            <span className="vibe-tour-stat-value mono">{nftCount ?? '…'}</span>
          </div>
        </div>

        <p className="vibe-demo-note">
          Claim, check in, swap and mint as this holder would. Each action shows the exact transaction it would send,
          in place of a wallet prompt.
        </p>

        <div className="vibe-demo-modal-actions">
          <button className="btn btn-secondary btn-sm" onClick={closeTour}>Explore on my own</button>
          <button className="btn btn-primary btn-sm" onClick={() => setTourStep(0)} data-testid="demo-tour-start" autoFocus>
            Start the tour <span className="mono">· {TOUR_STEPS.length} steps</span>
          </button>
        </div>
      </div>
    </div>
  );
}

/* ── Finish: what to do next ─────────────────────────────────────────────────────────────────────── */

function Finish() {
  const { login } = usePrivy();
  return (
    <div className="vibe-demo-modal-backdrop vibe-tour-fade" onClick={closeTour}>
      <div className="vibe-demo-modal" role="dialog" aria-modal="true" aria-labelledby="vibe-tour-finish-title" data-testid="demo-tour-finish" onClick={(e) => e.stopPropagation()}>
        <div className="vibe-demo-modal-head">
          <span className="vibe-demo-modal-icon vibe-tour-icon-done"><Check size={16} /></span>
          <div>
            <div id="vibe-tour-finish-title" className="vibe-demo-modal-title">That is Vibe Hub</div>
            <div className="vibe-demo-modal-sub">Everything you saw was live data. Keep exploring, or connect your own wallet to do it for real: the demo then turns off by itself.</div>
          </div>
          <button className="vibe-demo-modal-close" onClick={closeTour} aria-label="Close"><X size={16} /></button>
        </div>
        <div className="vibe-demo-modal-actions vibe-tour-finish-actions">
          <button className="btn btn-ghost btn-sm" onClick={() => { closeTour(); exitDemo(); }}>Exit demo</button>
          <button className="btn btn-secondary btn-sm" onClick={closeTour}>Keep exploring</button>
          <button className="btn btn-primary btn-sm" onClick={() => { closeTour(); login(); }} autoFocus>Connect wallet</button>
        </div>
      </div>
    </div>
  );
}

/* ── One step: highlight a block, point at it, say what to try ───────────────────────────────────── */

function Step({ index }) {
  const step = TOUR_STEPS[index];
  const navigate = useNavigate();
  const location = useLocation();
  const cardRef = useRef(null);
  const [target, setTarget] = useState(null);
  const [rect, setRect] = useState(null);
  const [cardH, setCardH] = useState(200);
  const [tried, setTried] = useState(false);
  const [missing, setMissing] = useState(false);
  const narrow = isNarrow();

  // open the step's page, then wait for its block (pages load lazily and fill in from the chain)
  useEffect(() => {
    setTarget(null);
    setRect(null);
    setTried(false);
    setMissing(false);
    if (location.pathname !== step.route) navigate(step.route);
    // leave room for the card: docked under the block on phones, below it on desktop
    const cardSpace = () => (cardRef.current?.offsetHeight || 200) + (isNarrow() ? 24 : GAP + PAD + 12);
    const settle = [];
    let tries = 0;
    const timer = setInterval(() => {
      const el = findTarget(step.targets);
      if (el) {
        clearInterval(timer);
        setTarget(el);
        scrollToTarget(el, cardSpace());
        // content may still be loading: it can push the block away or render it again, so look it up anew
        // and bring it back a few times while the page settles
        [900, 2000, 3500].forEach((ms) => settle.push(setTimeout(() => {
          const cur = findTarget(step.targets);
          if (cur && !inView(cur)) scrollToTarget(cur, cardSpace());
        }, ms)));
      } else if (++tries > 40) {
        clearInterval(timer);
        setMissing(true);
      }
    }, 150);
    return () => {
      clearInterval(timer);
      settle.forEach(clearTimeout);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [index]);

  // follow the block while the page scrolls, resizes or loads more data
  useEffect(() => {
    if (!target) return undefined;
    let frame = 0;
    const update = () => {
      cancelAnimationFrame(frame);
      frame = requestAnimationFrame(() => {
        if (!target.isConnected) {
          const again = findTarget(step.targets);
          if (again && again !== target) setTarget(again);
          else setRect(null);
          return;
        }
        const r = target.getBoundingClientRect();
        setRect((prev) => (prev && prev.top === r.top && prev.left === r.left && prev.width === r.width && prev.height === r.height ? prev : { top: r.top, left: r.left, width: r.width, height: r.height }));
      });
    };
    update();
    window.addEventListener('scroll', update, { passive: true });
    window.addEventListener('resize', update);
    const poll = setInterval(update, 400);
    return () => {
      cancelAnimationFrame(frame);
      window.removeEventListener('scroll', update);
      window.removeEventListener('resize', update);
      clearInterval(poll);
    };
  }, [target, step]);

  useLayoutEffect(() => {
    if (cardRef.current) setCardH(cardRef.current.offsetHeight);
  });

  // a preview opened while this step asks to try something: the visitor did it
  useEffect(() => subscribeDemoPreview(() => setTried(true)), []);

  const next = useCallback(() => setTourStep(index + 1), [index]);
  const back = useCallback(() => setTourStep(Math.max(0, index - 1)), [index]);

  useEffect(() => {
    const onKey = (e) => {
      if (document.querySelector('[data-testid="demo-tx-preview"]')) return; // the preview handles its own keys
      if (e.key === 'Escape') closeTour();
      else if (e.key === 'ArrowRight') next();
      else if (e.key === 'ArrowLeft') back();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [next, back]);

  // geometry: the ring around the visible part of the block, and the card beside it
  const { top: insetTop, bottom: insetBottom } = typeof window !== 'undefined' ? viewportInsets() : { top: 0, bottom: 0 };
  const vw = typeof window !== 'undefined' ? window.innerWidth : 1024;
  const vh = typeof window !== 'undefined' ? window.innerHeight : 768;
  let spot = null;
  if (rect) {
    const t = Math.max(rect.top - PAD, insetTop + 4);
    // on phones the ring stops above the docked card
    const b = Math.min(rect.top + rect.height + PAD, narrow ? vh - insetBottom - 12 - cardH - 6 : vh - insetBottom - 4);
    const l = Math.max(rect.left - PAD, 4);
    const r = Math.min(rect.left + rect.width + PAD, vw - 4);
    if (b - t > 24 && r - l > 24) spot = { top: t, left: l, width: r - l, height: b - t };
  }

  let cardStyle;
  let caret = null; // 'up' = the card is under the block, 'down' = above it
  let caretX = 0;
  let pointer = 'up';
  if (narrow) {
    cardStyle = { left: 12, right: 12, bottom: insetBottom + 12 };
    pointer = spot && spot.top > vh - insetBottom - cardH - 24 ? 'down' : 'up';
  } else if (spot) {
    const centerX = spot.left + spot.width / 2;
    const left = Math.min(Math.max(centerX - CARD_W / 2, 16), vw - CARD_W - 16);
    caretX = Math.min(Math.max(centerX - left, 22), CARD_W - 22);
    const below = vh - insetBottom - (spot.top + spot.height);
    const above = spot.top - insetTop;
    if (below >= cardH + GAP + 12) {
      cardStyle = { left, top: spot.top + spot.height + GAP };
      caret = 'up';
      pointer = 'up';
    } else if (above >= cardH + GAP + 12) {
      cardStyle = { left, top: spot.top - GAP - cardH };
      caret = 'down';
      pointer = 'down';
    } else {
      // the block fills the screen: the card sits in its lower right corner
      cardStyle = { right: 24, bottom: insetBottom + 24, width: CARD_W };
      pointer = 'up';
    }
    if (cardStyle.left !== undefined) cardStyle.width = CARD_W;
  } else {
    cardStyle = { left: Math.max(16, (vw - CARD_W) / 2), top: Math.max(insetTop + 24, (vh - cardH) / 2), width: CARD_W };
  }

  const Pointer = pointer === 'down' ? ArrowDown : ArrowUp;
  const last = index === TOUR_STEPS.length - 1;

  return (
    <>
      {spot ? (
        <div key={`spot-${index}`} className="vibe-tour-spot" style={spot} aria-hidden="true">
          <span className="vibe-tour-spot-pulse" />
        </div>
      ) : (
        <div className="vibe-tour-dim" aria-hidden="true" />
      )}

      <div
        key={`card-${index}`}
        ref={cardRef}
        className={`vibe-tour-card${narrow ? ' is-docked' : ''}`}
        style={cardStyle}
        role="dialog"
        aria-labelledby="vibe-tour-step-title"
        data-testid="demo-tour-step"
        data-step={step.id}
      >
        {caret && <span className={`vibe-tour-caret is-${caret}`} style={{ left: caretX }} aria-hidden="true" />}

        <div className="vibe-tour-card-head">
          <span className="vibe-tour-count mono">{index + 1} / {TOUR_STEPS.length}</span>
          <button className="vibe-demo-modal-close" onClick={closeTour} aria-label="Close the tour"><X size={15} /></button>
        </div>

        <div id="vibe-tour-step-title" className="vibe-tour-title">{step.title}</div>
        <p className="vibe-tour-text">{step.text}</p>

        {missing && !spot ? (
          <p className="vibe-tour-hint is-muted">This block is still loading. You can go on and come back to it.</p>
        ) : tried ? (
          <p className="vibe-tour-hint is-done"><Check size={14} /> Previewed. Nothing was signed or sent.</p>
        ) : step.hint ? (
          <p className="vibe-tour-hint">
            {spot ? <Pointer size={14} className="vibe-tour-bounce" /> : <MousePointerClick size={14} />}
            {step.hint}
          </p>
        ) : null}

        <div className="vibe-tour-foot">
          <div className="vibe-tour-dots" aria-hidden="true">
            {TOUR_STEPS.map((s, i) => <span key={s.id} className={i === index ? 'is-on' : i < index ? 'is-past' : ''} />)}
          </div>
          <div className="vibe-tour-nav">
            {index > 0 && (
              <button className="btn btn-ghost btn-sm" onClick={back} aria-label="Previous step"><ArrowLeft size={14} /></button>
            )}
            <button className={`btn btn-sm ${tried || !step.tryIt ? 'btn-primary' : 'btn-secondary'}`} onClick={next} data-testid="demo-tour-next">
              {last ? 'Finish' : 'Next'} <ArrowRight size={14} />
            </button>
          </div>
        </div>
      </div>
    </>
  );
}

/** The demo's welcome card and guided tour. Rendered by DemoController while the demo is on. */
export default function DemoTour() {
  const step = useTourStep();
  if (step === null) return null;
  if (step === -1) return <Welcome />;
  if (step >= TOUR_STEPS.length) return <Finish />;
  return <Step index={step} />;
}
