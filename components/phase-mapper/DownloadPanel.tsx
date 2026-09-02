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
