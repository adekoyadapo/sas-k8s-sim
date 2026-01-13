"use client";
import { useState } from "react";
import { setAdminTokens, decodeJwtExp } from "../../../lib/adminSession";

const API = process.env.NEXT_PUBLIC_API_BASE_URL || "http://localhost:8000";

export default function AdminLoginPage() {
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [msg, setMsg] = useState("");
  const [loading, setLoading] = useState(false);

  async function onSubmit(e) {
    e.preventDefault();
    setMsg("");
    setLoading(true);
    try {
      const res = await fetch(`${API}/admin/login`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ username, password })
      });
      const data = await res.json();
      if (res.ok) {
        const exp = decodeJwtExp(data.access_token);
        setAdminTokens({ access: data.access_token, refresh: data.refresh_token, exp });
        setMsg("Logged in. Redirecting...");
        setTimeout(() => { window.location.href = "/admin"; }, 500);
      } else {
        setMsg(data.detail || "Invalid credentials");
      }
    } catch (e) {
      setMsg(String(e));
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="max-w-md mx-auto mt-12 bg-white dark:bg-gray-900 border rounded-lg p-6">
      <h1 className="text-2xl font-semibold mb-4">Admin Login</h1>
      <p className="text-sm text-gray-600 dark:text-gray-400 mb-4">Default is username "admin" and password "admin". Change in your environment variables.</p>
      <form onSubmit={onSubmit} className="space-y-3">
        <div>
          <label className="label" htmlFor="username">Username</label>
          <input id="username" className="input" value={username} onChange={(e)=>setUsername(e.target.value)} placeholder="admin" />
        </div>
        <div>
          <label className="label" htmlFor="password">Password</label>
          <input id="password" className="input" type="password" value={password} onChange={(e)=>setPassword(e.target.value)} placeholder="admin" />
        </div>
        <button className="btn-primary w-full" type="submit" disabled={loading || !username || !password}>{loading ? "..." : "Login"}</button>
      </form>
      {msg && <p className="mt-3 text-sm text-rose-600">{msg}</p>}
    </div>
  );
}

