"use client";
import { useEffect, useRef, useState } from "react";
import { refreshIfNeeded } from "../lib/session";

export default function LogStream({ id, apiBase }) {
  const [lines, setLines] = useState([]);
  const [paused, setPaused] = useState(false);
  const esRef = useRef(null);
  const endRef = useRef(null);

  useEffect(() => {
    if (paused) return;
    let es;
    async function connect() {
      const t = await refreshIfNeeded(apiBase);
      if (!t) return;
      const url = `${apiBase}/deployments/${id}/events?token=${encodeURIComponent(t.access)}`;
      es = new EventSource(url);
      esRef.current = es;
      es.onmessage = (ev) => {
        try {
          const data = JSON.parse(ev.data);
          const logs = flattenLogs(data.logs || {});
          if (logs.length) setLines((xs) => [...xs, `# ${new Date().toLocaleTimeString()}` , ...logs]);
        } catch {}
      };
      es.addEventListener('end', () => { es.close(); });
      es.onerror = () => { es.close(); };
    }
    connect();
    return () => { try { es?.close(); } catch {} };
  }, [id, apiBase, paused]);

  useEffect(() => { endRef.current?.scrollIntoView({ behavior: 'smooth' }); }, [lines]);

  function clear() { setLines([]); }
  function toggle() { setPaused((p) => !p); }
  function download() {
    const blob = new Blob([lines.join("\n")], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url; a.download = `logs-${id}.txt`; a.click();
    URL.revokeObjectURL(url);
  }

  return (
    <div className="mt-3 rounded-md border border-border bg-white p-2 dark:bg-gray-950">
      <div className="mb-2 flex items-center gap-2">
        <button className="btn-muted h-8 px-3" onClick={toggle}>{paused ? 'Resume' : 'Pause'}</button>
        <button className="btn-muted h-8 px-3" onClick={clear}>Clear</button>
        <button className="btn-muted h-8 px-3" onClick={download}>Download</button>
        <span className="text-xs text-gray-500">Live pod logs</span>
      </div>
      <pre className="max-h-80 overflow-auto rounded bg-gray-900 p-3 text-xs leading-5 text-gray-100"><code>
        {lines.join("\n")}
        <div ref={endRef} />
      </code></pre>
    </div>
  );
}

function flattenLogs(logs) {
  const out = [];
  for (const [pod, containers] of Object.entries(logs)) {
    for (const [container, text] of Object.entries(containers || {})) {
      const lines = (text || '').split('\n').filter(Boolean).slice(-40);
      for (const ln of lines) out.push(`${pod}:${container} | ${ln}`);
    }
  }
  return out;
}
