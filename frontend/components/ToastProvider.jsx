"use client";
import { createContext, useContext, useState, useEffect } from 'react';

const ToastCtx = createContext(null);

export function ToastProvider({ children }) {
  const [toasts, setToasts] = useState([]);
  function pushToast(t) {
    const id = Math.random().toString(36).slice(2,8);
    setToasts((xs) => [...xs, { id, ...t }]);
    setTimeout(() => dismiss(id), t.duration ?? 3000);
  }
  function dismiss(id) { setToasts((xs) => xs.filter((x) => x.id !== id)); }
  return (
    <ToastCtx.Provider value={{ pushToast }}>
      {children}
      <div className="fixed bottom-4 right-4 z-50 flex w-80 flex-col gap-2">
        {toasts.map((t) => (
          <div key={t.id} className="card border-sky-200 bg-white/90 p-3 shadow-lg dark:border-gray-700 dark:bg-gray-900/90">
            <div className="text-sm font-medium">{t.title}</div>
            {t.description && <div className="mt-1 text-xs text-gray-600 dark:text-gray-300">{t.description}</div>}
          </div>
        ))}
      </div>
    </ToastCtx.Provider>
  );
}

export function useToast() {
  const ctx = useContext(ToastCtx);
  if (!ctx) throw new Error('useToast must be used within ToastProvider');
  return ctx;
}

