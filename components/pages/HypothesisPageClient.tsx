"use client";

import { useRef, useState } from "react";
import { useRouter } from "next/navigation";

import {
  AgentShell,
  Alert,
  Button,
  ChatMessage,
  FormField,
  TextArea,
} from "@/components/ui";
import { AgentDocumentPanel } from "@/components/ui/AgentDocumentPanel";
import { ApiError } from "@/lib/api-client";
import { bubblesToChatMessages, type HypothesisBubble } from "@/lib/hypothesis-chat";
import { streamHypothesisChat, type HypothesisStreamBody } from "@/lib/hypothesis-stream";
import { useAccessToken } from "@/lib/use-access-token";

type ChatMsg = {
  role: "user" | "assistant";
  title?: string;
  markdown?: string;
  text?: string;
};

export function HypothesisPageClient() {
  const token = useAccessToken();
  const [question, setQuestion] = useState("");
  const [messages, setMessages] = useState<ChatMsg[]>([]);
  const [stage, setStage] = useState("initial");
  const [options, setOptions] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);
  const [loadingLabel, setLoadingLabel] = useState("Running the hypothesis pipeline…");
  const [error, setError] = useState<string | null>(null);
  const [document, setDocument] = useState<{
    markdown: string;
    documentId?: string;
    pdfUrl?: string;
  } | null>(null);
  const streamedKeysRef = useRef<Set<string>>(new Set());

  function appendBubbles(bubbles: HypothesisBubble[] | undefined, userText?: string) {
    const newMsgs = bubblesToChatMessages(bubbles, userText);
    if (newMsgs.length === 0) return;
    setMessages((prev) => [...prev, ...newMsgs]);
  }

  function appendProgressBubbles(bubbles: HypothesisBubble[] | undefined) {
    if (!bubbles?.length) return;
    const fresh: HypothesisBubble[] = [];
    for (const b of bubbles) {
      const key = `${b.title ?? ""}:${b.content?.slice(0, 80) ?? ""}`;
      if (streamedKeysRef.current.has(key)) continue;
      streamedKeysRef.current.add(key);
      fresh.push(b);
    }
    appendBubbles(fresh);
  }

  async function runChat(body: HypothesisStreamBody, userText?: string) {
    setLoading(true);
    setError(null);
    setLoadingLabel("Running the hypothesis pipeline…");
    streamedKeysRef.current = new Set();
    if (userText) {
      setMessages((prev) => [...prev, { role: "user", text: userText }]);
    }

    try {
      await streamHypothesisChat(token, body, {
        onProgress: (ev) => {
          if (ev.label) setLoadingLabel(ev.label);
          appendProgressBubbles(ev.messages);
        },
        onComplete: (res) => {
          if (res.error) {
            setError(res.error);
            return;
          }
          setStage(res.stage);
          setOptions(res.options ?? []);
          if (res.document_markdown) {
            setDocument({
              markdown: res.document_markdown,
              documentId: res.document_id ?? undefined,
              pdfUrl: res.pdf_url ?? undefined,
            });
          }
          const bubbles = (res.messages ?? []) as HypothesisBubble[];
          appendProgressBubbles(bubbles);
          if (streamedKeysRef.current.size === 0 && res.assistant_message) {
            setMessages((prev) => [
              ...prev,
              ...(userText ? [{ role: "user" as const, text: userText }] : []),
              { role: "assistant", markdown: res.assistant_message },
            ]);
          } else if (userText) {
            setMessages((prev) => {
              const hasUser = prev.some((m) => m.role === "user" && m.text === userText);
              return hasUser ? prev : [...prev, { role: "user", text: userText }];
            });
          }
          if (body.action === "submit_question") setQuestion("");
        },
        onError: (msg) => setError(msg),
      });
    } catch (e) {
      let msg =
        e instanceof ApiError
          ? e.message
          : e instanceof Error
            ? e.message
            : "Request failed";
      if (e instanceof ApiError) {
        try {
          const parsed = JSON.parse(e.message) as { error?: string };
          if (parsed.error) msg = parsed.error;
        } catch {
          /* use raw message */
        }
        if (e.status === 504 || e.status === 502) {
          msg = `${msg} (proxy timeout — restart Next.js after update, or wait and retry)`;
        }
        if (e.status === 401) {
          msg = "Not authenticated. Sign in or set AUTH_DISABLED=true on the backend for local dev.";
        }
      }
      setError(msg);
    } finally {
      setLoading(false);
      setLoadingLabel("Running the hypothesis pipeline…");
    }
  }

  function onSubmitQuestion() {
    if (!question.trim() || loading) return;
    void runChat({ action: "submit_question", question: question.trim() }, question.trim());
  }

  function onChoose(choice: string) {
    if (loading) return;
    void runChat({ action: "choose_option", choice }, choice);
  }

  function onGenerateHypothesis() {
    if (loading) return;
    void runChat({ action: "generate_hypothesis" });
  }

  function onReset() {
    setMessages([]);
    setOptions([]);
    setStage("initial");
    setError(null);
    setDocument(null);
    void runChat({ action: "reset" });
  }

  const router = useRouter();

  // ── Chat input slot ──
  const chatInputSlot = (
    <div className="flex flex-col gap-2">
      {error ? <Alert variant="error">{error}</Alert> : null}
      <FormField
        label={
          stage === "refine" || stage === "hypothesis"
            ? "Or enter choice (1, 2, or 3)"
            : "Research question"
        }
      >
        <TextArea
          value={question}
          onChange={(e) => setQuestion(e.target.value)}
          placeholder={
            stage === "refine" || stage === "hypothesis"
              ? "1, 2, or 3"
              : "What is your research question?"
          }
          rows={2}
          disabled={loading}
          onKeyDown={(e) => {
            if (e.key === "Enter" && (e.metaKey || e.ctrlKey)) {
              if (stage === "refine" || stage === "hypothesis") {
                const c = question.trim();
                if (["1", "2", "3"].includes(c)) onChoose(c);
                else setError("Enter 1, 2, or 3");
              } else {
                onSubmitQuestion();
              }
            }
          }}
        />
      </FormField>
      <div className="flex flex-wrap gap-2">
        {stage === "refine" || stage === "hypothesis" ? (
          <Button
            onClick={() => {
              const c = question.trim();
              if (["1", "2", "3"].includes(c)) onChoose(c);
              else setError("Enter 1, 2, or 3");
            }}
            disabled={loading}
          >
            {loading ? "Thinking…" : "Submit choice"}
          </Button>
        ) : stage === "initial" ? (
          <Button onClick={onSubmitQuestion} disabled={loading || !question.trim()}>
            {loading ? "Thinking…" : "Submit question"}
          </Button>
        ) : null}
        {stage === "refine" || stage === "hypothesis" ? (
          <Button variant="secondary" disabled={loading} onClick={onGenerateHypothesis}>
            {loading ? "Synthesizing…" : "Stop & create hypothesis"}
          </Button>
        ) : null}
        <Button variant="secondary" onClick={onReset} disabled={loading}>
          New
        </Button>
      </div>
    </div>
  );

  // ── Chat content slot ──
  const chatContentSlot = (
    <div className="flex flex-col gap-3">
      {messages.length === 0 ? (
        <Alert variant="info">
          Enter your research question below. Responses stream in step by step (clarified
          question, Socratic pass, reasoning, then three exploration paths).
        </Alert>
      ) : (
        messages.map((msg, i) => (
          <ChatMessage
            key={`${i}-${msg.title ?? msg.role}`}
            role={msg.role}
            title={msg.title}
            markdown={msg.markdown}
          >
            {msg.text}
          </ChatMessage>
        ))
      )}
      {loading ? (
        <ChatMessage role="assistant" title="Thinking">
          {loadingLabel}
        </ChatMessage>
      ) : null}
      {/* Inline choice pills */}
      {options.length > 0 && (
        <div className="flex flex-wrap gap-2 pt-1">
          {options.map((opt, i) => (
            <button
              key={opt}
              type="button"
              onClick={() => onChoose(String(i + 1))}
              disabled={loading}
              className="rounded-full border border-[var(--st-border)] bg-[var(--st-surface)] px-3 py-1.5 text-xs text-[var(--st-text)] transition hover:border-[var(--st-primary)] hover:text-[var(--st-primary)] disabled:opacity-50"
            >
              {i + 1}. {opt.length > 60 ? opt.slice(0, 60) + "…" : opt}
            </button>
          ))}
        </div>
      )}
      {stage === "analysis" ? (
        <Alert variant="success">
          Hypothesis and analysis report are ready. Open the Experiment agent to design your
          experimental plan.
        </Alert>
      ) : null}
    </div>
  );

  // ── Document tab ──
  const documentSlot = document ? (
    <AgentDocumentPanel
      title="Hypothesis report"
      markdown={document.markdown}
      documentId={document.documentId}
      pdfUrl={document.pdfUrl}
    />
  ) : (
    <p className="text-sm text-[var(--st-muted)]">
      Your hypothesis will appear here as the agent works…
    </p>
  );

  // ── Context tab ──
  const contextSlot = (
    <div className="flex flex-col gap-3 text-sm">
      <div>
        <span className="text-xs font-semibold uppercase tracking-wider text-[var(--st-muted)]">Stage</span>
        <p className="mt-1 text-[var(--st-text)]">{stage}</p>
      </div>
      {question && (
        <div>
          <span className="text-xs font-semibold uppercase tracking-wider text-[var(--st-muted)]">Current question</span>
          <p className="mt-1 text-[var(--st-text)]">{question}</p>
        </div>
      )}
      {options.length > 0 && (
        <div>
          <span className="text-xs font-semibold uppercase tracking-wider text-[var(--st-muted)]">Options</span>
          <ul className="mt-1 list-disc pl-4">
            {options.map((o, i) => (
              <li key={i} className="text-[var(--st-text)]">{o}</li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );

  // ── History tab ──
  const historySlot = (
    <p className="text-sm text-[var(--st-muted)]">No history yet.</p>
  );

  return (
    <AgentShell
      title="Hypothesis Agent"
      iconClass="bi-lightbulb-fill"
      status={loading ? "busy" : "ready"}
      statusLabel={loading ? loadingLabel : "Ready"}
      chatContent={chatContentSlot}
      chatInput={chatInputSlot}
      documentContent={documentSlot}
      contextContent={contextSlot}
      historyContent={historySlot}
      onExport={document?.pdfUrl ? () => window.open(document!.pdfUrl!, "_blank") : undefined}
      handoffLabel="→ Experiment"
      onHandoff={() => router.push("/agents/experiment")}
    />
  );
}
