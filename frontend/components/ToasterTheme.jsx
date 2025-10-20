"use client";
import { useEffect, useState } from "react";
import { Toaster } from "sonner";

export default function ToasterTheme() {
  const [dark, setDark] = useState(false);
  useEffect(() => {
    const compute = () => setDark(document.documentElement.classList.contains('dark'));
    compute();
    const onChange = (e) => compute();
    window.addEventListener('theme-changed', onChange);
    return () => window.removeEventListener('theme-changed', onChange);
  }, []);
  return <Toaster richColors position="bottom-right" theme={dark ? 'dark' : 'light'} />;
}

