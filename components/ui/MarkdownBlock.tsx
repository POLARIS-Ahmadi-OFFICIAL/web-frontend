export function MarkdownBlock({ content }: { content: string }) {
  const blocks = content.trim().split("\n\n");
  return (
    <div className="prose prose-sm max-w-none text-[var(--st-text)]">
      {blocks.map((block, i) => {
        if (block.startsWith("### ")) {
          return (
            <h3 key={i} className="mt-4 text-base font-semibold">
              {block.replace(/^###\s*/, "")}
            </h3>
          );
        }
        if (block.startsWith("#### ")) {
          return (
            <h4 key={i} className="mt-3 text-sm font-semibold">
              {block.replace(/^####\s*/, "")}
            </h4>
          );
        }
        if (block.match(/^\d+\.\s/)) {
          const items = block.split("\n").filter(Boolean);
          return (
            <ol key={i} className="list-decimal space-y-1 pl-5 text-sm">
              {items.map((line, j) => (
                <li key={j}>{line.replace(/^\d+\.\s*/, "").replace(/\*\*/g, "")}</li>
              ))}
            </ol>
          );
        }
        const lines = block.split("\n");
        return (
          <div key={i} className="space-y-1 text-sm leading-relaxed">
            {lines.map((line, j) => (
              <p key={j}>
                {line.split(/(\*\*[^*]+\*\*)/g).map((part, k) =>
                  part.startsWith("**") && part.endsWith("**") ? (
                    <strong key={k}>{part.slice(2, -2)}</strong>
                  ) : (
                    <span key={k}>{part}</span>
                  ),
                )}
              </p>
            ))}
          </div>
        );
      })}
    </div>
  );
}
