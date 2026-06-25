# POLARIS UI Redesign Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Redesign the POLARIS web frontend with a Deep Space color palette, 52px icon-only nav rail, and split-panel agent interface (chat left, tabbed output right) using Bootstrap Icons.

**Architecture:** Update `globals.css` tokens to the new palette first so every page inherits the new look immediately. Rewrite `AppNav`/`AppShell` to the icon rail. Create a new `AgentShell` split-panel component, then migrate each agent page to use it one at a time.

**Tech Stack:** Next.js 15 App Router, React 19, Tailwind CSS 4, Bootstrap Icons 1.11.3 (CDN), `next-themes`, CSS custom properties.

## Global Constraints

- Token names in `globals.css` must stay identical — only values change. All existing consumers (`Card`, `Alert`, `ChatMessage`, etc.) must continue to work with zero changes.
- Bootstrap Icons loaded via CDN `<link>` in `app/layout.tsx` — do NOT install an npm package.
- No new npm dependencies may be added.
- The `AgentShell` component lives at `components/ui/AgentShell.tsx` — it is a UI primitive, not a page component.
- All icon-only interactive elements must have `aria-label` and `title` attributes (accessibility).
- Minimum touch target: 44×44px enforced via `@media (pointer: coarse)` in CSS.
- `ThemeToggle` and `AuthNav` remain as-is — only their placement changes.
- Do not modify any files under `app/api/`, `lib/`, or `components/pages/Home*`, `Dashboard*`, `Settings*`, `History*`, `Workflow*`, `Login*`.
- Run `npm run build` after every task to confirm no TypeScript or build errors.

---

## File Map

| File | Task | Change |
|---|---|---|
| `app/layout.tsx` | 1 | Add Bootstrap Icons CDN `<link>` |
| `app/globals.css` | 1 | Replace all `--st-*` token values |
| `components/AppNav.tsx` | 2 | Full rewrite — 52px icon rail |
| `components/AppShell.tsx` | 2 | Remove collapse logic, simplify |
| `components/ui/Button.tsx` | 2 | Add `icon` and `ghost` variants |
| `components/ui/AgentShell.tsx` | 3 | Create split-panel agent shell |
| `components/pages/HypothesisPageClient.tsx` | 4 | Adopt `AgentShell`, add choice pills |
| `components/pages/ExperimentPageClient.tsx` | 5 | Adopt `AgentShell` |
| `components/pages/CurveFittingPageClient.tsx` | 5 | Adopt `AgentShell` |
| `components/pages/MlModelsPageClient.tsx` | 6 | Adopt `AgentShell` |
| `components/pages/AnalysisPageClient.tsx` | 6 | Adopt `AgentShell` |

---

## Task 1: Design tokens and Bootstrap Icons

**Files:**
- Modify: `app/layout.tsx`
- Modify: `app/globals.css`

**Interfaces:**
- Produces: updated CSS custom properties consumed by every component; Bootstrap icon classes available globally as `<i className="bi bi-*">`.

- [ ] **Step 1: Add Bootstrap Icons CDN link to `app/layout.tsx`**

Open `app/layout.tsx`. Add the `<link>` tag inside `<html>` before `<body>`. The file currently has no `<head>` element — add one:

```tsx
import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import { ThemeProvider } from "@/components/ThemeProvider";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "POLARIS — Materials Research AI",
  description:
    "Hypothesis-driven workflows, spectral curve fitting, and ML optimization for materials discovery.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="en"
      suppressHydrationWarning
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
    >
      <head>
        <link
          rel="stylesheet"
          href="https://cdn.jsdelivr.net/npm/bootstrap-icons@1.11.3/font/bootstrap-icons.min.css"
        />
      </head>
      <body className="min-h-full flex flex-col bg-[var(--st-main)] text-[var(--st-text)]">
        <ThemeProvider>{children}</ThemeProvider>
      </body>
    </html>
  );
}
```

- [ ] **Step 2: Update `:root` (light mode) tokens in `globals.css`**

Replace the entire `:root { ... }` block (currently ends around line 47) with:

```css
:root {
  --st-bg: #f8fafc;
  --st-main: #f1f5f9;
  --st-sidebar: #ffffff;
  --st-surface: #ffffff;
  --st-surface-elevated: #ffffff;
  --st-surface-raised: #ffffff;
  --st-border: rgba(0, 0, 0, 0.08);
  --st-border-strong: rgba(0, 0, 0, 0.14);
  --st-text: #0f172a;
  --st-text-secondary: #334155;
  --st-muted: #64748b;
  --st-primary: #4f46e5;
  --st-primary-hover: #4338ca;
  --st-accent: #6366f1;
  --st-radius: 10px;
  --st-radius-sm: 7px;
  --st-radius-lg: 14px;
  --st-shadow-sm: 0 1px 3px rgba(0, 0, 0, 0.08);
  --st-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
  --st-shadow-lg: 0 8px 30px rgba(0, 0, 0, 0.12);
  --st-focus-ring: 0 0 0 3px rgba(79, 70, 229, 0.35);
  --st-hover: rgba(0, 0, 0, 0.04);
  --st-nav-active-bg: rgba(79, 70, 229, 0.08);
  --st-nav-active-text: #4f46e5;
  --st-info-bg: rgba(99, 102, 241, 0.08);
  --st-info-border: #6366f1;
  --st-info-text: #4338ca;
  --st-success-bg: rgba(52, 211, 153, 0.08);
  --st-success-border: #10b981;
  --st-success-text: #065f46;
  --st-warning-bg: rgba(251, 191, 36, 0.08);
  --st-warning-border: #f59e0b;
  --st-warning-text: #92400e;
  --st-error-bg: rgba(248, 113, 113, 0.08);
  --st-error-border: #ef4444;
  --st-error-text: #991b1b;
  --st-chat-user: #eef2ff;
  --st-chat-user-border: #6366f1;
  --st-chat-assistant: #f8fafc;
  --st-chat-assistant-border: #e2e8f0;
  --st-code-bg: #1e293b;
  --st-code-text: #7ee787;
  --st-hero-gradient: linear-gradient(135deg, #f8fafc 0%, #eef2ff 50%, #f8fafc 100%);
}
```

- [ ] **Step 3: Update `html.dark` (dark mode) tokens in `globals.css`**

Replace the entire `html.dark { ... }` block with:

```css
html.dark {
  --st-bg: #0f172a;
  --st-main: #0f172a;
  --st-sidebar: #1e293b;
  --st-surface: #1e293b;
  --st-surface-elevated: #253347;
  --st-surface-raised: #253347;
  --st-border: rgba(255, 255, 255, 0.07);
  --st-border-strong: rgba(255, 255, 255, 0.14);
  --st-text: #f1f5f9;
  --st-text-secondary: #cbd5e1;
  --st-muted: #64748b;
  --st-primary: #6366f1;
  --st-primary-hover: #4f46e5;
  --st-accent: #818cf8;
  --st-shadow-sm: 0 1px 3px rgba(0, 0, 0, 0.4);
  --st-shadow: 0 2px 12px rgba(0, 0, 0, 0.5);
  --st-shadow-lg: 0 12px 40px rgba(0, 0, 0, 0.6);
  --st-focus-ring: 0 0 0 3px rgba(99, 102, 241, 0.45);
  --st-hover: rgba(255, 255, 255, 0.05);
  --st-nav-active-bg: rgba(99, 102, 241, 0.18);
  --st-nav-active-text: #818cf8;
  --st-info-bg: rgba(99, 102, 241, 0.12);
  --st-info-border: #6366f1;
  --st-info-text: #818cf8;
  --st-success-bg: rgba(52, 211, 153, 0.12);
  --st-success-border: #34d399;
  --st-success-text: #34d399;
  --st-warning-bg: rgba(251, 191, 36, 0.12);
  --st-warning-border: #fbbf24;
  --st-warning-text: #fbbf24;
  --st-error-bg: rgba(248, 113, 113, 0.12);
  --st-error-border: #f87171;
  --st-error-text: #f87171;
  --st-chat-user: #1e1b4b;
  --st-chat-user-border: #6366f1;
  --st-chat-assistant: #1e293b;
  --st-chat-assistant-border: rgba(255, 255, 255, 0.07);
  --st-code-bg: #0d1117;
  --st-code-text: #7ee787;
  --st-hero-gradient: linear-gradient(135deg, #0f172a 0%, #1e1b4b 50%, #0f172a 100%);
  color-scheme: dark;
}
```

- [ ] **Step 4: Update `.st-app-nav` in `globals.css`**

Find the `.st-app-nav` CSS block and replace it (keep all other CSS classes unchanged — `.st-card`, `.st-skip-link`, etc. are fine as-is):

```css
.st-app-nav {
  width: 52px;
  flex-shrink: 0;
}

/* Remove or replace the old collapse classes — they are no longer used */
.st-app-nav--collapsed,
.st-nav-collapse-btn,
.st-nav-expand-btn {
  display: none;
}

@media (pointer: coarse) {
  .st-nav-item {
    min-width: 44px;
    min-height: 44px;
  }
}
```

- [ ] **Step 5: Verify build passes**

```bash
cd /Users/arthompson/Documents/POLARIS/web-frontend
npm run build
```

Expected: build completes with 0 errors. Token changes are pure CSS so no TypeScript errors are expected.

- [ ] **Step 6: Visually verify in browser**

```bash
npm run dev
```

Open http://localhost:3000. The site should look noticeably different — indigo buttons, dark slate backgrounds in dark mode. The sidebar is still 260px at this point (we're fixing that in Task 2).

- [ ] **Step 7: Commit**

```bash
git add app/layout.tsx app/globals.css
git commit -m "feat(ui): Deep Space tokens + Bootstrap Icons CDN"
```

---

## Task 2: Icon rail navigation and shell simplification

**Files:**
- Modify: `components/AppNav.tsx` (full rewrite)
- Modify: `components/AppShell.tsx` (simplify)
- Modify: `components/ui/Button.tsx` (add `icon` and `ghost` variants)

**Interfaces:**
- Consumes: `ThemeToggle` (from `components/ThemeToggle.tsx`, existing), `AuthNav` (from `components/AuthNav.tsx`, existing)
- Produces:
  - `AppNav`: `function AppNav(): JSX.Element` — no props
  - `AppShell`: `function AppShell({ children }: { children: React.ReactNode }): JSX.Element` — no other props
  - `Button` new variants: `"icon"` (36×36 square) and `"ghost"` (no border, hover bg only)

- [ ] **Step 1: Rewrite `components/AppNav.tsx`**

Replace the entire file with:

```tsx
"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";

import { AuthNav } from "@/components/AuthNav";
import { ThemeToggle } from "@/components/ThemeToggle";

const ITEMS = [
  { href: "/home",                  label: "Home",         icon: "bi-house-fill" },
  { href: "/dashboard",             label: "Analytics",    icon: "bi-bar-chart-fill" },
  { href: "/workflow",              label: "Workflow",     icon: "bi-diagram-3-fill" },
  { href: "/agents/hypothesis",     label: "Hypothesis",   icon: "bi-lightbulb-fill" },
  { href: "/agents/experiment",     label: "Experiment",   icon: "bi-flask-fill" },
  { href: "/agents/curve-fitting",  label: "Curve Fitting","icon": "bi-graph-up-arrow" },
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

  return (
    <nav
      aria-label="Main navigation"
      className="st-app-nav flex flex-col items-center border-r border-[var(--st-border)] bg-[var(--st-sidebar)] py-3 gap-1"
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
      <div className="relative mt-auto">
        <button
          type="button"
          aria-label="Account"
          title="Account"
          onClick={() => setShowAccount((v) => !v)}
          className="flex h-7 w-7 items-center justify-center rounded-full bg-[var(--st-surface-raised)] text-[var(--st-muted)] hover:text-[var(--st-text)] transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--st-primary)]/50"
        >
          <i className="bi bi-person-fill text-sm" aria-hidden="true" />
        </button>
        {showAccount && (
          <div className="absolute bottom-10 left-10 z-50 w-56 rounded-[var(--st-radius)] border border-[var(--st-border)] bg-[var(--st-surface)] p-2 shadow-[var(--st-shadow-lg)]">
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
```

- [ ] **Step 2: Rewrite `components/AppShell.tsx`**

Replace the entire file with:

```tsx
import { AppNav } from "@/components/AppNav";

export function AppShell({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex min-h-screen bg-[var(--st-main)]">
      <a
        href="#main-content"
        className="st-skip-link"
      >
        Skip to main content
      </a>
      <AppNav />
      <div
        id="main-content"
        tabIndex={-1}
        className="flex-1 overflow-auto outline-none"
      >
        {children}
      </div>
    </div>
  );
}
```

- [ ] **Step 3: Add `icon` and `ghost` variants to `components/ui/Button.tsx`**

In `Button.tsx`, update the `variant` type and the `variants` map:

```tsx
export function Button({
  children,
  variant = "primary",
  fullWidth,
  className = "",
  onClick,
  disabled,
  type = "button",
}: {
  children: React.ReactNode;
  variant?: "primary" | "secondary" | "icon" | "ghost";
  fullWidth?: boolean;
  className?: string;
  onClick?: () => void;
  disabled?: boolean;
  type?: "button" | "submit";
}) {
  const base =
    "rounded-[var(--st-radius-sm)] text-sm font-medium transition disabled:opacity-50 disabled:cursor-not-allowed";
  const variants = {
    primary:
      "px-4 py-2.5 min-h-[44px] bg-[var(--st-primary)] text-white hover:bg-[var(--st-primary-hover)] shadow-[var(--st-shadow-sm)]",
    secondary:
      "px-4 py-2.5 min-h-[44px] border border-[var(--st-border)] bg-[var(--st-surface)] text-[var(--st-text)] hover:bg-[var(--st-hover)]",
    icon:
      "h-9 w-9 flex items-center justify-center bg-transparent hover:bg-[var(--st-hover)] text-[var(--st-muted)] hover:text-[var(--st-text)]",
    ghost:
      "px-3 py-2 bg-transparent text-[var(--st-text)] hover:bg-[var(--st-hover)]",
  };
  return (
    <button
      type={type}
      disabled={disabled}
      onClick={onClick}
      className={`${base} ${variants[variant]} ${fullWidth ? "w-full" : ""} ${className}`.trim()}
    >
      {children}
    </button>
  );
}
```

- [ ] **Step 4: Verify build passes**

```bash
npm run build
```

Expected: 0 errors. The `collapsed` prop is gone from `AppShell` — verify no pages pass it (grep to be sure):

```bash
grep -r "collapsed" components/ app/ --include="*.tsx" --include="*.ts"
```

Expected: no results (or only inside the new `AppNav.tsx` `showAccount` state which is unrelated).

- [ ] **Step 5: Visually verify nav in browser**

```bash
npm run dev
```

Open http://localhost:3000. You should see:
- A narrow 52px icon rail on the left
- Indigo-tinted active icon for the current page
- Hovering an icon shows a native browser tooltip with the label
- Clicking the avatar circle at the bottom opens theme toggle + auth controls

- [ ] **Step 6: Commit**

```bash
git add components/AppNav.tsx components/AppShell.tsx components/ui/Button.tsx
git commit -m "feat(ui): 52px icon rail nav + simplified AppShell + Button icon/ghost variants"
```

---

## Task 3: AgentShell split-panel component

**Files:**
- Create: `components/ui/AgentShell.tsx`

**Interfaces:**
- Consumes: `Button` (from `components/ui/Button.tsx`), `ThemeToggle` (from `components/ThemeToggle.tsx`)
- Produces:
```ts
export function AgentShell(props: AgentShellProps): JSX.Element

type AgentShellProps = {
  title: string
  iconClass: string
  status?: "ready" | "busy" | "error"
  statusLabel?: string
  chatContent: React.ReactNode
  chatInput: React.ReactNode
  documentContent: React.ReactNode
  contextContent: React.ReactNode
  historyContent: React.ReactNode
  onExport?: () => void
  handoffLabel?: string
  onHandoff?: () => void
}
```

- [ ] **Step 1: Create `components/ui/AgentShell.tsx`**

```tsx
"use client";

import { useState } from "react";
import Link from "next/link";

import { Button } from "@/components/ui/Button";
import { ThemeToggle } from "@/components/ThemeToggle";

type Tab = "Document" | "Context" | "History";

type AgentShellProps = {
  title: string;
  iconClass: string;
  status?: "ready" | "busy" | "error";
  statusLabel?: string;
  chatContent: React.ReactNode;
  chatInput: React.ReactNode;
  documentContent: React.ReactNode;
  contextContent: React.ReactNode;
  historyContent: React.ReactNode;
  onExport?: () => void;
  handoffLabel?: string;
  onHandoff?: () => void;
};

const STATUS_STYLES: Record<string, string> = {
  ready: "bg-[var(--st-success-bg)] text-[var(--st-success-text)]",
  busy:  "bg-[var(--st-warning-bg)] text-[var(--st-warning-text)]",
  error: "bg-[var(--st-error-bg)]   text-[var(--st-error-text)]",
};

export function AgentShell({
  title,
  iconClass,
  status,
  statusLabel,
  chatContent,
  chatInput,
  documentContent,
  contextContent,
  historyContent,
  onExport,
  handoffLabel,
  onHandoff,
}: AgentShellProps) {
  const [activeTab, setActiveTab] = useState<Tab>("Document");

  return (
    <div className="flex h-screen flex-col overflow-hidden bg-[var(--st-bg)]">
      {/* ── Top bar ── */}
      <div className="flex h-11 shrink-0 items-center gap-3 border-b border-[var(--st-border)] bg-[var(--st-surface)] px-4">
        <i className={`bi ${iconClass} text-base text-[var(--st-primary)]`} aria-hidden="true" />
        <span className="text-sm font-semibold text-[var(--st-text)]">{title}</span>

        {status && (
          <span
            role="status"
            className={`ml-auto mr-auto rounded-full px-2.5 py-0.5 text-xs font-medium ${STATUS_STYLES[status] ?? ""}`}
          >
            {statusLabel ?? status}
          </span>
        )}

        <div className="ml-auto flex items-center gap-2">
          <ThemeToggle compact />
          <Link href="/settings" aria-label="Settings" title="Settings">
            <Button variant="icon">
              <i className="bi bi-gear text-sm" aria-hidden="true" />
            </Button>
          </Link>
        </div>
      </div>

      {/* ── Body ── */}
      <div className="flex flex-1 overflow-hidden">
        {/* Chat pane */}
        <div className="flex flex-1 flex-col overflow-hidden border-r border-[var(--st-border)]">
          <div className="flex-1 overflow-y-auto p-4">
            {chatContent}
          </div>
          <div className="shrink-0 border-t border-[var(--st-border)] p-3">
            {chatInput}
          </div>
        </div>

        {/* Output pane */}
        <div className="flex w-[42%] min-w-[320px] flex-col overflow-hidden">
          {/* Tabs */}
          <div
            className="flex shrink-0 border-b border-[var(--st-border)]"
            role="tablist"
            aria-label="Output panel"
          >
            {(["Document", "Context", "History"] as Tab[]).map((tab) => (
              <button
                key={tab}
                type="button"
                role="tab"
                aria-selected={activeTab === tab}
                onClick={() => setActiveTab(tab)}
                className={`flex-1 py-2 text-xs font-medium transition-colors ${
                  activeTab === tab
                    ? "border-b-2 border-[var(--st-primary)] text-[var(--st-primary)]"
                    : "text-[var(--st-muted)] hover:text-[var(--st-text)]"
                }`}
              >
                {tab}
              </button>
            ))}
          </div>

          {/* Tab content */}
          <div
            role="tabpanel"
            aria-label={activeTab}
            className="flex-1 overflow-y-auto p-4"
          >
            {activeTab === "Document" && documentContent}
            {activeTab === "Context"  && contextContent}
            {activeTab === "History"  && historyContent}
          </div>

          {/* Action row */}
          <div className="flex shrink-0 items-center justify-end gap-2 border-t border-[var(--st-border)] p-3">
            {onExport && (
              <Button variant="secondary" onClick={onExport}>
                <i className="bi bi-download mr-1.5 text-sm" aria-hidden="true" />
                Export PDF
              </Button>
            )}
            {handoffLabel && onHandoff && (
              <Button variant="primary" onClick={onHandoff}>
                {handoffLabel}
                <i className="bi bi-arrow-right ml-1.5 text-sm" aria-hidden="true" />
              </Button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
```

- [ ] **Step 2: Export `AgentShell` from `components/ui/index.ts`**

Open `components/ui/index.ts` (or `components/ui/index.tsx` — whichever exists). Add this line:

```ts
export { AgentShell } from "./AgentShell";
```

- [ ] **Step 3: Verify build passes**

```bash
npm run build
```

Expected: 0 errors. `AgentShell` is defined and exported but not yet used by any page — that's fine.

- [ ] **Step 4: Commit**

```bash
git add components/ui/AgentShell.tsx components/ui/index.ts
git commit -m "feat(ui): AgentShell split-panel component with tabbed output"
```

---

## Task 4: Hypothesis page — adopt AgentShell + inline choice pills

**Files:**
- Modify: `components/pages/HypothesisPageClient.tsx`

**Interfaces:**
- Consumes:
  - `AgentShell` from `components/ui/AgentShell` — props as defined in Task 3
  - `AgentDocumentPanel` from `components/ui/AgentDocumentPanel` — existing, unchanged
  - `ChatMessage` from `components/ui/ChatMessage` — existing, unchanged
  - `useRouter` from `next/navigation` — for handoff navigation

- [ ] **Step 1: Update imports in `HypothesisPageClient.tsx`**

Replace the existing import block at the top of `components/pages/HypothesisPageClient.tsx`:

```tsx
"use client";

import { useRef, useState } from "react";
import { useRouter } from "next/navigation";

import {
  AgentShell,
  Alert,
  Button,
  ChatMessage,
  FormField,
  TextArea,
} from "@/components/ui";
import { AgentDocumentPanel } from "@/components/ui/AgentDocumentPanel";
import { ApiError } from "@/lib/api-client";
import { bubblesToChatMessages, type HypothesisBubble } from "@/lib/hypothesis-chat";
import { streamHypothesisChat, type HypothesisStreamBody } from "@/lib/hypothesis-stream";
import { useAccessToken } from "@/lib/use-access-token";
```

- [ ] **Step 2: Add router and update return — wrap in AgentShell**

After all the existing state and logic (do NOT change any of the state, handlers, or `runChat` function), replace only the `return (...)` block. The existing `return` starts with `<StreamlitPage` — replace it entirely:

```tsx
  const router = useRouter();

  // ── Chat input slot ──
  const chatInputSlot = (
    <div className="flex flex-col gap-2">
      {error ? <Alert variant="error">{error}</Alert> : null}
      <FormField label="Research question" htmlFor="hypothesis-question">
        <TextArea
          id="hypothesis-question"
          value={question}
          onChange={(e) => setQuestion(e.target.value)}
          placeholder="Describe what you want to investigate…"
          rows={2}
          disabled={loading}
          onKeyDown={(e) => {
            if (e.key === "Enter" && (e.metaKey || e.ctrlKey)) {
              void handleSubmit();
            }
          }}
        />
      </FormField>
      <Button
        onClick={() => void handleSubmit()}
        disabled={loading || !question.trim()}
        fullWidth
      >
        {loading ? loadingLabel : "Submit question"}
      </Button>
    </div>
  );

  // ── Chat content slot ──
  const chatContentSlot = (
    <div className="flex flex-col gap-3">
      {messages.map((msg, i) => (
        <ChatMessage key={i} role={msg.role} title={msg.title} markdown={msg.markdown} text={msg.text} />
      ))}
      {/* Inline choice pills */}
      {options.length > 0 && (
        <div className="flex flex-wrap gap-2 pt-1">
          {options.map((opt) => (
            <button
              key={opt}
              type="button"
              onClick={() =>
                void runChat(
                  { action: "submit_followup", followup: opt, stage },
                  opt,
                )
              }
              disabled={loading}
              className="rounded-full border border-[var(--st-border)] bg-[var(--st-surface)] px-3 py-1.5 text-xs text-[var(--st-text)] transition hover:border-[var(--st-primary)] hover:text-[var(--st-primary)] disabled:opacity-50"
            >
              {opt}
            </button>
          ))}
        </div>
      )}
    </div>
  );

  // ── Document tab ──
  const documentSlot = document ? (
    <AgentDocumentPanel
      title="Hypothesis"
      markdown={document.markdown}
      documentId={document.documentId}
      pdfUrl={document.pdfUrl}
    />
  ) : (
    <p className="text-sm text-[var(--st-muted)]">
      Your hypothesis will appear here as the agent works…
    </p>
  );

  // ── Context tab ──
  const contextSlot = (
    <div className="flex flex-col gap-3 text-sm">
      <div>
        <span className="text-xs font-semibold uppercase tracking-wider text-[var(--st-muted)]">Stage</span>
        <p className="mt-1 text-[var(--st-text)]">{stage}</p>
      </div>
      {question && (
        <div>
          <span className="text-xs font-semibold uppercase tracking-wider text-[var(--st-muted)]">Current question</span>
          <p className="mt-1 text-[var(--st-text)]">{question}</p>
        </div>
      )}
      {options.length > 0 && (
        <div>
          <span className="text-xs font-semibold uppercase tracking-wider text-[var(--st-muted)]">Options</span>
          <ul className="mt-1 list-disc pl-4">
            {options.map((o) => <li key={o} className="text-[var(--st-text)]">{o}</li>)}
          </ul>
        </div>
      )}
    </div>
  );

  // ── History tab ──
  const historySlot = (
    <p className="text-sm text-[var(--st-muted)]">No history yet.</p>
  );

  return (
    <AgentShell
      title="Hypothesis Agent"
      iconClass="bi-lightbulb-fill"
      status={loading ? "busy" : "ready"}
      statusLabel={loading ? loadingLabel : "Ready"}
      chatContent={chatContentSlot}
      chatInput={chatInputSlot}
      documentContent={documentSlot}
      contextContent={contextSlot}
      historyContent={historySlot}
      onExport={document?.pdfUrl ? () => window.open(document.pdfUrl!, "_blank") : undefined}
      handoffLabel="→ Experiment"
      onHandoff={() => router.push("/agents/experiment")}
    />
  );
```

> Note: `handleSubmit` is the function that calls `runChat({ action: "submit_question", question })`. If the existing code names it differently, use the actual function name.

- [ ] **Step 3: Verify build passes**

```bash
npm run build
```

Expected: 0 errors.

- [ ] **Step 4: Visually verify**

```bash
npm run dev
```

Open http://localhost:3000/agents/hypothesis. You should see:
- Split panel: chat + input on the left, Document/Context/History tabs on the right
- Submitting a question streams messages into the left panel
- "→ Experiment" button at bottom right of the output panel
- Choice pills appear below messages when `options.length > 0`

- [ ] **Step 5: Commit**

```bash
git add components/pages/HypothesisPageClient.tsx
git commit -m "feat(ui): Hypothesis page adopts AgentShell split panel"
```

---

## Task 5: Experiment and Curve Fitting pages — adopt AgentShell

**Files:**
- Modify: `components/pages/ExperimentPageClient.tsx`
- Modify: `components/pages/CurveFittingPageClient.tsx`

**Interfaces:**
- Consumes: `AgentShell` (Task 3), `AgentDocumentPanel` (existing), all existing API hooks unchanged
- `useRouter` from `next/navigation` for handoff navigation

### Experiment page

- [ ] **Step 1: Update imports in `ExperimentPageClient.tsx`**

`ExperimentPageClient` currently uses `AgentPageShell` from `components/ui`. Replace the import block:

```tsx
"use client";

import { useCallback, useEffect, useState } from "react";
import { useRouter } from "next/navigation";

import { AgentShell, Alert, Button } from "@/components/ui";
import { AgentDocumentPanel } from "@/components/ui/AgentDocumentPanel";
import {
  getAgentsStatus,
  postAgentRun,
  type AgentRunResult,
  type AgentsStatusResponse,
} from "@/lib/api-client";
import { useAccessToken } from "@/lib/use-access-token";
```

- [ ] **Step 2: Replace the return block in `ExperimentPageClient.tsx`**

Keep all existing state (`status`, `lastRun`, `loading`, `error`) and handler functions (`onRun`, `refreshStatus`) unchanged. Replace only the `return (...)`:

```tsx
  const router = useRouter();
  const agentStatus = status?.agents.find((a) => a.name.toLowerCase().includes("experiment agent"));

  const chatContentSlot = (
    <div className="flex flex-col gap-3">
      {error ? <Alert variant="error">{error}</Alert> : null}
      {agentStatus && (
        <Alert variant={agentStatus.ready ? "success" : "info"}>
          <strong>{agentStatus.name}</strong>: {agentStatus.message}
        </Alert>
      )}
      {lastRun && (
        <div className={`rounded-[var(--st-radius)] border p-3 text-sm ${
          lastRun.status === "success"
            ? "border-[var(--st-success-border)] bg-[var(--st-success-bg)] text-[var(--st-success-text)]"
            : "border-[var(--st-error-border)] bg-[var(--st-error-bg)] text-[var(--st-error-text)]"
        }`}>
          <p className="font-semibold">{lastRun.agent}</p>
          <p>{lastRun.message}</p>
        </div>
      )}
    </div>
  );

  const chatInputSlot = (
    <div className="flex gap-2">
      <Button onClick={() => void onRun()} disabled={loading} fullWidth>
        {loading ? "Running…" : "Run Experiment Agent"}
      </Button>
      <Button variant="secondary" onClick={() => void refreshStatus()} disabled={loading}>
        <i className="bi bi-arrow-clockwise text-sm" aria-hidden="true" />
      </Button>
    </div>
  );

  const documentSlot = lastRun?.data?.document_markdown ? (
    <AgentDocumentPanel
      title="Experimental protocol"
      markdown={String(lastRun.data.document_markdown)}
      documentId={lastRun.data.document_id as string | undefined}
      pdfUrl={lastRun.data.pdf_url as string | undefined}
    />
  ) : (
    <p className="text-sm text-[var(--st-muted)]">
      Run the agent to generate an experimental protocol.
    </p>
  );

  const contextSlot = (
    <p className="text-sm text-[var(--st-muted)]">
      {agentStatus ? `${agentStatus.name}: ${agentStatus.message}` : "Loading agent status…"}
    </p>
  );

  const historySlot = (
    <p className="text-sm text-[var(--st-muted)]">No history yet.</p>
  );

  return (
    <AgentShell
      title="Experiment Agent"
      iconClass="bi-flask-fill"
      status={loading ? "busy" : agentStatus?.ready ? "ready" : "error"}
      statusLabel={loading ? "Running…" : agentStatus?.ready ? "Ready" : "Not ready"}
      chatContent={chatContentSlot}
      chatInput={chatInputSlot}
      documentContent={documentSlot}
      contextContent={contextSlot}
      historyContent={historySlot}
      onExport={
        lastRun?.data?.pdf_url
          ? () => window.open(String(lastRun.data!.pdf_url), "_blank")
          : undefined
      }
      handoffLabel="→ Curve Fitting"
      onHandoff={() => router.push("/agents/curve-fitting")}
    />
  );
```

### Curve Fitting page

- [ ] **Step 3: Update imports in `CurveFittingPageClient.tsx`**

`CurveFittingPageClient` uses `StreamlitPage`. Replace `StreamlitPage` in its import list with `AgentShell`:

```tsx
import {
  AgentShell,
  Alert,
  Button,
  Expander,
  FormField,
  Metric,
  MetricRow,
  TwoCol,
} from "@/components/ui";
```

Also add at the top of the file:
```tsx
import { useRouter } from "next/navigation";
```

- [ ] **Step 4: Replace the return block in `CurveFittingPageClient.tsx`**

Keep ALL existing state, handlers, and sub-components (`PreviewTable`, etc.) unchanged. The existing return renders `<StreamlitPage>` wrapping all the form/upload/results UI. Extract that inner content into `chatContentSlot` and `chatInputSlot`, then return `<AgentShell>`. 

Find the `return (` near the end of the file. The existing structure is:

```tsx
return (
  <StreamlitPage title="Curve Fitting" icon="⌁" description="..." layout="centered">
    {/* lots of JSX */}
  </StreamlitPage>
)
```

Replace with:

```tsx
  const router = useRouter();

  const chatContentSlot = (
    <div className="flex flex-col gap-4">
      {error ? <Alert variant="error">{error}</Alert> : null}
      {/* File upload section */}
      <FormField label="Data file (.csv)" htmlFor="cf-data">
        <input
          id="cf-data"
          type="file"
          accept=".csv"
          onChange={(e) => void handleDataUpload(e)}
          className="text-sm text-[var(--st-text)]"
        />
      </FormField>
      {dataPreview && <PreviewTable preview={dataPreview} title="Data preview" />}
      <FormField label="Composition file (.csv)" htmlFor="cf-comp">
        <input
          id="cf-comp"
          type="file"
          accept=".csv"
          onChange={(e) => void handleCompUpload(e)}
          className="text-sm text-[var(--st-text)]"
        />
      </FormField>
      {compPreview && <PreviewTable preview={compPreview} title="Composition preview" />}
    </div>
  );

  const chatInputSlot = (
    <Button
      onClick={() => void handleRun()}
      disabled={running || !dataFile}
      fullWidth
    >
      {running ? "Fitting curves…" : "Run Curve Fitting"}
    </Button>
  );

  const documentSlot = results ? (
    <div className="flex flex-col gap-4">
      {results.wells?.map((well: CurveFittingWellResult) => (
        <Expander key={well.well_id} title={`Well ${well.well_id}`}>
          <MetricRow>
            <Metric label="R²" value={well.r_squared?.toFixed(4) ?? "—"} />
            <Metric label="Model" value={well.model ?? "—"} />
          </MetricRow>
        </Expander>
      ))}
    </div>
  ) : (
    <p className="text-sm text-[var(--st-muted)]">
      Upload files and run curve fitting to see results here.
    </p>
  );

  const contextSlot = (
    <div className="flex flex-col gap-2 text-sm">
      <p className="text-[var(--st-muted)]">Data file: {dataFile?.name ?? "none"}</p>
      <p className="text-[var(--st-muted)]">Composition file: {compFile?.name ?? "none"}</p>
    </div>
  );

  const historySlot = (
    <p className="text-sm text-[var(--st-muted)]">No history yet.</p>
  );

  return (
    <AgentShell
      title="Curve Fitting"
      iconClass="bi-graph-up-arrow"
      status={running ? "busy" : "ready"}
      statusLabel={running ? "Fitting…" : "Ready"}
      chatContent={chatContentSlot}
      chatInput={chatInputSlot}
      documentContent={documentSlot}
      contextContent={contextSlot}
      historyContent={historySlot}
      handoffLabel="→ ML Models"
      onHandoff={() => router.push("/agents/ml-models")}
    />
  );
```

> **Important:** The variable names (`handleDataUpload`, `handleCompUpload`, `handleRun`, `running`, `dataFile`, `compFile`, `dataPreview`, `compPreview`, `results`, `error`) must match what exists in the file. Read the file first and use the actual variable names.

- [ ] **Step 5: Verify build passes**

```bash
npm run build
```

Expected: 0 errors.

- [ ] **Step 6: Visually verify both pages**

```bash
npm run dev
```

Open http://localhost:3000/agents/experiment and http://localhost:3000/agents/curve-fitting. Both should show the split panel with the handoff button.

- [ ] **Step 7: Commit**

```bash
git add components/pages/ExperimentPageClient.tsx components/pages/CurveFittingPageClient.tsx
git commit -m "feat(ui): Experiment and Curve Fitting pages adopt AgentShell"
```

---

## Task 6: ML Models and Analysis pages — adopt AgentShell

**Files:**
- Modify: `components/pages/MlModelsPageClient.tsx`
- Modify: `components/pages/AnalysisPageClient.tsx`

**Interfaces:**
- Consumes: `AgentShell` (Task 3), all existing API hooks and state unchanged
- `useRouter` from `next/navigation` for handoff on ML Models

### ML Models page

- [ ] **Step 1: Update imports in `MlModelsPageClient.tsx`**

Replace `StreamlitPage` with `AgentShell` in the import list. Add `useRouter`:

```tsx
import {
  AgentShell,
  Alert,
  Button,
  Checkbox,
  Expander,
  FormField,
  Metric,
  MetricRow,
  NumberInput,
  Select,
  TextInput,
} from "@/components/ui";
import { useRouter } from "next/navigation";
```

- [ ] **Step 2: Replace the return block in `MlModelsPageClient.tsx`**

Keep ALL existing state, handlers, and helper functions (`cfgDual`, `cfgMc`, etc.) unchanged. Find the existing `return (<StreamlitPage ...>...)` at the bottom and replace it.

The existing ML Models page has:
- Model selection controls
- Configuration forms (dual GP, Monte Carlo, single GP)
- File upload for composition CSV
- Results display using `buildDualGpResultsView`, `buildGpResultsView`, `buildMonteCarloResultsView`

Restructure into slots:

```tsx
  const router = useRouter();

  const chatContentSlot = (
    <div className="flex flex-col gap-4">
      {error ? <Alert variant="error">{error}</Alert> : null}
      <FormField label="Model" htmlFor="ml-model">
        <Select
          id="ml-model"
          value={session?.ml_model_choice ?? SINGLE.value}
          onChange={(e) => void patchMlSession(token, { ml_model_choice: e.target.value }).then(setSession)}
          options={ML_MODEL_OPTIONS.map((o) => ({ value: o.value, label: o.label }))}
        />
      </FormField>
      {/* Composition upload — only shown when required */}
      {ML_MODEL_REQUIRES_COMPOSITION.includes(session?.ml_model_choice ?? "") && (
        <FormField label="Composition CSV" htmlFor="ml-comp">
          <input
            id="ml-comp"
            type="file"
            accept=".csv"
            onChange={(e) => void handleCompositionUpload(e)}
            className="text-sm text-[var(--st-text)]"
          />
        </FormField>
      )}
      {/* Model config expanders */}
      {session?.ml_model_choice === DUAL.value && (
        <Expander title="Dual GP configuration">
          {/* existing dual GP config JSX — keep unchanged */}
        </Expander>
      )}
      {session?.ml_model_choice === MC.value && (
        <Expander title="Monte Carlo configuration">
          {/* existing MC config JSX — keep unchanged */}
        </Expander>
      )}
    </div>
  );

  const chatInputSlot = (
    <Button onClick={() => void handleRun()} disabled={running} fullWidth>
      {running ? "Running model…" : "Run ML Model"}
    </Button>
  );

  const documentSlot = mlResults ? (
    <div className="flex flex-col gap-3">
      <MarkdownBlock markdown={mlResults} />
    </div>
  ) : (
    <p className="text-sm text-[var(--st-muted)]">
      Configure and run a model to see results here.
    </p>
  );

  const contextSlot = (
    <div className="flex flex-col gap-2 text-sm">
      <p className="text-[var(--st-muted)]">Model: {session?.ml_model_choice ?? "—"}</p>
    </div>
  );

  const historySlot = (
    <p className="text-sm text-[var(--st-muted)]">No history yet.</p>
  );

  return (
    <AgentShell
      title="ML Models"
      iconClass="bi-cpu-fill"
      status={running ? "busy" : "ready"}
      statusLabel={running ? "Running…" : "Ready"}
      chatContent={chatContentSlot}
      chatInput={chatInputSlot}
      documentContent={documentSlot}
      contextContent={contextSlot}
      historyContent={historySlot}
      handoffLabel="→ Analysis"
      onHandoff={() => router.push("/agents/analysis")}
    />
  );
```

> **Important:** `mlResults`, `running`, `handleRun`, `handleCompositionUpload`, `MarkdownBlock` must match the actual variable/import names in the file. Read the file and use the exact names. The `MarkdownBlock` import may need to be added: `import { MarkdownBlock } from "@/components/ui/MarkdownBlock";`

### Analysis page

- [ ] **Step 3: Update imports in `AnalysisPageClient.tsx`**

Replace `StreamlitPage` with `AgentShell` in the import:

```tsx
import {
  AgentShell,
  Alert,
  Button,
  Expander,
  FormField,
  Metric,
  MetricRow,
  TextArea,
} from "@/components/ui";
import { MarkdownBlock } from "@/components/ui/MarkdownBlock";
```

- [ ] **Step 4: Replace the return block in `AnalysisPageClient.tsx`**

Keep all existing state (`session`, `researchGoal`, `report`, `parsed`, `loading`, `error`) and handlers (`refresh`, `handleRun`) unchanged. Replace only `return (...)`:

```tsx
  const chatContentSlot = (
    <div className="flex flex-col gap-3">
      {error ? <Alert variant="error">{error}</Alert> : null}
      {parsed && (
        <div className="flex flex-col gap-2">
          {Object.entries(parsed).map(([k, v]) => (
            <Expander key={k} title={k}>
              <pre className="whitespace-pre-wrap text-xs text-[var(--st-text)]">
                {typeof v === "string" ? v : JSON.stringify(v, null, 2)}
              </pre>
            </Expander>
          ))}
        </div>
      )}
    </div>
  );

  const chatInputSlot = (
    <div className="flex flex-col gap-2">
      <FormField label="Research goal" htmlFor="analysis-goal">
        <TextArea
          id="analysis-goal"
          value={researchGoal}
          onChange={(e) => setResearchGoal(e.target.value)}
          placeholder="What is your overall research objective?"
          rows={2}
          disabled={loading}
        />
      </FormField>
      <Button onClick={() => void handleRun()} disabled={loading || !researchGoal.trim()} fullWidth>
        {loading ? "Analysing…" : "Run Analysis"}
      </Button>
    </div>
  );

  const documentSlot = report ? (
    <MarkdownBlock markdown={report} />
  ) : (
    <p className="text-sm text-[var(--st-muted)]">
      Run the analysis agent to generate a report here.
    </p>
  );

  const contextSlot = (
    <div className="flex flex-col gap-2 text-sm">
      <p className="text-[var(--st-muted)]">Research goal: {researchGoal || "—"}</p>
      {session?.current_experiment_id ? (
        <p className="text-[var(--st-muted)]">Experiment ID: {session.current_experiment_id}</p>
      ) : null}
    </div>
  );

  const historySlot = (
    <p className="text-sm text-[var(--st-muted)]">No history yet.</p>
  );

  return (
    <AgentShell
      title="Analysis Agent"
      iconClass="bi-clipboard-data-fill"
      status={loading ? "busy" : "ready"}
      statusLabel={loading ? "Analysing…" : "Ready"}
      chatContent={chatContentSlot}
      chatInput={chatInputSlot}
      documentContent={documentSlot}
      contextContent={contextSlot}
      historyContent={historySlot}
      onExport={report ? () => {
        const blob = new Blob([report], { type: "text/markdown" });
        const url = URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = url;
        a.download = "analysis-report.md";
        a.click();
        URL.revokeObjectURL(url);
      } : undefined}
    />
  );
```

- [ ] **Step 5: Verify build passes**

```bash
npm run build
```

Expected: 0 errors.

- [ ] **Step 6: Visually verify both pages**

```bash
npm run dev
```

Open http://localhost:3000/agents/ml-models and http://localhost:3000/agents/analysis. Verify:
- Split panel renders correctly on both pages
- ML Models shows model selector and config in the chat pane
- Analysis shows research goal textarea and results in document tab
- Analysis has no handoff button (end of pipeline)

- [ ] **Step 7: Final build and smoke test**

```bash
npm run build
```

Then start dev and verify all 5 agent pages load without errors:
- http://localhost:3000/agents/hypothesis
- http://localhost:3000/agents/experiment
- http://localhost:3000/agents/curve-fitting
- http://localhost:3000/agents/ml-models
- http://localhost:3000/agents/analysis

- [ ] **Step 8: Commit**

```bash
git add components/pages/MlModelsPageClient.tsx components/pages/AnalysisPageClient.tsx
git commit -m "feat(ui): ML Models and Analysis pages adopt AgentShell — redesign complete"
```
