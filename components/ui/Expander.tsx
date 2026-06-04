"use client";

import { useState } from "react";

export function Expander({
  title,
  defaultOpen = false,
  children,
}: {
  title: string;
  defaultOpen?: boolean;
  children: React.ReactNode;
}) {
  const [open, setOpen] = useState(defaultOpen);
  return (
    <div className="rounded-lg border border-[var(--st-border)] bg-[var(--st-surface)]">
      <button
        type="button"
        onClick={() => setOpen(!open)}
        className="flex w-full items-center justify-between px-4 py-3 text-left text-sm font-medium text-[var(--st-text)]"
      >
        {title}
        <span className="text-[var(--st-muted)]">{open ? "▼" : "▶"}</span>
      </button>
      {open ? <div className="border-t border-[var(--st-border)] px-4 py-4">{children}</div> : null}
    </div>
  );
}
