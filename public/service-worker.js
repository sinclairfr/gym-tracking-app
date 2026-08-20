// Network-first service worker.
//
// Its job is twofold: make the app installable (a PWA needs a registered
// worker with a fetch handler for the "Add to home screen" / install prompt),
// and NEVER serve stale content while online — the whole point of the earlier
// cache purge. So every request goes to the network first; the cache is only a
// fallback used when the device is offline.

const CACHE = 'gym-tracker-runtime-v2';

self.addEventListener('install', () => self.skipWaiting());

self.addEventListener('activate', (event) => {
  event.waitUntil((async () => {
    // Drop any other cache (including the old cache-first 'gym-tracker-v1'
    // app-shell that used to pin stale HTML).
    const keys = await caches.keys();
    await Promise.all(keys.filter((k) => k !== CACHE).map((k) => caches.delete(k)));
    await self.clients.claim();
  })());
});

self.addEventListener('fetch', (event) => {
  const req = event.request;
  if (req.method !== 'GET') return;

  const url = new URL(req.url);
  // Never touch API calls or cross-origin requests — straight to network.
  if (url.origin !== self.location.origin || url.pathname.startsWith('/api/')) return;

  event.respondWith((async () => {
    try {
      // Online: always take the fresh network response and refresh the
      // offline fallback copy.
      const fresh = await fetch(req);
      if (fresh && fresh.ok) {
        const cache = await caches.open(CACHE);
        cache.put(req, fresh.clone());
      }
      return fresh;
    } catch {
      // Offline: serve the last-seen copy if we have one.
      const cached = await caches.match(req);
      if (cached) return cached;
      if (req.mode === 'navigate') {
        const idx = (await caches.match('/index.html')) || (await caches.match('/'));
        if (idx) return idx;
      }
      throw new Error('offline and not cached');
    }
  })());
});
