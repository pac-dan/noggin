import Link from "next/link";
import { DecideCard } from "@/components/DecideCard";
import { MonoLabel } from "@/components/MonoLabel";
import { parseQuestions } from "@/lib/brief";
import { addDays, dayLabel, localDay, localWeekday } from "@/lib/format";
import { session } from "@/lib/session";

export const dynamic = "force-dynamic";

function isoWeek(day: string): number {
  const d = new Date(`${day}T12:00:00Z`);
  const thursday = new Date(d);
  thursday.setUTCDate(d.getUTCDate() + 3 - ((d.getUTCDay() + 6) % 7));
  const jan4 = new Date(Date.UTC(thursday.getUTCFullYear(), 0, 4));
  return 1 + Math.round(((thursday.getTime() - jan4.getTime()) / 86_400_000 - 3 + ((jan4.getUTCDay() + 6) % 7)) / 7);
}

export default async function Review() {
  const { db } = await session();
  const today = localDay();
  const lastSunday = addDays(today, -localWeekday());

  // The review row: the Sunday brief, written with `today` null.
  const { data: rows } = await db
    .from("briefs")
    .select("*")
    .is("today", null)
    .lte("day", today)
    .order("day", { ascending: false })
    .limit(1);
  const review = rows?.[0] ?? null;
  const end = review?.day ?? lastSunday;
  const start = addDays(end, -6);
  const from = `${start}T00:00:00Z`;
  const to = `${addDays(end, 1)}T00:00:00Z`;

  const [{ data: projects }, { data: logs }, { count: letGo }, { data: practices }, { data: checks }, { data: decisions }] = await Promise.all([
    db.from("cards").select("id, name").eq("kind", "project").in("status", ["planning", "building", "ongoing"]).order("sort").limit(1),
    db.from("log_entries").select("card_id, progress_delta").gte("created_at", from).lt("created_at", to),
    db.from("cards").select("id", { count: "exact", head: true }).eq("kind", "idea").eq("status", "archived").gte("updated_at", from).lt("updated_at", to),
    db.from("cards").select("id, name").eq("kind", "practice").neq("status", "archived").order("sort"),
    db.from("practice_checks").select("card_id, day").gte("day", start).lte("day", end),
    review ? db.from("decisions").select("question, answer").eq("brief_id", review.id) : Promise.resolve({ data: [] as { question: string; answer: string }[] }),
  ]);

  const top = projects?.[0];
  const delta = (logs ?? []).filter((l) => l.card_id === top?.id).reduce((n, l) => n + (l.progress_delta ?? 0), 0);
  const days = Array.from({ length: 7 }, (_, i) => addDays(start, i));
  const checked = new Set((checks ?? []).map((c) => `${c.card_id}:${c.day}`));
  const answered = new Map((decisions ?? []).map((d) => [d.question, d.answer]));

  const tiles = [
    { value: `${delta >= 0 ? "+" : ""}${delta}`, label: top ? `${top.name} %` : "top project %", color: "text-building" },
    { value: String(logs?.length ?? 0), label: "sessions logged", color: "text-up" },
    { value: String(letGo ?? 0), label: "ideas let go", color: "text-planning" },
  ];

  return (
    <main>
      <header className="flex flex-col gap-1 px-gutter pb-2.5 pt-[max(56px,calc(env(safe-area-inset-top)+12px))]">
        <div className="font-mono text-xs uppercase tracking-[0.08em] text-muted">
          {dayLabel(end)} · week {isoWeek(end)}
        </div>
        <h1 className="text-[30px] font-semibold leading-[1.1] tracking-[-0.02em]">The week.</h1>
      </header>

      <div className="flex flex-col gap-3.5 px-gutter pb-10 pt-1.5">
        {review?.yesterday ? (
          <p className="text-[15px] leading-normal text-body">{review.yesterday}</p>
        ) : (
          <div className="font-mono text-xs text-muted">No review written for this week yet.</div>
        )}

        <div className="grid grid-cols-3 gap-2">
          {tiles.map((t) => (
            <div key={t.label} className="flex flex-col gap-1 rounded-btn-lg border border-card-border bg-card p-3">
              <span className={`font-mono text-[22px] font-medium ${t.color}`}>{t.value}</span>
              <span className="text-[11px] leading-[1.3] text-muted">{t.label}</span>
            </div>
          ))}
        </div>

        <div className="flex flex-col gap-2">
          <MonoLabel>Practices</MonoLabel>
          <div className="flex flex-col gap-2.5 rounded-card border border-card-border bg-card p-3.5">
            {(practices ?? []).map((p) => {
              const bits = days.map((d) => checked.has(`${p.id}:${d}`));
              return (
                <div key={p.id} className="flex items-center gap-2.5">
                  <span className="w-[78px] flex-none text-[13px]">{p.name}</span>
                  <div className="flex flex-auto gap-1">
                    {bits.map((on, i) => (
                      <span key={i} className={`h-[22px] flex-1 basis-0 rounded-[5px] ${on ? "bg-up" : "bg-card-border"}`} />
                    ))}
                  </div>
                  <span className="w-7 flex-none text-right font-mono text-[11px] text-muted">{bits.filter(Boolean).length}/7</span>
                </div>
              );
            })}
            <div className="flex gap-1 pl-[88px] pr-[38px]">
              {["M", "T", "W", "T", "F", "S", "S"].map((d, i) => (
                <span key={i} className="flex-1 basis-0 text-center font-mono text-[9px] text-faint">
                  {d}
                </span>
              ))}
            </div>
          </div>
        </div>

        {review && parseQuestions(review.questions).length > 0 && (
          <div className="flex flex-col gap-2">
            <MonoLabel>Three questions</MonoLabel>
            {parseQuestions(review.questions).map((q, i) => {
              const a = answered.get(q.text);
              return (
                <DecideCard
                  key={q.id}
                  briefId={review.id}
                  question={q}
                  prefix={`${i + 1}. `}
                  compact
                  answered={a ? (a.startsWith("voice: ") ? "Answered by voice" : `Answered: ${a}`) : undefined}
                />
              );
            })}
          </div>
        )}

        <Link href="/brief" className="flex min-h-12 items-center justify-center rounded-btn-lg bg-fg p-3.5 text-sm font-semibold text-bg">
          Set next week
        </Link>
      </div>
    </main>
  );
}
