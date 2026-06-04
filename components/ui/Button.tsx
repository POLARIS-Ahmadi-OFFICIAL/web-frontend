export function Button({
  children,
  variant = "primary",
  fullWidth,
  className = "",
  onClick,
  disabled,
  type = "button",
}: {
  children: React.ReactNode;
  variant?: "primary" | "secondary";
  fullWidth?: boolean;
  className?: string;
  onClick?: () => void;
  disabled?: boolean;
  type?: "button" | "submit";
}) {
  const base =
    "rounded-[var(--st-radius-sm)] px-4 py-2.5 text-sm font-medium transition disabled:opacity-50 disabled:cursor-not-allowed min-h-[44px]";
  const variants = {
    primary:
      "bg-[var(--st-primary)] text-white hover:bg-[var(--st-primary-hover)] shadow-[var(--st-shadow-sm)]",
    secondary:
      "border border-[var(--st-border)] bg-[var(--st-surface)] text-[var(--st-text)] hover:bg-[var(--st-hover)]",
  };
  return (
    <button
      type={type}
      disabled={disabled}
      onClick={onClick}
      className={`${base} ${variants[variant]} ${fullWidth ? "w-full" : ""} ${className}`.trim()}
    >
      {children}
    </button>
  );
}
