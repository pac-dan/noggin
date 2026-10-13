import Link from "next/link";

const variants = {
  card: "rounded-card border border-card-border bg-card",
  shelf: "rounded-btn-lg border border-shelf-border bg-shelf",
  attn: "rounded-card border border-attn-border bg-attn-bg",
};

// Surface for every block on every screen. Renders a link when given href.
export function Card({
  href,
  variant = "card",
  className = "",
  children,
}: {
  href?: string;
  variant?: keyof typeof variants;
  className?: string;
  children: React.ReactNode;
}) {
  const cls = `${variants[variant]} ${className}`;
  return href ? (
    <Link href={href} className={cls}>
      {children}
    </Link>
  ) : (
    <div className={cls}>{children}</div>
  );
}
