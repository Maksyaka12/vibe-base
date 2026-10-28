import { AbsoluteFill, useCurrentFrame } from 'remotion';
import { Background } from '../ui/Background';
import { C, FONT, MONO } from '../theme';
import { flyIn, prog } from '../ui/anim';

// 0–3s: "holding $VIBE?" → "get paid for it."
export function Hook() {
  const frame = useCurrentFrame();
  const first = ['holding', '$VIBE?'];
  const second = ['get', 'paid', 'for', 'it.'];
  const dim = prog(frame, 40, 52);
  return (
    <AbsoluteFill>
      <Background intensity={0.12 + dim * 0.12} x={50} y={55} />
      <AbsoluteFill style={{ alignItems: 'center', justifyContent: 'center', fontFamily: FONT }}>
        <div style={{ ...flyIn(frame, 2, 80, 16), fontFamily: MONO, fontSize: 22, color: C.green, marginBottom: 30, display: 'flex', alignItems: 'center', gap: 10 }}>
          <span style={{ width: 10, height: 10, borderRadius: 99, background: C.green, boxShadow: `0 0 ${10 + Math.sin(frame / 4) * 6}px ${C.green}` }} />
          live on Base
        </div>
        <div style={{ fontSize: 120, fontWeight: 800, letterSpacing: '-0.05em', lineHeight: 1.05, color: C.text, opacity: 1 - dim * 0.55 }}>
          {first.map((w, i) => (
            <span key={w} style={{ display: 'inline-block', marginRight: '0.22em', ...flyIn(frame, 6 + i * 6, 80, 60) }}>{w}</span>
          ))}
        </div>
        <div style={{ fontSize: 150, fontWeight: 800, letterSpacing: '-0.05em', lineHeight: 1.05, color: C.accent, textShadow: `0 0 60px ${C.accent}55` }}>
          {second.map((w, i) => (
            <span key={w} style={{ display: 'inline-block', marginRight: '0.2em', ...flyIn(frame, 38 + i * 4, 80, 70) }}>{w}</span>
          ))}
        </div>
      </AbsoluteFill>
    </AbsoluteFill>
  );
}
