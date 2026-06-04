"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { apiPath } from "@/lib/api-path";

import { Alert, Button, Expander, FormField, Metric, MetricRow, StreamlitPage, TwoCol } from "@/components/ui";
import { getApiBase } from "@/lib/api-base";
import {
  getCurveFittingResults,
  getCurveFittingSession,
  postCurveFittingPreview,
  postCurveFittingUpload,
  type CurveFittingResultsPayload,
  type CurveFittingWellResult,
  type TablePreview,
} from "@/lib/api-client";
import { useAccessToken } from "@/lib/use-access-token";

function parseCsvPreview(text: string, maxRows = 15): TablePreview {
  const lines = text.split(/\r?\n/).filter((l) => l.trim());
  if (!lines.length) return { columns: [], rows: [], preview_row_count: 0 };
  const columns = lines[0].split(",").map((c) => c.trim());
  const rows = lines.slice(1, 1 + maxRows).map((line) => line.split(",").map((c) => c.trim()));
  return {
    columns,
    rows,
    preview_row_count: rows.length,
    total_rows: Math.max(lines.length - 1, 0),
    column_count: columns.length,
  };
}

function PreviewTable({ preview, title }: { preview: TablePreview | null; title: string }) {
  if (!preview) return null;
  if (preview.error) {
    return (
      <Alert variant="warning">
        {title}: {preview.error}
      </Alert>
    );
  }
  const cols = preview.columns ?? [];
  const rows = (preview.rows ?? []) as unknown[][];
  return (
    <div className="mt-2">
      <p className="mb-1 text-sm font-semibold text-[var(--st-text)]">
        {title}
        {preview.filename ? ` — ${preview.filename}` : ""}
        {preview.total_rows != null ? (
          <span className="ml-2 font-normal text-[var(--st-muted)]">
            ({preview.preview_row_count ?? rows.length} of {preview.total_rows} rows shown)
          </span>
        ) : null}
      </p>
      <div className="max-h-64 overflow-auto rounded-md border border-[var(--st-border)]">
        <table className="w-full min-w-[400px] border-collapse text-xs">
          <thead className="sticky top-0 bg-[var(--st-surface)]">
            <tr>
              {cols.map((c) => (
                <th key={c} className="border border-[var(--st-border)] px-2 py-1 text-left font-medium">
                  {c}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {rows.map((row, i) => (
              <tr key={i}>
                {row.map((cell, j) => (
                  <td key={j} className="border border-[var(--st-border)] px-2 py-1">
                    {cell == null ? "" : String(cell)}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function FittingPlotImage({ plotUrl }: { plotUrl: string }) {
  const token = useAccessToken();
  const [src, setSrc] = useState<string | null>(null);
  const [err, setErr] = useState<string | null>(null);

  useEffect(() => {
    let objectUrl: string | null = null;
    setSrc(null);
    setErr(null);
    const url = `${getApiBase()}${apiPath(plotUrl)}`;
    fetch(url, {
      headers: token ? { Authorization: `Bearer ${token}` } : {},
    })
      .then((res) => {
        if (!res.ok) throw new Error(res.statusText);
        return res.blob();
      })
      .then((blob) => {
        objectUrl = URL.createObjectURL(blob);
        setSrc(objectUrl);
      })
      .catch((e) => setErr(e instanceof Error ? e.message : "Could not load plot"));

    return () => {
      if (objectUrl) URL.revokeObjectURL(objectUrl);
    };
  }, [plotUrl, token]);

  if (err) return <p className="text-xs text-[var(--st-muted)]">Plot unavailable: {err}</p>;
  if (!src) return <p className="text-xs text-[var(--st-muted)]">Loading plot…</p>;
  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img
      src={src}
      alt="Curve fitting plot"
      className="mt-2 w-full max-w-3xl rounded-md border border-[var(--st-border)]"
    />
  );
}

function WellResultCard({ well }: { well: CurveFittingWellResult }) {
  const r2 = well.fit.r2;
  const readLabel = well.read ? ` (Read ${well.read})` : "";
  return (
    <Expander
      title={`Well ${well.well_name}${readLabel}${r2 != null ? ` — R² ${r2.toFixed(4)}` : ""}`}
    >
      <div className="space-y-3 text-sm">
        <div>
          <p className="font-semibold">Fit quality</p>
          <ul className="mt-1 list-inside list-disc text-[var(--st-muted)]">
            {Object.entries(well.quality_assessment || {}).map(([k, v]) => (
              <li key={k}>
                {k}: {v}
              </li>
            ))}
            {well.fit.rmse != null ? <li>RMSE: {well.fit.rmse.toFixed(4)}</li> : null}
          </ul>
        </div>
        {well.fit.peaks?.length ? (
          <div className="overflow-x-auto">
            <p className="mb-1 font-semibold">Peaks ({well.fit.peak_count ?? well.fit.peaks.length})</p>
            <table className="w-full border-collapse text-xs">
              <thead>
                <tr>
                  <th className="border border-[var(--st-border)] px-2 py-1">Peak</th>
                  <th className="border border-[var(--st-border)] px-2 py-1">Center (nm)</th>
                  <th className="border border-[var(--st-border)] px-2 py-1">Height</th>
                  <th className="border border-[var(--st-border)] px-2 py-1">FWHM (nm)</th>
                </tr>
              </thead>
              <tbody>
                {well.fit.peaks.map((p, i) => (
                  <tr key={i}>
                    <td className="border border-[var(--st-border)] px-2 py-1">{i + 1}</td>
                    <td className="border border-[var(--st-border)] px-2 py-1">
                      {p.center != null ? p.center.toFixed(1) : "N/A"}
                    </td>
                    <td className="border border-[var(--st-border)] px-2 py-1">
                      {p.height != null ? p.height.toFixed(2) : "N/A"}
                    </td>
                    <td className="border border-[var(--st-border)] px-2 py-1">
                      {p.fwhm != null ? p.fwhm.toFixed(1) : "N/A"}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : null}
        {well.plot_url || well.well_name ? (
          <FittingPlotImage
            plotUrl={
              well.plot_url ??
              `/agents/curve-fitting/plot?well=${encodeURIComponent(well.well_name)}${
                well.read ? `&read=${encodeURIComponent(String(well.read))}` : ""
              }`
            }
          />
        ) : null}
      </div>
    </Expander>
  );
}

export function CurveFittingPageClient() {
  const token = useAccessToken();
  const dataInputRef = useRef<HTMLInputElement>(null);
  const compInputRef = useRef<HTMLInputElement>(null);
  const [dataFile, setDataFile] = useState<File | null>(null);
  const [compositionFile, setCompositionFile] = useState<File | null>(null);
  const [dataPath, setDataPath] = useState("");
  const [localDataPreview, setLocalDataPreview] = useState<TablePreview | null>(null);
  const [serverDataPreview, setServerDataPreview] = useState<TablePreview | null>(null);
  const [serverCompPreview, setServerCompPreview] = useState<TablePreview | null>(null);
  const [results, setResults] = useState<CurveFittingResultsPayload | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [previewLoading, setPreviewLoading] = useState(false);
  const autoRunAttempted = useRef(false);

  const loadStoredResults = useCallback(async () => {
    try {
      const r = await getCurveFittingResults(token);
      if (r.results?.wells?.length) setResults(r.results);
      if (r.last_error && !r.has_results) setError(r.last_error);
    } catch {
      /* ignore */
    }
  }, [token]);

  useEffect(() => {
    void loadStoredResults();
  }, [loadStoredResults]);

  useEffect(() => {
    if (autoRunAttempted.current || !token) return;
    void (async () => {
      try {
        const s = await getCurveFittingSession(token);
        if (!s.auto_run_pending || !s.auto_run_data_file) return;
        autoRunAttempted.current = true;
        setDataPath(s.auto_run_data_file);
        setLoading(true);
        setError(null);
        const res = await postCurveFittingUpload(token, {
          dataFilePath: s.auto_run_data_file,
          compositionFilePath: s.auto_run_comp_file ?? undefined,
        });
        if (res.status === "error") {
          setError(res.message ?? "Auto curve fitting failed");
          return;
        }
        const payload = res.data?.results as CurveFittingResultsPayload | undefined;
        if (payload?.wells?.length) {
          setResults(payload);
        } else {
          await loadStoredResults();
        }
        const wf = res.data?.workflow as { next_page?: string; ml_automation?: { status?: string } } | undefined;
        if (wf?.ml_automation?.status === "success") {
          setError(null);
        }
      } catch (e) {
        setError(e instanceof Error ? e.message : "Workflow auto-run failed");
      } finally {
        setLoading(false);
      }
    })();
  }, [token, loadStoredResults]);

  async function refreshServerPreview() {
    const hasUpload = Boolean(dataFile);
    const hasPath = Boolean(dataPath.trim());
    if (!hasUpload && !hasPath) {
      setServerDataPreview(null);
      setServerCompPreview(null);
      return;
    }
    setPreviewLoading(true);
    try {
      const p = await postCurveFittingPreview(token, {
        dataFile: dataFile ?? undefined,
        compositionFile: compositionFile ?? undefined,
        dataFilePath: hasUpload ? undefined : dataPath.trim(),
      });
      setServerDataPreview(p.data_preview ?? null);
      setServerCompPreview(p.composition_preview ?? null);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Preview failed");
    } finally {
      setPreviewLoading(false);
    }
  }

  function onDataFileChange(file: File | null) {
    setDataFile(file);
    if (file && file.name.toLowerCase().endsWith(".csv")) {
      const reader = new FileReader();
      reader.onload = () => {
        if (typeof reader.result === "string") {
          setLocalDataPreview({ ...parseCsvPreview(reader.result), filename: file.name });
        }
      };
      reader.readAsText(file.slice(0, 500_000));
    } else {
      setLocalDataPreview(null);
    }
  }

  async function onRun() {
    const hasUpload = Boolean(dataFile);
    const hasPath = Boolean(dataPath.trim());
    if (!hasUpload && !hasPath) {
      setError("Upload a luminescence CSV or enter a server-side data file path.");
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const res = await postCurveFittingUpload(token, {
        dataFile: dataFile ?? undefined,
        compositionFile: compositionFile ?? undefined,
        dataFilePath: hasUpload ? undefined : dataPath.trim(),
      });
      if (res.status === "error") {
        setError(res.message ?? "Curve fitting failed");
        setResults(null);
        return;
      }
      const payload = res.data?.results as CurveFittingResultsPayload | undefined;
      if (payload?.wells?.length) {
        setResults(payload);
        setError(null);
      } else {
        const errText =
          payload?.error ||
          res.message ||
          "Curve fitting finished but produced no well results. Check CSV format, composition file, and API key in Settings.";
        setError(errText);
        setResults(payload?.wells ? payload : null);
        await loadStoredResults();
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : "Run failed");
    } finally {
      setLoading(false);
    }
  }

  const dataPreview = serverDataPreview ?? localDataPreview;
  const summary = results?.summary;

  return (
    <StreamlitPage
      title="Curve Fitting"
      icon="📈"
      description="Upload CSV files, preview data, and run multi-peak Gaussian fitting with plots."
      layout="wide"
    >
      <TwoCol>
        <FormField label="Data file (CSV)" help="Luminescence measurement data">
          <input
            ref={dataInputRef}
            type="file"
            accept=".csv"
            className="w-full text-sm file:mr-4 file:rounded-md file:border-0 file:bg-[var(--st-primary)] file:px-4 file:py-2 file:text-white"
            onChange={(e) => onDataFileChange(e.target.files?.[0] ?? null)}
          />
          {dataFile ? (
            <p className="mt-1 text-xs text-[var(--st-muted)]">Selected: {dataFile.name}</p>
          ) : null}
        </FormField>
        <FormField label="Composition file (optional)" help="Well composition CSV or Excel">
          <input
            ref={compInputRef}
            type="file"
            accept=".csv,.xlsx,.xls"
            className="w-full text-sm file:mr-4 file:rounded-md file:border-0 file:bg-[var(--st-primary)] file:px-4 file:py-2 file:text-white"
            onChange={(e) => setCompositionFile(e.target.files?.[0] ?? null)}
          />
          {compositionFile ? (
            <p className="mt-1 text-xs text-[var(--st-muted)]">Selected: {compositionFile.name}</p>
          ) : null}
        </FormField>
      </TwoCol>

      <FormField
        label="Or: data file path on API server"
        help="Use when the file is already on the backend (e.g. watcher output)"
      >
        <input
          type="text"
          value={dataPath}
          onChange={(e) => setDataPath(e.target.value)}
          placeholder="/path/to/luminescence.csv"
          disabled={Boolean(dataFile)}
          className="w-full rounded-md border border-[var(--st-border)] bg-[var(--st-surface)] px-3 py-2 text-sm disabled:opacity-50"
        />
      </FormField>

      <div className="mt-3 flex flex-wrap gap-2">
        <Button variant="secondary" onClick={() => void refreshServerPreview()} disabled={previewLoading}>
          {previewLoading ? "Loading preview…" : "Preview files on server"}
        </Button>
      </div>

      {(dataPreview || serverCompPreview) && (
        <div className="mt-4 rounded-lg border border-[var(--st-border)] bg-[var(--st-surface)] p-4">
          <h4 className="mb-2 text-sm font-semibold">Data preview</h4>
          <PreviewTable preview={dataPreview} title="Spectral data" />
          <PreviewTable preview={serverCompPreview} title="Composition" />
        </div>
      )}

      {error ? <Alert variant="error">{error}</Alert> : null}

      <div className="mt-4 flex flex-wrap gap-2">
        <Button onClick={() => void onRun()} disabled={loading}>
          {loading ? "Running curve fitting…" : "Run curve fitting"}
        </Button>
        <Button
          variant="secondary"
          onClick={() => {
            setDataFile(null);
            setCompositionFile(null);
            setDataPath("");
            setLocalDataPreview(null);
            setServerDataPreview(null);
            setServerCompPreview(null);
            setResults(null);
            setError(null);
            if (dataInputRef.current) dataInputRef.current.value = "";
            if (compInputRef.current) compInputRef.current.value = "";
          }}
          disabled={loading}
        >
          Clear
        </Button>
      </div>

      {results?.wells?.length ? (
        <div className="mt-8 space-y-4">
          <h4 className="text-sm font-semibold">Analysis summary</h4>
          <MetricRow>
            <Metric label="Wells analyzed" value={summary?.total_wells ?? results.wells.length} />
            <Metric
              label="Successful fits"
              value={summary?.successful_fits ?? 0}
            />
            <Metric
              label="Success rate"
              value={`${summary?.success_rate_pct ?? 0}%`}
            />
          </MetricRow>

          <h4 className="text-sm font-semibold">Analysis results</h4>
          <div className="space-y-2">
            {results.wells.map((w) => (
              <WellResultCard key={`${w.well_name}-${w.read ?? ""}`} well={w} />
            ))}
          </div>
        </div>
      ) : (
        <div className="mt-6 rounded-lg border border-dashed border-[var(--st-border)] p-6 text-center text-sm text-[var(--st-muted)]">
          Upload files, preview your data, then run fitting to see peaks, metrics, and matplotlib plots
          per well.
        </div>
      )}
    </StreamlitPage>
  );
}
