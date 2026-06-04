import { apiPath } from "@polaris/shared-types";

import { ApiError } from "@/lib/api-client";
import { getApiBase } from "@/lib/api-base";
import type { HypothesisBubble, HypothesisChatResponse } from "@/lib/api-client";

const AGENT_TIMEOUT_MS = 300_000;

export type HypothesisStreamBody = {
  action: "submit_question" | "choose_option" | "generate_hypothesis" | "reset";
  question?: string;
  choice?: string;
  experiment_id?: number;
};

export type HypothesisProgressEvent = {
  step?: string;
  messages?: HypothesisBubble[];
  label?: string;
};

function parseSseChunk(buffer: string): { events: { event: string; data: string }[]; rest: string } {
  const events: { event: string; data: string }[] = [];
  const parts = buffer.split("\n\n");
  const rest = parts.pop() ?? "";
  for (const block of parts) {
    let event = "message";
    const dataLines: string[] = [];
    for (const line of block.split("\n")) {
      if (line.startsWith("event:")) event = line.slice(6).trim();
      else if (line.startsWith("data:")) dataLines.push(line.slice(5).trim());
    }
    if (dataLines.length) events.push({ event, data: dataLines.join("\n") });
  }
  return { events, rest };
}

export async function streamHypothesisChat(
  token: string | null,
  body: HypothesisStreamBody,
  handlers: {
    onProgress?: (ev: HypothesisProgressEvent) => void;
    onComplete?: (res: HypothesisChatResponse) => void;
    onError?: (message: string) => void;
  },
): Promise<void> {
  const url = `${getApiBase()}${apiPath("/agents/hypothesis/chat/stream")}`;
  const res = await fetch(url, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Accept: "text/event-stream",
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
    body: JSON.stringify(body),
    signal: AbortSignal.timeout(AGENT_TIMEOUT_MS),
  });

  if (!res.ok) {
    const text = await res.text();
    throw new ApiError(text || res.statusText, res.status);
  }

  const reader = res.body?.getReader();
  if (!reader) {
    throw new ApiError("Streaming not supported", 500);
  }

  const decoder = new TextDecoder();
  let buffer = "";

  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    buffer += decoder.decode(value, { stream: true });
    const parsed = parseSseChunk(buffer);
    buffer = parsed.rest;

    for (const { event, data } of parsed.events) {
      if (event === "done") return;
      try {
        const payload = JSON.parse(data) as Record<string, unknown>;
        if (event === "error") {
          handlers.onError?.(String(payload.error ?? "Stream error"));
          return;
        }
        if (event === "progress") {
          handlers.onProgress?.({
            step: payload.step as string | undefined,
            messages: (payload.messages as HypothesisBubble[]) ?? [],
            label: payload.label as string | undefined,
          });
        }
        if (event === "complete") {
          handlers.onComplete?.({
            stage: String(payload.stage ?? "initial"),
            messages: (payload.messages as HypothesisBubble[]) ?? [],
            assistant_message: String(payload.assistant_message ?? ""),
            options: (payload.options as string[]) ?? [],
            error: (payload.error as string | null) ?? null,
            document_id: (payload.document_id as string | null) ?? null,
            document_markdown: (payload.document_markdown as string | null) ?? null,
            pdf_url: (payload.pdf_url as string | null) ?? null,
          });
        }
      } catch {
        handlers.onError?.("Invalid stream payload from server");
        return;
      }
    }
  }
}
