"use client";
import { motion } from "framer-motion";

export default function Landing() {
  return (
    <div className="space-y-12">
      <section className="relative overflow-hidden rounded-xl border bg-gradient-to-br from-sky-50 via-white to-white p-8 dark:from-gray-900 dark:via-gray-950 dark:to-gray-950">
        <div className="grid grid-cols-1 items-center gap-8 md:grid-cols-2">
          <div>
            <h1 className="text-4xl font-semibold leading-tight">Spin up tenant environments in seconds.</h1>
            <p className="mt-3 text-gray-600 dark:text-gray-300">A local multitenant SaaS simulator with Kubernetes, Helm, and an admin dashboard. Perfect for demos and onboarding up to ~10 customers.</p>
            <div className="mt-6 flex gap-3">
              <a className="btn-primary" href="/register">Get Started</a>
              <a className="btn-muted" href="/dashboard">Open Dashboard</a>
            </div>
          </div>
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="card p-6">
            <div className="grid grid-cols-2 gap-4 text-sm">
              <div><span className="badge">Kind/K3d</span><p className="mt-2">Local cluster with nginx-ingress</p></div>
              <div><span className="badge">Helm</span><p className="mt-2">Tenant NGINX chart per namespace</p></div>
              <div><span className="badge">FastAPI</span><p className="mt-2">JWT auth + Alembic</p></div>
              <div><span className="badge">Next.js</span><p className="mt-2">Responsive dashboard + Tailwind</p></div>
            </div>
          </motion.div>
        </div>
        <div className="pointer-events-none absolute -right-24 -top-24 h-64 w-64 rounded-full bg-sky-200/50 blur-3xl dark:bg-sky-900/30" />
        <div className="pointer-events-none absolute -left-16 -bottom-16 h-64 w-64 rounded-full bg-sky-100/60 blur-3xl dark:bg-sky-800/20" />
      </section>
      <section className="grid grid-cols-1 gap-4 md:grid-cols-3">
        {["Register", "Create", "Manage"].map((t, i) => (
          <div key={t} className="card p-6">
            <h3 className="font-medium">{t}</h3>
            <p className="mt-2 text-sm text-gray-600">{[
              "Create your account to get API access.",
              "Provision a tenant deployment with one click.",
              "Monitor status and delete when finished.",
            ][i]}</p>
          </div>
        ))}
      </section>
    </div>
  );
}
