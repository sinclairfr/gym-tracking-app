const STORAGE_PREFIX = 'gym_tracker';

export const KEYS = {
  EXERCISES: 'exercises',  // exercise labels list
  STROKES: 'strokes',      // tally canvas strokes per exercise
  WEEK_DAYS: 'week',       // which days are checked this week
  INK_COLOR: 'ink',        // last used ink color
  WEEK_STAMP: 'week_stamp' // ISO week string to auto-reset on new week
};

function scopedKey(key, username) {
  const user = String(username || 'guest').trim() || 'guest';
  return `${STORAGE_PREFIX}:${user}:${key}`;
}

function legacyScopedKey(key) {
  // Legacy format (pre-account scoping)
  return `${STORAGE_PREFIX}:${key}`;
}

function parseOrFallback(raw, fallback) {
  if (raw == null) return fallback;

  try {
    return JSON.parse(raw);
  } catch {
    return fallback;
  }
}

// Returns current ISO week string e.g. "2026-W15"
export function currentWeekStamp() {
  const now = new Date();
  const jan4 = new Date(now.getFullYear(), 0, 4);
  const weekNum = Math.ceil(((now - jan4) / 86400000 + jan4.getDay() + 1) / 7);
  return `${now.getFullYear()}-W${String(weekNum).padStart(2, '0')}`;
}

export function getJson(key, fallback, username = 'guest') {
  try {
    const keyForUser = scopedKey(key, username);
    const raw = localStorage.getItem(keyForUser);

    // Current account-scoped storage format
    if (raw != null) {
      return parseOrFallback(raw, fallback);
    }

    // Backward-compatible fallback for older single-account format
    const legacyRaw = localStorage.getItem(legacyScopedKey(key));
    if (legacyRaw != null) {
      // Opportunistic migration to account-scoped namespace
      localStorage.setItem(keyForUser, legacyRaw);
      return parseOrFallback(legacyRaw, fallback);
    }

    return fallback;
  } catch {
    return fallback;
  }
}

export function setJson(key, value, username = 'guest') {
  try {
    localStorage.setItem(scopedKey(key, username), JSON.stringify(value));
  } catch {
    // ignore storage failures
  }
}

export function clearAll(username = 'guest') {
  Object.values(KEYS).forEach((k) => {
    try {
      localStorage.removeItem(scopedKey(k, username));
    } catch {
      // ignore storage failures
    }
  });
}
