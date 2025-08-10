"use client";

import React, { useEffect, useState } from "react";
import { Sun, Moon } from "lucide-react";
import { useTheme } from "@/contexts/ThemeContext";

export function ThemeToggle() {
  const { resolvedTheme, toggleTheme } = useTheme();
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);
  const isDark = resolvedTheme === "dark";
  return (
    <button
      aria-label="Toggle dark mode"
      title="Toggle dark mode"
      onClick={toggleTheme}
      className="fixed bottom-4 right-4 z-50 inline-flex items-center justify-center rounded-full border border-neutral-300/40 bg-white/80 p-2 text-neutral-800 shadow backdrop-blur hover:bg-white md:top-4 md:bottom-auto md:right-4 dark:border-neutral-700 dark:bg-neutral-800/80 dark:text-neutral-100"
    >
      {mounted ? (isDark ? <Sun size={18} /> : <Moon size={18} />) : (
        <span className="inline-block w-[18px] h-[18px]" />
      )}
    </button>
  );
}
