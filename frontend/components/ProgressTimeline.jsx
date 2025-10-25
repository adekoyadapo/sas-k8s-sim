"use client";
import { motion } from "framer-motion";
import { Check, Loader } from "lucide-react";

export default function ProgressTimeline({ status, details }) {
  const steps = [
    { key: 'apply', label: 'Apply submitted' },
    { key: 'deploy', label: `Deployment ${fmt(details.ready_replicas)}/${fmt(details.replicas)} ready` },
    { key: 'endpoints', label: `Service endpoints ${fmt(details.endpoints)}` },
    { key: 'ready', label: 'Ready' },
  ];
  const s = (status || '').toUpperCase();
  const currentIndex = s === 'READY' ? steps.length - 1 : s === 'ERROR' ? 0 : (details.ready_replicas > 0 ? 2 : 1);
  const isDeleting = s === 'DELETING';
  const activeText = isDeleting ? 'text-rose-700 dark:text-rose-300' : 'text-sky-700 dark:text-sky-300';
  const activeBg = isDeleting ? 'bg-rose-500' : 'bg-sky-500';
  const activeBorder = isDeleting ? 'border-rose-500' : 'border-sky-500';

  // Calculate progress percentage
  const totalSteps = steps.length;
  const progress = ((currentIndex + 1) / totalSteps) * 100;

  return (
    <div className="mt-3">
      {/* Progress bar */}
      <div className="mb-4 h-2 bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden">
        <motion.div
          className={`h-full ${activeBg}`}
          initial={{ width: 0 }}
          animate={{ width: `${progress}%` }}
          transition={{ duration: 0.5, ease: "easeOut" }}
        />
      </div>

      {/* Steps */}
      <ol className="space-y-3">
        {steps.map((step, i) => {
          const isCompleted = i < currentIndex;
          const isCurrent = i === currentIndex;
          const isPending = i > currentIndex;

          return (
            <motion.li
              key={step.key}
              initial={{ opacity: 0, x: -10 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: i * 0.1 }}
              className={`flex items-center gap-3 text-sm ${
                isCompleted || isCurrent ? activeText : 'text-gray-400 dark:text-gray-600'
              }`}
            >
              <div className="flex-shrink-0">
                {isCompleted ? (
                  <motion.div
                    initial={{ scale: 0 }}
                    animate={{ scale: 1 }}
                    transition={{ type: "spring", stiffness: 200, damping: 15 }}
                    className={`w-6 h-6 rounded-full ${activeBg} flex items-center justify-center`}
                  >
                    <Check className="w-3.5 h-3.5 text-white" />
                  </motion.div>
                ) : isCurrent ? (
                  <motion.div
                    animate={{ rotate: 360 }}
                    transition={{ duration: 2, repeat: Infinity, ease: "linear" }}
                    className={`w-6 h-6 rounded-full border-2 ${activeBorder} border-t-transparent`}
                  />
                ) : (
                  <div className="w-6 h-6 rounded-full border-2 border-gray-300 dark:border-gray-600" />
                )}
              </div>
              <span className={`${isCompleted || isCurrent ? 'font-medium' : ''}`}>
                {step.label}
              </span>
            </motion.li>
          );
        })}
      </ol>
    </div>
  );
}

function fmt(v){ return (v ?? 0); }
