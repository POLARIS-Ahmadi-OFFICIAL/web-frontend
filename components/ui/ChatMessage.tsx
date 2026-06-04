import type { ReactNode } from "react";

import { MarkdownBlock } from "./MarkdownBlock";

export function ChatMessage({
  role,
  title,
  children,
  markdown,
}: {
  role: "user" | "assistant";
  title?: string;
  children?: ReactNode;
  /** When set, renders markdown body (assistant sections). */
  markdown?: string;
}) {
  const isUser = role === "user";
  return (
    <div
      className={`mb-4 rounded-lg border-l-4 p-4 ${
        isUser
          ? "border-[var(--st-chat-user-border)] bg-[var(--st-chat-user)]"
          : "border-[var(--st-chat-assistant-border)] bg-[var(--st-chat-assistant)]"
      }`}
    >
      <p className="mb-1 text-xs font-semibold uppercase text-[var(--st-muted)]">
        {isUser ? "You" : title ? title : "Assistant"}
      </p>
      <div className="text-sm leading-relaxed text-[var(--st-text)]">
        {markdown ? <MarkdownBlock content={markdown} /> : children}
      </div>
    </div>
  );
}
