import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';

// Remove any service worker left over from an older build and wipe its caches.
// A previous version shipped a cache-first worker that pinned stale HTML/assets;
// this guarantees returning devices drop it and stop serving cached content.
if ('serviceWorker' in navigator) {
  navigator.serviceWorker.getRegistrations()
    .then((regs) => regs.forEach((reg) => reg.unregister()))
    .catch(() => {});
}
if (window.caches && caches.keys) {
  caches.keys().then((keys) => keys.forEach((key) => caches.delete(key))).catch(() => {});
}

const root = ReactDOM.createRoot(document.getElementById('root'));
root.render(<App />);
