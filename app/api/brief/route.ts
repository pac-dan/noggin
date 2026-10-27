import { NextResponse, type NextRequest } from "next/server";
import { writeBrief } from "@/lib/brief-gen";
import { ownerId } from "@/lib/feed";
import { localDay } from "@/lib/format";
import { createAdminClient } from "@/lib/supabase/admin";

export const dynamic = "force-dynamic";
export const maxDuration = 120;

// Vercel cron, 06:30 UTC. Writes today's brief (Sunday: the review) once; ?force=1 rewrites it.
export async function GET(request: NextRequest) {
  const secret = process.env.CRON_SECRET;
  if (!secret || request.headers.get("authorization") !== `Bearer ${secret}`) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  const db = createAdminClient();
  const owner = ownerId();
  const day = localDay();
  if (request.nextUrl.searchParams.get("force") !== "1") {
    const { data } = await db.from("briefs").select("id").eq("owner", owner).eq("day", day).maybeSingle();
    if (data) return NextResponse.json({ skipped: "brief already written", day });
  }

  try {
    return NextResponse.json(await writeBrief(db, owner, day));
  } catch (e) {
    return NextResponse.json({ error: (e as Error).message }, { status: 500 });
  }
}
