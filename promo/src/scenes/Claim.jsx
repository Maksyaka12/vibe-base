import { AbsoluteFill, useCurrentFrame, useVideoConfig } from 'remotion';
import { Background } from '../ui/Background';
import { Caption } from '../ui/Caption';
import { Browser } from '../ui/Browser';
import { Window3D } from '../ui/Window3D';
import { Cursor } from '../ui/Cursor';
import { C, FONT, MONO } from '../theme';
import { prog, pop, fmt, flyIn, easeInOut } from '../ui/anim';

// 17–23s: Claim Portal with a connected (demo) wallet, one click claims everything.
const ROWS = [
  { name: 'Holder Rewards', round: 'Unlock 3', amount: 48_210 },
  { name: 'Vibe Club', round: 'Royalty 5', amount: 12_500 },
  { name: 'Staking', round: 'Epoch 6', amount: 8_940 },
];
const TOTAL = ROWS.reduce((s, r) => s + r.amount, 0);
const CLICK = 82;
const DONE = 104;

export function Claim() {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const cardIn = pop(frame, fps, 10, 16);
  const counting = prog(frame, 20, 60);
  const paid = prog(frame, DONE, DONE + 26);
  const success = pop(frame, fps, DONE + 6, 12);
  const out = prog(frame, 168, 180, easeInOut);
  return (
    <AbsoluteFill>
      <Background x={65} y={50} />
      <Caption
        tag="/claim"
        title="one click. claimed."
        sub="rewards straight to your wallet"
        delay={4}
        outAt={168}
        size={92}
        style={{ position: 'absolute', left: 110, top: 380, width: 640 }}
      />
      <Window3D left={760} top={150} delay={0} outAt={168} extraScale={0.95}>
        <div style={{ filter: 'brightness(0.45) blur(2px)' }}>
          <Browser width={1060} shots="shots/claim.png" path="/claim" />
        </div>
      </Window3D>

      <div
        style={{
          position: 'absolute', left: 900, top: 230, width: 820, fontFamily: FONT,
          transform: `translateY(${(1 - cardIn) * 80}px) scale(${0.94 + cardIn * 0.06})`, opacity: Math.min(1, cardIn * 1.4) * (1 - out),
          background: C.surface, border: `1px solid ${C.borderStrong}`, borderRadius: 20, padding: 32,
          boxShadow: `0 50px 140px rgba(0,0,0,0.75), 0 0 100px ${C.accent}22`,
        }}
      >
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline' }}>
          <div style={{ fontSize: 30, fontWeight: 700, color: C.text, letterSpacing: '-0.02em' }}>Available to claim</div>
          <div style={{ fontFamily: MONO, fontSize: 18, color: C.text3 }}>0x8f3…a91c</div>
        </div>
        <div style={{ marginTop: 22, display: 'flex', flexDirection: 'column', gap: 12 }}>
          {ROWS.map((r, i) => {
            const st = flyIn(frame, 18 + i * 6, Infinity, 20);
            const claimed = prog(frame, DONE + i * 5, DONE + i * 5 + 8);
            return (
              <div key={r.name} style={{ ...st, display: 'flex', alignItems: 'center', justifyContent: 'space-between', background: C.surface2, border: `1px solid ${C.border}`, borderRadius: 14, padding: '18px 22px' }}>
                <div>
                  <div style={{ fontSize: 22, fontWeight: 600, color: C.text }}>{r.name}</div>
                  <div style={{ fontFamily: MONO, fontSize: 16, color: C.text3, marginTop: 4 }}>{r.round}</div>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
                  <div style={{ fontFamily: MONO, fontSize: 26, fontWeight: 600, color: claimed > 0.5 ? C.text3 : C.accent }}>
                    +{fmt(r.amount * counting)} $VIBE
                  </div>
                  <Badge claimed={claimed} />
                </div>
              </div>
            );
          })}
        </div>
        <div style={{ marginTop: 24, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <div>
            <div style={{ fontFamily: MONO, fontSize: 16, color: C.text3 }}>{paid > 0 ? 'claimed' : 'total claimable'}</div>
            <div style={{ fontFamily: MONO, fontSize: 44, fontWeight: 600, color: paid > 0 ? C.green : C.text, letterSpacing: '-0.03em' }}>
              {paid > 0 ? fmt(TOTAL * paid) : fmt(TOTAL * counting)} $VIBE
            </div>
          </div>
          <ClaimButton frame={frame} />
        </div>
      </div>

      <div
        style={{
          position: 'absolute', left: 1180, top: 120, fontFamily: FONT, display: 'flex', alignItems: 'center', gap: 14,
          background: C.surface, border: `1px solid ${C.greenBd}`, borderRadius: 999, padding: '14px 26px 14px 16px',
          boxShadow: `0 20px 60px rgba(0,0,0,0.6), 0 0 40px ${C.green}33`,
          transform: `translateY(${(1 - success) * -40}px) scale(${0.8 + success * 0.2})`, opacity: Math.min(1, success * 1.4) * (1 - out),
        }}
      >
        <span style={{ width: 36, height: 36, borderRadius: 99, background: C.green, display: 'grid', placeItems: 'center' }}>
          <Check color={C.onAgent} />
        </span>
        <span style={{ fontSize: 24, fontWeight: 700, color: C.text }}>Claim successful!</span>
      </div>

      <div style={{ position: 'absolute', inset: 0, opacity: 1 - out }}>
        <Cursor path={[[44, 1500, 980], [76, 1556, 690], [CLICK, 1556, 690], [120, 1556, 690], [150, 1700, 900]]} clicks={[CLICK]} />
      </div>
    </AbsoluteFill>
  );
}

function ClaimButton({ frame }) {
  const loading = frame >= CLICK + 2 && frame < DONE;
  const done = frame >= DONE;
  const press = Math.max(0, 1 - Math.abs(frame - CLICK - 2) / 4);
  return (
    <div
      style={{
        width: 260, height: 68, borderRadius: 14, display: 'grid', placeItems: 'center', fontSize: 24, fontWeight: 700,
        background: done ? C.greenBg : C.accent, color: done ? C.green : C.onAccent, border: done ? `1px solid ${C.greenBd}` : 'none',
        transform: `scale(${1 - press * 0.05})`, boxShadow: done ? 'none' : `0 10px 40px ${C.accent}55`,
      }}
    >
      {done ? '✓ Claimed' : loading ? <Spinner frame={frame} /> : 'Claim all'}
    </div>
  );
}

function Spinner({ frame }) {
  return <div style={{ width: 30, height: 30, borderRadius: 99, border: `3px solid ${C.onAccent}33`, borderTopColor: C.onAccent, transform: `rotate(${frame * 22}deg)` }} />;
}

function Badge({ claimed }) {
  return (
    <span
      style={{
        fontFamily: MONO, fontSize: 15, fontWeight: 600, padding: '5px 12px', borderRadius: 999, minWidth: 92, textAlign: 'center',
        color: claimed > 0.5 ? C.green : C.accent, background: claimed > 0.5 ? C.greenBg : C.accentSoft,
        border: `1px solid ${claimed > 0.5 ? C.greenBd : C.accentBorder}`,
      }}
    >
      {claimed > 0.5 ? 'Claimed' : 'Ready'}
    </span>
  );
}

export function Check({ color, size = 20 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="3.2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M5 12.5l4.5 4.5L19 7.5" />
    </svg>
  );
}
