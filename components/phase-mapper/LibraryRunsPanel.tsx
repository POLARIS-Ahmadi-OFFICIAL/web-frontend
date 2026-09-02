"use client";

import { useEffect, useState } from "react";

import { Alert, Button } from "@/components/ui";
import { deletePhaseMapperRun, listPhaseMapperRuns, type PhaseMapperRun } from "@/lib/phase-mapper-api-client";
import { useAccessToken } from "@/lib/use-access-token";

export function LibraryRunsPanel({
  libraryId,
  selectedRunId,
  onSelectRun,
  onRunDeleted,
}: {
  libraryId: number;
  selectedRunId: number | null;
  onSelectRun: (run: PhaseMapperRun) => void;
  onRunDeleted?: (runId: number) => void;
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
      onRunDeleted?.(runId);
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
