import React, { useState, useEffect, useCallback } from 'react';
import { api } from './api';
import { currentWeekStamp, todayDayIndex, navigateWeek, weekRangeLabel } from './weeks';
import AuthScreen    from './components/AuthScreen';
import WeekStrip     from './components/WeekStrip';
import ExerciseLabel from './components/ExerciseLabel';
import Toolbar       from './components/Toolbar';
import './App.css';

// Decode JWT payload without verifying signature (server verifies on every call)
function decodeToken(token) {
  try {
    const payload = JSON.parse(atob(token.split('.')[1]));
    return payload.exp * 1000 > Date.now() ? payload : null;
  } catch { return null; }
}

export default function App() {
  // ── Auth ────────────────────────────────────────────────────────────────────
  const [user, setUser]           = useState(null);
  const [authLoading, setAuthLoading] = useState(true);

  // ── Navigation ──────────────────────────────────────────────────────────────
  const [weekStamp,    setWeekStamp]    = useState(currentWeekStamp);
  const [selectedDay,  setSelectedDay]  = useState(todayDayIndex);

  // ── Data ────────────────────────────────────────────────────────────────────
  const [exercises, setExercises] = useState([]);
  // weekData: { dayIndex: { checked: bool, strokes: { exIndex: [stroke,…] } } }
  const [weekData,  setWeekData]  = useState({});
  const [dataLoading, setDataLoading] = useState(false);

  // ── Tool state ──────────────────────────────────────────────────────────────
  const [inkColor,  setInkColor]  = useState(() => localStorage.getItem('gym_ink') || '#1dae7a');
  const [eraseMode, setEraseMode] = useState(false);

  // ── Initial auth check ──────────────────────────────────────────────────────
  useEffect(() => {
    const token = localStorage.getItem('gym_token');
    if (token) {
      const payload = decodeToken(token);
      if (payload) setUser({ id: payload.id, username: payload.username });
      else localStorage.removeItem('gym_token');
    }
    setAuthLoading(false);
  }, []);

  // ── Fetch exercises once per session ────────────────────────────────────────
  useEffect(() => {
    if (!user) return;
    api.getExercises()
      .then(setExercises)
      .catch(handleApiError);
  }, [user]);

  // ── Fetch week data whenever user or weekStamp changes ─────────────────────
  useEffect(() => {
    if (!user) return;
    setDataLoading(true);
    api.getWeek(weekStamp)
      .then(data => { setWeekData(data.days); setDataLoading(false); })
      .catch(err  => { handleApiError(err);   setDataLoading(false); });
  }, [user, weekStamp]);

  // ── Error handler ───────────────────────────────────────────────────────────
  function handleApiError(err) {
    if (err.message === 'Unauthorized' || err.message === 'Invalid token') handleLogout();
  }

  // ── Auth handlers ────────────────────────────────────────────────────────────
  function handleAuth(userData) { setUser(userData); }

  function handleLogout() {
    localStorage.removeItem('gym_token');
    setUser(null);
    setExercises([]);
    setWeekData({});
    setWeekStamp(currentWeekStamp());
    setSelectedDay(todayDayIndex());
  }

  // ── Week navigation ──────────────────────────────────────────────────────────
  function handlePrevWeek() {
    setWeekStamp(s => navigateWeek(s, -1));
    setSelectedDay(0); // Monday
  }
  function handleNextWeek() {
    setWeekStamp(s => navigateWeek(s, 1));
    setSelectedDay(0);
  }
  function handleGoToday() {
    setWeekStamp(currentWeekStamp());
    setSelectedDay(todayDayIndex());
  }

  const isCurrentWeek = weekStamp === currentWeekStamp();

  // ── Day selection ────────────────────────────────────────────────────────────
  function handleSelectDay(dayIdx) { setSelectedDay(dayIdx); }

  // ── Strokes (live update in React state) ─────────────────────────────────────
  const handleStrokesChange = useCallback((exIdx, newStrokes) => {
    setWeekData(d => ({
      ...d,
      [selectedDay]: {
        ...d[selectedDay],
        strokes: { ...(d[selectedDay]?.strokes ?? {}), [exIdx]: newStrokes },
      },
    }));
  }, [selectedDay]);

  // ── Stroke completed → save to API + auto-check today ────────────────────────
  const handleStrokeEnd = useCallback(async (exIdx, finalStrokes) => {
    try {
      await api.saveStrokes(weekStamp, selectedDay, exIdx, finalStrokes);

      // Auto-check today when drawing on the current day of the current week
      const today = todayDayIndex();
      if (isCurrentWeek && selectedDay === today) {
        const alreadyChecked = weekData[today]?.checked;
        if (!alreadyChecked) {
          await api.setDayCheck(weekStamp, today, true);
          setWeekData(d => ({
            ...d,
            [today]: { ...d[today], checked: true },
          }));
        }
      }
    } catch (err) { handleApiError(err); }
  }, [weekStamp, selectedDay, isCurrentWeek, weekData]);

  // ── Day check toggle (manual) ─────────────────────────────────────────────────
  const handleDayCheck = useCallback(async (dayIdx, checked) => {
    setWeekData(d => ({ ...d, [dayIdx]: { ...d[dayIdx], checked } }));
    try { await api.setDayCheck(weekStamp, dayIdx, checked); }
    catch (err) { handleApiError(err); }
  }, [weekStamp]);

  // ── Tool handlers ─────────────────────────────────────────────────────────────
  function handleColorChange(color) {
    setInkColor(color);
    localStorage.setItem('gym_ink', color);
    setEraseMode(false);
  }

  async function handleClear() {
    if (!window.confirm('Effacer tous les traits de ce jour ?')) return;
    const day = selectedDay;
    const saves = exercises.map((_, i) => api.saveStrokes(weekStamp, day, i, []));
    await Promise.all(saves).catch(handleApiError);
    setWeekData(d => ({ ...d, [day]: { ...d[day], strokes: {} } }));
  }

  async function handleAddExercise(name) {
    await api.addExercise(name).catch(handleApiError);
    const updated = await api.getExercises().catch(handleApiError);
    if (updated) setExercises(updated);
  }

  // ── Derived data for current view ────────────────────────────────────────────
  const checkedDays = Object.fromEntries(
    Array.from({ length: 7 }, (_, i) => [i, !!weekData[i]?.checked])
  );

  // ── Render ───────────────────────────────────────────────────────────────────
  if (authLoading) return <div className="app-loading">Chargement…</div>;
  if (!user)       return <AuthScreen onAuth={handleAuth} />;

  const handleEditModeToggle = useCallback(() => {
    setState(s => ({ ...s, editMode: !s.editMode }));
  }, []);

  const handleExerciseRename = useCallback((idx, nextName) => {
    const trimmed = nextName.trim();
    if (!trimmed) return;

    setState((s) => {
      if (!s.exercises[idx] || s.exercises[idx] === trimmed) return s;
      const exercises = [...s.exercises];
      exercises[idx] = trimmed;
      return { ...s, exercises };
    });
  }, []);

  const handleExerciseDelete = useCallback((idx) => {
    if (!window.confirm('Delete this exercise?')) return;

    setState((s) => {
      if (idx < 0 || idx >= s.exercises.length) return s;

      const exercises = s.exercises.filter((_, i) => i !== idx);
      const strokes = {};

      Object.entries(s.strokes).forEach(([key, value]) => {
        const numericIndex = Number(key);
        if (numericIndex < idx) {
          strokes[numericIndex] = value;
        } else if (numericIndex > idx) {
          strokes[numericIndex - 1] = value;
        }
      });

      return { ...s, exercises, strokes };
    });
  }, []);

  if (!session || !state) {
    return (
      <div className="app">
        <header className="app-header">
          <h1 className="app-title">GYM TRACKER</h1>
          <span className="app-week">{currentWeekStamp()}</span>
        </header>

        <main className="app-main auth-main">
          <form className="auth-card" onSubmit={handleLogin}>
            <h2 className="auth-title">Account Login</h2>
            <p className="auth-subtitle">Use a username/password from the local JSON store.</p>

            <label className="auth-label" htmlFor="username">Username</label>
            <input
              id="username"
              name="username"
              value={credentials.username}
              onChange={handleCredentialChange}
              className="auth-input"
              autoComplete="username"
              required
            />

            <label className="auth-label" htmlFor="password">Password</label>
            <input
              id="password"
              name="password"
              type="password"
              value={credentials.password}
              onChange={handleCredentialChange}
              className="auth-input"
              autoComplete="current-password"
              required
            />

            {authError && <p className="auth-error">{authError}</p>}

            <button type="submit" className="auth-button">Sign in</button>
          </form>
        </main>
      </div>
    );
  }

  return (
    <div className="app">
      <header className="app-header">
        <h1 className="app-title">GYM TRACKER</h1>
        <div className="app-user">
          <span>{user.username}</span>
          <button className="logout-btn" onClick={handleLogout}>déco</button>
        </div>
      </header>

      <main className="app-main">
        <WeekStrip
          checkedDays={checkedDays}
          selectedDay={selectedDay}
          inkColor={inkColor}
          weekStamp={weekStamp}
          isCurrentWeek={isCurrentWeek}
          onSelectDay={handleSelectDay}
          onDayCheck={handleDayCheck}
          onPrevWeek={handlePrevWeek}
          onNextWeek={handleNextWeek}
          onGoToday={handleGoToday}
        />

        <Toolbar
          inkColor={inkColor}
          onColorChange={handleColorChange}
          eraseMode={eraseMode}
          onEraseToggle={() => setEraseMode(v => !v)}
          onClear={handleClear}
          onAddExercise={handleAddExercise}
        />

        <div className="label-sheet">
          <div className="paper-lines" aria-hidden="true" />
          {dataLoading ? (
            <div className="data-loading">…</div>
          ) : (
            <div className="label-grid">
              {exercises.map((name, i) => (
                <ExerciseLabel
                  key={`${name}-${i}`}
                  name={name}
                  strokes={weekData[selectedDay]?.strokes?.[i] ?? []}
                  onStrokesChange={s => handleStrokesChange(i, s)}
                  onStrokeEnd={s => handleStrokeEnd(i, s)}
                  inkColor={inkColor}
                  eraseMode={eraseMode}
                />
              ))}
            </div>
          )}
        </div>
      </main>

      <footer className="app-footer">
        <span>{weekRangeLabel(weekStamp)} · tap &amp; draw</span>
      </footer>
    </div>
  );
}
