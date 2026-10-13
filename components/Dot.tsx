import { toneFill, type Tone } from "@/lib/status";

// Round status dot. 6px on next-up lines, 7px on the log timeline, 10px on Live rows.
export function Dot({ tone, size = 6, className = "" }: { tone: Tone; size?: 6 | 7 | 10; className?: string }) {
  const s = size === 10 ? "size-2.5" : size === 7 ? "size-[7px]" : "size-1.5";
  return <span aria-hidden="true" className={`block flex-none rounded-full ${s} ${toneFill[tone]} ${className}`} />;
}
