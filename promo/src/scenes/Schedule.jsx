import { AbsoluteFill, useCurrentFrame } from 'remotion';
import { Background } from '../ui/Background';
import { Caption } from '../ui/Caption';
import { Browser } from '../ui/Browser';
import { Window3D } from '../ui/Window3D';
import { C, MONO } from '../theme';
import { kf, flyIn, prog, fmt } from '../ui/anim';

// 12–17s: caption on top, wide window scrolls down to the unlock schedule and zooms into it.
export function Schedule() {
  const frame = useCurrentFrame();
  const scrollY = kf(frame, [[14, 0], [70, 690], [140, 690]]);
  const zoom = kf(frame, [[60, 1], [92, 1.35], [150, 1.35]]);
  const pool = 10_000_000 * prog(frame, 40, 90);
  return (
    <AbsoluteFill>
      <Background x={50} y={70} intensity={0.2} />
      <Caption
        tag="/schedule"
        title="never miss a round"
        sub="every snapshot, every unlock, on one page"
        align="center"
        size={84}
        delay={2}
        outAt={140}
        style={{ position: 'absolute', left: 0, right: 0, top: 70 }}
      />
      <Window3D left={360} top={400} tilt={0} from="bottom" delay={6} outAt={140}>
        <Browser width={1200} shots="shots/hub-full.png" path="/hub" scrollY={scrollY} zoom={zoom} focus={[560, 280]} />
      </Window3D>
      <div style={{ position: 'absolute', right: 120, top: 520, ...flyIn(frame, 48, 140, 30) }}>
        <Chip label="per unlock" value={`${fmt(pool)} $VIBE`} />
      </div>
      <div style={{ position: 'absolute', left: 130, top: 760, ...flyIn(frame, 62, 140, 30) }}>
        <Chip label="next snapshot" value="in 26d 10h" accent={C.green} />
      </div>
    </AbsoluteFill>
  );
}

export function Chip({ label, value, accent = C.accent }) {
  return (
    <div style={{ background: 'rgba(17,19,23,0.92)', border: `1px solid ${C.borderStrong}`, borderRadius: 16, padding: '16px 22px', boxShadow: '0 20px 60px rgba(0,0,0,0.6)', backdropFilter: 'blur(10px)' }}>
      <div style={{ fontFamily: MONO, fontSize: 16, color: C.text3, marginBottom: 6 }}>{label}</div>
      <div style={{ fontFamily: MONO, fontSize: 30, fontWeight: 600, color: accent, letterSpacing: '-0.02em' }}>{value}</div>
    </div>
  );
}
