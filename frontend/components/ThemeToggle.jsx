"use client";
import { useEffect, useState } from "react";
import { refreshIfNeeded, getToken } from "../lib/session";
import { Sun, Moon } from "lucide-react";

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
    <button
      className="relative h-9 w-9 rounded-lg flex items-center justify-center transition-all duration-300 hover:bg-gray-100 dark:hover:bg-gray-800 group"
      onClick={toggle}
      aria-label={dark ? 'Switch to light mode' : 'Switch to dark mode'}
    >
      {dark ? (
        <Sun
          className="h-5 w-5 text-amber-500 transition-all duration-300 group-hover:scale-110"
          style={{ filter: 'drop-shadow(0 0 8px rgba(251, 191, 36, 0.6))' }}
        />
      ) : (
        <Moon
          className="h-5 w-5 text-indigo-600 transition-all duration-300 group-hover:scale-110"
          style={{ filter: 'drop-shadow(0 0 8px rgba(79, 70, 229, 0.6))' }}
        />
      )}
    </button>
  );
}
