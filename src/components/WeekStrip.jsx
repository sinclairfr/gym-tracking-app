// WeekStrip — L M M V S D day tracker with fillable checkbox squares
import React, { useRef, useEffect, useCallback } from 'react';
import './WeekStrip.css';

const DAYS = ['L', 'M', 'M', 'V', 'S', 'D'];
const DPR = window.devicePixelRatio || 1;

function hexToRgb(hex) {
  const n = parseInt(hex.replace('#', ''), 16);
  return { r: (n >> 16) & 255, g: (n >> 8) & 255, b: n & 255 };
}

// Animate a checkbox fill with wet marker effect
function animateCheckFill(canvas, inkColor, checked, onDone) {
  const ctx = canvas.getContext('2d');
  const w = canvas.width;
  const h = canvas.height;

  if (!checked) {
    // Erase animation — quick wipe
    let progress = 0;
    const step = () => {
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

  // Generate organic fill strokes (slightly irregular horizontal sweeps)
  const strokes = Array.from({ length: totalStrokes }, (_, i) => {
    const y = h * 0.15 + (h * 0.7) * (i / (totalStrokes - 1));
    const x0 = w * (0.12 + Math.random() * 0.08);
    const x1 = w * (0.82 + Math.random() * 0.1);
    const wobble = (Math.random() - 0.5) * h * 0.06;
    return { y: y + wobble, x0, x1 };
  });

  function drawNextStroke() {
    if (strokeIdx >= strokes.length) {
      // Drying sheen fade
      let wet = 0.4;
      const dry = () => {
        wet -= 0.025;
        ctx.clearRect(0, 0, w, h);
        // Redraw all solid strokes
        for (const s of strokes) {
          ctx.strokeStyle = `rgba(${r},${g},${b},0.88)`;
          ctx.lineWidth = h / (totalStrokes * 0.9);
          ctx.lineCap = 'round';
          ctx.beginPath();
          ctx.moveTo(s.x0, s.y);
          ctx.lineTo(s.x1, s.y);
          ctx.stroke();
        }
        // Wet overlay
        if (wet > 0) {
          for (const s of strokes) {
            ctx.strokeStyle = `rgba(${Math.min(r+80,255)},${Math.min(g+80,255)},${Math.min(b+100,255)},${wet})`;
            ctx.lineWidth = h / (totalStrokes * 0.6);
            ctx.lineCap = 'round';
            ctx.beginPath();
            ctx.moveTo(s.x0, s.y);
            ctx.lineTo(s.x1, s.y);
            ctx.stroke();
          }
          requestAnimationFrame(dry);
        } else {
          onDone && onDone();
        }
      };
      requestAnimationFrame(dry);
      return;
    }

    const s = strokes[strokeIdx];
    const steps = 18;
    let step = 0;

    const sweep = () => {
      step++;
      const t = step / steps;
      const curX = s.x0 + (s.x1 - s.x0) * t;

      // Draw up to current position
      ctx.strokeStyle = `rgba(${r},${g},${b},0.85)`;
      ctx.lineWidth = h / (totalStrokes * 0.88);
      ctx.lineCap = 'round';
      ctx.beginPath();
      ctx.moveTo(s.x0, s.y);
      ctx.lineTo(curX, s.y);
      ctx.stroke();

      if (step < steps) requestAnimationFrame(sweep);
      else {
        strokeIdx++;
        // Small delay between strokes for organic feel
        setTimeout(drawNextStroke, 18 + Math.random() * 25);
      }
    };

    requestAnimationFrame(sweep);
  }

  ctx.clearRect(0, 0, w, h);
  drawNextStroke();
}

function DayBox({ letter, checked, inkColor, onClick, isToday }) {
  const canvasRef = useRef(null);
  const prevChecked = useRef(checked);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const rect = canvas.getBoundingClientRect();
    canvas.width = Math.round(rect.width * DPR);
    canvas.height = Math.round(rect.height * DPR);

    // On mount: restore checked state without animation
    if (checked) {
      const ctx = canvas.getContext('2d');
      const { r, g, b } = hexToRgb(inkColor);
      const w = canvas.width;
      const h = canvas.height;
      const totalStrokes = 7;
      for (let i = 0; i < totalStrokes; i++) {
        const y = h * 0.15 + (h * 0.7) * (i / (totalStrokes - 1));
        const x0 = w * 0.13;
        const x1 = w * 0.87;
        ctx.strokeStyle = `rgba(${r},${g},${b},0.88)`;
        ctx.lineWidth = h / (totalStrokes * 0.88);
        ctx.lineCap = 'round';
        ctx.beginPath();
        ctx.moveTo(x0, y);
        ctx.lineTo(x1, y);
        ctx.stroke();
      }
    }
  }, []);

  useEffect(() => {
    if (prevChecked.current === checked) return;
    prevChecked.current = checked;
    animateCheckFill(canvasRef.current, inkColor, checked, null);
  }, [checked, inkColor]);

  return (
    <div className={`day-box ${isToday ? 'today' : ''}`} onClick={onClick}>
      <span className="day-letter">{letter}</span>
      <div className="day-square">
        <canvas ref={canvasRef} className="day-canvas" />
      </div>
    </div>
  );
}

export default function WeekStrip({ checkedDays, inkColor, onToggle }) {
  const todayIdx = (new Date().getDay() + 6) % 7; // Mon=0 … Sun=6

  return (
    <div className="week-strip-wrapper">
      <div className="week-strip-label">THIS WEEK</div>
      <div className="week-strip">
        {DAYS.map((letter, i) => (
          <DayBox
            key={i}
            letter={letter}
            checked={!!checkedDays[i]}
            inkColor={inkColor}
            isToday={i === todayIdx}
            onClick={() => onToggle(i)}
          />
        ))}
      </div>
    </div>
  );
}
