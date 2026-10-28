import { Img, staticFile } from 'remotion';
import { C, FONT, DOMAIN } from '../theme';

// Screenshots are 1440 CSS px wide (captured @2x). Everything inside the window is laid out
// in page CSS px and scaled to the window width, so cursor targets can use page coordinates.
export const PAGE_W = 1440;
export const PAGE_H = 900;
const BAR = 44;

// A macOS-ish o1 browser window showing `shot`. scrollY / zoom / focus are in page px.
export function Browser({ width, shots, path, scrollY = 0, zoom = 1, focus = [720, 450], children, glow = C.accent }) {
  const s = width / PAGE_W;
  const height = PAGE_H * s;
  const layers = Array.isArray(shots) ? shots : [{ src: shots, opacity: 1 }];
  return (
    <div
      style={{
        width, borderRadius: 18, overflow: 'hidden', background: C.bg,
        border: `1px solid ${C.borderStrong}`,
        boxShadow: `0 40px 120px rgba(0,0,0,0.65), 0 0 0 1px rgba(255,255,255,0.03), 0 0 120px ${glow}22`,
        fontFamily: FONT,
      }}
    >
      <div style={{ height: BAR, display: 'flex', alignItems: 'center', gap: 8, padding: '0 16px', background: C.bgBar, borderBottom: `1px solid ${C.border}` }}>
        {['#FF5F57', '#FEBC2E', '#28C840'].map((c) => (
          <span key={c} style={{ width: 12, height: 12, borderRadius: 99, background: c, opacity: 0.85 }} />
        ))}
        <div style={{ flex: 1, display: 'flex', justifyContent: 'center' }}>
          <div style={{ minWidth: 340, textAlign: 'center', fontSize: 15, color: C.text2, background: C.surface, border: `1px solid ${C.border}`, borderRadius: 8, padding: '5px 16px' }}>
            <span style={{ color: C.text3 }}>{DOMAIN}</span>{path}
          </div>
        </div>
        <span style={{ width: 52 }} />
      </div>
      <div style={{ position: 'relative', width, height, overflow: 'hidden' }}>
        <div
          style={{
            position: 'absolute', left: 0, top: 0, width: PAGE_W, transformOrigin: '0 0',
            transform: `scale(${s}) translate(${focus[0]}px, ${focus[1]}px) scale(${zoom}) translate(${-focus[0]}px, ${-focus[1] - scrollY}px)`,
          }}
        >
          {layers.map((l, i) => (
            <Img key={i} src={staticFile(l.src)} style={{ position: i ? 'absolute' : 'relative', left: 0, top: 0, width: PAGE_W, display: 'block', opacity: l.opacity }} />
          ))}
          {children}
        </div>
      </div>
    </div>
  );
}
