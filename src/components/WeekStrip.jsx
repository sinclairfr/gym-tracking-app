// WeekStrip — day tracker with toggleable cross markers
import React, { useRef, useEffect } from 'react';
import './WeekStrip.css';

const DAYS = ['L', 'M', 'M', 'V', 'S', 'D'];
const DPR = window.devicePixelRatio || 1;

function drawCross(canvas, inkColor, checked) {
  if (!canvas) return;
  const ctx = canvas.getContext('2d');
  const w = canvas.width;
  const h = canvas.height;
  const lineWidth = Math.max(2 * DPR, Math.round(Math.min(w, h) * 0.14));

  ctx.clearRect(0, 0, w, h);
  if (!checked) {
    return;
  }

  ctx.strokeStyle = inkColor;
  ctx.lineWidth = lineWidth;
  ctx.lineCap = 'round';

  ctx.beginPath();
  ctx.moveTo(w * 0.22, h * 0.22);
  ctx.lineTo(w * 0.78, h * 0.78);
  ctx.moveTo(w * 0.78, h * 0.22);
  ctx.lineTo(w * 0.22, h * 0.78);
  ctx.stroke();
}

function DayBox({ letter, checked, inkColor, onClick, isToday }) {
  const canvasRef = useRef(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const rect = canvas.getBoundingClientRect();
    canvas.width = Math.round(rect.width * DPR);
    canvas.height = Math.round(rect.height * DPR);
    drawCross(canvas, inkColor, checked);
  }, []);

  useEffect(() => {
    drawCross(canvasRef.current, inkColor, checked);
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
