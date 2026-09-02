# Phase-Mapper Web Frontend Design

## Purpose

Build the web UI for the phase-mapper library workflow (sub-project 1 of the
POLARIS integration, per `backend-api`'s
`docs/superpowers/specs/2026-08-14-phase-mapper-integration-design.md`),
against the backend that already exists: library CRUD, per-user uploads,
background pipeline runs, and eight of the ten reference-app result tabs
(Reads, Heatmaps, Predictions, XRD Recommendations, Remeasurement, Optical
Spectra, Library Runs history, Downloads).

## Scope

**In scope:** a new top-level page covering library creation/selection,
uploads, running the pipeline, and all eight backend-supported result tabs.

**Out of scope, deliberately:** XRD Spectra, XRD Peak Fits, and XRD label
review. Their backend doesn't exist yet — it needs the reference app's raw-XRD
processing orchestration ported, which is a separate future plan. The page
structure accommodates adding them later (two more `Tabs` entries) without
rework.

**Also out of scope:** wiring `composition_profile` into the create-library
form. The backend accepts and stores the field but doesn't pass it to the
pipeline yet (a documented gap in the backend plan) — exposing a selector
with no effect would be misleading UI. Only the composition-CSV-upload path,
which is fully wired, is exposed.

## Architecture

New top-level nav item "Phase Mapper" in `components/AppNav.tsx`'s `ITEMS`
array (one line, `href: "/phase-mapper"`), a thin server route at
`app/(app)/phase-mapper/page.tsx`, and a client component
`components/pages/PhaseMapperPageClient.tsx` following the exact shape of
`components/pages/CurveFittingPageClient.tsx`: a `"use client"` component
holding local state, calling `apiFetch<T>()`-based functions, built from the
existing `components/ui` primitives (`Tabs`, `Alert`, `Button`, `Card`,
`Columns`, `Metric`, `FormField`, `Expander`).

API calls live in hand-rolled, per-endpoint typed functions — following
`lib/api-client.ts`'s existing convention (see e.g. `startLiteratureExtraction`,
`fetchLiteratureEvidencePacket`) rather than consuming
`@polaris/shared-types`'s generated OpenAPI client. That client isn't a
`package.json` dependency and isn't imported anywhere in this codebase today
(confirmed by search) — only referenced in a "keep in sync" comment in
`lib/api-path.ts`. This plan follows the established pattern rather than
introducing the generated client's first consumer as a side effect.

No new dependencies: no data-fetching library (no `react-query`/`swr` in
`package.json`; existing pages use plain `fetch` + `useState`/`useEffect`)
and no charting library (no `recharts`/`d3`/`victory`/`visx`) — heatmaps and
spectra are hand-built inline SVG, per the dataviz skill's approach and this
app's existing lack of a charting dependency.

## Components

- **`PhaseMapperPageClient`** — top-level state: selected library id,
  selected run id (defaults to that library's most recently completed run,
  or none). Both are plain component state, not URL params — no page in
  this app persists workflow selection in the URL, and a phase-mapper
  session is a single sitting, not something to bookmark mid-flow.

- **Library panel** — lists existing libraries (`GET /phase-mapper/libraries`)
  plus a "create new" form (name only, per the scope note above). Each
  library row is selectable; selecting one loads its run history and sets
  the selected run to the most recent one.

- **Library detail** — once a library is selected:
  - Upload controls for the composition CSV and plate-reader workbook(s),
    reusing the upload/preview pattern already established in
    `CurveFittingPageClient.tsx` (`parseCsvPreview`, `PreviewTable`).
  - A "Run Pipeline" button — disabled with an explanatory message while a
    run is already active for this library, surfacing the backend's `409`.
  - A run-status indicator (polling — see Data Flow).
  - The `Tabs` component (`components/ui/Tabs.tsx`, unmodified) wrapping the
    eight result panels below. `Tabs` only renders the active panel, so each
    panel fetches its own data lazily on first view rather than the page
    fetching everything up front.

- **Result tab panels** (`Tabs` items, each a small component keyed on the
  selected run id):
  - **Reads**, **Predictions**, **XRD Recommendations**, **Remeasurement** —
    plain tables, reusing `PreviewTable`-style rendering.
  - **Optical Spectra** — a well-picker dropdown + an inline-SVG line chart
    (signal vs. wavelength) for the selected well. Fetches the full
    unfiltered payload once and derives the well list plus filters
    client-side, rather than a second network round-trip per well selection
    — the backend's `?well=` server-side filter stays available to switch to
    later if payload size becomes a real problem.
  - **Heatmaps** — a metric-picker dropdown, populated from the response's
    `columns` list (the backend deliberately returns every available
    numeric metric rather than a fixed set, so the picker's options are
    driven by the response, not hardcoded) + an 8×12 inline-SVG grid (rows
    A–H, columns 1–12), sequential color scale, per-well value on hover.
    This is the one component with real dataviz work — load the dataviz
    skill before writing it, during plan execution, not during this design.
  - **Library Runs** — history list (status, `created_at`, `frozen`) with a
    "View" action (moves the page's selected-run pointer, re-driving every
    other tab against that run) and a "Delete" action for a stuck run
    (`DELETE /phase-mapper/runs/{run_id}`, added in the backend's last
    final-review fix pass specifically for this purpose).
  - **Downloads** — a single "Download ZIP" button against the binary
    endpoint; a plain blob download, no special handling.

## Data flow

1. Selecting a library fetches its run history (`GET
   /phase-mapper/libraries/{id}/runs`) and defaults the selected run to the
   most recent one, or none if no run has completed yet.
2. Uploading files and clicking "Run Pipeline" calls `POST
   /phase-mapper/libraries/{id}/runs`, then polls `GET
   /phase-mapper/runs/{id}` every few seconds while `status === "running"`.
3. After roughly 10 minutes of polling without completion, the UI stops
   silently polling and instead shows a warning with a "Delete this run"
   action. The backend has no server-side staleness detection for a run
   whose subprocess died without writing a result (a documented, deferred
   gap from the backend plan's final review) — the frontend is the only
   place this currently gets surfaced to a user at all.
4. Once a run succeeds, each result tab panel fetches its own endpoint
   against the selected run id when first viewed.

## Error handling

- Upload validation errors (e.g. a composition CSV missing the `well`
  column, a `400`) surface via the existing `Alert` component with the
  backend's error detail.
- Starting a run while one is already active (`409`) surfaces as an inline
  message on the disabled "Run Pipeline" button, not a toast/alert — it's an
  expected, non-error state.
- A `404` on a library or run (e.g. a delete racing a view in another tab)
  prompts a refresh of the library/run list rather than failing silently.
- A run that never completes (see Data Flow, point 3) is a UI-level warning
  with a recovery action, not a silent infinite poll.

## Testing / verification

No automated test tooling exists anywhere in this frontend repo today — no
`vitest`/`jest`/`playwright` dependency, no test files for any existing page
(confirmed by search). This plan does not introduce one; that would be a
separate, much larger decision than this design covers. Verification is
manual: run the dev server, exercise the golden path (create library →
upload → run → watch each tab populate → download) and the edge cases (409
on double-run, 400 on bad upload, a deliberately-stuck run's warning state)
in a real browser, matching how every other page in this app was presumably
validated.

## Open questions for later plans

- XRD Spectra / XRD Peak Fits / XRD label review UI — blocked on their
  backend, tracked in the backend plan's own "after this plan" note.
- Whether to eventually consume `@polaris/shared-types`'s generated client
  across the whole frontend (not just phase-mapper) is a cross-cutting
  decision this plan intentionally doesn't make.
