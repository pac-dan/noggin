// Section label: Mono 11, 0.08em, uppercase, muted.
export function MonoLabel({ className = "", children }: { className?: string; children: React.ReactNode }) {
  return <div className={`label ${className}`}>{children}</div>;
}
