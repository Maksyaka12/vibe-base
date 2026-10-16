import { useEffect, useRef, useState } from 'react';
import { Palette, Check } from 'lucide-react';
import { THEMES, getTheme, setTheme } from '../../../theme';

export function ThemeSwitcher() {
  const [open, setOpen] = useState(false);
  const ref = useRef(null);
  const current = getTheme();

  useEffect(() => {
    if (!open) return;
    const close = (e) => {
      if (ref.current && !ref.current.contains(e.target)) setOpen(false);
    };
    const onKey = (e) => e.key === 'Escape' && setOpen(false);
    document.addEventListener('mousedown', close);
    document.addEventListener('keydown', onKey);
    return () => {
      document.removeEventListener('mousedown', close);
      document.removeEventListener('keydown', onKey);
    };
  }, [open]);

  return (
    <div ref={ref} style={{ position: 'relative', flexShrink: 0 }}>
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-label="Change theme"
        aria-haspopup="menu"
        aria-expanded={open}
        title="Theme"
        style={{
          width: '28px',
          height: '28px',
          padding: 0,
          background: 'rgba(4, 14, 36, 0.9)',
          border: '1.5px solid rgba(0, 245, 255, 0.45)',
          boxShadow: '0 0 8px rgba(0, 245, 255, 0.2)',
          borderRadius: '8px',
          display: 'inline-flex',
          alignItems: 'center',
          justifyContent: 'center',
          cursor: 'pointer',
          outline: 'none'
        }}
      >
        <Palette size={13} color="#00f5ff" strokeWidth={2.5} />
      </button>
      {open && (
        <div
          role="menu"
          style={{
            position: 'absolute',
            top: 'calc(100% + 8px)',
            right: 0,
            minWidth: '140px',
            padding: '6px',
            background: 'rgba(4, 14, 36, 0.98)',
            border: '1.5px solid rgba(0, 245, 255, 0.45)',
            boxShadow: '0 0 16px rgba(0, 245, 255, 0.25)',
            borderRadius: '10px',
            zIndex: 1000,
            fontFamily: "'Press Start 2P', monospace"
          }}
        >
          <div style={{ padding: '6px 8px', fontSize: '6.5px', color: '#88aacc', letterSpacing: '0.5px' }}>THEME</div>
          {THEMES.map((t) => {
            const active = t.id === current;
            return (
              <button
                key={t.id}
                type="button"
                role="menuitemradio"
                aria-checked={active}
                onClick={() => setTheme(t.id)}
                style={{
                  width: '100%',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  gap: '8px',
                  padding: '9px 8px',
                  background: active ? 'rgba(0, 245, 255, 0.12)' : 'transparent',
                  border: 'none',
                  borderRadius: '6px',
                  color: active ? '#00f5ff' : '#ffffff',
                  fontFamily: "'Press Start 2P', monospace",
                  fontSize: '7.5px',
                  textTransform: 'uppercase',
                  cursor: 'pointer'
                }}
              >
                <span>{t.label}</span>
                {active && <Check size={11} color="#00f5ff" strokeWidth={3} />}
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}
