import Link from "next/link";
import { Card } from "@/components/Card";
import { DecideCard } from "@/components/DecideCard";
import { Header } from "@/components/Header";
import { MonoLabel } from "@/components/MonoLabel";
import { minutesLabel, parseQuestions, parseToday } from "@/lib/brief";
import { dayLabel, localDay, localHour, timeLabel } from "@/lib/format";
import { loadServices } from "@/lib/health";
import { Tick, Warning } from "@/lib/icons";
import { session } from "@/lib/session";
import { toneBg, toneFg, toneOf } from "@/lib/status";

export const dynamic = "force-dynamic";

const greeting = () => {
  const h = localHour();
  return h < 12 ? "Morning, Dan." : h < 18 ? "Afternoon." : "Evening.";
};

export default async function Brief() {
  const { db } = await session();
  const today = localDay();

  // Daily briefs have `today` set; the Sunday review row has it null.
  const [{ data: briefs }, services, { data: cards }] = await Promise.all([
    db.from("briefs").select("*").not("today", "is", null).lte("day", today).order("day", { ascending: false }).limit(1),
    loadServices(db),
    db.from("cards").select("id, slug, name, kind, status"),
  ]);
  const brief = briefs?.[0] ?? null;
  const isToday = brief?.day === today;

  const { data: decisions } = brief
    ? await db.from("decisions").select("question, answer").eq("brief_id", brief.id)
    : { data: [] as { question: string; answer: string }[] };
  const answered = new Map((decisions ?? []).map((d) => [d.question, d.answer]));
  const byId = new Map((cards ?? []).map((c) => [c.id, c]));
  const down = services.filter((s) => s.state === "down" && !s.snoozed);

  const meta = (
    <Link href="/review">
      {dayLabel(new Date())}
      {isToday && brief?.created_at ? ` · ${timeLabel(brief.created_at)}` : ""}
    </Link>
  );

  return (
    <>
      <Header meta={meta} title={greeting()} />
      <div className="flex flex-col gap-3.5 px-gutter pt-1.5">
        {!isToday && (
          <div className="font-mono text-xs text-muted">
            No brief yet{brief ? ` · showing ${dayLabel(brief.day)}` : ""}
          </div>
        )}

        {brief?.yesterday && <p className="py-0.5 text-[15px] leading-normal text-body">{brief.yesterday}</p>}

        {brief && parseToday(brief.today).length > 0 && (
          <div className="flex flex-col gap-2">
            <MonoLabel>Today · one thing each</MonoLabel>
            {parseToday(brief.today).map((t, i) => {
              const card = t.card_id ? byId.get(t.card_id) : undefined;
              const practice = !card || card.kind === "practice";
              const tone = card && !practice ? toneOf(card.status) : "up";
              const href = card && card.kind === "project" ? `/p/${card.slug}` : "/board";
              return (
                <Card key={i} href={href} className="flex items-center gap-3 p-3.5">
                  <span
                    className={`flex size-9 flex-none items-center justify-center rounded-btn font-mono text-xs font-medium ${toneBg[tone]} ${toneFg[tone]}`}
                  >
                    {practice ? <Tick size={18} strokeWidth={2.2} /> : t.minutes ? minutesLabel(t.minutes) : "—"}
                  </span>
                  <div className="flex min-w-0 flex-col gap-0.5">
                    <span className="text-xs text-muted">{practice ? "Practices" : card!.name}</span>
                    <span className="text-[15px] font-medium leading-[1.35]">{t.label}</span>
                  </div>
                </Card>
              );
            })}
          </div>
        )}

        {brief && parseQuestions(brief.questions).length > 0 && (
          <div className="flex flex-col gap-2">
            <MonoLabel>Decide</MonoLabel>
            {parseQuestions(brief.questions).map((q) => {
              const a = answered.get(q.text);
              return (
                <DecideCard
                  key={q.id}
                  briefId={brief.id}
                  question={q}
                  answered={a ? (a.startsWith("voice: ") ? "Answered by voice" : `Answered: ${a}`) : undefined}
                />
              );
            })}
          </div>
        )}

        {down.length > 0 && (
          <Card variant="attn" className="flex items-start gap-3 p-3.5">
            <Warning className="mt-0.5 flex-none text-attn" />
            <div className="text-sm leading-[1.45]">
              <span className="font-semibold text-attn">
                {down.map((s) => s.card.name).join(", ")} {down.length === 1 ? "is" : "are"} down
              </span>
              {" — "}
              {brief?.attention && isToday
                ? brief.attention
                : down
                    .map((s) => `${s.host} returned ${s.latest?.status_code ?? "no response"} at ${timeLabel(s.latest!.checked_at!)}.`)
                    .join(" ")}
            </div>
          </Card>
        )}
      </div>
    </>
  );
}
