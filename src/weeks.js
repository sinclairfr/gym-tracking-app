// ISO-8601 week utilities (week starts Monday, week 1 contains Jan 4)

export function dateToWeekStamp(date) {
  const d = new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()));
  // Shift to nearest Thursday so the year attribution is correct at year boundaries
  d.setUTCDate(d.getUTCDate() + 4 - (d.getUTCDay() || 7));
  const yearStart = new Date(Date.UTC(d.getUTCFullYear(), 0, 1));
  const week = Math.ceil(((d - yearStart) / 86400000 + 1) / 7);
  return `${d.getUTCFullYear()}-W${String(week).padStart(2, '0')}`;
}

export function currentWeekStamp() {
  return dateToWeekStamp(new Date());
}

export function todayDayIndex() {
  return (new Date().getDay() + 6) % 7; // Mon=0 … Sun=6
}

// Return the Monday of the given ISO week stamp as a UTC Date
export function weekStampToMonday(stamp) {
  const [yearStr, weekStr] = stamp.split('-W');
  const year = parseInt(yearStr, 10);
  const week = parseInt(weekStr, 10);
  const jan4  = new Date(Date.UTC(year, 0, 4));
  const monday = new Date(jan4);
  monday.setUTCDate(jan4.getUTCDate() - ((jan4.getUTCDay() + 6) % 7) + (week - 1) * 7);
  return monday;
}

export function navigateWeek(stamp, delta) {
  const monday = weekStampToMonday(stamp);
  monday.setUTCDate(monday.getUTCDate() + delta * 7);
  return dateToWeekStamp(monday);
}

const MONTHS_FR = ['jan', 'fév', 'mar', 'avr', 'mai', 'juin', 'juil', 'août', 'sep', 'oct', 'nov', 'déc'];

export function weekRangeLabel(stamp) {
  const mon = weekStampToMonday(stamp);
  const sun = new Date(mon);
  sun.setUTCDate(mon.getUTCDate() + 6);
  const d1 = mon.getUTCDate();
  const d2 = sun.getUTCDate();
  const m1 = MONTHS_FR[mon.getUTCMonth()];
  const m2 = MONTHS_FR[sun.getUTCMonth()];
  const yr = sun.getUTCFullYear();
  return mon.getUTCMonth() === sun.getUTCMonth()
    ? `${d1}–${d2} ${m2} ${yr}`
    : `${d1} ${m1} – ${d2} ${m2} ${yr}`;
}
