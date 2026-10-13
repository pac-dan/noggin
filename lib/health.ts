import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database, Tables } from "@/lib/db.types";
import { hostOf, localDay } from "@/lib/format";

type Check = Pick<Tables<"health_checks">, "card_id" | "checked_at" | "ok" | "status_code" | "latency_ms">;

export type ServiceState = {
  card: Tables<"cards">;
  state: "up" | "down" | "off";
  latest: Check | null;
  uptime: number | null; // % over 30 days
  downSince: string | null;
  snoozed: boolean; // revisit_on in the future: hidden from the brief
  host: string; // provider (summary) or URL host
};

// Every service card with its latest health check, 30-day uptime and outage start.
export async function loadServices(db: SupabaseClient<Database>): Promise<ServiceState[]> {
  const since = new Date(Date.now() - 30 * 86_400_000).toISOString();
  const [{ data: cards }, { data: checks }] = await Promise.all([
    db.from("cards").select("*").eq("kind", "service").neq("status", "archived").order("sort"),
    db
      .from("health_checks")
      .select("card_id, checked_at, ok, status_code, latency_ms")
      .gte("checked_at", since)
      .order("checked_at", { ascending: false }),
  ]);

  const today = localDay();
  return (cards ?? []).map((card) => {
    const mine = (checks ?? []).filter((c) => c.card_id === card.id);
    const latest = card.health_url ? (mine[0] ?? null) : null;
    let downSince: string | null = null;
    if (latest && !latest.ok) {
      for (const c of mine) {
        if (c.ok) break;
        downSince = c.checked_at;
      }
    }
    return {
      card,
      latest,
      state: !latest ? "off" : latest.ok ? "up" : "down",
      uptime: mine.length ? Math.round((mine.filter((c) => c.ok).length / mine.length) * 1000) / 10 : null,
      downSince,
      snoozed: !!card.revisit_on && card.revisit_on > today,
      host: card.summary || hostOf(card.health_url),
    };
  });
}
