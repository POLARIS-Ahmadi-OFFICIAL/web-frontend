"use client";

import { useEffect, useMemo, useState } from "react";

import { ThemeToggle } from "@/components/ThemeToggle";
import {
  Alert,
  Button,
  Checkbox,
  FormField,
  Select,
  StreamlitPage,
  Tabs,
  TextInput,
} from "@/components/ui";
import { clearSessionCache, getSettings, patchSettings } from "@/lib/api-client";
import { LLM_PROVIDERS, type LlmProviderId } from "@/lib/polaris-content";
import { useAccessToken } from "@/lib/use-access-token";

export function SettingsPageClient() {
  const token = useAccessToken();
  const [provider, setProvider] = useState<LlmProviderId>("qwen");
  const [model, setModel] = useState(LLM_PROVIDERS.qwen.defaultModel);
  const [endpoint, setEndpoint] = useState(LLM_PROVIDERS.qwen.endpoints[0]?.value ?? "");
  const [customModel, setCustomModel] = useState("");
  const [apiKey, setApiKey] = useState("");
  const [apiKeyConfigured, setApiKeyConfigured] = useState(false);
  const [editing, setEditing] = useState(false);
  const [status, setStatus] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [jupyterUrl, setJupyterUrl] = useState("");
  const [jupyterToken, setJupyterToken] = useState("");
  const [jupyterNotebookPath, setJupyterNotebookPath] = useState("Automated Agent");
  const [jupyterUploadEnabled, setJupyterUploadEnabled] = useState(false);
  const [cacheClearing, setCacheClearing] = useState(false);

  const meta = useMemo(() => LLM_PROVIDERS[provider], [provider]);
  const selectedModel = customModel.trim() || model;

  useEffect(() => {
    getSettings(token)
      .then((s) => {
        const p = (s.llm_provider as LlmProviderId) || "qwen";
        setProvider(p in LLM_PROVIDERS ? p : "qwen");
        setModel(s.llm_model || LLM_PROVIDERS[p]?.defaultModel || "");
        setEndpoint(s.qwen_base_url || LLM_PROVIDERS.qwen.endpoints[0]?.value || "");
        setApiKeyConfigured(Boolean(s.api_key_configured));
        const jc = s.jupyter_config;
        if (jc) {
          setJupyterUrl(jc.server_url ?? "");
          setJupyterToken(jc.token ?? "");
          setJupyterNotebookPath(jc.notebook_path ?? "Automated Agent");
          setJupyterUploadEnabled(Boolean(jc.upload_enabled));
        }
      })
      .catch(() => setStatus("Could not load settings from API"))
      .finally(() => setLoading(false));
  }, [token]);

  async function saveSettings() {
    setStatus(null);
    try {
      await patchSettings(token, {
        llm_provider: provider,
        llm_model: selectedModel,
        qwen_base_url: provider === "qwen" ? endpoint : undefined,
        api_key: apiKey.trim() || undefined,
      });
      setApiKeyConfigured(true);
      setEditing(false);
      setApiKey("");
      setStatus("Settings saved.");
    } catch (e) {
      setStatus(e instanceof Error ? e.message : "Save failed");
    }
  }

  async function handleClearCache() {
    setStatus(null);
    setCacheClearing(true);
    try {
      const res = await clearSessionCache(token);
      setStatus(res.message ?? "Session cache cleared.");
    } catch (e) {
      setStatus(e instanceof Error ? e.message : "Failed to clear cache");
    } finally {
      setCacheClearing(false);
    }
  }

  async function saveJupyterSettings() {
    setStatus(null);
    try {
      await patchSettings(token, {
        jupyter_config: {
          server_url: jupyterUrl.trim(),
          token: jupyterToken,
          notebook_path: jupyterNotebookPath.trim() || "Automated Agent",
          upload_enabled: jupyterUploadEnabled,
        },
      });
      setStatus("Jupyter settings saved.");
    } catch (e) {
      setStatus(e instanceof Error ? e.message : "Save failed");
    }
  }

  return (
    <StreamlitPage
      title="Settings"
      icon="⚙️"
      description="Adjust LLM provider, API keys, and experiment options."
      layout="centered"
    >
      {loading ? <Alert variant="info">Loading settings…</Alert> : null}
      {status ? <Alert variant={status.includes("failed") ? "error" : "success"}>{status}</Alert> : null}
      <Tabs
        items={[
          {
            label: "General",
            content: (
              <div className="space-y-6">
                <div>
                  <h4 className="mb-3 text-sm font-semibold">Appearance</h4>
                  <ThemeToggle />
                </div>
                <div>
                  <h4 className="mb-3 text-sm font-semibold">LLM Provider</h4>
                  <FormField label="Model provider">
                    <Select
                      options={Object.entries(LLM_PROVIDERS).map(([value, p]) => ({
                        value,
                        label: p.label,
                      }))}
                      value={provider}
                      onChange={(e) => {
                        const p = e.target.value as LlmProviderId;
                        setProvider(p);
                        setModel(LLM_PROVIDERS[p].defaultModel);
                        setCustomModel("");
                      }}
                    />
                  </FormField>
                  <FormField label={`${meta.label} model`}>
                    <Select
                      options={meta.models.map((m) => ({ value: m, label: m }))}
                      value={selectedModel}
                      onChange={(e) => {
                        setModel(e.target.value);
                        setCustomModel("");
                      }}
                    />
                  </FormField>
                  <FormField label="Or custom model ID">
                    <TextInput
                      placeholder={provider === "gemini" ? "e.g. gemini-2.0-flash" : "e.g. Qwen/Qwen2.5-32B-Instruct"}
                      value={customModel}
                      onChange={(e) => setCustomModel(e.target.value)}
                    />
                  </FormField>
                  {provider === "qwen" ? (
                    <FormField label="Inference endpoint">
                      <Select
                        options={meta.endpoints}
                        value={endpoint}
                        onChange={(e) => setEndpoint(e.target.value)}
                      />
                    </FormField>
                  ) : null}
                </div>
                <div>
                  <h4 className="mb-3 text-sm font-semibold">API Key Configuration</h4>
                  {apiKeyConfigured && !editing ? (
                    <Alert variant="success">API key is saved on the server for {meta.label}.</Alert>
                  ) : (
                    <Alert variant="info">Get a key from {meta.apiKeyHelp}</Alert>
                  )}
                  {(editing || !apiKeyConfigured) && (
                    <FormField label={meta.apiKeyLabel}>
                      <TextInput
                        type="password"
                        placeholder={apiKeyConfigured ? "Enter new key to replace" : "Enter your API key"}
                        value={apiKey}
                        onChange={(e) => setApiKey(e.target.value)}
                      />
                    </FormField>
                  )}
                  <div className="mt-3 flex flex-wrap gap-2">
                    <Button fullWidth onClick={saveSettings}>
                      Save settings
                    </Button>
                    {apiKeyConfigured && !editing ? (
                      <Button variant="secondary" fullWidth onClick={() => setEditing(true)}>
                        Change API key
                      </Button>
                    ) : editing ? (
                      <Button variant="secondary" fullWidth onClick={() => setEditing(false)}>
                        Cancel
                      </Button>
                    ) : null}
                  </div>
                </div>
              </div>
            ),
          },
          {
            label: "Experiment",
            content: (
              <div className="space-y-4">
                <h4 className="text-sm font-semibold">Jupyter server configuration</h4>
                <Alert variant="info">
                  Used when uploading worklists and protocols from the Experiment agent (and curve
                  fitting auto-upload when enabled).
                </Alert>
                <FormField label="Server URL" help="e.g. http://10.140.141.160:48888/">
                  <TextInput
                    placeholder="http://host:8888/"
                    value={jupyterUrl}
                    onChange={(e) => setJupyterUrl(e.target.value)}
                  />
                </FormField>
                <FormField label="Access token" help="Jupyter server token (if required)">
                  <TextInput
                    type="password"
                    placeholder="Jupyter token"
                    value={jupyterToken}
                    onChange={(e) => setJupyterToken(e.target.value)}
                  />
                </FormField>
                <FormField label="Notebook path" help="Directory on the Jupyter server for uploads">
                  <TextInput
                    value={jupyterNotebookPath}
                    onChange={(e) => setJupyterNotebookPath(e.target.value)}
                  />
                </FormField>
                <Checkbox
                  label="Enable Jupyter upload"
                  checked={jupyterUploadEnabled}
                  onChange={(e) => setJupyterUploadEnabled(e.target.checked)}
                />
                <Button onClick={() => void saveJupyterSettings()}>Save Jupyter settings</Button>
              </div>
            ),
          },
          {
            label: "Cache",
            content: (
              <div className="space-y-4">
                <div>
                  <h4 className="text-sm font-semibold text-[var(--st-text)]">Session cache</h4>
                  <p className="mt-1 text-sm leading-relaxed text-[var(--st-muted)]">
                    Clears workflow progress, hypothesis drafts, interaction history, and agent
                    session data. Your LLM provider, API keys, and Jupyter settings are kept.
                  </p>
                </div>
                <Alert variant="warning">
                  This cannot be undone. Export history first if you need a record for your lab
                  notebook.
                </Alert>
                <Button
                  variant="secondary"
                  onClick={() => void handleClearCache()}
                  disabled={cacheClearing || !token}
                >
                  {cacheClearing ? "Clearing…" : "Clear session cache"}
                </Button>
                {!token ? (
                  <p className="text-sm text-[var(--st-muted)]">Sign in to clear the server session.</p>
                ) : null}
              </div>
            ),
          },
        ]}
      />
    </StreamlitPage>
  );
}
