import { toneFill, type Tone } from "@/lib/status";

// 4px bar (6px on the Project screen), track = card border colour.
export function ProgressBar({ pct, tone, thick = false }: { pct: number; tone: Tone; thick?: boolean }) {
  return (
    <div className={`flex-auto overflow-hidden bg-card-border ${thick ? "h-1.5 rounded-[3px]" : "h-1 rounded-[2px]"}`}>
      <div className={`h-full ${toneFill[tone]}`} style={{ width: `${Math.max(0, Math.min(100, pct))}%` }} />
    </div>
  );
}
