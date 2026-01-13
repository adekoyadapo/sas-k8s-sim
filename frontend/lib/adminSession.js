export function getAdminToken() {
  if (typeof window === 'undefined') return null;
  const s = localStorage.getItem('adminTokenPayload');
  if (!s) return null;
  try { return JSON.parse(s); } catch { return null; }
}

export function setAdminTokens({ access, refresh, exp }) {
  localStorage.setItem('adminTokenPayload', JSON.stringify({ access, refresh, exp }));
}

export function clearAdminTokens() {
  localStorage.removeItem('adminTokenPayload');
}

export function decodeJwtExp(jwt) {
  try {
    const [, payload] = jwt.split('.');
    const json = JSON.parse(atob(payload));
    return json.exp ? json.exp * 1000 : null;
  } catch { return null; }
}

export async function refreshAdminIfNeeded(apiBase) {
  const p = getAdminToken();
  if (!p) return null;
  const now = Date.now();
  if (p.exp && now < p.exp - 30_000) return p; // still valid
  if (!p.refresh) return null;
  const res = await fetch(`${apiBase}/admin/refresh`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ refresh_token: p.refresh }) });
  if (!res.ok) { clearAdminTokens(); return null; }
  const data = await res.json();
  const exp = decodeJwtExp(data.access_token);
  setAdminTokens({ access: data.access_token, refresh: data.refresh_token, exp });
  return getAdminToken();
}

