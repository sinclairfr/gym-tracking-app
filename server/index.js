const express = require('express');
const cors    = require('cors');
const path    = require('path');

const app  = express();
const PORT = process.env.PORT || 3001;

app.use(cors());
app.use(express.json({ limit: '10mb' }));

app.use('/api/auth', require('./routes/auth'));
app.use('/api',      require('./routes/data'));

if (process.env.NODE_ENV === 'production') {
  app.use(express.static(path.join(__dirname, '../build')));
  app.get('*', (_req, res) => res.sendFile(path.join(__dirname, '../build/index.html')));
}

app.listen(PORT, () => console.log(`[server] http://localhost:${PORT}`));
