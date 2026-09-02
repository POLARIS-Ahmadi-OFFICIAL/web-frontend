# Phase-Mapper Web Frontend Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build the phase-mapper library workflow web UI — library create/select, uploads, run-the-pipeline, and all eight backend-supported result tabs (Reads, Predictions, XRD Recommendations, Remeasurement, Optical Spectra, Heatmaps, Library Runs history, Downloads) — as one new top-level page.

**Architecture:** A new nav entry → `app/(app)/phase-mapper/page.tsx` (thin server wrapper) → `components/pages/PhaseMapperPageClient.tsx` (client component, built up incrementally across this plan's tasks), backed by a new hand-rolled API client module and a set of small, single-purpose components under `components/phase-mapper/`.

**Tech Stack:** Next.js App Router, React, the existing `components/ui` design system, plain `fetch` (no new data-fetching or charting dependency, matching this app's existing conventions), inline SVG for the two charts (Optical Spectra, Heatmaps).

**Spec:** `docs/superpowers/specs/2026-08-20-phase-mapper-web-design.md`

## Global Constraints

- No new dependencies: no data-fetching library (`react-query`/`swr`), no charting library (`recharts`/`d3`/`victory`/`visx`) — confirmed absent from `package.json` today, and the design deliberately keeps it that way.
- API calls are hand-rolled typed functions in a new `lib/phase-mapper-api-client.ts`, not the generated `@polaris/shared-types` client (confirmed unused anywhere in this codebase today) — this plan doesn't become its first consumer.
- `composition_profile` is NOT exposed in the create-library form — the backend accepts and stores it but doesn't wire it into the pipeline yet (a documented gap in the backend plan). Only the composition-CSV-upload path is exposed.
- No automated test tooling exists in this repo (confirmed: no `vitest`/`jest`/`playwright` dependency, no test files for any page) and this plan does not introduce one. Every task's verification is: `npx tsc --noEmit` clean, `npm run lint` clean, and a specific manual check against a running dev stack.
- Heatmap color encoding follows the dataviz skill: the sequential single-hue (blue) ramp from its validated reference palette, computed per-cell text contrast (not eyeballed), a hover tooltip, no dual-axis, no rainbow.
- All new components are `"use client"`, follow the existing `components/ui` primitives and `--st-*` CSS variable theming — no new design tokens introduced except the heatmap's sequential ramp (a data-encoding color, not a UI token, per the dataviz skill).

## Dev environment for manual verification (every task)

Backend: from `backend-api`, `AUTH_DISABLED=true uvicorn app.main:app --reload --port 8080` (or whatever the repo's own `.env`/README quick-start already sets up — `AUTH_DISABLED=true` is backend-api's documented dev default, so it may already be your default and not need restating). Already running in the background for this plan's execution at `http://127.0.0.1:8080` — confirm with `curl -s http://127.0.0.1:8080/api/v1/health` before assuming you need to start it yourself.
Frontend: from `web-frontend`, `npm run dev`. Already running in the background for this plan's execution at `http://127.0.0.1:3000` — confirm with `curl -s -o /dev/null -w '%{http_code}\n' http://127.0.0.1:3000/login` (expect `200`) before starting your own.

**One-time browser prerequisite, separate from the backend's `AUTH_DISABLED`:** this frontend has its own auth-gating middleware (`lib/supabase/middleware.ts`) that redirects every page to `/login` unless either Supabase is configured (it isn't, in this dev setup — `.env.local` has empty `NEXT_PUBLIC_SUPABASE_URL`/`NEXT_PUBLIC_SUPABASE_ANON_KEY`) or a `polaris_dev_bypass=1` cookie is present. Before any manual browser verification, visit `http://127.0.0.1:3000/login` once and click the "Skip (dev only)" button — this sets that cookie for 24 hours in that browser profile. Without it, every page (including `/phase-mapper`) redirects to `/login` and looks broken even though nothing is actually wrong.

Fixtures: `backend-api/tests/phase_mapper/fixtures/composition_map_fixture.csv` and `plate_reader_fixture.csv` (already exist, from the backend plan's e2e test) are real, valid inputs to upload during manual verification.

---

### Task 1: Phase-mapper API client

**Files:**
- Create: `lib/phase-mapper-api-client.ts`

**Interfaces:**
- Produces (used by every later task):
  - Types: `PhaseMapperLibrary`, `PhaseMapperRun`, `PhaseMapperUploadResult`, `PhaseMapperHeatmaps`, `PhaseMapperUploadKind`
  - Functions: `createPhaseMapperLibrary(token, name) -> Promise<PhaseMapperLibrary>`, `listPhaseMapperLibraries(token) -> Promise<PhaseMapperLibrary[]>`, `deletePhaseMapperLibrary(token, libraryId) -> Promise<void>`, `uploadPhaseMapperFile(token, libraryId, kind, file) -> Promise<PhaseMapperUploadResult>`, `startPhaseMapperRun(token, libraryId) -> Promise<PhaseMapperRun>`, `listPhaseMapperRuns(token, libraryId) -> Promise<PhaseMapperRun[]>`, `getPhaseMapperRun(token, runId) -> Promise<PhaseMapperRun>`, `deletePhaseMapperRun(token, runId) -> Promise<void>`, `getPhaseMapperReads(token, runId) -> Promise<Record<string, unknown>[]>`, `getPhaseMapperPredictions(token, runId) -> Promise<Record<string, unknown>[]>`, `getPhaseMapperXrdRecommendations(token, runId) -> Promise<Record<string, unknown>[]>`, `getPhaseMapperRemeasurement(token, runId) -> Promise<Record<string, unknown>[]>`, `getPhaseMapperOpticalSpectra(token, runId, well?) -> Promise<Record<string, unknown>[]>`, `getPhaseMapperHeatmaps(token, runId) -> Promise<PhaseMapperHeatmaps>`, `downloadPhaseMapperRun(token, runId) -> Promise<Blob>`

- [ ] **Step 1: Write the file**

```typescript
import { apiFetch, ApiError } from "@/lib/api-client";
import { apiPath } from "@/lib/api-path";
import { getApiBase } from "@/lib/api-base";

export type PhaseMapperLibrary = {
  id: number;
  user_id: string;
  name: string;
  slug: string;
  composition_profile: string;
  created_at: string;
  updated_at: string;
};

export type PhaseMapperRun = {
  id: number;
  library_id: number;
  status: "running" | "succeeded" | "failed";
  job_pid: number | null;
  return_code: number | null;
  error_message: string;
  frozen: boolean;
  created_at: string;
  completed_at: string | null;
};

export type PhaseMapperUploadResult = {
  warnings: string[];
};

export type PhaseMapperHeatmaps = {
  columns: string[];
  wells: Record<string, unknown>[];
};

export type PhaseMapperUploadKind = "composition" | "plate_reader" | "raw_xrd" | "xrd_labels_reviewed";

export async function createPhaseMapperLibrary(
  token: string | null,
  name: string,
): Promise<PhaseMapperLibrary> {
  return apiFetch<PhaseMapperLibrary>("/phase-mapper/libraries", {
    method: "POST",
    body: { name },
    token,
  });
}

export async function listPhaseMapperLibraries(token: string | null): Promise<PhaseMapperLibrary[]> {
  return apiFetch<PhaseMapperLibrary[]>("/phase-mapper/libraries", { token });
}

export async function deletePhaseMapperLibrary(token: string | null, libraryId: number): Promise<void> {
  await apiFetch<{ status: string }>(`/phase-mapper/libraries/${libraryId}`, {
    method: "DELETE",
    token,
  });
}

export async function uploadPhaseMapperFile(
  token: string | null,
  libraryId: number,
  kind: PhaseMapperUploadKind,
  file: File,
): Promise<PhaseMapperUploadResult> {
  const form = new FormData();
  form.append("file", file, file.name);
  return apiFetch<PhaseMapperUploadResult>(`/phase-mapper/libraries/${libraryId}/uploads/${kind}`, {
    method: "POST",
    body: form,
    token,
  });
}

export async function startPhaseMapperRun(token: string | null, libraryId: number): Promise<PhaseMapperRun> {
  return apiFetch<PhaseMapperRun>(`/phase-mapper/libraries/${libraryId}/runs`, {
    method: "POST",
    token,
  });
}

export async function listPhaseMapperRuns(token: string | null, libraryId: number): Promise<PhaseMapperRun[]> {
  return apiFetch<PhaseMapperRun[]>(`/phase-mapper/libraries/${libraryId}/runs`, { token });
}

export async function getPhaseMapperRun(token: string | null, runId: number): Promise<PhaseMapperRun> {
  return apiFetch<PhaseMapperRun>(`/phase-mapper/runs/${runId}`, { token });
}

export async function deletePhaseMapperRun(token: string | null, runId: number): Promise<void> {
  await apiFetch<{ status: string }>(`/phase-mapper/runs/${runId}`, {
    method: "DELETE",
    token,
  });
}

export async function getPhaseMapperReads(token: string | null, runId: number): Promise<Record<string, unknown>[]> {
  return apiFetch<Record<string, unknown>[]>(`/phase-mapper/runs/${runId}/reads`, { token });
}

export async function getPhaseMapperPredictions(
  token: string | null,
  runId: number,
): Promise<Record<string, unknown>[]> {
  return apiFetch<Record<string, unknown>[]>(`/phase-mapper/runs/${runId}/predictions`, { token });
}

export async function getPhaseMapperXrdRecommendations(
  token: string | null,
  runId: number,
): Promise<Record<string, unknown>[]> {
  return apiFetch<Record<string, unknown>[]>(`/phase-mapper/runs/${runId}/xrd-recommendations`, { token });
}

export async function getPhaseMapperRemeasurement(
  token: string | null,
  runId: number,
): Promise<Record<string, unknown>[]> {
  return apiFetch<Record<string, unknown>[]>(`/phase-mapper/runs/${runId}/remeasurement`, { token });
}

export async function getPhaseMapperOpticalSpectra(
  token: string | null,
  runId: number,
  well?: string,
): Promise<Record<string, unknown>[]> {
  const query = well ? `?well=${encodeURIComponent(well)}` : "";
  return apiFetch<Record<string, unknown>[]>(`/phase-mapper/runs/${runId}/optical-spectra${query}`, { token });
}

export async function getPhaseMapperHeatmaps(token: string | null, runId: number): Promise<PhaseMapperHeatmaps> {
  return apiFetch<PhaseMapperHeatmaps>(`/phase-mapper/runs/${runId}/heatmaps`, { token });
}

export async function downloadPhaseMapperRun(token: string | null, runId: number): Promise<Blob> {
  const url = `${getApiBase()}${apiPath(`/phase-mapper/runs/${runId}/download`)}`;
  const res = await fetch(url, {
    headers: token && token !== "__bypass__" ? { Authorization: `Bearer ${token}` } : {},
  });
  if (!res.ok) {
    throw new ApiError(`Download failed (${res.status})`, res.status);
  }
  return res.blob();
}
```

Note: `apiFetch` (from `lib/api-client.ts`) always calls `res.json()` on success — it cannot handle a binary response, which is why `downloadPhaseMapperRun` uses a plain `fetch` call directly instead, mirroring `apiFetch`'s own auth-header pattern by hand.

- [ ] **Step 2: Type-check**

Run: `npx tsc --noEmit` from `web-frontend`
Expected: no errors (this file has no consumers yet, so it just needs to compile standalone)

- [ ] **Step 3: Commit**

```bash
git add lib/phase-mapper-api-client.ts
git commit -m "feat: add phase-mapper API client functions"
```

---

### Task 2: Nav entry, route, and library list/create

**Files:**
- Modify: `components/AppNav.tsx`
- Create: `app/(app)/phase-mapper/page.tsx`
- Create: `components/pages/PhaseMapperPageClient.tsx`

**Interfaces:**
- Consumes: `createPhaseMapperLibrary`, `listPhaseMapperLibraries`, `PhaseMapperLibrary` (Task 1)
- Produces (used by Tasks 3-9, all of which modify this file): `PhaseMapperPageClient` — a `"use client"` component with `libraries: PhaseMapperLibrary[]`, `selectedLibraryId: number | null` state and a `selectedLibrary` derived value; later tasks add `selectedRun` state and the `Tabs` panel.

- [ ] **Step 1: Add the nav entry**

In `components/AppNav.tsx`, add one line to the `ITEMS` array (after the `"ML Models"` entry, before `"Analysis"` — anywhere in the array works functionally, but this keeps it near the other domain-specific pages rather than the tools/settings section):

```typescript
  { href: "/phase-mapper",         label: "Phase Mapper", icon: "bi-grid-3x3-gap-fill" },
```

- [ ] **Step 2: Create the route**

```typescript
import { PhaseMapperPageClient } from "@/components/pages/PhaseMapperPageClient";

export default function PhaseMapperPage() {
  return <PhaseMapperPageClient />;
}
```

- [ ] **Step 3: Create the client component**

```typescript
"use client";

import { useCallback, useEffect, useState } from "react";

import { Alert, Button, FormField, StreamlitPage, TextInput } from "@/components/ui";
import {
  createPhaseMapperLibrary,
  listPhaseMapperLibraries,
  type PhaseMapperLibrary,
} from "@/lib/phase-mapper-api-client";
import { useAccessToken } from "@/lib/use-access-token";

export function PhaseMapperPageClient() {
  const token = useAccessToken();
  const [libraries, setLibraries] = useState<PhaseMapperLibrary[]>([]);
  const [selectedLibraryId, setSelectedLibraryId] = useState<number | null>(null);
  const [newLibraryName, setNewLibraryName] = useState("");
  const [creating, setCreating] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const loadLibraries = useCallback(async () => {
    if (!token) return;
    try {
      const libs = await listPhaseMapperLibraries(token);
      setLibraries(libs);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to load libraries");
    }
  }, [token]);

  useEffect(() => {
    void loadLibraries();
  }, [loadLibraries]);

  async function onCreateLibrary() {
    if (!newLibraryName.trim()) return;
    setCreating(true);
    setError(null);
    try {
      const lib = await createPhaseMapperLibrary(token, newLibraryName.trim());
      setNewLibraryName("");
      await loadLibraries();
      setSelectedLibraryId(lib.id);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to create library");
    } finally {
      setCreating(false);
    }
  }

  const selectedLibrary = libraries.find((l) => l.id === selectedLibraryId) ?? null;

  return (
    <StreamlitPage
      title="Phase Mapper"
      icon="🧪"
      description="Predicts XRD-derived phase labels from optical measurements and recommends next film-XRD wells."
      layout="wide"
    >
      <div className="flex flex-col gap-6 md:flex-row">
        <div className="w-full shrink-0 space-y-4 md:w-72">
          <FormField label="New library name">
            <TextInput
              value={newLibraryName}
              onChange={(e) => setNewLibraryName(e.target.value)}
              placeholder="e.g. DMA-Rb"
            />
          </FormField>
          <Button onClick={() => void onCreateLibrary()} disabled={creating || !newLibraryName.trim()} fullWidth>
            {creating ? "Creating…" : "Create library"}
          </Button>

          {error ? <Alert variant="error">{error}</Alert> : null}

          <div className="space-y-1">
            <p className="text-xs font-medium uppercase tracking-wide text-[var(--st-muted)]">Libraries</p>
            {libraries.length === 0 ? (
              <p className="text-sm text-[var(--st-muted)]">No libraries yet.</p>
            ) : (
              <ul className="space-y-1">
                {libraries.map((lib) => (
                  <li key={lib.id}>
                    <button
                      type="button"
                      onClick={() => setSelectedLibraryId(lib.id)}
                      className={`w-full rounded-[var(--st-radius-sm)] px-3 py-2 text-left text-sm transition ${
                        lib.id === selectedLibraryId
                          ? "bg-[var(--st-nav-active-bg)] text-[var(--st-nav-active-text)]"
                          : "text-[var(--st-text)] hover:bg-[var(--st-hover)]"
                      }`}
                    >
                      {lib.name}
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </div>

        <div className="min-w-0 flex-1">
          {selectedLibrary ? (
            <p className="text-sm text-[var(--st-muted)]">
              Selected: {selectedLibrary.name} (uploads and run controls arrive in later tasks)
            </p>
          ) : (
            <p className="text-sm text-[var(--st-muted)]">Select or create a library to get started.</p>
          )}
        </div>
      </div>
    </StreamlitPage>
  );
}
```

- [ ] **Step 4: Type-check and lint**

Run: `npx tsc --noEmit && npm run lint` from `web-frontend`
Expected: no errors

- [ ] **Step 5: Manual verification**

With the dev stack running (backend on :8080, frontend on :3000): open `http://localhost:3000/phase-mapper`. Confirm "Phase Mapper" appears in the left nav and is clickable. Type a name into "New library name", click "Create library" — confirm it appears in the Libraries list and becomes selected (highlighted), and the right pane shows "Selected: <name>". Click a different library in the list (create a second one first if needed) and confirm the selection and right-pane text update.

- [ ] **Step 6: Commit**

```bash
git add components/AppNav.tsx "app/(app)/phase-mapper/page.tsx" components/pages/PhaseMapperPageClient.tsx
git commit -m "feat: add phase-mapper nav entry and library list/create page"
```

---

### Task 3: Upload panel

**Files:**
- Create: `components/phase-mapper/UploadPanel.tsx`
- Modify: `components/pages/PhaseMapperPageClient.tsx`

**Interfaces:**
- Consumes: `uploadPhaseMapperFile` (Task 1)
- Produces: `UploadPanel({ libraryId, onUploaded }: { libraryId: number; onUploaded: () => void })` — used by `PhaseMapperPageClient`

- [ ] **Step 1: Create the upload panel**

```typescript
"use client";

import { useState } from "react";

import { Alert, FormField } from "@/components/ui";
import { uploadPhaseMapperFile } from "@/lib/phase-mapper-api-client";
import { useAccessToken } from "@/lib/use-access-token";

type UploadKind = "composition" | "plate_reader";

export function UploadPanel({ libraryId, onUploaded }: { libraryId: number; onUploaded: () => void }) {
  const token = useAccessToken();
  const [busy, setBusy] = useState<UploadKind | null>(null);
  const [warnings, setWarnings] = useState<string[]>([]);
  const [error, setError] = useState<string | null>(null);

  async function handleUpload(kind: UploadKind, file: File | null) {
    if (!file) return;
    setBusy(kind);
    setError(null);
    setWarnings([]);
    try {
      const result = await uploadPhaseMapperFile(token, libraryId, kind, file);
      setWarnings(result.warnings);
      onUploaded();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Upload failed");
    } finally {
      setBusy(null);
    }
  }

  return (
    <div className="space-y-4">
      {error ? <Alert variant="error">{error}</Alert> : null}
      {warnings.map((w) => (
        <Alert key={w} variant="warning">
          {w}
        </Alert>
      ))}
      <FormField label="Composition map (CSV)" help="Must include a 'well' column">
        <input
          type="file"
          accept=".csv"
          disabled={busy !== null}
          className="w-full text-sm file:mr-4 file:rounded-md file:border-0 file:bg-[var(--st-primary)] file:px-4 file:py-2 file:text-white"
          onChange={(e) => void handleUpload("composition", e.target.files?.[0] ?? null)}
        />
        {busy === "composition" ? <p className="mt-1 text-xs text-[var(--st-muted)]">Uploading…</p> : null}
      </FormField>
      <FormField label="Plate-reader workbook" help="CSV or Excel export from the reader">
        <input
          type="file"
          accept=".csv,.xlsx,.xls"
          disabled={busy !== null}
          className="w-full text-sm file:mr-4 file:rounded-md file:border-0 file:bg-[var(--st-primary)] file:px-4 file:py-2 file:text-white"
          onChange={(e) => void handleUpload("plate_reader", e.target.files?.[0] ?? null)}
        />
        {busy === "plate_reader" ? <p className="mt-1 text-xs text-[var(--st-muted)]">Uploading…</p> : null}
      </FormField>
    </div>
  );
}
```

- [ ] **Step 2: Wire it into `PhaseMapperPageClient`**

Add the import (alongside the existing `@/lib/phase-mapper-api-client` import block):

```typescript
import { UploadPanel } from "@/components/phase-mapper/UploadPanel";
```

Add state for an upload notice, just below the existing `const [error, setError] = useState<string | null>(null);` line:

```typescript
  const [uploadNotice, setUploadNotice] = useState<string | null>(null);
```

(this requires no new import — `useState` is already imported)

Replace the placeholder right-pane block:

```typescript
        <div className="min-w-0 flex-1">
          {selectedLibrary ? (
            <p className="text-sm text-[var(--st-muted)]">
              Selected: {selectedLibrary.name} (uploads and run controls arrive in later tasks)
            </p>
          ) : (
            <p className="text-sm text-[var(--st-muted)]">Select or create a library to get started.</p>
          )}
        </div>
```

with:

```typescript
        <div className="min-w-0 flex-1 space-y-4">
          {selectedLibrary ? (
            <>
              <h3 className="text-sm font-semibold text-[var(--st-text)]">{selectedLibrary.name}</h3>
              {uploadNotice ? <Alert variant="success">{uploadNotice}</Alert> : null}
              <UploadPanel
                libraryId={selectedLibrary.id}
                onUploaded={() => setUploadNotice("Upload received. Run the pipeline when ready.")}
              />
            </>
          ) : (
            <p className="text-sm text-[var(--st-muted)]">Select or create a library to get started.</p>
          )}
        </div>
```

- [ ] **Step 3: Type-check and lint**

Run: `npx tsc --noEmit && npm run lint` from `web-frontend`
Expected: no errors

- [ ] **Step 4: Manual verification**

Select a library. Upload `backend-api/tests/phase_mapper/fixtures/composition_map_fixture.csv` as the composition file — confirm the green "Upload received" notice appears (this fixture is a valid 2-well composition map, so no warnings). Upload `plate_reader_fixture.csv` as the plate-reader file — confirm the same. Then try uploading a composition CSV with no `well` column (create a throwaway one-line file like `not_well,x\na,1\n`) — confirm a red error Alert appears with the backend's actual error message, not a generic failure.

- [ ] **Step 5: Commit**

```bash
git add components/phase-mapper/UploadPanel.tsx components/pages/PhaseMapperPageClient.tsx
git commit -m "feat: add phase-mapper upload panel"
```

---

### Task 4: Run controls (start, poll, stuck-run recovery)

**Files:**
- Create: `components/phase-mapper/RunControls.tsx`
- Modify: `components/pages/PhaseMapperPageClient.tsx`

**Interfaces:**
- Consumes: `startPhaseMapperRun`, `getPhaseMapperRun`, `deletePhaseMapperRun`, `listPhaseMapperRuns`, `PhaseMapperRun` (Task 1)
- Produces: `RunControls({ libraryId, run, onRunChanged }: { libraryId: number; run: PhaseMapperRun | null; onRunChanged: (run: PhaseMapperRun | null) => void })`; `PhaseMapperPageClient` gains `selectedRun: PhaseMapperRun | null` state, which every later task's result panels are keyed on.

- [ ] **Step 1: Create the run-controls component**

```typescript
"use client";

import { useCallback, useEffect, useRef, useState } from "react";

import { Alert, Button } from "@/components/ui";
import { deletePhaseMapperRun, getPhaseMapperRun, startPhaseMapperRun, type PhaseMapperRun } from "@/lib/phase-mapper-api-client";
import { useAccessToken } from "@/lib/use-access-token";

const POLL_INTERVAL_MS = 3_000;
const MAX_POLLS = 200; // ~10 minutes at 3s/poll

export function RunControls({
  libraryId,
  run,
  onRunChanged,
}: {
  libraryId: number;
  run: PhaseMapperRun | null;
  onRunChanged: (run: PhaseMapperRun | null) => void;
}) {
  const token = useAccessToken();
  const [starting, setStarting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [stalled, setStalled] = useState(false);
  const pollCountRef = useRef(0);

  const poll = useCallback(
    async (runId: number) => {
      try {
        const updated = await getPhaseMapperRun(token, runId);
        onRunChanged(updated);
      } catch (e) {
        setError(e instanceof Error ? e.message : "Failed to check run status");
      }
    },
    [token, onRunChanged],
  );

  useEffect(() => {
    if (!run || run.status !== "running") {
      pollCountRef.current = 0;
      setStalled(false);
      return;
    }
    const interval = setInterval(() => {
      pollCountRef.current += 1;
      if (pollCountRef.current > MAX_POLLS) {
        setStalled(true);
        clearInterval(interval);
        return;
      }
      void poll(run.id);
    }, POLL_INTERVAL_MS);
    return () => clearInterval(interval);
  }, [run, poll]);

  async function onStartRun() {
    setStarting(true);
    setError(null);
    setStalled(false);
    try {
      const newRun = await startPhaseMapperRun(token, libraryId);
      onRunChanged(newRun);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to start run");
    } finally {
      setStarting(false);
    }
  }

  async function onDeleteStuckRun() {
    if (!run) return;
    try {
      await deletePhaseMapperRun(token, run.id);
      onRunChanged(null);
      setStalled(false);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to delete run");
    }
  }

  const isRunning = run?.status === "running";

  return (
    <div className="space-y-2">
      {error ? <Alert variant="error">{error}</Alert> : null}
      <div className="flex flex-wrap items-center gap-3">
        <Button onClick={() => void onStartRun()} disabled={starting || isRunning}>
          {isRunning ? "Run in progress…" : starting ? "Starting…" : "Run Pipeline"}
        </Button>
        {run ? (
          <span className="text-sm text-[var(--st-muted)]">
            Latest run: <strong>{run.status}</strong>
            {run.status === "failed" && run.error_message ? ` — ${run.error_message}` : ""}
          </span>
        ) : null}
      </div>
      {stalled ? (
        <Alert variant="warning">
          This run has been in progress for over 10 minutes without finishing — it may have failed silently.{" "}
          <button type="button" onClick={() => void onDeleteStuckRun()} className="font-medium underline">
            Delete this run
          </button>{" "}
          and try again.
        </Alert>
      ) : null}
    </div>
  );
}
```

- [ ] **Step 2: Wire it into `PhaseMapperPageClient`**

Add to the imports:

```typescript
import { RunControls } from "@/components/phase-mapper/RunControls";
import { listPhaseMapperRuns, type PhaseMapperRun } from "@/lib/phase-mapper-api-client";
```

(merge `type PhaseMapperRun` and `listPhaseMapperRuns` into the existing `from "@/lib/phase-mapper-api-client"` import line rather than duplicating it)

Add state, below the `uploadNotice` state added in Task 3:

```typescript
  const [selectedRun, setSelectedRun] = useState<PhaseMapperRun | null>(null);
```

Add a function to load the latest run for a library, and call it whenever the selected library changes. Replace:

```typescript
                    <button
                      type="button"
                      onClick={() => setSelectedLibraryId(lib.id)}
```

with:

```typescript
                    <button
                      type="button"
                      onClick={() => void onSelectLibrary(lib.id)}
```

Then add the `onSelectLibrary` function, just above the `return (` statement:

```typescript
  async function onSelectLibrary(libraryId: number) {
    setSelectedLibraryId(libraryId);
    setUploadNotice(null);
    setSelectedRun(null);
    try {
      const runs = await listPhaseMapperRuns(token, libraryId);
      setSelectedRun(runs[0] ?? null);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to load run history");
    }
  }
```

Finally, add `<RunControls />` into the right pane, right after the `<UploadPanel ... />` element:

```typescript
              <UploadPanel
                libraryId={selectedLibrary.id}
                onUploaded={() => setUploadNotice("Upload received. Run the pipeline when ready.")}
              />
              <RunControls libraryId={selectedLibrary.id} run={selectedRun} onRunChanged={setSelectedRun} />
```

- [ ] **Step 3: Type-check and lint**

Run: `npx tsc --noEmit && npm run lint` from `web-frontend`
Expected: no errors

- [ ] **Step 4: Manual verification**

With a library that has both fixture files uploaded (from Task 3), click "Run Pipeline". Confirm the button becomes disabled and shows "Run in progress…", and "Latest run: running" appears. Wait a few seconds (the fixture pipeline run completes in a few seconds per the backend's own e2e test) and confirm the status updates to "Latest run: succeeded" without a page reload. Click "Run Pipeline" again while a run is still shown as running (if you can catch it) — or start a run and immediately try again — confirm the button is disabled and/or a clear error surfaces rather than a silent failure.

- [ ] **Step 5: Commit**

```bash
git add components/phase-mapper/RunControls.tsx components/pages/PhaseMapperPageClient.tsx
git commit -m "feat: add phase-mapper run controls with polling and stuck-run recovery"
```

---

### Task 5: Generic result table + four simple tabs

**Files:**
- Create: `components/phase-mapper/ResultTablePanel.tsx`
- Modify: `components/pages/PhaseMapperPageClient.tsx`

**Interfaces:**
- Consumes: `getPhaseMapperReads`, `getPhaseMapperPredictions`, `getPhaseMapperXrdRecommendations`, `getPhaseMapperRemeasurement` (Task 1), `selectedRun` (Task 4)
- Produces: `ResultTablePanel({ runId, fetchRecords, emptyMessage }: { runId: number; fetchRecords: (token: string | null, runId: number) => Promise<Record<string, unknown>[]>; emptyMessage: string })` — reused as-is by Tasks 5, and by reference for the shape Tasks 6-9's panels follow (though those have more specific logic, not just this generic component).

- [ ] **Step 1: Create the generic table panel**

```typescript
"use client";

import { useEffect, useState } from "react";

import { Alert } from "@/components/ui";
import { useAccessToken } from "@/lib/use-access-token";

export function ResultTablePanel({
  runId,
  fetchRecords,
  emptyMessage,
}: {
  runId: number;
  fetchRecords: (token: string | null, runId: number) => Promise<Record<string, unknown>[]>;
  emptyMessage: string;
}) {
  const token = useAccessToken();
  const [rows, setRows] = useState<Record<string, unknown>[] | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    setRows(null);
    setError(null);
    fetchRecords(token, runId)
      .then((data) => {
        if (!cancelled) setRows(data);
      })
      .catch((e) => {
        if (!cancelled) setError(e instanceof Error ? e.message : "Failed to load");
      });
    return () => {
      cancelled = true;
    };
  }, [token, runId, fetchRecords]);

  if (error) return <Alert variant="error">{error}</Alert>;
  if (rows === null) return <p className="text-sm text-[var(--st-muted)]">Loading…</p>;
  if (rows.length === 0) return <p className="text-sm text-[var(--st-muted)]">{emptyMessage}</p>;

  const columns = Object.keys(rows[0]);

  return (
    <div className="max-h-[32rem] overflow-auto rounded-md border border-[var(--st-border)]">
      <table className="w-full min-w-[600px] border-collapse text-xs">
        <thead className="sticky top-0 bg-[var(--st-surface)]">
          <tr>
            {columns.map((c) => (
              <th key={c} className="border border-[var(--st-border)] px-2 py-1 text-left font-medium">
                {c}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((row, i) => (
            <tr key={i}>
              {columns.map((c) => (
                <td key={c} className="border border-[var(--st-border)] px-2 py-1">
                  {row[c] == null ? "" : String(row[c])}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
```

- [ ] **Step 2: Wire the Tabs shell with four panels into `PhaseMapperPageClient`**

Add to the imports:

```typescript
import { ResultTablePanel } from "@/components/phase-mapper/ResultTablePanel";
import { Tabs } from "@/components/ui";
import {
  getPhaseMapperPredictions,
  getPhaseMapperReads,
  getPhaseMapperRemeasurement,
  getPhaseMapperXrdRecommendations,
} from "@/lib/phase-mapper-api-client";
```

(`Tabs` should be merged into the existing `from "@/components/ui"` import line, not duplicated; the four `getPhaseMapper...` functions should be merged into the existing `from "@/lib/phase-mapper-api-client"` import line)

Add the Tabs block right after the `<RunControls ... />` element added in Task 4, still inside the `selectedLibrary ? (<> ... </>)` branch:

```typescript
              {selectedRun && selectedRun.status === "succeeded" ? (
                <Tabs
                  items={[
                    {
                      label: "Reads",
                      content: (
                        <ResultTablePanel
                          runId={selectedRun.id}
                          fetchRecords={getPhaseMapperReads}
                          emptyMessage="No reads parsed for this run."
                        />
                      ),
                    },
                    {
                      label: "Predictions",
                      content: (
                        <ResultTablePanel
                          runId={selectedRun.id}
                          fetchRecords={getPhaseMapperPredictions}
                          emptyMessage="No predictions available for this run."
                        />
                      ),
                    },
                    {
                      label: "XRD Recommendations",
                      content: (
                        <ResultTablePanel
                          runId={selectedRun.id}
                          fetchRecords={getPhaseMapperXrdRecommendations}
                          emptyMessage="No XRD recommendations for this run."
                        />
                      ),
                    },
                    {
                      label: "Remeasurement",
                      content: (
                        <ResultTablePanel
                          runId={selectedRun.id}
                          fetchRecords={getPhaseMapperRemeasurement}
                          emptyMessage="No remeasurement recommendations for this run."
                        />
                      ),
                    },
                  ]}
                  scrollable
                />
              ) : null}
```

- [ ] **Step 3: Type-check and lint**

Run: `npx tsc --noEmit && npm run lint` from `web-frontend`
Expected: no errors

- [ ] **Step 4: Manual verification**

With a library that has a succeeded run (from Task 4), confirm the tab strip appears below the run controls with "Reads", "Predictions", "XRD Recommendations", "Remeasurement". Click each tab and confirm it shows a real table with column headers and at least one data row (the fixture's 2-well composition map produces real, if small, output for all four). Confirm switching tabs doesn't re-fetch data that's already loaded (each panel keeps its own state once mounted, per `Tabs`'s existing behavior of only rendering the active panel).

- [ ] **Step 5: Commit**

```bash
git add components/phase-mapper/ResultTablePanel.tsx components/pages/PhaseMapperPageClient.tsx
git commit -m "feat: add phase-mapper Reads/Predictions/XRD Recommendations/Remeasurement tabs"
```

---

### Task 6: Optical Spectra tab

**Files:**
- Create: `components/phase-mapper/OpticalSpectraPanel.tsx`
- Modify: `components/pages/PhaseMapperPageClient.tsx`

**Interfaces:**
- Consumes: `getPhaseMapperOpticalSpectra` (Task 1)
- Produces: `OpticalSpectraPanel({ runId }: { runId: number })`, added as a fifth `Tabs` item

This is a chart component — per the Global Constraints, it follows the dataviz skill: a single series (one well's spectrum) uses the app's own `--st-primary` token rather than an unrelated hue (a lone series carries its identity via the panel's own well-picker/title, not a legend), a 2px line, and a crosshair/tooltip on hover per the skill's interaction requirement for line charts.

- [ ] **Step 1: Create the panel**

```typescript
"use client";

import { useEffect, useMemo, useState } from "react";

import { Alert, Select } from "@/components/ui";
import { getPhaseMapperOpticalSpectra } from "@/lib/phase-mapper-api-client";
import { useAccessToken } from "@/lib/use-access-token";

type SpectrumRow = {
  well?: string;
  wavelength_nm?: number;
  signal?: number;
};

export function OpticalSpectraPanel({ runId }: { runId: number }) {
  const token = useAccessToken();
  const [rows, setRows] = useState<SpectrumRow[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [selectedWell, setSelectedWell] = useState<string>("");
  const [hoverIndex, setHoverIndex] = useState<number | null>(null);

  useEffect(() => {
    let cancelled = false;
    setRows(null);
    setError(null);
    getPhaseMapperOpticalSpectra(token, runId)
      .then((data) => {
        if (cancelled) return;
        const typed = data as SpectrumRow[];
        setRows(typed);
        const firstWell = typed.find((r) => r.well)?.well;
        if (firstWell) setSelectedWell(firstWell);
      })
      .catch((e) => {
        if (!cancelled) setError(e instanceof Error ? e.message : "Failed to load spectra");
      });
    return () => {
      cancelled = true;
    };
  }, [token, runId]);

  const wells = useMemo(() => {
    if (!rows) return [];
    return Array.from(new Set(rows.map((r) => r.well).filter((w): w is string => Boolean(w)))).sort();
  }, [rows]);

  const points = useMemo(() => {
    if (!rows || !selectedWell) return [];
    return rows
      .filter((r) => r.well === selectedWell && r.wavelength_nm != null && r.signal != null)
      .sort((a, b) => (a.wavelength_nm ?? 0) - (b.wavelength_nm ?? 0));
  }, [rows, selectedWell]);

  if (error) return <Alert variant="error">{error}</Alert>;
  if (rows === null) return <p className="text-sm text-[var(--st-muted)]">Loading…</p>;
  if (rows.length === 0) {
    return <p className="text-sm text-[var(--st-muted)]">No optical spectra saved for this run.</p>;
  }

  const width = 640;
  const height = 280;
  const padding = 36;
  const xs = points.map((p) => p.wavelength_nm ?? 0);
  const ys = points.map((p) => p.signal ?? 0);
  const xMin = xs.length ? Math.min(...xs) : 0;
  const xMax = xs.length ? Math.max(...xs) : 1;
  const yMin = Math.min(0, ...ys);
  const yMax = Math.max(...ys, 1);
  const scaleX = (x: number) => padding + ((x - xMin) / (xMax - xMin || 1)) * (width - 2 * padding);
  const scaleY = (y: number) => height - padding - ((y - yMin) / (yMax - yMin || 1)) * (height - 2 * padding);
  const path = points
    .map((p, i) => `${i === 0 ? "M" : "L"}${scaleX(p.wavelength_nm ?? 0)},${scaleY(p.signal ?? 0)}`)
    .join(" ");
  const hovered = hoverIndex != null ? points[hoverIndex] : null;

  return (
    <div className="space-y-4">
      <div className="max-w-xs">
        <Select
          value={selectedWell}
          onChange={(e) => setSelectedWell(e.target.value)}
          options={wells.map((w) => ({ value: w, label: w }))}
        />
      </div>
      {points.length === 0 ? (
        <p className="text-sm text-[var(--st-muted)]">No spectrum points for this well.</p>
      ) : (
        <svg
          viewBox={`0 0 ${width} ${height}`}
          className="w-full max-w-2xl rounded-md border border-[var(--st-border)] bg-[var(--st-surface)]"
          onMouseLeave={() => setHoverIndex(null)}
        >
          <line
            x1={padding}
            y1={height - padding}
            x2={width - padding}
            y2={height - padding}
            stroke="var(--st-border)"
          />
          <path d={path} fill="none" stroke="var(--st-primary)" strokeWidth={2} strokeLinejoin="round" />
          {hovered ? (
            <line
              x1={scaleX(hovered.wavelength_nm ?? 0)}
              y1={padding}
              x2={scaleX(hovered.wavelength_nm ?? 0)}
              y2={height - padding}
              stroke="var(--st-muted)"
              strokeDasharray="3,3"
            />
          ) : null}
          {points.map((p, i) => (
            <circle
              key={i}
              cx={scaleX(p.wavelength_nm ?? 0)}
              cy={scaleY(p.signal ?? 0)}
              r={hoverIndex === i ? 4 : 8}
              fill={hoverIndex === i ? "var(--st-primary)" : "transparent"}
              onMouseEnter={() => setHoverIndex(i)}
            />
          ))}
          <text x={padding} y={height - padding + 16} className="fill-[var(--st-muted)] text-[10px]">
            {xMin} nm
          </text>
          <text x={width - padding} y={height - padding + 16} textAnchor="end" className="fill-[var(--st-muted)] text-[10px]">
            {xMax} nm
          </text>
        </svg>
      )}
      {hovered ? (
        <p className="text-sm text-[var(--st-text)]">
          {hovered.wavelength_nm} nm — signal {hovered.signal}
        </p>
      ) : (
        <p className="text-sm text-[var(--st-muted)]">Hover the line to see exact values.</p>
      )}
    </div>
  );
}
```

- [ ] **Step 2: Add the fifth tab**

Add the import:

```typescript
import { OpticalSpectraPanel } from "@/components/phase-mapper/OpticalSpectraPanel";
```

Add a fifth item to the `Tabs`' `items` array, right after the `"Remeasurement"` item:

```typescript
                    {
                      label: "Optical Spectra",
                      content: <OpticalSpectraPanel runId={selectedRun.id} />,
                    },
```

- [ ] **Step 3: Type-check and lint**

Run: `npx tsc --noEmit && npm run lint` from `web-frontend`
Expected: no errors

- [ ] **Step 4: Manual verification**

Open the "Optical Spectra" tab for a succeeded run. Confirm a well dropdown appears with real well IDs (A1, A2 for the 2-well fixture) and a line chart renders for the first one. Switch the dropdown to the other well and confirm the chart redraws. Hover over the line and confirm a vertical dashed crosshair appears, the hovered point highlights, and the wavelength/signal values below the chart update to match where you're hovering.

- [ ] **Step 5: Commit**

```bash
git add components/phase-mapper/OpticalSpectraPanel.tsx components/pages/PhaseMapperPageClient.tsx
git commit -m "feat: add phase-mapper Optical Spectra tab"
```

---

### Task 7: Heatmaps tab

**Files:**
- Create: `components/phase-mapper/HeatmapPanel.tsx`
- Modify: `components/pages/PhaseMapperPageClient.tsx`

**Interfaces:**
- Consumes: `getPhaseMapperHeatmaps`, `PhaseMapperHeatmaps` (Task 1)
- Produces: `HeatmapPanel({ runId }: { runId: number })`, added as a sixth `Tabs` item

This is the plan's other chart component. Per the Global Constraints, it uses the dataviz skill's validated sequential single-hue (blue) ramp from `references/palette.md` (12 steps, light→dark, given verbatim below — these are the skill's own pre-validated reference values, not derived or eyeballed) for magnitude encoding, with per-cell text color computed from the cell's own step (not the page theme) so the grid reads consistently regardless of light/dark mode, a hover tooltip, and a min/max legend strip.

- [ ] **Step 1: Create the panel**

```typescript
"use client";

import { useEffect, useMemo, useState } from "react";

import { Alert, Select } from "@/components/ui";
import { getPhaseMapperHeatmaps, type PhaseMapperHeatmaps } from "@/lib/phase-mapper-api-client";
import { useAccessToken } from "@/lib/use-access-token";

// Sequential single-hue (blue) ramp, light->dark, from the dataviz skill's
// validated reference palette (references/palette.md) — used for magnitude
// encoding on the 96-well grid. Text color per cell is computed from the
// cell's own step (below), not the page theme, so the grid reads
// consistently in both light and dark mode without a separate dark ramp.
const SEQUENTIAL_RAMP = [
  "#cde2fb", "#b7d3f6", "#9ec5f4", "#86b6ef", "#6da7ec", "#5598e7",
  "#3987e5", "#2a78d6", "#256abf", "#1c5cab", "#184f95", "#104281", "#0d366b",
];
const DARK_TEXT_FROM_STEP = 6; // steps 0-5 get dark text, 6+ get white text

function stepForValue(value: number, min: number, max: number): number {
  if (max <= min) return 0;
  const t = Math.min(1, Math.max(0, (value - min) / (max - min)));
  return Math.round(t * (SEQUENTIAL_RAMP.length - 1));
}

const WELL_ROWS = ["A", "B", "C", "D", "E", "F", "G", "H"];
const WELL_COLS = Array.from({ length: 12 }, (_, i) => i + 1);

export function HeatmapPanel({ runId }: { runId: number }) {
  const token = useAccessToken();
  const [data, setData] = useState<PhaseMapperHeatmaps | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [metric, setMetric] = useState<string>("");
  const [hovered, setHovered] = useState<{ well: string; value: number } | null>(null);

  useEffect(() => {
    let cancelled = false;
    setData(null);
    setError(null);
    getPhaseMapperHeatmaps(token, runId)
      .then((result) => {
        if (cancelled) return;
        setData(result);
        if (result.columns.length > 0) setMetric(result.columns[0]);
      })
      .catch((e) => {
        if (!cancelled) setError(e instanceof Error ? e.message : "Failed to load heatmap data");
      });
    return () => {
      cancelled = true;
    };
  }, [token, runId]);

  const wellValues = useMemo(() => {
    if (!data || !metric) return new Map<string, number>();
    const map = new Map<string, number>();
    for (const well of data.wells) {
      const wellId = well.well as string | undefined;
      const value = well[metric];
      if (wellId && typeof value === "number") map.set(wellId, value);
    }
    return map;
  }, [data, metric]);

  const { min, max } = useMemo(() => {
    const values = Array.from(wellValues.values());
    if (values.length === 0) return { min: 0, max: 1 };
    return { min: Math.min(...values), max: Math.max(...values) };
  }, [wellValues]);

  if (error) return <Alert variant="error">{error}</Alert>;
  if (data === null) return <p className="text-sm text-[var(--st-muted)]">Loading…</p>;
  if (data.columns.length === 0) {
    return <p className="text-sm text-[var(--st-muted)]">No heatmap metrics available for this run.</p>;
  }

  const cellSize = 44;
  const labelGutter = 24;
  const width = labelGutter + WELL_COLS.length * cellSize;
  const height = labelGutter + WELL_ROWS.length * cellSize;

  return (
    <div className="space-y-4">
      <div className="max-w-sm">
        <Select
          value={metric}
          onChange={(e) => setMetric(e.target.value)}
          options={data.columns.map((c) => ({ value: c, label: c }))}
        />
      </div>
      <div className="flex items-center gap-2 text-xs text-[var(--st-muted)]">
        <span
          className="inline-block h-3 w-3 rounded-sm border border-[var(--st-border)]"
          style={{ background: SEQUENTIAL_RAMP[0] }}
        />
        {min.toFixed(2)}
        <span
          className="mx-1 h-3 w-24 rounded-sm"
          style={{ background: `linear-gradient(to right, ${SEQUENTIAL_RAMP[0]}, ${SEQUENTIAL_RAMP[SEQUENTIAL_RAMP.length - 1]})` }}
        />
        {max.toFixed(2)}
        <span
          className="inline-block h-3 w-3 rounded-sm border border-[var(--st-border)]"
          style={{ background: SEQUENTIAL_RAMP[SEQUENTIAL_RAMP.length - 1] }}
        />
      </div>
      <div className="overflow-x-auto">
        <svg viewBox={`0 0 ${width} ${height}`} className="w-full max-w-2xl" style={{ minWidth: width }}>
          {WELL_COLS.map((col) => (
            <text
              key={`col-${col}`}
              x={labelGutter + (col - 0.5) * cellSize}
              y={labelGutter - 8}
              textAnchor="middle"
              className="fill-[var(--st-muted)] text-[10px]"
            >
              {col}
            </text>
          ))}
          {WELL_ROWS.map((row, rowIndex) => (
            <text
              key={`row-${row}`}
              x={labelGutter - 8}
              y={labelGutter + (rowIndex + 0.65) * cellSize}
              textAnchor="end"
              className="fill-[var(--st-muted)] text-[10px]"
            >
              {row}
            </text>
          ))}
          {WELL_ROWS.map((row, rowIndex) =>
            WELL_COLS.map((col, colIndex) => {
              const wellId = `${row}${col}`;
              const value = wellValues.get(wellId);
              const step = value == null ? null : stepForValue(value, min, max);
              const fill = step == null ? "var(--st-hover)" : SEQUENTIAL_RAMP[step];
              const textColor = step != null && step >= DARK_TEXT_FROM_STEP ? "#ffffff" : "#0b0b0b";
              return (
                <g
                  key={wellId}
                  onMouseEnter={() => value != null && setHovered({ well: wellId, value })}
                  onMouseLeave={() => setHovered(null)}
                >
                  <rect
                    x={labelGutter + colIndex * cellSize}
                    y={labelGutter + rowIndex * cellSize}
                    width={cellSize - 2}
                    height={cellSize - 2}
                    rx={4}
                    fill={fill}
                    stroke="var(--st-border)"
                  />
                  <text
                    x={labelGutter + colIndex * cellSize + (cellSize - 2) / 2}
                    y={labelGutter + rowIndex * cellSize + (cellSize - 2) / 2 + 4}
                    textAnchor="middle"
                    fontSize={9}
                    fill={textColor}
                  >
                    {value != null ? value.toFixed(2) : ""}
                  </text>
                </g>
              );
            }),
          )}
        </svg>
      </div>
      {hovered ? (
        <p className="text-sm text-[var(--st-text)]">
          <strong>{hovered.well}</strong>: {hovered.value.toFixed(4)} ({metric})
        </p>
      ) : (
        <p className="text-sm text-[var(--st-muted)]">Hover a well to see its exact value.</p>
      )}
    </div>
  );
}
```

- [ ] **Step 2: Add the sixth tab**

Add the import:

```typescript
import { HeatmapPanel } from "@/components/phase-mapper/HeatmapPanel";
```

Add a sixth item to the `Tabs`' `items` array, right after the `"Optical Spectra"` item:

```typescript
                    {
                      label: "Heatmaps",
                      content: <HeatmapPanel runId={selectedRun.id} />,
                    },
```

- [ ] **Step 3: Type-check and lint**

Run: `npx tsc --noEmit && npm run lint` from `web-frontend`
Expected: no errors

- [ ] **Step 4: Manual verification**

Open the "Heatmaps" tab for a succeeded run. Confirm a metric dropdown appears (populated with real column names like `Cs_fraction`, not a hardcoded list) and an 8×12 grid renders with row letters A–H and column numbers 1–12. Confirm wells with data are colored (light-to-dark blue by value) and show a numeric value; wells with no data (most of them, for the 2-well fixture) render as a neutral gray box with no text. Hover a colored cell and confirm the text below the grid updates to that well's exact value and the current metric name. Switch the metric dropdown to a different column and confirm the grid recolors. Confirm the min/max legend strip above the grid shows real numbers, not placeholders.

- [ ] **Step 5: Commit**

```bash
git add components/phase-mapper/HeatmapPanel.tsx components/pages/PhaseMapperPageClient.tsx
git commit -m "feat: add phase-mapper Heatmaps tab"
```

---

### Task 8: Library Runs history tab

**Files:**
- Create: `components/phase-mapper/LibraryRunsPanel.tsx`
- Modify: `components/pages/PhaseMapperPageClient.tsx`

**Interfaces:**
- Consumes: `listPhaseMapperRuns`, `deletePhaseMapperRun`, `PhaseMapperRun` (Task 1)
- Produces: `LibraryRunsPanel({ libraryId, selectedRunId, onSelectRun }: { libraryId: number; selectedRunId: number | null; onSelectRun: (run: PhaseMapperRun) => void })`, added as a seventh `Tabs` item; wires back into `PhaseMapperPageClient`'s `selectedRun` state so "View" on an older run re-drives every other tab.

- [ ] **Step 1: Create the panel**

```typescript
"use client";

import { useEffect, useState } from "react";

import { Alert, Button } from "@/components/ui";
import { deletePhaseMapperRun, listPhaseMapperRuns, type PhaseMapperRun } from "@/lib/phase-mapper-api-client";
import { useAccessToken } from "@/lib/use-access-token";

export function LibraryRunsPanel({
  libraryId,
  selectedRunId,
  onSelectRun,
}: {
  libraryId: number;
  selectedRunId: number | null;
  onSelectRun: (run: PhaseMapperRun) => void;
}) {
  const token = useAccessToken();
  const [runs, setRuns] = useState<PhaseMapperRun[] | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function load() {
    try {
      const data = await listPhaseMapperRuns(token, libraryId);
      setRuns(data);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to load run history");
    }
  }

  useEffect(() => {
    void load();
    // token/libraryId change is the only re-fetch trigger; `load` is
    // recreated each render but doesn't need to be a dependency here.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [token, libraryId]);

  async function onDelete(runId: number) {
    try {
      await deletePhaseMapperRun(token, runId);
      await load();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to delete run");
    }
  }

  if (error) return <Alert variant="error">{error}</Alert>;
  if (runs === null) return <p className="text-sm text-[var(--st-muted)]">Loading…</p>;
  if (runs.length === 0) return <p className="text-sm text-[var(--st-muted)]">No runs yet for this library.</p>;

  return (
    <div className="max-h-[32rem] overflow-auto rounded-md border border-[var(--st-border)]">
      <table className="w-full min-w-[500px] border-collapse text-xs">
        <thead className="sticky top-0 bg-[var(--st-surface)]">
          <tr>
            <th className="border border-[var(--st-border)] px-2 py-1 text-left font-medium">Run</th>
            <th className="border border-[var(--st-border)] px-2 py-1 text-left font-medium">Status</th>
            <th className="border border-[var(--st-border)] px-2 py-1 text-left font-medium">Created</th>
            <th className="border border-[var(--st-border)] px-2 py-1 text-left font-medium">Frozen</th>
            <th className="border border-[var(--st-border)] px-2 py-1 text-left font-medium">Actions</th>
          </tr>
        </thead>
        <tbody>
          {runs.map((run) => (
            <tr key={run.id} className={run.id === selectedRunId ? "bg-[var(--st-hover)]" : undefined}>
              <td className="border border-[var(--st-border)] px-2 py-1">{run.id}</td>
              <td className="border border-[var(--st-border)] px-2 py-1">{run.status}</td>
              <td className="border border-[var(--st-border)] px-2 py-1">{run.created_at}</td>
              <td className="border border-[var(--st-border)] px-2 py-1">{run.frozen ? "yes" : "no"}</td>
              <td className="border border-[var(--st-border)] px-2 py-1">
                <div className="flex gap-2">
                  <Button variant="ghost" onClick={() => onSelectRun(run)}>
                    View
                  </Button>
                  <Button variant="ghost" onClick={() => void onDelete(run.id)}>
                    Delete
                  </Button>
                </div>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
```

- [ ] **Step 2: Add the seventh tab**

Add the import:

```typescript
import { LibraryRunsPanel } from "@/components/phase-mapper/LibraryRunsPanel";
```

Add a seventh item to the `Tabs`' `items` array, right after the `"Heatmaps"` item:

```typescript
                    {
                      label: "Library Runs",
                      content: (
                        <LibraryRunsPanel
                          libraryId={selectedLibrary.id}
                          selectedRunId={selectedRun.id}
                          onSelectRun={setSelectedRun}
                        />
                      ),
                    },
```

- [ ] **Step 3: Type-check and lint**

Run: `npx tsc --noEmit && npm run lint` from `web-frontend`
Expected: no errors

**Known limitation (intentional, not a bug to fix in this task):** `selectedRun` is a single pointer used both for "what `RunControls` is actively polling" and "what the tabs display." Using "View" to switch to an older run while a newer one is still `"running"` will stop that newer run from being polled until it's re-selected (`RunControls`' polling `useEffect` only runs while its `run` prop has `status === "running"`). This matches the reference Streamlit app's own single-threaded-per-session behavior — it isn't clear that app supports "watch old results while a new run cooks" either — and splitting "actively-polled run" from "viewed run" into two separate pointers is real added complexity for a workflow outside this plan's golden path. If this becomes a real user complaint after this ships, that's the fix to make then, not now.

- [ ] **Step 4: Manual verification**

Run the pipeline a second time for the same library (so there are two runs in history). Open "Library Runs" — confirm both runs are listed, newest first, with the currently-selected run's row highlighted. Click "View" on the older run — confirm the highlighted row changes and every other tab (Reads, Predictions, etc.) now reflects that older run's data, not the newest one. Click "Delete" on a run — confirm it disappears from the list; if you deleted the currently-selected run, confirm the other tabs handle a stale/missing run gracefully (they'll show a load error, which is acceptable — re-selecting the library resets `selectedRun`).

- [ ] **Step 5: Commit**

```bash
git add components/phase-mapper/LibraryRunsPanel.tsx components/pages/PhaseMapperPageClient.tsx
git commit -m "feat: add phase-mapper Library Runs history tab"
```

---

### Task 9: Downloads tab

**Files:**
- Create: `components/phase-mapper/DownloadPanel.tsx`
- Modify: `components/pages/PhaseMapperPageClient.tsx`

**Interfaces:**
- Consumes: `downloadPhaseMapperRun` (Task 1)
- Produces: `DownloadPanel({ runId }: { runId: number })`, added as the eighth and final `Tabs` item

- [ ] **Step 1: Create the panel**

```typescript
"use client";

import { useState } from "react";

import { Alert, Button } from "@/components/ui";
import { downloadPhaseMapperRun } from "@/lib/phase-mapper-api-client";
import { useAccessToken } from "@/lib/use-access-token";

export function DownloadPanel({ runId }: { runId: number }) {
  const token = useAccessToken();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function onDownload() {
    setBusy(true);
    setError(null);
    try {
      const blob = await downloadPhaseMapperRun(token, runId);
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `phase_mapper_run_${runId}_outputs.zip`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      URL.revokeObjectURL(url);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Download failed");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="space-y-2">
      {error ? <Alert variant="error">{error}</Alert> : null}
      <Button onClick={() => void onDownload()} disabled={busy}>
        {busy ? "Preparing download…" : "Download run outputs (ZIP)"}
      </Button>
    </div>
  );
}
```

- [ ] **Step 2: Add the eighth tab**

Add the import:

```typescript
import { DownloadPanel } from "@/components/phase-mapper/DownloadPanel";
```

Add an eighth item to the `Tabs`' `items` array, right after the `"Library Runs"` item:

```typescript
                    {
                      label: "Downloads",
                      content: <DownloadPanel runId={selectedRun.id} />,
                    },
```

- [ ] **Step 3: Type-check and lint**

Run: `npx tsc --noEmit && npm run lint` from `web-frontend`
Expected: no errors

- [ ] **Step 4: Manual verification**

Open "Downloads" for a succeeded run and click "Download run outputs (ZIP)". Confirm the browser downloads a file named `phase_mapper_run_<id>_outputs.zip` and that it's a real, non-empty ZIP (open it — it should contain CSVs like `parsed_reads_summary.csv`, and per the backend's own fix, it should NOT contain `job_payload.json` or `run.log`).

- [ ] **Step 5: Commit**

```bash
git add components/phase-mapper/DownloadPanel.tsx components/pages/PhaseMapperPageClient.tsx
git commit -m "feat: add phase-mapper Downloads tab"
```

---

### Task 10: End-to-end manual verification pass

**Files:** none (verification only — no code changes expected; if this step surfaces a real bug, fix it in the relevant file from the task above that owns it, and note the fix in the commit message)

- [ ] **Step 1: Golden path**

With a fresh backend (empty phase-mapper DB state, or just a new library) and the frontend dev server running:
1. Navigate to `/phase-mapper`. Confirm the nav highlights correctly.
2. Create a new library.
3. Upload `composition_map_fixture.csv` then `plate_reader_fixture.csv` (from `backend-api/tests/phase_mapper/fixtures/`).
4. Click "Run Pipeline". Confirm the button disables and the status shows "running", then transitions to "succeeded" within a few seconds without a manual page refresh.
5. Click through all eight tabs (Reads, Predictions, XRD Recommendations, Remeasurement, Optical Spectra, Heatmaps, Library Runs, Downloads) and confirm each renders real data, not an error or infinite "Loading…".
6. Download the ZIP and confirm its contents.

- [ ] **Step 2: Edge cases**

1. Upload a composition CSV missing the `well` column — confirm a clear error Alert, not a silent failure or unhandled exception in the browser console.
2. With a run already in progress, attempt to start a second one (open two browser tabs on the same library, or click fast) — confirm the backend's 409 is surfaced as a message, not a crash.
3. Create a second library with the exact same name as the first — confirm both are created and listed separately (this exercises the backend's storage-key collision fix from the last plan; the UI itself doesn't need special handling here, just shouldn't break).
4. Switch between two libraries a few times and confirm `selectedRun` and the tab contents correctly reset/reload each time, without showing stale data from the previously-selected library.

- [ ] **Step 3: Full type-check and lint of the whole plan's changes**

Run: `npx tsc --noEmit && npm run lint` from `web-frontend`
Expected: no errors, confirming no task left the tree in a broken state.

- [ ] **Step 4: Commit (only if Steps 1-2 surfaced and required a fix)**

If everything in Steps 1-2 passed cleanly, there is nothing to commit for this task. If a real bug was found and fixed, commit it:

```bash
git add <fixed files>
git commit -m "fix: <specific bug found during phase-mapper e2e verification>"
```
