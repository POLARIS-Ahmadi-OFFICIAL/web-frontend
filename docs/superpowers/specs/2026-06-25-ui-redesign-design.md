# POLARIS Web Frontend UI Redesign

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Redesign the web frontend with an Apple-clean, industry-standard UI — Deep Space color palette, 52px icon-only rail navigation, and a split-panel agent interface with tabbed output.

**Scope:** Agent pages (Hypothesis, Experiment, Curve Fitting, ML Models, Analysis), navigation shell, and shared UI primitives. Home, Dashboard, Workflow, History, Settings, and auth pages are out of scope — they inherit the token updates automatically but receive no layout changes.

**Tech stack:** Next.js 15 (App Router), React 19, Tailwind CSS 4, Bootstrap Icons 1.11 (CDN), existing `globals.css` CSS custom property token system.

---

## Design Decisions

| Decision | Choice |
|---|---|
| Agent page layout | Split panel — chat left, tabbed output right |
| Navigation | 52px permanent icon-only rail, hover tooltips |
| Visual style | Deep Space — dark slate (#0f172a), indigo accent (#6366f1) |
| Icon library | Bootstrap Icons (replaces all emoji/unicode) |
| Theme default | Dark (Deep Space); light mode supported via existing `next-themes` |

---

## Design Tokens (`globals.css`)

Replace the existing `--st-*` token values with the following. The token **names** stay identical so all existing consumers continue to work.

### Dark mode (`:root` or `[data-theme="dark"]`)

```css
--st-bg: #0f172a;
--st-main: #0f172a;
--st-surface: #1e293b;
--st-surface-raised: #253347;
--st-border: rgba(255, 255, 255, 0.07);
--st-border-strong: rgba(255, 255, 255, 0.14);
--st-text: #f1f5f9;
--st-text-secondary: #cbd5e1;
--st-muted: #64748b;
--st-hover: rgba(255, 255, 255, 0.05);
--st-primary: #6366f1;
--st-primary-hover: #4f46e5;
--st-accent: #818cf8;
--st-sidebar: #1e293b;
--st-nav-active-bg: rgba(99, 102, 241, 0.18);
--st-nav-active-text: #818cf8;
--st-radius: 10px;
--st-radius-sm: 7px;
--st-radius-lg: 14px;
--st-shadow-sm: 0 1px 3px rgba(0, 0, 0, 0.4);
--st-shadow-md: 0 4px 12px rgba(0, 0, 0, 0.5);
/* semantic — keep existing names, update values */
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
```

### Light mode (`[data-theme="light"]`)

```css
--st-bg: #f8fafc;
--st-main: #f1f5f9;
--st-surface: #ffffff;
--st-surface-raised: #ffffff;
--st-border: rgba(0, 0, 0, 0.08);
--st-border-strong: rgba(0, 0, 0, 0.14);
--st-text: #0f172a;
--st-text-secondary: #334155;
--st-muted: #64748b;
--st-hover: rgba(0, 0, 0, 0.04);
--st-primary: #4f46e5;
--st-primary-hover: #4338ca;
--st-accent: #6366f1;
--st-sidebar: #ffffff;
--st-nav-active-bg: rgba(79, 70, 229, 0.08);
--st-nav-active-text: #4f46e5;
/* shadows lighter */
--st-shadow-sm: 0 1px 3px rgba(0, 0, 0, 0.08);
--st-shadow-md: 0 4px 12px rgba(0, 0, 0, 0.1);
```

---

## Bootstrap Icons

Add to `app/layout.tsx` `<head>`:

```tsx
<link
  rel="stylesheet"
  href="https://cdn.jsdelivr.net/npm/bootstrap-icons@1.11.3/font/bootstrap-icons.min.css"
/>
```

Icon assignments (used in `AppNav` and agent page headers):

| Page | Icon class |
|---|---|
| Home | `bi-house-fill` |
| Analytics | `bi-bar-chart-fill` |
| Workflow | `bi-diagram-3-fill` |
| Hypothesis | `bi-lightbulb-fill` |
| Experiment | `bi-flask-fill` |
| Curve Fitting | `bi-graph-up-arrow` |
| ML Models | `bi-cpu-fill` |
| Analysis | `bi-clipboard-data-fill` |
| Watcher | `bi-eye-fill` |
| MCP | `bi-link-45deg` |
| Settings | `bi-gear-fill` |
| History | `bi-clock-history` |

---

## Component Changes

### `components/AppNav.tsx` — full rewrite

Replace the 260px collapsible sidebar with a permanent 52px icon-only rail.

**Behaviour:**
- Always visible; no collapse logic; remove all `collapsed` prop and localStorage state from `AppShell` too
- Each item: 36×36px rounded square (`border-radius: var(--st-radius-sm)`), centered `<i class="bi bi-...">` icon at 16px
- Active: `background: var(--st-nav-active-bg)`, icon color `var(--st-nav-active-text)`
- Inactive: icon color `var(--st-muted)`, hover: `background: var(--st-hover)` + icon color `var(--st-text)`
- Tooltip: native `title` attribute on each `<Link>` — no JS tooltip library
- Logo: 28×28px indigo rounded square with white "P" at the top; links to `/home`
- Account avatar circle at the bottom (28×28px, `var(--st-surface-raised)` background); shows AuthNav on click
- No section headers — just icons stacked with 4px gap
- No ThemeToggle in rail — moved to agent page top bar

**Structure:**
```
<nav> 52px wide, full height, bg var(--st-sidebar), border-right
  Logo (P mark)
  <ul> — all nav items as icon buttons with title tooltip
  </ul>
  Account avatar (bottom, mt-auto)
</nav>
```

**SECTIONS data** — keep same href/label pairs, replace icon strings with Bootstrap icon class names:
```ts
const ITEMS = [
  { href: "/home",               label: "Home",         icon: "bi-house-fill" },
  { href: "/dashboard",          label: "Analytics",    icon: "bi-bar-chart-fill" },
  { href: "/workflow",           label: "Workflow",     icon: "bi-diagram-3-fill" },
  { href: "/agents/hypothesis",  label: "Hypothesis",   icon: "bi-lightbulb-fill" },
  { href: "/agents/experiment",  label: "Experiment",   icon: "bi-flask-fill" },
  { href: "/agents/curve-fitting", label: "Curve Fitting", icon: "bi-graph-up-arrow" },
  { href: "/agents/ml-models",   label: "ML Models",    icon: "bi-cpu-fill" },
  { href: "/agents/analysis",    label: "Analysis",     icon: "bi-clipboard-data-fill" },
  { href: "/tools/watcher",      label: "Watcher",      icon: "bi-eye-fill" },
  { href: "/tools/mcp",          label: "MCP",          icon: "bi-link-45deg" },
  { href: "/settings",           label: "Settings",     icon: "bi-gear-fill" },
  { href: "/history",            label: "History",      icon: "bi-clock-history" },
]
```

### `components/ThemeToggle.tsx` — move to top bar

Remove `ThemeToggle` from `AppNav`. Instead, render it inside `AgentShell`'s top bar (right side). For non-agent pages that still need it (Home, Dashboard, etc.), add a small fixed icon button in the top-right corner of the page via their existing page layout — a single `<ThemeToggle compact />` wrapped in `position: fixed; top: 12px; right: 12px; z-index: 50`.

### `components/AppShell.tsx` — simplify

Remove all collapse/localStorage logic. The shell is now just:

```tsx
export function AppShell({ children }) {
  return (
    <div className="flex min-h-screen bg-[var(--st-main)]">
      <a href="#main-content" className="st-skip-link">Skip to main content</a>
      <AppNav />
      <div id="main-content" tabIndex={-1} className="flex-1 overflow-auto outline-none">
        {children}
      </div>
    </div>
  )
}
```

### `components/ui/Button.tsx` — add variants

Add two variants alongside the existing `primary` and `secondary`:

- **`icon`**: 36×36px square, `border-radius: var(--st-radius-sm)`, no padding, centered content, `background: transparent`, hover: `var(--st-hover)` — used for toolbar icon buttons
- **`ghost`**: same as secondary but no border, only hover background — used for inline text actions

### `components/ui/AgentShell.tsx` — new component

New shared shell for all 5 agent pages. Replaces `StreamlitPage` and `AgentPageShell` for agent routes only.

**Props:**
```ts
{
  agentKey: "hypothesis" | "experiment" | "curve-fitting" | "ml-models" | "analysis"
  title: string
  iconClass: string          // Bootstrap icon class e.g. "bi-lightbulb-fill"
  status?: "ready" | "busy" | "error"
  statusLabel?: string
  chatContent: React.ReactNode     // left panel body (message list)
  chatInput: React.ReactNode       // left panel bottom bar (input)
  documentContent: React.ReactNode // Document tab content
  contextContent: React.ReactNode  // Context tab content
  historyContent: React.ReactNode  // History tab content
  onExport?: () => void
  handoffLabel?: string            // e.g. "→ Experiment"
  onHandoff?: () => void
}
```

**Layout (full-height, no scroll on outer):**

```
<div> h-screen flex flex-col overflow-hidden bg-[var(--st-bg)]

  {/* Top bar — 44px */}
  <div> flex items-center px-4 h-11 border-b border-[var(--st-border)] bg-[var(--st-surface)]
    <i iconClass />  <span title </span>   {/* left */}
    <StatusBadge />                        {/* center, ml-auto mr-auto */}
    <ThemeToggle />  <SettingsLink />      {/* right */}
  </div>

  {/* Body — flex row, fills remaining height */}
  <div> flex flex-1 overflow-hidden

    {/* Chat pane */}
    <div> flex flex-col flex-1 overflow-hidden border-r border-[var(--st-border)]
      <div> flex-1 overflow-y-auto p-4   {/* message list */}
        {chatContent}
      </div>
      <div> shrink-0 border-t border-[var(--st-border)] p-3  {/* input bar */}
        {chatInput}
      </div>
    </div>

    {/* Output pane — 42% width, min 320px */}
    <div> flex flex-col w-[42%] min-w-[320px] overflow-hidden

      {/* Tabs */}
      <div> flex border-b border-[var(--st-border)]
        {["Document","Context","History"].map(tab => <TabButton />)}
      </div>

      {/* Tab content */}
      <div> flex-1 overflow-y-auto p-4
        {activeTab === "Document"  && documentContent}
        {activeTab === "Context"   && contextContent}
        {activeTab === "History"   && historyContent}
      </div>

      {/* Action row */}
      <div> shrink-0 flex justify-end gap-2 border-t border-[var(--st-border)] p-3
        <Button variant="secondary" onClick={onExport}>
          <i className="bi bi-download me-1" /> Export PDF
        </Button>
        {handoffLabel && onHandoff && (
          <Button variant="primary" onClick={onHandoff}>
            {handoffLabel} <i className="bi bi-arrow-right ms-1" />
          </Button>
        )}
      </div>
    </div>
  </div>
</div>
```

---

## Per-Agent Output Panel Content

Each agent page passes its own content into `AgentShell`'s `documentContent` slot. The other slots (chatContent, chatInput) are already implemented per-agent — this spec only defines what changes.

### Hypothesis (`HypothesisPageClient`)

**Document tab:** Renders `AgentDocumentPanel` (already exists) when `document` state is non-null. Shows placeholder text "Your hypothesis will appear here as the agent works…" when null.

**Context tab:** Shows current `stage`, `question` input value, `options` list (if any).

**History tab:** Not implemented in v1 — shows "No history yet" placeholder.

**Handoff:** `handoffLabel="→ Experiment"`, `onHandoff` navigates to `/agents/experiment`.

**Inline choice cards:** When `options.length > 0`, render below the last assistant message as a row of clickable pill buttons styled with `border: 1px solid var(--st-border)`, hover: `border-color: var(--st-primary)`. Clicking a pill calls the existing `runChat` with that option as the user text.

### Experiment (`ExperimentPageClient`)

Currently uses `AgentPageShell` (bare Run/Refresh). Replace with `AgentShell`.

**Chat pane:** Simple run interface — single "Run Experiment Agent" button that calls `postAgentRun`. While running, show a spinner message bubble. On complete, show result as a chat message.

**Document tab:** Renders `AgentDocumentPanel` when `lastRun?.data?.document_markdown` is non-null.

**Handoff:** `handoffLabel="→ Curve Fitting"`, navigates to `/agents/curve-fitting`.

### Curve Fitting (`CurveFittingPageClient`)

**Document tab:** Same as Experiment — `AgentDocumentPanel` when result available.

**Handoff:** `handoffLabel="→ ML Models"`, navigates to `/agents/ml-models`.

### ML Models (`MlModelsPageClient`)

**Document tab:** Same pattern.

**Handoff:** `handoffLabel="→ Analysis"`, navigates to `/agents/analysis`.

### Analysis (`AnalysisPageClient`)

**Document tab:** Same pattern.

**Handoff:** None — Export PDF only (end of pipeline).

---

## `AgentDocumentPanel` — no changes

The existing component already handles markdown rendering and PDF export. It is passed as-is into the `documentContent` slot of `AgentShell`. No modifications needed.

---

## Files Changed

| File | Change |
|---|---|
| `app/layout.tsx` | Add Bootstrap Icons CDN `<link>` |
| `app/globals.css` | Update all `--st-*` token values |
| `components/AppNav.tsx` | Full rewrite — icon rail |
| `components/AppShell.tsx` | Remove collapse logic, simplify |
| `components/ui/Button.tsx` | Add `icon` and `ghost` variants |
| `components/ui/AgentShell.tsx` | New component (create) |
| `components/pages/HypothesisPageClient.tsx` | Adopt `AgentShell`, add inline choice pills, document/context tabs |
| `components/pages/ExperimentPageClient.tsx` | Adopt `AgentShell` (replaces `AgentPageShell`) |
| `components/pages/CurveFittingPageClient.tsx` | Adopt `AgentShell` |
| `components/pages/MlModelsPageClient.tsx` | Adopt `AgentShell` |
| `components/pages/AnalysisPageClient.tsx` | Adopt `AgentShell` |

## Files NOT changed

- `components/ui/Card.tsx`, `Alert.tsx`, `Tabs.tsx`, `Inputs.tsx`, `ChatMessage.tsx`, `MarkdownBlock.tsx` — inherit token updates automatically
- `components/ui/AgentDocumentPanel.tsx` — passed into `AgentShell` unchanged
- `components/pages/HomePageClient.tsx`, `DashboardPageClient.tsx`, `SettingsPageClient.tsx`, `HistoryPageClient.tsx`, `WorkflowPageClient.tsx`, `LoginPageClient.tsx` — out of scope
- All API/lib files — no changes

---

## Accessibility

- All icon-only nav items: `title` attribute for native tooltip, `aria-label` matching the label
- `aria-current="page"` on active nav item
- Skip-to-content link preserved in `AppShell`
- Tab order: rail → top bar → chat input → output panel tabs
- Focus ring: `focus-visible:ring-2 focus-visible:ring-[var(--st-primary)]/50`
- Status badges use `role="status"` for screen readers
- Minimum tap target 44×44px on mobile (icon items are 36px — increase to 44px on touch devices via `@media (pointer: coarse)`)

---

## Out of Scope

- Home, Dashboard, Workflow, History, Settings pages — layout unchanged
- Mobile/responsive layout for agent pages — desktop-first; split panel collapses to tabs on narrow viewports as a follow-up
- Animations beyond existing Tailwind `transition` utilities
- Custom font changes — Geist Sans/Mono unchanged
