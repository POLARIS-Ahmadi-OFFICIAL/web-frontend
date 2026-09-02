"use client";

import { useEffect, useMemo, useState } from "react";

import { Alert, Select } from "@/components/ui";
import { getPhaseMapperHeatmaps, type PhaseMapperHeatmaps } from "@/lib/phase-mapper-api-client";
import { useAccessToken } from "@/lib/use-access-token";

// Sequential single-hue (blue) ramp, light->dark, from the dataviz skill's
// validated reference palette (references/palette.md) — used for magnitude
// encoding on the 96-well grid. Text color per cell is computed from the
// cell's own step (below), not the page theme, so the grid reads
// consistently in both light and dark mode without a separate dark ramp.
const SEQUENTIAL_RAMP = [
  "#cde2fb", "#b7d3f6", "#9ec5f4", "#86b6ef", "#6da7ec", "#5598e7",
  "#3987e5", "#2a78d6", "#256abf", "#1c5cab", "#184f95", "#104281", "#0d366b",
];
const DARK_TEXT_FROM_STEP = 6; // steps 0-5 get dark text, 6+ get white text

function stepForValue(value: number, min: number, max: number): number {
  if (max <= min) return 0;
  const t = Math.min(1, Math.max(0, (value - min) / (max - min)));
  return Math.round(t * (SEQUENTIAL_RAMP.length - 1));
}

const WELL_ROWS = ["A", "B", "C", "D", "E", "F", "G", "H"];
const WELL_COLS = Array.from({ length: 12 }, (_, i) => i + 1);

export function HeatmapPanel({ runId }: { runId: number }) {
  const token = useAccessToken();
  const [data, setData] = useState<PhaseMapperHeatmaps | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [metric, setMetric] = useState<string>("");
  const [hovered, setHovered] = useState<{ well: string; value: number } | null>(null);

  useEffect(() => {
    let cancelled = false;
    setData(null);
    setError(null);
    getPhaseMapperHeatmaps(token, runId)
      .then((result) => {
        if (cancelled) return;
        setData(result);
        if (result.columns.length > 0) setMetric(result.columns[0]);
      })
      .catch((e) => {
        if (!cancelled) setError(e instanceof Error ? e.message : "Failed to load heatmap data");
      });
    return () => {
      cancelled = true;
    };
  }, [token, runId]);

  const wellValues = useMemo(() => {
    if (!data || !metric) return new Map<string, number>();
    const map = new Map<string, number>();
    for (const well of data.wells) {
      const wellId = well.well as string | undefined;
      const value = well[metric];
      if (wellId && typeof value === "number") map.set(wellId, value);
    }
    return map;
  }, [data, metric]);

  const { min, max } = useMemo(() => {
    const values = Array.from(wellValues.values());
    if (values.length === 0) return { min: 0, max: 1 };
    return { min: Math.min(...values), max: Math.max(...values) };
  }, [wellValues]);

  if (error) return <Alert variant="error">{error}</Alert>;
  if (data === null) return <p className="text-sm text-[var(--st-muted)]">Loading…</p>;
  if (data.columns.length === 0) {
    return <p className="text-sm text-[var(--st-muted)]">No heatmap metrics available for this run.</p>;
  }

  const cellSize = 44;
  const labelGutter = 24;
  const width = labelGutter + WELL_COLS.length * cellSize;
  const height = labelGutter + WELL_ROWS.length * cellSize;

  return (
    <div className="space-y-4">
      <div className="max-w-sm">
        <Select
          value={metric}
          onChange={(e) => setMetric(e.target.value)}
          options={data.columns.map((c) => ({ value: c, label: c }))}
        />
      </div>
      <div className="flex items-center gap-2 text-xs text-[var(--st-muted)]">
        <span
          className="inline-block h-3 w-3 rounded-sm border border-[var(--st-border)]"
          style={{ background: SEQUENTIAL_RAMP[0] }}
        />
        {min.toFixed(2)}
        <span
          className="mx-1 h-3 w-24 rounded-sm"
          style={{ background: `linear-gradient(to right, ${SEQUENTIAL_RAMP[0]}, ${SEQUENTIAL_RAMP[SEQUENTIAL_RAMP.length - 1]})` }}
        />
        {max.toFixed(2)}
        <span
          className="inline-block h-3 w-3 rounded-sm border border-[var(--st-border)]"
          style={{ background: SEQUENTIAL_RAMP[SEQUENTIAL_RAMP.length - 1] }}
        />
      </div>
      <div className="overflow-x-auto">
        <svg viewBox={`0 0 ${width} ${height}`} className="w-full max-w-2xl" style={{ minWidth: width }}>
          {WELL_COLS.map((col) => (
            <text
              key={`col-${col}`}
              x={labelGutter + (col - 0.5) * cellSize}
              y={labelGutter - 8}
              textAnchor="middle"
              className="fill-[var(--st-muted)] text-[10px]"
            >
              {col}
            </text>
          ))}
          {WELL_ROWS.map((row, rowIndex) => (
            <text
              key={`row-${row}`}
              x={labelGutter - 8}
              y={labelGutter + (rowIndex + 0.65) * cellSize}
              textAnchor="end"
              className="fill-[var(--st-muted)] text-[10px]"
            >
              {row}
            </text>
          ))}
          {WELL_ROWS.map((row, rowIndex) =>
            WELL_COLS.map((col, colIndex) => {
              const wellId = `${row}${col}`;
              const value = wellValues.get(wellId);
              const step = value == null ? null : stepForValue(value, min, max);
              const fill = step == null ? "var(--st-hover)" : SEQUENTIAL_RAMP[step];
              const textColor = step != null && step >= DARK_TEXT_FROM_STEP ? "#ffffff" : "#0b0b0b";
              return (
                <g
                  key={wellId}
                  onMouseEnter={() => value != null && setHovered({ well: wellId, value })}
                  onMouseLeave={() => setHovered(null)}
                >
                  <rect
                    x={labelGutter + colIndex * cellSize}
                    y={labelGutter + rowIndex * cellSize}
                    width={cellSize - 2}
                    height={cellSize - 2}
                    rx={4}
                    fill={fill}
                    stroke="var(--st-border)"
                  />
                  <text
                    x={labelGutter + colIndex * cellSize + (cellSize - 2) / 2}
                    y={labelGutter + rowIndex * cellSize + (cellSize - 2) / 2 + 4}
                    textAnchor="middle"
                    fontSize={9}
                    fill={textColor}
                  >
                    {value != null ? value.toFixed(2) : ""}
                  </text>
                </g>
              );
            }),
          )}
        </svg>
      </div>
      {hovered ? (
        <p className="text-sm text-[var(--st-text)]">
          <strong>{hovered.well}</strong>: {hovered.value.toFixed(4)} ({metric})
        </p>
      ) : (
        <p className="text-sm text-[var(--st-muted)]">Hover a well to see its exact value.</p>
      )}
    </div>
  );
}
