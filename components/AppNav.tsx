"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useRef, useState } from "react";

import { AuthNav } from "@/components/AuthNav";
import { ThemeToggle } from "@/components/ThemeToggle";

const ITEMS = [
  { href: "/home",                  label: "Home",         icon: "bi-house-fill" },
  { href: "/dashboard",             label: "Analytics",    icon: "bi-bar-chart-fill" },
  { href: "/workflow",              label: "Workflow",     icon: "bi-diagram-3-fill" },
  { href: "/agents/literature",     label: "Literature",   icon: "bi-journals" },
  { href: "/agents/hypothesis",     label: "Hypothesis",   icon: "bi-lightbulb-fill" },
  { href: "/agents/experiment",     label: "Experiment",   icon: "bi-flask-fill" },
  { href: "/agents/curve-fitting",  label: "Curve Fitting", icon: "bi-graph-up-arrow" },
  { href: "/agents/ml-models",      label: "ML Models",    icon: "bi-cpu-fill" },
  { href: "/agents/analysis",       label: "Analysis",     icon: "bi-clipboard-data-fill" },
  { href: "/tools/watcher",         label: "Watcher",      icon: "bi-eye-fill" },
  { href: "/tools/mcp",             label: "MCP",          icon: "bi-link-45deg" },
  { href: "/settings",              label: "Settings",     icon: "bi-gear-fill" },
  { href: "/history",               label: "History",      icon: "bi-clock-history" },
] as const;

export function AppNav() {
  const pathname = usePathname();
  const [showAccount, setShowAccount] = useState(false);
  const avatarRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!showAccount) return;
    const handler = (e: MouseEvent) => {
      if (avatarRef.current && !avatarRef.current.contains(e.target as Node)) {
        setShowAccount(false);
      }
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [showAccount]);

  return (
    <nav
      aria-label="Main navigation"
      className="st-app-nav w-[52px] shrink-0 flex flex-col items-center border-r border-[var(--st-border)] bg-[var(--st-sidebar)] py-3 gap-1"
    >
      {/* Logo */}
      <Link
        href="/home"
        aria-label="POLARIS home"
        title="POLARIS"
        className="mb-3 flex h-7 w-7 items-center justify-center rounded-[var(--st-radius-sm)] bg-[var(--st-primary)] text-xs font-bold text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--st-primary)]/50"
      >
        P
      </Link>

      {/* Nav items */}
      <ul className="flex flex-col items-center gap-1 flex-1">
        {ITEMS.map((item) => {
          const active = pathname === item.href || pathname.startsWith(`${item.href}/`);
          return (
            <li key={item.href}>
              <Link
                href={item.href}
                aria-label={item.label}
                aria-current={active ? "page" : undefined}
                title={item.label}
                className={`st-nav-item flex h-9 w-9 items-center justify-center rounded-[var(--st-radius-sm)] transition-colors ${
                  active
                    ? "bg-[var(--st-nav-active-bg)] text-[var(--st-nav-active-text)]"
                    : "text-[var(--st-muted)] hover:bg-[var(--st-hover)] hover:text-[var(--st-text)]"
                }`}
              >
                <i className={`bi ${item.icon} text-base`} aria-hidden="true" />
              </Link>
            </li>
          );
        })}
      </ul>

      {/* Account button at bottom */}
      <div ref={avatarRef} className="relative mt-auto">
        <button
          type="button"
          aria-label="Account"
          aria-expanded={showAccount}
          title="Account"
          onClick={() => setShowAccount((v) => !v)}
          className="flex h-7 w-7 items-center justify-center rounded-full bg-[var(--st-surface-raised)] text-[var(--st-muted)] hover:text-[var(--st-text)] transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--st-primary)]/50"
        >
          <i className="bi bi-person-fill text-sm" aria-hidden="true" />
        </button>
        {showAccount && (
          <div className="absolute bottom-10 left-full ml-2 z-50 w-56 rounded-[var(--st-radius)] border border-[var(--st-border)] bg-[var(--st-surface)] p-2 shadow-[var(--st-shadow-lg)]">
            <div className="mb-2 px-2">
              <ThemeToggle compact />
            </div>
            <AuthNav />
          </div>
        )}
      </div>
    </nav>
  );
}
