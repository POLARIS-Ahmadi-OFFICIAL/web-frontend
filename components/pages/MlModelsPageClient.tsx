"use client";

import Link from "next/link";
import { useCallback, useEffect, useState } from "react";

import {
  Alert,
  Button,
  Checkbox,
  Expander,
  FormField,
  Metric,
  MetricRow,
  NumberInput,
  Select,
  StreamlitPage,
  TextInput,
} from "@/components/ui";
import {
  getMlSession,
  patchMlSession,
  postMlCompositionUpload,
  runMlAutomation,
  type MlSession,
} from "@/lib/api-client";
import {
  buildDualGpResultsView,
  buildGpResultsView,
  buildMonteCarloResultsView,
} from "@/lib/ml-results-display";
import { ML_MODEL_OPTIONS, ML_MODEL_REQUIRES_COMPOSITION } from "@/lib/polaris-content";
import { useAccessToken } from "@/lib/use-access-token";

const DUAL = ML_MODEL_OPTIONS[1];
const MC = ML_MODEL_OPTIONS[2];
const SINGLE = ML_MODEL_OPTIONS[0];

function cfgDual(cfg: Record<string, unknown> | undefined): Record<string, unknown> {
  const d = cfg?.dual_gp;
  return d && typeof d === "object" ? (d as Record<string, unknown>) : {};
}

function cfgMc(cfg: Record<string, unknown> | undefined): Record<string, unknown> {
  const d = cfg?.monte_carlo_tree;
  return d && typeof d === "object" ? (d as Record<string, unknown>) : {};
}

function cfgInst(dual: Record<string, unknown>): Record<string, unknown> {
  const p = dual.instability_params;
  return p && typeof p === "object" ? (p as Record<string, unknown>) : {};
}

function CandidatesTable({
  columns,
  rows,
}: {
  columns: Array<{ key: string; label: string }>;
  rows: Array<Record<string, string | number>>;
}) {
  if (!rows.length) return null;
  return (
    <div className="mt-3 overflow-x-auto">
      <table className="w-full border-collapse text-xs">
        <thead>
          <tr>
            {columns.map((col) => (
              <th key={col.key} className="border border-[var(--st-border)] px-2 py-1 text-left">
                {col.label}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.slice(0, 10).map((row, i) => (
            <tr key={i}>
              {columns.map((col) => (
                <td key={col.key} className="border border-[var(--st-border)] px-2 py-1">
                  {row[col.key] ?? "—"}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

export function MlModelsPageClient() {
  const token = useAccessToken();
  const [session, setSession] = useState<MlSession | null>(null);
  const [modelChoice, setModelChoice] = useState<string>(SINGLE);
  const [autoMl, setAutoMl] = useState(false);
  const [jsonFile, setJsonFile] = useState("");
  const [csvFile, setCsvFile] = useState("");
  const [compositionFile, setCompositionFile] = useState("");
  const [compositionPath, setCompositionPath] = useState("");
  const [compositionUpload, setCompositionUpload] = useState<File | null>(null);
  const [target, setTarget] = useState("peak_1_wavelength");
  const [beta, setBeta] = useState("2");
  const [nCandidates, setNCandidates] = useState("20");
  const [perfTarget, setPerfTarget] = useState("R_squared");
  const [stabTarget, setStabTarget] = useState("");
  const [computeInstability, setComputeInstability] = useState(false);
  const [featureColumnsText, setFeatureColumnsText] = useState("");
  const [dualBeta, setDualBeta] = useState("2");
  const [dualLengthscale, setDualLengthscale] = useState("1");
  const [dualNoise, setDualNoise] = useState("0.0001");
  const [instabilityPercentile, setInstabilityPercentile] = useState("0.7");
  const [useMultiplicative, setUseMultiplicative] = useState(true);
  const [instTargetWl, setInstTargetWl] = useState("700");
  const [instWlTol, setInstWlTol] = useState("10");
  const [instDegrad, setInstDegrad] = useState("0.4");
  const [instPos, setInstPos] = useState("0.6");
  const [instMultiPenalty, setInstMultiPenalty] = useState("0.5");
  const [mcRepoPath, setMcRepoPath] = useState("");
  const [mcNAttempts, setMcNAttempts] = useState("500");
  const [mcWithAgent, setMcWithAgent] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [runOutput, setRunOutput] = useState<string | null>(null);
  const [lastResult, setLastResult] = useState<Record<string, unknown> | null>(null);

  const applySessionConfig = useCallback((s: MlSession) => {
    const cfg = s.ml_model_config as Record<string, unknown>;
    const dual = cfgDual(cfg);
    const mc = cfgMc(cfg);
    const inst = cfgInst(dual);
    const schema = s.csv_schema;

    if (cfg?.target) setTarget(String(cfg.target));
    if (cfg?.beta != null) setBeta(String(cfg.beta));
    if (cfg?.n_candidates != null) setNCandidates(String(cfg.n_candidates));

    setPerfTarget(
      String(dual.performance_target ?? schema?.default_performance_target ?? "R_squared"),
    );
    setStabTarget(
      String(dual.stability_target ?? schema?.default_stability_target ?? ""),
    );
    setComputeInstability(Boolean(dual.compute_instability));
    const feats =
      (Array.isArray(dual.feature_columns) && dual.feature_columns.length
        ? (dual.feature_columns as string[])
        : schema?.default_feature_columns) ?? [];
    setFeatureColumnsText(feats.join(", "));
    if (dual.beta != null) setDualBeta(String(dual.beta));
    if (dual.lengthscale != null) setDualLengthscale(String(dual.lengthscale));
    if (dual.noise_level != null) setDualNoise(String(dual.noise_level));
    if (dual.instability_threshold_percentile != null) {
      setInstabilityPercentile(String(dual.instability_threshold_percentile));
    }
    if (dual.use_multiplicative_adjustment != null) {
      setUseMultiplicative(Boolean(dual.use_multiplicative_adjustment));
    }
    if (inst.target_wavelength != null) setInstTargetWl(String(inst.target_wavelength));
    if (inst.wavelength_tolerance != null) setInstWlTol(String(inst.wavelength_tolerance));
    if (inst.degradation_weight != null) setInstDegrad(String(inst.degradation_weight));
    if (inst.position_weight != null) setInstPos(String(inst.position_weight));
    if (inst.multiple_peak_penalty != null) setInstMultiPenalty(String(inst.multiple_peak_penalty));
    setMcRepoPath(String(mc.repo_path ?? ""));
    if (mc.n_attempts != null) setMcNAttempts(String(mc.n_attempts));
    setMcWithAgent(Boolean(mc.with_agent));
  }, []);

  const refresh = useCallback(async () => {
    const s = await getMlSession(token);
    setSession(s);
    setModelChoice(s.model_choice);
    setAutoMl(s.auto_ml_after_curve_fitting);
    setJsonFile(
      s.json_file ??
        (s.json_path ? String(s.json_path).split("/").pop() : "") ??
        s.latest_files.json_files[0] ??
        "",
    );
    setCsvFile(
      s.csv_file ??
        (s.csv_path ? String(s.csv_path).split("/").pop() : "") ??
        s.latest_files.csv_files[0] ??
        "",
    );
    setCompositionFile(
      s.composition_file ??
        (s.composition_path ? String(s.composition_path).split("/").pop() : "") ??
        s.latest_files.composition_files?.[0] ??
        "",
    );
    setCompositionPath(s.composition_path ?? "");
    applySessionConfig(s);
  }, [token, applySessionConfig]);

  useEffect(() => {
    void refresh().catch((e) => setError(e instanceof Error ? e.message : "Load failed"));
  }, [refresh]);

  const needsComposition = ML_MODEL_REQUIRES_COMPOSITION.includes(modelChoice);
  const schema = session?.csv_schema;
  const numericOptions = (schema?.numeric_columns ?? []).map((c) => ({ value: c, label: c }));

  function buildMlModelConfig(): Record<string, unknown> {
    const featureColumns = featureColumnsText
      .split(",")
      .map((s) => s.trim())
      .filter(Boolean);
    return {
      target,
      beta: parseFloat(beta) || 2,
      n_candidates: parseInt(nCandidates, 10) || 20,
      dual_gp: {
        performance_target: perfTarget,
        stability_target: stabTarget || undefined,
        compute_instability: computeInstability,
        feature_columns: featureColumns.length ? featureColumns : undefined,
        beta: parseFloat(dualBeta) || 2,
        lengthscale: parseFloat(dualLengthscale) || 1,
        noise_level: parseFloat(dualNoise) || 1e-4,
        instability_threshold_percentile: parseFloat(instabilityPercentile) || 0.7,
        use_multiplicative_adjustment: useMultiplicative,
        instability_params: {
          target_wavelength: parseFloat(instTargetWl) || 700,
          wavelength_tolerance: parseFloat(instWlTol) || 10,
          degradation_weight: parseFloat(instDegrad) || 0.4,
          position_weight: parseFloat(instPos) || 0.6,
          multiple_peak_penalty: parseFloat(instMultiPenalty) || 0.5,
        },
      },
      monte_carlo_tree: {
        repo_path: mcRepoPath.trim(),
        n_attempts: parseInt(mcNAttempts, 10) || 500,
        with_agent: mcWithAgent,
      },
    };
  }

  async function saveConfig() {
    if (compositionUpload) {
      const up = await postMlCompositionUpload(token, { compositionFile: compositionUpload });
      if (up.status === "error") {
        throw new Error(up.message ?? "Composition upload failed");
      }
      setCompositionUpload(null);
    }
    await patchMlSession(token, {
      model_choice: modelChoice,
      auto_ml_after_curve_fitting: autoMl,
      json_path: jsonFile || undefined,
      csv_path: csvFile || undefined,
      composition_path: compositionPath.trim() || compositionFile || undefined,
      ml_model_config: buildMlModelConfig(),
    });
    await refresh();
  }

  async function onRun() {
    setLoading(true);
    setError(null);
    setSuccess(null);
    setRunOutput(null);
    try {
      if (needsComposition && !compositionUpload && !compositionFile && !compositionPath.trim()) {
        if (!session?.has_composition_file) {
          setError(
            "Single-objective GP requires a composition CSV. Upload one, pick from the list, or enter a server path.",
          );
          setLoading(false);
          return;
        }
      }
      if (modelChoice === DUAL && !csvFile) {
        setError("Dual-objective GP requires a peak export CSV. Run curve fitting or select a CSV.");
        setLoading(false);
        return;
      }
      if (modelChoice === MC && !mcRepoPath.trim()) {
        setError("Monte Carlo Decision Tree requires the external repo path.");
        setLoading(false);
        return;
      }
      await saveConfig();
      const res = await runMlAutomation(token, { model_choice: modelChoice });
      if (res.status === "error") {
        setError(res.message);
        setLastResult(null);
      } else {
        setSuccess(res.message);
        const result = res.result as Record<string, unknown> | undefined;
        setLastResult(result ?? null);
        setRunOutput(result ? JSON.stringify(result, null, 2) : null);
      }
      await refresh();
    } catch (e) {
      setError(e instanceof Error ? e.message : "ML run failed");
    } finally {
      setLoading(false);
    }
  }

  const gpView = buildGpResultsView(
    modelChoice === SINGLE ? (lastResult ?? session?.gp_results) : null,
  );
  const dualView = buildDualGpResultsView(
    modelChoice === DUAL ? (lastResult ?? session?.gp_results) : null,
  );
  const mcView = buildMonteCarloResultsView(
    modelChoice === MC ? (lastResult ?? session?.monte_carlo_results) : null,
  );

  return (
    <StreamlitPage
      title="ML Models"
      icon="🤖"
      description="Train and compare ML models on curve fitting results, then run optimization cycles."
      layout="wide"
    >
      {error ? <Alert variant="error">{error}</Alert> : null}
      {success ? <Alert variant="success" className="mb-4">{success}</Alert> : null}

      <FormField
        label="Select ML method for optimization"
        help="Used for workflow automation and manual runs (matches Streamlit hub selector)."
      >
        <Select
          value={modelChoice}
          onChange={(e) => setModelChoice(e.target.value)}
          options={ML_MODEL_OPTIONS.map((m) => ({ value: m, label: m }))}
        />
      </FormField>

      <Checkbox
        label="Run automatically after curve fitting completes"
        checked={autoMl}
        onChange={(e) => setAutoMl(e.target.checked)}
      />
      {autoMl ? (
        <Alert variant="info" className="mt-2">
          Automation enabled: this model runs when curve fitting finishes in a workflow.
        </Alert>
      ) : null}

      <div className="mt-6 space-y-4 rounded-lg border border-[var(--st-border)] p-4">
        <h3 className="font-semibold">Data input</h3>
        <p className="text-xs text-[var(--st-muted)]">
          Results directory: {session?.latest_files.results_dir ?? "results/"}
        </p>
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          <FormField label="Curve fitting results (JSON)">
            <Select
              value={jsonFile}
              onChange={(e) => setJsonFile(e.target.value)}
              options={[
                { value: "", label: "(none)" },
                ...(session?.latest_files.json_files ?? []).map((f) => ({ value: f, label: f })),
              ]}
            />
          </FormField>
          <FormField
            label="Peak export (CSV)"
            help="Required for dual-objective GP; produced by curve fitting export."
          >
            <Select
              value={csvFile}
              onChange={(e) => setCsvFile(e.target.value)}
              options={[
                { value: "", label: "(none)" },
                ...(session?.latest_files.csv_files ?? []).map((f) => ({ value: f, label: f })),
              ]}
            />
          </FormField>
          {needsComposition ? (
            <FormField
              label="Composition (CSV)"
              help="Materials as rows, wells as columns — required for single-objective GP."
            >
              <Select
                value={compositionFile}
                onChange={(e) => setCompositionFile(e.target.value)}
                options={[
                  { value: "", label: "(none)" },
                  ...(session?.latest_files.composition_files ?? []).map((f) => ({
                    value: f,
                    label: f,
                  })),
                ]}
              />
            </FormField>
          ) : null}
        </div>

        {needsComposition ? (
          <div className="space-y-3 rounded-md border border-dashed border-[var(--st-border)] p-3">
            <p className="text-sm font-medium">Composition file (required for this model)</p>
            <FormField label="Upload composition CSV">
              <input
                type="file"
                accept=".csv,.xlsx,.xls"
                className="w-full text-sm file:mr-4 file:rounded-md file:border-0 file:bg-[var(--st-primary)] file:px-4 file:py-2 file:text-white"
                onChange={(e) => setCompositionUpload(e.target.files?.[0] ?? null)}
              />
            </FormField>
            <FormField label="Or: composition path on API server">
              <TextInput
                value={compositionPath}
                onChange={(e) => setCompositionPath(e.target.value)}
                placeholder="/app/data/uploads/.../composition.csv"
              />
            </FormField>
          </div>
        ) : null}

        {session?.has_curve_fitting_exports === false && !session?.ready ? (
          <Alert variant="info">
            Run{" "}
            <Link href="/agents/curve-fitting" className="underline">
              Curve Fitting
            </Link>{" "}
            first to populate results.
          </Alert>
        ) : session?.ready ? (
          <Alert variant="success" className="text-xs">
            Linked: {session.json_file ?? "—"} {session.csv_file ? `+ ${session.csv_file}` : ""}
          </Alert>
        ) : null}
      </div>

      {modelChoice === SINGLE ? (
        <div className="mt-4 space-y-3 rounded-lg border border-[var(--st-border)] p-4">
          <h3 className="font-semibold">Single-objective GP configuration</h3>
          <FormField label="Optimization target column">
            <TextInput value={target} onChange={(e) => setTarget(e.target.value)} />
          </FormField>
          <div className="grid gap-4 sm:grid-cols-2">
            <FormField label="UCB beta (exploration)">
              <NumberInput value={beta} onChange={(e) => setBeta(e.target.value)} step="0.1" />
            </FormField>
            <FormField label="Candidate count">
              <NumberInput value={nCandidates} onChange={(e) => setNCandidates(e.target.value)} />
            </FormField>
          </div>
        </div>
      ) : null}

      {modelChoice === DUAL ? (
        <div className="mt-4 space-y-4 rounded-lg border border-[var(--st-border)] p-4">
          <h3 className="font-semibold">Dual-objective PyTorch GP</h3>
          <p className="text-sm text-[var(--st-muted)]">
            Trains two GPs (performance + stability) and ranks conditions by combined acquisition score.
          </p>
          {session?.torch_available === false ? (
            <Alert variant="error">
              PyTorch is not installed on the API server. Install with{" "}
              <code className="text-xs">pip install &apos;.[ml]&apos;</code> in the backend environment.
            </Alert>
          ) : null}
          {schema?.ok === false ? (
            <Alert variant="warning">{schema.error ?? "Could not read peak CSV."}</Alert>
          ) : null}
          {schema?.ok ? (
            <p className="text-xs text-[var(--st-muted)]">
              CSV preview: {schema.row_count} rows, {schema.numeric_columns?.length ?? 0} numeric columns
            </p>
          ) : null}
          <div className="grid gap-4 md:grid-cols-2">
            <FormField label="Performance target column">
              {numericOptions.length ? (
                <Select
                  value={perfTarget}
                  onChange={(e) => setPerfTarget(e.target.value)}
                  options={numericOptions}
                />
              ) : (
                <TextInput value={perfTarget} onChange={(e) => setPerfTarget(e.target.value)} />
              )}
            </FormField>
            {!computeInstability ? (
              <FormField label="Stability target column">
                {numericOptions.length ? (
                  <Select
                    value={stabTarget}
                    onChange={(e) => setStabTarget(e.target.value)}
                    options={numericOptions}
                  />
                ) : (
                  <TextInput value={stabTarget} onChange={(e) => setStabTarget(e.target.value)} />
                )}
              </FormField>
            ) : (
              <Alert variant="info" className="text-xs self-end">
                Instability score will be computed from peak columns.
              </Alert>
            )}
          </div>
          {schema?.can_compute_instability ? (
            <Checkbox
              label="Compute instability score from peak data"
              checked={computeInstability}
              onChange={(e) => setComputeInstability(e.target.checked)}
            />
          ) : null}
          <FormField
            label="Feature columns (comma-separated)"
            help="GP inputs; defaults to Peak_* columns from the export."
          >
            <TextInput
              value={featureColumnsText}
              onChange={(e) => setFeatureColumnsText(e.target.value)}
              placeholder="Peak_1_Wavelength, Peak_1_Intensity, …"
            />
          </FormField>
          {computeInstability ? (
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              <FormField label="Target wavelength (nm)">
                <NumberInput value={instTargetWl} onChange={(e) => setInstTargetWl(e.target.value)} />
              </FormField>
              <FormField label="Wavelength tolerance (nm)">
                <NumberInput value={instWlTol} onChange={(e) => setInstWlTol(e.target.value)} />
              </FormField>
              <FormField label="Degradation weight">
                <NumberInput value={instDegrad} onChange={(e) => setInstDegrad(e.target.value)} step="0.1" />
              </FormField>
              <FormField label="Position weight">
                <NumberInput value={instPos} onChange={(e) => setInstPos(e.target.value)} step="0.1" />
              </FormField>
              <FormField label="Multiple peak penalty">
                <NumberInput
                  value={instMultiPenalty}
                  onChange={(e) => setInstMultiPenalty(e.target.value)}
                  step="0.1"
                />
              </FormField>
            </div>
          ) : null}
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            <FormField label="GP noise level">
              <NumberInput value={dualNoise} onChange={(e) => setDualNoise(e.target.value)} step="0.0001" />
            </FormField>
            <FormField label="RBF lengthscale">
              <NumberInput value={dualLengthscale} onChange={(e) => setDualLengthscale(e.target.value)} step="0.1" />
            </FormField>
            <FormField label="Exploration β (performance UCB)">
              <NumberInput value={dualBeta} onChange={(e) => setDualBeta(e.target.value)} step="0.1" />
            </FormField>
            <FormField label="Instability threshold percentile">
              <NumberInput
                value={instabilityPercentile}
                onChange={(e) => setInstabilityPercentile(e.target.value)}
                step="0.05"
              />
            </FormField>
          </div>
          <Checkbox
            label="Use multiplicative stability adjustment (notebook method)"
            checked={useMultiplicative}
            onChange={(e) => setUseMultiplicative(e.target.checked)}
          />
        </div>
      ) : null}

      {modelChoice === MC ? (
        <div className="mt-4 space-y-4 rounded-lg border border-[var(--st-border)] p-4">
          <h3 className="font-semibold">Monte Carlo Decision Tree (external project)</h3>
          <p className="text-sm text-[var(--st-muted)]">
            Runs <code className="text-xs">python main.py</code> in the external repo. Passes attempt count via{" "}
            <code className="text-xs">MC_N_ATTEMPTS</code>.
          </p>
          <FormField
            label="Repository path (folder containing main.py)"
            help="Absolute path on the API server, or set MONTE_CARLO_REPO_PATH in the backend environment."
          >
            <TextInput
              value={mcRepoPath}
              onChange={(e) => setMcRepoPath(e.target.value)}
              placeholder="/path/to/monte carlo decision tree"
            />
          </FormField>
          <div className="grid gap-4 sm:grid-cols-2">
            <FormField label="Monte Carlo attempts per cycle">
              <NumberInput value={mcNAttempts} onChange={(e) => setMcNAttempts(e.target.value)} step="10" />
            </FormField>
          </div>
          <Checkbox
            label="Run with LLM agent (--with-agent --auto-apply)"
            checked={mcWithAgent}
            onChange={(e) => setMcWithAgent(e.target.checked)}
          />
        </div>
      ) : null}

      <div className="mt-4 flex flex-wrap gap-2">
        <Button disabled={loading} onClick={() => void onRun()}>
          {loading ? "Running…" : modelChoice === MC ? "Run Monte Carlo Decision Tree" : "Run ML automation"}
        </Button>
        <Button variant="secondary" disabled={loading} onClick={() => void saveConfig().then(refresh)}>
          Save settings
        </Button>
        <Link href="/agents/analysis">
          <Button variant="secondary">Continue to Analysis →</Button>
        </Link>
      </div>

      {gpView ? (
        <Expander title="Single-objective GP results" defaultOpen>
          <MetricRow>
            <Metric label="Target" value={gpView.target} />
            <Metric label="CV R²" value={gpView.cvR2} />
            <Metric label="Kernel" value={gpView.kernel} />
          </MetricRow>
          <CandidatesTable columns={gpView.candidateColumns} rows={gpView.topCandidates} />
        </Expander>
      ) : null}

      {dualView ? (
        <Expander title="Dual-objective GP results" defaultOpen>
          <MetricRow>
            <Metric label="Performance" value={dualView.performanceTarget} />
            <Metric label="Stability" value={dualView.stabilityTarget} />
            <Metric label="Acquisition" value={dualView.acquisitionMethod} />
          </MetricRow>
          <CandidatesTable columns={dualView.candidateColumns} rows={dualView.topCandidates} />
        </Expander>
      ) : null}

      {mcView ? (
        <Expander title="Monte Carlo Decision Tree results" defaultOpen>
          {mcView.success ? (
            <Alert variant="success" className="mb-2 text-xs">
              Process finished successfully.
            </Alert>
          ) : (
            <Alert variant="error" className="mb-2 text-xs">
              Process exited with code {mcView.returncode ?? "unknown"}.
            </Alert>
          )}
          {Object.keys(mcView.optimizationStats).length ? (
            <MetricRow>
              {Object.entries(mcView.optimizationStats).map(([k, v]) => (
                <Metric key={k} label={k.replace(/_/g, " ")} value={String(v)} />
              ))}
            </MetricRow>
          ) : null}
          {mcView.topCandidates.length ? (
            <>
              <p className="mb-1 text-sm font-semibold">Top candidates (from export CSV)</p>
              <CandidatesTable
                columns={Object.keys(mcView.topCandidates[0] ?? {}).map((key) => ({
                  key,
                  label: key.replace(/_/g, " "),
                }))}
                rows={mcView.topCandidates}
              />
            </>
          ) : null}
          {mcView.llmAgent ? (
            <Expander title="LLM agent summary" defaultOpen={false}>
              <pre className="max-h-48 overflow-auto text-xs">
                {JSON.stringify(mcView.llmAgent, null, 2)}
              </pre>
            </Expander>
          ) : null}
          {mcView.stdout ? (
            <Expander title="stdout" defaultOpen>
              <pre className="max-h-96 overflow-auto whitespace-pre-wrap text-xs">{mcView.stdout}</pre>
            </Expander>
          ) : null}
          {mcView.stderr ? (
            <Expander title="stderr" defaultOpen={false}>
              <pre className="max-h-48 overflow-auto whitespace-pre-wrap text-xs text-red-700">
                {mcView.stderr}
              </pre>
            </Expander>
          ) : null}
        </Expander>
      ) : null}

      {runOutput && !gpView && !dualView && !mcView ? (
        <Expander title="Last run output" defaultOpen={false}>
          <pre className="max-h-64 overflow-auto text-xs">{runOutput}</pre>
        </Expander>
      ) : null}
    </StreamlitPage>
  );
}
