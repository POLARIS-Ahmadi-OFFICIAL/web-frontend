"use client";

import { HomeDashboard } from "@/components/HomeDashboard";

export function HomePageClient() {
  return (
    <div className="min-h-full bg-[var(--st-main)]">
      <div className="border-b border-[var(--st-border)] bg-[var(--st-surface)] px-6 py-8">
        <p className="text-sm font-medium text-[var(--st-muted)]">Welcome</p>
        <h1 className="mt-1 text-2xl font-semibold tracking-tight text-[var(--st-text)] sm:hidden">
          POLARIS
        </h1>
      </div>
      <div className="px-6 py-8">
        <HomeDashboard />
      </div>
    </div>
  );
}
