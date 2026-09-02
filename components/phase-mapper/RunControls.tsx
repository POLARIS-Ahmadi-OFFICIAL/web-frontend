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
