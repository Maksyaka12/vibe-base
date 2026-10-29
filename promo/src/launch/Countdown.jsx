import { AbsoluteFill, useCurrentFrame, useVideoConfig } from 'remotion';
import { Background } from '../ui/Background';
import { Caption } from '../ui/Caption';
import { C, FONT, MONO } from '../theme';
import { flyIn, pop, prog, kf } from '../ui/anim';

// 5–10s: big HH:MM:SS. Fast-forwards from 04:59:59 to 00:00:03, then counts 3 · 2 · 1 in real time.
// The video cannot know when it is watched, so the countdown is stylised; the exact time is in scenes 1 and 3.
const FROM = 4 * 3600 + 59 * 60 + 59;
const FF_START = 12;
const TICKS = [60, 90, 120]; // frames where 3, 2, 1 appear (one per second)

function secondsLeft(frame) {
  if (frame < FF_START) return FROM;
  if (frame < TICKS[0]) {
    const t = prog(frame, FF_START, TICKS[0], (x) => 1 - (1 - x) ** 3);
    return Math.round(FROM - (FROM - 3) * t);
  }
  return 3 - TICKS.filter((f) => frame >= f).length + 1;
}

export function Countdown() {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const s = secondsLeft(frame);
  const hh = String(Math.floor(s / 3600)).padStart(2, '0');
  const mm = String(Math.floor((s % 3600) / 60)).padStart(2, '0');
  const ss = String(s % 60).padStart(2, '0');
  const lastTick = TICKS.filter((f) => frame >= f).pop();
  const sinceTick = lastTick === undefined ? 99 : frame - lastTick;
  const speed = frame >= FF_START && frame < TICKS[0] ? 1 - prog(frame, FF_START, TICKS[0]) : 0;
  const final = lastTick !== undefined;
  const enter = pop(frame, fps, 0, 15);
  const groups = [[hh, 'hours'], [mm, 'minutes'], [ss, 'seconds']];
  return (
    <AbsoluteFill>
      <Background x={50} y={58} intensity={0.16 + (final ? 0.14 * Math.max(0, 1 - sinceTick / 20) : 0) + 0.06 * (1 - speed)} />
      {TICKS.map((f) => {
        const t = prog(frame, f, f + 26);
        return frame >= f && t < 1 ? (
          <div key={f} style={{ position: 'absolute', left: 960 - 300, top: 600 - 300, width: 600, height: 600, borderRadius: 999, border: `3px solid ${C.accent}`, transform: `scale(${0.6 + t * 1.8})`, opacity: (1 - t) * 0.6 }} />
        ) : null;
      })}
      <Caption
        tag="/launch"
        title="the hub goes live in"
        align="center"
        size={76}
        delay={0}
        style={{ position: 'absolute', left: 0, right: 0, top: 150 }}
      />
      <AbsoluteFill style={{ alignItems: 'center', justifyContent: 'center', top: 120 }}>
        <div style={{ display: 'flex', alignItems: 'flex-start', gap: 26, transform: `scale(${(0.85 + 0.15 * enter) * (1 + (sinceTick < 8 ? 0.04 * (1 - sinceTick / 8) : 0))})`, opacity: Math.min(1, enter * 1.4) }}>
          {groups.map(([v, label], gi) => (
            <div key={label} style={{ display: 'flex', alignItems: 'flex-start', gap: 26 }}>
              {gi > 0 && <div style={{ fontFamily: MONO, fontSize: 170, lineHeight: '250px', color: C.text3, opacity: 0.5 + 0.5 * (Math.floor(frame / 15) % 2) }}>:</div>}
              <div style={{ textAlign: 'center' }}>
                <div style={{ display: 'flex', gap: 14 }}>
                  {v.split('').map((d, i) => (
                    <Digit key={i} d={d} blur={gi === 2 ? speed * 10 : gi === 1 ? speed * 4 : 0} hot={final && gi === 2 && i === 1} pulse={sinceTick} />
                  ))}
                </div>
                <div style={{ fontFamily: MONO, fontSize: 22, color: C.text3, marginTop: 18, letterSpacing: '0.08em' }}>{label}</div>
              </div>
            </div>
          ))}
        </div>
      </AbsoluteFill>
      <div style={{ position: 'absolute', left: 0, right: 0, bottom: 110, textAlign: 'center', fontFamily: MONO, fontSize: 28, color: C.text2, ...flyIn(frame, 16, Infinity, 16) }}>
        Oct 29 · <span style={{ color: C.accent }}>15:00 UTC</span>
      </div>
    </AbsoluteFill>
  );
}

function Digit({ d, blur, hot, pulse }) {
  const slide = hot && pulse < 8 ? kf(pulse, [[0, -40], [8, 0]]) : 0;
  return (
    <div
      style={{
        width: 170, height: 250, borderRadius: 22, overflow: 'hidden',
        background: `linear-gradient(${C.surface2}, ${C.surface})`,
        border: `1px solid ${hot ? C.accentBorder : C.borderStrong}`,
        boxShadow: hot ? `0 0 ${60 * Math.max(0.3, 1 - pulse / 20)}px ${C.accent}55` : '0 30px 80px rgba(0,0,0,0.5)',
        display: 'grid', placeItems: 'center', position: 'relative', fontFamily: FONT,
      }}
    >
      <div style={{ position: 'absolute', left: 0, right: 0, top: '50%', height: 1, background: 'rgba(0,0,0,0.45)' }} />
      <span
        style={{
          fontFamily: MONO, fontSize: 190, fontWeight: 600, letterSpacing: '-0.04em',
          color: hot ? C.accent : C.text, filter: `blur(${blur}px)`, transform: `translateY(${slide}px)`,
          textShadow: hot ? `0 0 40px ${C.accent}88` : 'none',
        }}
      >
        {d}
      </span>
    </div>
  );
}
