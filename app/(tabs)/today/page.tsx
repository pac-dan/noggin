import Link from "next/link";
import { Card } from "@/components/Card";
import { Dot } from "@/components/Dot";
import { Header } from "@/components/Header";
import { MonoLabel } from "@/components/MonoLabel";
import { agoShort, dayLabel, daysBetween, localDay, localWeekday } from "@/lib/format";
import { BANSKO, END, PLAN, START, clampDay, parseSettings, phaseOf } from "@/lib/plans/gut-reset";
import { session } from "@/lib/session";
import { toneOf, type Status } from "@/lib/status";
import { TodayPlan } from "./client";

export const dynamic = "force-dynamic";

const ACTIVE = ["planning", "building", "ongoing"] as const;

// Today: the gut reset day plan (ported from the Gut Reset Daily artifact) and every
// active build with the latest thing the feed saw on it.
export default async function TodayPage({ searchParams }: { searchParams: Promise<{ d?: string }> }) {
  const { db } = await session();
  const today = localDay();
  const asked = (await searchParams).d;
  const view = clampDay(asked && /^\d{4}-\d{2}-\d{2}$/.test(asked) ? asked : today);
  const planLive = today <= END;

  const [{ data: settings }, { data: dayRow }, { data: ticks }, { data: checkins }, { data: cards }, { data: activity }, { data: brief }, { data: notes }] =
    await Promise.all([
      db.from("plan_settings").select("settings").eq("plan", PLAN).maybeSingle(),
      db.from("plan_days").select("rough, note").eq("plan", PLAN).eq("day", view).maybeSingle(),
      db.from("plan_ticks").select("item").eq("plan", PLAN).eq("day", view),
      db.from("plan_checkins").select("week, scores").eq("plan", PLAN),
      db.from("cards").select("id, slug, name, status, next_up").eq("kind", "project").in("status", [...ACTIVE]).order("sort"),
      db.from("activity").select("card_id, source, title, happened_at").not("card_id", "is", null).order("happened_at", { ascending: false }).limit(300),
      db.from("briefs").select("day").eq("day", today).maybeSingle(),
      db.from("plan_days").select("day, note").eq("plan", PLAN).not("note", "is", null).order("day", { ascending: false }).limit(60),
    ]);

  const latest = new Map<string, { source: string; title: string; happened_at: string }>();
  for (const a of activity ?? []) if (a.card_id && !latest.has(a.card_id)) latest.set(a.card_id, a);
  const builds = (cards ?? [])
    .map((c) => ({ ...c, last: latest.get(c.id) ?? null }))
    .sort((a, b) => (b.last?.happened_at ?? "").localeCompare(a.last?.happened_at ?? ""));
  const fresh = builds.filter((b) => b.last && daysBetween(localDay(new Date(b.last.happened_at)), today) <= 14);
  const quiet = builds.filter((b) => !fresh.includes(b));

  const ph = phaseOf(view);
  const total = daysBetween(START, END) + 1;
  const n = daysBetween(START, view) + 1;
  const meta = planLive ? `${dayLabel(view)} · Week ${ph?.n} ${ph?.name} · Day ${n} of ${total}` : dayLabel(today);
  const left = daysBetween(today < START ? START : today, BANSKO);

  return (
    <>
      <Header meta={meta} title="Today" />
      <div className="flex flex-col gap-3.5 px-gutter pt-1.5">
        {brief && (
          <Link href={localWeekday() === 0 ? "/review" : "/brief"} className="font-mono text-xs text-muted underline-offset-2 hover:underline">
            {localWeekday() === 0 ? "Sunday review is ready" : "This morning's brief is ready"}
          </Link>
        )}

        {planLive ? (
          <TodayPlan
            key={view}
            view={view}
            today={today}
            settings={parseSettings(settings?.settings)}
            rough={!!dayRow?.rough}
            note={dayRow?.note ?? ""}
            notes={(notes ?? []).map((n) => ({ day: n.day, note: n.note! }))}
            ticks={(ticks ?? []).map((t) => t.item)}
            checkins={Object.fromEntries((checkins ?? []).map((c) => [c.week, c.scores as Record<string, number>]))}
            daysLeft={left}
            builds={
              <Builds fresh={fresh} quiet={quiet} />
            }
          />
        ) : (
          <>
            <p className="text-[15px] text-body">The gut reset finished on 30 November. Bansko time.</p>
            <Builds fresh={fresh} quiet={quiet} />
          </>
        )}

        <Link href="/device" className="self-center py-3 font-mono text-xs text-muted">
          Sign in your phone
        </Link>
      </div>
    </>
  );
}

type Build = { id: string; slug: string; name: string; status: Status; next_up: string | null; last: { source: string; title: string; happened_at: string } | null };

function Builds({ fresh, quiet }: { fresh: Build[]; quiet: Build[] }) {
  return (
    <div className="flex flex-col gap-2">
      <MonoLabel className="pt-1">Builds</MonoLabel>
      {fresh.map((b) => (
        <Card key={b.id} href={`/p/${b.slug}`} className="flex flex-col gap-1.5 p-3.5">
          <div className="flex items-center justify-between gap-2">
            <span className="flex min-w-0 items-center gap-2">
              <Dot tone={toneOf(b.status)} />
              <span className="truncate text-[15px] font-semibold">{b.name}</span>
            </span>
            <span className="whitespace-nowrap font-mono text-[11px] text-muted">
              {b.last!.source === "git" ? "push" : "session"} · {agoShort(b.last!.happened_at)}
            </span>
          </div>
          <div className="text-[13px] leading-[1.4] text-sub">{b.last!.title}</div>
          {b.next_up && <div className="text-[13px] leading-[1.4]">Next: {b.next_up}</div>}
        </Card>
      ))}
      {fresh.length === 0 && <div className="text-[13px] text-muted">Nothing from the feed yet. Sessions and pushes show up here.</div>}
      {quiet.length > 0 && (
        <Card href="/board" variant="shelf" className="px-3.5 py-3 text-[13px] leading-[1.4] text-sub">
          Quiet: {quiet.map((b) => b.name).join(" · ")}
        </Card>
      )}
    </div>
  );
}
