// ExerciseLabel — one label from the printer, with tally drawing area
import React, { useEffect, useState } from 'react';
import MarkerCanvas from './MarkerCanvas';
import './ExerciseLabel.css';

export default function ExerciseLabel({
  name,
  strokes,
  onStrokesChange,
  inkColor,
  eraseMode,
  editMode,
  onRename,
  onDelete,
}) {
  const [draftName, setDraftName] = useState(name);

  useEffect(() => {
    setDraftName(name);
  }, [name]);

  function submitRename() {
    const trimmed = draftName.trim();
    if (!trimmed) {
      setDraftName(name);
      return;
    }
    onRename(trimmed);
  }

  return (
    <div className="exercise-label">
      <div className="exercise-name-wrap">
        {editMode ? (
          <>
            <input
              className="exercise-name-input"
              value={draftName}
              maxLength={24}
              aria-label="Edit exercise name"
              onChange={(e) => setDraftName(e.target.value)}
              onBlur={submitRename}
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  e.currentTarget.blur();
                }
                if (e.key === 'Escape') {
                  setDraftName(name);
                  e.currentTarget.blur();
                }
              }}
            />
            <button
              type="button"
              className="exercise-delete"
              onClick={onDelete}
              aria-label={`Delete ${name}`}
              title="Delete exercise"
            >
              delete
            </button>
          </>
        ) : (
          <div className="exercise-name">{name}</div>
        )}
      </div>
      <MarkerCanvas
        strokes={strokes}
        onStrokesChange={onStrokesChange}
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
          pointerEvents: editMode ? 'none' : 'auto',
        }}
      />
    </div>
  );
}
