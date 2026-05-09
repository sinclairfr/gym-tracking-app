import React, { useState } from 'react';
import { api } from '../api';
import './AuthScreen.css';

export default function AuthScreen({ onAuth }) {
  const [mode, setMode]         = useState('login');
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError]       = useState('');
  const [loading, setLoading]   = useState(false);

  function switchMode(m) { setMode(m); setError(''); }

  async function submit(e) {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      const data = mode === 'login'
        ? await api.login(username, password)
        : await api.register(username, password);
      localStorage.setItem('gym_token', data.token);
      onAuth(data.user);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="auth-screen">
      <div className="auth-card">
        <h1 className="auth-title">GYM TRACKER</h1>

        <div className="auth-tabs">
          <button className={`auth-tab ${mode === 'login'    ? 'active' : ''}`} onClick={() => switchMode('login')}>Login</button>
          <button className={`auth-tab ${mode === 'register' ? 'active' : ''}`} onClick={() => switchMode('register')}>Créer un compte</button>
        </div>

        <form className="auth-form" onSubmit={submit}>
          <input
            className="auth-input"
            type="text"
            placeholder="nom d'utilisateur"
            value={username}
            autoCapitalize="none"
            autoFocus
            onChange={e => setUsername(e.target.value)}
          />
          <input
            className="auth-input"
            type="password"
            placeholder="mot de passe"
            value={password}
            onChange={e => setPassword(e.target.value)}
          />
          {error && <p className="auth-error">{error}</p>}
          <button className="auth-submit" type="submit" disabled={loading}>
            {loading ? '…' : mode === 'login' ? 'Connexion' : 'Créer le compte'}
          </button>
        </form>
      </div>
    </div>
  );
}
