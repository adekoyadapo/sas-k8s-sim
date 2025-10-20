"use client";
import { useEffect, useRef, useState } from "react";
import { getToken, refreshIfNeeded } from "../../lib/session";
import { motion, AnimatePresence } from "framer-motion";
import ConfirmDialog from "../../components/ConfirmDialog";
import ProgressTimeline from "../../components/ProgressTimeline";
import * as Tabs from "@radix-ui/react-tabs";
import { toast } from "sonner";
import { Check, AlertTriangle, Loader } from "lucide-react";
import * as Tooltip from "@radix-ui/react-tooltip";
import LogStream from "../../components/LogStream";
import { SkeletonList } from "../../components/Skeletons";

const API = process.env.NEXT_PUBLIC_API_BASE_URL || "http://localhost:8000";

export default function Dashboard() {
  const [auth, setAuth] = useState(null);
  const [displayName, setDisplayName] = useState("");
  const [serverType, setServerType] = useState('nginx');
  const [indexHtml, setIndexHtml] = useState("");
  const [list, setList] = useState(null);
  const [msg, setMsg] = useState("");
  const [stats, setStats] = useState({});
  const notifiedReady = useRef(new Set());
  const [deleteTimers, setDeleteTimers] = useState({});
  const [replicas, setReplicas] = useState(1);
  const [deleteDelaySec, setDeleteDelaySec] = useState(3);

  useEffect(() => {
    const t = getToken();
    setAuth(t);
    if (t) refresh();
    const id = setInterval(() => refresh(), 5000);
    return () => clearInterval(id);
  }, []);

  async function refresh() {
    const t = await refreshIfNeeded(API);
    if (!t) { setAuth(null); return; }
    const res = await fetch(`${API}/deployments`, { headers: { Authorization: `Bearer ${t.access}` } });
    const data = await res.json();
    setList(Array.isArray(data) ? data : []);
    if (Array.isArray(data)) {
      data.forEach((d) => d && fetchStatus(d.id));
    }
  }

  async function createDeployment(e) {
    e.preventDefault();
    const t = await refreshIfNeeded(API);
    if (!t) return;
    const res = await fetch(`${API}/deployments`, {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${t.access}` },
      body: JSON.stringify({ displayName, serverType, replicas, indexHtml: (serverType === 'tomcat' ? undefined : (indexHtml || undefined)) }),
    });
    const data = await res.json();
    if (res.ok) {
      setDisplayName("");
      setIndexHtml("");
      toast.success('Deployment created');
      await pollUntilReady(data.id);
    } else {
      setMsg(data.detail || "error");
      toast.error(String(data.detail || 'Error creating deployment'));
    }
  }

  async function pollUntilReady(id) {
    const deadline = Date.now() + 180000; // 3 min
    // Prefer SSE stream; fallback to polling
    try {
      const t = await refreshIfNeeded(API);
      if (!t) return;
      const es = new EventSource(`${API.replace('http', 'http')}/deployments/${id}/events`, { withCredentials: false });
      return await new Promise((resolve) => {
        es.onmessage = async (ev) => {
          const data = JSON.parse(ev.data);
          setStats((m) => ({ ...m, [id]: { ...m[id], ...data.report, status: data.status } }));
          if (data.status === 'READY') {
            if (!notifiedReady.current.has(id)) {
              notifiedReady.current.add(id);
              const url = `https://${(list || []).find(x=>x.id===id)?.ingress_host || stats[id]?.ingress_host || ''}`;
              toast.success('Deployment ready', {
                action: url ? { label: 'Open URL', onClick: () => window.open(url, '_blank') } : undefined,
              });
            }
            es.close(); await refresh(); setMsg(""); resolve();
          }
          if (data.status === 'ERROR') { es.close(); await refresh(); resolve(); }
        };
        es.addEventListener('end', async () => { es.close(); await refresh(); resolve(); });
        setTimeout(async () => { es.close(); await refresh(); resolve(); }, deadline - Date.now());
      });
    } catch (e) {
      while (Date.now() < deadline) {
        const t2 = await refreshIfNeeded(API);
        if (!t2) break;
        const r = await fetch(`${API}/deployments/${id}/status`, { headers: { Authorization: `Bearer ${t2.access}` } });
        const s = await r.json();
        setStats((m) => ({ ...m, [id]: s }));
        if (s.status === 'READY') {
          if (!notifiedReady.current.has(id)) {
            notifiedReady.current.add(id);
            const url = `https://${(list || []).find(x=>x.id===id)?.ingress_host || stats[id]?.ingress_host || ''}`;
            toast.success('Deployment ready', {
              action: url ? { label: 'Open URL', onClick: () => window.open(url, '_blank') } : undefined,
            });
          }
          await refresh(); setMsg(""); return;
        }
        if (s.status === 'ERROR') { await refresh(); return; }
        await new Promise(res => setTimeout(res, 2000));
      }
      await refresh();
      setMsg("");
    }
  }

  async function fetchStatus(id) {
    try {
      const t = await refreshIfNeeded(API);
      if (!t) return;
      const r = await fetch(`${API}/deployments/${id}/status`, { headers: { Authorization: `Bearer ${t.access}` } });
      const s = await r.json();
      setStats((m) => ({ ...m, [id]: s }));
    } catch {}
  }

  async function remove(id) {
    // soft-delete: allow undo within 5s before calling API
    const timer = setTimeout(async () => {
      try {
        const t = await refreshIfNeeded(API);
        if (!t) return;
        const res = await fetch(`${API}/deployments/${id}`, { method: "DELETE", headers: { Authorization: `Bearer ${t.access}` } });
        if (res.ok) { toast.success('Deployment deleted'); await refresh(); }
        else { toast.error('Error deleting deployment'); }
      } finally {
        setDeleteTimers((m) => { const n={...m}; delete n[id]; return n; });
      }
    }, deleteDelaySec * 1000);
    setDeleteTimers((m) => ({ ...m, [id]: timer }));
    toast.message(`Deleting in ${deleteDelaySec}s…`, {
      action: { label: 'Undo', onClick: () => { clearTimeout(timer); setDeleteTimers((m) => { const n={...m}; delete n[id]; return n; }); toast.success('Delete cancelled'); } },
    });
  }

  async function closeAccount() {
    const t = await refreshIfNeeded(API);
    if (!t) return;
    const res = await fetch(`${API}/auth/account`, { method: "DELETE", headers: { Authorization: `Bearer ${t.access}` } });
    if (res.ok) { localStorage.removeItem('tokenPayload'); window.location.href = '/'; }
  }

  if (!auth) return (
    <div className="card p-6"><p className="text-sm text-gray-600">Please login to view your dashboard.</p></div>
  );

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <h1 className="text-2xl font-semibold">Admin Dashboard</h1>
        <ConfirmDialog
          trigger={<button className="btn-muted">Delete Account</button>}
          title="Close Account"
          description="This will permanently delete your account and all tenant namespaces. This action cannot be undone."
          confirmText="Delete"
          variant="danger"
          onConfirm={closeAccount}
        />
      </div>

      <div className="card p-6 space-y-4">
        <form onSubmit={createDeployment} className="grid grid-cols-1 gap-3">
          <input className="input" placeholder="Display name (e.g. Customer Web)" value={displayName} onChange={(e) => setDisplayName(e.target.value)} />
          <select className="input" value={serverType} onChange={(e) => setServerType(e.target.value)}>
            <option value="nginx">Nginx</option>
            <option value="apache">Apache (httpd)</option>
            <option value="tomcat">Tomcat</option>
          </select>
          {serverType !== 'tomcat' && (
            <textarea className="input h-28" placeholder="Custom index.html (optional)" value={indexHtml} onChange={(e) => setIndexHtml(e.target.value)} />
          )}
          <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
            <div className="flex items-center gap-2 text-xs text-gray-500">
              <span>Replicas:</span>
              <input className="input" type="number" min={1} step={1} value={replicas} onChange={(e) => setReplicas(parseInt(e.target.value||'1'))} />
            </div>
          </div>
          <div>
            <button className="btn-primary" disabled={!displayName}>Create Deployment</button>
          </div>
        </form>
        {msg && <p className="text-sm text-gray-600">{msg}</p>}
      </div>

      <AnimatePresence>
        <motion.div layout className="grid grid-cols-1 gap-4 lg:grid-cols-[220px_1fr]">
          {/* Sidebar */}
          <aside className="card hidden h-min p-4 lg:block">
            <div className="mb-4 text-sm font-semibold text-gray-700 dark:text-gray-200">Navigation</div>
            <nav className="flex flex-col gap-2 text-sm">
              <a className="hover:underline" href="/dashboard">Overview</a>
              <a className="hover:underline" href="/dashboard">Deployments</a>
            </nav>
            <div className="mt-6 text-xs text-gray-500">Brand v1 • {new Date().getFullYear()}</div>
          </aside>

          {/* Content */}
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
          {list === null && <SkeletonList />}
          {Array.isArray(list) && list.map((d) => (
            <motion.div layout key={d.id} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }} className="card p-4">
              <div className="flex items-center justify-between">
                <h2 className="font-medium">{d.display_name}</h2>
                <StatusBadge status={deleteTimers[d.id] ? 'DELETING' : ((stats[d.id]?.status) || d.status)} />
              </div>
              <div className="mt-1 text-xs text-gray-500">Server: <code>{d.server_type || 'nginx'}</code></div>
              <div className="mt-2 text-sm">
                <div className="text-gray-600">Namespace: <code>{d.namespace}</code></div>
                <div className="truncate text-sky-700">URL: <a className="underline" href={`https://${d.ingress_host}`} target="_blank" rel="noreferrer">https://{d.ingress_host}</a></div>
                <div className="mt-1 text-xs text-gray-500">
                  {(() => { const s = stats[d.id] || {}; return (
                    <>
                      <span>Ready: <code>{(s.ready_replicas ?? 0)}/{(s.replicas ?? 0)}</code></span>
                      <span className="mx-2">•</span>
                      <span>Endpoints: <code>{s.endpoints ?? 0}</code></span>
                    </>
                  ); })()}
                </div>
              </div>
              <div className="mt-3">
                <Tabs.Root defaultValue="overview">
                  <Tabs.List className="flex gap-1 border-b">
                    <Tabs.Trigger className="px-3 py-2 text-sm data-[state=active]:border-b-2 data-[state=active]:border-sky-500" value="overview">Overview</Tabs.Trigger>
                    <Tabs.Trigger className="px-3 py-2 text-sm data-[state=active]:border-b-2 data-[state=active]:border-sky-500" value="logs">Logs</Tabs.Trigger>
                  </Tabs.List>
                  <Tabs.Content value="overview" className="pt-3">
                    {d.status !== 'READY' && (
                      <ProgressTimeline status={deleteTimers[d.id] ? 'DELETING' : ((stats[d.id]?.status) || d.status)} details={stats[d.id] || {}} />
                    )}
                    {d.last_error && (
                      <div className="mt-2 rounded-md border border-rose-200 bg-rose-50 p-2 text-xs text-rose-700">{String(d.last_error).slice(0, 300)}</div>
                    )}
                  </Tabs.Content>
                  <Tabs.Content value="logs" className="pt-3">
                    <LogStream id={d.id} apiBase={API} />
                  </Tabs.Content>
                </Tabs.Root>
              </div>
              <div className="mt-3 flex gap-2">
                <div className="flex items-center gap-1 text-xs">
                  <span>Scale:</span>
                  <ScaleControl id={d.id} initial={(stats[d.id]?.replicas) || (stats[d.id]?.replicas) || 1} onScaled={()=> fetchStatus(d.id)} />
                </div>
                <ConfirmDialog
                  trigger={<button className="btn-muted">Delete</button>}
                  title="Delete Deployment"
                  description="This will permanently delete this deployment and its Kubernetes namespace. This action cannot be undone."
                  confirmText="Delete"
                  variant="danger"
                  onConfirm={() => remove(d.id)}
                />
              </div>
            </motion.div>
          ))}
          {Array.isArray(list) && list.length === 0 && (
            <div className="card p-6 text-sm text-gray-600">No deployments yet.</div>
          )}
          </div>
        </motion.div>
      </AnimatePresence>
    </div>
  );
}

function StatusBadge({ status }) {
  const base = "inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-medium";
  const map = {
    READY: { cls: "bg-emerald-100 text-emerald-700", icon: <Check className="h-3 w-3" /> },
    ERROR: { cls: "bg-rose-100 text-rose-700", icon: <AlertTriangle className="h-3 w-3" /> },
    DELETING: { cls: "bg-rose-100 text-rose-700", icon: <span className="inline-flex items-center gap-1"><AlertTriangle className="h-3 w-3" /><Loader className="h-3 w-3 animate-spin" /></span> },
    CREATING: { cls: "bg-sky-100 text-sky-700", icon: <Loader className="h-3 w-3 animate-spin" /> },
  };
  const cur = map[(status || "").toUpperCase()] || { cls: "bg-gray-100 text-gray-700", icon: null };
  const label = ((status || "").toUpperCase() === 'DELETING') ? 'Deleting…' : status;
  const tip = {
    READY: "Deployment is ready and endpoints are available",
    ERROR: "Provisioning failed — check logs",
    DELETING: "Deleting resources…",
    CREATING: "Provisioning resources",
  }[(status || "").toUpperCase()] || "";
  return (
    <Tooltip.Provider>
      <Tooltip.Root>
        <Tooltip.Trigger asChild>
          <span className={`${base} ${cur.cls}`}>{cur.icon}{label}</span>
        </Tooltip.Trigger>
        <Tooltip.Content sideOffset={6} className="rounded bg-gray-900 px-2 py-1 text-[11px] text-white shadow">
          {tip}
        </Tooltip.Content>
      </Tooltip.Root>
    </Tooltip.Provider>
  );
}

function ScaleControl({ id, initial=1, onScaled }) {
  const [value, setValue] = useState(initial || 1);
  useEffect(() => { setValue(initial || 1); }, [initial]);
  async function apply() {
    try {
      const t = await refreshIfNeeded(API);
      if (!t) return;
      const res = await fetch(`${API}/deployments/${id}/scale`, { method: 'PATCH', headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${t.access}` }, body: JSON.stringify({ replicas: value }) });
      if (!res.ok) throw new Error('scale failed');
      toast.success('Scaled');
      onScaled && onScaled();
    } catch {
      toast.error('Scale failed');
    }
  }
  return (
    <div className="flex items-center gap-1">
      <input className="input h-7 w-14" type="number" min={1} step={1} value={value} onChange={(e)=> setValue(parseInt(e.target.value||'1'))} />
      <button className="btn-muted h-7 px-2" onClick={apply}>Apply</button>
    </div>
  );
}
