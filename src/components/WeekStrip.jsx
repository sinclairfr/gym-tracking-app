// WeekStrip — week navigation + day selector with fillable checkbox squares
import React, { useRef, useEffect } from 'react';
import { weekRangeLabel, todayDayIndex, currentWeekStamp } from '../weeks';
import './WeekStrip.css';

const DAYS = ['L', 'M', 'M', 'J', 'V', 'S', 'D'];
const DPR  = window.devicePixelRatio || 1;

function hexToRgb(hex) {
  const n = parseInt(hex.replace('#', ''), 16);
  return { r: (n >> 16) & 255, g: (n >> 8) & 255, b: n & 255 };
}

// Paint a static filled box immediately (no animation) — used when a box is
// already checked on load or after navigating onto a checked day.
function paintStatic(canvas, inkColor) {
  const ctx = canvas.getContext('2d');
  const { r, g, b } = hexToRgb(inkColor);
  const w = canvas.width, h = canvas.height;
  const total = 7;
  ctx.clearRect(0, 0, w, h);
  for (let i = 0; i < total; i++) {
    const y = h * 0.15 + (h * 0.7) * (i / (total - 1));
    ctx.strokeStyle = `rgba(${r},${g},${b},0.88)`;
    ctx.lineWidth = h / (total * 0.88);
    ctx.lineCap = 'round';
    ctx.beginPath(); ctx.moveTo(w * 0.13, y); ctx.lineTo(w * 0.87, y); ctx.stroke();
  }
}

// `alive` lets a running animation abort as soon as the box is reused for
// another week/day — canvases are shared per column (stable key), so a stale
// animation must never keep painting onto a box that has since changed.
function animateCheckFill(canvas, inkColor, checked, alive, onDone) {
  const ctx = canvas.getContext('2d');
  const w = canvas.width;
  const h = canvas.height;

  ctx.clearRect(0, 0, w, h);
  if (!checked) {
    let progress = 0;
    const step = () => {
      if (!alive()) return;
      progress += 0.12;
      ctx.clearRect(0, 0, w, h);
      if (progress < 1) requestAnimationFrame(step);
      else onDone && onDone();
    };
    requestAnimationFrame(step);
    return;
  }

  const { r, g, b } = hexToRgb(inkColor);
  const totalStrokes = 6 + Math.floor(Math.random() * 4);
  let strokeIdx = 0;

  const strokes = Array.from({ length: totalStrokes }, (_, i) => {
    const y = h * 0.15 + (h * 0.7) * (i / (totalStrokes - 1));
    return {
      y: y + (Math.random() - 0.5) * h * 0.06,
      x0: w * (0.12 + Math.random() * 0.08),
      x1: w * (0.82 + Math.random() * 0.1),
    };
  });

  function drawNextStroke() {
    if (!alive()) return;
    if (strokeIdx >= strokes.length) {
      let wet = 0.4;
      const dry = () => {
        if (!alive()) return;
        wet -= 0.025;
        ctx.clearRect(0, 0, w, h);
        for (const s of strokes) {
          ctx.strokeStyle = `rgba(${r},${g},${b},0.88)`;
          ctx.lineWidth = h / (totalStrokes * 0.9);
          ctx.lineCap = 'round';
          ctx.beginPath(); ctx.moveTo(s.x0, s.y); ctx.lineTo(s.x1, s.y); ctx.stroke();
        }
        if (wet > 0) {
          for (const s of strokes) {
            ctx.strokeStyle = `rgba(${Math.min(r+80,255)},${Math.min(g+80,255)},${Math.min(b+100,255)},${wet})`;
            ctx.lineWidth = h / (totalStrokes * 0.6);
            ctx.lineCap = 'round';
            ctx.beginPath(); ctx.moveTo(s.x0, s.y); ctx.lineTo(s.x1, s.y); ctx.stroke();
          }
          requestAnimationFrame(dry);
        } else { onDone && onDone(); }
      };
      requestAnimationFrame(dry);
      return;
    }

    const s = strokes[strokeIdx];
    const steps = 18;
    let step = 0;
    const sweep = () => {
      if (!alive()) return;
      step++;
      const curX = s.x0 + (s.x1 - s.x0) * (step / steps);
      ctx.strokeStyle = `rgba(${r},${g},${b},0.85)`;
      ctx.lineWidth = h / (totalStrokes * 0.88);
      ctx.lineCap = 'round';
      ctx.beginPath(); ctx.moveTo(s.x0, s.y); ctx.lineTo(curX, s.y); ctx.stroke();
      if (step < steps) requestAnimationFrame(sweep);
      else { strokeIdx++; setTimeout(drawNextStroke, 18 + Math.random() * 25); }
    };
    requestAnimationFrame(sweep);
  }

  ctx.clearRect(0, 0, w, h);
  drawNextStroke();
}

function DayBox({ letter, checked, inkColor, isToday, isSelected, onClick }) {
  const canvasRef  = useRef(null);
  const prevChecked = useRef(checked);
  const sized = useRef(false);
  // Bumped on every state change / unmount to abort any in-flight animation.
  const animToken = useRef(0);

  function ensureSized() {
    const canvas = canvasRef.current;
    if (!canvas) return null;
    if (!sized.current) {
      const rect = canvas.getBoundingClientRect();
      canvas.width  = Math.round(rect.width  * DPR);
      canvas.height = Math.round(rect.height * DPR);
      sized.current = true;
    }
    return canvas;
  }

  // Initial paint (no animation)
  useEffect(() => {
    const canvas = ensureSized();
    if (canvas && checked) paintStatic(canvas, inkColor);
    return () => { animToken.current++; }; // cancel animations on unmount
  }, []);

  // Redraw whenever the checked state changes. Cancel any previous animation
  // first so a stale fill can't bleed onto a box that now shows another week.
  useEffect(() => {
    const canvas = ensureSized();
    if (!canvas) return;
    if (prevChecked.current === checked) return;
    prevChecked.current = checked;
    const myToken = ++animToken.current;
    const alive = () => animToken.current === myToken;
    animateCheckFill(canvas, inkColor, checked, alive, null);
  }, [checked, inkColor]);

  return (
    <div
      className={`day-box ${isToday ? 'today' : ''} ${isSelected ? 'selected' : ''}`}
      onClick={onClick}
    >
      <span className="day-letter">{letter}</span>
      <div className="day-square">
        <canvas ref={canvasRef} className="day-canvas" />
      </div>
    </div>
  );
}

export default function WeekStrip({
  checkedDays,
  selectedDay,
  inkColor,
  weekStamp,
  isCurrentWeek,
  onSelectDay,
  onDayCheck,
  onPrevWeek,
  onNextWeek,
  onGoToday,
}) {
  const todayIdx = todayDayIndex();

  function handleClick(i) {
    onSelectDay(i);
    // Allow manual toggle: click selected+checked day to uncheck, click unchecked to check
    if (i === selectedDay) {
      onDayCheck(i, !checkedDays[i]);
    }
  }

  return (
    <div className="week-strip-wrapper">
      <div className="week-nav-row">
        <button className="week-nav-btn" onClick={onPrevWeek} aria-label="semaine précédente">‹</button>
        <div className="week-nav-center">
          <span className="week-nav-label">{weekRangeLabel(weekStamp)}</span>
          {!isCurrentWeek && (
            <button className="week-today-btn" onClick={onGoToday}>aujourd'hui</button>
          )}
        </div>
        <button className="week-nav-btn" onClick={onNextWeek} aria-label="semaine suivante">›</button>
      </div>

      <div className="week-strip">
        {DAYS.map((letter, i) => (
          <DayBox
            key={i}
            letter={letter}
            checked={!!checkedDays[i]}
            inkColor={inkColor}
            isToday={isCurrentWeek && i === todayIdx}
            isSelected={i === selectedDay}
            onClick={() => handleClick(i)}
          />
        ))}
      </div>
    </div>
  );
}
