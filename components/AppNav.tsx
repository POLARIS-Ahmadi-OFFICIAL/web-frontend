"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

import { AuthNav } from "@/components/AuthNav";
import { ThemeToggle } from "@/components/ThemeToggle";

const SECTIONS = [
  {
    title: "Overview",
    items: [
      { href: "/home", label: "Home", icon: "⌂" },
      { href: "/dashboard", label: "Analytics", icon: "◫" },
      { href: "/workflow", label: "Workflow", icon: "◎" },
    ],
  },
  {
    title: "Research agents",
    items: [
      { href: "/agents/hypothesis", label: "Hypothesis", icon: "◇" },
      { href: "/agents/experiment", label: "Experiment", icon: "⬡" },
      { href: "/agents/curve-fitting", label: "Curve Fitting", icon: "⌁" },
      { href: "/agents/ml-models", label: "ML Models", icon: "◈" },
      { href: "/agents/analysis", label: "Analysis", icon: "◉" },
    ],
  },
  {
    title: "Lab tools",
    items: [
      { href: "/tools/watcher", label: "Watcher", icon: "👁" },
      { href: "/tools/mcp", label: "MCP", icon: "⛓" },
      { href: "/settings", label: "Settings", icon: "⚙" },
      { href: "/history", label: "History", icon: "☰" },
    ],
  },
];

export function AppNav({
  collapsed = false,
  onToggleCollapsed,
  showCollapseControl = true,
}: {
  collapsed?: boolean;
  onToggleCollapsed?: () => void;
  showCollapseControl?: boolean;
}) {
  const pathname = usePathname();

  return (
    <nav
      aria-label="Main navigation"
      aria-hidden={collapsed ? true : undefined}
      inert={collapsed ? true : undefined}
      className={`st-app-nav flex min-h-screen shrink-0 flex-col border-r border-[var(--st-border)] bg-[var(--st-sidebar)] ${
        collapsed ? "st-app-nav--collapsed" : ""
      }`}
    >
      <div className="flex flex-1 flex-col overflow-y-auto px-3 py-5">
        <div className="mb-6 flex items-start justify-between gap-2 px-2">
          <Link href="/home" className="min-w-0 flex-1 rounded-[var(--st-radius-sm)] focus-visible:outline-none">
            <p className="truncate text-lg font-semibold tracking-tight text-[var(--st-text)]">POLARIS</p>
            <p className="truncate text-xs text-[var(--st-muted)]">Materials research AI</p>
          </Link>
          {showCollapseControl && onToggleCollapsed ? (
            <button
              type="button"
              onClick={onToggleCollapsed}
              className="st-nav-collapse-btn shrink-0"
              aria-label="Hide sidebar for full-width content"
              title="Hide sidebar"
            >
              <span aria-hidden className="text-sm leading-none">
                ‹
              </span>
            </button>
          ) : null}
        </div>

        <div className="mb-6 px-2">
          <p className="mb-2 text-[11px] font-semibold uppercase tracking-wider text-[var(--st-muted)]">
            Appearance
          </p>
          <ThemeToggle compact />
        </div>

        {SECTIONS.map((section) => (
          <div key={section.title} className="mb-5">
            <p className="mb-1 px-2 py-1 text-[11px] font-semibold uppercase tracking-wider text-[var(--st-muted)]">
              {section.title}
            </p>
            <ul className="space-y-0.5">
              {section.items.map((item) => {
                const active =
                  pathname === item.href || pathname.startsWith(`${item.href}/`);
                return (
                  <li key={item.href}>
                    <Link
                      href={item.href}
                      aria-current={active ? "page" : undefined}
                      tabIndex={collapsed ? -1 : undefined}
                      className={`flex min-h-[40px] items-center gap-3 rounded-[var(--st-radius-sm)] px-3 py-2 text-sm transition ${
                        active
                          ? "bg-[var(--st-nav-active-bg)] font-medium text-[var(--st-nav-active-text)] shadow-[var(--st-shadow-sm)]"
                          : "text-[var(--st-text)] hover:bg-[var(--st-hover)]"
                      }`}
                    >
                      <span
                        className="flex h-6 w-6 shrink-0 items-center justify-center rounded-md bg-[var(--st-hover)] text-xs opacity-80"
                        aria-hidden
                      >
                        {item.icon}
                      </span>
                      {item.label}
                    </Link>
                  </li>
                );
              })}
            </ul>
          </div>
        ))}
      </div>
      <div className="border-t border-[var(--st-border)] px-2 py-3">
        <AuthNav />
      </div>
    </nav>
  );
}
