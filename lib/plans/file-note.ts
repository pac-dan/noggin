import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database, Json } from "@/lib/db.types";
import { addDays, dayLabel } from "@/lib/format";
import { END, PLAN, itemsFor, parseMeals, parseSettings, type Meals, type Settings } from "@/lib/plans/gut-reset";
import { readNote, type WeekMeals } from "@/lib/plans/note-reader";

// Save a gut-reset day note and apply what it implies: ticks, rough day, antibiotics and
// meal swaps. Works with the signed-in client (the app) or the service role (scripts):
// every query names the owner.

type Db = SupabaseClient<Database>;

export type NoteUndo = {
  ticks: string[];
  rough: boolean | null;
  settings: Settings | null;
  meals: { day: string; meals: Meals }[];
};
export type NoteFiled =
  | { ticked: string[]; rough: boolean | null; settings: Settings | null; meals: { day: string; meals: Meals }[]; line: string; undo: NoteUndo }
  | { error: string };

const check = (what: string, e: { message: string } | null) => {
  if (e) throw new Error(`${what}: ${e.message}`);
};

/** The planned breakfast, lunch and dinner for each day, swaps included. */
export function weekFor(days: string[], settings: Settings, mealsOf: Map<string, Meals>): WeekMeals {
  return days.map((d) => {
    const its = itemsFor(d, settings, mealsOf.get(d));
    const note = (id: string) => its.find((i) => i.id === id)?.note ?? "";
    return { day: d, breakfast: note("bowl"), lunch: note("lunch"), dinner: note("dinner").replace(/ Finish 3 hours before bed\.$/, "") };
  });
}

export async function fileNote(db: Db, owner: string, day: string, note: string): Promise<NoteFiled> {
  const { error } = await db.from("plan_days").upsert({ owner, plan: PLAN, day, note: note.trim() || null }, { onConflict: "owner,plan,day" });
  check("save note", error);
  const none: NoteFiled = { ticked: [], rough: null, settings: null, meals: [], line: "", undo: { ticks: [], rough: null, settings: null, meals: [] } };
  if (!note.trim()) return none;

  const weekDays = Array.from({ length: 7 }, (_, i) => addDays(day, i)).filter((d) => d <= END);
  const [{ data: s }, { data: rows }, { data: t }] = await Promise.all([
    db.from("plan_settings").select("settings").eq("owner", owner).eq("plan", PLAN).maybeSingle(),
    db.from("plan_days").select("day, rough, meals").eq("owner", owner).eq("plan", PLAN).in("day", weekDays),
    db.from("plan_ticks").select("item").eq("owner", owner).eq("plan", PLAN).eq("day", day),
  ]);
  const settings = parseSettings(s?.settings);
  const mealsOf = new Map((rows ?? []).map((r) => [r.day, parseMeals(r.meals)]));
  const rough = !!rows?.find((r) => r.day === day)?.rough;
  const items = itemsFor(day, settings, mealsOf.get(day));
  const week = weekFor(weekDays, settings, mealsOf);

  let c;
  try {
    c = await readNote({ day, items, ticked: (t ?? []).map((x) => x.item), rough, settings, week, note });
  } catch {
    return { error: "Note saved. Couldn't read it for plan changes just now, so nothing was changed." };
  }

  const nextSettings =
    c.doxy && (c.doxy.on !== settings.doxy || (c.doxy.start && c.doxy.start !== settings.doxyStart) || (c.doxy.days && c.doxy.days !== settings.doxyDays))
      ? { doxy: c.doxy.on, doxyStart: c.doxy.start ?? settings.doxyStart, doxyDays: c.doxy.days ?? settings.doxyDays }
      : null;
  const mealSwaps = c.meals.map((m) => {
    const prev = mealsOf.get(m.day) ?? {};
    const next: Meals = { ...prev };
    if (m.breakfast) next.breakfast = m.breakfast;
    if (m.lunch) next.lunch = m.lunch;
    if (m.dinner) next.dinner = m.dinner;
    return { day: m.day, prev, next };
  });

  if (c.tick.length) {
    const { error: e } = await db
      .from("plan_ticks")
      .upsert(c.tick.map((item) => ({ owner, plan: PLAN, day, item })), { onConflict: "owner,plan,day,item", ignoreDuplicates: true });
    check("tick", e);
  }
  if (c.rough !== null) {
    const { error: e } = await db.from("plan_days").upsert({ owner, plan: PLAN, day, rough: c.rough }, { onConflict: "owner,plan,day" });
    check("rough day", e);
  }
  if (nextSettings) {
    const { error: e } = await db.from("plan_settings").upsert({ owner, plan: PLAN, settings: nextSettings }, { onConflict: "owner,plan" });
    check("antibiotics", e);
  }
  for (const m of mealSwaps) {
    const { error: e } = await db
      .from("plan_days")
      .upsert({ owner, plan: PLAN, day: m.day, meals: m.next as Json }, { onConflict: "owner,plan,day" });
    check("meals", e);
  }

  const title = (id: string) => items.find((i) => i.id === id)?.title.toLowerCase() ?? id;
  const span = mealSwaps.length
    ? mealSwaps.length === 1
      ? dayLabel(mealSwaps[0].day)
      : `${dayLabel(mealSwaps[0].day)} to ${dayLabel(mealSwaps[mealSwaps.length - 1].day)}`
    : "";
  const parts = [
    c.tick.length && `Ticked ${c.tick.map(title).join(", ")}.`,
    c.rough !== null && (c.rough ? "Switched on rough day." : "Switched off rough day."),
    nextSettings && (nextSettings.doxy ? `Antibiotics on from ${dayLabel(nextSettings.doxyStart)}, ${nextSettings.doxyDays} days.` : "Antibiotics off."),
    mealSwaps.length && `New meals for ${span}.`,
  ].filter(Boolean);

  return {
    ticked: c.tick,
    rough: c.rough,
    settings: nextSettings,
    meals: mealSwaps.map((m) => ({ day: m.day, meals: m.next })),
    line: parts.length ? parts.join(" ") : "Saved. Nothing in that note changes the plan.",
    undo: {
      ticks: c.tick,
      rough: c.rough === null ? null : rough,
      settings: nextSettings ? settings : null,
      meals: mealSwaps.map((m) => ({ day: m.day, meals: m.prev })),
    },
  };
}

export async function undoNote(db: Db, owner: string, day: string, undo: NoteUndo) {
  if (undo.ticks.length) {
    const { error } = await db.from("plan_ticks").delete().eq("owner", owner).eq("plan", PLAN).eq("day", day).in("item", undo.ticks);
    check("untick", error);
  }
  if (undo.rough !== null) {
    const { error } = await db.from("plan_days").upsert({ owner, plan: PLAN, day, rough: undo.rough }, { onConflict: "owner,plan,day" });
    check("rough day", error);
  }
  if (undo.settings) {
    const { error } = await db.from("plan_settings").upsert({ owner, plan: PLAN, settings: undo.settings }, { onConflict: "owner,plan" });
    check("antibiotics", error);
  }
  for (const m of undo.meals) {
    const meals = Object.keys(m.meals).length ? (m.meals as Json) : null;
    const { error } = await db.from("plan_days").upsert({ owner, plan: PLAN, day: m.day, meals }, { onConflict: "owner,plan,day" });
    check("meals", error);
  }
}
