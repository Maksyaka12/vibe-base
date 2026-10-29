import { interpolate, spring, Easing } from 'remotion';

export const clamp = { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' };
export const ease = Easing.bezier(0.22, 1, 0.36, 1);
export const easeInOut = Easing.bezier(0.65, 0, 0.35, 1);

// 0 → 1 over [from, to] with the o1 ease-out curve.
// A non-finite `from` (outAt = Infinity) means "never".
export const prog = (frame, from, to, easing = ease) =>
  Number.isFinite(from) ? interpolate(frame, [from, to], [0, 1], { ...clamp, easing }) : 0;

export const pop = (frame, fps, delay = 0, damping = 14) =>
  spring({ frame: frame - delay, fps, config: { damping, stiffness: 160, mass: 0.7 } });

// Fade + blur + lift for an element that flies in at `delay` and out at `outAt`.
export function flyIn(frame, delay, outAt = Infinity, dist = 40) {
  const i = prog(frame, delay, delay + 14);
  const o = prog(frame, outAt, outAt + 10, easeInOut);
  return {
    opacity: i * (1 - o),
    transform: `translateY(${(1 - i) * dist - o * 20}px)`,
    filter: `blur(${(1 - i) * 10 + o * 8}px)`,
  };
}

// Piecewise keyframes helper: kf(frame, [[f0, v0], [f1, v1], ...]).
export function kf(frame, pts, easing = easeInOut) {
  return interpolate(frame, pts.map((p) => p[0]), pts.map((p) => p[1]), { ...clamp, easing });
}

export const fmt = (n) => Math.round(n).toLocaleString('en-US');
