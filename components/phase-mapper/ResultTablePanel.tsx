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
