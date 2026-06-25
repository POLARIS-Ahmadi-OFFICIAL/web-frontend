# Literature Agent Page Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add a Literature Agent page to the POLARIS backend API, web frontend, and mobile app — letting users search the mined corpus and manage pipeline extraction jobs.

**Architecture:** A new FastAPI router (`literature.py`) wraps the already-installed `LiteratureAgentService`; a new `LiteraturePageClient` uses the existing `AgentShell` split-panel component; a new mobile screen uses a two-tab layout (Search / Pipeline) with the existing React Native primitives. Desktop (Electron) gets the web page for free.

**Tech stack:** FastAPI + Pydantic (backend), Next.js 15 / React 19 / Tailwind CSS 4 / Bootstrap Icons CDN (web), React Native / Expo / NativeWind (mobile).

## Global Constraints

- Use existing `--st-*` CSS custom properties only — no new tokens
- No new npm dependencies in `web-frontend`
- No new React Native packages in `mobile-development`
- Bootstrap Icons already loaded via CDN in `web-frontend/app/layout.tsx` — use class names directly
- All backend endpoints must use `get_current_user` auth dependency (Annotated pattern, matching `watcher.py`)
- `LiteratureAgentService` may have an unconfigured corpus — health endpoint returns `ok: false`, never 500
- Mobile `AGENT_CARDS` in `polaris-content.ts` is the only place to add the nav entry
- Desktop requires no changes

---

## Task 1 — Backend: Literature API router

**Files:**
- Create: `backend-api/app/api/v1/literature.py`
- Modify: `backend-api/app/api/v1/router.py`
- Test: `backend-api/tests/test_literature_api.py`

**Interfaces:**
- Consumes: `LiteratureAgentService` and `LiteratureAgentConfig` from `app.tools.literature_agent_service`; `get_current_user` from `app.core.deps`; `AuthUser` from `app.core.auth`
- Produces: `GET /literature/health`, `POST /literature/search`, `GET /literature/jobs`, `GET /literature/jobs/{job_id}`, `POST /literature/start_stage`, `DELETE /literature/jobs/{job_id}` — consumed by Tasks 2 and 4

- [ ] **Step 1: Write the failing tests**

Create `backend-api/tests/test_literature_api.py`:

```python
"""Unit tests for the literature API router — no real corpus required."""
from unittest.mock import MagicMock, patch

import pytest
from fastapi import FastAPI
from fastapi.testclient import TestClient

from app.api.v1.literature import router
from app.core.auth import AuthUser


def _mock_user():
    return AuthUser(id="test-user", email="test@example.com")


def _make_client(mock_service: MagicMock) -> TestClient:
    app = FastAPI()
    app.include_router(router)
    app.dependency_overrides = {}

    import app.api.v1.literature as lit_module
    import app.core.deps as deps_module

    app.dependency_overrides[deps_module.get_current_user] = _mock_user

    with patch.object(lit_module, "get_service", return_value=mock_service):
        client = TestClient(app)
        yield client


@pytest.fixture
def svc():
    m = MagicMock()
    m.health.return_value = {"ok": True, "active_jobs": [], "path_checks": {}}
    m.search.return_value = [
        {
            "paper_slug": "slug1",
            "title": "Test Paper",
            "doi": "10.1234/test",
            "score": 5,
            "summary_excerpt": "A summary excerpt.",
        }
    ]
    m.list_jobs.return_value = []
    m.job_status.return_value = {
        "job_id": "job_abc",
        "stage": "extract_batch",
        "status": "completed",
        "created_at": 1700000000.0,
        "log_tail": "Done.",
        "return_code": 0,
    }
    m.start_stage.return_value = {"job_id": "job_new", "status": "running"}
    m.cancel_job.return_value = {"job_id": "job_abc", "status": "cancelled"}
    return m


def test_health_ok(svc):
    import app.api.v1.literature as lit_module
    import app.core.deps as deps_module

    app = FastAPI()
    app.include_router(router)
    app.dependency_overrides[deps_module.get_current_user] = _mock_user

    with patch.object(lit_module, "get_service", return_value=svc):
        client = TestClient(app)
        resp = client.get("/literature/health")
    assert resp.status_code == 200
    data = resp.json()
    assert data["ok"] is True
    assert "active_jobs" in data


def test_search_returns_hits(svc):
    import app.api.v1.literature as lit_module
    import app.core.deps as deps_module

    app = FastAPI()
    app.include_router(router)
    app.dependency_overrides[deps_module.get_current_user] = _mock_user

    with patch.object(lit_module, "get_service", return_value=svc):
        client = TestClient(app)
        resp = client.post("/literature/search", json={"query": "perovskite", "limit": 5})
    assert resp.status_code == 200
    hits = resp.json()
    assert isinstance(hits, list)
    assert hits[0]["paper_slug"] == "slug1"


def test_start_stage_validates_stage(svc):
    import app.api.v1.literature as lit_module
    import app.core.deps as deps_module

    app = FastAPI()
    app.include_router(router)
    app.dependency_overrides[deps_module.get_current_user] = _mock_user

    with patch.object(lit_module, "get_service", return_value=svc):
        client = TestClient(app)
        resp = client.post(
            "/literature/start_stage",
            json={"stage": "bad_stage", "search_query": "test", "max_papers": 10},
        )
    assert resp.status_code == 400


def test_start_stage_valid(svc):
    import app.api.v1.literature as lit_module
    import app.core.deps as deps_module

    app = FastAPI()
    app.include_router(router)
    app.dependency_overrides[deps_module.get_current_user] = _mock_user

    with patch.object(lit_module, "get_service", return_value=svc):
        client = TestClient(app)
        resp = client.post(
            "/literature/start_stage",
            json={"stage": "extract_batch", "search_query": "perovskite", "max_papers": 50},
        )
    assert resp.status_code == 200
    assert resp.json()["job_id"] == "job_new"


def test_delete_job_cancels(svc):
    import app.api.v1.literature as lit_module
    import app.core.deps as deps_module

    app = FastAPI()
    app.include_router(router)
    app.dependency_overrides[deps_module.get_current_user] = _mock_user

    with patch.object(lit_module, "get_service", return_value=svc):
        client = TestClient(app)
        resp = client.delete("/literature/jobs/job_abc")
    assert resp.status_code == 200
    assert resp.json()["status"] == "cancelled"
```

- [ ] **Step 2: Run tests to verify they fail**

```bash
cd backend-api
python -m pytest tests/test_literature_api.py -v
```

Expected: `ImportError` or `ModuleNotFoundError` — `app.api.v1.literature` does not exist yet.

- [ ] **Step 3: Implement `backend-api/app/api/v1/literature.py`**

```python
"""FastAPI router — Literature Agent endpoints."""

from typing import Annotated

from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel

from app.core.auth import AuthUser
from app.core.deps import get_current_user
from app.tools.literature_agent_service import LiteratureAgentConfig, LiteratureAgentService

router = APIRouter()

VALID_STAGES = {"extract_batch", "vision_pass", "sanitize_summaries", "integrate_and_model", "knowledge_graph"}


def get_service() -> LiteratureAgentService:
    return LiteratureAgentService(LiteratureAgentConfig.load())


# ── Request / Response models ───────────────────────────────────────────────

class LiteratureSearchRequest(BaseModel):
    query: str
    limit: int = 5


class PaperHit(BaseModel):
    paper_slug: str
    title: str
    doi: str | None = None
    score: int
    summary_excerpt: str


class JobSummary(BaseModel):
    job_id: str
    stage: str
    status: str
    created_at: float


class JobDetail(JobSummary):
    log_tail: str
    return_code: int | None = None


class StartStageRequest(BaseModel):
    stage: str
    search_query: str = "perovskite solar cell stability T80 retention"
    max_papers: int = 100


# ── Endpoints ────────────────────────────────────────────────────────────────

@router.get("/literature/health")
def get_literature_health(
    user: Annotated[AuthUser, Depends(get_current_user)],
) -> dict:
    svc = get_service()
    health = svc.health()
    return {
        "ok": health.get("ok", False),
        "active_jobs": health.get("active_jobs", []),
        "path_checks": health.get("path_checks", {}),
    }


@router.post("/literature/search", response_model=list[PaperHit])
def search_literature(
    body: LiteratureSearchRequest,
    user: Annotated[AuthUser, Depends(get_current_user)],
) -> list[PaperHit]:
    svc = get_service()
    hits = svc.search(body.query, limit=body.limit)
    return [PaperHit(**h) for h in hits]


@router.get("/literature/jobs", response_model=list[JobSummary])
def list_literature_jobs(
    user: Annotated[AuthUser, Depends(get_current_user)],
) -> list[JobSummary]:
    svc = get_service()
    jobs = svc.list_jobs()
    return [
        JobSummary(
            job_id=j.job_id,
            stage=j.stage,
            status=j.status,
            created_at=j.created_at,
        )
        for j in jobs
    ]


@router.get("/literature/jobs/{job_id}", response_model=JobDetail)
def get_literature_job(
    job_id: str,
    user: Annotated[AuthUser, Depends(get_current_user)],
) -> JobDetail:
    svc = get_service()
    status = svc.job_status(job_id)
    return JobDetail(
        job_id=status["job_id"],
        stage=status["stage"],
        status=status["status"],
        created_at=status["created_at"],
        log_tail=status.get("log_tail", ""),
        return_code=status.get("return_code"),
    )


@router.post("/literature/start_stage")
def start_literature_stage(
    body: StartStageRequest,
    user: Annotated[AuthUser, Depends(get_current_user)],
) -> dict:
    if body.stage not in VALID_STAGES:
        raise HTTPException(
            status_code=400,
            detail=f"Invalid stage '{body.stage}'. Must be one of: {sorted(VALID_STAGES)}",
        )
    svc = get_service()
    job = svc.start_stage(
        body.stage,
        request={
            "search_query": body.search_query,
            "max_papers": body.max_papers,
            "disable_google_drive": True,
        },
    )
    return {"job_id": job["job_id"], "status": job["status"]}


@router.delete("/literature/jobs/{job_id}")
def cancel_literature_job(
    job_id: str,
    user: Annotated[AuthUser, Depends(get_current_user)],
) -> dict:
    svc = get_service()
    result = svc.cancel_job(job_id)
    return {"job_id": result["job_id"], "status": result["status"]}
```

- [ ] **Step 4: Register the router in `backend-api/app/api/v1/router.py`**

Add one import line and one `include_router` call. The file currently ends with `api_router.include_router(pipeline.router, tags=["pipeline"])`.

Add `literature` to the existing import block:

```python
from app.api.v1 import (
    agents,
    analysis_session,
    dashboard,
    documents,
    experiments,
    health,
    history,
    literature,   # ← add this line
    llm,
    mcp,
    ml_session,
    pipeline,
    session,
    settings,
    watcher,
    workflows,
)
```

Add at the end of the router registrations:

```python
api_router.include_router(literature.router, tags=["literature"])
```

- [ ] **Step 5: Run tests to verify they pass**

```bash
cd backend-api
python -m pytest tests/test_literature_api.py -v
```

Expected: 5 tests pass.

- [ ] **Step 6: Commit**

```bash
cd backend-api
git add app/api/v1/literature.py app/api/v1/router.py tests/test_literature_api.py
git commit -m "feat: add Literature Agent REST API router"
```

---

## Task 2 — Web: API client types and functions

**Files:**
- Modify: `web-frontend/lib/api-client.ts` (append at line 827)

**Interfaces:**
- Consumes: existing `apiFetch` (exported at line 36 of `web-frontend/lib/api-client.ts`)
- Produces: `PaperHit`, `LiteratureJobSummary`, `LiteratureJobDetail` types; `fetchLiteratureHealth`, `searchLiterature`, `fetchLiteratureJobs`, `fetchLiteratureJobDetail`, `startLiteratureExtraction`, `cancelLiteratureJob` functions — all consumed by Task 3

- [ ] **Step 1: Append to `web-frontend/lib/api-client.ts`**

Add the following block at the very end of the file (after the last `runAnalysis` function):

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

Note: `apiFetch` in the web `lib/api-client.ts` takes `body` as a plain object (not a pre-serialised string) — look at the existing pattern for `postHypothesisChat` (around line 198). The `body` field is typed as `object | string`. For consistency with search/start_stage which send JSON bodies, pass a pre-serialised `JSON.stringify(...)` string — the existing `apiFetch` implementation handles both.

Actually — read the existing `apiFetch` signature at line 36 before writing. If it expects an `object` for `body` (and serialises internally), pass a plain object instead of `JSON.stringify(...)`. The implementation you write must match how `apiFetch` is actually called elsewhere in the same file.

- [ ] **Step 2: Verify TypeScript compiles**

```bash
cd web-frontend
npx tsc --noEmit 2>&1 | grep "api-client" | head -20
```

Expected: no errors referencing `api-client.ts`.

- [ ] **Step 3: Commit**

```bash
cd web-frontend
git add lib/api-client.ts
git commit -m "feat: add Literature Agent API client functions"
```

---

## Task 3 — Web: AgentShell defaultTab prop + LiteraturePageClient

**Files:**
- Modify: `web-frontend/components/ui/AgentShell.tsx`
- Create: `web-frontend/app/(app)/agents/literature/page.tsx`
- Create: `web-frontend/components/pages/LiteraturePageClient.tsx`
- Modify: `web-frontend/components/AppNav.tsx`

**Interfaces:**
- Consumes: `PaperHit`, `LiteratureJobSummary`, `LiteratureJobDetail`, `fetchLiteratureHealth`, `searchLiterature`, `fetchLiteratureJobs`, `fetchLiteratureJobDetail`, `startLiteratureExtraction`, `cancelLiteratureJob` from `@/lib/api-client` (Task 2); `AgentShell`, `Alert`, `Button`, `TextArea` from `@/components/ui`; `useAccessToken` from `@/lib/use-access-token`
- Produces: `/agents/literature` route rendered via `LiteraturePageClient`; `AgentShell` accepts `defaultTab` prop

- [ ] **Step 1: Add `defaultTab` prop to AgentShell**

`AgentShell` currently initialises tab state as `useState<Tab>("Document")` (line ~47). Add `defaultTab` to `AgentShellProps` and thread it through:

Change `AgentShellProps` from:
```ts
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
```

To:
```ts
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
  defaultTab?: Tab;
};
```

Add `defaultTab = "Document"` to the destructured props:
```ts
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
  defaultTab = "Document",
}: AgentShellProps) {
  const [activeTab, setActiveTab] = useState<Tab>(defaultTab);
```

- [ ] **Step 2: Verify no existing callers break**

```bash
cd web-frontend
npx tsc --noEmit 2>&1 | grep "AgentShell" | head -20
```

Expected: no errors. All existing callers omit `defaultTab` and get `"Document"` as before.

- [ ] **Step 3: Create `web-frontend/app/(app)/agents/literature/page.tsx`**

```tsx
import { LiteraturePageClient } from "@/components/pages/LiteraturePageClient";

export default function LiteraturePage() {
  return <LiteraturePageClient />;
}
```

- [ ] **Step 4: Create `web-frontend/components/pages/LiteraturePageClient.tsx`**

```tsx
"use client";

import { useCallback, useEffect, useRef, useState } from "react";

import { AgentShell, Alert, Button, TextArea } from "@/components/ui";
import {
  type LiteratureJobSummary,
  type LiteratureJobDetail,
  type PaperHit,
  cancelLiteratureJob,
  fetchLiteratureHealth,
  fetchLiteratureJobDetail,
  fetchLiteratureJobs,
  searchLiterature,
  startLiteratureExtraction,
} from "@/lib/api-client";
import { useAccessToken } from "@/lib/use-access-token";

// ── Status badge ─────────────────────────────────────────────────────────────

const STATUS_BADGE: Record<string, { bg: string; text: string; label: string }> = {
  running:   { bg: "bg-[var(--st-info-bg)]",    text: "text-[var(--st-info-text)]",    label: "Running" },
  completed: { bg: "bg-[var(--st-success-bg)]", text: "text-[var(--st-success-text)]", label: "Done" },
  failed:    { bg: "bg-[var(--st-error-bg)]",   text: "text-[var(--st-error-text)]",   label: "Failed" },
  cancelled: { bg: "bg-[var(--st-surface-raised)]", text: "text-[var(--st-muted)]",   label: "Cancelled" },
  queued:    { bg: "bg-[var(--st-warning-bg)]", text: "text-[var(--st-warning-text)]", label: "Queued" },
};

function JobStatusBadge({ status }: { status: string }) {
  const s = STATUS_BADGE[status] ?? STATUS_BADGE.queued;
  return (
    <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${s.bg} ${s.text}`}>
      {s.label}
    </span>
  );
}

// ── Main component ────────────────────────────────────────────────────────────

export function LiteraturePageClient() {
  const token = useAccessToken();

  // Search state
  const [query, setQuery] = useState("");
  const [searchResults, setSearchResults] = useState<PaperHit[]>([]);
  const [selectedPaper, setSelectedPaper] = useState<PaperHit | null>(null);
  const [searching, setSearching] = useState(false);
  const [searchError, setSearchError] = useState<string | null>(null);

  // Health + jobs state
  const [health, setHealth] = useState<{ ok: boolean; active_jobs: string[] } | null>(null);
  const [jobs, setJobs] = useState<LiteratureJobSummary[]>([]);
  const [selectedJobId, setSelectedJobId] = useState<string | null>(null);
  const [logTail, setLogTail] = useState("");
  const [jobStatus, setJobStatus] = useState<string>("");

  // Launch state
  const [launchQuery, setLaunchQuery] = useState(
    "perovskite solar cell stability T80 retention"
  );
  const [maxPapers, setMaxPapers] = useState(100);
  const [launching, setLaunching] = useState(false);
  const [launchError, setLaunchError] = useState<string | null>(null);

  // Polling ref
  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // Load health + jobs on mount
  useEffect(() => {
    fetchLiteratureHealth(token)
      .then(setHealth)
      .catch(() => setHealth({ ok: false, active_jobs: [] }));
    fetchLiteratureJobs(token).then(setJobs).catch(() => setJobs([]));
  }, [token]);

  // Poll selected job log while running
  useEffect(() => {
    if (pollRef.current) clearInterval(pollRef.current);
    if (!selectedJobId) return;

    const poll = async () => {
      try {
        const detail: LiteratureJobDetail = await fetchLiteratureJobDetail(token, selectedJobId);
        setLogTail(detail.log_tail);
        setJobStatus(detail.status);
        if (detail.status !== "running") {
          clearInterval(pollRef.current!);
          // Refresh jobs list when a job finishes
          fetchLiteratureJobs(token).then(setJobs).catch(() => {});
        }
      } catch {
        clearInterval(pollRef.current!);
      }
    };

    poll();
    pollRef.current = setInterval(poll, 3000);
    return () => { if (pollRef.current) clearInterval(pollRef.current); };
  }, [selectedJobId, token]);

  const handleSearch = useCallback(async () => {
    if (!query.trim()) return;
    setSearching(true);
    setSearchError(null);
    try {
      const results = await searchLiterature(token, query.trim());
      setSearchResults(results);
    } catch (e) {
      setSearchError(e instanceof Error ? e.message : "Search failed");
    } finally {
      setSearching(false);
    }
  }, [query, token]);

  const handleLaunch = useCallback(async () => {
    if (!launchQuery.trim()) return;
    setLaunching(true);
    setLaunchError(null);
    try {
      const result = await startLiteratureExtraction(token, launchQuery.trim(), maxPapers);
      setSelectedJobId(result.job_id);
      // Refresh jobs list
      fetchLiteratureJobs(token).then(setJobs).catch(() => {});
    } catch (e) {
      setLaunchError(e instanceof Error ? e.message : "Launch failed");
    } finally {
      setLaunching(false);
    }
  }, [launchQuery, maxPapers, token]);

  // ── Slots ──────────────────────────────────────────────────────────────────

  const chatContentSlot = (
    <div className="flex flex-col gap-3">
      {searchResults.length === 0 && !searching && (
        <p className="text-sm text-[var(--st-muted)]">
          Search the mined literature corpus using the input below.
        </p>
      )}
      {searchResults.map((paper) => (
        <button
          key={paper.paper_slug}
          type="button"
          onClick={() => setSelectedPaper(paper)}
          className="w-full rounded-[var(--st-radius)] border border-[var(--st-border)]
                     bg-[var(--st-surface)] p-3 text-left transition-colors
                     hover:border-[var(--st-primary)]"
        >
          <p className="text-sm font-medium text-[var(--st-text)]">{paper.title}</p>
          {paper.doi && (
            <p className="mt-0.5 text-xs text-[var(--st-muted)]">DOI: {paper.doi}</p>
          )}
          <p className="mt-1 line-clamp-2 text-xs text-[var(--st-text-secondary)]">
            {paper.summary_excerpt}
          </p>
        </button>
      ))}
      {searchError && <Alert variant="error">{searchError}</Alert>}
    </div>
  );

  const chatInputSlot = (
    <div className="flex gap-2">
      <TextArea
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        onKeyDown={(e) => {
          if (e.key === "Enter" && !e.shiftKey) {
            e.preventDefault();
            void handleSearch();
          }
        }}
        placeholder="Search mined literature…"
        rows={1}
        className="flex-1"
      />
      <Button
        variant="primary"
        onClick={() => void handleSearch()}
        disabled={searching || !query.trim()}
      >
        {searching ? (
          "Searching…"
        ) : (
          <>
            <i className="bi bi-search mr-1" aria-hidden="true" />
            Search
          </>
        )}
      </Button>
    </div>
  );

  const documentSlot = selectedPaper ? (
    <div className="flex flex-col gap-3">
      <h3 className="font-semibold text-[var(--st-text)]">{selectedPaper.title}</h3>
      {selectedPaper.doi && (
        <p className="text-xs text-[var(--st-muted)]">DOI: {selectedPaper.doi}</p>
      )}
      <p className="whitespace-pre-wrap text-sm text-[var(--st-text-secondary)]">
        {selectedPaper.summary_excerpt}
      </p>
      <p className="text-xs text-[var(--st-muted)]">
        slug: {selectedPaper.paper_slug} · relevance score: {selectedPaper.score}
      </p>
    </div>
  ) : (
    <p className="text-sm text-[var(--st-muted)]">
      Select a search result to see full details here.
    </p>
  );

  const contextSlot = (
    <div className="flex flex-col gap-4">
      {/* Health badge */}
      {health && (
        <div className="flex items-center gap-2">
          <span
            className={`h-2 w-2 rounded-full ${
              health.ok ? "bg-[var(--st-success-border)]" : "bg-[var(--st-warning-border)]"
            }`}
          />
          <span className="text-xs text-[var(--st-text-secondary)]">
            {health.ok ? "Connected" : "Configuration needs attention"}
            {" · "}
            {health.active_jobs.length} active job
            {health.active_jobs.length !== 1 ? "s" : ""}
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
          <label className="shrink-0 text-xs text-[var(--st-muted)]">Batch size</label>
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
          onClick={() => void handleLaunch()}
          disabled={launching || !launchQuery.trim()}
          className="self-end"
        >
          {launching ? (
            "Starting…"
          ) : (
            <>
              <i className="bi bi-play-fill mr-1" aria-hidden="true" />
              Launch Extraction
            </>
          )}
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
            type="button"
            onClick={() => setSelectedJobId(job.job_id)}
            className="flex items-center justify-between rounded-[var(--st-radius-sm)]
                       border border-[var(--st-border)] bg-[var(--st-surface)] px-3 py-2
                       text-left transition-colors hover:border-[var(--st-primary)]"
          >
            <div>
              <p className="font-mono text-xs text-[var(--st-text)]">
                {job.job_id.slice(0, 32)}
              </p>
              <p className="text-xs text-[var(--st-muted)]">{job.stage}</p>
            </div>
            <JobStatusBadge status={job.status} />
          </button>
        ))}
      </div>
    </div>
  );

  const historySlot = selectedJobId ? (
    <div className="flex flex-col gap-2">
      <p className="font-mono text-xs text-[var(--st-muted)]">{selectedJobId}</p>
      <pre
        className="max-h-[400px] overflow-auto whitespace-pre-wrap rounded-[var(--st-radius-sm)]
                   bg-[var(--st-surface)] p-3 font-mono text-xs text-[var(--st-text-secondary)]"
      >
        {logTail || "No log output yet."}
      </pre>
      {jobStatus === "running" && (
        <p className="text-xs text-[var(--st-muted)]">Refreshing every 3 s…</p>
      )}
    </div>
  ) : (
    <p className="text-sm text-[var(--st-muted)]">
      Select a job from the Context tab to view its log.
    </p>
  );

  return (
    <AgentShell
      title="Literature Agent"
      iconClass="bi-journals"
      status={health ? (health.ok ? "ready" : "error") : undefined}
      statusLabel={health ? (health.ok ? "Connected" : "Needs attention") : "Checking…"}
      chatContent={chatContentSlot}
      chatInput={chatInputSlot}
      documentContent={documentSlot}
      contextContent={contextSlot}
      historyContent={historySlot}
      defaultTab="Context"
    />
  );
}
```

- [ ] **Step 5: Add Literature entry to AppNav ITEMS**

In `web-frontend/components/AppNav.tsx`, add the Literature entry between Workflow and Hypothesis:

```ts
const ITEMS = [
  { href: "/home",                  label: "Home",         icon: "bi-house-fill" },
  { href: "/dashboard",             label: "Analytics",    icon: "bi-bar-chart-fill" },
  { href: "/workflow",              label: "Workflow",     icon: "bi-diagram-3-fill" },
  { href: "/agents/literature",     label: "Literature",   icon: "bi-journals" },        // ← add
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
```

- [ ] **Step 6: Verify TypeScript compiles with zero errors**

```bash
cd web-frontend
npx tsc --noEmit 2>&1 | head -30
```

Expected: no output (zero errors).

- [ ] **Step 7: Commit**

```bash
cd web-frontend
git add components/ui/AgentShell.tsx \
        app/\(app\)/agents/literature/page.tsx \
        components/pages/LiteraturePageClient.tsx \
        components/AppNav.tsx
git commit -m "feat: add Literature Agent page to web frontend"
```

---

## Task 4 — Mobile: API client functions + Literature screen

**Files:**
- Modify: `mobile-development/src/lib/api-client.ts` (append at line 189)
- Modify: `mobile-development/src/lib/polaris-content.ts`
- Create: `mobile-development/src/app/agents/literature.tsx`

**Interfaces:**
- Consumes: `apiFetch` (private function in `mobile-development/src/lib/api-client.ts`); `Alert`, `Button`, `TextField`, `StreamlitScreen` from `@/components/ui`; `useAccessToken` from `@/lib/use-access-token`; `Modal`, `Pressable`, `ScrollView`, `Text`, `TextInput`, `View` from `react-native`
- Produces: `/agents/literature` Expo route; Literature entry in `AGENT_CARDS`

- [ ] **Step 1: Append literature functions to `mobile-development/src/lib/api-client.ts`**

Add at the very end of the file (after `clearSessionCache`). `apiFetch` is the private helper defined at the top of the same file — the new functions share it directly:

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

export async function fetchLiteratureHealth(token: string | null | undefined) {
  return apiFetch<{ ok: boolean; active_jobs: string[] }>("/literature/health", { token });
}

export async function searchLiterature(
  token: string | null | undefined,
  query: string,
  limit = 5,
) {
  return apiFetch<PaperHit[]>("/literature/search", {
    method: "POST",
    body: JSON.stringify({ query, limit }),
    token,
  });
}

export async function fetchLiteratureJobs(token: string | null | undefined) {
  return apiFetch<LiteratureJobSummary[]>("/literature/jobs", { token });
}

export async function fetchLiteratureJobDetail(
  token: string | null | undefined,
  jobId: string,
) {
  return apiFetch<LiteratureJobDetail>(`/literature/jobs/${jobId}`, { token });
}

export async function startLiteratureExtraction(
  token: string | null | undefined,
  searchQuery: string,
  maxPapers: number,
) {
  return apiFetch<{ job_id: string; status: string }>("/literature/start_stage", {
    method: "POST",
    body: JSON.stringify({
      stage: "extract_batch",
      search_query: searchQuery,
      max_papers: maxPapers,
    }),
    token,
  });
}
```

Note: check how `apiFetch` in the mobile `api-client.ts` handles `body` (string vs object). Read line 14–40 of that file before writing — if it expects an object and serialises internally, pass a plain object. Match the existing pattern exactly.

- [ ] **Step 2: Add Literature to AGENT_CARDS in `mobile-development/src/lib/polaris-content.ts`**

The `AGENT_CARDS` array currently ends with the Analysis entry. Add one entry after it:

```ts
export const AGENT_CARDS = [
  { href: "/agents/hypothesis" as const, icon: "🧠", title: "Hypothesis", subtitle: "Question → hypothesis", description: "Literature-aware questioning and exportable reports." },
  { href: "/agents/experiment" as const, icon: "🧪", title: "Experiment", subtitle: "Protocol & worklist", description: "Constraints, GP worklists, Jupyter export." },
  { href: "/agents/curve-fitting" as const, icon: "📈", title: "Curve Fitting", subtitle: "Spectral peaks", description: "Peak CSV for downstream ML." },
  { href: "/agents/ml-models" as const, icon: "🤖", title: "ML Models", subtitle: "Explore space", description: "GP and Monte Carlo integration." },
  { href: "/agents/analysis" as const, icon: "🔎", title: "Analysis", subtitle: "Validate results", description: "Compare to your hypothesis." },
  { href: "/agents/literature" as const, icon: "📚", title: "Literature", subtitle: "Corpus search & jobs", description: "Search mined papers and manage extraction pipeline." },  // ← add
  { href: "/workflow" as const, icon: "🧭", title: "Workflow", subtitle: "Automation", description: "Demo dataset and auto-ML." },
] as const;
```

- [ ] **Step 3: Create `mobile-development/src/app/agents/literature.tsx`**

```tsx
import { useEffect, useRef, useState } from "react";
import { Modal, Pressable, ScrollView, Text, TextInput, View } from "react-native";

import { Alert, Button, StreamlitScreen, TextField } from "@/components/ui";
import {
  type LiteratureJobDetail,
  type LiteratureJobSummary,
  type PaperHit,
  fetchLiteratureHealth,
  fetchLiteratureJobDetail,
  fetchLiteratureJobs,
  searchLiterature,
  startLiteratureExtraction,
} from "@/lib/api-client";
import { useAccessToken } from "@/lib/use-access-token";

const STATUS_COLORS: Record<string, string> = {
  running:   "bg-[var(--st-info-bg)]",
  completed: "bg-[var(--st-success-bg)]",
  failed:    "bg-[var(--st-error-bg)]",
  cancelled: "bg-[var(--st-surface-raised)]",
  queued:    "bg-[var(--st-warning-bg)]",
};
const STATUS_TEXT_COLORS: Record<string, string> = {
  running:   "text-[var(--st-info-text)]",
  completed: "text-[var(--st-success-text)]",
  failed:    "text-[var(--st-error-text)]",
  cancelled: "text-[var(--st-muted)]",
  queued:    "text-[var(--st-warning-text)]",
};
const STATUS_LABELS: Record<string, string> = {
  running: "Running", completed: "Done", failed: "Failed",
  cancelled: "Cancelled", queued: "Queued",
};

export default function LiteratureScreen() {
  const token = useAccessToken();
  const [activeTab, setActiveTab] = useState<"search" | "pipeline">("search");

  // Search
  const [query, setQuery] = useState("");
  const [searchResults, setSearchResults] = useState<PaperHit[]>([]);
  const [expandedSlug, setExpandedSlug] = useState<string | null>(null);
  const [searching, setSearching] = useState(false);
  const [searchError, setSearchError] = useState<string | null>(null);

  // Pipeline
  const [health, setHealth] = useState<{ ok: boolean; active_jobs: string[] } | null>(null);
  const [jobs, setJobs] = useState<LiteratureJobSummary[]>([]);
  const [selectedJob, setSelectedJob] = useState<LiteratureJobDetail | null>(null);
  const [logModalVisible, setLogModalVisible] = useState(false);
  const [launchQuery, setLaunchQuery] = useState(
    "perovskite solar cell stability T80 retention",
  );
  const [maxPapers, setMaxPapers] = useState("100");
  const [launching, setLaunching] = useState(false);
  const [launchError, setLaunchError] = useState<string | null>(null);

  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    fetchLiteratureHealth(token)
      .then(setHealth)
      .catch(() => setHealth({ ok: false, active_jobs: [] }));
    fetchLiteratureJobs(token).then(setJobs).catch(() => setJobs([]));
  }, [token]);

  // Poll selected job
  useEffect(() => {
    if (pollRef.current) clearInterval(pollRef.current);
    if (!selectedJob) return;
    if (selectedJob.status !== "running") return;

    const poll = async () => {
      try {
        const detail = await fetchLiteratureJobDetail(token, selectedJob.job_id);
        setSelectedJob(detail);
        if (detail.status !== "running") {
          clearInterval(pollRef.current!);
          fetchLiteratureJobs(token).then(setJobs).catch(() => {});
        }
      } catch {
        clearInterval(pollRef.current!);
      }
    };

    pollRef.current = setInterval(poll, 3000);
    return () => { if (pollRef.current) clearInterval(pollRef.current); };
  }, [selectedJob?.job_id, selectedJob?.status, token]);

  async function handleSearch() {
    if (!query.trim()) return;
    setSearching(true);
    setSearchError(null);
    try {
      const results = await searchLiterature(token, query.trim());
      setSearchResults(results);
    } catch (e) {
      setSearchError(e instanceof Error ? e.message : "Search failed");
    } finally {
      setSearching(false);
    }
  }

  async function handleLaunch() {
    if (!launchQuery.trim()) return;
    setLaunching(true);
    setLaunchError(null);
    try {
      await startLiteratureExtraction(token, launchQuery.trim(), parseInt(maxPapers, 10) || 100);
      fetchLiteratureJobs(token).then(setJobs).catch(() => {});
    } catch (e) {
      setLaunchError(e instanceof Error ? e.message : "Launch failed");
    } finally {
      setLaunching(false);
    }
  }

  async function openJobLog(job: LiteratureJobSummary) {
    try {
      const detail = await fetchLiteratureJobDetail(token, job.job_id);
      setSelectedJob(detail);
      setLogModalVisible(true);
    } catch (e) {
      setLaunchError(e instanceof Error ? e.message : "Failed to load job");
    }
  }

  return (
    <StreamlitScreen title="Literature Agent" icon="📚">
      {/* Tab bar */}
      <View className="mb-3 flex-row border-b border-[var(--st-border)]">
        {(["search", "pipeline"] as const).map((tab) => (
          <Pressable
            key={tab}
            onPress={() => setActiveTab(tab)}
            className="relative flex-1 items-center py-2"
          >
            <Text
              className={
                activeTab === tab
                  ? "text-sm font-semibold text-[var(--st-primary)]"
                  : "text-sm text-[var(--st-muted)]"
              }
            >
              {tab === "search" ? "Search" : "Pipeline"}
            </Text>
            {activeTab === tab && (
              <View className="absolute bottom-0 h-0.5 w-full bg-[var(--st-primary)]" />
            )}
          </Pressable>
        ))}
      </View>

      {/* Search tab */}
      {activeTab === "search" && (
        <View className="gap-3">
          <TextField
            label="Search query"
            value={query}
            onChangeText={setQuery}
            placeholder="e.g. perovskite stability"
          />
          <Button
            label={searching ? "Searching…" : "Search"}
            onPress={() => { void handleSearch(); }}
          />
          {searchError && <Alert variant="error">{searchError}</Alert>}
          {searchResults.map((paper) => (
            <Pressable
              key={paper.paper_slug}
              onPress={() =>
                setExpandedSlug(expandedSlug === paper.paper_slug ? null : paper.paper_slug)
              }
              className="rounded-[var(--st-radius)] border border-[var(--st-border)]
                         bg-[var(--st-surface)] p-3"
            >
              <Text className="text-sm font-semibold text-[var(--st-text)]">
                {paper.title}
              </Text>
              {paper.doi ? (
                <Text className="mt-0.5 text-xs text-[var(--st-muted)]">
                  DOI: {paper.doi}
                </Text>
              ) : null}
              <Text className="mt-1 text-xs text-[var(--st-text-secondary)]">
                {expandedSlug === paper.paper_slug
                  ? paper.summary_excerpt
                  : paper.summary_excerpt.slice(0, 200) + (paper.summary_excerpt.length > 200 ? "…" : "")}
              </Text>
            </Pressable>
          ))}
        </View>
      )}

      {/* Pipeline tab */}
      {activeTab === "pipeline" && (
        <View className="gap-3">
          {/* Health */}
          {health && (
            <View className="flex-row items-center gap-2">
              <View
                className={`h-2 w-2 rounded-full ${
                  health.ok ? "bg-[var(--st-success-border)]" : "bg-[var(--st-warning-border)]"
                }`}
              />
              <Text className="text-xs text-[var(--st-text-secondary)]">
                {health.ok ? "Connected" : "Needs attention"} ·{" "}
                {health.active_jobs.length} active job
                {health.active_jobs.length !== 1 ? "s" : ""}
              </Text>
            </View>
          )}

          {/* Launch form */}
          <View className="rounded-[var(--st-radius)] border border-[var(--st-border)] bg-[var(--st-surface)] p-3 gap-2">
            <Text className="text-xs font-medium text-[var(--st-text)]">
              Launch Extraction
            </Text>
            <TextField
              label="Expansion query"
              value={launchQuery}
              onChangeText={setLaunchQuery}
              placeholder="perovskite solar cell stability…"
              multiline
            />
            <View className="flex-row items-center gap-2">
              <Text className="text-xs text-[var(--st-muted)]">Batch size</Text>
              <TextInput
                value={maxPapers}
                onChangeText={setMaxPapers}
                keyboardType="numeric"
                className="w-20 rounded-md border border-[var(--st-border)]
                           bg-[var(--st-bg)] px-2 py-1 text-sm text-[var(--st-text)]"
              />
            </View>
            {launchError && <Alert variant="error">{launchError}</Alert>}
            <Button
              label={launching ? "Starting…" : "Launch Extraction"}
              onPress={() => { void handleLaunch(); }}
            />
          </View>

          {/* Jobs list */}
          <Text className="text-xs font-medium text-[var(--st-text)]">Recent Jobs</Text>
          {jobs.length === 0 && (
            <Text className="text-xs text-[var(--st-muted)]">No jobs yet.</Text>
          )}
          {jobs.map((job) => (
            <Pressable
              key={job.job_id}
              onPress={() => { void openJobLog(job); }}
              className="flex-row items-center justify-between rounded-[var(--st-radius-sm)]
                         border border-[var(--st-border)] bg-[var(--st-surface)] px-3 py-2"
            >
              <View>
                <Text className="font-mono text-xs text-[var(--st-text)]">
                  {job.job_id.slice(0, 28)}
                </Text>
                <Text className="text-xs text-[var(--st-muted)]">{job.stage}</Text>
              </View>
              <View
                className={`rounded-full px-2 py-0.5 ${STATUS_COLORS[job.status] ?? STATUS_COLORS.queued}`}
              >
                <Text
                  className={`text-xs font-medium ${STATUS_TEXT_COLORS[job.status] ?? STATUS_TEXT_COLORS.queued}`}
                >
                  {STATUS_LABELS[job.status] ?? job.status}
                </Text>
              </View>
            </Pressable>
          ))}
        </View>
      )}

      {/* Log modal */}
      <Modal
        visible={logModalVisible}
        animationType="slide"
        onRequestClose={() => setLogModalVisible(false)}
      >
        <View className="flex-1 bg-[var(--st-bg)] p-4">
          <Text className="mb-2 font-mono text-xs text-[var(--st-muted)]">
            {selectedJob?.job_id ?? ""}
          </Text>
          <ScrollView className="flex-1 rounded-[var(--st-radius-sm)] bg-[var(--st-surface)] p-3">
            <Text className="font-mono text-xs text-[var(--st-text-secondary)]">
              {selectedJob?.log_tail || "No log output yet."}
            </Text>
          </ScrollView>
          {selectedJob?.status === "running" && (
            <Text className="mt-2 text-center text-xs text-[var(--st-muted)]">
              Refreshing every 3 s…
            </Text>
          )}
          <View className="mt-4">
            <Button label="Close" variant="secondary" onPress={() => setLogModalVisible(false)} />
          </View>
        </View>
      </Modal>
    </StreamlitScreen>
  );
}
```

- [ ] **Step 4: Verify TypeScript compiles in mobile**

```bash
cd mobile-development
npx tsc --noEmit 2>&1 | head -30
```

Expected: no errors referencing `literature.tsx` or `api-client.ts`.

- [ ] **Step 5: Commit**

```bash
cd mobile-development
git add src/lib/api-client.ts \
        src/lib/polaris-content.ts \
        src/app/agents/literature.tsx
git commit -m "feat: add Literature Agent screen to mobile app"
```

---

## Self-Review Checklist

**Spec coverage:**
- ✅ Backend: 6 endpoints, Pydantic models, stage validation, auth, graceful `health.ok=false`
- ✅ Web: `api-client.ts` additions, `AgentShell.defaultTab` prop, `LiteraturePageClient`, AppNav entry
- ✅ Mobile: `api-client.ts` additions, `polaris-content.ts` AGENT_CARDS, `literature.tsx` screen
- ✅ Desktop: no changes required (Electron wraps web)

**No placeholders:** All code blocks are complete and directly usable.

**Type consistency:**
- `PaperHit` fields match in both Task 2 (web) and Task 4 (mobile), and in the backend's `PaperHit` Pydantic model
- `LiteratureJobSummary` and `LiteratureJobDetail` fields match `JobSummary`/`JobDetail` backend responses exactly
- `fetchLiteratureHealth`, `searchLiterature`, `fetchLiteratureJobs`, `fetchLiteratureJobDetail`, `startLiteratureExtraction` — used with matching signatures in Tasks 3 and 4
- `defaultTab?: Tab` in `AgentShellProps` uses the locally-defined `type Tab = "Document" | "Context" | "History"` — consistent throughout Task 3
