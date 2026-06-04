"use client";

import { useState } from "react";
import {
  Alert,
  Button,
  FormField,
  NumberInput,
  StreamlitPage,
  Tabs,
  TextInput,
  TwoCol,
} from "@/components/ui";

export function McpPageClient() {
  const [query, setQuery] = useState("");
  const [host, setHost] = useState("127.0.0.1");
  const [port, setPort] = useState(8010);

  return (
    <StreamlitPage
      title="MCP Orchestrator"
      description="Start/stop the orchestrator server and validate MCP tool connectivity."
      layout="centered"
    >
      <Tabs
        items={[
          {
            label: "Configuration",
            content: (
              <div className="space-y-4">
                <FormField label="Literature MCP endpoint">
                  <TextInput defaultValue="http://127.0.0.1:8000/mcp" />
                </FormField>
                <FormField label="Manual papers manifest">
                  <TextInput defaultValue="data/manual_papers_manifest.json" />
                </FormField>
                <TwoCol>
                  <FormField label="Orchestrator host">
                    <TextInput value={host} onChange={(e) => setHost(e.target.value)} />
                  </FormField>
                  <FormField label="Port">
                    <NumberInput value={port} onChange={(e) => setPort(Number(e.target.value))} />
                  </FormField>
                </TwoCol>
              </div>
            ),
          },
          {
            label: "Server",
            content: (
              <TwoCol>
                <Button>Start orchestrator</Button>
                <Button variant="secondary">Stop orchestrator</Button>
              </TwoCol>
            ),
          },
          {
            label: "Tools",
            content: (
              <div className="space-y-4">
                <FormField label="Search query">
                  <TextInput value={query} onChange={(e) => setQuery(e.target.value)} />
                </FormField>
                <Button>Search papers</Button>
              </div>
            ),
          },
          {
            label: "Navigation",
            content: <Alert variant="info">Literature tools and hypothesis gating via POST /api/v1/mcp/orchestrate</Alert>,
          },
        ]}
      />
    </StreamlitPage>
  );
}
