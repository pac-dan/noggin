"use server";

import { revalidatePath } from "next/cache";
import { session } from "@/lib/session";
import { addDays, localDay } from "@/lib/format";
import type { Status } from "@/lib/status";

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

export async function decideIdea(cardId: string, action: IdeaAction) {
  const { db } = await session();
  const { data: c, error: readErr } = await db.from("cards").select("*").eq("id", cardId).single();
  fail("read idea", readErr);
  if (!c) return;

  const update =
    action === "archive"
      ? { status: "archived" as const }
      : action === "keep"
        ? { idea_decide_after: addDays(c.idea_decide_after ?? localDay(), 7) }
        : {
            kind: "project" as const,
            status: "planning" as const,
            summary: [
              c.idea_itch && `The itch: ${c.idea_itch}`,
              c.idea_who && `For who: ${c.idea_who}`,
              c.idea_why_now && `Why now: ${c.idea_why_now}`,
              c.idea_done && `Done looks like: ${c.idea_done}`,
            ]
              .filter(Boolean)
              .join("\n"),
          };
  const { error } = await db.from("cards").update(update).eq("id", cardId);
  fail("decide idea", error);
  revalidatePath("/", "layout");
}

export async function snoozeService(cardId: string, until: string) {
  const { db } = await session();
  const { error } = await db.from("cards").update({ revisit_on: until }).eq("id", cardId);
  fail("snooze", error);
  revalidatePath("/", "layout");
}
