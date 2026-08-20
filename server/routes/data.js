const router = require('express').Router();
const db = require('../db');
const { requireAuth } = require('../auth');

router.use(requireAuth);

// ── Exercises ─────────────────────────────────────────────────────────────────

router.get('/exercises', (req, res) => {
  const rows = db
    .prepare('SELECT name FROM exercises WHERE user_id = ? ORDER BY position')
    .all(req.user.id);
  res.json(rows.map(r => r.name));
});

router.post('/exercises', (req, res) => {
  const name = req.body?.name?.trim();
  if (!name) return res.status(400).json({ error: 'Name required' });
  const { m } = db
    .prepare('SELECT MAX(position) AS m FROM exercises WHERE user_id = ?')
    .get(req.user.id);
  db.prepare('INSERT INTO exercises (user_id, name, position) VALUES (?, ?, ?)')
    .run(req.user.id, name, (m ?? -1) + 1);
  res.json({ ok: true });
});

router.put('/exercises/:index', (req, res) => {
  const idx = +req.params.index;
  const name = req.body?.name?.trim();
  if (!name) return res.status(400).json({ error: 'Name required' });
  const info = db.prepare('UPDATE exercises SET name = ? WHERE user_id = ? AND position = ?')
    .run(name, req.user.id, idx);
  if (info.changes === 0) return res.status(404).json({ error: 'Exercise not found' });
  res.json({ ok: true });
});

router.delete('/exercises/:index', (req, res) => {
  const idx = +req.params.index;
  const uid = req.user.id;
  const info = db.prepare('DELETE FROM exercises WHERE user_id = ? AND position = ?').run(uid, idx);
  if (info.changes === 0) return res.status(404).json({ error: 'Exercise not found' });
  db.prepare('UPDATE exercises SET position = position - 1 WHERE user_id = ? AND position > ?').run(uid, idx);
  db.prepare('DELETE FROM day_strokes WHERE user_id = ? AND exercise_index = ?').run(uid, idx);
  db.prepare('UPDATE day_strokes SET exercise_index = exercise_index - 1 WHERE user_id = ? AND exercise_index > ?').run(uid, idx);
  res.json({ ok: true });
});

// ── Week data ─────────────────────────────────────────────────────────────────

router.get('/week/:weekStamp', (req, res) => {
  const { weekStamp } = req.params;
  const uid = req.user.id;

  const strokeRows = db
    .prepare('SELECT day_index, exercise_index, strokes FROM day_strokes WHERE user_id = ? AND week_stamp = ?')
    .all(uid, weekStamp);

  const checkRows = db
    .prepare('SELECT day_index FROM day_checks WHERE user_id = ? AND week_stamp = ?')
    .all(uid, weekStamp);

  const checkedSet = new Set(checkRows.map(r => r.day_index));

  // Build days 0-6
  const days = {};
  for (let d = 0; d < 7; d++) {
    days[d] = { checked: checkedSet.has(d), strokes: {} };
  }
  for (const row of strokeRows) {
    try { days[row.day_index].strokes[row.exercise_index] = JSON.parse(row.strokes); } catch {}
  }

  res.json({ days });
});

// Save strokes for a specific day + exercise
router.put('/week/:weekStamp/day/:day/strokes/:ex', (req, res) => {
  const { weekStamp, day, ex } = req.params;
  const { strokes } = req.body;
  db.prepare(`
    INSERT INTO day_strokes (user_id, week_stamp, day_index, exercise_index, strokes)
    VALUES (?, ?, ?, ?, ?)
    ON CONFLICT(user_id, week_stamp, day_index, exercise_index)
    DO UPDATE SET strokes = excluded.strokes
  `).run(req.user.id, weekStamp, +day, +ex, JSON.stringify(strokes ?? []));
  res.json({ ok: true });
});

// Check / uncheck a day
router.put('/week/:weekStamp/day/:day/check', (req, res) => {
  const { weekStamp, day } = req.params;
  const { checked } = req.body;
  const uid = req.user.id;
  if (checked) {
    db.prepare('INSERT OR IGNORE INTO day_checks (user_id, week_stamp, day_index) VALUES (?, ?, ?)')
      .run(uid, weekStamp, +day);
  } else {
    db.prepare('DELETE FROM day_checks WHERE user_id = ? AND week_stamp = ? AND day_index = ?')
      .run(uid, weekStamp, +day);
  }
  res.json({ ok: true });
});

// Most recent checked day for the authenticated user.
// Return the raw week stamp + day index; the client turns it into a
// "days ago" value using the device's local timezone (see weeks.daysAgoSince).
router.get('/last-workout', (req, res) => {
  const row = db
    .prepare('SELECT week_stamp, day_index FROM day_checks WHERE user_id = ? ORDER BY week_stamp DESC, day_index DESC LIMIT 1')
    .get(req.user.id);

  if (!row) return res.json({ weekStamp: null, dayIndex: null });
  res.json({ weekStamp: row.week_stamp, dayIndex: row.day_index });
});

module.exports = router;
