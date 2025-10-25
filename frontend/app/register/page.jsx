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
  const name = email.split("@")[0] || "there";

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
    <div className="grid min-h-[60vh] grid-cols-1 overflow-hidden rounded-lg border md:grid-cols-2">
      <div className="relative hidden bg-gradient-to-br from-indigo-50 via-white to-purple-50 dark:from-indigo-950 dark:via-gray-950 dark:to-purple-950 p-8 md:block">
        <div className="absolute -left-24 -top-24 h-64 w-64 rounded-full bg-indigo-100/70 dark:bg-indigo-900/30 blur-3xl" />
        <div className="absolute -right-24 -bottom-24 h-64 w-64 rounded-full bg-purple-100/50 dark:bg-purple-900/20 blur-3xl" />
        <div className="relative z-10 flex h-full flex-col justify-end">
          <h2 className="mb-2 text-2xl font-semibold">Join us today</h2>
          <p className="text-sm text-gray-600 dark:text-gray-400">
            Create your account to start deploying and managing tenant environments in seconds.
          </p>
          <div className="mt-6 space-y-3">
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 bg-indigo-100 dark:bg-indigo-900 rounded-full flex items-center justify-center">
                <svg className="w-4 h-4 text-indigo-600 dark:text-indigo-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                </svg>
              </div>
              <span className="text-sm text-gray-700 dark:text-gray-300">Deploy in seconds</span>
            </div>
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 bg-indigo-100 dark:bg-indigo-900 rounded-full flex items-center justify-center">
                <svg className="w-4 h-4 text-indigo-600 dark:text-indigo-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                </svg>
              </div>
              <span className="text-sm text-gray-700 dark:text-gray-300">Scale on demand</span>
            </div>
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 bg-indigo-100 dark:bg-indigo-900 rounded-full flex items-center justify-center">
                <svg className="w-4 h-4 text-indigo-600 dark:text-indigo-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                </svg>
              </div>
              <span className="text-sm text-gray-700 dark:text-gray-300">Monitor in real-time</span>
            </div>
          </div>
        </div>
      </div>
      <div className="p-6 md:p-8">
        <div className="mx-auto w-full max-w-sm">
          <div className="mb-6">
            <h1 className="text-xl font-semibold">Hi {name}, let's get you started</h1>
            <p className="text-sm text-gray-600 dark:text-gray-400">Create your account to begin deploying.</p>
          </div>
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
          {msg && <p className="mt-3 text-sm text-rose-600">{msg}</p>}
          <p className="mt-4 text-center text-xs text-gray-500">Already have an account? <a href="/login" className="underline">Login</a></p>
        </div>
      </div>
    </div>
  );
}
