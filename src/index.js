import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';

// Register a network-first service worker so the app stays installable (the
// "Add to home screen" / install prompt needs a registered worker) while never
// serving stale content online — see public/service-worker.js.
if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('/service-worker.js').catch(() => {});
  });
}

const root = ReactDOM.createRoot(document.getElementById('root'));
root.render(<App />);
