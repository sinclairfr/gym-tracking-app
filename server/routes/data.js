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

module.exports = router;
