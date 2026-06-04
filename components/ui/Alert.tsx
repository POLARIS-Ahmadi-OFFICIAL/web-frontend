const variantClass = {
  info: "bg-[var(--st-info-bg)] border border-[var(--st-info-border)]/30 text-[var(--st-info-text)]",
  success:
    "bg-[var(--st-success-bg)] border border-[var(--st-success-border)]/30 text-[var(--st-success-text)]",
  warning:
    "bg-[var(--st-warning-bg)] border border-[var(--st-warning-border)]/30 text-[var(--st-warning-text)]",
  error:
    "bg-[var(--st-error-bg)] border border-[var(--st-error-border)]/30 text-[var(--st-error-text)]",
};

export function Alert({
  variant = "info",
  children,
  role = "status",
  className = "",
}: {
  variant?: keyof typeof variantClass;
  children: React.ReactNode;
  role?: "status" | "alert";
  className?: string;
}) {
  return (
    <div
      role={role}
      className={`rounded-[var(--st-radius)] px-4 py-3 text-sm leading-relaxed ${variantClass[variant]} ${className}`}
    >
      {children}
    </div>
  );
}
