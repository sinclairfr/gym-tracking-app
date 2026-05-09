const router = require('express').Router();
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const db = require('../db');
const { JWT_SECRET } = require('../auth');

const DEFAULT_EXERCISES = [
  'Dumbbell\nShoulder Press', 'Dumbbell\nSquats',   'Dumbbell\nCurl',
  'Shoulder\nShrugs',         'Bent-Over\nRow',       'Bent-Over\nDumbbell Row',
  'Push-Ups\n×10',            'Hammer\nCurl',         'Arnold\nPress',
  'Upright\nRow',             'Front\nRaise',         'Lateral\nRaise',
];

router.post('/register', async (req, res) => {
  const { username, password } = req.body ?? {};
  if (!username || !password) return res.status(400).json({ error: 'Username and password required' });
  if (username.length < 3)    return res.status(400).json({ error: 'Username must be at least 3 characters' });
  if (password.length < 6)    return res.status(400).json({ error: 'Password must be at least 6 characters' });

  try {
    const hash = await bcrypt.hash(password, 10);
    const { lastInsertRowid: userId } = db
      .prepare('INSERT INTO users (username, password_hash) VALUES (?, ?)')
      .run(username.trim(), hash);

    const insertEx = db.prepare('INSERT INTO exercises (user_id, name, position) VALUES (?, ?, ?)');
    DEFAULT_EXERCISES.forEach((name, i) => insertEx.run(userId, name, i));

    const token = jwt.sign({ id: userId, username: username.trim() }, JWT_SECRET, { expiresIn: '30d' });
    res.json({ token, user: { id: userId, username: username.trim() } });
  } catch (e) {
    if (e.message?.includes('UNIQUE')) return res.status(409).json({ error: 'Username already taken' });
    console.error(e);
    res.status(500).json({ error: 'Server error' });
  }
});

router.post('/login', async (req, res) => {
  const { username, password } = req.body ?? {};
  if (!username || !password) return res.status(400).json({ error: 'Username and password required' });

  const user = db.prepare('SELECT * FROM users WHERE username = ?').get(username.trim());
  if (!user) return res.status(401).json({ error: 'Invalid credentials' });

  const valid = await bcrypt.compare(password, user.password_hash);
  if (!valid) return res.status(401).json({ error: 'Invalid credentials' });

  const token = jwt.sign({ id: user.id, username: user.username }, JWT_SECRET, { expiresIn: '30d' });
  res.json({ token, user: { id: user.id, username: user.username } });
});

module.exports = router;
