import { PageTitle } from "./PageTitle";

export function StreamlitPage({
  title,
  icon,
  description,
  layout = "centered",
  children,
  action,
}: {
  title: string;
  icon?: string;
  description?: string;
  layout?: "centered" | "wide";
  children: React.ReactNode;
  action?: React.ReactNode;
}) {
  return (
    <main
      className={`min-h-full bg-[var(--st-bg)] text-[var(--st-text)] ${layout === "wide" ? "max-w-none" : "max-w-5xl"} mx-auto w-full`}
    >
      <header className="flex items-start justify-between gap-4 border-b border-[var(--st-border)] px-6 py-6">
        <PageTitle icon={icon}>{title}</PageTitle>
        {action}
      </header>
      {description ? (
        <p className="px-6 pt-4 text-base leading-relaxed text-[var(--st-muted)]">{description}</p>
      ) : null}
      <div className="px-6 py-8">{children}</div>
    </main>
  );
}
