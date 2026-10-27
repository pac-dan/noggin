// Dates are Dan's local time (Ireland). The server runs in UTC, so every "today",
// greeting and weekday check goes through this zone.
export const TZ = "Europe/Dublin";

const parts = (d: Date, opts: Intl.DateTimeFormatOptions) =>
  Object.fromEntries(new Intl.DateTimeFormat("en-GB", { timeZone: TZ, ...opts }).formatToParts(d).map((p) => [p.type, p.value]));

/** YYYY-MM-DD in Dan's zone. */
export function localDay(d = new Date()): string {
  const p = parts(d, { year: "numeric", month: "2-digit", day: "2-digit" });
  return `${p.year}-${p.month}-${p.day}`;
}

export function localHour(d = new Date()): number {
  return Number(parts(d, { hour: "2-digit", hourCycle: "h23" }).hour);
}

/** 0 = Sunday … 6 = Saturday, in Dan's zone. */
export function localWeekday(d = new Date()): number {
  const w = parts(d, { weekday: "short" }).weekday;
  return ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"].indexOf(w);
}

/** "Mon 12 Oct" */
export function dayLabel(d: Date | string): string {
  const date = typeof d === "string" ? new Date(d.length === 10 ? `${d}T12:00:00Z` : d) : d;
  const p = parts(date, { weekday: "short", day: "numeric", month: "short" });
  return `${p.weekday} ${p.day} ${p.month}`;
}

/** "06:30" */
export function timeLabel(d: Date | string): string {
  const p = parts(typeof d === "string" ? new Date(d) : d, { hour: "2-digit", minute: "2-digit", hourCycle: "h23" });
  return `${p.hour}:${p.minute}`;
}

/** "Dec" from a YYYY-MM-DD */
export function monthLabel(day: string): string {
  return new Date(`${day}T12:00:00Z`).toLocaleString("en-GB", { month: "short", timeZone: "UTC" });
}

/** Whole days from a to b (YYYY-MM-DD strings). */
export function daysBetween(a: string, b: string): number {
  return Math.round((Date.parse(`${b}T00:00:00Z`) - Date.parse(`${a}T00:00:00Z`)) / 86_400_000);
}

export function addDays(day: string, n: number): string {
  const d = new Date(`${day}T12:00:00Z`);
  d.setUTCDate(d.getUTCDate() + n);
  return d.toISOString().slice(0, 10);
}

/** "today", "yesterday", "3 days", "2 wks" — time since a timestamp. */
export function ago(ts: string | null | undefined): string {
  if (!ts) return "no log";
  const n = daysBetween(localDay(new Date(ts)), localDay());
  if (n <= 0) return "today";
  if (n === 1) return "yesterday";
  if (n < 14) return `${n} days`;
  return `${Math.floor(n / 7)} wks`;
}

/** "12m", "3h", then ago(): finer-grained, for the live feed. */
export function agoShort(ts: string | null | undefined): string {
  if (!ts) return "";
  const min = Math.round((Date.now() - Date.parse(ts)) / 60_000);
  if (min < 1) return "now";
  if (min < 60) return `${min}m`;
  if (min < 24 * 60) return `${Math.floor(min / 60)}h`;
  return ago(ts);
}

/** "since Jul" from a timestamp. */
export function sinceLabel(ts: string | null): string {
  if (!ts) return "";
  return `since ${new Date(ts).toLocaleString("en-GB", { month: "short", timeZone: TZ })}`;
}

export function hostOf(url: string | null | undefined): string {
  if (!url) return "";
  try {
    return new URL(url).host.replace(/^www\./, "");
  } catch {
    return url;
  }
}
