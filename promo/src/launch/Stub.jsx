import { AbsoluteFill, useCurrentFrame } from 'remotion';
import { Background } from '../ui/Background';
import { Browser } from '../ui/Browser';
import { Window3D } from '../ui/Window3D';
import { C } from '../theme';
import { kf, prog, easeInOut } from '../ui/anim';

// 0–5s: the live vibehome.dog stub. "Coming soon" glitches into the launch date, then the camera
// pushes in on the date line. Boxes come from scripts/capture-stub.mjs (page px).
const SWAP = 54;
const FOOT = [720, 606];

export function Stub() {
  const frame = useCurrentFrame();
  const swap = prog(frame, SWAP, SWAP + 8);
  const glitch = frame >= SWAP - 4 && frame < SWAP + 10;
  const zoom = kf(frame, [[0, 1], [50, 1.12], [72, 1.12], [118, 2.6], [150, 4.2]]);
  const focusY = kf(frame, [[60, 450], [118, FOOT[1]]]);
  const out = prog(frame, 132, 150, easeInOut);
  const jitter = glitch ? Math.sin(frame * 7.3) * 10 : 0;
  return (
    <AbsoluteFill>
      <Background x={50} y={45} intensity={0.18} />
      <AbsoluteFill style={{ opacity: 1 - out, filter: `blur(${out * 14}px)` }}>
        <Window3D left={180} top={110} tilt={0} from="bottom" delay={0} extraScale={1}>
          <Browser
            width={1560}
            path=""
            zoom={zoom}
            focus={[FOOT[0], focusY]}
            shots={[
              { src: 'launch/stub.png', opacity: 1 },
              { src: 'launch/stub-date.png', opacity: swap },
            ]}
          >
            {glitch && (
              <>
                <div style={{ position: 'absolute', left: 560 + jitter, top: 590, width: 320, height: 26, background: `${C.accent}33`, mixBlendMode: 'screen' }} />
                <div style={{ position: 'absolute', left: 600 - jitter, top: 418, width: 240, height: 22, background: `${C.accent}26`, mixBlendMode: 'screen' }} />
              </>
            )}
            <div
              style={{
                position: 'absolute', left: 580, top: 579, height: 5, borderRadius: 9,
                width: 280 * prog(frame, SWAP + 4, SWAP + 30), background: C.accent,
                boxShadow: `0 0 18px ${C.accent}`, opacity: swap,
              }}
            />
          </Browser>
        </Window3D>
      </AbsoluteFill>
    </AbsoluteFill>
  );
}
