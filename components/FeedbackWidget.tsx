"use client";

import { useEffect, useState } from "react";

import { FeedbackForm } from "@/components/FeedbackForm";
import { installConsoleCapture } from "@/lib/console-capture";

export function FeedbackWidget() {
  const [open, setOpen] = useState(false);

  useEffect(() => {
    installConsoleCapture();
  }, []);

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        aria-label="Send feedback"
        className="fixed bottom-5 right-5 z-40 flex h-11 w-11 items-center justify-center rounded-full bg-[var(--st-primary)] text-white shadow-[var(--st-shadow-sm)] hover:bg-[var(--st-primary-hover)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--st-primary)]/40"
      >
        <i className="bi bi-life-preserver text-lg" aria-hidden="true" />
      </button>

      {open ? (
        <div
          role="dialog"
          aria-modal="true"
          aria-label="Send feedback"
          className="fixed inset-0 z-50 flex items-end justify-end bg-black/30 p-5 sm:items-center sm:justify-center"
          onClick={(e) => {
            if (e.target === e.currentTarget) setOpen(false);
          }}
        >
          <div className="w-full max-w-md rounded-[var(--st-radius)] border border-[var(--st-border)] bg-[var(--st-surface)] p-5 shadow-[var(--st-shadow-sm)]">
            <div className="mb-4 flex items-center justify-between">
              <h3 className="text-base font-semibold text-[var(--st-text)]">Send feedback</h3>
              <button
                type="button"
                onClick={() => setOpen(false)}
                aria-label="Close"
                className="text-[var(--st-muted)] hover:text-[var(--st-text)]"
              >
                <i className="bi bi-x-lg" aria-hidden="true" />
              </button>
            </div>
            <FeedbackForm onSent={() => setTimeout(() => setOpen(false), 1200)} />
          </div>
        </div>
      ) : null}
    </>
  );
}
