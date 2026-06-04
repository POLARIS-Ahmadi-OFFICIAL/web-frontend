"use client";

import { useTheme } from "next-themes";
import { useSyncExternalStore } from "react";

export function ThemeToggle({ compact }: { compact?: boolean }) {
  const { theme, setTheme, resolvedTheme } = useTheme();
  const mounted = useSyncExternalStore(
    () => () => {},
    () => true,
    () => false,
  );

  if (!mounted) {
    return <div className="h-9 w-24 rounded-md bg-[var(--st-border)] opacity-50" />;
  }

  const isDark = resolvedTheme === "dark";

  return (
    <div
      className={`flex items-center gap-1 rounded-md border border-[var(--st-border)] bg-[var(--st-surface)] p-0.5 ${compact ? "text-xs" : "text-sm"}`}
      role="group"
      aria-label="Theme"
    >
      {(["light", "dark", "system"] as const).map((t) => (
        <button
          key={t}
          type="button"
          onClick={() => setTheme(t)}
          className={`rounded px-2 py-1 capitalize transition ${
            theme === t
              ? "bg-[var(--st-primary)] text-white"
              : "text-[var(--st-muted)] hover:text-[var(--st-text)]"
          }`}
        >
          {t}
        </button>
      ))}
      <span className="sr-only">{isDark ? "Dark mode" : "Light mode"}</span>
    </div>
  );
}
