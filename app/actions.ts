"use server";

import { revalidatePath } from "next/cache";
import { session } from "@/lib/session";
import { addDays, localDay } from "@/lib/format";
import type { Status } from "@/lib/status";
import type { Tables } from "@/lib/db.types";
import { outcomeLine, parseQuestions } from "@/lib/brief";
import { undoFiled, type Applied } from "@/lib/capture";
import { dayLabel } from "@/lib/format";
import { PLAN, itemsFor, parseSettings, type Settings } from "@/lib/plans/gut-reset";
import { readNote } from "@/lib/plans/note-reader";

const fail = (what: string, e: { message: string } | null) => {
  if (e) throw new Error(`${what}: ${e.message}`);
};

export async function toggleTask(id: string, done: boolean) {
  const { db } = await session();
  const { error } = await db.from("tasks").update({ done }).eq("id", id);
  fail("toggle task", error);
  revalidatePath("/p/[slug]", "page");
}

export async function togglePractice(cardId: string, on: boolean) {
  const { db, owner } = await session();
  const day = localDay();
  const { error } = on
    ? await db.from("practice_checks").upsert({ owner, card_id: cardId, day }, { onConflict: "card_id,day", ignoreDuplicates: true })
    : await db.from("practice_checks").delete().eq("card_id", cardId).eq("day", day);
  fail("toggle practice", error);
  revalidatePath("/board");
}

const CYCLE: Status[] = ["building", "live", "shelved"];

export async function cycleStatus(cardId: string, current: Status) {
  const { db } = await session();
  const i = CYCLE.indexOf(current);
  const status = CYCLE[(i + 1) % CYCLE.length]; // anything outside the cycle starts at building
  const { error } = await db.from("cards").update({ status }).eq("id", cardId);
  fail("cycle status", error);
  revalidatePath("/", "layout");
}

export async function saveContext(cardId: string, text: string) {
  const { db } = await session();
  const { error } = await db.from("cards").update({ context_for_claude: text }).eq("id", cardId);
  fail("save context", error);
  revalidatePath("/p/[slug]", "page");
}

export type IdeaAction = "archive" | "keep" | "promote";

// Promote: idea → project card in planning, idea fields copied into summary.
const promoted = (c: Tables<"cards">) => ({
  kind: "project" as const,
  status: "planning" as const,
  summary: c.kind !== "idea" ? c.summary : [
    c.idea_itch && `The itch: ${c.idea_itch}`,
    c.idea_who && `For who: ${c.idea_who}`,
    c.idea_why_now && `Why now: ${c.idea_why_now}`,
    c.idea_done && `Done looks like: ${c.idea_done}`,
  ]
    .filter(Boolean)
    .join("\n"),
});

export async function decideIdea(cardId: string, action: IdeaAction) {
  const { db } = await session();
  const { data: c, error: readErr } = await db.from("cards").select("*").eq("id", cardId).single();
  fail("read idea", readErr);
  if (!c) return;

  const update =
    action === "archive"
      ? { status: "archived" as const }
      : action === "keep"
        ? { idea_decide_after: addDays([c.idea_decide_after ?? "", localDay()].sort().at(-1)!, 7) }
        : promoted(c);
  const { error } = await db.from("cards").update(update).eq("id", cardId);
  fail("decide idea", error);
  // No revalidate: the card stays on screen showing its outcome line; the next visit re-reads.
}

export async function snoozeService(cardId: string, until: string) {
  const { db } = await session();
  const { error } = await db.from("cards").update({ revisit_on: until }).eq("id", cardId);
  fail("snooze", error);
  revalidatePath("/", "layout");
}

export async function confirmCapture(captureId: string) {
  const { db } = await session();
  const { error } = await db.from("captures").update({ status: "filed" }).eq("id", captureId);
  fail("confirm capture", error);
  revalidatePath("/", "layout");
}

export async function fixCapture(captureId: string) {
  const { db } = await session();
  const { data: capture, error } = await db.from("captures").select("filed, transcript").eq("id", captureId).single();
  fail("read capture", error);
  await undoFiled(db, (capture?.filed ?? []) as unknown as Applied[]);
  // A voice answer to a brief question was recorded as a decision with this transcript.
  if (capture) await db.from("decisions").delete().eq("answer", `voice: ${capture.transcript}`);
  const { error: e } = await db.from("captures").update({ status: "fixed" }).eq("id", captureId);
  fail("fix capture", e);
}

// Day plans (Today screen). The client keeps its own optimistic state, so no revalidate.
export async function togglePlanTick(plan: string, day: string, item: string, on: boolean) {
  const { db, owner } = await session();
  const { error } = on
    ? await db.from("plan_ticks").upsert({ owner, plan, day, item }, { onConflict: "owner,plan,day,item", ignoreDuplicates: true })
    : await db.from("plan_ticks").delete().eq("plan", plan).eq("day", day).eq("item", item);
  fail("toggle plan item", error);
}

export async function setRoughDay(plan: string, day: string, rough: boolean) {
  const { db, owner } = await session();
  const { error } = await db.from("plan_days").upsert({ owner, plan, day, rough }, { onConflict: "owner,plan,day" });
  fail("rough day", error);
}

export async function saveDayNote(plan: string, day: string, note: string) {
  const { db, owner } = await session();
  const { error } = await db.from("plan_days").upsert({ owner, plan, day, note: note.trim() || null }, { onConflict: "owner,plan,day" });
  fail("save note", error);
}

export type NoteUndo = { ticks: string[]; rough: boolean | null; settings: Settings | null };
export type NoteFiled = {
  ticked: string[];
  rough: boolean | null;
  settings: Settings | null;
  line: string;
  undo: NoteUndo;
} | { error: string };

// Save the gut-reset day note, then let Claude turn it into plan changes (ticks, rough day,
// antibiotics) and apply them. The note is saved even if reading it fails.
export async function fileDayNote(day: string, note: string): Promise<NoteFiled> {
  const { db } = await session();
  await saveDayNote(PLAN, day, note);
  if (!note.trim()) return { ticked: [], rough: null, settings: null, line: "", undo: { ticks: [], rough: null, settings: null } };

  const [{ data: s }, { data: d }, { data: t }] = await Promise.all([
    db.from("plan_settings").select("settings").eq("plan", PLAN).maybeSingle(),
    db.from("plan_days").select("rough").eq("plan", PLAN).eq("day", day).maybeSingle(),
    db.from("plan_ticks").select("item").eq("plan", PLAN).eq("day", day),
  ]);
  const settings = parseSettings(s?.settings);
  const rough = !!d?.rough;
  const items = itemsFor(day, settings);

  let c;
  try {
    c = await readNote({ day, items, ticked: (t ?? []).map((x) => x.item), rough, settings, note });
  } catch {
    return { error: "Note saved. Couldn't read it for plan changes just now." };
  }

  const nextSettings =
    c.doxy && (c.doxy.on !== settings.doxy || (c.doxy.start && c.doxy.start !== settings.doxyStart) || (c.doxy.days && c.doxy.days !== settings.doxyDays))
      ? { doxy: c.doxy.on, doxyStart: c.doxy.start ?? settings.doxyStart, doxyDays: c.doxy.days ?? settings.doxyDays }
      : null;

  for (const item of c.tick) await togglePlanTick(PLAN, day, item, true);
  if (c.rough !== null) await setRoughDay(PLAN, day, c.rough);
  if (nextSettings) await savePlanSettings(PLAN, nextSettings);

  const title = (id: string) => items.find((i) => i.id === id)?.title.toLowerCase() ?? id;
  const parts = [
    c.tick.length && `Ticked ${c.tick.map(title).join(", ")}.`,
    c.rough !== null && (c.rough ? "Switched on rough day." : "Switched off rough day."),
    nextSettings &&
      (nextSettings.doxy ? `Antibiotics on from ${dayLabel(nextSettings.doxyStart)}, ${nextSettings.doxyDays} days.` : "Antibiotics off."),
  ].filter(Boolean);

  return {
    ticked: c.tick,
    rough: c.rough,
    settings: nextSettings,
    line: parts.join(" "),
    undo: { ticks: c.tick, rough: c.rough === null ? null : rough, settings: nextSettings ? settings : null },
  };
}

export async function undoDayNote(day: string, undo: NoteUndo) {
  for (const item of undo.ticks) await togglePlanTick(PLAN, day, item, false);
  if (undo.rough !== null) await setRoughDay(PLAN, day, undo.rough);
  if (undo.settings) await savePlanSettings(PLAN, undo.settings);
}

export async function savePlanCheckin(plan: string, week: number, scores: Record<string, number>) {
  const { db, owner } = await session();
  const { error } = await db.from("plan_checkins").upsert({ owner, plan, week, scores }, { onConflict: "owner,plan,week" });
  fail("save check-in", error);
}

export async function savePlanSettings(plan: string, settings: Record<string, string | number | boolean>) {
  const { db, owner } = await session();
  const { error } = await db.from("plan_settings").upsert({ owner, plan, settings }, { onConflict: "owner,plan" });
  fail("save plan settings", error);
  revalidatePath("/today");
}

// Brief / review question: write the decision, apply its action to the card, return the confirmation line.
export async function answerQuestion(briefId: string, questionId: string, optionIndex: number): Promise<string> {
  const { db, owner } = await session();
  const { data: brief, error } = await db.from("briefs").select("id, questions").eq("id", briefId).single();
  fail("read brief", error);
  const q = parseQuestions(brief!.questions).find((x) => x.id === questionId);
  const option = q?.options[optionIndex];
  if (!q || !option) throw new Error("question not found");

  const { data: card } = q.card_id ? await db.from("cards").select("*").eq("id", q.card_id).maybeSingle() : { data: null };
  const [verb, ...rest] = option.action.split(":");
  const arg = rest.join(":");

  if (card) {
    const update =
      verb === "shelve"
        ? { status: "shelved" as const, revisit_on: arg || null }
        : verb === "revisit"
          ? { revisit_on: arg || null }
          : verb === "promote"
            ? promoted(card)
            : verb === "archive"
              ? { status: "archived" as const }
              : null;
    if (update) {
      const { error: e } = await db.from("cards").update(update).eq("id", card.id);
      fail("apply decision", e);
    }
    if (verb === "note" && arg) {
      const { error: e } = await db.from("log_entries").insert({ owner, card_id: card.id, body: arg, source: "manual" });
      fail("note", e);
    }
  }

  const { error: e } = await db.from("decisions").insert({ owner, brief_id: briefId, card_id: q.card_id, question: q.text, answer: option.label });
  fail("insert decision", e);
  return outcomeLine(option.action, option.label, card?.name ?? null);
}
