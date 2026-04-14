// Toolbar — color picker, eraser, clear button, add exercise
import React, { useState } from 'react';
import './Toolbar.css';

const INK_COLORS = [
  { hex: '#1dae7a', label: 'green' },
  { hex: '#e74c3c', label: 'red' },
  { hex: '#2980b9', label: 'blue' },
  { hex: '#f39c12', label: 'orange' },
  { hex: '#1a1a1a', label: 'black' },
];

export default function Toolbar({ inkColor, onColorChange, eraseMode, onEraseToggle, onClear, onAddExercise }) {
  const [adding, setAdding] = useState(false);
  const [newName, setNewName] = useState('');

  function submitAdd() {
    const trimmed = newName.trim();
    if (trimmed) onAddExercise(trimmed);
    setNewName('');
    setAdding(false);
  }

  return (
    <div className="toolbar">
      <div className="toolbar-row">
        <div className="color-row">
          {INK_COLORS.map(({ hex, label }) => (
            <button
              key={hex}
              className={`color-dot ${inkColor === hex && !eraseMode ? 'selected' : ''}`}
              style={{ background: hex }}
              title={label}
              onClick={() => { onColorChange(hex); if (eraseMode) onEraseToggle(); }}
            />
          ))}
        </div>

        <div className="action-row">
          <button
            className={`tb-btn ${eraseMode ? 'active' : ''}`}
            onClick={onEraseToggle}
          >
            {eraseMode ? '✕ erase' : 'erase'}
          </button>
          <button className="tb-btn" onClick={() => setAdding(v => !v)}>
            + add
          </button>
          <button className="tb-btn danger" onClick={onClear}>
            clear
          </button>
        </div>
      </div>

      {adding && (
        <div className="add-row">
          <input
            className="add-input"
            placeholder="exercise name..."
            value={newName}
            autoFocus
            maxLength={24}
            onChange={e => setNewName(e.target.value)}
            onKeyDown={e => { if (e.key === 'Enter') submitAdd(); if (e.key === 'Escape') setAdding(false); }}
          />
          <button className="add-confirm" onClick={submitAdd}>OK</button>
        </div>
      )}
    </div>
  );
}
