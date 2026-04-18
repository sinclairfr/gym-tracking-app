// MarkerCanvas — freehand drawing with organic marker physics + ink drying animation
import React, { useRef, useEffect, useCallback } from 'react';

const DPR = window.devicePixelRatio || 1;

// Parse hex color → {r, g, b}
function hexToRgb(hex) {
  const n = parseInt(hex.replace('#', ''), 16);
  return { r: (n >> 16) & 255, g: (n >> 8) & 255, b: n & 255 };
}

// Draw a single segment from strokes array with organic marker texture
function drawSegment(ctx, stroke, fromIdx) {
  const pts = stroke.points;
  if (pts.length < 2 || fromIdx < 1) return;

  if (stroke.erase) {
    ctx.globalCompositeOperation = 'destination-out';
    ctx.strokeStyle = 'rgba(0,0,0,1)';
    ctx.lineWidth = 18 * DPR;
    ctx.lineCap = 'round';
    ctx.beginPath();
    ctx.moveTo(pts[fromIdx - 1].x, pts[fromIdx - 1].y);
    ctx.lineTo(pts[fromIdx].x, pts[fromIdx].y);
    ctx.stroke();
    ctx.globalCompositeOperation = 'source-over';
    return;
  }

  const { r, g, b } = hexToRgb(stroke.color);
  const p = pts[fromIdx].p;
  const baseW = (stroke.width + p * 2.5) * DPR;

  ctx.lineCap = 'round';
  ctx.lineJoin = 'round';
  ctx.globalCompositeOperation = 'source-over';

  // Core ink
  ctx.strokeStyle = `rgba(${r},${g},${b},0.82)`;
  ctx.lineWidth = baseW;
  ctx.beginPath();
  ctx.moveTo(pts[fromIdx - 1].x, pts[fromIdx - 1].y);
  ctx.lineTo(pts[fromIdx].x, pts[fromIdx].y);
  ctx.stroke();

  // Feathered edge — lighter, slightly wider, offset
  if (Math.random() > 0.35) {
    const ox = (Math.random() - 0.5) * DPR * 1.5;
    const oy = (Math.random() - 0.5) * DPR * 0.8;
    ctx.strokeStyle = `rgba(${Math.min(r + 70, 255)},${Math.min(g + 70, 255)},${Math.min(b + 70, 255)},0.18)`;
    ctx.lineWidth = baseW * 1.5;
    ctx.beginPath();
    ctx.moveTo(pts[fromIdx - 1].x + ox, pts[fromIdx - 1].y + oy);
    ctx.lineTo(pts[fromIdx].x + ox, pts[fromIdx].y + oy);
    ctx.stroke();
  }

  // Dark core for depth (wet ink center)
  if (Math.random() > 0.55) {
    ctx.strokeStyle = `rgba(${Math.max(r - 40, 0)},${Math.max(g - 40, 0)},${Math.max(b - 40, 0)},0.45)`;
    ctx.lineWidth = baseW * 0.3;
    ctx.beginPath();
    ctx.moveTo(pts[fromIdx - 1].x, pts[fromIdx - 1].y);
    ctx.lineTo(pts[fromIdx].x, pts[fromIdx].y);
    ctx.stroke();
  }
}

// Full redraw of all strokes on a canvas
function redrawAll(canvas, strokes) {
  if (!canvas) return;
  const ctx = canvas.getContext('2d');
  ctx.clearRect(0, 0, canvas.width, canvas.height);
  for (const stroke of strokes) {
    for (let i = 1; i < stroke.points.length; i++) {
      drawSegment(ctx, stroke, i);
    }
  }
}

// Drying animation — gradually reduces opacity of last stroke from wet→dry
// Returns a cancel function to stop the animation early.
function animateDrying(canvas, strokes, onDone) {
  if (!strokes.length) return null;
  const last = strokes[strokes.length - 1];
  if (!last || last.erase) return null;

  const { r, g, b } = hexToRgb(last.color);
  const duration = 800; // ms
  const start = performance.now();
  let cancelled = false;

  function frame(now) {
    if (cancelled) return;
    const t = Math.min((now - start) / duration, 1);
    // Ease out: t goes from 0→1, wetness overlay fades
    const wetOpacity = (1 - t) * 0.3;

    // Redraw clean
    redrawAll(canvas, strokes);

    // Overlay wet sheen on last stroke
    if (wetOpacity > 0.01) {
      const ctx = canvas.getContext('2d');
      ctx.globalCompositeOperation = 'source-over';
      for (let i = 1; i < last.points.length; i++) {
        const p0 = last.points[i - 1];
        const p1 = last.points[i];
        ctx.strokeStyle = `rgba(${Math.min(r + 80, 255)},${Math.min(g + 80, 255)},${Math.min(b + 100, 255)},${wetOpacity})`;
        ctx.lineWidth = (last.width + p1.p * 2) * DPR * 1.8;
        ctx.lineCap = 'round';
        ctx.beginPath();
        ctx.moveTo(p0.x, p0.y);
        ctx.lineTo(p1.x, p1.y);
        ctx.stroke();
      }
    }

    if (t < 1) requestAnimationFrame(frame);
    else onDone && onDone();
  }

  requestAnimationFrame(frame);
  return () => { cancelled = true; };
}

export default function MarkerCanvas({ strokes, onStrokesChange, inkColor, eraseMode, style }) {
  const canvasRef = useRef(null);
  const drawingRef = useRef(false);
  const currentStrokeRef = useRef(null);
  const lastPosRef = useRef({ x: 0, y: 0 });
  const pressureRef = useRef(0.5);
  // Always holds the latest strokes so ResizeObserver doesn't use a stale closure
  const strokesRef = useRef(strokes);
  // Holds the cancel function for any ongoing drying animation
  const animCancelRef = useRef(null);

  // Keep strokesRef in sync
  useEffect(() => {
    strokesRef.current = strokes;
  }, [strokes]);

  // Resize canvas to match CSS size — uses strokesRef to avoid stale closure
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ro = new ResizeObserver(() => {
      const rect = canvas.getBoundingClientRect();
      canvas.width = Math.round(rect.width * DPR);
      canvas.height = Math.round(rect.height * DPR);
      redrawAll(canvas, strokesRef.current);
    });
    ro.observe(canvas);
    return () => ro.disconnect();
  }, []);

  // Redraw when strokes prop changes externally (e.g. clear)
  useEffect(() => {
    redrawAll(canvasRef.current, strokes);
  }, [strokes]);

  // Non-passive touch listeners to block Android pull-to-refresh during drawing.
  // React's synthetic onTouchStart/onTouchMove can be passive (depending on the
  // browser/React version), so preventDefault() inside them has no effect.
  // Attaching directly to the DOM with { passive: false } guarantees prevention.
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const block = (e) => e.preventDefault();
    canvas.addEventListener('touchstart', block, { passive: false });
    canvas.addEventListener('touchmove', block, { passive: false });
    return () => {
      canvas.removeEventListener('touchstart', block);
      canvas.removeEventListener('touchmove', block);
    };
  }, []);

  const getPos = useCallback((e) => {
    const canvas = canvasRef.current;
    const rect = canvas.getBoundingClientRect();
    const src = e.touches ? e.touches[0] : e;
    return {
      x: (src.clientX - rect.left) * DPR,
      y: (src.clientY - rect.top) * DPR
    };
  }, []);

  const onStart = useCallback((e) => {
    e.preventDefault();

    // Cancel any ongoing drying animation so it doesn't erase the new stroke
    if (animCancelRef.current) {
      animCancelRef.current();
      animCancelRef.current = null;
    }

    drawingRef.current = true;
    const pos = getPos(e);
    lastPosRef.current = pos;
    pressureRef.current = 0.25 + Math.random() * 0.35;

    currentStrokeRef.current = {
      color: eraseMode ? null : inkColor,
      erase: eraseMode,
      width: eraseMode ? 8 : 2.2 + Math.random() * 0.8,
      points: [{ ...pos, p: pressureRef.current }]
    };

    const next = [...strokes, currentStrokeRef.current];
    onStrokesChange(next);
  }, [eraseMode, inkColor, strokes, onStrokesChange, getPos]);

  const onMove = useCallback((e) => {
    if (!drawingRef.current || !currentStrokeRef.current) return;
    e.preventDefault();
    const pos = getPos(e);
    const dist = Math.hypot(pos.x - lastPosRef.current.x, pos.y - lastPosRef.current.y);
    if (dist < 1.5) return;

    pressureRef.current += (Math.random() - 0.5) * 0.12;
    pressureRef.current = Math.max(0.15, Math.min(0.95, pressureRef.current));

    currentStrokeRef.current.points.push({ ...pos, p: pressureRef.current });
    lastPosRef.current = pos;

    // Incremental draw — just the new segment
    const pts = currentStrokeRef.current.points;
    drawSegment(canvasRef.current.getContext('2d'), currentStrokeRef.current, pts.length - 1);
  }, [getPos]);

  const onEnd = useCallback((e) => {
    if (!drawingRef.current) return;
    drawingRef.current = false;

    // Commit the finalized stroke as a fresh immutable object so parent state
    // reference changes and persistence runs with the complete points array.
    let finalizedStrokes = strokes;
    if (currentStrokeRef.current) {
      const finalizedStroke = {
        ...currentStrokeRef.current,
        points: [...currentStrokeRef.current.points],
      };
      const lastStroke = strokes[strokes.length - 1];
      finalizedStrokes = lastStroke === currentStrokeRef.current
        ? [...strokes.slice(0, -1), finalizedStroke]
        : [...strokes, finalizedStroke];
      onStrokesChange(finalizedStrokes);
    }

    currentStrokeRef.current = null;

    // Trigger drying animation; store cancel so onStart can stop it
    const cancel = animateDrying(canvasRef.current, finalizedStrokes, () => {
      animCancelRef.current = null;
    });
    animCancelRef.current = cancel;
  }, [strokes, onStrokesChange]);

  return (
    <canvas
      ref={canvasRef}
      style={{ display: 'block', width: '100%', height: '100%', touchAction: 'none', cursor: eraseMode ? 'cell' : 'crosshair', ...style }}
      onMouseDown={onStart}
      onMouseMove={onMove}
      onMouseUp={onEnd}
      onMouseLeave={onEnd}
      onTouchStart={onStart}
      onTouchMove={onMove}
      onTouchEnd={onEnd}
    />
  );
}
