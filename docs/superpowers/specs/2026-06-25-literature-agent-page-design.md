# Literature Agent Page — Design Spec

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Add a dedicated Literature Agent page to the POLARIS web frontend, mobile app, and desktop app (Electron wrapper of web — free). The page surfaces two equally-weighted workflows: searching the mined corpus and managing pipeline extraction jobs.

**Architecture:** Three layers — a new FastAPI router wrapping `LiteratureAgentService`, a new `LiteraturePageClient` using the existing `AgentShell` split-panel layout, and a new mobile screen with a two-tab layout (Search / Pipeline).

**Tech stack:** FastAPI (backend), Next.js 15 / React 19 / Tailwind CSS 4 (web), React Native / Expo (mobile), existing `AgentShell` + `Button` + `Alert` + `TextArea` UI primitives.

---

## Global Constraints

- Token names unchanged — use existing `--st-*` CSS custom properties
- No new npm dependencies in the web frontend
- No new React Native packages in the mobile app
- Bootstrap Icons via CDN only (already loaded in `app/layout.tsx`)
- Backend: all new endpoints require `get_current_user` auth dependency, matching every other endpoint in `app/api/v1/`
- `LiteratureAgentService` gracefully handles a missing/unconfigured corpus — the API must propagate `health.ok = false` rather than 500ing
- The mobile `AGENT_CARDS` array in `polaris-content.ts` must be updated with the new entry (not a separate navigation file)
- Desktop requires no separate work — Electron wraps the web app

---

## Part 1 — Backend API

### New file: `backend-api/app/api/v1/literature.py`

Six endpoints, all thin wrappers over `LiteratureAgentService`. All require auth.

```python
from typing import Annotated
from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel
from app.core.deps import get_current_user
from app.core.auth import AuthUser
from app.tools.literature_agent_service import LiteratureAgentService, LiteratureAgentConfig

router = APIRouter()

def get_service() -> LiteratureAgentService:
    return LiteratureAgentService(LiteratureAgentConfig.load())
```

**Endpoints:**

| Method | Path | Request body | Response |
|---|---|---|---|
| `GET` | `/literature/health` | — | `{ ok: bool, active_jobs: list[str], path_checks: dict }` |
| `POST` | `/literature/search` | `{ query: str, limit: int = 5 }` | `list[PaperHit]` |
| `GET` | `/literature/jobs` | — | `list[JobSummary]` |
| `GET` | `/literature/jobs/{job_id}` | — | `JobDetail` (includes `log_tail`) |
| `POST` | `/literature/start_stage` | `{ stage: str, search_query: str, max_papers: int = 100 }` | `{ job_id: str, status: str }` |
| `DELETE` | `/literature/jobs/{job_id}` | — | `{ job_id: str, status: str }` |

**Pydantic models** (defined in same file):

```python
class LiteratureSearchRequest(BaseModel):
    query: str
    limit: int = 5

class PaperHit(BaseModel):
    paper_slug: str
    title: str
    doi: str | None
    score: int
    summary_excerpt: str

class JobSummary(BaseModel):
    job_id: str
    stage: str
    status: str
    created_at: float

class JobDetail(JobSummary):
    log_tail: str
    return_code: int | None

class StartStageRequest(BaseModel):
    stage: str
    search_query: str = "perovskite solar cell stability T80 retention"
    max_papers: int = 100
```

`start_stage` validates `stage` against `{"extract_batch", "vision_pass", "sanitize_summaries", "integrate_and_model", "knowledge_graph"}` and raises `HTTPException(400)` on invalid value.

### Modify: `backend-api/app/api/v1/router.py`

Add `from app.api.v1 import literature` and `api_router.include_router(literature.router, tags=["literature"])`.

---

## Part 2 — Web Frontend

### New file: `web-frontend/app/(app)/agents/literature/page.tsx`

```tsx
import { LiteraturePageClient } from "@/components/pages/LiteraturePageClient";
export default function LiteraturePage() {
  return <LiteraturePageClient />;
}
```

### New file: `web-frontend/components/pages/LiteraturePageClient.tsx`

`"use client"` component. All state and API calls live here.

**State:**

```ts
query: string                        // search input
searchResults: PaperHit[]            // results from POST /literature/search
selectedPaper: PaperHit | null       // drives Results tab content
searching: boolean
searchError: string | null

health: { ok: boolean; active_jobs: string[] } | null  // from GET /literature/health
jobs: JobSummary[]                   // from GET /literature/jobs
selectedJobId: string | null         // drives History tab log viewer
logTail: string                      // from GET /literature/jobs/{job_id}
activeTab: "Results" | "Jobs" | "History"  // default "Jobs"

launchQuery: string                  // expansion query input
maxPapers: number                    // default 100
launching: boolean
launchError: string | null
```

**API functions** — add these to `web-frontend/lib/api-client.ts` (alongside all other exported functions in that file; `apiFetch` is exported there so imports work fine), then import them in `LiteraturePageClient`. See the web `api-client.ts` additions below.

Add these exported types and functions to `web-frontend/lib/api-client.ts` (appended at the bottom, same pattern as all existing exports):

```ts
// --- Literature Agent ---

export type PaperHit = {
  paper_slug: string;
  title: string;
  doi: string | null;
  score: number;
  summary_excerpt: string;
};

export type LiteratureJobSummary = {
  job_id: string;
  stage: string;
  status: string;
  created_at: number;
};

export type LiteratureJobDetail = LiteratureJobSummary & {
  log_tail: string;
  return_code: number | null;
};

export async function fetchLiteratureHealth(token: string | null) {
  return apiFetch<{ ok: boolean; active_jobs: string[] }>("/literature/health", { token });
}

export async function searchLiterature(token: string | null, query: string, limit = 5) {
  return apiFetch<PaperHit[]>("/literature/search", {
    method: "POST",
    body: JSON.stringify({ query, limit }),
    token,
  });
}

export async function fetchLiteratureJobs(token: string | null) {
  return apiFetch<LiteratureJobSummary[]>("/literature/jobs", { token });
}

export async function fetchLiteratureJobDetail(token: string | null, jobId: string) {
  return apiFetch<LiteratureJobDetail>(`/literature/jobs/${jobId}`, { token });
}

export async function startLiteratureExtraction(
  token: string | null,
  searchQuery: string,
  maxPapers: number,
) {
  return apiFetch<{ job_id: string; status: string }>("/literature/start_stage", {
    method: "POST",
    body: JSON.stringify({ stage: "extract_batch", search_query: searchQuery, max_papers: maxPapers }),
    token,
  });
}

export async function cancelLiteratureJob(token: string | null, jobId: string) {
  return apiFetch<{ job_id: string; status: string }>(`/literature/jobs/${jobId}`, {
    method: "DELETE",
    token,
  });
}
```

`LiteraturePageClient` imports these from `@/lib/api-client` and calls them with the token from `useAccessToken()`.

**Effects:**
- On mount: call `fetchHealth()` and `fetchJobs()`.
- While `selectedJobId` is set and that job's status is `"running"`: poll `fetchJobDetail(selectedJobId)` every 3 seconds, update `logTail`. Stop polling when status is no longer `"running"`.

**`chatContent` slot** — search results list:

```tsx
<div className="flex flex-col gap-3">
  {searchResults.length === 0 && !searching && (
    <p className="text-[var(--st-muted)] text-sm">
      Search the mined literature corpus using the input below.
    </p>
  )}
  {searchResults.map((paper) => (
    <button
      key={paper.paper_slug}
      onClick={() => { setSelectedPaper(paper); setActiveTab("Results"); }}
      className="text-left rounded-[var(--st-radius)] border border-[var(--st-border)]
                 bg-[var(--st-surface)] p-3 hover:border-[var(--st-primary)]
                 transition-colors w-full"
    >
      <p className="font-medium text-[var(--st-text)] text-sm">{paper.title}</p>
      {paper.doi && (
        <p className="text-xs text-[var(--st-muted)] mt-0.5">DOI: {paper.doi}</p>
      )}
      <p className="text-xs text-[var(--st-text-secondary)] mt-1 line-clamp-2">
        {paper.summary_excerpt}
      </p>
    </button>
  ))}
  {searchError && <Alert variant="error">{searchError}</Alert>}
</div>
```

**`chatInput` slot** — search bar:

```tsx
<div className="flex gap-2">
  <TextArea
    value={query}
    onChange={(e) => setQuery(e.target.value)}
    onKeyDown={(e) => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); handleSearch(); } }}
    placeholder="Search mined literature…"
    rows={1}
    className="flex-1"
  />
  <Button
    variant="primary"
    onClick={handleSearch}
    disabled={searching || !query.trim()}
  >
    {searching ? "Searching…" : <><i className="bi bi-search me-1" />Search</>}
  </Button>
</div>
```

**`documentContent` slot** (tab label "Results") — selected paper detail:

```tsx
{selectedPaper ? (
  <div className="flex flex-col gap-3">
    <h3 className="font-semibold text-[var(--st-text)]">{selectedPaper.title}</h3>
    {selectedPaper.doi && (
      <p className="text-xs text-[var(--st-muted)]">DOI: {selectedPaper.doi}</p>
    )}
    <p className="text-sm text-[var(--st-text-secondary)] whitespace-pre-wrap">
      {selectedPaper.summary_excerpt}
    </p>
    <p className="text-xs text-[var(--st-muted)]">
      slug: {selectedPaper.paper_slug} · relevance score: {selectedPaper.score}
    </p>
  </div>
) : (
  <p className="text-[var(--st-muted)] text-sm">
    Select a search result to see full details here.
  </p>
)}
```

**`contextContent` slot** (tab label "Jobs") — launcher + jobs list:

```tsx
<div className="flex flex-col gap-4">
  {/* Health badge */}
  {health && (
    <div className="flex items-center gap-2">
      <span className={`w-2 h-2 rounded-full ${health.ok ? "bg-[var(--st-success-border)]" : "bg-[var(--st-warning-border)]"}`} />
      <span className="text-xs text-[var(--st-text-secondary)]">
        {health.ok ? "Connected" : "Configuration needs attention"}
        {" · "}{health.active_jobs.length} active job{health.active_jobs.length !== 1 ? "s" : ""}
      </span>
    </div>
  )}

  {/* Launch form */}
  <div className="flex flex-col gap-2 rounded-[var(--st-radius)] border border-[var(--st-border)] bg-[var(--st-surface)] p-3">
    <p className="text-xs font-medium text-[var(--st-text)]">Launch Extraction</p>
    <TextArea
      value={launchQuery}
      onChange={(e) => setLaunchQuery(e.target.value)}
      placeholder="Expansion query…"
      rows={2}
    />
    <div className="flex items-center gap-2">
      <label className="text-xs text-[var(--st-muted)] shrink-0">Batch size</label>
      <input
        type="number"
        min={1}
        max={1000}
        step={10}
        value={maxPapers}
        onChange={(e) => setMaxPapers(Number(e.target.value))}
        className="w-20 rounded-[var(--st-radius-sm)] border border-[var(--st-border)]
                   bg-[var(--st-bg)] px-2 py-1 text-sm text-[var(--st-text)]"
      />
    </div>
    {launchError && <Alert variant="error">{launchError}</Alert>}
    <Button
      variant="primary"
      onClick={handleLaunch}
      disabled={launching || !launchQuery.trim()}
      className="self-end"
    >
      {launching ? "Starting…" : <><i className="bi bi-play-fill me-1" />Launch Extraction</>}
    </Button>
  </div>

  {/* Jobs list */}
  <div className="flex flex-col gap-1">
    <p className="text-xs font-medium text-[var(--st-text)]">Recent Jobs</p>
    {jobs.length === 0 && (
      <p className="text-xs text-[var(--st-muted)]">No jobs yet.</p>
    )}
    {jobs.map((job) => (
      <button
        key={job.job_id}
        onClick={() => { setSelectedJobId(job.job_id); setActiveTab("History"); }}
        className="flex items-center justify-between rounded-[var(--st-radius-sm)]
                   border border-[var(--st-border)] bg-[var(--st-surface)] px-3 py-2
                   text-left hover:border-[var(--st-primary)] transition-colors"
      >
        <div>
          <p className="text-xs font-mono text-[var(--st-text)]">
            {job.job_id.slice(0, 32)}
          </p>
          <p className="text-xs text-[var(--st-muted)]">{job.stage}</p>
        </div>
        <JobStatusBadge status={job.status} />
      </button>
    ))}
  </div>
</div>
```

**`historyContent` slot** (tab label "History") — log tail viewer:

```tsx
{selectedJobId ? (
  <div className="flex flex-col gap-2">
    <p className="text-xs text-[var(--st-muted)] font-mono">{selectedJobId}</p>
    <pre className="text-xs font-mono text-[var(--st-text-secondary)] whitespace-pre-wrap
                    rounded-[var(--st-radius-sm)] bg-[var(--st-surface)] p-3 overflow-auto
                    max-h-[400px]">
      {logTail || "No log output yet."}
    </pre>
  </div>
) : (
  <p className="text-[var(--st-muted)] text-sm">
    Select a job from the Jobs tab to view its log.
  </p>
)}
```

**`JobStatusBadge` helper component** (defined inline in the same file):

| status | background token | text |
|---|---|---|
| `running` | `--st-info-bg` / `--st-info-text` | Running |
| `completed` | `--st-success-bg` / `--st-success-text` | Done |
| `failed` | `--st-error-bg` / `--st-error-text` | Failed |
| `cancelled` | `--st-surface-raised` / `--st-muted` | Cancelled |
| `queued` | `--st-warning-bg` / `--st-warning-text` | Queued |

**AgentShell props:**

```tsx
<AgentShell
  title="Literature Agent"
  iconClass="bi-journals"
  status={health ? (health.ok ? "ready" : "error") : undefined}
  statusLabel={health ? (health.ok ? "Connected" : "Needs attention") : "Checking…"}
  chatContent={chatContentSlot}
  chatInput={chatInputSlot}
  documentContent={resultsSlot}
  contextContent={jobsSlot}
  historyContent={historySlot}
  defaultTab="Context"
/>
```

`AgentShell` must accept a `defaultTab` prop (string matching one of the three tab names). **If `AgentShell` does not already have this prop**, add it with type `"Document" | "Context" | "History"` defaulting to `"Document"`. The Literature page passes `"Context"` so Jobs is shown on load.

The tab labels "Document", "Context", "History" are fixed in `AgentShell` — the Literature page does not rename them. The mapping is: Document tab → paper results detail, Context tab → jobs panel, History tab → log viewer. This is a deliberate reuse of the existing tab names; no prop for custom tab labels is needed.

### Modify: `web-frontend/components/AppNav.tsx`

Add to the `ITEMS` array, between Workflow and Hypothesis:

```ts
{ href: "/agents/literature", label: "Literature", icon: "bi-journals" },
```

---

## Part 3 — Mobile App

### New file: `mobile-development/src/app/agents/literature.tsx`

`"use client"` Expo Router screen. Two-tab layout using React Native's built-in state (no additional tab library).

**State:**

```ts
activeTab: "search" | "pipeline"     // default "search"
query: string
searchResults: PaperHit[]
expandedSlug: string | null          // which result card is expanded
searching: boolean
searchError: string | null

health: { ok: boolean; active_jobs: string[] } | null
jobs: JobSummary[]
selectedJobId: string | null
logTail: string
logModalVisible: boolean

launchQuery: string
maxPapers: number                    // default 100
launching: boolean
launchError: string | null
```

**Layout:**

```tsx
<StreamlitScreen title="Literature Agent" icon="📚">
  {/* Tab bar */}
  <View className="flex-row border-b border-[var(--st-border)] mb-3">
    <Pressable onPress={() => setActiveTab("search")} className="flex-1 py-2 items-center">
      <Text className={activeTab === "search"
        ? "text-sm font-semibold text-[var(--st-primary)]"
        : "text-sm text-[var(--st-muted)]"}>
        Search
      </Text>
      {activeTab === "search" && (
        <View className="h-0.5 w-full bg-[var(--st-primary)] absolute bottom-0" />
      )}
    </Pressable>
    <Pressable onPress={() => setActiveTab("pipeline")} className="flex-1 py-2 items-center">
      <Text className={activeTab === "pipeline"
        ? "text-sm font-semibold text-[var(--st-primary)]"
        : "text-sm text-[var(--st-muted)]"}>
        Pipeline
      </Text>
      {activeTab === "pipeline" && (
        <View className="h-0.5 w-full bg-[var(--st-primary)] absolute bottom-0" />
      )}
    </Pressable>
  </View>

  {activeTab === "search" ? <SearchTab /> : <PipelineTab />}
</StreamlitScreen>
```

**SearchTab sub-component** (defined in same file):

- `TextField` for query + "Search" `Button` (calls `POST /literature/search`)
- `ScrollView` of result cards: each shows title + DOI + 200-char excerpt
- Tapping a card toggles its `expandedSlug` — when expanded, shows the full `summary_excerpt` below
- `Alert variant="error"` on `searchError`

**PipelineTab sub-component** (defined in same file):

- Health status row: green dot + "Connected" or yellow dot + "Needs attention" + active job count
- Launch form:
  - `TextField` for expansion query (default `"perovskite solar cell stability T80 retention"`)
  - Numeric input for batch size (React Native `TextInput` with `keyboardType="numeric"`)
  - "Launch Extraction" `Button`
- `Alert variant="error"` on `launchError`
- Jobs list: each row is a `Pressable` showing truncated job id, stage, and a colored status indicator. Tapping opens `logModal`.
- `Modal` for log tail: full-screen modal showing `job_id` header, monospace `ScrollView` of `logTail`, "Close" button. Auto-refreshes every 3s while job status is `"running"`.

**Effects:**
- On mount: call `fetchHealth()` and `fetchJobs()`.
- When `selectedJobId` is set and job status is `"running"`: poll `fetchJobDetail` every 3 seconds.

### Modify: `mobile-development/src/lib/api-client.ts`

Append the literature types and functions at the bottom of the file, following the exact same pattern as the other exported functions. `apiFetch` is private in the mobile `api-client.ts` — the new functions are added to the same file so they share the private helper directly.

```ts
// --- Literature Agent ---

export type PaperHit = {
  paper_slug: string;
  title: string;
  doi: string | null;
  score: number;
  summary_excerpt: string;
};

export type LiteratureJobSummary = {
  job_id: string;
  stage: string;
  status: string;
  created_at: number;
};

export type LiteratureJobDetail = LiteratureJobSummary & {
  log_tail: string;
  return_code: number | null;
};

export async function fetchLiteratureHealth(token: string | null) {
  return apiFetch<{ ok: boolean; active_jobs: string[] }>("/literature/health", { token });
}

export async function searchLiterature(token: string | null, query: string, limit = 5) {
  return apiFetch<PaperHit[]>("/literature/search", {
    method: "POST",
    body: JSON.stringify({ query, limit }),
    token,
  });
}

export async function fetchLiteratureJobs(token: string | null) {
  return apiFetch<LiteratureJobSummary[]>("/literature/jobs", { token });
}

export async function fetchLiteratureJobDetail(token: string | null, jobId: string) {
  return apiFetch<LiteratureJobDetail>(`/literature/jobs/${jobId}`, { token });
}

export async function startLiteratureExtraction(
  token: string | null,
  searchQuery: string,
  maxPapers: number,
) {
  return apiFetch<{ job_id: string; status: string }>("/literature/start_stage", {
    method: "POST",
    body: JSON.stringify({ stage: "extract_batch", search_query: searchQuery, max_papers: maxPapers }),
    token,
  });
}

export async function cancelLiteratureJob(token: string | null, jobId: string) {
  return apiFetch<{ job_id: string; status: string }>(`/literature/jobs/${jobId}`, {
    method: "DELETE",
    token,
  });
}
```

### Modify: `mobile-development/src/lib/polaris-content.ts`

Add to `AGENT_CARDS` array (after the Analysis entry):

```ts
{ href: "/agents/literature" as const, icon: "📚", title: "Literature", subtitle: "Corpus search & jobs", description: "Search mined papers and manage extraction pipeline." },
```

---

## Files Changed

| File | Change |
|---|---|
| `backend-api/app/api/v1/literature.py` | Create — 6 endpoints wrapping `LiteratureAgentService` |
| `backend-api/app/api/v1/router.py` | Add literature router import and `include_router` call |
| `web-frontend/lib/api-client.ts` | Append literature types + 6 exported fetch functions |
| `web-frontend/app/(app)/agents/literature/page.tsx` | Create — server component shell |
| `web-frontend/components/pages/LiteraturePageClient.tsx` | Create — full page client component |
| `web-frontend/components/AppNav.tsx` | Add Literature entry to ITEMS array |
| `web-frontend/components/ui/AgentShell.tsx` | Add `defaultTab?: "Document" \| "Context" \| "History"` prop if not present |
| `mobile-development/src/lib/api-client.ts` | Append literature types + 6 exported fetch functions |
| `mobile-development/src/app/agents/literature.tsx` | Create — two-tab mobile screen |
| `mobile-development/src/lib/polaris-content.ts` | Add Literature entry to AGENT_CARDS |

## Files NOT Changed

- `backend-api/app/tools/literature_agent_service.py` — already complete, no changes
- `backend-api/app/tools/polaris_orchestrator.py` — already complete, no changes
- All other agent pages, API files, and shared components
