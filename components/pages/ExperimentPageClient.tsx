"use client";

import { useCallback, useEffect, useMemo, useState } from "react";

import {
  Alert,
  Button,
  Expander,
  FormField,
  MultiSelect,
  Select,
  StreamlitPage,
  TextArea,
  TextInput,
  TwoCol,
} from "@/components/ui";
import { AgentDocumentPanel } from "@/components/ui/AgentDocumentPanel";
import { MarkdownBlock } from "@/components/ui/MarkdownBlock";
import {
  getExperimentSession,
  patchExperimentSession,
  postAgentRun,
  type AgentRunResult,
  type ExperimentalConstraints,
  type ExperimentManualInputs,
  type ExperimentSession,
} from "@/lib/api-client";
import { useAccessToken } from "@/lib/use-access-token";

const DEFAULT_CONSTRAINTS: ExperimentalConstraints = {
  techniques: [],
  equipment: [],
  parameters: [],
  focus_areas: [],
  liquid_handling: {
    instruments: [],
    plate_format: "96-well",
    max_volume_per_mixture: 50,
    materials: [],
    csv_path: "/var/lib/jupyter/notebooks/Dual GP 5AVA BDA/",
  },
};

const DEFAULT_MANUAL: ExperimentManualInputs = {
  manual_clarified_question: "",
  manual_socratic_questions: "",
  manual_socratic_answers: "",
  manual_thoughts: "",
  manual_hypothesis: "",
};

function downloadText(filename: string, content: string, mime = "text/plain") {
  const blob = new Blob([content], { type: mime });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

export function ExperimentPageClient() {
  const token = useAccessToken();
  const [session, setSession] = useState<ExperimentSession | null>(null);
  const [constraints, setConstraints] = useState<ExperimentalConstraints>(DEFAULT_CONSTRAINTS);
  const [manual, setManual] = useState<ExperimentManualInputs>(DEFAULT_MANUAL);
  const [newMaterial, setNewMaterial] = useState("");
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [lastRun, setLastRun] = useState<AgentRunResult | null>(null);
  const [document, setDocument] = useState<{
    markdown: string;
    documentId?: string;
    pdfUrl?: string;
  } | null>(null);

  const optionLists = session?.option_lists ?? {};
  const techniques = optionLists.techniques ?? [];
  const equipment = optionLists.equipment ?? [];
  const instruments = optionLists.instruments ?? [];
  const plateFormats = optionLists.plate_formats ?? ["96-well", "384-well", "24-well"];
  const parameters = optionLists.parameters ?? [];
  const focusAreas = optionLists.focus_areas ?? [];
  const presetMaterials = optionLists.preset_materials ?? [];

  const jupyter = session?.jupyter_config;
  const jupyterReady = Boolean(jupyter?.upload_enabled && jupyter?.server_url?.trim());

  const analysis = session?.analysis_context;
  const hasAnalysisContext = Boolean(
    analysis?.analysis_full_report ||
      (analysis?.analysis_recommendations?.length ?? 0) > 0 ||
      (analysis?.gp_suggested_compositions?.length ?? 0) > 0,
  );

  const applySession = useCallback((s: ExperimentSession) => {
    setSession(s);
    setConstraints(s.experimental_constraints ?? DEFAULT_CONSTRAINTS);
    setManual(s.manual_inputs ?? DEFAULT_MANUAL);
    if (s.document_markdown) {
      setDocument({
        markdown: s.document_markdown,
        documentId: s.document_id ?? undefined,
        pdfUrl: s.pdf_url ?? undefined,
      });
    }
  }, []);

  const refresh = useCallback(async () => {
    const s = await getExperimentSession(token);
    applySession(s);
  }, [token, applySession]);

  useEffect(() => {
    void refresh().catch((e) =>
      setError(e instanceof Error ? e.message : "Could not load experiment session"),
    );
  }, [refresh]);

  const materials = constraints.liquid_handling.materials;

  function setLh<K extends keyof ExperimentalConstraints["liquid_handling"]>(
    key: K,
    value: ExperimentalConstraints["liquid_handling"][K],
  ) {
    setConstraints((c) => ({
      ...c,
      liquid_handling: { ...c.liquid_handling, [key]: value },
    }));
  }

  function addMaterial(name: string) {
    const trimmed = name.trim();
    if (!trimmed) return;
    if (materials.some((m) => m.toLowerCase() === trimmed.toLowerCase())) return;
    setLh("materials", [...materials, trimmed]);
    setNewMaterial("");
  }

  function removeMaterial(name: string) {
    setLh(
      "materials",
      materials.filter((m) => m !== name),
    );
  }

  async function onSaveConstraints() {
    setSaving(true);
    setError(null);
    setSuccess(null);
    try {
      const s = await patchExperimentSession(token, { experimental_constraints: constraints });
      applySession(s);
      setSuccess("Parameters and constraints saved.");
    } catch (e) {
      setError(e instanceof Error ? e.message : "Save failed");
    } finally {
      setSaving(false);
    }
  }

  async function onSaveManual() {
    setSaving(true);
    setError(null);
    setSuccess(null);
    try {
      const s = await patchExperimentSession(token, { manual_inputs: manual });
      applySession(s);
      setSuccess("Manual inputs saved.");
    } catch (e) {
      setError(e instanceof Error ? e.message : "Save failed");
    } finally {
      setSaving(false);
    }
  }

  async function onGenerateGpWorklist(uploadToJupyter: boolean) {
    setLoading(true);
    setError(null);
    setSuccess(null);
    try {
      const res = await postAgentRun(token, "experiment", {
        payload: { action: "generate_gp_worklist", upload_to_jupyter: uploadToJupyter },
      });
      if (res.status === "error") {
        setError(res.message ?? "GP worklist generation failed");
        return;
      }
      const csv = res.data.worklist_csv as string | undefined;
      if (csv && !uploadToJupyter) {
        downloadText("gp_suggested_compositions_worklist.csv", csv, "text/csv");
      }
      setSuccess(res.message ?? (uploadToJupyter ? "Uploaded to Jupyter." : "Worklist generated."));
      await refresh();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Request failed");
    } finally {
      setLoading(false);
    }
  }

  async function onUploadJupyter(artifact: "worklist" | "gp_worklist" | "protocol") {
    setLoading(true);
    setError(null);
    setSuccess(null);
    try {
      const res = await postAgentRun(token, "experiment", {
        payload: { action: "upload_jupyter", artifact },
      });
      if (res.status === "error") {
        setError(res.message ?? "Jupyter upload failed");
        return;
      }
      setSuccess(res.message ?? "Uploaded to Jupyter.");
    } catch (e) {
      setError(e instanceof Error ? e.message : "Request failed");
    } finally {
      setLoading(false);
    }
  }

  async function onRunAgent() {
    setLoading(true);
    setError(null);
    setSuccess(null);
    try {
      const res = await postAgentRun(token, "experiment", {
        payload: {
          action: "run",
          experimental_constraints: constraints,
          manual_inputs: manual,
          source: "web",
        },
      });
      setLastRun(res);
      if (res.status === "error") {
        setError(res.message ?? "Experiment agent failed");
        return;
      }
      const md = res.data.document_markdown as string | undefined;
      if (md) {
        setDocument({
          markdown: md,
          documentId: res.data.document_id as string | undefined,
          pdfUrl: res.data.pdf_url as string | undefined,
        });
      }
      setSuccess(res.message ?? "Experimental protocol generated.");
      await refresh();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Request failed");
    } finally {
      setLoading(false);
    }
  }

  const gpTable = useMemo(() => {
    const rows = analysis?.gp_suggested_compositions?.slice(0, 10) ?? [];
    if (!rows.length) return null;
    const keys = new Set<string>();
    for (const r of rows) {
      Object.keys(r.compositions ?? {}).forEach((k) => keys.add(k));
    }
    const cols = [...keys, "predicted", "uncertainty"];
    return { cols, rows };
  }, [analysis?.gp_suggested_compositions]);

  const outputs = (lastRun?.data?.experimental_outputs ?? session?.experimental_outputs) as
    | Record<string, string>
    | undefined;
  const worklist = (lastRun?.data.worklist_csv ?? outputs?.worklist) as string | undefined;
  const layout = (lastRun?.data.plate_layout ?? outputs?.layout) as string | undefined;
  const protocol = (lastRun?.data.opentrons_protocol ?? outputs?.protocol) as string | undefined;
  const planPreview = (lastRun?.data.experimental_plan_preview as string | undefined) ?? "";

  const readiness = session?.readiness;

  return (
    <StreamlitPage
      title="Experiment Agent"
      icon="🧪"
      description="Experimental planning and protocol generation (Streamlit parity)."
      layout="centered"
    >
      {error ? <Alert variant="error">{error}</Alert> : null}
      {success ? <Alert variant="success">{success}</Alert> : null}

      {readiness ? (
        <div className="mb-4">
        <Alert variant={readiness.ready_to_run ? "success" : "info"}>
          {readiness.ready_to_run ? (
            <span>
              Ready to run — clarified question ({readiness.clarified_source}) and Socratic
              questions ({readiness.socratic_source}) are set.
            </span>
          ) : (
            <span>
              Missing required inputs. Complete the Hypothesis agent or fill Manual Input
              (clarified question + Socratic questions).
            </span>
          )}
        </Alert>
        </div>
      ) : null}

      {hasAnalysisContext ? (
        <Expander title="📋 From Analysis Agent (Curve Fitting + GP)" defaultOpen>
          {analysis?.analysis_full_report ? (
            <div className="mb-4">
              <p className="mb-1 text-sm font-semibold">Analysis report</p>
              <MarkdownBlock
                content={
                  analysis.analysis_full_report.length > 1500
                    ? `${analysis.analysis_full_report.slice(0, 1500)}…`
                    : analysis.analysis_full_report
                }
              />
            </div>
          ) : null}
          {analysis?.analysis_recommendations?.length ? (
            <div className="mb-4">
              <p className="mb-1 text-sm font-semibold">Recommendations</p>
              <ul className="list-inside list-disc text-sm text-[var(--st-text)]">
                {analysis.analysis_recommendations.slice(0, 5).map((r, i) => (
                  <li key={i}>{r}</li>
                ))}
              </ul>
            </div>
          ) : null}
          {gpTable ? (
            <div className="mb-4 overflow-x-auto">
              <p className="mb-2 text-sm font-semibold">GP suggested compositions (batch)</p>
              <table className="w-full border-collapse text-xs">
                <thead>
                  <tr>
                    {gpTable.cols.map((c) => (
                      <th key={c} className="border border-[var(--st-border)] px-2 py-1 text-left">
                        {c}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {gpTable.rows.map((row, i) => (
                    <tr key={i}>
                      {gpTable.cols.map((c) => {
                        if (c === "predicted") {
                          return (
                            <td key={c} className="border border-[var(--st-border)] px-2 py-1">
                              {String(row.predicted_value ?? "")}
                            </td>
                          );
                        }
                        if (c === "uncertainty") {
                          return (
                            <td key={c} className="border border-[var(--st-border)] px-2 py-1">
                              {String(row.uncertainty ?? "")}
                            </td>
                          );
                        }
                        return (
                          <td key={c} className="border border-[var(--st-border)] px-2 py-1">
                            {row.compositions?.[c] ?? ""}
                          </td>
                        );
                      })}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : null}
          {(analysis?.gp_suggested_compositions?.length ?? 0) > 0 ? (
            <div className="space-y-2">
              {!jupyterReady ? (
                <Alert variant="warning">
                  Enable Jupyter upload and set a server URL in Settings → Experiment to upload
                  worklists to your notebook server.
                </Alert>
              ) : null}
              <div className="flex flex-wrap gap-2">
                <Button
                  variant="secondary"
                  onClick={() => void onGenerateGpWorklist(jupyterReady)}
                  disabled={loading}
                >
                  {jupyterReady
                    ? "Generate worklist from GP & upload to Jupyter"
                    : "Generate worklist from GP compositions"}
                </Button>
                <Button
                  variant="secondary"
                  onClick={() => void onGenerateGpWorklist(false)}
                  disabled={loading}
                >
                  Download GP worklist only
                </Button>
              </div>
            </div>
          ) : null}
        </Expander>
      ) : null}

      <Expander title="📝 Manual Input (optional)">
        <p className="mb-3 text-sm text-[var(--st-muted)]">
          Provide components manually to generate experimental plans without running Hypothesis
          first.
        </p>
        <FormField label="Clarified question">
          <TextArea
            value={manual.manual_clarified_question}
            onChange={(e) => setManual((m) => ({ ...m, manual_clarified_question: e.target.value }))}
            placeholder="e.g., How can we optimize the phase stability of perovskite materials?"
          />
        </FormField>
        <div className="mt-3">
        <FormField label="Socratic questions (probing questions)">
          <TextArea
            value={manual.manual_socratic_questions}
            onChange={(e) => setManual((m) => ({ ...m, manual_socratic_questions: e.target.value }))}
            rows={5}
          />
        </FormField>
        </div>
        <div className="mt-3">
        <FormField label="Socratic answers (optional)">
          <TextArea
            value={manual.manual_socratic_answers}
            onChange={(e) => setManual((m) => ({ ...m, manual_socratic_answers: e.target.value }))}
            rows={5}
          />
        </FormField>
        </div>
        <div className="mt-3">
        <FormField label="Three lines of thought (optional)">
          <TextArea
            value={manual.manual_thoughts}
            onChange={(e) => setManual((m) => ({ ...m, manual_thoughts: e.target.value }))}
            rows={5}
          />
        </FormField>
        </div>
        <div className="mt-3">
        <FormField label="Hypothesis (optional)">
          <TextArea
            value={manual.manual_hypothesis}
            onChange={(e) => setManual((m) => ({ ...m, manual_hypothesis: e.target.value }))}
            rows={5}
          />
        </FormField>
        </div>
        <div className="mt-4">
        <Button variant="secondary" onClick={() => void onSaveManual()} disabled={saving}>
          {saving ? "Saving…" : "Save manual inputs"}
        </Button>
        </div>
      </Expander>

      <div className="mt-4">
      <Expander title="⚙️ Experimental parameters and constraints">
        <MultiSelect
          label="Experimental techniques"
          options={techniques}
          value={constraints.techniques}
          onChange={(techniques) => setConstraints((c) => ({ ...c, techniques }))}
        />
        <MultiSelect
          label="Available equipment"
          options={equipment}
          value={constraints.equipment}
          onChange={(equipment) => setConstraints((c) => ({ ...c, equipment }))}
        />

        <p className="mt-4 text-sm font-semibold text-[var(--st-text)]">Liquid handling setup</p>
        <div className="mt-2">
        <TwoCol>
          <div className="space-y-3">
            <MultiSelect
              label="Liquid handling instruments"
              options={instruments}
              value={constraints.liquid_handling.instruments}
              onChange={(v) => setLh("instruments", v)}
            />
            <FormField label="Plate format">
              <Select
                options={plateFormats.map((p) => ({ value: p, label: p }))}
                value={constraints.liquid_handling.plate_format}
                onChange={(e) => setLh("plate_format", e.target.value)}
              />
            </FormField>
          </div>
          <div className="space-y-3">
            <FormField label="Max volume per mixture (µL)">
              <input
                type="range"
                min={10}
                max={200}
                value={constraints.liquid_handling.max_volume_per_mixture}
                onChange={(e) => setLh("max_volume_per_mixture", Number(e.target.value))}
                className="w-full"
              />
              <span className="text-sm text-[var(--st-muted)]">
                {constraints.liquid_handling.max_volume_per_mixture} µL
              </span>
            </FormField>

            <div>
              <p className="text-sm font-medium text-[var(--st-text)]">Available materials</p>
              {materials.length ? (
                <div className="mt-2 flex flex-wrap gap-2">
                  {materials.map((mat) => (
                    <span
                      key={mat}
                      className="inline-flex items-center gap-1 rounded-full border border-[var(--st-border)] bg-[var(--st-bg)] px-2 py-0.5 text-xs"
                    >
                      {mat}
                      <button
                        type="button"
                        className="text-[var(--st-muted)] hover:text-red-600"
                        onClick={() => removeMaterial(mat)}
                        aria-label={`Remove ${mat}`}
                      >
                        ×
                      </button>
                    </span>
                  ))}
                </div>
              ) : (
                <p className="mt-1 text-xs text-[var(--st-muted)]">No materials yet.</p>
              )}
              <div className="mt-2 flex gap-2">
                <TextInput
                  value={newMaterial}
                  onChange={(e) => setNewMaterial(e.target.value)}
                  placeholder="e.g., Cs, BDA, 5AVA"
                  onKeyDown={(e) => {
                    if (e.key === "Enter") {
                      e.preventDefault();
                      addMaterial(newMaterial);
                    }
                  }}
                />
                <Button type="button" variant="secondary" onClick={() => addMaterial(newMaterial)}>
                  Add
                </Button>
              </div>
              <p className="mt-2 text-xs text-[var(--st-muted)]">Quick add</p>
              <div className="mt-1 flex flex-wrap gap-1">
                {presetMaterials.map((preset) => (
                  <Button
                    key={preset}
                    type="button"
                    variant="secondary"
                    onClick={() => addMaterial(preset)}
                  >
                    + {preset}
                  </Button>
                ))}
              </div>
            </div>
          </div>
        </TwoCol>
        </div>

        <div className="mt-4">
        <FormField label="CSV file path (for Opentrons)" help="Path on the Opentrons robot for CSV storage">
          <TextInput
            value={constraints.liquid_handling.csv_path}
            onChange={(e) => setLh("csv_path", e.target.value)}
          />
        </FormField>
        </div>

        <MultiSelect
          label="Key parameters to optimize"
          options={parameters}
          value={constraints.parameters}
          onChange={(parameters) => setConstraints((c) => ({ ...c, parameters }))}
        />
        <MultiSelect
          label="Primary focus areas"
          options={focusAreas}
          value={constraints.focus_areas}
          onChange={(focus_areas) => setConstraints((c) => ({ ...c, focus_areas }))}
        />

        <div className="mt-4">
        <Button onClick={() => void onSaveConstraints()} disabled={saving}>
          {saving ? "Saving…" : "Save constraints and parameters"}
        </Button>
        </div>
      </Expander>
      </div>

      <div className="mt-6 flex flex-wrap gap-2">
        <Button onClick={() => void onRunAgent()} disabled={loading || saving}>
          {loading ? "Running experiment agent…" : "Run experiment agent"}
        </Button>
        <Button variant="secondary" onClick={() => void refresh()} disabled={loading}>
          Refresh session
        </Button>
      </div>

      {planPreview ? (
        <div className="mt-4">
        <Alert variant="info">
          <p className="text-sm font-semibold">Plan preview</p>
          <p className="mt-1 whitespace-pre-wrap text-sm">{planPreview}</p>
        </Alert>
        </div>
      ) : null}

      {(worklist || layout || protocol) && (
        <div className="mt-4 space-y-3">
          <div className="flex flex-wrap gap-2">
            {worklist ? (
              <Button
                variant="secondary"
                onClick={() => downloadText("worklist.csv", worklist, "text/csv")}
              >
                Download worklist
              </Button>
            ) : null}
            {layout ? (
              <Button variant="secondary" onClick={() => downloadText("plate_layout.txt", layout)}>
                Download plate layout
              </Button>
            ) : null}
            {protocol ? (
              <Button
                variant="secondary"
                onClick={() => downloadText("opentrons_protocol.py", protocol, "text/x-python")}
              >
                Download Opentrons protocol
              </Button>
            ) : null}
          </div>
          {jupyterReady && (worklist || protocol) ? (
            <Expander title="Jupyter integration" defaultOpen>
              <p className="mb-2 text-sm text-[var(--st-muted)]">
                Upload artifacts to {jupyter?.server_url} ({jupyter?.notebook_path})
              </p>
              <div className="flex flex-wrap gap-2">
                {worklist ? (
                  <Button
                    variant="secondary"
                    onClick={() => void onUploadJupyter("worklist")}
                    disabled={loading}
                  >
                    Upload worklist to Jupyter
                  </Button>
                ) : null}
                {protocol ? (
                  <Button
                    variant="secondary"
                    onClick={() => void onUploadJupyter("protocol")}
                    disabled={loading}
                  >
                    Upload Opentrons protocol to Jupyter
                  </Button>
                ) : null}
              </div>
            </Expander>
          ) : worklist || protocol ? (
            <Alert variant="info">
              Configure Jupyter in Settings → Experiment to upload worklists and protocols to your
              server.
            </Alert>
          ) : null}
        </div>
      )}

      {document ? (
        <AgentDocumentPanel
          title="Experimental protocol"
          markdown={document.markdown}
          documentId={document.documentId}
          pdfUrl={document.pdfUrl}
        />
      ) : null}
    </StreamlitPage>
  );
}
