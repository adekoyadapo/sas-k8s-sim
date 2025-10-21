"use client";
import { useState } from "react";
import { decodeJwtExp } from "../../lib/session";
import * as Tooltip from "@radix-ui/react-tooltip";

const API = process.env.NEXT_PUBLIC_API_BASE_URL || "http://localhost:8000";

export default function RegisterPage() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [msg, setMsg] = useState("");
  const [submitted, setSubmitted] = useState(false);
  const [touched, setTouched] = useState({ email: false, password: false });

  const emailValid = /^\S+@\S+\.\S+$/.test(email);
  const passValid = (password || "").length >= 6;
  const showEmailTip = (!emailValid) && (touched.email || submitted);
  const showPassTip = (!passValid) && (touched.password || submitted);

  async function onSubmit(e) {
    e.preventDefault();
    setSubmitted(true);
    setMsg("");
    if (!emailValid || !passValid) return;
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
        <form noValidate onSubmit={onSubmit} className="space-y-3">
          <label className="label" htmlFor="email">Email</label>
          <Tooltip.Provider>
            <Tooltip.Root open={showEmailTip}>
              <Tooltip.Trigger asChild>
                <input
                  id="email"
                  type="email"
                  className={`input ${showEmailTip ? "border-rose-300 ring-rose-200" : ""}`}
                  placeholder="you@example.com"
                  value={email}
                  onBlur={() => setTouched((t) => ({ ...t, email: true }))}
                  onChange={(e) => setEmail(e.target.value)}
                  aria-invalid={!emailValid}
                  pattern="\S+@\S+\.\S+"
                  required
                />
              </Tooltip.Trigger>
              <Tooltip.Content sideOffset={6} className="rounded bg-gray-900 px-2 py-1 text-[11px] text-white shadow">
                Enter a valid email (e.g., you@example.com).
              </Tooltip.Content>
            </Tooltip.Root>
          </Tooltip.Provider>

          <label className="label" htmlFor="password">Password</label>
          <Tooltip.Provider>
            <Tooltip.Root open={showPassTip}>
              <Tooltip.Trigger asChild>
                <input
                  id="password"
                  className={`input ${showPassTip ? "border-rose-300 ring-rose-200" : ""}`}
                  placeholder="••••••••"
                  type="password"
                  value={password}
                  onBlur={() => setTouched((t) => ({ ...t, password: true }))}
                  onChange={(e) => setPassword(e.target.value)}
                  aria-invalid={!passValid}
                  minLength={6}
                  required
                />
              </Tooltip.Trigger>
              <Tooltip.Content sideOffset={6} className="rounded bg-gray-900 px-2 py-1 text-[11px] text-white shadow">
                Use a password with 6–8 characters.
              </Tooltip.Content>
            </Tooltip.Root>
          </Tooltip.Provider>

          <button className="btn-primary w-full" type="submit" disabled={!emailValid || !passValid}>Register</button>
        </form>
        {msg && <p className="mt-3 text-sm text-gray-600">{msg}</p>}
      </div>
    </div>
  );
}
