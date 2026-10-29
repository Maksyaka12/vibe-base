import { useEffect, useState } from 'react';
import './maintenance.css';

const pad = (n) => String(n).padStart(2, '0');

// Shown on every page while Vibe Hub is being upgraded (see OPEN_AT in main.jsx).
// `openAt` is when the site opens, `offset` = server clock minus device clock, so the countdown is right
// even on a device with a wrong clock.
export default function Maintenance({ openAt, offset = 0 }) {
  const [now, setNow] = useState(() => Date.now() + offset);
  useEffect(() => {
    const id = setInterval(() => setNow(Date.now() + offset), 1000);
    return () => clearInterval(id);
  }, [offset]);

  const left = openAt ? Math.max(0, Math.floor((openAt - now) / 1000)) : 0;
  const parts = [
    [Math.floor(left / 3600), 'hours'],
    [Math.floor((left % 3600) / 60), 'min'],
    [left % 60, 'sec'],
  ];
  const opens = openAt && new Date(openAt);

  return (
    <main className="mt-root">
      <div className="mt-grid" aria-hidden="true" />
      <div className="mt-glow" aria-hidden="true" />

      <section className="mt-card">
        <div className="mt-logo">
          <span className="mt-ring" aria-hidden="true" />
          <span className="mt-ring mt-ring-2" aria-hidden="true" />
          <img src="/new-logo.png" alt="Vibe Hub" />
        </div>

        <div className="mt-badge">
          <span className="mt-dot" />
          Upgrade in progress
        </div>

        <h1 className="mt-title">
          Vibe Hub is <span>upgrading</span>
        </h1>
        <p className="mt-sub">We're building something better. Back very soon.</p>

        {openAt && (
          <div className="mt-timer" role="timer" aria-label={`Opens in ${parts.map(([v, l]) => `${v} ${l}`).join(' ')}`}>
            {parts.map(([value, label], i) => (
              <div key={label} className="mt-timer-part">
                {i > 0 && <span className="mt-timer-sep" aria-hidden="true">:</span>}
                <div className="mt-timer-cell">
                  <b>{pad(value)}</b>
                  <span>{label}</span>
                </div>
              </div>
            ))}
          </div>
        )}

        <div className="mt-progress" aria-hidden="true">
          <span />
        </div>
        <div className="mt-foot">{opens ? `Opens at ${pad(opens.getUTCHours())}:${pad(opens.getUTCMinutes())} UTC` : 'Coming soon'}</div>
      </section>
    </main>
  );
}
