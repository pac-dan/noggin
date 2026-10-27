import { NextResponse, type NextRequest } from "next/server";
import { firstLine, normaliseKey, record } from "@/lib/feed";
import { createAdminClient } from "@/lib/supabase/admin";

export const dynamic = "force-dynamic";

// Claude Code Stop hook (~/.claude/hooks/noggin-feed.mjs), Bearer INGEST_SECRET.
// Body: { session_id, project, text } — project is the folder under dan_file, text the
// session's latest closing message. One activity row per session, refreshed each turn.
export async function POST(request: NextRequest) {
  const secret = process.env.INGEST_SECRET;
  if (!secret || request.headers.get("authorization") !== `Bearer ${secret}`) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  const body = (await request.json().catch(() => null)) as { session_id?: string; project?: string; text?: string } | null;
  const text = body?.text?.trim();
  if (!body?.session_id || !text) return NextResponse.json({ error: "session_id and text are required" }, { status: 400 });

  try {
    const { card } = await record(createAdminClient(), {
      source: "claude",
      ref: body.session_id,
      key: normaliseKey(body.project),
      title: firstLine(text),
      body: text,
    });
    return NextResponse.json({ ok: true, card: card?.name ?? null });
  } catch (e) {
    return NextResponse.json({ error: (e as Error).message }, { status: 500 });
  }
}
