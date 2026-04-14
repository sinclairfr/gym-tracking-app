// Cookie keys and expiry
import Cookies from 'js-cookie';

const COOKIE_OPTS = { expires: 365 };

export const KEYS = {
  STROKES: 'gym_strokes',      // tally canvas strokes per exercise
  WEEK_DAYS: 'gym_week',       // which days are checked this week
  INK_COLOR: 'gym_ink',        // last used ink color
  WEEK_STAMP: 'gym_week_stamp' // ISO week string to auto-reset on new week
};

// Returns current ISO week string e.g. "2026-W15"
export function currentWeekStamp() {
  const now = new Date();
  const jan4 = new Date(now.getFullYear(), 0, 4);
  const weekNum = Math.ceil(((now - jan4) / 86400000 + jan4.getDay() + 1) / 7);
  return `${now.getFullYear()}-W${String(weekNum).padStart(2, '0')}`;
}

export function getJson(key, fallback) {
  try {
    const raw = Cookies.get(key);
    return raw ? JSON.parse(raw) : fallback;
  } catch {
    return fallback;
  }
}

export function setJson(key, value) {
  try {
    Cookies.set(key, JSON.stringify(value), COOKIE_OPTS);
  } catch {
    // cookie too large — ignore silently
  }
}

export function clearAll() {
  Object.values(KEYS).forEach(k => Cookies.remove(k));
}
