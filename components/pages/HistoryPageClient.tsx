"use client";

import { useCallback, useEffect, useState } from "react";

import { Alert, Button, StreamlitPage, Tabs } from "@/components/ui";
import { getHistory, type HistoryEntry } from "@/lib/api-client";
import { useAccessToken } from "@/lib/use-access-token";

const AGENT_TABS: { label: string; agent?: string }[] = [
  { label: "All", agent: undefined },
  { label: "Hypothesis", agent: "hypothesis" },
  { label: "Experiment", agent: "experiment" },
  { label: "Curve fitting", agent: "curve_fitting" },
  { label: "ML models", agent: "ml_models" },
  { label: "Analysis", agent: "analysis" },
  { label: "General", agent: "general" },
];

function entryEventType(e: HistoryEntry): string {
  return e.event_type ?? e.eventType ?? "event";
}

function formatTimestamp(ts: string): string {
  try {
    return new Date(ts).toLocaleString();
  } catch {
    return ts;
  }
}

function HistoryPanel({ agent, label }: { agent?: string; label: string }) {
  const token = useAccessToken();
  const [entries, setEntries] = useState<HistoryEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const loadHistory = useCallback(async () => {
    if (!token) {
      setEntries([]);
      setError("Sign in to load interaction history from the API.");
      setLoading(false);
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const res = await getHistory(token, { agent, limit: 200 });
      setEntries(res.items ?? []);
    } catch (e) {
      setEntries([]);
      setError(e instanceof Error ? e.message : "Failed to load history");
    } finally {
      setLoading(false);
    }
  }, [token, agent]);

  useEffect(() => {
    void loadHistory();
  }, [loadHistory]);

  function exportJson() {
    const blob = new Blob([JSON.stringify(entries, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `polaris-history-${agent ?? "all"}-${Date.now()}.json`;
    a.click();
    URL.revokeObjectURL(url);
  }

  if (loading) {
    return <Alert variant="info">Loading {label.toLowerCase()} interactions…</Alert>;
  }
  if (error) {
    return <Alert variant="error">{error}</Alert>;
  }

  return (
    <div>
      <div className="mb-4 flex flex-wrap gap-2">
        <Button variant="secondary" onClick={() => void loadHistory()}>
          Refresh
        </Button>
        <Button variant="secondary" onClick={exportJson} disabled={entries.length === 0}>
          Export JSON
        </Button>
      </div>
      {entries.length === 0 ? (
        <Alert variant="info">
          No interactions for {label.toLowerCase()} yet. Run the corresponding agent to record events.
        </Alert>
      ) : (
        <ul className="max-h-[60vh] space-y-3 overflow-auto rounded-[var(--st-radius)] border border-[var(--st-border)] bg-[var(--st-surface)] p-3">
          {entries.map((entry) => (
            <li
              key={entry.id}
              className="rounded-[var(--st-radius-sm)] border border-[var(--st-border)] bg-[var(--st-main)] px-4 py-3"
            >
              <div className="mb-1 flex flex-wrap items-center gap-2 text-xs text-[var(--st-muted)]">
                <time dateTime={entry.timestamp}>{formatTimestamp(entry.timestamp)}</time>
                <span className="rounded-full bg-[var(--st-hover)] px-2 py-0.5 font-medium text-[var(--st-text)]">
                  {entry.agent ?? "general"}
                </span>
                {entry.role ? <span className="uppercase tracking-wide">{entry.role}</span> : null}
                {entry.component ? <span>· {entry.component}</span> : null}
                <span>· {entryEventType(entry)}</span>
              </div>
              <p className="whitespace-pre-wrap text-sm leading-relaxed text-[var(--st-text)]">
                {entry.summary ?? "(no message)"}
              </p>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

export function HistoryPageClient() {
  return (
    <StreamlitPage
      title="Interaction History"
      icon="📜"
      layout="wide"
      description="Audit trail of agent messages and hypothesis steps for reproducibility."
    >
      <Tabs
        scrollable
        items={AGENT_TABS.map((tab) => ({
          label: tab.label,
          content: <HistoryPanel agent={tab.agent} label={tab.label} />,
        }))}
      />
    </StreamlitPage>
  );
}
