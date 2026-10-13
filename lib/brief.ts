import type { Json } from "@/lib/db.types";
import { dayLabel } from "@/lib/format";

// Shapes of briefs.today / briefs.questions as Claude writes them (CLAUDE_CONTRACT.md).
export type TodayItem = { card_id: string | null; label: string; minutes: number | null };
export type Option = { label: string; action: string };
export type Question = { id: string; card_id: string | null; text: string; options: Option[] };

const isObj = (x: Json): x is { [k: string]: Json | undefined } => !!x && typeof x === "object" && !Array.isArray(x);

export function parseToday(j: Json | null): TodayItem[] {
  if (!Array.isArray(j)) return [];
  return j.filter(isObj).map((t) => ({
    card_id: typeof t.card_id === "string" ? t.card_id : null,
    label: String(t.label ?? ""),
    minutes: typeof t.minutes === "number" ? t.minutes : null,
  }));
}

export function parseQuestions(j: Json | null): Question[] {
  if (!Array.isArray(j)) return [];
  return j.filter(isObj).map((q, i) => ({
    id: String(q.id ?? i),
    card_id: typeof q.card_id === "string" ? q.card_id : null,
    text: String(q.text ?? ""),
    options: Array.isArray(q.options)
      ? q.options.filter(isObj).map((o) => ({ label: String(o.label ?? ""), action: String(o.action ?? "keep") }))
      : [],
  }));
}

/** "3h", "1h", "20m", "1h30" */
export function minutesLabel(m: number): string {
  if (m < 60) return `${m}m`;
  const h = Math.floor(m / 60);
  const rest = m % 60;
  return rest ? `${h}h${rest}` : `${h}h`;
}

/** The green confirmation line shown after a decision. */
export function outcomeLine(action: string, label: string, cardName: string | null): string {
  const [verb, ...restParts] = action.split(":");
  const arg = restParts.join(":");
  const date = /^\d{4}-\d{2}-\d{2}$/.test(arg) ? `${dayLabel(arg).slice(4)} ${arg.slice(0, 4)}` : arg;
  switch (verb) {
    case "keep":
      return `${label} — kept as is`;
    case "shelve":
      return `Shelved — revisit ${date}`;
    case "revisit":
      return `Revisit on ${date}`;
    case "promote":
      return "Promoted — now a project card";
    case "archive":
      return "Archived";
    case "note":
      return cardName ? `Noted on ${cardName}` : "Noted";
    default:
      return label;
  }
}
