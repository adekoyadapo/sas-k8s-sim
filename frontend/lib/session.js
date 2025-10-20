export function getToken() {
  if (typeof window === 'undefined') return null;
  const s = localStorage.getItem('tokenPayload');
  if (!s) return null;
  try { return JSON.parse(s); } catch { return null; }
}

export function setTokens({ access, refresh, exp }) {
  const payload = { access, refresh, exp };
  localStorage.setItem('tokenPayload', JSON.stringify(payload));
}

export function clearTokens() {
  localStorage.removeItem('tokenPayload');
}

export function decodeJwtExp(jwt) {
  try {
    const [, payload] = jwt.split('.');
    const json = JSON.parse(atob(payload));
    return json.exp ? json.exp * 1000 : null;
  } catch { return null; }
}

export async function refreshIfNeeded(apiBase) {
  const p = getToken();
  if (!p) return null;
  const now = Date.now();
  if (p.exp && now < p.exp - 30_000) return p; // still valid
  // attempt refresh
  if (!p.refresh) return null;
  const res = await fetch(`${apiBase}/auth/refresh`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ refresh_token: p.refresh }) });
  if (!res.ok) { clearTokens(); return null; }
  const data = await res.json();
  const exp = decodeJwtExp(data.access_token);
  setTokens({ access: data.access_token, refresh: data.refresh_token, exp });
  return getToken();
}

