"use client";

import Link from "next/link";
import { useCallback, useEffect, useState } from "react";

import {
  Alert,
  Button,
  Expander,
  FormField,
  Metric,
  MetricRow,
  StreamlitPage,
  TextArea,
} from "@/components/ui";
import { MarkdownBlock } from "@/components/ui/MarkdownBlock";
import {
  getAnalysisSession,
  patchAnalysisSession,
  runAnalysis,
  type AnalysisSession,
} from "@/lib/api-client";
import {
  buildDualGpResultsView,
  buildGpResultsView,
  buildMonteCarloResultsView,
} from "@/lib/ml-results-display";
import { useAccessToken } from "@/lib/use-access-token";

export function AnalysisPageClient() {
  const token = useAccessToken();
  const [session, setSession] = useState<AnalysisSession | null>(null);
  const [researchGoal, setResearchGoal] = useState("");
  const [report, setReport] = useState<string | null>(null);
  const [parsed, setParsed] = useState<Record<string, unknown> | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    const s = await getAnalysisSession(token);
    setSession(s);
    setResearchGoal(s.research_goal || "");
    if (s.analysis_full_report) setReport(s.analysis_full_report);
  }, [token]);

  useEffect(() => {
    void refresh().catch((e) => setError(e instanceof Error ? e.message : "Load failed"));
  }, [refresh]);

  async function onAnalyze() {
    setLoading(true);
    setError(null);
    try {
      await patchAnalysisSession(token, researchGoal);
      const res = await runAnalysis(token, researchGoal);
      if (res.status === "error") {
        setError(res.message);
      } else {
        setReport(res.analysis_report ?? null);
        setParsed((res.parsed as Record<string, unknown>) ?? null);
        await refresh();
      }
    } catch (e) {
      const msg = e instanceof Error ? e.message : "Analysis failed";
      setError(
        msg.includes("timed out") || msg.includes("TimeoutError")
          ? "Analysis timed out before the report finished. The API may still be running — wait a minute and refresh, or retry."
          : msg,
      );
    } finally {
      setLoading(false);
    }
  }

  const gpView = buildGpResultsView(session?.gp_results);
  const dualView = buildDualGpResultsView(session?.gp_results);
  const mcView = buildMonteCarloResultsView(session?.monte_carlo_results);

  return (
    <StreamlitPage
      title="Analysis Agent"
      icon="🔎"
      description="Analyze curve fitting and ML results in relation to your hypothesis and experiments."
      layout="wide"
    >
      {error ? <Alert variant="error">{error}</Alert> : null}

      {!session?.has_hypothesis ? (
        <Alert variant="info" className="mb-4">
          Generate a hypothesis first on the{" "}
          <Link href="/agents/hypothesis" className="underline">
            Hypothesis
          </Link>{" "}
          page.
        </Alert>
      ) : null}

      <FormField
        label="Research goal"
        help="Guides new research questions and experiment recommendations (Streamlit parity)."
      >
        <TextArea
          value={researchGoal}
          onChange={(e) => setResearchGoal(e.target.value)}
          rows={4}
          onBlur={() => void patchAnalysisSession(token, researchGoal)}
        />
      </FormField>

      <Expander title="Context information" defaultOpen={false}>
        <div className="grid gap-4 md:grid-cols-2">
          <div>
            <p className="mb-1 text-sm font-semibold">Hypothesis context</p>
            <pre className="max-h-40 overflow-auto rounded border border-[var(--st-border)] p-2 text-xs whitespace-pre-wrap">
              {session?.hypothesis_context}
            </pre>
          </div>
          <div>
            <p className="mb-1 text-sm font-semibold">Experimental context</p>
            <pre className="max-h-40 overflow-auto rounded border border-[var(--st-border)] p-2 text-xs whitespace-pre-wrap">
              {session?.experimental_context}
            </pre>
          </div>
        </div>
      </Expander>

      {gpView ? (
        <Expander title="ML results (single-objective GP)" defaultOpen>
          <MetricRow>
            <Metric label="Model" value={gpView.modelType} />
            <Metric label="Target" value={gpView.target} />
            <Metric label="CV R²" value={gpView.cvR2} />
            <Metric label="Kernel" value={gpView.kernel} />
          </MetricRow>
        </Expander>
      ) : null}

      {dualView ? (
        <Expander title="ML results (dual-objective GP)" defaultOpen>
          <MetricRow>
            <Metric label="Performance" value={dualView.performanceTarget} />
            <Metric label="Stability" value={dualView.stabilityTarget} />
            <Metric label="Acquisition" value={dualView.acquisitionMethod} />
          </MetricRow>
        </Expander>
      ) : null}

      {mcView ? (
        <Expander title="ML results (Monte Carlo tree)" defaultOpen={false}>
          {Object.keys(mcView.optimizationStats).length ? (
            <MetricRow>
              {Object.entries(mcView.optimizationStats).map(([k, v]) => (
                <Metric key={k} label={k.replace(/_/g, " ")} value={String(v)} />
              ))}
            </MetricRow>
          ) : null}
          {mcView.stdout ? (
            <pre className="max-h-48 overflow-auto whitespace-pre-wrap text-xs">{mcView.stdout}</pre>
          ) : null}
        </Expander>
      ) : null}

      {session?.has_curve_fitting ? (
        <Expander title="Curve fitting summary" defaultOpen>
          <MarkdownBlock content={session.curve_fitting_summary ?? ""} />
        </Expander>
      ) : (
        <Alert variant="info" className="my-4">
          No curve fitting results in session. Run{" "}
          <Link href="/agents/curve-fitting" className="underline">
            Curve Fitting
          </Link>{" "}
          or place <code>*_peak_fit_results.json</code> in the server <code>results/</code> folder.
        </Alert>
      )}

      <div className="my-4 flex flex-wrap gap-2">
        <Button disabled={loading || !session?.ready} onClick={() => void onAnalyze()}>
          {loading ? "Analyzing…" : "Analyze results"}
        </Button>
        <Button variant="secondary" disabled={loading} onClick={() => void refresh()}>
          Refresh
        </Button>
      </div>

      {parsed ? (
        <div className="mb-4">
          <h3 className="mb-2 font-semibold">Key insights</h3>
          <MetricRow>
            <Metric
              label="Hypothesis status"
              value={String(parsed.hypothesis_status ?? "—").replace(/_/g, " ")}
            />
            <Metric
              label="More experiments"
              value={parsed.more_experiments_needed ? "Yes" : "No"}
            />
          </MetricRow>
        </div>
      ) : null}

      {report ? (
        <Expander title="Analysis report" defaultOpen>
          <MarkdownBlock content={report} />
        </Expander>
      ) : null}
    </StreamlitPage>
  );
}
