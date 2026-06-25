import { AppNav } from "@/components/AppNav";

export function AppShell({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex min-h-screen bg-[var(--st-main)]">
      <a
        href="#main-content"
        className="st-skip-link"
      >
        Skip to main content
      </a>
      <AppNav />
      <div
        id="main-content"
        tabIndex={-1}
        className="flex-1 overflow-auto outline-none"
      >
        {children}
      </div>
    </div>
  );
}
