import { AbsoluteFill, Img, staticFile, useCurrentFrame, useVideoConfig } from 'remotion';
import { Background, hexA } from '../ui/Background';
import { C, FONT, MONO, DOMAIN } from '../theme';
import { flyIn, pop, prog, easeInOut } from '../ui/anim';

// 10–15s: flash on zero, "today · Oct 29 · 15:00 UTC", then the block slides left and the official
// Base Basemark (b + three squares) builds up block by block next to "on Base".
const BASE_BLUE = '#0000FF';
const SHIFT = 66;
// Horizontal extents of the four Basemark blocks, in % of the SVG width (viewBox 1280 × 417.43).
const BLOCKS = [[0, 23.4], [25.8, 48.7], [51.3, 74.3], [76.8, 100]];

export function LiveOnBase() {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const flash = 1 - prog(frame, 0, 14);
  const logo = pop(frame, fps, 4, 11);
  const shift = prog(frame, SHIFT, SHIFT + 22, easeInOut);
  const divider = prog(frame, SHIFT + 6, SHIFT + 24);
  const end = prog(frame, 140, 150);
  return (
    <AbsoluteFill style={{ opacity: 1 - end }}>
      <Background x={50 - shift * 20} y={50} intensity={0.3} />
      <AbsoluteFill style={{ background: `radial-gradient(760px 560px at 74% 50%, ${hexA(BASE_BLUE, 0.3 * shift)}, transparent 70%)` }} />

      <AbsoluteFill style={{ alignItems: 'center', justifyContent: 'center', fontFamily: FONT, transform: `translateX(${-shift * 430}px) scale(${1 - shift * 0.1})` }}>
        <Img src={staticFile('new-logo.png')} style={{ width: 140, height: 140, borderRadius: 999, transform: `scale(${logo})`, boxShadow: `0 0 90px ${C.accent}77` }} />
        <div style={{ ...flyIn(frame, 8, Infinity, 20), marginTop: 34, fontFamily: MONO, fontSize: 26, color: C.green, display: 'flex', alignItems: 'center', gap: 10 }}>
          <span style={{ width: 10, height: 10, borderRadius: 99, background: C.green, boxShadow: `0 0 ${10 + Math.sin(frame / 4) * 6}px ${C.green}` }} />
          TODAY
        </div>
        <div style={{ ...flyIn(frame, 12, Infinity, 50), marginTop: 10, fontSize: 150, fontWeight: 800, letterSpacing: '-0.05em', color: C.text, lineHeight: 1 }}>
          Oct 29
        </div>
        <div style={{ ...flyIn(frame, 18, Infinity, 40), marginTop: 14, fontFamily: MONO, fontSize: 84, fontWeight: 600, letterSpacing: '-0.03em', color: C.accent, textShadow: `0 0 50px ${C.accent}55` }}>
          15:00 UTC
        </div>
        <div style={{ ...flyIn(frame, 28, Infinity, 20), marginTop: 30, background: C.text, color: C.bg, fontSize: 34, fontWeight: 700, letterSpacing: '-0.02em', padding: '12px 36px', borderRadius: 999, boxShadow: `0 0 60px ${C.accent}55` }}>
          {DOMAIN}
        </div>
      </AbsoluteFill>

      <div style={{ position: 'absolute', left: 960, top: 540 - 200 * divider, width: 1, height: 400 * divider, background: `linear-gradient(transparent, ${C.borderStrong}, transparent)` }} />

      <AbsoluteFill style={{ alignItems: 'center', justifyContent: 'center', fontFamily: FONT, transform: 'translateX(450px)' }}>
        <div style={{ position: 'relative', width: 460, height: 150, filter: `drop-shadow(0 0 40px ${hexA(BASE_BLUE, 0.6)})` }}>
          {BLOCKS.map(([l, r], i) => {
            const p = pop(frame, fps, SHIFT + 12 + i * 4, 12);
            return (
              <Img
                key={i}
                src={staticFile('base/basemark-blue.svg')}
                style={{
                  position: 'absolute', inset: 0, width: '100%', height: '100%',
                  clipPath: `inset(0 ${100 - r}% 0 ${l}%)`,
                  transform: `translateY(${(1 - p) * 60}px) scale(${0.6 + 0.4 * p})`, transformOrigin: `${(l + r) / 2}% 100%`,
                  opacity: Math.min(1, p * 1.5),
                }}
              />
            );
          })}
        </div>
        <div style={{ marginTop: 44, display: 'flex', alignItems: 'baseline', gap: '0.25em', fontSize: 104, fontWeight: 800, letterSpacing: '-0.045em', color: C.text }}>
          <span style={flyIn(frame, SHIFT + 30, Infinity, 50)}>on</span>
          <span style={flyIn(frame, SHIFT + 35, Infinity, 50)}>Base</span>
        </div>
      </AbsoluteFill>

      <AbsoluteFill style={{ background: '#fff', opacity: flash * 0.85, pointerEvents: 'none' }} />
    </AbsoluteFill>
  );
}
