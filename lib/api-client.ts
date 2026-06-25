import { apiPath } from "@/lib/api-path";

import { getApiBase } from "@/lib/api-base";

export class ApiError extends Error {
  constructor(
    message: string,
    public status: number,
  ) {
    super(message);
  }
}

const DEFAULT_TIMEOUT_MS = 30_000;
const AGENT_TIMEOUT_MS = 300_000;

type ApiFetchBody = RequestInit["body"] | Record<string, unknown> | unknown[];

function serializeFetchBody(body: ApiFetchBody | undefined): BodyInit | undefined {
  if (body === undefined || body === null) {
    return undefined;
  }
  if (
    typeof body === "string" ||
    body instanceof FormData ||
    body instanceof Blob ||
    body instanceof ArrayBuffer ||
    body instanceof URLSearchParams
  ) {
    return body;
  }
  // Plain objects must be JSON.stringify'd — fetch does not serialize them.
  return JSON.stringify(body);
}

export async function apiFetch<T>(
  path: string,
  options: Omit<RequestInit, "body"> & {
    body?: ApiFetchBody;
    token?: string | null;
    timeoutMs?: number;
  } = {},
): Promise<T> {
  const { token, headers, timeoutMs, body, ...rest } = options;
  const url = `${getApiBase()}${apiPath(path)}`;
  const serializedBody = serializeFetchBody(body);
  const method = (rest.method ?? "GET").toUpperCase();
  const sendJson =
    serializedBody !== undefined &&
    !(serializedBody instanceof FormData) &&
    typeof serializedBody === "string";

  const res = await fetch(url, {
    ...rest,
    body: serializedBody,
    cache: "no-store",
    signal: AbortSignal.timeout(timeoutMs ?? DEFAULT_TIMEOUT_MS),
    headers: {
      ...(sendJson || (method !== "GET" && method !== "HEAD" && serializedBody !== undefined)
        ? { "Content-Type": "application/json" }
        : {}),
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...headers,
    },
  });
  if (!res.ok) {
    const text = await res.text();
    throw new ApiError(text || res.statusText, res.status);
  }
  if (res.status === 204) {
    return undefined as T;
  }
  return res.json() as Promise<T>;
}

export async function getHealth() {
  return apiFetch<{ status: string; version: string }>("/health");
}

export type JupyterConfig = {
  server_url?: string;
  token?: string;
  upload_enabled?: boolean;
  notebook_path?: string;
};

export type AppSettings = {
  llm_provider?: string | null;
  llm_model?: string | null;
  qwen_base_url?: string | null;
  routing_mode?: string | null;
  max_hypothesis_rounds?: number | null;
  watcher_directory?: string | null;
  watcher_results_dir?: string | null;
  watcher_enabled?: boolean | null;
  experimental_mode?: boolean | null;
  jupyter_config?: JupyterConfig | null;
  api_key_configured?: boolean;
};

export async function getSettings(token: string | null) {
  return apiFetch<AppSettings>("/settings", {
    token,
    headers: { "Cache-Control": "no-cache" },
  });
}

export type HistoryEntry = {
  id: string;
  timestamp: string;
  event_type?: string;
  eventType?: string;
  agent?: string | null;
  component?: string | null;
  role?: string | null;
  summary?: string | null;
  experiment_id?: number | null;
  experimentId?: number | null;
};

export type HistoryListResponse = {
  items: HistoryEntry[];
};

export async function getHistory(
  token: string | null,
  params?: { agent?: string; limit?: number; experimentId?: number },
) {
  const search = new URLSearchParams();
  if (params?.agent) search.set("agent", params.agent);
  if (params?.limit != null) search.set("limit", String(params.limit));
  if (params?.experimentId != null) search.set("experiment_id", String(params.experimentId));
  const q = search.toString();
  return apiFetch<HistoryListResponse>(`/history${q ? `?${q}` : ""}`, { token });
}

export async function clearSessionCache(token: string | null) {
  return apiFetch<{ status: string; message: string }>("/session/cache/clear", {
    method: "POST",
    token,
  });
}

export async function patchSettings(
  token: string | null,
  body: AppSettings & { api_key?: string },
) {
  return apiFetch<AppSettings>("/settings", {
    method: "PATCH",
    body: JSON.stringify(body),
    token,
  });
}

export type DashboardSummary = {
  experiment_id?: number | null;
  stage?: string | null;
  active_workflow?: boolean;
  hypothesis_ready?: boolean;
  last_hypothesis_preview?: string | null;
  agent_counts?: Record<string, number>;
};

export type DashboardMetrics = {
  cpu_percent?: number | null;
  memory_percent?: number | null;
  disk_percent?: number | null;
  uptime_seconds?: number | null;
  total_events?: number;
};

export type HypothesisChatBubble = {
  role: "user" | "assistant";
  title?: string | null;
  content: string;
};

export type HypothesisChatResponse = {
  stage: string;
  messages?: HypothesisChatBubble[];
  assistant_message: string;
  options: string[];
  error?: string | null;
  document_id?: string | null;
  document_markdown?: string | null;
  pdf_url?: string | null;
};

export async function getDashboardSummary(token: string | null, experimentId?: number) {
  const q = experimentId != null ? `?experiment_id=${experimentId}` : "";
  return apiFetch<DashboardSummary>(`/dashboard/summary${q}`, { token });
}

export async function getDashboardMetrics(token: string | null) {
  return apiFetch<DashboardMetrics>("/dashboard/metrics", { token });
}

export async function postHypothesisChat(
  token: string | null,
  body: {
    action: "submit_question" | "choose_option" | "generate_hypothesis" | "reset";
    question?: string;
    choice?: string;
    experiment_id?: number;
  },
) {
  return apiFetch<HypothesisChatResponse>("/agents/hypothesis/chat", {
    method: "POST",
    body: JSON.stringify(body),
    token,
    timeoutMs: AGENT_TIMEOUT_MS,
  });
}

export type AgentRunResult = {
  agent: string;
  status: "success" | "error" | "skipped";
  message?: string | null;
  data: Record<string, unknown>;
  nextAgent?: string | null;
};

export type AgentsStatusResponse = {
  stage?: string | null;
  hypothesis_ready?: boolean;
  agents: Array<{
    name: string;
    ready: boolean;
    message: string;
    hint_action?: string;
  }>;
};

export async function getAgentsStatus(token: string | null, experimentId?: number) {
  const q = experimentId != null ? `?experiment_id=${experimentId}` : "";
  return apiFetch<AgentsStatusResponse>(`/agents/status${q}`, { token });
}

export async function postAgentRun(
  token: string | null,
  agentPath: "hypothesis" | "experiment" | "curve-fitting" | "ml" | "analysis",
  options: { experiment_id?: number; payload?: Record<string, unknown> } = {},
) {
  return apiFetch<AgentRunResult>(`/agents/${agentPath}`, {
    method: "POST",
    body: JSON.stringify({
      experiment_id: options.experiment_id,
      payload: options.payload ?? {},
    }),
    token,
    timeoutMs: AGENT_TIMEOUT_MS,
  });
}

export type LiquidHandlingConstraints = {
  instruments: string[];
  plate_format: string;
  max_volume_per_mixture: number;
  materials: string[];
  csv_path: string;
};

export type ExperimentalConstraints = {
  techniques: string[];
  equipment: string[];
  parameters: string[];
  focus_areas: string[];
  liquid_handling: LiquidHandlingConstraints;
};

export type ExperimentManualInputs = {
  manual_clarified_question: string;
  manual_socratic_questions: string;
  manual_socratic_answers: string;
  manual_thoughts: string;
  manual_hypothesis: string;
};

export type ExperimentReadiness = {
  clarified_question: string;
  socratic_questions: string;
  hypothesis: string;
  clarified_source: string;
  socratic_source: string;
  hypothesis_source: string;
  ready_to_run: boolean;
};

export type ExperimentAnalysisContext = {
  analysis_full_report: string;
  analysis_recommendations: string[];
  gp_suggested_compositions: Array<{
    compositions?: Record<string, number>;
    predicted_value?: number | string;
    uncertainty?: number | string;
  }>;
};

export type JupyterUploadResult = {
  success: boolean;
  message: string;
  filename?: string;
  notebook_path?: string;
};

export type ExperimentSession = {
  experimental_constraints: ExperimentalConstraints;
  manual_inputs: ExperimentManualInputs;
  readiness: ExperimentReadiness;
  analysis_context: ExperimentAnalysisContext;
  experimental_outputs?: Record<string, unknown> | null;
  has_experimental_plan?: boolean;
  api_key_configured?: boolean;
  jupyter_config?: JupyterConfig;
  option_lists?: Record<string, string[]>;
  document_id?: string | null;
  document_markdown?: string | null;
  pdf_url?: string | null;
};

export async function getExperimentSession(token: string | null, experimentId?: number) {
  const q = experimentId != null ? `?experiment_id=${experimentId}` : "";
  return apiFetch<ExperimentSession>(`/agents/experiment/session${q}`, { token });
}

export async function patchExperimentSession(
  token: string | null,
  body: {
    experiment_id?: number;
    experimental_constraints?: ExperimentalConstraints;
    manual_inputs?: Partial<ExperimentManualInputs>;
  },
) {
  return apiFetch<ExperimentSession>("/agents/experiment/session", {
    method: "PATCH",
    body: JSON.stringify(body),
    token,
  });
}

export type CurveFittingUploadOptions = {
  experiment_id?: number;
  dataFile?: File | null;
  compositionFile?: File | null;
  /** Server-local path when not uploading (optional fallback). */
  dataFilePath?: string;
  compositionFilePath?: string;
};

/** Multipart upload for curve fitting (proxied through Next.js). */
export type TablePreview = {
  filename?: string;
  columns?: string[];
  rows?: unknown[][];
  preview_row_count?: number;
  total_rows?: number;
  column_count?: number;
  error?: string;
};

export type CurveFittingWellResult = {
  well_name: string;
  read?: string | null;
  fit: {
    success: boolean;
    r2?: number | null;
    rmse?: number | null;
    redchi?: number | null;
    peak_count?: number;
    peaks: Array<{ center?: number | null; height?: number | null; fwhm?: number | null }>;
  };
  quality_assessment: Record<string, string>;
  plot_url?: string | null;
};

export type CurveFittingResultsPayload = {
  success?: boolean;
  error?: string | null;
  summary?: {
    total_wells: number;
    successful_fits: number;
    success_rate_pct: number;
    wells_analyzed?: string[];
  };
  wells: CurveFittingWellResult[];
  files?: Record<string, string>;
};

export async function postCurveFittingPreview(
  token: string | null,
  options: CurveFittingUploadOptions,
): Promise<{
  data_preview?: TablePreview | null;
  composition_preview?: TablePreview | null;
  data_file?: string;
  composition_file?: string;
}> {
  const form = new FormData();
  if (options.dataFile) {
    form.append("data_file", options.dataFile, options.dataFile.name);
  } else if (options.dataFilePath?.trim()) {
    form.append("data_file_path", options.dataFilePath.trim());
  }
  if (options.compositionFile) {
    form.append("composition_file", options.compositionFile, options.compositionFile.name);
  } else if (options.compositionFilePath?.trim()) {
    form.append("composition_file_path", options.compositionFilePath.trim());
  }

  const url = `${getApiBase()}${apiPath("/agents/curve-fitting/preview")}`;
  const res = await fetch(url, {
    method: "POST",
    headers: {
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
    body: form,
    signal: AbortSignal.timeout(AGENT_TIMEOUT_MS),
  });
  if (!res.ok) {
    const text = await res.text();
    throw new ApiError(text || res.statusText, res.status);
  }
  return res.json();
}

export type CurveFittingSession = {
  has_results: boolean;
  last_error?: string | null;
  results?: CurveFittingResultsPayload | null;
  auto_run_pending?: boolean;
  auto_run_data_file?: string | null;
  auto_run_comp_file?: string | null;
  auto_run_params?: Record<string, unknown>;
  demo_workflow_running?: boolean;
  workflow_active?: boolean;
  workflow_step?: string;
  auto_ml_after_curve_fitting?: boolean;
  next_page?: string | null;
};

export async function getCurveFittingSession(token: string | null) {
  return apiFetch<CurveFittingSession>("/agents/curve-fitting/session", { token });
}

export async function getCurveFittingResults(token: string | null) {
  return apiFetch<{
    has_results: boolean;
    last_error?: string | null;
    results?: CurveFittingResultsPayload | null;
  }>("/agents/curve-fitting/results", { token });
}

export type DashboardDetail = {
  system_performance: {
    cpu_percent?: number;
    cpu_delta?: number;
    memory_percent?: number;
    memory_delta?: number;
    disk_percent?: number | null;
    uptime_display?: string;
    uptime_delta_seconds?: number;
    total_events?: number;
    events_delta?: number;
  };
  agent_usage: {
    items: Array<{ agent: string; label: string; count: number; percent: number }>;
    total: number;
    most_used?: { agent: string; label: string; count: number } | null;
  };
  watcher: {
    enabled: boolean;
    server_url?: string;
    watch_dir?: string;
    event_count?: number;
    last_trigger?: string | null;
  };
  uploaded_files: Array<{ name: string; path: string; timestamp: string }>;
  additional_analytics: {
    hypothesis_ready?: boolean;
    has_hypothesis?: boolean;
    has_experimental_outputs?: boolean;
    routing_mode?: string;
  };
  workflow: {
    active: boolean;
    step?: string;
    auto_ml_after_curve_fitting?: boolean;
    analysis_ready?: boolean;
    ml_model_choice?: string;
    workflow_index?: number;
  };
  session_statistics: {
    total_interactions: number;
    uploaded_files_count: number;
    active_sessions: number;
  };
  ml_analysis_activity: {
    curve_fitting_runs: number;
    ml_models_runs: number;
    analysis_runs: number;
    ml_auto_runs: number;
  };
  stage?: string | null;
  last_hypothesis_preview?: string | null;
};

export async function getDashboardDetail(token: string | null, experimentId?: number) {
  const q = experimentId != null ? `?experiment_id=${experimentId}` : "";
  return apiFetch<DashboardDetail>(`/dashboard/detail${q}`, { token });
}

export async function postCurveFittingUpload(
  token: string | null,
  options: CurveFittingUploadOptions,
): Promise<AgentRunResult> {
  const form = new FormData();
  if (options.experiment_id != null) {
    form.append("experiment_id", String(options.experiment_id));
  }
  if (options.dataFile) {
    form.append("data_file", options.dataFile, options.dataFile.name);
  } else if (options.dataFilePath?.trim()) {
    form.append("data_file_path", options.dataFilePath.trim());
  }
  if (options.compositionFile) {
    form.append("composition_file", options.compositionFile, options.compositionFile.name);
  } else if (options.compositionFilePath?.trim()) {
    form.append("composition_file_path", options.compositionFilePath.trim());
  }

  const url = `${getApiBase()}${apiPath("/agents/curve-fitting")}`;
  const res = await fetch(url, {
    method: "POST",
    headers: {
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
    body: form,
    signal: AbortSignal.timeout(AGENT_TIMEOUT_MS),
  });
  if (!res.ok) {
    const text = await res.text();
    throw new ApiError(text || res.statusText, res.status);
  }
  return res.json() as Promise<AgentRunResult>;
}

export async function getLlmProviders() {
  return apiFetch<{
    providers: Array<{
      id: string;
      label: string;
      models: string[];
      default_model: string;
      endpoints: { value: string; label: string }[];
      api_key_label: string;
      api_key_help: string;
    }>;
  }>("/llm/providers");
}

// --- Workflow ---

export type WorkflowStep = {
  name: string;
  automatic?: boolean;
  description?: string;
};

export type WorkflowSession = {
  available_steps: Array<{ name: string; description: string; can_auto: boolean; page?: string }>;
  saved_workflows: Array<{ name: string; steps: WorkflowStep[]; ml_model_choice?: string; created_at?: string }>;
  current_workflow_name?: string | null;
  workflow_steps: WorkflowStep[];
  manual_workflow: string[];
  workflow_auto_flags: Record<string, boolean>;
  workflow_ml_model_choice?: string | null;
  ml_model_options: string[];
  routing_mode: string;
  workflow_active: boolean;
  workflow_step: string;
  workflow_index: number;
  demo_workflow_running?: boolean;
  auto_ml_after_curve_fitting?: boolean;
  auto_route_to_analysis?: boolean;
  next_page?: string | null;
};

export async function getWorkflowSession(token: string | null) {
  return apiFetch<WorkflowSession>("/workflows/session", { token });
}

export async function patchWorkflowSession(
  token: string | null,
  body: Partial<{
    workflow_name: string;
    workflow_steps: WorkflowStep[];
    routing_mode: string;
    workflow_ml_model_choice: string;
    workflow_index: number;
    workflow_step: string;
    auto_ml_after_curve_fitting: boolean;
    auto_route_to_analysis: boolean;
  }>,
) {
  return apiFetch<WorkflowSession>("/workflows/session", { token, method: "PATCH", body });
}

export async function saveWorkflow(
  token: string | null,
  name: string,
  steps: WorkflowStep[],
  apply = false,
) {
  return apiFetch<{ status: string; message: string }>("/workflows/save", {
    token,
    method: "POST",
    body: { name, steps, apply },
  });
}

export async function loadWorkflow(token: string | null, name: string) {
  return apiFetch<WorkflowSession & { status: string; message: string }>("/workflows/load", {
    token,
    method: "POST",
    body: { name },
  });
}

export async function applyWorkflow(token: string | null, name: string) {
  return apiFetch<{ status: string; message: string; manual_workflow?: string[] }>("/workflows/apply", {
    token,
    method: "POST",
    body: { name },
  });
}

export async function deleteWorkflow(token: string | null, name: string) {
  return apiFetch<{ status: string; message: string }>(`/workflows/saved?name=${encodeURIComponent(name)}`, {
    token,
    method: "DELETE",
  });
}

export async function startWorkflow(token: string | null) {
  return apiFetch<{ status: string; message: string; next_page?: string }>("/workflows/start", {
    token,
    method: "POST",
    body: {},
    timeoutMs: AGENT_TIMEOUT_MS,
  });
}

export async function stopWorkflow(token: string | null) {
  return apiFetch<{ status: string; message: string }>("/workflows/stop", {
    token,
    method: "POST",
    body: {},
  });
}

export async function runWorkflowDemo(
  token: string | null,
  options: { auto_fit?: boolean } = {},
) {
  return apiFetch<{
    status: string;
    message: string;
    next_page?: string;
    spectral_path?: string;
    curve_fitting?: Record<string, unknown>;
    ml_automation?: Record<string, unknown>;
  }>("/workflows/demo", {
    token,
    method: "POST",
    body: { auto_fit: options.auto_fit ?? true },
    timeoutMs: AGENT_TIMEOUT_MS,
  });
}

export async function exportWorkflowJson(token: string | null) {
  return apiFetch<{ json: string }>("/workflows/export", { token });
}

// --- ML Models ---

export type MlCsvSchema = {
  ok: boolean;
  error?: string;
  row_count?: number;
  numeric_columns?: string[];
  default_performance_target?: string;
  default_stability_target?: string;
  default_feature_columns?: string[];
  can_compute_instability?: boolean;
};

export type MlSession = {
  model_choice: string;
  model_options: string[];
  ml_model_config: Record<string, unknown>;
  auto_ml_after_curve_fitting: boolean;
  json_path?: string | null;
  csv_path?: string | null;
  composition_path?: string | null;
  latest_files: {
    json_files: string[];
    csv_files: string[];
    composition_files?: string[];
    results_dir: string;
  };
  json_file?: string | null;
  csv_file?: string | null;
  composition_file?: string | null;
  models_requiring_composition?: string[];
  has_composition_file?: boolean;
  has_curve_fitting_exports?: boolean;
  has_gp_results: boolean;
  gp_results?: Record<string, unknown> | null;
  monte_carlo_results?: Record<string, unknown> | null;
  csv_schema?: MlCsvSchema | null;
  torch_available?: boolean;
  ready: boolean;
};

export async function getMlSession(token: string | null) {
  return apiFetch<MlSession>("/ml/session", { token });
}

export async function patchMlSession(
  token: string | null,
  body: Partial<{
    model_choice: string;
    ml_model_config: Record<string, unknown>;
    auto_ml_after_curve_fitting: boolean;
    json_path: string;
    csv_path: string;
    composition_path: string;
  }>,
) {
  return apiFetch<MlSession>("/ml/session", { token, method: "PATCH", body });
}

export async function runMlAutomation(token: string | null, payload: Record<string, unknown> = {}) {
  return apiFetch<{
    status: string;
    message: string;
    result?: Record<string, unknown>;
    session?: MlSession;
  }>("/ml/run", {
    token,
    method: "POST",
    body: { payload },
    timeoutMs: AGENT_TIMEOUT_MS,
  });
}

export async function postMlCompositionUpload(
  token: string | null,
  options: { compositionFile?: File | null; compositionFilePath?: string },
): Promise<MlSession & { status?: string; message?: string }> {
  const form = new FormData();
  if (options.compositionFile) {
    form.append("composition_file", options.compositionFile, options.compositionFile.name);
  } else if (options.compositionFilePath?.trim()) {
    form.append("composition_file_path", options.compositionFilePath.trim());
  }

  const url = `${getApiBase()}${apiPath("/ml/composition")}`;
  const res = await fetch(url, {
    method: "POST",
    headers: {
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
    body: form,
    signal: AbortSignal.timeout(AGENT_TIMEOUT_MS),
  });
  if (!res.ok) {
    const text = await res.text();
    throw new ApiError(text || res.statusText, res.status);
  }
  return res.json();
}

// --- Analysis ---

export type AnalysisSession = {
  research_goal: string;
  hypothesis_context: string;
  experimental_context: string;
  has_curve_fitting: boolean;
  curve_fitting_summary?: string | null;
  has_gp_results: boolean;
  gp_results?: Record<string, unknown> | null;
  monte_carlo_results?: Record<string, unknown> | null;
  has_hypothesis: boolean;
  hypothesis_preview?: string | null;
  analysis_full_report?: string | null;
  analysis_recommendations?: unknown;
  ready: boolean;
};

export async function getAnalysisSession(token: string | null) {
  return apiFetch<AnalysisSession>("/analysis/session", { token });
}

export async function patchAnalysisSession(token: string | null, research_goal: string) {
  return apiFetch<AnalysisSession>("/analysis/session", {
    token,
    method: "PATCH",
    body: { research_goal },
  });
}

export async function runAnalysis(token: string | null, research_goal?: string) {
  return apiFetch<{
    status: string;
    message: string;
    analysis_report?: string;
    parsed?: Record<string, unknown>;
    session?: AnalysisSession;
  }>("/analysis/run", {
    token,
    method: "POST",
    body: { research_goal: research_goal ?? undefined, payload: {} },
    timeoutMs: AGENT_TIMEOUT_MS,
  });
}

// --- Literature Agent ---

export type PaperHit = {
  paper_slug: string;
  title: string;
  doi: string | null;
  score: number;
  summary_excerpt: string;
};

export type LiteratureJobSummary = {
  job_id: string;
  stage: string;
  status: string;
  created_at: number;
};

export type LiteratureJobDetail = LiteratureJobSummary & {
  log_tail: string;
  return_code: number | null;
};

export async function fetchLiteratureHealth(token: string | null) {
  return apiFetch<{ ok: boolean; active_jobs: string[] }>("/literature/health", { token });
}

export async function searchLiterature(token: string | null, query: string, limit = 5) {
  return apiFetch<PaperHit[]>("/literature/search", {
    method: "POST",
    body: { query, limit },
    token,
  });
}

export async function fetchLiteratureJobs(token: string | null) {
  return apiFetch<LiteratureJobSummary[]>("/literature/jobs", { token });
}

export async function fetchLiteratureJobDetail(token: string | null, jobId: string) {
  return apiFetch<LiteratureJobDetail>(`/literature/jobs/${jobId}`, { token });
}

export async function startLiteratureExtraction(
  token: string | null,
  searchQuery: string,
  maxPapers: number,
) {
  return apiFetch<{ job_id: string; status: string }>("/literature/start_stage", {
    method: "POST",
    body: { stage: "extract_batch", search_query: searchQuery, max_papers: maxPapers },
    token,
  });
}

export async function cancelLiteratureJob(token: string | null, jobId: string) {
  return apiFetch<{ job_id: string; status: string }>(`/literature/jobs/${jobId}`, {
    method: "DELETE",
    token,
  });
}
