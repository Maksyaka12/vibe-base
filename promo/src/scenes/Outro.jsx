import { AbsoluteFill, Img, staticFile, useCurrentFrame, useVideoConfig } from 'remotion';
import { Background, hexA } from '../ui/Background';
import { C, FONT, MONO, DOMAIN } from '../theme';
import { flyIn, pop, prog, easeInOut } from '../ui/anim';

// 35–40s: shots fly back into a grid behind the logo, domain pill, tagline;
// then the lockup slides left and "on Base" with the official Base Square comes in on the right.
const SHOTS = ['shots/hub-holders.png', 'shots/claim.png', 'shots/agents.png', 'shots/profile.png', 'shots/hub-staking.png', 'shots/skill.png'];
const BASE_BLUE = '#0000FF'; // from the Base brand kit (public/base/*.svg)
const SHIFT = 64;

export function Outro() {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const logo = pop(frame, fps, 14, 11);
  const pill = pop(frame, fps, 30, 13);
  const gridOut = prog(frame, 0, 40);
  const shift = prog(frame, SHIFT, SHIFT + 22, easeInOut);
  const square = pop(frame, fps, SHIFT + 12, 12);
  const divider = prog(frame, SHIFT + 6, SHIFT + 24);
  return (
    <AbsoluteFill>
      <Background x={50 - shift * 20} y={50} intensity={0.3} />
      <AbsoluteFill style={{ background: `radial-gradient(760px 560px at 74% 50%, ${hexA(BASE_BLUE, 0.28 * shift)}, transparent 70%)` }} />
      <AbsoluteFill style={{ perspective: 2400 }}>
        <div style={{ position: 'absolute', left: -200, top: -120, width: 2320, display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 40, transform: `rotateX(28deg) rotateZ(-8deg) scale(${1.4 - gridOut * 0.35}) translateY(${-frame * 1.2}px)`, opacity: 0.12 + (1 - gridOut) * 0.4 }}>
          {SHOTS.map((s) => (
            <Img key={s} src={staticFile(s)} style={{ width: '100%', borderRadius: 16, border: `1px solid ${C.borderStrong}` }} />
          ))}
        </div>
      </AbsoluteFill>
      <AbsoluteFill style={{ background: `radial-gradient(circle at 50% 50%, ${C.bg}ee 0%, ${C.bg}aa 40%, transparent 75%)` }} />

      <AbsoluteFill style={{ alignItems: 'center', justifyContent: 'center', fontFamily: FONT, transform: `translateX(${-shift * 420}px) scale(${1 - shift * 0.08})` }}>
        <Img src={staticFile('new-logo.png')} style={{ width: 170, height: 170, borderRadius: 999, transform: `scale(${logo})`, boxShadow: `0 0 90px ${C.accent}77` }} />
        <div style={{ ...flyIn(frame, 22, Infinity, 30), marginTop: 34, fontSize: 92, fontWeight: 800, letterSpacing: '-0.045em', color: C.text }}>
          $VIBE <span style={{ color: C.accent }}>HUB</span>
        </div>
        <div style={{ marginTop: 26, transform: `scale(${pill})`, opacity: Math.min(1, pill * 1.5), background: C.text, color: C.bg, fontSize: 40, fontWeight: 700, letterSpacing: '-0.02em', padding: '14px 40px', borderRadius: 999, boxShadow: `0 0 60px ${C.accent}55` }}>
          {DOMAIN}
        </div>
        <div style={{ ...flyIn(frame, 40, Infinity, 16), marginTop: 30, fontFamily: MONO, fontSize: 24, color: C.text2 }}>
          rewards · claims · agents
        </div>
      </AbsoluteFill>

      <div style={{ position: 'absolute', left: 960, top: 540 - 180 * divider, width: 1, height: 360 * divider, background: `linear-gradient(transparent, ${C.borderStrong}, transparent)` }} />

      <AbsoluteFill style={{ alignItems: 'center', justifyContent: 'center', fontFamily: FONT, transform: 'translateX(440px)' }}>
        <Img
          src={staticFile('base/square-blue.svg')}
          style={{ width: 180, height: 180, transform: `scale(${square}) rotate(${(1 - square) * 90}deg)`, opacity: Math.min(1, square * 1.5), boxShadow: `0 0 90px ${hexA(BASE_BLUE, 0.55)}` }}
        />
        <div style={{ marginTop: 40, display: 'flex', alignItems: 'baseline', gap: '0.25em', fontSize: 104, fontWeight: 800, letterSpacing: '-0.045em', color: C.text }}>
          <span style={flyIn(frame, SHIFT + 20, Infinity, 50)}>on</span>
          <span style={flyIn(frame, SHIFT + 26, Infinity, 50)}>Base</span>
        </div>
      </AbsoluteFill>
    </AbsoluteFill>
  );
}
