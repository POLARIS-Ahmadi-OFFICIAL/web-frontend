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
  variant?: "primary" | "secondary" | "icon" | "ghost";
  fullWidth?: boolean;
  className?: string;
  onClick?: () => void;
  disabled?: boolean;
  type?: "button" | "submit";
}) {
  const base =
    "rounded-[var(--st-radius-sm)] text-sm font-medium transition disabled:opacity-50 disabled:cursor-not-allowed";
  const variants = {
    primary:
      "px-4 py-2.5 min-h-[44px] bg-[var(--st-primary)] text-white hover:bg-[var(--st-primary-hover)] shadow-[var(--st-shadow-sm)]",
    secondary:
      "px-4 py-2.5 min-h-[44px] border border-[var(--st-border)] bg-[var(--st-surface)] text-[var(--st-text)] hover:bg-[var(--st-hover)]",
    icon:
      "h-9 w-9 flex items-center justify-center bg-transparent hover:bg-[var(--st-hover)] text-[var(--st-muted)] hover:text-[var(--st-text)]",
    ghost:
      "px-3 py-2 bg-transparent text-[var(--st-text)] hover:bg-[var(--st-hover)]",
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
