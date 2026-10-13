import { toneBg, toneFg, type Tone } from "@/lib/status";

// Mono status pill, 6px radius, status-coloured.
export function Pill({ tone, className = "", children }: { tone: Tone; className?: string; children: React.ReactNode }) {
  return (
    <span className={`whitespace-nowrap rounded-pill px-2 py-[3px] font-mono text-[11px] uppercase ${toneBg[tone]} ${toneFg[tone]} ${className}`}>
      {children}
    </span>
  );
}
