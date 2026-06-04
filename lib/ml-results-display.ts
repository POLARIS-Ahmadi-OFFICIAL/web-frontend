/** Normalize GP / ML automation payloads for the ML Models UI. */

export type GpResultsView = {
  modelType: string;
  target: string;
  kernel: string;
  cvR2: string;
  topCandidates: Array<Record<string, string | number>>;
  candidateColumns: Array<{ key: string; label: string }>;
};

export type DualGpResultsView = {
  modelType: string;
  performanceTarget: string;
  stabilityTarget: string;
  acquisitionMethod: string;
  topCandidates: Array<Record<string, string | number>>;
  candidateColumns: Array<{ key: string; label: string }>;
};

export type MonteCarloResultsView = {
  success: boolean;
  returncode: number | null;
  optimizationStats: Record<string, string | number>;
  topCandidates: Array<Record<string, string | number>>;
  stdout: string;
  stderr: string;
  llmAgent: Record<string, unknown> | null;
};

const CANDIDATE_FIELD_LABELS: Record<string, string> = {
  rank: "Rank",
  candidate: "Candidate",
  predicted_value: "Predicted value",
  "Predicted Value": "Predicted value",
  uncertainty: "Uncertainty",
  Uncertainty: "Uncertainty",
  acquisition_score: "Acquisition score",
  "Acquisition Score": "Acquisition score",
  acquisition_score_base: "Base acquisition",
  mu_perf: "μ performance",
  std_perf: "σ performance",
  init_tune_score: "Instability (pred.)",
  adjust_tune_score: "Stability adjust",
  R_squared: "R²",
};

function pickString(obj: Record<string, unknown>, keys: string[]): string | null {
  for (const k of keys) {
    const v = obj[k];
    if (v !== undefined && v !== null && String(v).trim() !== "") {
      return String(v);
    }
  }
  return null;
}

function formatNumber(n: number, digits = 4): string {
  if (!Number.isFinite(n)) return "—";
  return n.toFixed(digits);
}

function rowsToTable(rawCandidates: unknown): {
  topCandidates: Array<Record<string, string | number>>;
  candidateColumns: Array<{ key: string; label: string }>;
} {
  const topCandidates: Array<Record<string, string | number>> = [];
  const columnKeys = new Set<string>();

  if (Array.isArray(rawCandidates)) {
    for (const row of rawCandidates) {
      if (!row || typeof row !== "object") continue;
      const out: Record<string, string | number> = {};
      for (const [k, v] of Object.entries(row as Record<string, unknown>)) {
        if (v === undefined || v === null) continue;
        columnKeys.add(k);
        if (typeof v === "number" && Number.isFinite(v)) {
          out[k] = Number(v.toFixed(4));
        } else {
          out[k] = String(v);
        }
      }
      topCandidates.push(out);
    }
  }

  const candidateColumns = Array.from(columnKeys).map((key) => ({
    key,
    label: CANDIDATE_FIELD_LABELS[key] ?? key.replace(/_/g, " "),
  }));

  return { topCandidates, candidateColumns };
}

export function formatCvR2(gp: Record<string, unknown>): string {
  const mean = gp.cv_score ?? gp.cv_r2 ?? gp.cv_R2;
  const std = gp.cv_std ?? gp.cv_std_dev;
  if (mean === undefined || mean === null) return "—";
  const m = typeof mean === "number" ? mean : parseFloat(String(mean));
  if (!Number.isFinite(m)) return "—";
  if (std !== undefined && std !== null) {
    const s = typeof std === "number" ? std : parseFloat(String(std));
    if (Number.isFinite(s)) {
      return `${formatNumber(m)} ± ${formatNumber(s)}`;
    }
  }
  return formatNumber(m);
}

export function buildGpResultsView(raw: unknown): GpResultsView | null {
  if (!raw || typeof raw !== "object") return null;
  const gp = raw as Record<string, unknown>;
  if (gp.success === false) return null;
  if (gp.model_type === "DualTorchGP") return null;

  const modelType =
    pickString(gp, ["model_type", "modelType"]) ?? "Gaussian Process";
  const target = pickString(gp, ["target", "target_name", "target_col"]) ?? "—";
  const kernel = pickString(gp, ["kernel", "kernel_type"]) ?? "—";
  const cvR2 = formatCvR2(gp);
  const { topCandidates, candidateColumns } = rowsToTable(gp.top_candidates);

  return { modelType, target, kernel, cvR2, topCandidates, candidateColumns };
}

export function buildDualGpResultsView(raw: unknown): DualGpResultsView | null {
  if (!raw || typeof raw !== "object") return null;
  const gp = raw as Record<string, unknown>;
  if (gp.success === false) return null;
  if (gp.model_type !== "DualTorchGP") return null;

  const { topCandidates, candidateColumns } = rowsToTable(gp.top_candidates);

  return {
    modelType: "Dual-objective PyTorch GP",
    performanceTarget:
      pickString(gp, ["performance_target", "target"]) ?? "—",
    stabilityTarget: pickString(gp, ["stability_target"]) ?? "—",
    acquisitionMethod:
      pickString(gp, ["acquisition_method"]) ?? "UCB + stability adjustment",
    topCandidates,
    candidateColumns,
  };
}

export function buildMonteCarloResultsView(raw: unknown): MonteCarloResultsView | null {
  if (!raw || typeof raw !== "object") return null;
  const mc = raw as Record<string, unknown>;
  if (mc.model_type !== "MonteCarloDecisionTree" && !("stdout" in mc)) return null;

  const statsRaw = mc.optimization_stats;
  const optimizationStats: Record<string, string | number> = {};
  if (statsRaw && typeof statsRaw === "object") {
    for (const [k, v] of Object.entries(statsRaw as Record<string, unknown>)) {
      optimizationStats[k] = typeof v === "number" ? v : String(v);
    }
  }

  const { topCandidates } = rowsToTable(mc.top_candidates);
  const llm = mc.llm_agent_results;
  const llmAgent =
    llm && typeof llm === "object" ? (llm as Record<string, unknown>) : null;

  return {
    success: mc.success !== false,
    returncode:
      typeof mc.returncode === "number" ? mc.returncode : null,
    optimizationStats,
    topCandidates,
    stdout: typeof mc.stdout === "string" ? mc.stdout : "",
    stderr: typeof mc.stderr === "string" ? mc.stderr : "",
    llmAgent,
  };
}
