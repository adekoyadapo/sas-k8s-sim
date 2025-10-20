"use client";
import { useState } from "react";
import { decodeJwtExp } from "../../lib/session";

const API = process.env.NEXT_PUBLIC_API_BASE_URL || "http://localhost:8000";

export default function LoginPage() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [msg, setMsg] = useState("");
  const name = email.split("@")[0] || "there";

  async function onSubmit(e) {
    e.preventDefault();
    setMsg("...");
    const res = await fetch(`${API}/auth/login`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email, password }),
    });
    const data = await res.json();
    if (res.ok) {
      const exp = decodeJwtExp(data.access_token);
      localStorage.setItem("tokenPayload", JSON.stringify({ access: data.access_token, refresh: data.refresh_token, exp }));
      setMsg("Logged in. Redirecting...");
      setTimeout(() => { window.location.href = "/dashboard"; }, 600);
    } else {
      setMsg(data.detail || "Error");
    }
  }

  return (
    <div className="grid min-h-[60vh] grid-cols-1 overflow-hidden rounded-lg border md:grid-cols-2">
      <div className="relative hidden bg-gradient-to-br from-sky-50 via-white to-white p-8 md:block">
        <div className="absolute -left-24 -top-24 h-64 w-64 rounded-full bg-sky-100/70 blur-3xl" />
        <div className="absolute -right-24 -bottom-24 h-64 w-64 rounded-full bg-sky-100/50 blur-3xl" />
        <div className="relative z-10 flex h-full flex-col justify-end">
          <h2 className="mb-2 text-2xl font-semibold">Welcome back</h2>
          <p className="text-sm text-gray-600">Sign in to manage your tenant deployments. Ingress base domain: <span className="font-mono">*.10-0-10-253.sslip.io</span></p>
        </div>
      </div>
      <div className="p-6 md:p-8">
        <div className="mx-auto w-full max-w-sm">
          <div className="mb-6">
            <h1 className="text-xl font-semibold">Hi {name}, let’s sign you in</h1>
            <p className="text-sm text-gray-600">Use the email you registered with.</p>
          </div>
          <form onSubmit={onSubmit} className="space-y-3">
            <label className="label" htmlFor="email">Email</label>
            <input id="email" className="input" placeholder="you@example.com" value={email} onChange={(e) => setEmail(e.target.value)} />
            <label className="label" htmlFor="password">Password</label>
            <input id="password" className="input" placeholder="••••••••" type="password" value={password} onChange={(e) => setPassword(e.target.value)} />
            <button className="btn-primary w-full" type="submit">Login</button>
          </form>
          {msg && <p className="mt-3 text-sm text-rose-600">{msg}</p>}
          <p className="mt-4 text-center text-xs text-gray-500">Don’t have an account? <a href="/register" className="underline">Register</a></p>
        </div>
      </div>
    </div>
  );
}
