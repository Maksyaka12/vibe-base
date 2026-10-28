import { AbsoluteFill, useCurrentFrame } from 'remotion';
import { Background } from '../ui/Background';
import { Caption } from '../ui/Caption';
import { Browser } from '../ui/Browser';
import { Window3D } from '../ui/Window3D';
import { Cursor } from '../ui/Cursor';
import { prog, kf } from '../ui/anim';

// 6–12s: Rewards Hub, cursor clicks through the four reward programs.
const TABS = [
  { src: 'shots/hub-holders.png', x: 465, click: 0 },
  { src: 'shots/hub-vibeclub.png', x: 718, click: 52 },
  { src: 'shots/hub-staking.png', x: 971, click: 86 },
  { src: 'shots/hub-giveaways.png', x: 1224, click: 120 },
];
const CARD_Y = 285;

export function Rewards() {
  const frame = useCurrentFrame();
  const layers = TABS.map((t, i) => ({ src: t.src, opacity: i === 0 ? 1 : prog(frame, t.click + 3, t.click + 9) }));
  const path = [[28, 1200, 760], [46, TABS[1].x, CARD_Y], [56, TABS[1].x, CARD_Y], [80, TABS[2].x, CARD_Y], [90, TABS[2].x, CARD_Y], [114, TABS[3].x, CARD_Y], [124, TABS[3].x, CARD_Y], [170, 1180, 520]];
  const zoom = kf(frame, [[20, 1], [44, 1.28], [140, 1.28], [170, 1.05]]);
  const focusX = kf(frame, [[40, 720], [130, 1000]]);
  return (
    <AbsoluteFill>
      <Background x={72} y={45} />
      <Caption
        tag="/rewards"
        title="4 ways to earn"
        sub="holders · NFT club · staking · giveaways"
        delay={6}
        outAt={168}
        style={{ position: 'absolute', left: 110, top: 380, width: 640 }}
      />
      <Window3D left={700} top={168} delay={0} outAt={168}>
        <Browser width={1120} shots={layers} path="/hub" zoom={zoom} focus={[focusX, 230]}>
          <Cursor path={path} clicks={TABS.slice(1).map((t) => t.click)} />
        </Browser>
      </Window3D>
    </AbsoluteFill>
  );
}
