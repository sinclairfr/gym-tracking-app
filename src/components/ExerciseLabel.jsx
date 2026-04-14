// ExerciseLabel — one label from the printer, with tally drawing area
import React from 'react';
import MarkerCanvas from './MarkerCanvas';
import './ExerciseLabel.css';

export default function ExerciseLabel({ name, strokes, onStrokesChange, inkColor, eraseMode }) {
  return (
    <div className="exercise-label">
      <div className="exercise-name">{name}</div>
      <div className="exercise-tally">
        <MarkerCanvas
          strokes={strokes}
          onStrokesChange={onStrokesChange}
          inkColor={inkColor}
          eraseMode={eraseMode}
        />
      </div>
    </div>
  );
}
