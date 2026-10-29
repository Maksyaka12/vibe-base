import { AbsoluteFill, useCurrentFrame } from 'remotion';
import { C } from '../theme';

// Flat o1 background with a slow drifting accent glow and a faint dot grid.
export function Background({ color = C.accent, intensity = 0.22, x = 70, y = 40 }) {
  const frame = useCurrentFrame();
  const dx = Math.sin(frame / 90) * 6;
  const dy = Math.cos(frame / 110) * 5;
  return (
    <AbsoluteFill style={{ background: C.bg }}>
      <AbsoluteFill
        style={{
          background: `radial-gradient(900px 620px at ${x + dx}% ${y + dy}%, ${hexA(color, intensity)}, transparent 70%)`,
        }}
      />
      <AbsoluteFill
        style={{
          backgroundImage: 'radial-gradient(rgba(255,255,255,0.06) 1px, transparent 1px)',
          backgroundSize: '32px 32px',
          maskImage: 'radial-gradient(ellipse at center, black 30%, transparent 80%)',
        }}
      />
    </AbsoluteFill>
  );
}

export function hexA(hex, a) {
  const n = parseInt(hex.slice(1), 16);
  return `rgba(${(n >> 16) & 255},${(n >> 8) & 255},${n & 255},${a})`;
}
