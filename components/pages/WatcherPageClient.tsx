"use client";

import { useState } from "react";
import {
  Alert,
  Button,
  Checkbox,
  FormField,
  NumberInput,
  StreamlitPage,
  Tabs,
  TextInput,
  TwoCol,
} from "@/components/ui";

export function WatcherPageClient() {
  const [directory, setDirectory] = useState("");
  const [port, setPort] = useState(8000);
  const [running, setRunning] = useState(false);

  return (
    <StreamlitPage
      title="Watcher Control"
      icon="👀"
      description="Control the file system watcher that automatically triggers curve fitting when files are uploaded."
      layout="centered"
    >
      <Tabs
        items={[
          {
            label: "Configuration",
            content: (
              <div className="space-y-4">
                <h4 className="text-sm font-semibold">⚙️ Watcher Configuration</h4>
                <TwoCol>
                  <div className="space-y-4">
                    <FormField label="Watcher Directory" help="Full path to monitor (no quotes)">
                      <TextInput value={directory} onChange={(e) => setDirectory(e.target.value)} />
                    </FormField>
                    <FormField label="Results Directory">
                      <TextInput defaultValue="results" />
                    </FormField>
                  </div>
                  <div className="space-y-4">
                    <Checkbox label="Enable Watcher" />
                    <FormField label="Watcher Server Port">
                      <NumberInput
                        min={1000}
                        max={9999}
                        value={port}
                        onChange={(e) => setPort(Number(e.target.value))}
                      />
                    </FormField>
                  </div>
                </TwoCol>
                <Alert variant="info">
                  <strong>Watcher Server URL:</strong> http://localhost:{port}
                </Alert>
                <Alert variant="info">
                  <strong>Watch Directory:</strong> {directory || "(not set)"}
                </Alert>
              </div>
            ),
          },
          {
            label: "Server",
            content: (
              <div className="space-y-4">
                <Alert variant={running ? "success" : "warning"}>
                  {running ? "Server is running" : "Server is stopped"}
                </Alert>
                <TwoCol>
                  <Button onClick={() => setRunning(true)}>▶️ Start Server</Button>
                  <Button variant="secondary" onClick={() => setRunning(false)}>
                    ⏹️ Stop Server
                  </Button>
                </TwoCol>
              </div>
            ),
          },
          {
            label: "Watching",
            content: <p className="text-sm text-[var(--st-muted)]">Observer status from API.</p>,
          },
          {
            label: "Logs",
            content: (
              <pre className="max-h-96 overflow-auto rounded-lg border border-[var(--st-border)] bg-[var(--st-code-bg)] p-4 text-xs text-[var(--st-code-text)]">
                Watcher logs will stream here…
              </pre>
            ),
          },
          { label: "Directory", content: <p className="text-sm">Directory listing from API.</p> },
          {
            label: "Help",
            content: (
              <Alert variant="info">
                Configure directory in Configuration tab, then start the server. API keys are managed
                server-side in production.
              </Alert>
            ),
          },
        ]}
      />
    </StreamlitPage>
  );
}
