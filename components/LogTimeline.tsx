import { Dot } from "@/components/Dot";
import { dayLabel } from "@/lib/format";
import type { Tone } from "@/lib/status";

type Entry = { id: string; body: string; source: string; created_at: string | null };

// Vertical timeline, newest first: Mono date + source chip, 13px body.
// The newest dot takes the card's status colour; older ones are grey.
export function LogTimeline({ entries, tone }: { entries: Entry[]; tone: Tone }) {
  if (!entries.length) return <div className="text-[13px] text-muted">Nothing logged yet.</div>;
  return (
    <div className="ml-1.5 flex flex-col border-l border-card-border">
      {entries.map((e, i) => (
        <div key={e.id} className={`relative pl-4 ${i === entries.length - 1 ? "pb-1" : "pb-3.5"}`}>
          <Dot tone={i === 0 ? tone : "off"} size={7} className="absolute -left-1 top-[5px]" />
          <div className="flex items-center gap-2 font-mono text-[11px] text-muted">
            <span>{e.created_at ? dayLabel(e.created_at) : ""}</span>
            {e.source !== "manual" && <span className="rounded px-1.5 py-px bg-button text-sub">{e.source}</span>}
          </div>
          <div className="mt-[3px] text-[13px] leading-[1.45]">{e.body}</div>
        </div>
      ))}
    </div>
  );
}
