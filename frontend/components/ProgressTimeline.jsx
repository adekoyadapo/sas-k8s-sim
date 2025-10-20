"use client";
export default function ProgressTimeline({ status, details }) {
  const steps = [
    { key: 'apply', label: 'Apply submitted' },
    { key: 'deploy', label: `Deployment ${fmt(details.ready_replicas)}/${fmt(details.replicas)} ready` },
    { key: 'endpoints', label: `Service endpoints ${fmt(details.endpoints)}` },
    { key: 'ready', label: 'Ready' },
  ];
  const s = (status || '').toUpperCase();
  const currentIndex = s === 'READY' ? steps.length - 1 : s === 'ERROR' ? 0 : (details.ready_replicas > 0 ? 2 : 1);
  const activeText = s === 'DELETING' ? 'text-rose-700 dark:text-rose-300' : 'text-sky-700 dark:text-sky-300';
  const activeDot = s === 'DELETING' ? 'bg-rose-500' : 'bg-sky-500';
  return (
    <ol className="mt-3 space-y-2">
      {steps.map((step, i) => (
        <li key={step.key} className={`flex items-center gap-2 text-sm ${i <= currentIndex ? activeText : 'text-gray-500'}`}>
          <span className={`h-2 w-2 rounded-full ${i <= currentIndex ? activeDot : 'bg-gray-300'}`}></span>
          {step.label}
        </li>
      ))}
    </ol>
  );
}

function fmt(v){ return (v ?? 0); }
