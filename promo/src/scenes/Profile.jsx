import { AbsoluteFill, Img, staticFile, useCurrentFrame, useVideoConfig } from 'remotion';
import { Background } from '../ui/Background';
import { Caption } from '../ui/Caption';
import { Browser } from '../ui/Browser';
import { Window3D } from '../ui/Window3D';
import { C, FONT, MONO } from '../theme';
import { prog, pop, kf, easeInOut } from '../ui/anim';

// 23–27s: profile page, a daily check-in streak fills up and SBT achievements unlock.
const ACH = [
  { src: 'ach/nft-holder.jpg', name: 'Vibe Club member' },
  { src: 'ach/staker.jpg', name: 'Novice staker' },
  { src: 'ach/banker.jpg', name: 'Confident banker' },
  { src: 'ach/wolf.jpg', name: 'Wolf of Wall St' },
];

export function Profile() {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const streak = Math.min(7, Math.floor(kf(frame, [[22, 0], [70, 7]], (t) => t) + 0.0001));
  const cardIn = pop(frame, fps, 14, 16);
  const out = prog(frame, 110, 120, easeInOut);
  const zoom = kf(frame, [[10, 1], [60, 1.18]]);
  return (
    <AbsoluteFill>
      <Background x={30} y={50} />
      <Window3D left={90} top={168} tilt={10} from="left" delay={0} outAt={110}>
        <Browser width={1060} shots="shots/profile.png" path="/profile" zoom={zoom} focus={[900, 400]} />
      </Window3D>
      <Caption
        tag="/profile"
        title="check in. level up."
        sub="daily streaks & soulbound achievements"
        delay={6}
        outAt={110}
        size={72}
        style={{ position: 'absolute', left: 1240, top: 140, width: 620 }}
      />

      <div
        style={{
          position: 'absolute', left: 1240, top: 520, width: 600, fontFamily: FONT,
          transform: `translateY(${(1 - cardIn) * 60}px)`, opacity: Math.min(1, cardIn * 1.4) * (1 - out),
          background: C.surface, border: `1px solid ${C.borderStrong}`, borderRadius: 20, padding: 26,
          boxShadow: '0 40px 120px rgba(0,0,0,0.7)',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
          <div style={{ width: 58, height: 58, borderRadius: 14, background: 'rgba(245,184,61,0.12)', border: '1px solid rgba(245,184,61,0.28)', display: 'grid', placeItems: 'center', fontSize: 30 }}>🔥</div>
          <div>
            <div style={{ fontFamily: MONO, fontSize: 16, color: C.text3 }}>current streak</div>
            <div style={{ fontFamily: MONO, fontSize: 40, fontWeight: 600, color: C.text, letterSpacing: '-0.03em' }}>{streak} days</div>
          </div>
        </div>
        <div style={{ display: 'flex', gap: 10, marginTop: 20 }}>
          {Array.from({ length: 7 }).map((_, i) => {
            const on = prog(frame, 22 + i * 7, 28 + i * 7);
            return <div key={i} style={{ flex: 1, height: 12, borderRadius: 99, background: C.surface3, overflow: 'hidden' }}>
              <div style={{ width: `${on * 100}%`, height: '100%', background: C.amber, boxShadow: `0 0 12px ${C.amber}` }} />
            </div>;
          })}
        </div>
        <div style={{ display: 'flex', gap: 12, marginTop: 22 }}>
          {ACH.map((a, i) => {
            const u = pop(frame, fps, 58 + i * 8, 11);
            return (
              <div key={a.src} style={{ flex: 1, textAlign: 'center' }}>
                <Img
                  src={staticFile(a.src)}
                  style={{
                    width: '100%', aspectRatio: '1', objectFit: 'cover', borderRadius: 12,
                    border: `1px solid ${u > 0.5 ? C.accentBorder : C.border}`,
                    filter: `grayscale(${1 - u}) brightness(${0.45 + 0.55 * u})`, transform: `scale(${0.9 + 0.1 * u})`,
                    boxShadow: u > 0.5 ? `0 0 30px ${C.accent}33` : 'none',
                  }}
                />
                <div style={{ fontSize: 14, color: u > 0.5 ? C.text : C.text3, marginTop: 8, fontWeight: 600 }}>{a.name}</div>
              </div>
            );
          })}
        </div>
      </div>
    </AbsoluteFill>
  );
}
