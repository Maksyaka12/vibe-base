import React from 'react';
import ReactDOM from 'react-dom/client';
import Maintenance from './Maintenance.jsx';
import './index.css';

// While true, every page shows the upgrade screen and the app itself is not loaded.
const MAINTENANCE = true;

const root = ReactDOM.createRoot(document.getElementById('root'));

if (MAINTENANCE) {
  root.render(<Maintenance />);
} else {
  import('./App.jsx').then(({ default: App }) => {
    root.render(
      <React.StrictMode>
        <App />
      </React.StrictMode>
    );
  });
}
