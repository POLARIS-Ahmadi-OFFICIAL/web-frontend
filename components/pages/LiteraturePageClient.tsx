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

    void poll();
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
        slug: {selectedPaper.paper_slug} &middot; relevance score: {selectedPaper.score}
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
