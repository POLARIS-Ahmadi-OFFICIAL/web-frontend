"use client";

import { apiPath } from "@polaris/shared-types";

import { Button } from "@/components/ui/Button";
import { getApiBase } from "@/lib/api-base";

export function AgentDocumentPanel({
  title,
  markdown,
  documentId,
  pdfUrl,
}: {
  title: string;
  markdown: string;
  documentId?: string | null;
  pdfUrl?: string | null;
}) {
  if (!markdown?.trim()) return null;

  const href =
    pdfUrl?.startsWith("http")
      ? pdfUrl
      : `${getApiBase()}${apiPath(pdfUrl ?? `/documents/${documentId}/pdf`)}`;

  return (
    <div className="mt-6 rounded-lg border border-[var(--st-border)] bg-[var(--st-surface)]">
      <div className="flex flex-wrap items-center justify-between gap-2 border-b border-[var(--st-border)] px-4 py-3">
        <h3 className="text-sm font-semibold text-[var(--st-text)]">{title}</h3>
        {documentId || pdfUrl ? (
          <a href={href} target="_blank" rel="noopener noreferrer">
            <Button variant="secondary">Download PDF</Button>
          </a>
        ) : null}
      </div>
      <article className="max-h-[50vh] overflow-y-auto px-4 py-4 text-sm leading-relaxed text-[var(--st-text)]">
        <DocumentMarkdown content={markdown} />
      </article>
    </div>
  );
}

function DocumentMarkdown({ content }: { content: string }) {
  const blocks = content.split(/\n(?=#+\s)/);
  return (
    <div className="space-y-4">
      {blocks.map((block, i) => {
        const lines = block.trim().split("\n");
        const first = lines[0] ?? "";
        const isHeading = /^#+\s/.test(first);
        const body = isHeading ? lines.slice(1).join("\n") : block;
        const level = isHeading ? (first.match(/^#+/)?.[0].length ?? 2) : 0;
        const headingText = isHeading ? first.replace(/^#+\s*/, "") : "";

        return (
          <section key={i}>
            {isHeading ? (
              <h4
                className={
                  level <= 1
                    ? "mb-2 text-lg font-bold"
                    : level === 2
                      ? "mb-2 text-base font-semibold"
                      : "mb-1 text-sm font-semibold"
                }
              >
                {headingText}
              </h4>
            ) : null}
            <pre className="whitespace-pre-wrap font-sans text-[var(--st-text)]">{body.trim()}</pre>
          </section>
        );
      })}
    </div>
  );
}
