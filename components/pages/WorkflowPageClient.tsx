"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useState } from "react";

import {
  Alert,
  Button,
  Checkbox,
  Divider,
  Expander,
  FormField,
  Select,
  StreamlitPage,
  Tabs,
  TextInput,
} from "@/components/ui";
import {
  applyWorkflow,
  deleteWorkflow,
  exportWorkflowJson,
  getWorkflowSession,
  loadWorkflow,
  patchWorkflowSession,
  runWorkflowDemo,
  saveWorkflow,
  startWorkflow,
  stopWorkflow,
  type WorkflowSession,
  type WorkflowStep,
} from "@/lib/api-client";
import { WORKFLOW_STEPS } from "@/lib/polaris-content";
import { useAccessToken } from "@/lib/use-access-token";

const NAV_STEPS = [
  { key: "hypothesis", label: "Hypothesis", href: "/agents/hypothesis" },
  { key: "experiment", label: "Experiment", href: "/agents/experiment" },
  { key: "curve_fitting", label: "Curve Fitting", href: "/agents/curve-fitting" },
  { key: "ml_models", label: "ML Models", href: "/agents/ml-models" },
  { key: "analysis", label: "Analysis", href: "/agents/analysis" },
];

function downloadJson(filename: string, content: string) {
  const blob = new Blob([content], { type: "application/json" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

export function WorkflowPageClient() {
  const token = useAccessToken();
  const router = useRouter();
  const [session, setSession] = useState<WorkflowSession | null>(null);
  const [workflowName, setWorkflowName] = useState("My Workflow");
  const [steps, setSteps] = useState<WorkflowStep[]>([]);
  const [addStepName, setAddStepName] = useState("");
  const [routingMode, setRoutingMode] = useState("Autonomous (LLM)");
  const [mlModel, setMlModel] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [autoMl, setAutoMl] = useState(false);
  const [autoAnalysis, setAutoAnalysis] = useState(false);
  const [demoAutoFit, setDemoAutoFit] = useState(true);

  const refresh = useCallback(async () => {
    try {
      const s = await getWorkflowSession(token);
      setSession(s);
      setWorkflowName(s.current_workflow_name || "My Workflow");
      setSteps(s.workflow_steps?.length ? s.workflow_steps : []);
      setRoutingMode(s.routing_mode || "Autonomous (LLM)");
      setMlModel(s.workflow_ml_model_choice || s.ml_model_options[0] || "");
      setAutoMl(Boolean(s.auto_ml_after_curve_fitting));
      setAutoAnalysis(Boolean(s.auto_route_to_analysis));
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not load workflow session");
    }
  }, [token]);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  const availableToAdd = WORKFLOW_STEPS.filter(
    (s) => !steps.some((x) => x.name === s.name),
  );

  async function persistSteps(next: WorkflowStep[]) {
    setSteps(next);
    await patchWorkflowSession(token, { workflow_steps: next, workflow_name: workflowName });
    await refresh();
  }

  async function onSave(apply = false) {
    setLoading(true);
    setError(null);
    try {
      const res = await saveWorkflow(token, workflowName, steps, apply);
      setSuccess(res.message);
      await refresh();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Save failed");
    } finally {
      setLoading(false);
    }
  }

  async function onRoutingChange(mode: string) {
    setRoutingMode(mode);
    await patchWorkflowSession(token, { routing_mode: mode });
    await refresh();
  }

  async function onMlModelChange(choice: string) {
    setMlModel(choice);
    await patchWorkflowSession(token, { workflow_ml_model_choice: choice });
    await refresh();
  }

  async function onAutomationFlagsChange(ml: boolean, analysis: boolean) {
    setAutoMl(ml);
    setAutoAnalysis(analysis);
    const nextSteps = steps.map((s) => {
      if (s.name === "ML Models") return { ...s, automatic: ml };
      if (s.name === "Analysis Agent") return { ...s, automatic: analysis };
      return s;
    });
    setSteps(nextSteps);
    await patchWorkflowSession(token, {
      workflow_steps: nextSteps,
      workflow_name: workflowName,
      auto_ml_after_curve_fitting: ml,
      auto_route_to_analysis: analysis,
    });
    await refresh();
  }

  async function goToStep(href: string, stepKey: string) {
    await patchWorkflowSession(token, { workflow_step: stepKey });
    router.push(href);
  }

  const hasMlStep = steps.some((s) => s.name === "ML Models");
  const hasAnalysisStep = steps.some((s) => s.name === "Analysis Agent");

  const runTab = (
    <div className="space-y-4">
      <h3 className="text-lg font-semibold">Workflow Runner</h3>
      <p className="text-sm text-[var(--st-muted)]">
        Start an end-to-end workflow: Hypothesis → Experiment → Curve Fitting → ML Models → Analysis.
      </p>

      <FormField label="Routing mode">
        <Select
          value={routingMode}
          onChange={(e) => void onRoutingChange(e.target.value)}
          options={[
            { value: "Autonomous (LLM)", label: "Autonomous (LLM)" },
            { value: "Manual", label: "Manual" },
          ]}
        />
      </FormField>
      {routingMode === "Manual" ? (
        <Alert variant="info">
          Manual routing uses the workflow order from the Builder tab.
          {session?.manual_workflow?.length ? (
            <p className="mt-1 text-xs">Current: {session.manual_workflow.join(" → ")}</p>
          ) : (
            <p className="mt-1 text-xs">Build and apply a workflow first.</p>
          )}
        </Alert>
      ) : null}

      <div className="flex flex-wrap gap-2">
        <Button
          disabled={loading}
          onClick={async () => {
            setLoading(true);
            try {
              const res = await startWorkflow(token);
              setSuccess(res.message);
              await refresh();
              if (res.next_page) router.push(res.next_page);
            } catch (e) {
              setError(e instanceof Error ? e.message : "Start failed");
            } finally {
              setLoading(false);
            }
          }}
        >
          Start workflow
        </Button>
        <Button
          variant="secondary"
          disabled={loading}
          onClick={async () => {
            setLoading(true);
            try {
              const res = await stopWorkflow(token);
              setSuccess(res.message);
              await refresh();
            } catch (e) {
              setError(e instanceof Error ? e.message : "Stop failed");
            } finally {
              setLoading(false);
            }
          }}
        >
          Stop workflow
        </Button>
        <Button
          variant="secondary"
          disabled={loading}
          onClick={async () => {
            await patchWorkflowSession(token, { workflow_index: 0 });
            setSuccess("Workflow progress reset.");
            await refresh();
          }}
        >
          Reset progress
        </Button>
      </div>

      {session?.workflow_active ? (
        <>
          <Alert variant="success">
            Active — current step: <strong>{session.workflow_step}</strong>
          </Alert>
          <p className="text-sm text-[var(--st-muted)]">Navigate to any step — you control the flow.</p>
          <div className="grid grid-cols-2 gap-2 sm:grid-cols-5">
            {NAV_STEPS.map((n) => (
              <button
                key={n.key}
                type="button"
                className="rounded-md border border-[var(--st-border)] bg-[var(--st-surface)] px-3 py-2 text-center text-sm hover:bg-[var(--st-bg)]"
                onClick={() => void goToStep(n.href, n.key)}
              >
                {n.label}
              </button>
            ))}
          </div>
        </>
      ) : (
        <Alert variant="info">Start the workflow to begin with the Hypothesis agent.</Alert>
      )}
    </div>
  );

  const buildTab = (
    <div className="space-y-4">
      <div className="grid gap-6 lg:grid-cols-[240px_1fr]">
        <aside className="space-y-2 rounded-lg border border-[var(--st-border)] p-3">
          <h4 className="font-semibold text-sm">Saved workflows</h4>
          {session?.saved_workflows?.length ? (
            session.saved_workflows.map((wf) => (
              <div key={wf.name} className="flex gap-1">
                <Button
                  variant="secondary"
                  className="flex-1 text-xs"
                  onClick={async () => {
                    setLoading(true);
                    try {
                      await loadWorkflow(token, wf.name);
                      setSuccess(`Loaded ${wf.name}`);
                      await refresh();
                    } catch (e) {
                      setError(e instanceof Error ? e.message : "Load failed");
                    } finally {
                      setLoading(false);
                    }
                  }}
                >
                  {wf.name}
                </Button>
                <Button
                  variant="secondary"
                  className="text-xs"
                  onClick={async () => {
                    if (!confirm(`Delete workflow "${wf.name}"?`)) return;
                    await deleteWorkflow(token, wf.name);
                    await refresh();
                  }}
                >
                  ×
                </Button>
              </div>
            ))
          ) : (
            <p className="text-xs text-[var(--st-muted)]">No saved workflows yet.</p>
          )}
          <Button
            variant="secondary"
            className="w-full text-sm"
            onClick={() => {
              setWorkflowName("New Workflow");
              setSteps([]);
            }}
          >
            New workflow
          </Button>
        </aside>

        <div className="space-y-4">
          <FormField label="Workflow name">
            <TextInput value={workflowName} onChange={(e) => setWorkflowName(e.target.value)} />
          </FormField>

          {steps.some((s) => s.name === "ML Models") ? (
            <FormField label="ML model for this workflow">
              <Select
                value={mlModel}
                onChange={(e) => void onMlModelChange(e.target.value)}
                options={(session?.ml_model_options ?? []).map((m) => ({ value: m, label: m }))}
              />
            </FormField>
          ) : null}

          <h4 className="font-semibold">Workflow steps</h4>
          {steps.length === 0 ? (
            <Alert variant="info">Add steps using the controls below.</Alert>
          ) : null}
          {steps.map((step, i) => {
            const meta = WORKFLOW_STEPS.find((s) => s.name === step.name);
            return (
              <div
                key={`${step.name}-${i}`}
                className="flex flex-wrap items-center justify-between gap-2 rounded-lg border border-[var(--st-border)] px-4 py-3"
              >
                <div>
                  <p className="font-medium text-sm">
                    {i + 1}. {step.name}
                  </p>
                  <p className="text-xs text-[var(--st-muted)]">
                    {step.description || meta?.description}
                  </p>
                </div>
                <div className="flex flex-wrap items-center gap-2">
                  {meta?.canAuto ? (
                    <Checkbox
                      label="Auto-execute"
                      checked={!!step.automatic}
                      onChange={() => {
                        const next = [...steps];
                        next[i] = { ...step, automatic: !step.automatic };
                        void persistSteps(next);
                      }}
                    />
                  ) : (
                    <span className="text-xs text-[var(--st-muted)]">Manual</span>
                  )}
                  <Button
                    variant="secondary"
                    disabled={i === 0}
                    onClick={() => {
                      const next = [...steps];
                      [next[i - 1], next[i]] = [next[i], next[i - 1]];
                      void persistSteps(next);
                    }}
                  >
                    Up
                  </Button>
                  <Button
                    variant="secondary"
                    disabled={i >= steps.length - 1}
                    onClick={() => {
                      const next = [...steps];
                      [next[i], next[i + 1]] = [next[i + 1], next[i]];
                      void persistSteps(next);
                    }}
                  >
                    Down
                  </Button>
                  <Button
                    variant="secondary"
                    onClick={() => void persistSteps(steps.filter((_, j) => j !== i))}
                  >
                    Remove
                  </Button>
                </div>
              </div>
            );
          })}

          <Divider />
          <h4 className="font-semibold">Add step</h4>
          <div className="flex flex-wrap gap-2">
            <Select
              value={addStepName || availableToAdd[0]?.name || ""}
              onChange={(e) => setAddStepName(e.target.value)}
              options={availableToAdd.map((s) => ({ value: s.name, label: s.name }))}
              disabled={!availableToAdd.length}
            />
            <Button
              disabled={!availableToAdd.length}
              onClick={() => {
                const name = addStepName || availableToAdd[0]?.name;
                if (!name) return;
                const meta = WORKFLOW_STEPS.find((s) => s.name === name);
                void persistSteps([
                  ...steps,
                  { name, automatic: false, description: meta?.description },
                ]);
              }}
            >
              Add step
            </Button>
          </div>

          <div className="flex flex-wrap gap-2">
            <Button disabled={loading || !steps.length} onClick={() => void onSave(false)}>
              Save workflow
            </Button>
            <Button disabled={loading || !steps.length} onClick={() => void onSave(true)}>
              Apply workflow
            </Button>
            <Button
              variant="secondary"
              onClick={() => {
                setSteps([]);
                setWorkflowName("Default Workflow");
              }}
            >
              Reset builder
            </Button>
            <Button
              variant="secondary"
              onClick={async () => {
                const { json } = await exportWorkflowJson(token);
                downloadJson(`${workflowName.replace(/\s+/g, "_")}.json`, json);
              }}
            >
              Export JSON
            </Button>
          </div>

          {hasMlStep || hasAnalysisStep ? (
            <div className="space-y-2 rounded-md border border-[var(--st-border)] p-3">
              <p className="text-sm font-semibold">Workflow automation</p>
              {hasMlStep ? (
                <Checkbox
                  label="Auto-run ML after curve fitting completes"
                  checked={autoMl}
                  onChange={(e) => void onAutomationFlagsChange(e.target.checked, autoAnalysis)}
                />
              ) : null}
              {hasAnalysisStep ? (
                <Checkbox
                  label="Auto-run Analysis after ML (when ML step is auto-enabled)"
                  checked={autoAnalysis}
                  onChange={(e) => void onAutomationFlagsChange(autoMl, e.target.checked)}
                />
              ) : null}
            </div>
          ) : null}

          {steps.length ? (
            <div className="rounded-lg border border-dashed border-[var(--st-border)] p-3">
              <p className="mb-2 text-sm font-semibold">Preview</p>
              <p className="text-xs text-[var(--st-muted)]">
                {steps
                  .map((s, i) => `${i + 1}. ${s.automatic ? "AUTO" : "MANUAL"} ${s.name}`)
                  .join(" → ")}
              </p>
              {session?.manual_workflow?.length ? (
                <p className="mt-2 text-xs text-[var(--st-muted)]">
                  Applied order: {session.manual_workflow.join(" → ")}
                </p>
              ) : null}
            </div>
          ) : null}
        </div>
      </div>

      <Expander title="How to use workflow builder" defaultOpen={false}>
        <ul className="list-inside list-disc space-y-1 text-sm text-[var(--st-muted)]">
          <li>Name your workflow and add steps in order.</li>
          <li>Enable auto-execute for Curve Fitting, ML Models, or Analysis when data is ready.</li>
          <li>Save for later or Apply to set manual routing order.</li>
          <li>Export JSON to share with your team.</li>
        </ul>
      </Expander>
    </div>
  );

  const demoTab = (
    <div className="space-y-4">
      <h3 className="text-lg font-semibold">Demo workflow</h3>
      <p className="text-sm text-[var(--st-muted)]">
        Generates synthetic spectral and composition data, primes hypothesis and experiment outputs,
        and configures auto curve fitting — matching the Streamlit demo.
      </p>
      <Checkbox
        label="Run curve fitting automatically (uses demo spectral + composition files; may take several minutes)"
        checked={demoAutoFit}
        onChange={(e) => setDemoAutoFit(e.target.checked)}
      />
      <Button
        disabled={loading}
        onClick={async () => {
          setLoading(true);
          setError(null);
          try {
            const res = await runWorkflowDemo(token, { auto_fit: demoAutoFit });
            setSuccess(res.message);
            await refresh();
            if (res.next_page) router.push(res.next_page);
          } catch (e) {
            setError(e instanceof Error ? e.message : "Demo failed");
          } finally {
            setLoading(false);
          }
        }}
      >
        {loading ? "Running demo…" : "Run demo workflow"}
      </Button>
      {session?.demo_workflow_running ? (
        <Alert variant="success">
          Demo is active. Continue on{" "}
          <Link href="/agents/curve-fitting" className="underline">
            Curve Fitting
          </Link>
          .
        </Alert>
      ) : null}
    </div>
  );

  return (
    <StreamlitPage
      title="Workflow"
      icon="🧭"
      description="Run and configure end-to-end workflows across agents and tools."
      layout="wide"
    >
      {error ? <Alert variant="error">{error}</Alert> : null}
      {success ? (
        <Alert variant="success" className="mb-4">
          {success}
        </Alert>
      ) : null}
      <Tabs
        items={[
          { label: "Run workflow", content: runTab },
          { label: "Build workflow", content: buildTab },
          { label: "Demo", content: demoTab },
        ]}
      />
    </StreamlitPage>
  );
}
