import accounts from './accounts.json';

const SESSION_KEY = 'gym_auth_session';

function normalize(value) {
  return String(value || '').trim();
}

export function login(username, password) {
  const cleanUsername = normalize(username);
  const cleanPassword = String(password || '');

  const account = accounts.find(
    (item) => item.username === cleanUsername && item.password === cleanPassword
  );

  if (!account) {
    return null;
  }

  const session = {
    username: account.username,
    displayName: account.displayName || account.username,
  };

  try {
    localStorage.setItem(SESSION_KEY, JSON.stringify(session));
  } catch {
    // Ignore persistence failures
  }

  return session;
}

export function getSession() {
  try {
    const raw = localStorage.getItem(SESSION_KEY);
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}

export function logout() {
  try {
    localStorage.removeItem(SESSION_KEY);
  } catch {
    // Ignore persistence failures
  }
}
