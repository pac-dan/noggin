import { Card } from "@/components/Card";
import { Dot } from "@/components/Dot";
import { Header } from "@/components/Header";
import { MonoLabel } from "@/components/MonoLabel";
import { Pill } from "@/components/Pill";
import { PracticeTile } from "@/components/PracticeTile";
import { ProgressBar } from "@/components/ProgressBar";
import { ago, daysBetween, localDay } from "@/lib/format";
import { Chevron } from "@/lib/icons";
import { session } from "@/lib/session";
import { toneOf } from "@/lib/status";

export const dynamic = "force-dynamic";

function streakLabel(current: number | null, lastDay: string | null, today: string) {
  if (current) return `${current}d`;
  if (!lastDay) return "new";
  const gap = daysBetween(lastDay, today);
  return gap < 7 ? new Date(`${lastDay}T12:00:00Z`).toLocaleString("en-GB", { weekday: "short", timeZone: "UTC" }) : `${gap}d ago`;
}

export default async function Board() {
  const { db } = await session();
  const today = localDay();

  const [{ data: cards }, { data: logs }, { data: checks }, { data: streaks }] = await Promise.all([
    db.from("cards").select("id, kind, status, name, slug, next_up, progress").in("kind", ["project", "practice"]).order("sort"),
    db.from("log_entries").select("card_id, created_at").order("created_at", { ascending: false }).limit(1000),
    db.from("practice_checks").select("card_id").eq("day", today),
    db.from("v_practice_streaks").select("card_id, current_streak, last_day"),
  ]);

  const all = cards ?? [];
  const active = all.filter((c) => c.kind === "project" && ["planning", "building", "ongoing"].includes(c.status));
  const practices = all.filter((c) => c.kind === "practice" && c.status !== "archived");
  const shelved = all.filter((c) => c.kind === "project" && c.status === "shelved");

  const lastLog = new Map<string, string>();
  for (const l of logs ?? []) if (!lastLog.has(l.card_id) && l.created_at) lastLog.set(l.card_id, l.created_at);
  const checked = new Set((checks ?? []).map((c) => c.card_id));
  const streakOf = new Map((streaks ?? []).map((s) => [s.card_id, s]));

  return (
    <>
      <Header meta={`${active.length} active · ${practices.length} practices · ${shelved.length} shelved`} title="Board" />
      <div className="flex flex-col gap-2.5 px-gutter pt-1.5">
        <MonoLabel className="pt-1">Active</MonoLabel>
        {active.map((c) => {
          const tone = toneOf(c.status);
          return (
            <Card key={c.id} href={`/p/${c.slug}`} className="flex flex-col gap-2.5 p-4">
              <div className="flex items-center justify-between gap-2">
                <span className="text-[17px] font-semibold">{c.name}</span>
                <Pill tone={tone}>{c.status}</Pill>
              </div>
              {c.next_up && (
                <div className="flex items-start gap-2 text-sm leading-[1.4]">
                  <Dot tone={tone} className="mt-[7px]" />
                  <span>{c.next_up}</span>
                </div>
              )}
              <div className="flex items-center justify-between gap-3">
                <ProgressBar pct={c.progress ?? 0} tone={tone} />
                <span className="whitespace-nowrap font-mono text-[11px] text-muted">{ago(lastLog.get(c.id))}</span>
              </div>
            </Card>
          );
        })}

        <MonoLabel className="pt-3.5">Practices · today</MonoLabel>
        <div className="grid grid-cols-3 gap-2">
          {practices.map((p) => {
            const s = streakOf.get(p.id);
            return (
              <PracticeTile
                key={p.id}
                cardId={p.id}
                name={p.name}
                on={checked.has(p.id)}
                streak={streakLabel(s?.current_streak ?? null, s?.last_day ?? null, today)}
              />
            );
          })}
        </div>

        {shelved.length > 0 && (
          <>
            <MonoLabel className="pt-3.5">Shelf</MonoLabel>
            <Card href="/live#shelf" variant="shelf" className="flex items-center justify-between gap-3 px-3.5 py-3 text-sub">
              <span className="text-[13px] leading-[1.4]">{shelved.map((c) => c.name).join(" · ")}</span>
              <Chevron className="flex-none" />
            </Card>
          </>
        )}
      </div>
    </>
  );
}
