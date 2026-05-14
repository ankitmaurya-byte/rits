"use client";

import { useTheme } from "next-themes";
import { useEffect, useState } from "react";
import { Palette } from "lucide-react";

export function ThemeToggle() {
  const [mounted, setMounted] = useState(false);
  const { theme, setTheme } = useTheme();

  // useEffect only runs on the client, so now we can safely show the UI
  useEffect(() => {
    setMounted(true);
  }, []);

  if (!mounted) {
    return <div className="w-8 h-8 rounded-md bg-[var(--surface-elevated)] animate-pulse" />;
  }

  return (
    <div className="relative group flex items-center">
      <div className="absolute inset-y-0 left-0 pl-2 flex items-center pointer-events-none">
        <Palette size={14} style={{ color: "var(--mute)" }} />
      </div>
      <select
        value={theme}
        onChange={(e) => setTheme(e.target.value)}
        className="appearance-none bg-[var(--surface-card)] border border-[var(--hairline-strong)] text-[var(--body)] text-xs rounded-md pl-8 pr-8 py-1.5 focus:outline-none focus:border-[var(--ink)] cursor-pointer transition-colors"
        style={{ height: "32px" }}
      >
        <option value="light">Light</option>
        <option value="dark">Dark</option>
        <option value="solarized-light">Solarized Light</option>
        <option value="solarized-dark">Solarized Dark</option>
      </select>
      <div className="absolute inset-y-0 right-0 flex items-center px-2 pointer-events-none">
        <svg className="w-4 h-4 fill-[var(--mute)]" viewBox="0 0 20 20">
          <path fillRule="evenodd" d="M5.293 7.293a1 1 0 011.414 0L10 10.586l3.293-3.293a1 1 0 111.414 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414z" clipRule="evenodd" />
        </svg>
      </div>
    </div>
  );
}
