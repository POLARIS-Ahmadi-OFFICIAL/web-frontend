"use client";

import { useCallback, useEffect, useState } from "react";

import { Alert, Button, StreamlitPage } from "@/components/ui";
import { AgentDocumentPanel } from "@/components/ui/AgentDocumentPanel";
import {
  getAgentsStatus,
  postAgentRun,
  type AgentRunResult,
  type AgentsStatusResponse,
} from "@/lib/api-client";
import { useAccessToken } from "@/lib/use-access-token";

const AGENT_PATH_MAP = {
  hypothesis: "hypothesis",
  experiment: "experiment",
  "curve-fitting": "curve-fitting",
  ml: "ml",
  analysis: "analysis",
} as const;

export function AgentPageShell({
  title,
  icon,
  description,
  endpoint,
  agentKey,
  runAction = "run",
}: {
  title: string;
  icon: string;
  description: string;
  endpoint: string;
  agentKey: keyof typeof AGENT_PATH_MAP;
  /** Payload action sent on Run (e.g. generate_plan, analyze, run). */
  runAction?: string;
}) {
  const token = useAccessToken();
  const [status, setStatus] = useState<AgentsStatusResponse | null>(null);
  const [lastRun, setLastRun] = useState<AgentRunResult | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const agentPath = AGENT_PATH_MAP[agentKey];
  const matchName =
    agentKey === "ml"
      ? "ml models"
      : agentKey === "curve-fitting"
        ? "curve fitting"
        : `${agentKey} agent`;
  const agentStatus = status?.agents.find((a) => a.name.toLowerCase().includes(matchName));

  const refreshStatus = useCallback(async () => {
    try {
      const s = await getAgentsStatus(token);
      setStatus(s);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not load agent status");
    }
  }, [token]);

  useEffect(() => {
    void refreshStatus();
  }, [refreshStatus]);

  async function onRun() {
    setLoading(true);
    setError(null);
    try {
      const res = await postAgentRun(token, agentPath, {
        payload: { action: runAction, source: "web" },
      });
      setLastRun(res);
      if (res.status === "error") {
        setError(res.message ?? "Agent run failed");
      }
      await refreshStatus();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Request failed");
    } finally {
      setLoading(false);
    }
  }

  const hint =
    agentKey === "hypothesis"
      ? "Use the Hypothesis page for the full chat flow (streaming enabled)."
      : agentStatus?.hint_action
        ? `Run sends action "${runAction}" (API hint: ${agentStatus.hint_action}).`
        : null;

  return (
    <StreamlitPage title={title} icon={icon} description={description} layout="centered">
      {error ? <Alert variant="error">{error}</Alert> : null}
      {agentStatus ? (
        <Alert variant={agentStatus.ready ? "success" : "info"} className="mb-4">
          <strong>{agentStatus.name}</strong>: {agentStatus.message}
        </Alert>
      ) : null}
      {hint ? <Alert variant="info" className="mb-4">{hint}</Alert> : null}
      <Alert variant="info" className="mb-4">
        API: {endpoint}
      </Alert>
      <div className="mt-4 flex flex-wrap gap-2">
        <Button onClick={() => void onRun()} disabled={loading || agentKey === "hypothesis"}>
          {loading ? "Running…" : "Run agent"}
        </Button>
        <Button variant="secondary" onClick={() => void refreshStatus()} disabled={loading}>
          Refresh status
        </Button>
      </div>
      {lastRun ? (
        <Alert variant={lastRun.status === "success" ? "success" : "error"} className="mt-4">
          <p className="font-semibold">{lastRun.agent}</p>
          <p className="text-sm">{lastRun.message}</p>
        </Alert>
      ) : null}

      {lastRun?.data?.document_markdown ? (
        <AgentDocumentPanel
          title={agentKey === "experiment" ? "Experimental protocol" : "Agent report"}
          markdown={String(lastRun.data.document_markdown)}
          documentId={lastRun.data.document_id as string | undefined}
          pdfUrl={lastRun.data.pdf_url as string | undefined}
        />
      ) : null}
    </StreamlitPage>
  );
}
