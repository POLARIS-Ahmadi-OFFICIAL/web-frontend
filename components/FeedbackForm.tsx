"use client";

import { useState } from "react";

import { Alert, Button, FormField, Select, TextArea } from "@/components/ui";
import { submitFeedback, type FeedbackCategory } from "@/lib/api-client";
import { getAppContext } from "@/lib/desktop-context";
import { getRecentConsoleErrors } from "@/lib/console-capture";
import { useAccessToken } from "@/lib/use-access-token";

const CATEGORY_OPTIONS: { value: FeedbackCategory; label: string }[] = [
  { value: "bug", label: "Bug" },
  { value: "feature", label: "Feature request" },
  { value: "other", label: "Other" },
];

export function FeedbackForm({ onSent }: { onSent?: () => void }) {
  const token = useAccessToken();
  const [category, setCategory] = useState<FeedbackCategory>("bug");
  const [message, setMessage] = useState("");
  const [status, setStatus] = useState<"idle" | "sending" | "sent" | "error">("idle");
  const [errorText, setErrorText] = useState<string | null>(null);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!message.trim() || status === "sending") return;
    setStatus("sending");
    setErrorText(null);
    try {
      await submitFeedback(token, {
        message: message.trim(),
        category,
        app_context: getAppContext(),
        console_errors: getRecentConsoleErrors(),
      });
      setStatus("sent");
      setMessage("");
      onSent?.();
    } catch (e) {
      setStatus("error");
      setErrorText(e instanceof Error ? e.message : "Failed to send feedback");
    }
  }

  if (status === "sent") {
    return (
      <Alert variant="success">
        Thanks — your feedback was sent. Reset the form below to send another.
        <div className="mt-3">
          <Button variant="secondary" onClick={() => setStatus("idle")}>
            Send another
          </Button>
        </div>
      </Alert>
    );
  }

  return (
    <form className="space-y-4" onSubmit={handleSubmit}>
      <FormField label="Type">
        <Select
          options={CATEGORY_OPTIONS}
          value={category}
          onChange={(e) => setCategory(e.target.value as FeedbackCategory)}
        />
      </FormField>
      <FormField label="What happened?" help="Describe the bug or idea — the more detail, the better.">
        <TextArea
          value={message}
          onChange={(e) => setMessage(e.target.value)}
          placeholder="Steps to reproduce, what you expected, what happened instead…"
          required
        />
      </FormField>
      {status === "error" ? <Alert variant="error">{errorText}</Alert> : null}
      <Button type="submit" fullWidth disabled={status === "sending" || !message.trim()}>
        {status === "sending" ? "Sending…" : "Send feedback"}
      </Button>
    </form>
  );
}
