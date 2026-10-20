import React from 'react';
import ReactDOM from 'react-dom/client';
import { THEMES, getTheme } from './theme';
import { loadPublishedSchedule } from './data/scheduleLoader';
import { loadPublishedRounds, watchPublishedRounds } from './data/claimRounds';

const theme = getTheme();
document.documentElement.dataset.theme = theme;

const fonts = document.createElement('link');
fonts.rel = 'stylesheet';
fonts.href = THEMES.find((t) => t.id === theme).fonts;
document.head.appendChild(fonts);

const loadTheme = {
  o1: () => import('./themes/o1'),
  pixel: () => import('./themes/pixel'),
};

// Themes read the schedule only while rendering, so it just has to be applied before the first render.
// Published claim rounds get the same 2.5s budget; if they arrive later the claim page picks them up on its next tick.
const rounds = loadPublishedRounds();
rounds.then(() => watchPublishedRounds());
const roundsInTime = Promise.race([rounds, new Promise((r) => setTimeout(r, 2500))]);

Promise.all([loadPublishedSchedule(), loadTheme[theme](), roundsInTime]).then(([, { default: App }]) => {
  ReactDOM.createRoot(document.getElementById('root')).render(
    <React.StrictMode>
      <App />
    </React.StrictMode>
  );
});
