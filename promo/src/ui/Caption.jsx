import { useCurrentFrame } from 'remotion';
import { C, FONT, MONO } from '../theme';
import { flyIn } from './anim';

// Tag (/rewards) + big title + subline, each flying in a beat apart, like the reference promos.
export function Caption({ tag, title, sub, delay = 0, outAt = Infinity, color = C.accent, size = 96, align = 'left', style }) {
  const frame = useCurrentFrame();
  const words = title.split(' ');
  return (
    <div style={{ fontFamily: FONT, textAlign: align, ...style }}>
      {tag && (
        <div style={{ ...flyIn(frame, delay, outAt, 20), marginBottom: 22 }}>
          <span
            style={{
              fontFamily: MONO, fontSize: 22, fontWeight: 500, color,
              background: hexSoft(color), border: `1px solid ${hexBorder(color)}`,
              padding: '6px 14px', borderRadius: 8, letterSpacing: '-0.01em',
            }}
          >
            {tag}
          </span>
        </div>
      )}
      <div style={{ fontSize: size, fontWeight: 800, color: C.text, letterSpacing: '-0.045em', lineHeight: 1.02 }}>
        {words.map((w, i) => (
          <span key={i} style={{ display: 'inline-block', marginRight: '0.24em', ...flyIn(frame, delay + 5 + i * 3, outAt, 50) }}>
            {w}
          </span>
        ))}
      </div>
      {sub && (
        <div style={{ ...flyIn(frame, delay + 12 + words.length * 3, outAt, 20), marginTop: 22, fontSize: 30, color: C.text2, fontWeight: 500, letterSpacing: '-0.015em' }}>
          {sub}
        </div>
      )}
    </div>
  );
}

const hexSoft = (c) => (c === C.agent ? C.agentSoft : C.accentSoft);
const hexBorder = (c) => (c === C.agent ? C.agentBorder : C.accentBorder);
