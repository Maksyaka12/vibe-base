import { AbsoluteFill, Img, staticFile, useCurrentFrame, useVideoConfig } from 'remotion';
import { Background } from '../ui/Background';
import { C, FONT, MONO } from '../theme';
import { flyIn, pop, prog, easeInOut } from '../ui/anim';

// 3–6s: logo + "$VIBE HUB", then the camera dives toward the product.
export function Intro() {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const p = pop(frame, fps, 0, 11);
  const dive = prog(frame, 72, 90, easeInOut);
  const rings = [0, 10, 20];
  return (
    <AbsoluteFill>
      <Background intensity={0.28} x={50} y={50} />
      <AbsoluteFill style={{ alignItems: 'center', justifyContent: 'center', transform: `scale(${1 + dive * 2.5})`, opacity: 1 - dive, filter: `blur(${dive * 12}px)` }}>
        <div style={{ position: 'relative', width: 220, height: 220 }}>
          {rings.map((d) => {
            const t = ((frame - d) % 45) / 45;
            return frame >= d ? (
              <div key={d} style={{ position: 'absolute', inset: 0, borderRadius: 999, border: `2px solid ${C.accent}`, transform: `scale(${1 + t * 1.2})`, opacity: (1 - t) * 0.5 }} />
            ) : null;
          })}
          <Img
            src={staticFile('new-logo.png')}
            style={{ width: 220, height: 220, borderRadius: 999, transform: `scale(${p}) rotate(${(1 - p) * -40}deg)`, boxShadow: `0 0 80px ${C.accent}66` }}
          />
        </div>
        <div style={{ ...flyIn(frame, 12, Infinity, 30), marginTop: 46, fontFamily: FONT, fontSize: 104, fontWeight: 800, letterSpacing: '-0.045em', color: C.text }}>
          $VIBE <span style={{ color: C.accent }}>HUB</span>
        </div>
        <div style={{ ...flyIn(frame, 24, Infinity, 16), marginTop: 16, fontFamily: MONO, fontSize: 26, color: C.text2 }}>
          /one hub for every reward
        </div>
      </AbsoluteFill>
    </AbsoluteFill>
  );
}
