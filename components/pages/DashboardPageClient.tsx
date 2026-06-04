"use client";

import Link from "next/link";
import { useEffect, useState } from "react";

import { Alert, Divider, Metric, MetricRow, StreamlitPage } from "@/components/ui";
import { getDashboardDetail, getHealth, type DashboardDetail } from "@/lib/api-client";
import { useAccessToken } from "@/lib/use-access-token";

function formatDelta(n?: number | null, suffix = "") {
  if (n == null) return undefined;
  const sign = n >= 0 ? "+" : "";
  return `${sign}${n}${suffix}`;
}

export function DashboardPageClient() {
  const token = useAccessToken();
  const [apiStatus, setApiStatus] = useState("checking…");
  const [detail, setDetail] = useState<DashboardDetail | null>(null);

  useEffect(() => {
    getHealth()
      .then((h) => setApiStatus(`${h.status} · v${h.version}`))
      .catch(() => setApiStatus("API offline"));

    getDashboardDetail(token)
      .then(setDetail)
      .catch(() => setDetail(null));
  }, [token]);

  const perf = detail?.system_performance;
  const usage = detail?.agent_usage;
  const watcher = detail?.watcher;
  const files = detail?.uploaded_files ?? [];
  const analytics = detail?.additional_analytics;
  const workflow = detail?.workflow;
  const session = detail?.session_statistics;
  const ml = detail?.ml_analysis_activity;

  return (
    <StreamlitPage
      title="Analytics"
      icon="📊"
      layout="wide"
      description="System metrics and agent usage. For onboarding and quick actions, see Home."
    >
      <p className="mb-4 text-sm text-[var(--st-muted)]">
        <Link href="/home" className="font-medium text-[var(--st-primary)] underline">
          ← Back to Home dashboard
        </Link>
      </p>
      <Alert variant={apiStatus.includes("offline") ? "warning" : "info"}>
        Backend: {apiStatus}
        {detail?.stage ? ` · Session stage: ${detail.stage}` : ""}
      </Alert>

      <h4 className="mb-4 mt-6 text-sm font-semibold">System performance</h4>
      <MetricRow>
        <Metric
          label="CPU usage"
          value={perf?.cpu_percent != null ? `${perf.cpu_percent}%` : "—"}
          delta={formatDelta(perf?.cpu_delta, "%")}
        />
        <Metric
          label="Memory usage"
          value={perf?.memory_percent != null ? `${perf.memory_percent}%` : "—"}
          delta={formatDelta(perf?.memory_delta, "%")}
        />
        <Metric
          label="Disk usage"
          value={perf?.disk_percent != null ? `${perf.disk_percent}%` : "N/A"}
        />
        <Metric label="Uptime" value={perf?.uptime_display ?? "—"} delta={formatDelta(perf?.uptime_delta_seconds, "s")} />
        <Metric label="Total events" value={perf?.total_events ?? 0} delta={formatDelta(perf?.events_delta)} />
      </MetricRow>

      <Divider />

      <h4 className="mb-4 text-sm font-semibold">Agent usage analytics</h4>
      {usage && usage.total > 0 ? (
        <>
          <MetricRow>
            {usage.items.map((item) => (
              <Metric
                key={item.agent}
                label={item.label}
                value={item.count}
                delta={`${item.percent}% of total`}
              />
            ))}
          </MetricRow>
          {usage.most_used ? (
            <div className="mt-4">
              <Metric
                label="Most used agent"
                value={usage.most_used.label}
                delta={`${usage.most_used.count} times`}
              />
            </div>
          ) : null}
        </>
      ) : (
        <Alert variant="info">No agent usage data yet. Start using agents to see analytics here.</Alert>
      )}

      <Divider />

      <h4 className="mb-4 text-sm font-semibold">Watcher status</h4>
      <MetricRow>
        <Metric label="Watcher enabled" value={watcher?.enabled ? "Yes" : "No"} />
        <Metric label="Watcher events" value={watcher?.event_count ?? 0} />
        <Metric label="Watcher server" value={watcher?.server_url ?? "Not set"} />
        <Metric label="Last trigger" value={watcher?.last_trigger ?? "N/A"} />
      </MetricRow>
      {watcher?.watch_dir ? (
        <p className="mt-2 text-xs text-[var(--st-muted)]">Watch directory: {watcher.watch_dir}</p>
      ) : null}

      <Divider />

      <h4 className="mb-4 text-sm font-semibold">Uploaded files</h4>
      {files.length > 0 ? (
        <div className="overflow-x-auto rounded-lg border border-[var(--st-border)]">
          <table className="w-full border-collapse text-sm">
            <thead>
              <tr className="bg-[var(--st-surface)]">
                <th className="border border-[var(--st-border)] px-3 py-2 text-left">Filename</th>
                <th className="border border-[var(--st-border)] px-3 py-2 text-left">Path</th>
                <th className="border border-[var(--st-border)] px-3 py-2 text-left">Upload time</th>
              </tr>
            </thead>
            <tbody>
              {files.map((f, i) => (
                <tr key={i}>
                  <td className="border border-[var(--st-border)] px-3 py-2">{f.name}</td>
                  <td className="border border-[var(--st-border)] px-3 py-2 font-mono text-xs">{f.path}</td>
                  <td className="border border-[var(--st-border)] px-3 py-2">{f.timestamp}</td>
                </tr>
              ))}
            </tbody>
          </table>
          <p className="mt-2 text-sm text-[var(--st-muted)]">Total files uploaded: {files.length}</p>
        </div>
      ) : (
        <Alert variant="info">No files uploaded yet.</Alert>
      )}

      <Divider />

      <h4 className="mb-4 text-sm font-semibold">Additional analytics</h4>
      <MetricRow>
        <Metric
          label="Last hypothesis"
          value={
            analytics?.has_hypothesis
              ? analytics?.hypothesis_ready
                ? "Available"
                : "In progress"
              : "None"
          }
        />
        <Metric
          label="Experimental outputs"
          value={analytics?.has_experimental_outputs ? "Available" : "None"}
        />
        <Metric label="Routing mode" value={analytics?.routing_mode ?? "—"} />
      </MetricRow>

      <Divider />

      <h4 className="mb-4 text-sm font-semibold">Workflow and automation</h4>
      <MetricRow>
        <Metric label="Workflow active" value={workflow?.active ? "Yes" : "No"} />
        <Metric label="Workflow step" value={workflow?.step ?? "N/A"} />
        <Metric
          label="Auto-ML after curve fitting"
          value={workflow?.auto_ml_after_curve_fitting ? "On" : "Off"}
        />
        <Metric label="Analysis ready" value={workflow?.analysis_ready ? "Yes" : "No"} />
      </MetricRow>
      <p className="mt-2 text-xs text-[var(--st-muted)]">
        ML model choice: {workflow?.ml_model_choice ?? "Not set"}
      </p>

      <Divider />

      <h4 className="mb-4 text-sm font-semibold">Session statistics</h4>
      <MetricRow>
        <Metric label="Total interactions" value={session?.total_interactions ?? 0} />
        <Metric label="Uploaded files" value={session?.uploaded_files_count ?? 0} />
        <Metric label="Active sessions" value={session?.active_sessions ?? 1} />
        <Metric label="Workflow progress" value={`${workflow?.workflow_index ?? 0} steps`} />
      </MetricRow>

      <Divider />

      <h4 className="mb-4 text-sm font-semibold">ML and analysis activity</h4>
      <MetricRow>
        <Metric label="Curve fitting runs" value={ml?.curve_fitting_runs ?? 0} />
        <Metric label="ML models runs" value={ml?.ml_models_runs ?? 0} />
        <Metric label="Analysis runs" value={ml?.analysis_runs ?? 0} />
        <Metric label="ML auto runs" value={ml?.ml_auto_runs ?? 0} />
      </MetricRow>

      {detail?.last_hypothesis_preview ? (
        <>
          <Divider />
          <p className="text-sm text-[var(--st-muted)]">
            <strong>Hypothesis preview:</strong> {detail.last_hypothesis_preview}
          </p>
        </>
      ) : null}
    </StreamlitPage>
  );
}
