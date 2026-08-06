function token() { return localStorage.getItem('gym_token'); }

async function req(path, opts = {}) {
  const res = await fetch(`/api${path}`, {
    ...opts,
    headers: {
      'Content-Type': 'application/json',
      ...(token() ? { Authorization: `Bearer ${token()}` } : {}),
      ...opts.headers,
    },
    body: opts.body !== undefined ? JSON.stringify(opts.body) : undefined,
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.error || 'API error');
  return data;
}

export const api = {
  register:    (username, password) => req('/auth/register', { method: 'POST', body: { username, password } }),
  login:       (username, password) => req('/auth/login',    { method: 'POST', body: { username, password } }),

  getExercises:    ()              => req('/exercises'),
  addExercise:     (name)          => req('/exercises',        { method: 'POST',   body: { name } }),
  renameExercise:  (index, name)   => req(`/exercises/${index}`, { method: 'PUT',  body: { name } }),
  deleteExercise:  (index)         => req(`/exercises/${index}`, { method: 'DELETE' }),

  getLastWorkout: ()                      => req('/last-workout'),

  getWeek:  (stamp)                      => req(`/week/${stamp}`),
  saveStrokes: (stamp, day, ex, strokes) => req(`/week/${stamp}/day/${day}/strokes/${ex}`, { method: 'PUT', body: { strokes } }),
  setDayCheck: (stamp, day, checked)     => req(`/week/${stamp}/day/${day}/check`,         { method: 'PUT', body: { checked } }),
};
