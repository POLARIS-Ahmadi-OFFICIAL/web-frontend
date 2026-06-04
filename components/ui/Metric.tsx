export function Metric({
  label,
  value,
  delta,
}: {
  label: string;
  value: string | number;
  delta?: string;
}) {
  return (
    <div className="rounded-lg border border-[var(--st-border)] bg-[var(--st-surface)] p-4 shadow-sm">
      <p className="text-xs font-medium uppercase tracking-wide text-[var(--st-muted)]">
        {label}
      </p>
      <p className="mt-1 text-2xl font-semibold text-[var(--st-text)]">{value}</p>
      {delta ? (
        <p className="mt-1 text-xs text-[var(--st-muted)]">{delta}</p>
      ) : null}
    </div>
  );
}

export function MetricRow({ children }: { children: React.ReactNode }) {
  return <div className="grid grid-cols-2 gap-4 md:grid-cols-5">{children}</div>;
}
