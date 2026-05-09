const Database = require('better-sqlite3');
const path = require('path');

const db = new Database(path.join(__dirname, '../data.sqlite'));

db.pragma('journal_mode = WAL');
db.pragma('foreign_keys = ON');

db.exec(`
  CREATE TABLE IF NOT EXISTS users (
    id   INTEGER PRIMARY KEY AUTOINCREMENT,
    username     TEXT UNIQUE NOT NULL,
    password_hash TEXT NOT NULL
  );

  CREATE TABLE IF NOT EXISTS exercises (
    id       INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id  INTEGER NOT NULL REFERENCES users(id),
    name     TEXT NOT NULL,
    position INTEGER NOT NULL
  );

  CREATE TABLE IF NOT EXISTS day_strokes (
    user_id        INTEGER NOT NULL REFERENCES users(id),
    week_stamp     TEXT NOT NULL,
    day_index      INTEGER NOT NULL,
    exercise_index INTEGER NOT NULL,
    strokes        TEXT NOT NULL DEFAULT '[]',
    PRIMARY KEY(user_id, week_stamp, day_index, exercise_index)
  );

  CREATE TABLE IF NOT EXISTS day_checks (
    user_id    INTEGER NOT NULL REFERENCES users(id),
    week_stamp TEXT NOT NULL,
    day_index  INTEGER NOT NULL,
    PRIMARY KEY(user_id, week_stamp, day_index)
  );
`);

module.exports = db;
