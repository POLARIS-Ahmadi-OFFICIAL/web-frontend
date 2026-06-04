export type HypothesisBubble = {
  role: "user" | "assistant";
  title?: string | null;
  content: string;
};

export type HypothesisChatResponse = {
  stage: string;
  messages?: HypothesisBubble[];
  assistant_message?: string;
  options: string[];
  error?: string | null;
};

/** Expand API bubbles into UI message list (after optional user line). */
export function bubblesToChatMessages(
  bubbles: HypothesisBubble[] | undefined,
  userText?: string,
): { role: "user" | "assistant"; title?: string; markdown?: string; text?: string }[] {
  const out: { role: "user" | "assistant"; title?: string; markdown?: string; text?: string }[] = [];
  if (userText) {
    out.push({ role: "user", text: userText });
  }
  for (const b of bubbles ?? []) {
    if (!b.content?.trim()) continue;
    out.push({
      role: b.role === "user" ? "user" : "assistant",
      title: b.title ?? undefined,
      markdown: b.role === "assistant" ? b.content : undefined,
      text: b.role === "user" ? b.content : undefined,
    });
  }
  return out;
}
