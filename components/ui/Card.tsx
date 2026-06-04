import Link from "next/link";

export function Card({
  children,
  className = "",
}: {
  children: React.ReactNode;
  className?: string;
}) {
  return <div className={`st-card p-5 ${className}`}>{children}</div>;
}

export function CardLink({
  href,
  children,
  className = "",
  ariaLabel,
}: {
  href: string;
  children: React.ReactNode;
  className?: string;
  ariaLabel?: string;
}) {
  return (
    <Link
      href={href}
      aria-label={ariaLabel}
      className={`st-card st-card-interactive block p-5 no-underline ${className}`}
    >
      {children}
    </Link>
  );
}
