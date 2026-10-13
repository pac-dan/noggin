import Anthropic from "@anthropic-ai/sdk";
import { zodOutputFormat } from "@anthropic-ai/sdk/helpers/zod";
import type { SupabaseClient } from "@supabase/supabase-js";
import { z } from "zod";
import type { Database } from "@/lib/db.types";
import { addDays, localDay } from "@/lib/format";

// Capture filing (README §7): Claude splits a transcript into filed items, the app applies them.

const Item = z.object({
  type: z.enum(["log", "next_up", "task", "idea", "progress"]),
  card_id: z.string().nullable(),
  body: z.string(),
  progress_delta: z.number().int().nullable(),
  idea: z.object({ itch: z.string(), who: z.string(), why_now: z.string(), done: z.string() }).nullable(),
});
const Filing = z.object({ items: z.array(Item) });
type FiledItem = z.infer<typeof Item>;

/** What the review screen shows, plus what "Fix something" needs to undo it. */
export type Applied = {
  type: FiledItem["type"];
  body: string;
  card_id: string | null;
  card_name: string | null;
  created: { table: "log_entries" | "tasks" | "cards"; id: string } | null;
  prev: { next_up?: string | null; progress?: number | null } | null;
  progress: { from: number; to: number } | null;
};

const SYSTEM = `You file Dan's spoken or typed notes into his personal tracker.

You get the list of his cards (id, name, kind, status, next_up) and a transcript. Return one item per distinct thing said:
- log: something he did or that happened on a card. Set progress_delta (integer percentage points) only if he clearly says the card moved forward meaningfully.
- next_up: the next thing to do on a card (replaces the card's next_up).
- task: an extra to-do on a card that is not the single next thing.
- progress: he states a new progress level for a card without describing work; progress_delta = new minus current.
- idea: anything new that is not about an existing card. Fill idea.itch / who / why_now / done briefly from what he said (empty string if unknown); body is a short name for the idea.

Rules:
- Never invent a card. card_id must be one of the listed ids. If the subject is not a listed card, it is an idea (card_id null).
- Keep bodies terse and in Dan's own words. No preamble, no commentary.
- idea is null unless type is idea. progress_delta is null unless it applies.`;

export async function fileTranscript(
  db: SupabaseClient<Database>,
  owner: string,
  transcript: string,
  opts: { source: "voice" | "manual"; cardHint?: string | null },
): Promise<Applied[]> {
  const { data: cards } = await db.from("cards").select("id, name, kind, status, next_up, progress").neq("status", "archived");
  const known = new Map((cards ?? []).map((c) => [c.id, c]));

  const cardList = (cards ?? []).map(({ id, name, kind, status, next_up }) => ({ id, name, kind, status, next_up }));
  const hint = opts.cardHint && known.has(opts.cardHint) ? { id: opts.cardHint, name: known.get(opts.cardHint)!.name } : null;
  const items = await askClaude(cardList, transcript, hint);

  const applied: Applied[] = [];
  for (const raw of items) {
    // An item pointing at an unknown card becomes an idea, per the contract.
    const item: FiledItem =
      raw.type !== "idea" && (!raw.card_id || !known.has(raw.card_id))
        ? { ...raw, type: "idea", card_id: null, idea: raw.idea ?? { itch: "", who: "", why_now: "", done: "" } }
        : raw;
    applied.push(await apply(db, owner, item, known, opts.source));
  }
  return applied;
}

export type CardBrief = { id: string; name: string; kind: string; status: string; next_up: string | null };

/** The Claude call on its own: card list + transcript in, filed items out. */
export async function askClaude(cards: CardBrief[], transcript: string, hint: { id: string; name: string } | null): Promise<FiledItem[]> {
  const hintLine = hint ? `

This note was started from the card ${hint.id} (${hint.name}); file to it unless he clearly talks about something else.` : "";
  const client = new Anthropic();
  const res = await client.messages.parse({
    model: "claude-haiku-5-5",
    max_tokens: 4000,
    output_config: { effort: "low", format: zodOutputFormat(Filing) },
    system: SYSTEM,
    messages: [{ role: "user", content: `Cards:
${JSON.stringify(cards)}${hintLine}

Transcript:
${transcript}` }],
  });
  if (res.stop_reason === "refusal") throw new Error("Claude declined to file this note");
  return res.parsed_output?.items ?? [];
}

type Known = Map<string, { id: string; name: string; next_up: string | null; progress: number | null }>;

async function apply(db: SupabaseClient<Database>, owner: string, item: FiledItem, known: Known, source: "voice" | "manual"): Promise<Applied> {
  const card = item.card_id ? known.get(item.card_id)! : null;
  const base = { type: item.type, body: item.body, card_id: card?.id ?? null, card_name: card?.name ?? null, created: null, prev: null, progress: null };
  const check = (what: string, e: { message: string } | null) => {
    if (e) throw new Error(`${what}: ${e.message}`);
  };

  const bump = async (delta: number | null) => {
    if (!card || !delta) return null;
    const from = card.progress ?? 0;
    const to = Math.max(0, Math.min(100, from + delta));
    const { error } = await db.from("cards").update({ progress: to }).eq("id", card.id);
    check("update progress", error);
    card.progress = to;
    return { from, to };
  };

  switch (item.type) {
    case "log": {
      const prevProgress = card!.progress;
      const { data, error } = await db
        .from("log_entries")
        .insert({ owner, card_id: card!.id, body: item.body, source, progress_delta: item.progress_delta })
        .select("id")
        .single();
      check("insert log", error);
      const progress = await bump(item.progress_delta);
      return { ...base, created: { table: "log_entries", id: data!.id }, prev: progress ? { progress: prevProgress } : null, progress };
    }
    case "progress": {
      const prevProgress = card!.progress;
      const progress = await bump(item.progress_delta);
      return { ...base, prev: { progress: prevProgress }, progress };
    }
    case "next_up": {
      const prev = { next_up: card!.next_up };
      const { error } = await db.from("cards").update({ next_up: item.body }).eq("id", card!.id);
      check("update next_up", error);
      card!.next_up = item.body;
      return { ...base, prev };
    }
    case "task": {
      const { data, error } = await db.from("tasks").insert({ owner, card_id: card!.id, label: item.body }).select("id").single();
      check("insert task", error);
      return { ...base, created: { table: "tasks", id: data!.id } };
    }
    case "idea": {
      const slug = `${item.body.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "").slice(0, 40) || "idea"}-${Date.now().toString(36)}`;
      const { data, error } = await db
        .from("cards")
        .insert({
          owner,
          kind: "idea",
          status: "planning",
          name: item.body,
          slug,
          idea_itch: item.idea?.itch || null,
          idea_who: item.idea?.who || null,
          idea_why_now: item.idea?.why_now || null,
          idea_done: item.idea?.done || null,
          idea_decide_after: addDays(localDay(), 7),
        })
        .select("id")
        .single();
      check("insert idea", error);
      return { ...base, created: { table: "cards", id: data!.id } };
    }
  }
}

/** Reverse everything a capture filed (used by "Fix something"). */
export async function undoFiled(db: SupabaseClient<Database>, filed: Applied[]) {
  for (const f of [...filed].reverse()) {
    if (f.created) await db.from(f.created.table).delete().eq("id", f.created.id);
    if (f.card_id && f.prev) await db.from("cards").update(f.prev).eq("id", f.card_id);
  }
}
