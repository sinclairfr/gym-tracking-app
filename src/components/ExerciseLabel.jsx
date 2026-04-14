// ExerciseLabel — one label from the printer, with tally drawing area
import React from 'react';
import MarkerCanvas from './MarkerCanvas';
import './ExerciseLabel.css';

export default function ExerciseLabel({ name, strokes, onStrokesChange, inkColor, eraseMode }) {
  return (
    <div className="exercise-label">
      <div className="exercise-name">{name}</div>
      <MarkerCanvas
        strokes={strokes}
        onStrokesChange={onStrokesChange}
        inkColor={inkColor}
        eraseMode={eraseMode}
        style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, width: '100%', height: '100%', zIndex: 2 }}
      />
    </div>
  );
}
