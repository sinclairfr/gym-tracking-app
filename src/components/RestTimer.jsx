// RestTimer — rest countdown between sets. Default 1 min, adjustable, persisted.
import React, { useState, useEffect, useRef, useCallback } from 'react';
import './RestTimer.css';

const DEFAULT_SECONDS = 60;
const MIN_SECONDS = 15;
const MAX_SECONDS = 15 * 60;
const STEP = 15;
const PRESETS = [30, 60, 90, 120];

function fmt(total) {
  const m = Math.floor(total / 60);
  const s = total % 60;
  return `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
}

function loadDefault() {
  const raw = parseInt(localStorage.getItem('gym_timer_secs'), 10);
  if (Number.isFinite(raw) && raw >= MIN_SECONDS && raw <= MAX_SECONDS) return raw;
  return DEFAULT_SECONDS;
}

export default function RestTimer() {
  const [duration, setDuration] = useState(loadDefault);   // configured length (s)
  const [remaining, setRemaining] = useState(loadDefault); // seconds left
  const [running, setRunning] = useState(false);
  const [soundOn, setSoundOn] = useState(() => localStorage.getItem('gym_timer_sound') !== 'off');
  const intervalRef = useRef(null);
  const audioCtxRef = useRef(null);

  // Persist the chosen default so it survives reloads.
  useEffect(() => { localStorage.setItem('gym_timer_secs', String(duration)); }, [duration]);
  useEffect(() => { localStorage.setItem('gym_timer_sound', soundOn ? 'on' : 'off'); }, [soundOn]);

  // Create/resume the AudioContext. Must run inside a user gesture (the play
  // button) so mobile browsers — iOS in particular — actually allow sound.
  const ensureAudio = useCallback(() => {
    try {
      const Ctx = window.AudioContext || window.webkitAudioContext;
      if (!Ctx) return null;
      if (!audioCtxRef.current) audioCtxRef.current = new Ctx();
      if (audioCtxRef.current.state === 'suspended') audioCtxRef.current.resume();
      return audioCtxRef.current;
    } catch { return null; }
  }, []);

  // Loud alarm-style chime + vibrate when the countdown reaches zero.
  const ring = useCallback(() => {
    if (navigator.vibrate) { try { navigator.vibrate([200, 90, 200, 90, 200]); } catch { /* ignore */ } }
    if (!soundOn) return;
    const ctx = audioCtxRef.current;
    if (!ctx) return;
    try {
      if (ctx.state === 'suspended') ctx.resume();
      // A short master limiter keeps it punchy without clipping to silence.
      const master = ctx.createGain();
      master.gain.value = 0.9;
      master.connect(ctx.destination);

      // Four insistent beeps; each is two detuned oscillators (a square for
      // bite + a sine for body) so it carries over phone speakers.
      const beeps = [880, 880, 1175, 1175];
      beeps.forEach((freq, i) => {
        const t = ctx.currentTime + i * 0.26;
        const gain = ctx.createGain();
        gain.gain.setValueAtTime(0.0001, t);
        gain.gain.exponentialRampToValueAtTime(0.95, t + 0.015);
        gain.gain.setValueAtTime(0.95, t + 0.16);
        gain.gain.exponentialRampToValueAtTime(0.0001, t + 0.24);
        gain.connect(master);

        const sq = ctx.createOscillator();
        sq.type = 'square';
        sq.frequency.value = freq;
        const si = ctx.createOscillator();
        si.type = 'sine';
        si.frequency.value = freq;
        sq.connect(gain); si.connect(gain);
        sq.start(t); si.start(t);
        sq.stop(t + 0.25); si.stop(t + 0.25);
      });
    } catch { /* audio not available */ }
  }, [soundOn]);

  const stop = useCallback(() => {
    if (intervalRef.current) { clearInterval(intervalRef.current); intervalRef.current = null; }
    setRunning(false);
  }, []);

  useEffect(() => () => { if (intervalRef.current) clearInterval(intervalRef.current); }, []);

  const start = useCallback(() => {
    if (running) return;
    ensureAudio(); // unlock audio while we're inside the click handler
    setRemaining(r => (r <= 0 ? duration : r));
    setRunning(true);
    intervalRef.current = setInterval(() => {
      setRemaining(r => {
        if (r <= 1) {
          clearInterval(intervalRef.current);
          intervalRef.current = null;
          setRunning(false);
          ring();
          return 0;
        }
        return r - 1;
      });
    }, 1000);
  }, [running, duration, ensureAudio, ring]);

  function toggle() { running ? stop() : start(); }

  function reset() { stop(); setRemaining(duration); }

  // Adjust length. Only allowed while idle so a run isn't disrupted.
  function adjust(delta) {
    if (running) return;
    setDuration(d => {
      const next = Math.min(MAX_SECONDS, Math.max(MIN_SECONDS, d + delta));
      setRemaining(next);
      return next;
    });
  }

  function setPreset(secs) {
    if (running) return;
    setDuration(secs);
    setRemaining(secs);
  }

  const done = !running && remaining === 0;

  return (
    <div className={`rest-timer ${running ? 'running' : ''} ${done ? 'done' : ''}`}>
      <div className="rt-main">
        <span className="rt-label">rest</span>
        <span className="rt-display" aria-live="polite">{fmt(remaining)}</span>
        <div className="rt-controls">
          <button className="rt-btn rt-adjust" onClick={() => adjust(-STEP)} disabled={running} aria-label="moins 15s">−</button>
          <button className={`rt-btn rt-play ${running ? 'active' : ''}`} onClick={toggle}>
            {running ? '❚❚' : '▶'}
          </button>
          <button className="rt-btn rt-adjust" onClick={() => adjust(STEP)} disabled={running} aria-label="plus 15s">+</button>
          <button className="rt-btn" onClick={reset} aria-label="réinitialiser">↺</button>
          <button
            className={`rt-btn rt-sound ${soundOn ? 'on' : 'off'}`}
            onClick={() => { setSoundOn(v => !v); ensureAudio(); }}
            aria-label={soundOn ? 'couper le son' : 'activer le son'}
            title={soundOn ? 'son activé' : 'son coupé'}
          >
            {soundOn ? '🔔' : '🔕'}
          </button>
        </div>
      </div>
      <div className="rt-presets">
        {PRESETS.map(secs => (
          <button
            key={secs}
            className={`rt-preset ${duration === secs ? 'selected' : ''}`}
            onClick={() => setPreset(secs)}
            disabled={running}
          >
            {secs % 60 === 0 ? `${secs / 60}m` : `${secs}s`}
          </button>
        ))}
      </div>
    </div>
  );
}
