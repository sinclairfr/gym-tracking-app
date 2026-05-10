// ExerciseLabel — one label from the printer, with tally drawing area
import React, { useState, useEffect } from 'react';
import MarkerCanvas from './MarkerCanvas';
import './ExerciseLabel.css';

export default function ExerciseLabel({ name, strokes, onStrokesChange, onStrokeEnd, inkColor, eraseMode, editMode, onRename, onDelete }) {
  const [inputName, setInputName] = useState(name);

  useEffect(() => setInputName(name), [name]);

  function handleBlur() {
    const trimmed = inputName.trim();
    if (trimmed && trimmed !== name) onRename(trimmed);
    else setInputName(name);
  }

  function handleKeyDown(e) {
    if (e.key === 'Enter') e.target.blur();
    if (e.key === 'Escape') { setInputName(name); e.target.blur(); }
  }

  return (
    <div className="exercise-label">
      {editMode ? (
        <div className="exercise-name-wrap">
          <input
            className="exercise-name-input"
            value={inputName}
            maxLength={24}
            onChange={e => setInputName(e.target.value)}
            onBlur={handleBlur}
            onKeyDown={handleKeyDown}
          />
          <button className="exercise-delete" onClick={onDelete}>del</button>
        </div>
      ) : (
        <div className="exercise-name">{name}</div>
      )}
      <MarkerCanvas
        strokes={strokes}
        onStrokesChange={onStrokesChange}
        onStrokeEnd={onStrokeEnd}
        inkColor={inkColor}
        eraseMode={eraseMode}
        style={{
          position: 'absolute',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          width: '100%',
          height: '100%',
          zIndex: 2,
        }}
      />
    </div>
  );
}
