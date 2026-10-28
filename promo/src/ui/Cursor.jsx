import { useCurrentFrame } from 'remotion';
import { C } from '../theme';
import { kf, prog } from './anim';

// Pointer that glides through `path` ([[frame, x, y], ...]) and ripples on each `clicks` frame.
// Coordinates are in whatever space the parent uses (page px when placed inside <Browser>).
export function Cursor({ path, clicks = [], scale = 1.3, color = C.accent }) {
  const frame = useCurrentFrame();
  const x = kf(frame, path.map((p) => [p[0], p[1]]));
  const y = kf(frame, path.map((p) => [p[0], p[2]]));
  const press = clicks.reduce((m, c) => Math.max(m, 1 - Math.abs(frame - c - 2) / 4), 0);
  const visible = prog(frame, path[0][0] - 8, path[0][0]);
  return (
    <>
      {clicks.map((c) => {
        const t = prog(frame, c, c + 18);
        if (frame < c || t >= 1) return null;
        return (
          <div
            key={c}
            style={{
              position: 'absolute', left: x - 40, top: y - 40, width: 80, height: 80, borderRadius: 99,
              border: `3px solid ${color}`, background: `${color}33`,
              transform: `scale(${0.3 + t * 1.2})`, opacity: 1 - t, zIndex: 50,
            }}
          />
        );
      })}
      <svg
        width={28 * scale} height={28 * scale} viewBox="0 0 28 28"
        style={{ position: 'absolute', left: x - 4, top: y - 2, zIndex: 51, opacity: visible, transform: `scale(${1 - press * 0.15})`, transformOrigin: '4px 2px', filter: 'drop-shadow(0 4px 10px rgba(0,0,0,0.6))' }}
      >
        <path d="M4 2 L4 22 L9.5 17 L13 25 L16.5 23.5 L13 15.8 L20.5 15.8 Z" fill="#fff" stroke="#090A0C" strokeWidth="1.6" strokeLinejoin="round" />
      </svg>
    </>
  );
}
