"use client";
import { useEffect, useState } from "react";
import { refreshAdminIfNeeded, getAdminToken, clearAdminTokens } from "../../lib/adminSession";
import { ExternalLink, Users, Server } from "lucide-react";

const API = process.env.NEXT_PUBLIC_API_BASE_URL || "http://localhost:8000";

export default function AdminDashboard() {
  const [auth, setAuth] = useState(null);
  const [stats, setStats] = useState(null);
  const [tenants, setTenants] = useState(null);
  const [live, setLive] = useState(false);

  useEffect(() => {
    const t = getAdminToken();
    setAuth(t);
    if (!t) return;
    refresh();
    const id = setInterval(() => refresh(), 8000);
    return () => clearInterval(id);
  }, []);

  async function refresh() {
    const t = await refreshAdminIfNeeded(API);
    if (!t) { setAuth(null); return; }
    const h = { Authorization: `Bearer ${t.access}` };
    const s = await fetch(`${API}/admin/stats`, { headers: h });
    const sd = await s.json();
    setStats(sd);
    const q = live ? '?live=true' : '';
    const r = await fetch(`${API}/admin/tenants${q}`, { headers: h });
    const rd = await r.json();
    setTenants(Array.isArray(rd) ? rd : []);
  }

  if (!auth) {
    return (
      <div className="text-center mt-16">
        <h1 className="text-2xl font-semibold mb-2">Admin Area</h1>
        <p className="mb-4 text-gray-600 dark:text-gray-400">Sign in to view platform-wide stats.</p>
        <a className="btn-primary" href="/admin/login">Go to Admin Login</a>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold">Admin Dashboard</h1>
        <div className="flex gap-2">
          <label className="flex items-center gap-2 text-sm"><input type="checkbox" checked={live} onChange={e=>setLive(e.target.checked)} /> Live K8s details</label>
          <button className="btn-muted" onClick={()=>{ clearAdminTokens(); window.location.reload(); }}>Logout</button>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <div className="bg-white dark:bg-gray-800 p-6 rounded-lg border dark:border-gray-700">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600 dark:text-gray-400 mb-1">Users</p>
              <p className="text-3xl font-bold">{stats?.users ?? '—'}</p>
            </div>
            <div className="w-12 h-12 bg-indigo-100 dark:bg-indigo-900 rounded-lg flex items-center justify-center">
              <Users className="w-6 h-6 text-indigo-600 dark:text-indigo-400" />
            </div>
          </div>
        </div>

        <div className="bg-white dark:bg-gray-800 p-6 rounded-lg border dark:border-gray-700">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600 dark:text-gray-400 mb-1">Deployments</p>
              <p className="text-3xl font-bold">{stats?.deployments ?? '—'}</p>
            </div>
            <div className="w-12 h-12 bg-purple-100 dark:bg-purple-900 rounded-lg flex items-center justify-center">
              <Server className="w-6 h-6 text-purple-600 dark:text-purple-400" />
            </div>
          </div>
        </div>

        <div className="bg-white dark:bg-gray-800 p-6 rounded-lg border dark:border-gray-700">
          <p className="text-sm text-gray-600 dark:text-gray-400 mb-1">Ingress</p>
          <p className={`text-3xl font-bold ${stats?.cluster?.ingress_ready ? 'text-green-600' : 'text-rose-600'}`}>{stats?.cluster?.ingress_ready ? 'Ready' : 'Not Ready'}</p>
        </div>

        <div className="bg-white dark:bg-gray-800 p-6 rounded-lg border dark:border-gray-700">
          <p className="text-sm text-gray-600 dark:text-gray-400 mb-1">Nodes / Tenant NS / Pods</p>
          <p className="text-xl font-semibold">{stats?.cluster?.nodes ?? '—'} / {stats?.cluster?.tenant_namespaces ?? '—'} / {stats?.cluster?.tenant_pods ?? '—'}</p>
        </div>
      </div>

      <div className="bg-white dark:bg-gray-800 rounded-lg border dark:border-gray-700">
        <div className="p-4 border-b dark:border-gray-700 flex items-center justify-between">
          <h2 className="font-semibold">Tenants</h2>
          <button className="btn-muted" onClick={refresh}>Refresh</button>
        </div>
        <div className="overflow-x-auto">
          <table className="min-w-full text-sm">
            <thead>
              <tr className="text-left text-gray-600 dark:text-gray-300">
                <th className="p-3">Email</th>
                <th className="p-3">Slug</th>
                <th className="p-3">Deployments</th>
                <th className="p-3">Recent</th>
              </tr>
            </thead>
            <tbody>
              {tenants?.map((t) => (
                <tr key={t.id} className="border-t dark:border-gray-700 align-top">
                  <td className="p-3">{t.email}</td>
                  <td className="p-3">{t.user_slug}</td>
                  <td className="p-3">{t.deployments.length}</td>
                  <td className="p-3">
                    <div className="space-y-2">
                      {t.deployments.slice(0,5).map((d) => (
                        <div key={d.id} className="flex items-center gap-2">
                          <span className={`px-2 py-0.5 rounded text-xs ${d.status==='READY'?'bg-green-100 text-green-700 dark:bg-green-900/40 dark:text-green-300': d.status==='ERROR'?'bg-rose-100 text-rose-700 dark:bg-rose-900/40 dark:text-rose-300':'bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-300'}`}>{d.status}</span>
                          <span className="font-medium">{d.display_name}</span>
                          <a className="text-indigo-600 dark:text-indigo-400 hover:underline inline-flex items-center gap-1" href={`https://${d.ingress_host}`} target="_blank" rel="noreferrer">
                            open <ExternalLink className="w-3 h-3" />
                          </a>
                        </div>
                      ))}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

