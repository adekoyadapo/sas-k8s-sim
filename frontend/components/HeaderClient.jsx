"use client";
import { useEffect, useState } from "react";
import { refreshIfNeeded, clearTokens } from "../lib/session";
import ThemeToggle from "./ThemeToggle";
import MobileDrawer from "./MobileDrawer";

const API = process.env.NEXT_PUBLIC_API_BASE_URL || "http://localhost:8000";

export default function HeaderClient() {
  const [auth, setAuth] = useState(null);
  const [secs, setSecs] = useState(null);
  const [elev, setElev] = useState(false);
  useEffect(() => {
    const sync = async () => {
      const t = await refreshIfNeeded(API);
      setAuth(t);
      if (t?.exp) setSecs(Math.max(0, Math.floor((t.exp - Date.now()) / 1000)));
    };
    sync();
    const id = setInterval(() => sync(), 15_000);
    const tick = setInterval(() => setSecs((s) => (s === null ? s : Math.max(0, s - 1))), 1000);
    const onScroll = () => setElev(window.scrollY > 6);
    window.addEventListener('scroll', onScroll);
    return () => { clearInterval(id); clearInterval(tick); };
  }, []);
  function logout() { clearTokens(); setAuth(null); window.location.href = "/"; }
  return (
    <header className={`sticky top-0 z-40 ${elev ? 'shadow-sm' : ''} border-b bg-white/80 backdrop-blur dark:border-gray-800 dark:bg-gray-950/70`}>
      <div className="container mx-auto flex h-14 items-center justify-between">
        <a href="/" className="flex items-center gap-2 font-semibold text-gray-900 dark:text-gray-100">
          <img src="/logo.svg" alt="logo" className="h-6 w-6" />
          SaaS Simulator
        </a>
        <nav className="hidden items-center gap-2 text-sm lg:flex">
          {!auth && <a className="hover:underline" href="/login">Login</a>}
          {!auth && <a className="hover:underline" href="/register">Register</a>}
          {auth && <a className="hover:underline" href="/dashboard">Dashboard</a>}
          {auth && <button className="btn-muted h-8 px-3" onClick={logout}>Logout{secs !== null && <span className="ml-2 text-xs text-gray-500">{secs}s</span>}</button>}
          <ThemeToggle />
        </nav>
        <MobileDrawer auth={auth} onLogout={logout} />
      </div>
    </header>
  );
}
