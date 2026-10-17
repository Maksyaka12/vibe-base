import React from 'react';
import ReactDOM from 'react-dom/client';
import { THEMES, getTheme } from './theme';
import { loadPublishedSchedule } from './data/scheduleLoader';

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
Promise.all([loadPublishedSchedule(), loadTheme[theme]()]).then(([, { default: App }]) => {
  ReactDOM.createRoot(document.getElementById('root')).render(
    <React.StrictMode>
      <App />
    </React.StrictMode>
  );
});
