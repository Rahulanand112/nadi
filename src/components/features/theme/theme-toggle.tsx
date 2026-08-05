"use client";

import { useEffect, useState } from "react";

type Theme = "light" | "dark";

export function ThemeToggle() {
  const [theme, setTheme] = useState<Theme>("light");
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
    setTheme(document.documentElement.classList.contains("dark") ? "dark" : "light");
  }, []);

  function toggle() {
    const next: Theme = theme === "dark" ? "light" : "dark";
    setTheme(next);
    document.documentElement.classList.toggle("dark", next === "dark");
    try {
      localStorage.setItem("nadi-theme", next);
    } catch {
      // Private browsing can block storage; the toggle still works for this
      // session, it just won't be remembered.
    }
  }

  return (
    <button
      onClick={toggle}
      aria-label={`Switch to ${theme === "dark" ? "light" : "dark"} mode`}
      className="grid size-8 place-items-center rounded-lg text-ink-600 transition hover:bg-paper-100 dark:text-ink-400 dark:hover:bg-ink-900"
    >
      {/* Rendered only after mount: before hydration we don't know the theme,
          and guessing produces a visibly wrong icon on the first frame. */}
      {mounted ? (
        <svg viewBox="0 0 20 20" className="size-4" aria-hidden="true" fill="currentColor">
          {theme === "dark" ? (
            <path d="M10 2a1 1 0 011 1v1a1 1 0 11-2 0V3a1 1 0 011-1zm5.66 2.34a1 1 0 010 1.42l-.7.7a1 1 0 11-1.42-1.42l.7-.7a1 1 0 011.42 0zM18 10a1 1 0 01-1 1h-1a1 1 0 110-2h1a1 1 0 011 1zm-2.34 5.66a1 1 0 01-1.42 0l-.7-.7a1 1 0 111.42-1.42l.7.7a1 1 0 010 1.42zM10 16a1 1 0 011 1v1a1 1 0 11-2 0v-1a1 1 0 011-1zm-5.66-.34a1 1 0 010-1.42l.7-.7a1 1 0 111.42 1.42l-.7.7a1 1 0 01-1.42 0zM4 10a1 1 0 01-1 1H2a1 1 0 110-2h1a1 1 0 011 1zm1.34-5.66a1 1 0 011.42 0l.7.7A1 1 0 116.04 6.46l-.7-.7a1 1 0 010-1.42zM10 6.5a3.5 3.5 0 100 7 3.5 3.5 0 000-7z" />
          ) : (
            <path d="M8.28 2.28a7.5 7.5 0 009.44 9.44A7.5 7.5 0 118.28 2.28z" />
          )}
        </svg>
      ) : (
        <span className="size-4" />
      )}
    </button>
  );
}
