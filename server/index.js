const express = require('express');
const cors    = require('cors');
const path    = require('path');

const app  = express();
const PORT = process.env.PORT || 3001;

app.use(cors());
app.use(express.json({ limit: '10mb' }));

// ── Disable all caching ───────────────────────────────────────────────────────
// The app is served through a Cloudflare tunnel that would otherwise cache HTML
// and assets at the edge, and browsers kept stale copies too. Force every
// response to revalidate so a deploy is picked up immediately.
app.use((_req, res, next) => {
  res.set('Cache-Control', 'no-store, no-cache, must-revalidate, proxy-revalidate, max-age=0');
  res.set('Pragma', 'no-cache');
  res.set('Expires', '0');
  res.set('Surrogate-Control', 'no-store'); // tells Cloudflare not to cache
  next();
});

app.use('/api/auth', require('./routes/auth'));
app.use('/api',      require('./routes/data'));

if (process.env.NODE_ENV === 'production') {
  app.use(express.static(path.join(__dirname, '../build'), {
    etag: false,
    lastModified: false,
    cacheControl: false,
    setHeaders: (res) => res.set('Cache-Control', 'no-store, no-cache, must-revalidate, max-age=0'),
  }));
  app.get('*', (_req, res) => {
    res.set('Cache-Control', 'no-store, no-cache, must-revalidate, max-age=0');
    res.sendFile(path.join(__dirname, '../build/index.html'));
  });
}

app.listen(PORT, () => console.log(`[server] http://localhost:${PORT}`));
