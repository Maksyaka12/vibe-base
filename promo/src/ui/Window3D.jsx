import { useCurrentFrame, useVideoConfig } from 'remotion';
import { pop, prog, easeInOut } from './anim';

// Slides a browser window in from `from` with a spring, tilted in perspective, and out at `outAt`.
export function Window3D({ children, left, top, tilt = -10, from = 'right', delay = 0, outAt = Infinity, extraScale = 1 }) {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const p = pop(frame, fps, delay, 18);
  const o = prog(frame, outAt, outAt + 12, easeInOut);
  const dx = from === 'right' ? 900 : from === 'left' ? -900 : 0;
  const dy = from === 'bottom' ? 700 : 0;
  const drift = Math.sin(frame / 60) * 1.2;
  return (
    <div style={{ position: 'absolute', left, top, perspective: 2200 }}>
      <div
        style={{
          transform: `translate(${(1 - p) * dx}px, ${(1 - p) * dy - o * 40}px) rotateY(${tilt * (0.6 + 0.4 * p) + drift}deg) rotateX(${2 + (1 - p) * 6}deg) scale(${(0.92 + 0.08 * p) * extraScale})`,
          transformOrigin: from === 'left' ? 'left center' : 'right center',
          opacity: Math.min(1, p * 1.5) * (1 - o),
          filter: `blur(${o * 10}px)`,
        }}
      >
        {children}
      </div>
    </div>
  );
}
