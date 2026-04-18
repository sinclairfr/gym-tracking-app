// App.jsx — main gym tracker app
import React, { useState, useCallback, useEffect } from 'react';
import { getJson, setJson, KEYS, currentWeekStamp } from './storage';
import { login, logout, getSession } from './accountStore';
import WeekStrip from './components/WeekStrip';
import ExerciseLabel from './components/ExerciseLabel';
import Toolbar from './components/Toolbar';
import './App.css';

const DEFAULT_EXERCISES = [
  'Dumbbell\nShoulder Press',
  'Dumbbell\nSquats',
  'Dumbbell\nCurl',
  'Shoulder\nShrugs',
  'Bent-Over\nRow',
  'Bent-Over\nDumbbell Row',
  'Push-Ups\n×10',
  'Hammer\nCurl',
  'Arnold\nPress',
  'Upright\nRow',
  'Front\nRaise',
  'Lateral\nRaise',
];

function buildInitialState(username) {
  // Check if we're in a new week — if so, wipe weekly data for this account
  const savedStamp = getJson(KEYS.WEEK_STAMP, null, username);
  const nowStamp = currentWeekStamp();

  const savedExercises = getJson(KEYS.EXERCISES, null, username);
  const exercises = Array.isArray(savedExercises) && savedExercises.length > 0
    ? savedExercises
    : DEFAULT_EXERCISES;

  let strokes = getJson(KEYS.STROKES, {}, username);
  let weekDays = getJson(KEYS.WEEK_DAYS, {}, username);

  if (savedStamp !== nowStamp) {
    // New week: reset tallies and day checks
    strokes = {};
    weekDays = {};
    setJson(KEYS.WEEK_STAMP, nowStamp, username);
    setJson(KEYS.STROKES, {}, username);
    setJson(KEYS.WEEK_DAYS, {}, username);
  }

  return {
    exercises,
    strokes,     // { exerciseIndex: [stroke, ...] }
    weekDays,    // { 0: true, 1: false, ... } Mon=0
    inkColor: getJson(KEYS.INK_COLOR, '#1dae7a', username),
    eraseMode: false,
  };
}

export default function App() {
  const [session, setSession] = useState(() => getSession());
  const [state, setState] = useState(() =>
    session ? buildInitialState(session.username) : null
  );
  const [credentials, setCredentials] = useState({ username: '', password: '' });
  const [authError, setAuthError] = useState('');

  useEffect(() => {
    if (!session) {
      setState(null);
      return;
    }

    setState(buildInitialState(session.username));
  }, [session]);

  // Persist user data whenever it changes
  useEffect(() => {
    if (!session || !state) return;
    setJson(KEYS.STROKES, state.strokes, session.username);
  }, [session, state?.strokes]);

  useEffect(() => {
    if (!session || !state) return;
    setJson(KEYS.WEEK_DAYS, state.weekDays, session.username);
  }, [session, state?.weekDays]);

  useEffect(() => {
    if (!session || !state) return;
    setJson(KEYS.INK_COLOR, state.inkColor, session.username);
  }, [session, state?.inkColor]);

  useEffect(() => {
    if (!session || !state) return;
    setJson(KEYS.EXERCISES, state.exercises, session.username);
  }, [session, state?.exercises]);

  const handleCredentialChange = useCallback((event) => {
    const { name, value } = event.target;
    setCredentials((prev) => ({ ...prev, [name]: value }));
  }, []);

  const handleLogin = useCallback((event) => {
    event.preventDefault();
    const nextSession = login(credentials.username, credentials.password);

    if (!nextSession) {
      setAuthError('Invalid username or password.');
      return;
    }

    setAuthError('');
    setCredentials({ username: '', password: '' });
    setSession(nextSession);
  }, [credentials]);

  const handleLogout = useCallback(() => {
    logout();
    setSession(null);
  }, []);

  const handleStrokesChange = useCallback((idx, newStrokes) => {
    setState(s => {
      const hasStrokesNow = newStrokes.length > 0;
      const hadStrokesBefore = (s.strokes[idx] || []).length > 0;

      const todayIdx = (new Date().getDay() + 6) % 7;
      let weekDays = s.weekDays;
      if (hasStrokesNow && !hadStrokesBefore) {
        weekDays = { ...s.weekDays, [todayIdx]: true };
      }

      return {
        ...s,
        strokes: { ...s.strokes, [idx]: newStrokes },
        weekDays
      };
    });
  }, []);

  const handleDayToggle = useCallback((dayIdx) => {
    setState(s => ({
      ...s,
      weekDays: { ...s.weekDays, [dayIdx]: !s.weekDays[dayIdx] }
    }));
  }, []);

  const handleColorChange = useCallback((color) => {
    setState(s => ({ ...s, inkColor: color, eraseMode: false }));
  }, []);

  const handleEraseToggle = useCallback(() => {
    setState(s => ({ ...s, eraseMode: !s.eraseMode }));
  }, []);

  const handleClear = useCallback(() => {
    if (!window.confirm('Clear all tally marks?')) return;
    setState(s => ({ ...s, strokes: {} }));
  }, []);

  const handleAddExercise = useCallback((name) => {
    setState(s => ({ ...s, exercises: [...s.exercises, name] }));
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
        <div>
          <h1 className="app-title">GYM TRACKER</h1>
          <span className="app-user">{session.displayName}</span>
        </div>

        <div className="app-header-actions">
          <span className="app-week">{currentWeekStamp()}</span>
          <button className="logout-button" type="button" onClick={handleLogout}>
            Logout
          </button>
        </div>
      </header>

      <main className="app-main">
        <WeekStrip
          checkedDays={state.weekDays}
          inkColor={state.inkColor}
          onToggle={handleDayToggle}
        />

        <Toolbar
          inkColor={state.inkColor}
          onColorChange={handleColorChange}
          eraseMode={state.eraseMode}
          onEraseToggle={handleEraseToggle}
          onClear={handleClear}
          onAddExercise={handleAddExercise}
        />

        <div className="label-sheet">
          {/* Subtle ruled lines like real label paper */}
          <div className="paper-lines" aria-hidden="true" />
          <div className="label-grid">
            {state.exercises.map((name, i) => (
              <ExerciseLabel
                key={`${name}-${i}`}
                name={name}
                strokes={state.strokes[i] || []}
                onStrokesChange={(s) => handleStrokesChange(i, s)}
                inkColor={state.inkColor}
                eraseMode={state.eraseMode}
              />
            ))}
          </div>
        </div>
      </main>

      <footer className="app-footer">
        <span>tap & draw · resets every monday</span>
      </footer>
    </div>
  );
}
