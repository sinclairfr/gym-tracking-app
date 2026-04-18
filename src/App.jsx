// App.jsx — main gym tracker app
import React, { useState, useCallback, useEffect } from 'react';
import { getJson, setJson, KEYS, currentWeekStamp } from './cookies';
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

function initState() {
  // Check if we're in a new week — if so, wipe weekly data
  const savedStamp = getJson(KEYS.WEEK_STAMP, null);
  const nowStamp = currentWeekStamp();

  let strokes = getJson(KEYS.STROKES, {});
  let weekDays = getJson(KEYS.WEEK_DAYS, {});

  if (savedStamp !== nowStamp) {
    // New week: reset tallies and day checks
    strokes = {};
    weekDays = {};
    setJson(KEYS.WEEK_STAMP, nowStamp);
    setJson(KEYS.STROKES, {});
    setJson(KEYS.WEEK_DAYS, {});
  }

  return {
    exercises: DEFAULT_EXERCISES,
    strokes,     // { exerciseIndex: [stroke, ...] }
    weekDays,    // { 0: true, 1: false, ... } Mon=0
    inkColor: getJson(KEYS.INK_COLOR, '#1dae7a'),
    eraseMode: false,
  };
}

export default function App() {
  const [state, setState] = useState(initState);

  // Persist strokes to cookie whenever they change
  useEffect(() => {
    setJson(KEYS.STROKES, state.strokes);
  }, [state.strokes]);

  useEffect(() => {
    setJson(KEYS.WEEK_DAYS, state.weekDays);
  }, [state.weekDays]);

  useEffect(() => {
    setJson(KEYS.INK_COLOR, state.inkColor);
  }, [state.inkColor]);

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

  return (
    <div className="app">
      <header className="app-header">
        <h1 className="app-title">GYM TRACKER</h1>
        <span className="app-week">{currentWeekStamp()}</span>
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
