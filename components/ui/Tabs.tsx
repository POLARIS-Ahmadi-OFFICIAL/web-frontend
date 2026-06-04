"use client";

import { useId, useState } from "react";

export function Tabs({
  items,
  scrollable = false,
}: {
  items: { label: string; content: React.ReactNode }[];
  scrollable?: boolean;
}) {
  const [active, setActive] = useState(0);
  const baseId = useId();

  return (
    <div>
      <div
        role="tablist"
        aria-label="Sections"
        className={`flex gap-0 border-b border-[var(--st-border)] ${
          scrollable ? "overflow-x-auto scrollbar-thin" : "flex-wrap"
        }`}
      >
        {items.map((item, i) => {
          const tabId = `${baseId}-tab-${i}`;
          const panelId = `${baseId}-panel-${i}`;
          const selected = active === i;
          return (
            <button
              key={item.label}
              id={tabId}
              type="button"
              role="tab"
              aria-selected={selected}
              aria-controls={panelId}
              tabIndex={selected ? 0 : -1}
              onClick={() => setActive(i)}
              className={`shrink-0 border-b-2 px-4 py-2.5 text-sm font-medium transition focus-visible:outline-none ${
                selected
                  ? "border-[var(--st-primary)] text-[var(--st-primary)]"
                  : "border-transparent text-[var(--st-muted)] hover:text-[var(--st-text)]"
              }`}
            >
              {item.label}
            </button>
          );
        })}
      </div>
      {items.map((item, i) => {
        const panelId = `${baseId}-panel-${i}`;
        const tabId = `${baseId}-tab-${i}`;
        if (active !== i) return null;
        return (
          <div
            key={item.label}
            id={panelId}
            role="tabpanel"
            aria-labelledby={tabId}
            tabIndex={0}
            className="pt-6 focus:outline-none"
          >
            {item.content}
          </div>
        );
      })}
    </div>
  );
}
