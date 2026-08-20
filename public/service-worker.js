// Kill switch. Earlier versions registered a cache-first service worker that
// served stale HTML/assets forever. Browsers periodically re-fetch the
// registered SW script, so this replacement unregisters itself, deletes every
// cache, and reloads open tabs — after which no service worker caches anything.
self.addEventListener('install', () => self.skipWaiting());

self.addEventListener('activate', (event) => {
  event.waitUntil((async () => {
    const keys = await caches.keys();
    await Promise.all(keys.map((key) => caches.delete(key)));
    await self.registration.unregister();
    const clients = await self.clients.matchAll({ type: 'window' });
    for (const client of clients) client.navigate(client.url);
  })());
});

// Always go straight to the network — never serve from a cache.
self.addEventListener('fetch', (event) => {
  event.respondWith(fetch(event.request));
});
