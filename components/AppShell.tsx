"use client";

import { useCallback, useSyncExternalStore } from "react";

import { AppNav } from "@/components/AppNav";

const NAV_COLLAPSED_KEY = "polaris-nav-collapsed";
const navListeners = new Set<() => void>();

function readNavCollapsed(): boolean {
  try {
    return window.localStorage.getItem(NAV_COLLAPSED_KEY) === "1";
  } catch {
    return false;
  }
}

function subscribeNavCollapsed(onStoreChange: () => void) {
  navListeners.add(onStoreChange);
  const onStorage = (e: StorageEvent) => {
    if (e.key === NAV_COLLAPSED_KEY) onStoreChange();
  };
  window.addEventListener("storage", onStorage);
  return () => {
    navListeners.delete(onStoreChange);
    window.removeEventListener("storage", onStorage);
  };
}

function setNavCollapsed(next: boolean) {
  try {
    window.localStorage.setItem(NAV_COLLAPSED_KEY, next ? "1" : "0");
  } catch {
    /* ignore */
  }
  navListeners.forEach((listener) => listener());
}

export function AppShell({ children }: { children: React.ReactNode }) {
  const hydrated = useSyncExternalStore(
    () => () => {},
    () => true,
    () => false,
  );
  const collapsed = useSyncExternalStore(subscribeNavCollapsed, readNavCollapsed, () => false);

  const toggleCollapsed = useCallback(() => {
    setNavCollapsed(!readNavCollapsed());
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
