const BASE = import.meta.env.VITE_API_URL || '/api/v1';

// sessionStorage can throw (private mode) — degrade to "not logged in".
export const store = {
  get: (k) => { try { return sessionStorage.getItem(k); } catch { return null; } },
  set: (k, v) => { try { v == null ? sessionStorage.removeItem(k) : sessionStorage.setItem(k, v); } catch { /* ignore */ } },
};

let onAuthLost = () => {};
export const setAuthLostHandler = (fn) => { onAuthLost = fn; };

const post = async (path, body) =>
  (await fetch(BASE + path, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) })).json();

const saveTokens = (d) => { store.set('at', d.accessToken); store.set('rt', d.refreshToken); };

export async function login(identifier, password) {
  const j = await post('/auth/login', { identifier, password });
  if (j.success) saveTokens(j.data);
  return j;
}

async function refresh() {
  const rt = store.get('rt');
  if (!rt) return false;
  const j = await post('/auth/refresh', { refreshToken: rt });
  if (j.success) saveTokens(j.data);
  return j.success;
}

export function logout() { store.set('at'); store.set('rt'); onAuthLost(); }

export async function api(path, { method = 'GET', body } = {}, retry = true) {
  const res = await fetch(BASE + path, {
    method,
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${store.get('at')}` },
    body: body && JSON.stringify(body),
  });
  if (res.status === 401 && retry && (await refresh())) return api(path, { method, body }, false);
  if (res.status === 401 || res.status === 403) { logout(); throw new Error('Session expired or not an admin'); }
  const j = await res.json();
  if (!j.success) throw new Error(j.error.message);
  return j.data;
}
