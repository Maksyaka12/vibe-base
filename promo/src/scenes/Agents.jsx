import { AbsoluteFill, Img, staticFile, useCurrentFrame, useVideoConfig } from 'remotion';
import { Background } from '../ui/Background';
import { Caption } from '../ui/Caption';
import { Browser } from '../ui/Browser';
import { Window3D } from '../ui/Window3D';
import { Cursor } from '../ui/Cursor';
import { Check } from './Claim';
import { C, FONT, MONO } from '../theme';
import { prog, pop, kf, flyIn, easeInOut } from '../ui/anim';

// 27–35s: Agent Zone. Part A shows the real page, part B a chat where the agent does everything.
const SPLIT = 108;
const PROMPT = 'Claim all my Vibe rewards';
const STEPS = [
  { text: 'Daily check-in', meta: 'streak 8' },
  { text: 'Claimed 3 rewards', meta: '+69,650 $VIBE' },
  { text: 'Staked 90% in Epoch 7', meta: 'o1 vault' },
];
const BRANDS = ['brands/claude.svg', 'brands/openai.svg', 'brands/cursor.svg', 'brands/bankr.png'];

export function Agents() {
  const frame = useCurrentFrame();
  return (
    <AbsoluteFill>
      <Background color={C.agent} x={frame < SPLIT ? 70 : 50} y={45} intensity={0.2} />
      {frame < SPLIT + 12 && <PartA />}
      {frame >= SPLIT - 4 && <PartB />}
    </AbsoluteFill>
  );
}

function PartA() {
  const frame = useCurrentFrame();
  const scrollY = kf(frame, [[30, 0], [80, 760]]);
  const zoom = kf(frame, [[6, 1], [30, 1.12], [80, 1]]);
  return (
    <>
      <Caption
        tag="/agents"
        title="or let your agent do it."
        sub="Claude, ChatGPT, Bankr or any agent"
        color={C.agent}
        delay={4}
        outAt={SPLIT - 6}
        size={92}
        style={{ position: 'absolute', left: 110, top: 360, width: 640 }}
      />
      <Window3D left={700} top={168} delay={0} outAt={SPLIT - 6}>
        <Browser width={1120} shots="shots/agents-full.png" path="/agents" scrollY={scrollY} zoom={zoom} focus={[860, 200]} glow={C.agent}>
          <Cursor path={[[40, 1100, 820], [70, 478, 1112], [86, 478, 1112]]} clicks={[76]} color={C.agent} />
        </Browser>
      </Window3D>
    </>
  );
}

function PartB() {
  const f = useCurrentFrame() - SPLIT;
  const { fps } = useVideoConfig();
  const enter = pop(f, fps, 0, 16);
  const out = prog(f, 120, 132, easeInOut);
  const typed = Math.floor(kf(f, [[16, 0], [42, PROMPT.length]], (t) => t));
  const sent = f >= 46;
  return (
    <AbsoluteFill style={{ opacity: Math.min(1, enter * 1.5) * (1 - out), filter: `blur(${out * 8}px)` }}>
      <Orbit f={f} />
      <div style={{ position: 'absolute', left: 120, top: 720, width: 640, textAlign: 'center' }}>
        <div style={{ ...flyIn(f, 8, Infinity, 20), fontFamily: FONT, fontSize: 30, color: C.text2, fontWeight: 500, lineHeight: 1.4 }}>
          no pop-ups. no signatures.<br /><span style={{ color: C.agent }}>you stay in control.</span>
        </div>
      </div>

      <div
        style={{
          position: 'absolute', left: 860, top: 160, width: 940, fontFamily: FONT,
          transform: `translateX(${(1 - enter) * 200}px)`,
          background: C.surface, border: `1px solid ${C.borderStrong}`, borderRadius: 22, overflow: 'hidden',
          boxShadow: `0 50px 140px rgba(0,0,0,0.75), 0 0 100px ${C.agent}1f`,
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '18px 26px', borderBottom: `1px solid ${C.border}`, background: C.bgBar }}>
          <Img src={staticFile('new-logo.png')} style={{ width: 34, height: 34, borderRadius: 99 }} />
          <span style={{ fontSize: 22, fontWeight: 700, color: C.text }}>Vibe Agent</span>
          <span style={{ marginLeft: 'auto', fontFamily: MONO, fontSize: 15, color: C.agent, background: C.agentSoft, border: `1px solid ${C.agentBorder}`, borderRadius: 999, padding: '4px 12px' }}>● agent wallet</span>
        </div>
        <div style={{ padding: 28, minHeight: 560, display: 'flex', flexDirection: 'column', gap: 18 }}>
          {sent && (
            <div style={{ alignSelf: 'flex-end', ...flyIn(f, 46, Infinity, 20) }}>
              <div style={{ background: C.agent, color: C.onAgent, fontSize: 26, fontWeight: 600, padding: '16px 24px', borderRadius: '20px 20px 6px 20px' }}>{PROMPT}</div>
            </div>
          )}
          {f >= 56 && (
            <div style={{ alignSelf: 'flex-start', width: 640, ...flyIn(f, 56, Infinity, 20), background: C.surface2, border: `1px solid ${C.border}`, borderRadius: '20px 20px 20px 6px', padding: '20px 24px' }}>
              {f < 64 ? <Dots f={f} /> : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
                  {STEPS.map((s, i) => {
                    const at = 64 + i * 14;
                    if (f < at) return null;
                    const done = f >= at + 8;
                    return (
                      <div key={s.text} style={{ ...flyIn(f, at, Infinity, 12), display: 'flex', alignItems: 'center', gap: 14 }}>
                        <span style={{ width: 34, height: 34, borderRadius: 99, display: 'grid', placeItems: 'center', background: done ? C.agent : 'transparent', border: done ? 'none' : `3px solid ${C.agent}55`, borderTopColor: C.agent, transform: done ? 'none' : `rotate(${f * 24}deg)` }}>
                          {done && <Check color={C.onAgent} size={18} />}
                        </span>
                        <span style={{ fontSize: 24, color: C.text, fontWeight: 600 }}>{s.text}</span>
                        <span style={{ marginLeft: 'auto', fontFamily: MONO, fontSize: 20, color: done ? C.agent : C.text3 }}>{s.meta}</span>
                      </div>
                    );
                  })}
                  {f >= 110 && <div style={{ ...flyIn(f, 110, Infinity, 10), fontSize: 22, color: C.text2, marginTop: 4 }}>All done. See you tomorrow 🐾</div>}
                </div>
              )}
            </div>
          )}
        </div>
        <div style={{ margin: '0 22px 22px', display: 'flex', alignItems: 'center', gap: 12, background: C.bg, border: `1px solid ${sent ? C.border : C.agentBorder}`, borderRadius: 16, padding: '16px 20px' }}>
          <span style={{ fontSize: 24, color: sent ? C.text3 : C.text, flex: 1 }}>
            {sent ? 'Ask your agent…' : PROMPT.slice(0, typed)}
            {!sent && <span style={{ opacity: Math.floor(f / 8) % 2 ? 0 : 1, color: C.agent }}>|</span>}
          </span>
          <span style={{ width: 44, height: 44, borderRadius: 12, background: C.agent, display: 'grid', placeItems: 'center', transform: `scale(${f >= 43 && f < 47 ? 0.88 : 1})` }}>
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke={C.onAgent} strokeWidth="2.6" strokeLinecap="round" strokeLinejoin="round"><path d="M12 19V5M5 12l7-7 7 7" /></svg>
          </span>
        </div>
      </div>
    </AbsoluteFill>
  );
}

function Orbit({ f }) {
  const { fps } = useVideoConfig();
  const cx = 440;
  const cy = 430;
  const R = 210;
  return (
    <>
      <div style={{ position: 'absolute', left: cx - R, top: cy - R, width: R * 2, height: R * 2, borderRadius: 999, border: `1px dashed ${C.agentBorder}` }} />
      <div style={{ position: 'absolute', left: cx - R * 0.6, top: cy - R * 0.6, width: R * 1.2, height: R * 1.2, borderRadius: 999, border: `1px solid ${C.border}` }} />
      <Img src={staticFile('new-logo.png')} style={{ position: 'absolute', left: cx - 80, top: cy - 80, width: 160, height: 160, borderRadius: 999, boxShadow: `0 0 80px ${C.agent}55`, transform: `scale(${pop(f, fps, 0, 12)})` }} />
      {BRANDS.map((b, i) => {
        const a = (i / BRANDS.length) * Math.PI * 2 + f / 40;
        const s = pop(f, fps, 6 + i * 4, 12);
        return (
          <div key={b} style={{ position: 'absolute', left: cx + Math.cos(a) * R - 38, top: cy + Math.sin(a) * R - 38, width: 76, height: 76, borderRadius: 20, background: C.surface2, border: `1px solid ${C.borderStrong}`, display: 'grid', placeItems: 'center', transform: `scale(${s})`, boxShadow: '0 12px 40px rgba(0,0,0,0.6)' }}>
            <Img src={staticFile(b)} style={{ width: 44, height: 44, objectFit: 'contain', borderRadius: 8 }} />
          </div>
        );
      })}
    </>
  );
}

function Dots({ f }) {
  return (
    <div style={{ display: 'flex', gap: 8, padding: '6px 0' }}>
      {[0, 1, 2].map((i) => <span key={i} style={{ width: 12, height: 12, borderRadius: 99, background: C.agent, opacity: 0.3 + 0.7 * Math.max(0, Math.sin((f - i * 3) / 3)) }} />)}
    </div>
  );
}
