import { NextResponse, type NextRequest } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

// Vercel cron, every 6h. GET each service card's health_url (10s timeout), record the result.
export async function GET(request: NextRequest) {
  if (request.headers.get("authorization") !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  const db = createAdminClient();
  const { data: services, error } = await db
    .from("cards")
    .select("id, owner, name, health_url")
    .eq("kind", "service")
    .neq("status", "archived")
    .not("health_url", "is", null);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  const results = await Promise.all(
    (services ?? []).map(async (s) => {
      const t0 = Date.now();
      let ok = false;
      let status_code: number | null = null;
      try {
        const res = await fetch(s.health_url!, { signal: AbortSignal.timeout(10_000), redirect: "follow", cache: "no-store" });
        status_code = res.status;
        ok = res.ok;
      } catch {
        // timeout or network failure: ok stays false, no status code
      }
      return { owner: s.owner, card_id: s.id, ok, status_code, latency_ms: Date.now() - t0 };
    }),
  );

  if (results.length) {
    const { error: insertErr } = await db.from("health_checks").insert(results);
    if (insertErr) return NextResponse.json({ error: insertErr.message }, { status: 500 });
  }
  return NextResponse.json({ checked: results.length, down: results.filter((r) => !r.ok).length });
}
