export function PageTitle({
  children,
  icon,
}: {
  children: React.ReactNode;
  icon?: string;
}) {
  return (
    <h1 className="text-[1.875rem] font-semibold tracking-tight leading-tight text-[var(--st-text)]">
      {icon ? <span className="mr-2">{icon}</span> : null}
      {children}
    </h1>
  );
}
