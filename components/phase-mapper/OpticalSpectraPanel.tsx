"use client";

import { useEffect, useMemo, useState } from "react";

import { Alert, FormField, Select } from "@/components/ui";
import { getPhaseMapperOpticalSpectra } from "@/lib/phase-mapper-api-client";
import { useAccessToken } from "@/lib/use-access-token";

type SpectrumRow = {
  well?: string;
  wavelength_nm?: number;
  signal?: number;
};

export function OpticalSpectraPanel({ runId }: { runId: number }) {
  const token = useAccessToken();
  const [rows, setRows] = useState<SpectrumRow[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [selectedWell, setSelectedWell] = useState<string>("");
  const [hoverIndex, setHoverIndex] = useState<number | null>(null);

  useEffect(() => {
    let cancelled = false;
    setRows(null);
    setError(null);
    setHoverIndex(null);
    getPhaseMapperOpticalSpectra(token, runId)
      .then((data) => {
        if (cancelled) return;
        const typed = data as SpectrumRow[];
        setRows(typed);
        const firstWell = typed.find((r) => r.well)?.well;
        if (firstWell) setSelectedWell(firstWell);
      })
      .catch((e) => {
        if (!cancelled) setError(e instanceof Error ? e.message : "Failed to load spectra");
      });
    return () => {
      cancelled = true;
    };
  }, [token, runId]);

  const wells = useMemo(() => {
    if (!rows) return [];
    return Array.from(new Set(rows.map((r) => r.well).filter((w): w is string => Boolean(w)))).sort();
  }, [rows]);

  const points = useMemo(() => {
    if (!rows || !selectedWell) return [];
    return rows
      .filter((r) => r.well === selectedWell && r.wavelength_nm != null && r.signal != null)
      .sort((a, b) => (a.wavelength_nm ?? 0) - (b.wavelength_nm ?? 0));
  }, [rows, selectedWell]);

  if (error) return <Alert variant="error">{error}</Alert>;
  if (rows === null) return <p className="text-sm text-[var(--st-muted)]">Loading…</p>;
  if (rows.length === 0) {
    return <p className="text-sm text-[var(--st-muted)]">No optical spectra saved for this run.</p>;
  }

  const width = 640;
  const height = 280;
  const padding = 36;
  const xs = points.map((p) => p.wavelength_nm ?? 0);
  const ys = points.map((p) => p.signal ?? 0);
  const xMin = xs.length ? Math.min(...xs) : 0;
  const xMax = xs.length ? Math.max(...xs) : 1;
  const yMin = Math.min(0, ...ys);
  const yMax = Math.max(...ys, 1);
  const scaleX = (x: number) => padding + ((x - xMin) / (xMax - xMin || 1)) * (width - 2 * padding);
  const scaleY = (y: number) => height - padding - ((y - yMin) / (yMax - yMin || 1)) * (height - 2 * padding);
  const path = points
    .map((p, i) => `${i === 0 ? "M" : "L"}${scaleX(p.wavelength_nm ?? 0)},${scaleY(p.signal ?? 0)}`)
    .join(" ");
  const hovered = hoverIndex != null ? points[hoverIndex] : null;

  return (
    <div className="space-y-4">
      <div className="max-w-xs">
        <FormField label="Well">
          <Select
            value={selectedWell}
            onChange={(e) => {
              setSelectedWell(e.target.value);
              setHoverIndex(null);
            }}
            options={wells.map((w) => ({ value: w, label: w }))}
          />
        </FormField>
      </div>
      {points.length === 0 ? (
        <p className="text-sm text-[var(--st-muted)]">No spectrum points for this well.</p>
      ) : (
        <svg
          viewBox={`0 0 ${width} ${height}`}
          className="w-full max-w-2xl rounded-md border border-[var(--st-border)] bg-[var(--st-surface)]"
          onMouseLeave={() => setHoverIndex(null)}
        >
          <line
            x1={padding}
            y1={height - padding}
            x2={width - padding}
            y2={height - padding}
            stroke="var(--st-border)"
          />
          <path d={path} fill="none" stroke="var(--st-primary)" strokeWidth={2} strokeLinejoin="round" />
          {hovered ? (
            <line
              x1={scaleX(hovered.wavelength_nm ?? 0)}
              y1={padding}
              x2={scaleX(hovered.wavelength_nm ?? 0)}
              y2={height - padding}
              stroke="var(--st-muted)"
              strokeDasharray="3,3"
            />
          ) : null}
          {points.map((p, i) => (
            <circle
              key={i}
              cx={scaleX(p.wavelength_nm ?? 0)}
              cy={scaleY(p.signal ?? 0)}
              r={hoverIndex === i ? 4 : 8}
              fill={hoverIndex === i ? "var(--st-primary)" : "transparent"}
              onMouseEnter={() => setHoverIndex(i)}
            />
          ))}
          <text x={padding} y={height - padding + 16} className="fill-[var(--st-muted)] text-[10px]">
            {xMin} nm
          </text>
          <text x={width - padding} y={height - padding + 16} textAnchor="end" className="fill-[var(--st-muted)] text-[10px]">
            {xMax} nm
          </text>
        </svg>
      )}
      {hovered ? (
        <p className="text-sm text-[var(--st-text)]">
          {hovered.wavelength_nm} nm — signal {hovered.signal}
        </p>
      ) : (
        <p className="text-sm text-[var(--st-muted)]">Hover the line to see exact values.</p>
      )}
    </div>
  );
}
