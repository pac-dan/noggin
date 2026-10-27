import { createHmac, timingSafeEqual } from "node:crypto";
import { NextResponse, type NextRequest } from "next/server";
import { normaliseKey, record } from "@/lib/feed";
import { createAdminClient } from "@/lib/supabase/admin";

export const dynamic = "force-dynamic";

type Push = {
  ref?: string;
  repository?: { name?: string };
  commits?: { message?: string }[];
  head_commit?: { id?: string; message?: string; timestamp?: string } | null;
};

const signed = (raw: string, header: string | null, secret: string) => {
  const want = Buffer.from(`sha256=${createHmac("sha256", secret).update(raw).digest("hex")}`);
  const got = Buffer.from(header ?? "");
  return got.length === want.length && timingSafeEqual(got, want);
};

// GitHub push webhook, signed with GITHUB_WEBHOOK_SECRET. One activity row per push (ref = head sha).
export async function POST(request: NextRequest) {
  const secret = process.env.GITHUB_WEBHOOK_SECRET;
  const raw = await request.text();
  if (!secret || !signed(raw, request.headers.get("x-hub-signature-256"), secret)) {
    return NextResponse.json({ error: "bad signature" }, { status: 401 });
  }

  const event = request.headers.get("x-github-event");
  if (event === "ping") return NextResponse.json({ ok: true });
  if (event !== "push") return NextResponse.json({ ignored: event });

  const push = JSON.parse(raw) as Push;
  const head = push.head_commit;
  if (!head?.id) return NextResponse.json({ ignored: "no head commit" }); // branch deleted

  const branch = (push.ref ?? "").replace("refs/heads/", "");
  const subjects = (push.commits ?? []).map((c) => (c.message ?? "").split("\n")[0]).filter(Boolean);
  const n = subjects.length || 1;
  try {
    const { card } = await record(createAdminClient(), {
      source: "git",
      ref: head.id,
      key: normaliseKey(push.repository?.name),
      title: `${n} commit${n === 1 ? "" : "s"} to ${branch}: ${(head.message ?? "").split("\n")[0]}`,
      body: subjects.join("\n"),
      happened_at: head.timestamp,
    });
    return NextResponse.json({ ok: true, card: card?.name ?? null });
  } catch (e) {
    return NextResponse.json({ error: (e as Error).message }, { status: 500 });
  }
}
