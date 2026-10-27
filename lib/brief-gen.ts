import Anthropic from "@anthropic-ai/sdk";
import { zodOutputFormat } from "@anthropic-ai/sdk/helpers/zod";
import type { SupabaseClient } from "@supabase/supabase-js";
import { z } from "zod";
import type { Database, Json } from "@/lib/db.types";
import { addDays, localDay, localWeekday } from "@/lib/format";
import { loadServices } from "@/lib/health";
import { PLAN, END, START, bannersFor, parseSettings, phaseOf, visibleItems } from "@/lib/plans/gut-reset";

// The morning brief, written by the app itself (Vercel cron 06:30 UTC) instead of a
// scheduled Claude task on Dan's PC. Same row shape as CLAUDE_CONTRACT.md. It also
// distils the feed: each project with new activity gets a log line and a fresh next_up.

type Db = SupabaseClient<Database>;

const Option = z.object({ label: z.string(), action: z.string() });
const Brief = z.object({
  yesterday: z.string(),
  today: z.array(z.object({ card_id: z.string().nullable(), label: z.string(), minutes: z.number().int().nullable() })),
  questions: z.array(z.object({ id: z.string(), card_id: z.string().nullable(), text: z.string(), options: z.array(Option) })),
  attention: z.string().nullable(),
  card_updates: z.array(z.object({ card_id: z.string(), log: z.string().nullable(), next_up: z.string().nullable() })),
});
type BriefOut = z.infer<typeof Brief>;

const SYSTEM = `You write Dan's morning brief for Noggin, his phone control center. He juggles many builds plus a 5-week gut reset plan, and his problem is keeping them all moving, not motivation.

You get JSON: his active projects, what happened on them since the last brief (Claude Code sessions and GitHub pushes, raw), his decisions, practice streaks, quiet projects, services that are down, ideas due a decision, and his gut reset progress.

Write:
- yesterday: one short paragraph, plain English, what actually moved and what didn't. Name projects. Include the gut reset in one clause (how many of yesterday's items he ticked). No hype.
- today: "one thing each" — 2 to 5 items. card_id is a project id from the list, label is the single concrete next step in a few words, minutes a realistic block (15–120). Favour projects that moved recently and anything blocking a launch. A practice item has card_id null.
- questions: 0 to 3 decisions only he can make (stale projects to shelve, ideas due, conflicting priorities). options[].action is one of keep, shelve:YYYY-MM-DD, revisit:YYYY-MM-DD, promote, archive, note:<text>. ids "q1", "q2"...
- attention: one sentence if a service is down, else null.
- card_updates: for each project with new activity, log = one terse line of what got done (his words, past tense), next_up = the next concrete step if the activity makes it clear, else null. Only use listed project ids.

Everything he reads is plain sentences: no tags, brackets, labels, markdown or ids in the text.`;

const SUNDAY = `\n\nToday is Sunday: write the weekly review instead. yesterday = the week in one paragraph. today = []. questions = exactly three questions about next week's priorities; a question with options [] is answered by voice.`;

export async function gatherInputs(db: Db, owner: string, day = localDay()) {
  const sunday = localWeekday(new Date(`${day}T12:00:00Z`)) === 0;
  const { data: last } = await db.from("briefs").select("created_at").eq("owner", owner).lt("day", day).order("day", { ascending: false }).limit(1).maybeSingle();
  const since = last?.created_at ?? new Date(Date.now() - 36 * 3_600_000).toISOString();
  const windowStart = sunday ? new Date(Date.now() - 7 * 86_400_000).toISOString() : since;
  const yday = addDays(day, -1);

  const [cards, activity, logs, decisions, streaks, quiet, services, settings, rough, ticks] = await Promise.all([
    db.from("cards").select("id, kind, status, name, summary, next_up, progress, idea_decide_after, revisit_on").eq("owner", owner).neq("status", "archived"),
    db.from("activity").select("card_id, source, title, body, happened_at").eq("owner", owner).gte("happened_at", windowStart).order("happened_at"),
    db.from("log_entries").select("card_id, body, source, created_at").eq("owner", owner).gte("created_at", windowStart).order("created_at"),
    db.from("decisions").select("card_id, question, answer, created_at").eq("owner", owner).gte("created_at", since),
    db.from("v_practice_streaks").select("card_id, current_streak, last_day"),
    db.from("v_quiet_cards").select("id, name").eq("owner", owner),
    loadServices(db),
    db.from("plan_settings").select("settings").eq("owner", owner).eq("plan", PLAN).maybeSingle(),
    db.from("plan_days").select("rough").eq("owner", owner).eq("plan", PLAN).eq("day", yday).maybeSingle(),
    db.from("plan_ticks").select("item").eq("owner", owner).eq("plan", PLAN).eq("day", yday),
  ]);

  const all = cards.data ?? [];
  const name = new Map(all.map((c) => [c.id, c.name]));
  const s = parseSettings(settings.data?.settings);
  const inPlan = yday >= START && yday <= END;
  const planned = inPlan ? visibleItems(yday, s, !!rough.data?.rough) : [];
  const done = new Set((ticks.data ?? []).map((t) => t.item));

  return {
    sunday,
    owner,
    projectIds: new Set(all.filter((c) => c.kind === "project").map((c) => c.id)),
    input: {
      today: day,
      projects: all.filter((c) => c.kind === "project" && ["planning", "building", "ongoing"].includes(c.status)).map(({ id, name, status, progress, next_up, summary }) => ({ id, name, status, progress, next_up, summary })),
      activity: (activity.data ?? []).map((a) => ({ project: a.card_id ? name.get(a.card_id) : null, card_id: a.card_id, source: a.source, at: a.happened_at, title: a.title, detail: a.body?.slice(0, 600) })),
      log: (logs.data ?? []).map((l) => ({ project: name.get(l.card_id), body: l.body, source: l.source })),
      decisions: (decisions.data ?? []).map((d) => ({ question: d.question, answer: d.answer })),
      practices: all.filter((c) => c.kind === "practice").map((c) => ({ name: c.name, streak: (streaks.data ?? []).find((x) => x.card_id === c.id)?.current_streak ?? 0 })),
      quiet_projects: (quiet.data ?? []).map((q) => q.name),
      services_down: services.filter((x) => x.card.owner === owner && x.state === "down" && !x.snoozed).map((x) => ({ service: x.card.name, status_code: x.latest?.status_code ?? null })),
      ideas_due: all.filter((c) => c.kind === "idea" && c.idea_decide_after && c.idea_decide_after <= day).map((c) => ({ id: c.id, name: c.name })),
      shelf_due: all.filter((c) => c.status === "shelved" && c.revisit_on && c.revisit_on <= day).map((c) => ({ id: c.id, name: c.name })),
      gut_reset: inPlan || (day >= START && day <= END)
        ? {
            yesterday: inPlan ? { ticked: planned.filter((i) => done.has(i.id)).length, of: planned.length, rough_day: !!rough.data?.rough, missed: planned.filter((i) => !done.has(i.id)).map((i) => i.title) } : null,
            today_week: phaseOf(day) ? `Week ${phaseOf(day)!.n}: ${phaseOf(day)!.name}` : null,
            today_banners: bannersFor(day, day, s).map((b) => `${b.lead} ${b.text}`),
          }
        : null,
    },
  };
}

export async function writeBrief(db: Db, owner: string, day = localDay()) {
  const g = await gatherInputs(db, owner, day);
  const client = new Anthropic();
  const res = await client.messages.parse({
    model: "claude-sonnet-5-5",
    max_tokens: 6000,
    output_config: { effort: "medium", format: zodOutputFormat(Brief) },
    system: SYSTEM + (g.sunday ? SUNDAY : ""),
    messages: [{ role: "user", content: JSON.stringify(g.input) }],
  });
  if (res.stop_reason === "refusal") throw new Error("Claude declined to write the brief");
  const out: BriefOut | null = res.parsed_output ?? null;
  if (!out) throw new Error(`no brief returned (stop_reason ${res.stop_reason})`);

  const known = (id: string | null) => (id && g.projectIds.has(id) ? id : null);
  const { error } = await db.from("briefs").upsert(
    {
      owner,
      day,
      yesterday: out.yesterday,
      today: g.sunday ? null : (out.today.map((t) => ({ ...t, card_id: known(t.card_id) })) as unknown as Json),
      attention: out.attention,
      questions: out.questions as unknown as Json,
    },
    { onConflict: "day" },
  );
  if (error) throw new Error(`write brief: ${error.message}`);

  let logged = 0;
  let nexts = 0;
  for (const u of out.card_updates) {
    const id = known(u.card_id);
    if (!id) continue;
    if (u.log) {
      const { error: e } = await db.from("log_entries").insert({ owner, card_id: id, body: u.log, source: "claude" });
      if (!e) logged++;
    }
    if (u.next_up) {
      const { error: e } = await db.from("cards").update({ next_up: u.next_up }).eq("id", id);
      if (!e) nexts++;
    }
  }
  return { day, sunday: g.sunday, today: out.today.length, questions: out.questions.length, logged, nexts, activity: g.input.activity.length };
}
