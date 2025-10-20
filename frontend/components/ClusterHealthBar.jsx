"use client";
import { useEffect, useState } from "react";

export default function ClusterHealthBar({ apiBase }) {
  const [bad, setBad] = useState(false);
  const [msg, setMsg] = useState("");
  useEffect(() => {
    let alive = true;
    async function tick() {
      try {
        const r = await fetch(`${apiBase}/health/cluster`);
        const j = await r.json();
        const ok = j.k8s && j.ingress;
        if (!alive) return;
        setBad(!ok);
        setMsg(ok ? "" : "Cluster or ingress not ready");
      } catch {
        if (!alive) return;
        setBad(true); setMsg("Cannot reach API/cluster");
      }
    }
    tick();
    const id = setInterval(tick, 10000);
    return () => { alive = false; clearInterval(id); };
  }, [apiBase]);
  if (!bad) return null;
  return (
    <div className="sticky top-14 z-30 w-full bg-rose-600 px-3 py-1 text-center text-xs text-white">
      {msg}
    </div>
  );
}

