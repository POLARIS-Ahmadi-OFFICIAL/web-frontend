"use client";

import { useRef, useState } from "react";

import {
  Alert,
  Button,
  ChatMessage,
  FormField,
  StreamlitPage,
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

  const showChoiceCards = stage === "refine" && options.length > 0;
  const showNextStepOptions = stage === "hypothesis" && options.length > 0;

  return (
    <StreamlitPage
      title="AI Hypothesis Agent"
      icon="🧠"
      layout="centered"
      action={
        <Button variant="secondary" onClick={onReset} disabled={loading}>
          🗑️ New
        </Button>
      }
    >
      {error ? <Alert variant="error">{error}</Alert> : null}
      <div className="mb-4 max-h-[55vh] space-y-1 overflow-y-auto">
        {messages.length === 0 ? (
          <Alert variant="info">
            Enter your research question below. Responses stream in step by step (clarified
            question, Socratic pass, reasoning, then three exploration paths).
          </Alert>
        ) : (
          messages.map((m, i) => (
            <ChatMessage
              key={`${i}-${m.title ?? m.role}`}
              role={m.role}
              title={m.title}
              markdown={m.markdown}
            >
              {m.text}
            </ChatMessage>
          ))
        )}
        {loading ? (
          <ChatMessage role="assistant" title="Thinking">
            {loadingLabel}
          </ChatMessage>
        ) : null}
      </div>

      {showChoiceCards ? (
        <div className="mb-4 space-y-3">
          <p className="text-sm font-semibold text-[var(--st-text)]">
            Choose the line of thought that best explores your question (1, 2, or 3):
          </p>
          {options.map((opt, i) => (
            <div
              key={i}
              className="rounded-lg border border-[var(--st-border)] bg-[var(--st-surface)] p-3"
            >
              <p className="mb-2 text-xs font-semibold text-[var(--st-muted)]">Option {i + 1}</p>
              <p className="mb-3 line-clamp-4 text-sm text-[var(--st-text)]">{opt}</p>
              <Button variant="secondary" disabled={loading} onClick={() => onChoose(String(i + 1))}>
                Select {i + 1}
              </Button>
            </div>
          ))}
        </div>
      ) : null}

      {showNextStepOptions ? (
        <div className="mb-4 space-y-3">
          <p className="text-sm font-semibold text-[var(--st-text)]">
            Choose a next-step option (1, 2, or 3) to deepen exploration:
          </p>
          {options.map((opt, i) => (
            <div
              key={i}
              className="rounded-lg border border-[var(--st-border)] bg-[var(--st-surface)] p-3"
            >
              <p className="mb-2 text-xs font-semibold text-[var(--st-muted)]">Option {i + 1}</p>
              <p className="mb-3 line-clamp-4 text-sm text-[var(--st-text)]">{opt}</p>
              <Button variant="secondary" disabled={loading} onClick={() => onChoose(String(i + 1))}>
                Select {i + 1}
              </Button>
            </div>
          ))}
        </div>
      ) : null}

      {stage === "analysis" ? (
        <Alert variant="success" className="mb-4">
          Hypothesis and analysis report are ready. Open the Experiment agent to design your
          experimental plan.
        </Alert>
      ) : null}

      {document ? (
        <AgentDocumentPanel
          title="Hypothesis report"
          markdown={document.markdown}
          documentId={document.documentId}
          pdfUrl={document.pdfUrl}
        />
      ) : null}

      <FormField
        label={
          stage === "refine" || stage === "hypothesis"
            ? "Or enter choice (1, 2, or 3)"
            : "Research question"
        }
      >
        <TextArea
          placeholder={
            stage === "refine" || stage === "hypothesis"
              ? "1, 2, or 3"
              : "What is your research question?"
          }
          value={question}
          onChange={(e) => setQuestion(e.target.value)}
          disabled={loading}
        />
      </FormField>
      <div className="mt-4 flex flex-wrap gap-2">
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
      </div>
    </StreamlitPage>
  );
}
