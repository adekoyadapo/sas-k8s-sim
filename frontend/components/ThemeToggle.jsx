"use client";
import { useEffect, useState } from "react";
import { refreshIfNeeded, getToken } from "../lib/session";

export default function ThemeToggle() {
  const [dark, setDark] = useState(false);
  useEffect(() => {
    async function init() {
      const API = process.env.NEXT_PUBLIC_API_BASE_URL || "http://localhost:8000";
      try {
        const t = getToken();
        let pref = localStorage.getItem('theme');
        if (t) {
          const r = await fetch(`${API}/auth/me/settings`, { headers: t?.access ? { Authorization: `Bearer ${t.access}` } : {} });
          const j = await r.json();
          if (j?.theme) pref = j.theme;
        }
        const isDark = (pref || 'light') === 'dark';
        setDark(isDark);
        document.documentElement.classList.toggle('dark', isDark);
        try { window.dispatchEvent(new CustomEvent('theme-changed', { detail: { dark: isDark } })); } catch {}
      } catch {}
    }
    init();
  }, []);
  async function toggle() {
    const next = !dark;
    setDark(next);
    document.documentElement.classList.toggle('dark', next);
    localStorage.setItem('theme', next ? 'dark' : 'light');
    try { window.dispatchEvent(new CustomEvent('theme-changed', { detail: { dark: next } })); } catch {}
    try {
      const API = process.env.NEXT_PUBLIC_API_BASE_URL || "http://localhost:8000";
      const t = await refreshIfNeeded(API);
      if (t) await fetch(`${API}/auth/me/settings`, { method: 'POST', headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${t.access}` }, body: JSON.stringify({ theme: next ? 'dark' : 'light' }) });
    } catch {}
  }
  return (
    <button className="btn-muted h-8 px-3" onClick={toggle}>{dark ? 'Light' : 'Dark'}</button>
  );
}
