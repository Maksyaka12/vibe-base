import React from 'react';
import ReactDOM from 'react-dom/client';
import { THEMES, getTheme } from './theme';

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

loadTheme[theme]().then(({ default: App }) => {
  ReactDOM.createRoot(document.getElementById('root')).render(
    <React.StrictMode>
      <App />
    </React.StrictMode>
  );
});
