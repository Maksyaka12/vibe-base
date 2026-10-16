import React, { useEffect, useRef, useState } from 'react';
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
    <div ref={ref} className="o1-theme-switcher">
      <button
        type="button"
        className="o1-theme-switcher-trigger"
        onClick={() => setOpen((v) => !v)}
        aria-label="Change theme"
        aria-haspopup="menu"
        aria-expanded={open}
        title="Theme"
      >
        <Palette size={16} strokeWidth={1.75} />
      </button>
      {open && (
        <div className="o1-theme-switcher-menu" role="menu">
          <div className="o1-theme-switcher-label">Theme</div>
          {THEMES.map((t) => (
            <button
              key={t.id}
              type="button"
              role="menuitemradio"
              aria-checked={t.id === current}
              className={`o1-theme-switcher-item${t.id === current ? ' active' : ''}`}
              onClick={() => setTheme(t.id)}
            >
              <span>{t.label}</span>
              {t.id === current && <Check size={14} strokeWidth={2} />}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
