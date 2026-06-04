"use client";

import Link from "next/link";
import { useEffect, useState } from "react";

import { Alert, Button, Card, CardLink, MarkdownBlock } from "@/components/ui";
import {
  getAgentsStatus,
  getDashboardSummary,
  getHealth,
  type AgentsStatusResponse,
  type DashboardSummary,
} from "@/lib/api-client";
import {
  AGENT_CARDS,
  APP_TAGLINE,
  GETTING_STARTED,
  QUICK_START_STEPS,
  RESEARCHER_FEATURES,
  WORKFLOW_STEPS,
} from "@/lib/polaris-content";
import { useAccessToken } from "@/lib/use-access-token";

function StatusPill({
  label,
  value,
  ok,
}: {
  label: string;
  value: string;
  ok?: boolean;
}) {
  return (
    <div
      className="flex min-w-[140px] flex-col gap-0.5 rounded-[var(--st-radius-sm)] border border-[var(--st-border)] bg-[var(--st-surface)] px-4 py-3"
      role="listitem"
    >
      <span className="text-xs font-medium uppercase tracking-wide text-[var(--st-muted)]">
        {label}
      </span>
      <span
        className={`text-sm font-semibold ${ok === false ? "text-[var(--st-error-text)]" : ok ? "text-[var(--st-success-text)]" : "text-[var(--st-text)]"}`}
      >
        {value}
      </span>
    </div>
  );
}

export function HomeDashboard() {
  const token = useAccessToken();
  const [apiStatus, setApiStatus] = useState("Checking API…");
  const [apiOk, setApiOk] = useState<boolean | undefined>(undefined);
  const [summary, setSummary] = useState<DashboardSummary | null>(null);
  const [agents, setAgents] = useState<AgentsStatusResponse | null>(null);

  useEffect(() => {
    getHealth()
      .then((h) => {
        setApiOk(true);
        setApiStatus(`Connected · v${h.version}`);
      })
      .catch(() => {
        setApiOk(false);
        setApiStatus("Offline — start backend on :8080");
      });

    if (token) {
      void getDashboardSummary(token).then(setSummary).catch(() => setSummary(null));
      void getAgentsStatus(token).then(setAgents).catch(() => setAgents(null));
    }
  }, [token]);

  const readyCount = agents?.agents?.filter((a) => a.ready).length ?? 0;
  const totalAgents = agents?.agents?.length ?? 0;

  return (
    <div className="mx-auto max-w-6xl space-y-10">
      <section
        aria-labelledby="home-hero-title"
        className="rounded-[var(--st-radius-lg)] border border-[var(--st-border)] px-8 py-10"
        style={{ background: "var(--st-hero-gradient)" }}
      >
        <p className="mb-2 text-sm font-medium text-[var(--st-primary)]">POLARIS Research Lab</p>
        <h1
          id="home-hero-title"
          className="max-w-2xl text-3xl font-semibold tracking-tight text-[var(--st-text)] sm:text-4xl"
        >
          Your research command center
        </h1>
        <p className="mt-3 max-w-2xl text-lg leading-relaxed text-[var(--st-muted)]">
          {APP_TAGLINE}
        </p>
        <div className="mt-6 flex flex-wrap gap-3">
          <Link href="/agents/hypothesis">
            <Button>Start with Hypothesis</Button>
          </Link>
          <Link href="/workflow">
            <Button variant="secondary">Open Workflow</Button>
          </Link>
          <Link href="/settings">
            <Button variant="secondary">Configure API key</Button>
          </Link>
        </div>
      </section>

      <section aria-label="Session status">
        <h2 className="mb-3 text-sm font-semibold uppercase tracking-wide text-[var(--st-muted)]">
          Status
        </h2>
        <div className="flex flex-wrap gap-3" role="list">
          <StatusPill label="API" value={apiStatus} ok={apiOk} />
          <StatusPill
            label="Workflow"
            value={summary?.active_workflow ? "Active" : "Idle"}
            ok={summary?.active_workflow}
          />
          <StatusPill
            label="Hypothesis"
            value={summary?.stage ?? agents?.stage ?? "—"}
            ok={summary?.hypothesis_ready ?? agents?.hypothesis_ready}
          />
          <StatusPill
            label="Agents ready"
            value={totalAgents ? `${readyCount} / ${totalAgents}` : "—"}
            ok={totalAgents > 0 && readyCount === totalAgents}
          />
        </div>
        {apiOk === false ? (
          <Alert variant="warning" className="mt-4" role="alert">
            The API is unreachable. Sign in and ensure the backend is running before using agents.
          </Alert>
        ) : null}
      </section>

      <section aria-labelledby="quick-start-title">
        <h2 id="quick-start-title" className="mb-4 text-xl font-semibold tracking-tight">
          Quick start
        </h2>
        <ol className="grid gap-4 sm:grid-cols-2">
          {QUICK_START_STEPS.map((item) => (
            <li key={item.step}>
              <CardLink href={item.href} ariaLabel={`${item.title}: ${item.description}`}>
                <span className="mb-2 inline-flex h-7 w-7 items-center justify-center rounded-full bg-[var(--st-primary)] text-xs font-bold text-white">
                  {item.step}
                </span>
                <h3 className="text-base font-semibold text-[var(--st-text)]">{item.title}</h3>
                <p className="mt-1 text-sm leading-relaxed text-[var(--st-muted)]">
                  {item.description}
                </p>
                <span className="mt-3 inline-block text-sm font-medium text-[var(--st-primary)]">
                  {item.cta} →
                </span>
              </CardLink>
            </li>
          ))}
        </ol>
      </section>

      <section aria-labelledby="pipeline-title">
        <h2 id="pipeline-title" className="mb-4 text-xl font-semibold tracking-tight">
          Research pipeline
        </h2>
        <Card>
          <div className="flex flex-col gap-4 sm:flex-row sm:flex-wrap sm:items-center">
            {WORKFLOW_STEPS.map((step, i) => (
              <div key={step.name} className="flex items-center gap-2">
                {step.page ? (
                  <Link
                    href={step.page}
                    className="rounded-[var(--st-radius-sm)] bg-[var(--st-hover)] px-3 py-2 text-sm font-medium text-[var(--st-text)] hover:text-[var(--st-primary)]"
                  >
                    {step.name.replace(" Agent", "")}
                  </Link>
                ) : (
                  <span className="text-sm font-medium">{step.name}</span>
                )}
                {i < WORKFLOW_STEPS.length - 1 ? (
                  <span className="hidden text-[var(--st-muted)] sm:inline" aria-hidden>
                    →
                  </span>
                ) : null}
              </div>
            ))}
          </div>
          <p className="mt-4 text-sm text-[var(--st-muted)]">
            Steps marked for automation can run after curve fitting when enabled in{" "}
            <Link href="/workflow" className="font-medium text-[var(--st-primary)] underline">
              Workflow
            </Link>
            .
          </p>
        </Card>
      </section>

      <section aria-labelledby="agents-title">
        <div className="mb-4 flex items-end justify-between gap-4">
          <h2 id="agents-title" className="text-xl font-semibold tracking-tight">
            Agents & tools
          </h2>
          <Link href="/dashboard" className="text-sm font-medium text-[var(--st-primary)]">
            Full analytics →
          </Link>
        </div>
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {AGENT_CARDS.map((card) => (
            <CardLink
              key={card.href}
              href={card.href}
              ariaLabel={`${card.title}: ${card.description}`}
            >
              <span className="text-2xl" aria-hidden>
                {card.icon}
              </span>
              <p className="mt-2 text-xs font-medium uppercase tracking-wide text-[var(--st-muted)]">
                {card.subtitle}
              </p>
              <h3 className="mt-0.5 text-lg font-semibold text-[var(--st-text)]">{card.title}</h3>
              <p className="mt-2 text-sm leading-relaxed text-[var(--st-muted)]">{card.description}</p>
            </CardLink>
          ))}
        </div>
      </section>

      {agents?.agents?.length ? (
        <section aria-labelledby="readiness-title">
          <h2 id="readiness-title" className="mb-4 text-xl font-semibold tracking-tight">
            Agent readiness
          </h2>
          <ul className="grid gap-3 sm:grid-cols-2">
            {agents.agents.map((a) => (
              <li
                key={a.name}
                className="flex items-start gap-3 rounded-[var(--st-radius)] border border-[var(--st-border)] bg-[var(--st-surface)] px-4 py-3"
              >
                <span
                  className={`mt-1.5 h-2.5 w-2.5 shrink-0 rounded-full ${a.ready ? "bg-[var(--st-success-border)]" : "bg-[var(--st-muted)]"}`}
                  aria-hidden
                />
                <div>
                  <p className="font-medium text-[var(--st-text)]">{a.name}</p>
                  <p className="text-sm text-[var(--st-muted)]">{a.message}</p>
                </div>
              </li>
            ))}
          </ul>
        </section>
      ) : null}

      <section aria-labelledby="research-title">
        <h2 id="research-title" className="mb-4 text-xl font-semibold tracking-tight">
          Built for lab scientists
        </h2>
        <div className="grid gap-3 sm:grid-cols-2">
          {RESEARCHER_FEATURES.map((f) => (
            <Card key={f.title}>
              <h3 className="font-semibold text-[var(--st-text)]">{f.title}</h3>
              <p className="mt-1 text-sm leading-relaxed text-[var(--st-muted)]">{f.detail}</p>
            </Card>
          ))}
        </div>
      </section>

      <section aria-labelledby="instructions-title">
        <h2 id="instructions-title" className="mb-4 text-xl font-semibold tracking-tight">
          Instructions
        </h2>
        <Card>
          <MarkdownBlock content={GETTING_STARTED} />
        </Card>
      </section>

      {summary?.last_hypothesis_preview ? (
        <section aria-labelledby="hypothesis-preview-title">
          <h2 id="hypothesis-preview-title" className="mb-3 text-lg font-semibold">
            Latest hypothesis
          </h2>
          <Card>
            <p className="text-sm leading-relaxed text-[var(--st-text)]">
              {summary.last_hypothesis_preview}
            </p>
            <Link
              href="/agents/hypothesis"
              className="mt-3 inline-block text-sm font-medium text-[var(--st-primary)]"
            >
              Continue in Hypothesis →
            </Link>
          </Card>
        </section>
      ) : null}
    </div>
  );
}
