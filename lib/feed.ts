import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/lib/db.types";

// The feed: work events from outside the app (Claude Code sessions, GitHub pushes)
// land in `activity`, tied to a card by its aliases. Writes run with the service role,
// so every row is stamped with Dan's id (NOGGIN_OWNER_ID).

type Db = SupabaseClient<Database>;

export const ownerId = () => {
  const id = process.env.NOGGIN_OWNER_ID;
  if (!id) throw new Error("NOGGIN_OWNER_ID is not set");
  return id;
};

/** Folders that are never projects of their own. */
const IGNORE = new Set([".claude", "docs", "secrets", "secs", "node_modules", "sideprojects"]);

/** "sales-arena.worktrees" → "sales-arena"; ignored folders → null. */
export function normaliseKey(raw: string | null | undefined): string | null {
  const key = (raw ?? "").trim().toLowerCase().replace(/\.worktrees$/, "");
  if (!key || IGNORE.has(key) || !/^[a-z0-9._-]+$/.test(key)) return null;
  return key;
}

const titleCase = (key: string) => {
  const words = key.replace(/[-_.]+/g, " ").trim();
  return words.charAt(0).toUpperCase() + words.slice(1);
};

/** The card a project key belongs to. Unknown keys get a new project card. */
export async function cardForKey(db: Db, owner: string, key: string): Promise<{ id: string; name: string }> {
  const { data: hit, error } = await db.from("cards").select("id, name").eq("owner", owner).contains("aliases", [key]).neq("status", "archived").limit(1).maybeSingle();
  if (error) throw new Error(`find card: ${error.message}`);
  if (hit) return hit;

  const { data: made, error: e } = await db
    .from("cards")
    .insert({ owner, kind: "project", status: "building", name: titleCase(key), slug: `${key}-${Date.now().toString(36)}`, aliases: [key], progress: 0 })
    .select("id, name")
    .single();
  if (e) throw new Error(`new card: ${e.message}`);
  return made;
}

export type Event = {
  source: "git" | "claude";
  ref: string;
  key: string | null;
  title: string;
  body: string | null;
  happened_at?: string;
};

/** Upsert one event. A Claude session keeps one row (same ref), refreshed every turn. */
export async function record(db: Db, ev: Event) {
  const owner = ownerId();
  const card = ev.key ? await cardForKey(db, owner, ev.key) : null;
  const { error } = await db.from("activity").upsert(
    {
      owner,
      card_id: card?.id ?? null,
      source: ev.source,
      ref: ev.ref,
      project_key: ev.key,
      title: ev.title.slice(0, 200),
      body: ev.body?.slice(0, 2000) ?? null,
      happened_at: ev.happened_at ?? new Date().toISOString(),
    },
    { onConflict: "source,ref" },
  );
  if (error) throw new Error(`record activity: ${error.message}`);
  return { card };
}

/** First sentence or line of a block of text, for a title. */
export function firstLine(text: string, max = 140): string {
  const line = text.replace(/[#*`>_]/g, "").split(/\n/).map((l) => l.trim()).find(Boolean) ?? "";
  const sentence = line.match(/^.+?[.!?](\s|$)/)?.[0].trim() ?? line;
  return sentence.length > max ? `${sentence.slice(0, max - 1)}…` : sentence;
}
