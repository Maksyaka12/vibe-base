import React from 'react';
import ReactDOM from 'react-dom/client';
import { THEMES, getTheme } from './theme';
import { loadPublishedSchedule } from './data/scheduleLoader';
import { loadBuiltInRounds, loadPublishedRounds, watchPublishedRounds } from './data/claimRounds';

const theme = getTheme();
document.documentElement.dataset.theme = theme;

const fonts = document.createElement('link');
fonts.rel = 'stylesheet';
fonts.href = THEMES.find((t) => t.id === theme).fonts;
document.head.appendChild(fonts);

const loadTheme = {
  o1: () => import('./themes/o1'),
  based: () => import('./themes/o1'),
};

// Themes read the schedule only while rendering, so it just has to be applied before the first render.
// Published claim rounds get the same 2.5s budget; if they arrive later the claim page picks them up on its next tick.
const rounds = loadPublishedRounds();
rounds.then(() => watchPublishedRounds());
const roundsInTime = Promise.race([rounds, new Promise((r) => setTimeout(r, 2500))]);

// After a deploy, a tab opened before it asks for script files that no longer exist. Reload once to get the new ones.
// The reload is remembered in sessionStorage; without it (blocked storage) there is no reload, so it can never loop.
window.addEventListener('vite:preloadError', (event) => {
  try {
    const last = Number(sessionStorage.getItem('vibe_chunk_reload') || 0);
    if (Date.now() - last < 30000) return; // already reloaded just now: show the error instead of looping
    sessionStorage.setItem('vibe_chunk_reload', String(Date.now()));
  } catch (e) {
    return;
  }
  event.preventDefault();
  window.location.reload();
});

// The bundled claim rounds are local files, so they are always waited for (no time budget).
Promise.all([loadPublishedSchedule(), loadTheme[theme](), roundsInTime, loadBuiltInRounds().catch(() => {})]).then(([, { default: App }]) => {
  ReactDOM.createRoot(document.getElementById('root')).render(
    <React.StrictMode>
      <App />
    </React.StrictMode>
  );
});
