import React, { useState, useEffect, useCallback } from 'react';
import { api } from './api';
import { currentWeekStamp, todayDayIndex, navigateWeek, weekRangeLabel, daysAgoSince } from './weeks';
import AuthScreen    from './components/AuthScreen';
import WeekStrip     from './components/WeekStrip';
import ExerciseLabel from './components/ExerciseLabel';
import RestTimer     from './components/RestTimer';
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
  const [lastWorkoutDays, setLastWorkoutDays] = useState(null);

  // ── Tool state ──────────────────────────────────────────────────────────────
  const [inkColor,  setInkColor]  = useState(() => localStorage.getItem('gym_ink') || '#1dae7a');
  const [eraseMode, setEraseMode] = useState(false);
  const [editMode,  setEditMode]  = useState(false);

  // ── Undo / Redo stacks ──────────────────────────────────────────────────────
  // Each entry: { dayIdx, exIdx, strokes } — the state *before* the action
  const [undoStack, setUndoStack] = useState([]);
  const [redoStack, setRedoStack] = useState([]);

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

  // ── Fetch exercises + last workout once per session ─────────────────────────
  useEffect(() => {
    if (!user) return;
    api.getExercises().then(setExercises).catch(handleApiError);
    refreshLastWorkout();
  }, [user]);

  // Recompute "last workout" from the most recent check, in the device's timezone
  function refreshLastWorkout() {
    api.getLastWorkout()
      .then(d => setLastWorkoutDays(daysAgoSince(d.weekStamp, d.dayIndex)))
      .catch(() => {});
  }

  // ── Fetch week data whenever user or weekStamp changes ─────────────────────
  useEffect(() => {
    if (!user) return;
    setDataLoading(true);
    api.getWeek(weekStamp)
      .then(data => { setWeekData(data.days); setDataLoading(false); })
      .catch(err  => { handleApiError(err);   setDataLoading(false); });
  }, [user, weekStamp]);

  // ── Clear undo/redo when navigating weeks ───────────────────────────────────
  useEffect(() => {
    setUndoStack([]);
    setRedoStack([]);
  }, [weekStamp]);

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
  // Keep the same weekday selected when moving between weeks so the drawings on
  // the current day stay visible after navigating away and back — resetting to
  // Monday made a day's strokes appear lost.
  function handlePrevWeek() {
    setWeekStamp(s => navigateWeek(s, -1));
  }
  function handleNextWeek() {
    setWeekStamp(s => navigateWeek(s, 1));
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
    // Push pre-stroke state to undo stack, clear redo
    const prevStrokes = finalStrokes.slice(0, -1);
    setUndoStack(s => [...s, { dayIdx: selectedDay, exIdx, strokes: prevStrokes }]);
    setRedoStack([]);

    try {
      await api.saveStrokes(weekStamp, selectedDay, exIdx, finalStrokes);

      // Any day that receives a stroke gets its box auto-filled — whatever
      // week or day is being edited, not only today.
      if (finalStrokes.length && !weekData[selectedDay]?.checked) {
        await api.setDayCheck(weekStamp, selectedDay, true);
        setWeekData(d => ({
          ...d,
          [selectedDay]: { ...d[selectedDay], checked: true },
        }));
        refreshLastWorkout();
      }
    } catch (err) { handleApiError(err); }
  }, [weekStamp, selectedDay, weekData]);

  // ── Undo last stroke ──────────────────────────────────────────────────────────
  const handleUndo = useCallback(async () => {
    if (!undoStack.length) return;
    const entry = undoStack[undoStack.length - 1];
    const { dayIdx, exIdx, strokes: prevStrokes } = entry;
    const currentStrokes = weekData[dayIdx]?.strokes?.[exIdx] ?? [];

    setUndoStack(s => s.slice(0, -1));
    setRedoStack(s => [...s, { dayIdx, exIdx, strokes: currentStrokes }]);
    setWeekData(d => ({
      ...d,
      [dayIdx]: { ...d[dayIdx], strokes: { ...d[dayIdx]?.strokes, [exIdx]: prevStrokes } },
    }));
    await api.saveStrokes(weekStamp, dayIdx, exIdx, prevStrokes).catch(handleApiError);
  }, [undoStack, weekData, weekStamp]);

  // ── Redo last undone stroke ───────────────────────────────────────────────────
  const handleRedo = useCallback(async () => {
    if (!redoStack.length) return;
    const entry = redoStack[redoStack.length - 1];
    const { dayIdx, exIdx, strokes: nextStrokes } = entry;
    const currentStrokes = weekData[dayIdx]?.strokes?.[exIdx] ?? [];

    setRedoStack(s => s.slice(0, -1));
    setUndoStack(s => [...s, { dayIdx, exIdx, strokes: currentStrokes }]);
    setWeekData(d => ({
      ...d,
      [dayIdx]: { ...d[dayIdx], strokes: { ...d[dayIdx]?.strokes, [exIdx]: nextStrokes } },
    }));
    await api.saveStrokes(weekStamp, dayIdx, exIdx, nextStrokes).catch(handleApiError);
  }, [redoStack, weekData, weekStamp]);

  // ── Day check toggle (manual) ─────────────────────────────────────────────────
  const handleDayCheck = useCallback(async (dayIdx, checked) => {
    setWeekData(d => ({ ...d, [dayIdx]: { ...d[dayIdx], checked } }));
    try {
      await api.setDayCheck(weekStamp, dayIdx, checked);
      refreshLastWorkout();
    }
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
    // Clearing every mark of a day also unchecks its box in the week strip —
    // an empty day is no longer a completed session.
    if (weekData[day]?.checked) saves.push(api.setDayCheck(weekStamp, day, false));
    await Promise.all(saves).catch(handleApiError);
    setWeekData(d => ({ ...d, [day]: { ...d[day], strokes: {}, checked: false } }));
    refreshLastWorkout();
  }

  async function handleAddExercise(name) {
    await api.addExercise(name).catch(handleApiError);
    const updated = await api.getExercises().catch(handleApiError);
    if (updated) setExercises(updated);
  }

  async function handleRenameExercise(index, newName) {
    await api.renameExercise(index, newName).catch(handleApiError);
    setExercises(prev => prev.map((n, i) => i === index ? newName : n));
  }

  async function handleDeleteExercise(index) {
    if (!window.confirm(`Supprimer "${exercises[index]}" ?`)) return;
    await api.deleteExercise(index).catch(handleApiError);
    const [updatedEx, updatedData] = await Promise.all([
      api.getExercises().catch(handleApiError),
      api.getWeek(weekStamp).catch(handleApiError),
    ]);
    if (updatedEx) setExercises(updatedEx);
    if (updatedData) setWeekData(updatedData.days);
    setUndoStack([]);
    setRedoStack([]);
  }

  // ── Derived data for current view ────────────────────────────────────────────
  const checkedDays = Object.fromEntries(
    Array.from({ length: 7 }, (_, i) => [i, !!weekData[i]?.checked])
  );

  // ── Render ───────────────────────────────────────────────────────────────────
  if (authLoading) return <div className="app-loading">Chargement…</div>;
  if (!user)       return <AuthScreen onAuth={handleAuth} />;

  return (
    <div className="app">
      <header className="app-header">
        <h1 className="app-title">GYM TRACKER</h1>
        <div className="app-user">
          <span>{user.username}</span>
          <button className="logout-btn" onClick={handleLogout}>déco</button>
        </div>
      </header>

      {lastWorkoutDays !== null && (
        <div className="last-workout-banner">
          {lastWorkoutDays === 0
            ? 'worked out today'
            : lastWorkoutDays === 1
              ? 'last workout: yesterday'
              : `last workout: ${lastWorkoutDays} days ago`}
        </div>
      )}

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

        <RestTimer />

        <Toolbar
          inkColor={inkColor}
          onColorChange={handleColorChange}
          eraseMode={eraseMode}
          onEraseToggle={() => setEraseMode(v => !v)}
          editMode={editMode}
          onEditModeToggle={() => setEditMode(v => !v)}
          canUndo={undoStack.length > 0}
          canRedo={redoStack.length > 0}
          onUndo={handleUndo}
          onRedo={handleRedo}
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
                  key={i}
                  name={name}
                  strokes={weekData[selectedDay]?.strokes?.[i] ?? []}
                  onStrokesChange={s => handleStrokesChange(i, s)}
                  onStrokeEnd={s => handleStrokeEnd(i, s)}
                  inkColor={inkColor}
                  eraseMode={eraseMode}
                  editMode={editMode}
                  onRename={newName => handleRenameExercise(i, newName)}
                  onDelete={() => handleDeleteExercise(i)}
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
