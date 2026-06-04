"use client";

import { useCallback, useEffect, useState } from "react";

import { AppNav } from "@/components/AppNav";

const NAV_COLLAPSED_KEY = "polaris-nav-collapsed";

export function AppShell({ children }: { children: React.ReactNode }) {
  const [collapsed, setCollapsed] = useState(false);
  const [hydrated, setHydrated] = useState(false);

  useEffect(() => {
    try {
      setCollapsed(window.localStorage.getItem(NAV_COLLAPSED_KEY) === "1");
    } catch {
      /* ignore */
    }
    setHydrated(true);
  }, []);

  const toggleCollapsed = useCallback(() => {
    setCollapsed((prev) => {
      const next = !prev;
      try {
        window.localStorage.setItem(NAV_COLLAPSED_KEY, next ? "1" : "0");
      } catch {
        /* ignore */
      }
      return next;
    });
  }, []);

  return (
    <div className="relative flex min-h-screen bg-[var(--st-main)]">
      <a href="#main-content" className="st-skip-link">
        Skip to main content
      </a>

      <AppNav
        collapsed={collapsed}
        onToggleCollapsed={toggleCollapsed}
        showCollapseControl={hydrated}
      />

      {collapsed && hydrated ? (
        <button
          type="button"
          onClick={toggleCollapsed}
          className="st-nav-expand-btn"
          aria-label="Show sidebar navigation"
          title="Show sidebar"
        >
          <span aria-hidden className="text-base leading-none">
            ☰
          </span>
        </button>
      ) : null}

      <div id="main-content" tabIndex={-1} className="st-main-pane flex-1 overflow-auto outline-none">
        {children}
      </div>
    </div>
  );
}
