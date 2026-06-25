"use client";

import { useState } from "react";
import Link from "next/link";

import { Button } from "@/components/ui/Button";
import { ThemeToggle } from "@/components/ThemeToggle";

type Tab = "Document" | "Context" | "History";

type AgentShellProps = {
  title: string;
  iconClass: string;
  status?: "ready" | "busy" | "error";
  statusLabel?: string;
  chatContent: React.ReactNode;
  chatInput: React.ReactNode;
  documentContent: React.ReactNode;
  contextContent: React.ReactNode;
  historyContent: React.ReactNode;
  onExport?: () => void;
  handoffLabel?: string;
  onHandoff?: () => void;
  defaultTab?: Tab;
};

const STATUS_STYLES: Record<string, string> = {
  ready: "bg-[var(--st-success-bg)] text-[var(--st-success-text)]",
  busy:  "bg-[var(--st-warning-bg)] text-[var(--st-warning-text)]",
  error: "bg-[var(--st-error-bg)]   text-[var(--st-error-text)]",
};

export function AgentShell({
  title,
  iconClass,
  status,
  statusLabel,
  chatContent,
  chatInput,
  documentContent,
  contextContent,
  historyContent,
  onExport,
  handoffLabel,
  onHandoff,
  defaultTab = "Document",
}: AgentShellProps) {
  const [activeTab, setActiveTab] = useState<Tab>(defaultTab);

  return (
    <div className="flex h-full flex-col overflow-hidden bg-[var(--st-bg)]">
      {/* ── Top bar ── */}
      <div className="flex h-11 shrink-0 items-center gap-3 border-b border-[var(--st-border)] bg-[var(--st-surface)] px-4">
        <i className={`bi ${iconClass} text-base text-[var(--st-primary)]`} aria-hidden="true" />
        <span className="text-sm font-semibold text-[var(--st-text)]">{title}</span>

        {status && (
          <span
            role="status"
            className={`ml-auto mr-auto rounded-full px-2.5 py-0.5 text-xs font-medium ${STATUS_STYLES[status] ?? ""}`}
          >
            {statusLabel ?? status}
          </span>
        )}

        <div className="ml-auto flex items-center gap-2">
          <ThemeToggle compact />
          <Link href="/settings" aria-label="Settings" title="Settings">
            <Button variant="icon">
              <i className="bi bi-gear text-sm" aria-hidden="true" />
            </Button>
          </Link>
        </div>
      </div>

      {/* ── Body ── */}
      <div className="flex flex-1 overflow-hidden">
        {/* Chat pane */}
        <div className="flex flex-1 flex-col overflow-hidden border-r border-[var(--st-border)]">
          <div className="flex-1 overflow-y-auto p-4">
            {chatContent}
          </div>
          <div className="shrink-0 border-t border-[var(--st-border)] p-3">
            {chatInput}
          </div>
        </div>

        {/* Output pane */}
        <div className="flex w-[42%] min-w-[320px] flex-col overflow-hidden">
          {/* Tabs */}
          <div
            className="flex shrink-0 border-b border-[var(--st-border)]"
            role="tablist"
            aria-label="Output panel"
          >
            {(["Document", "Context", "History"] as Tab[]).map((tab) => (
              <button
                key={tab}
                type="button"
                role="tab"
                aria-selected={activeTab === tab}
                onClick={() => setActiveTab(tab)}
                className={`flex-1 py-2 text-xs font-medium transition-colors ${
                  activeTab === tab
                    ? "border-b-2 border-[var(--st-primary)] text-[var(--st-primary)]"
                    : "text-[var(--st-muted)] hover:text-[var(--st-text)]"
                }`}
              >
                {tab}
              </button>
            ))}
          </div>

          {/* Tab content */}
          <div
            role="tabpanel"
            aria-label={activeTab}
            className="flex-1 overflow-y-auto p-4"
          >
            {activeTab === "Document" && documentContent}
            {activeTab === "Context"  && contextContent}
            {activeTab === "History"  && historyContent}
          </div>

          {/* Action row */}
          {(onExport || (handoffLabel && onHandoff)) && (
            <div className="flex shrink-0 items-center justify-end gap-2 border-t border-[var(--st-border)] p-3">
              {onExport && (
                <Button variant="secondary" onClick={onExport}>
                  <i className="bi bi-download mr-1.5 text-sm" aria-hidden="true" />
                  Export PDF
                </Button>
              )}
              {handoffLabel && onHandoff && (
                <Button variant="primary" onClick={onHandoff}>
                  {handoffLabel}
                  <i className="bi bi-arrow-right ml-1.5 text-sm" aria-hidden="true" />
                </Button>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
