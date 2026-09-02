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
