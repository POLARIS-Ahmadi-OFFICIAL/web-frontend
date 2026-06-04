export const APP_TAGLINE =
  "AI-assisted workflow for materials discovery — from hypothesis to optimized compositions.";

export const GETTING_STARTED = `
POLARIS guides you through hypothesis-driven experiments with LLM agents, spectral curve fitting, and Gaussian-process optimization.

**Before your first run**
1. Sign in with GitHub (Supabase Auth).
2. Open **Settings → General** and add your LLM API key (Qwen via Hugging Face or Google Gemini).
3. Optional: **Settings → Experiment** for Jupyter upload paths and plate constraints.
4. Start on **Home** or jump to **Hypothesis** to frame your research question.
`;

export const QUICK_START_STEPS = [
  {
    step: 1,
    title: "Frame your question",
    description: "Use the Hypothesis agent for Socratic refinement and a testable statement.",
    href: "/agents/hypothesis",
    cta: "Open Hypothesis",
  },
  {
    step: 2,
    title: "Design the experiment",
    description: "Generate protocols, well layouts, and composition worklists.",
    href: "/agents/experiment",
    cta: "Open Experiment",
  },
  {
    step: 3,
    title: "Analyze spectra",
    description: "Upload luminescence CSVs; fit multi-peak Gaussians per well.",
    href: "/agents/curve-fitting",
    cta: "Curve Fitting",
  },
  {
    step: 4,
    title: "Optimize & interpret",
    description: "Run ML models, then compare results to your hypothesis in Analysis.",
    href: "/agents/ml-models",
    cta: "ML → Analysis",
  },
] as const;

export const AGENT_CARDS = [
  {
    href: "/agents/hypothesis",
    icon: "🧠",
    title: "Hypothesis",
    subtitle: "Question → hypothesis",
    description: "Tree-of-thought reasoning, literature-aware questioning, exportable reports.",
  },
  {
    href: "/agents/experiment",
    icon: "🧪",
    title: "Experiment",
    subtitle: "Protocol & worklist",
    description: "Liquid-handling constraints, GP-suggested compositions, Jupyter notebook export.",
  },
  {
    href: "/agents/curve-fitting",
    icon: "📈",
    title: "Curve Fitting",
    subtitle: "Spectral peaks",
    description: "Multi-peak fitting, quality metrics, peak CSV for downstream ML.",
  },
  {
    href: "/agents/ml-models",
    icon: "🤖",
    title: "ML Models",
    subtitle: "Explore composition space",
    description: "Single- and dual-objective GP, Monte Carlo tree integration.",
  },
  {
    href: "/agents/analysis",
    icon: "🔎",
    title: "Analysis",
    subtitle: "Validate & decide next steps",
    description: "Relate fits and ML candidates to your hypothesis with structured recommendations.",
  },
  {
    href: "/workflow",
    icon: "🧭",
    title: "Workflow",
    subtitle: "End-to-end automation",
    description: "Build step order, auto-run ML after fitting, demo dataset for onboarding.",
  },
] as const;

export const RESEARCHER_FEATURES = [
  {
    title: "Reproducible session history",
    detail: "Export interactions from History for lab notebooks, SI sections, or PI updates.",
  },
  {
    title: "Composition × well matrices",
    detail: "CSV composition files (materials × wells) link chemistry to spectral readouts.",
  },
  {
    title: "Peak-level exports",
    detail: "Curve fitting writes structured peak CSVs consumed automatically by ML Models.",
  },
  {
    title: "Literature-grounded analysis",
    detail: "Analysis agent summarizes results in context of your stated research goal.",
  },
  {
    title: "Filesystem watcher",
    detail: "Drop new spectral files into a watch folder to trigger fitting without manual upload.",
  },
  {
    title: "Demo workflow",
    detail: "Synthetic PEA/FAPbI₃-style data to train new users before real plates.",
  },
] as const;

export const NAVIGATION_LIST = [
  { label: "Home", desc: "Introduction, quick start, and session overview" },
  { label: "Dashboard", desc: "System metrics and agent usage analytics" },
  { label: "Hypothesis", desc: "Interactive hypothesis generation" },
  { label: "Experiment", desc: "Experimental planning and protocols" },
  { label: "Curve Fitting", desc: "Data analysis and curve fitting" },
  { label: "ML Models", desc: "Gaussian Process and optimization models" },
  { label: "Analysis", desc: "Analyze results vs hypothesis" },
  { label: "Workflow", desc: "Run and build workflows" },
  { label: "Watcher Control", desc: "Filesystem watcher server" },
  { label: "Settings", desc: "API keys and configuration" },
  { label: "History", desc: "Interaction history and export" },
];

export const WORKFLOW_STEPS = [
  {
    name: "Hypothesis Agent",
    description: "Generate and refine research hypotheses",
    canAuto: false,
    page: "/agents/hypothesis",
  },
  {
    name: "Experiment Agent",
    description: "Design experiments and generate protocols",
    canAuto: false,
    page: "/agents/experiment",
  },
  {
    name: "Curve Fitting",
    description: "Fit curves to spectral data",
    canAuto: true,
    page: "/agents/curve-fitting",
  },
  {
    name: "ML Models",
    description: "Run ML models for optimization",
    canAuto: true,
    page: "/agents/ml-models",
  },
  {
    name: "Analysis Agent",
    description: "Analyze results and provide recommendations",
    canAuto: true,
    page: "/agents/analysis",
  },
];

export const ML_MODEL_OPTIONS = [
  "Single-objective GP (scikit-learn)",
  "Dual-objective GP (PyTorch)",
  "Monte Carlo Decision Tree (external)",
] as const;

export const ML_MODEL_REQUIRES_COMPOSITION: readonly string[] = [ML_MODEL_OPTIONS[0]];

export type LlmProviderId = "qwen" | "gemini";

export const LLM_PROVIDERS: Record<
  LlmProviderId,
  {
    label: string;
    apiKeyLabel: string;
    apiKeyHelp: string;
    models: string[];
    defaultModel: string;
    endpoints: { value: string; label: string }[];
  }
> = {
  qwen: {
    label: "Qwen (Hugging Face)",
    apiKeyLabel: "Hugging Face API Key",
    apiKeyHelp: "https://huggingface.co/settings/tokens",
    models: [
      "Qwen/Qwen2.5-VL-72B-Instruct",
      "Qwen/Qwen2.5-72B-Instruct",
      "Qwen/Qwen2.5-32B-Instruct",
      "Qwen/Qwen2.5-14B-Instruct",
      "Qwen/Qwen2.5-7B-Instruct",
    ],
    defaultModel: "Qwen/Qwen2.5-VL-72B-Instruct",
    endpoints: [
      { value: "https://router.huggingface.co/v1", label: "HF Router (recommended)" },
      { value: "https://api-inference.huggingface.co/v1", label: "HF Inference API" },
    ],
  },
  gemini: {
    label: "Google Gemini",
    apiKeyLabel: "Google Gemini API Key",
    apiKeyHelp: "https://aistudio.google.com/apikey",
    models: [
      "gemini-2.0-flash-lite",
      "gemini-2.0-flash",
      "gemini-1.5-flash",
      "gemini-1.5-pro",
    ],
    defaultModel: "gemini-2.0-flash-lite",
    endpoints: [],
  },
};

export const QWEN_MODELS = LLM_PROVIDERS.qwen.models;
export const QWEN_ENDPOINTS = LLM_PROVIDERS.qwen.endpoints;
export const GEMINI_MODELS = LLM_PROVIDERS.gemini.models;
