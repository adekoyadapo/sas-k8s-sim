"use client";
import { useState } from "react";
import { decodeJwtExp } from "../../lib/session";

const API = process.env.NEXT_PUBLIC_API_BASE_URL || "http://localhost:8000";

export default function RegisterPage() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [msg, setMsg] = useState("");

  async function onSubmit(e) {
    e.preventDefault();
    setMsg("...");
    const res = await fetch(`${API}/auth/register`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email, password }),
    });
    const data = await res.json();
    if (res.ok) {
      const exp = decodeJwtExp(data.access_token);
      localStorage.setItem("tokenPayload", JSON.stringify({ access: data.access_token, refresh: data.refresh_token, exp }));
      setMsg("Registered. Redirecting...");
      setTimeout(() => { window.location.href = "/dashboard"; }, 600);
    } else {
      setMsg(data.detail || "Error");
    }
  }

  return (
    <div className="mx-auto max-w-md space-y-4">
      <div className="card p-6">
        <h1 className="text-xl font-semibold mb-4">Create account</h1>
        <form onSubmit={onSubmit} className="space-y-3">
          <label className="label" htmlFor="email">Email</label>
          <input id="email" className="input" placeholder="you@example.com" value={email} onChange={(e) => setEmail(e.target.value)} />
          <label className="label" htmlFor="password">Password</label>
          <input id="password" className="input" placeholder="••••••••" type="password" value={password} onChange={(e) => setPassword(e.target.value)} />
          <button className="btn-primary w-full" type="submit">Register</button>
        </form>
        {msg && <p className="mt-3 text-sm text-gray-600">{msg}</p>}
      </div>
    </div>
  );
}
