import React from 'react';
import ReactDOM from 'react-dom/client';
import { THEMES, getTheme } from './theme';
import { loadPublishedSchedule } from './data/scheduleLoader';
import { loadPublishedRounds, watchPublishedRounds } from './data/claimRounds';

// Until OPEN_AT every page shows the upgrade screen; at OPEN_AT open tabs reload into the app by themselves.
// Time comes from the server (Date header), so a wrong device clock cannot open the site early.
const OPEN_AT = Date.parse('2026-10-29T15:00:00Z');
const CHECK_UNTIL = OPEN_AT + 24 * 60 * 60 * 1000; // after a day the check is skipped entirely

async function serverNow() {
  try {
    const res = await fetch(`/?now=${Date.now()}`, { method: 'HEAD', cache: 'no-store' });
    const date = Date.parse(res.headers.get('date'));
    if (!Number.isNaN(date)) return date;
  } catch {}
  return Date.now();
}

const root = ReactDOM.createRoot(document.getElementById('root'));

function addFonts(theme) {
  const fonts = document.createElement('link');
  fonts.rel = 'stylesheet';
  fonts.href = THEMES.find((t) => t.id === theme).fonts;
  document.head.appendChild(fonts);
}

async function showMaintenance(now) {
  // the upgrade screen is drawn with the o1 tokens, whatever theme the visitor picked
  document.documentElement.dataset.theme = 'o1';
  addFonts('o1');
  const [, { default: Maintenance }] = await Promise.all([import('./themes/o1'), import('./Maintenance.jsx')]);
  root.render(<Maintenance openAt={OPEN_AT} offset={now - Date.now()} />);
  setTimeout(() => window.location.reload(), Math.max(0, OPEN_AT - now) + 1500);
}

function startApp() {
  const theme = getTheme();
  document.documentElement.dataset.theme = theme;
  addFonts(theme);

  const loadTheme = {
    o1: () => import('./themes/o1'),
    based: () => import('./themes/o1'),
  };

  // Themes read the schedule only while rendering, so it just has to be applied before the first render.
  // Published claim rounds get the same 2.5s budget; if they arrive later the claim page picks them up on its next tick.
  const rounds = loadPublishedRounds();
  rounds.then(() => watchPublishedRounds());
  const roundsInTime = Promise.race([rounds, new Promise((r) => setTimeout(r, 2500))]);

  Promise.all([loadPublishedSchedule(), loadTheme[theme](), roundsInTime]).then(([, { default: App }]) => {
    root.render(
      <React.StrictMode>
        <App />
      </React.StrictMode>
    );
  });
}

(async () => {
  const now = Date.now() < CHECK_UNTIL ? await serverNow() : Date.now();
  if (now < OPEN_AT) showMaintenance(now);
  else startApp();
})();
