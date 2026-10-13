import { NextResponse, type NextRequest } from "next/server";
import { createClient } from "@/lib/supabase/server";

// Magic-link landing.
// - `token_hash` links go to /auth/confirm, which signs in only on a button press
//   (link previews were spending the one-time token before Dan's browser got it).
// - `code` (PKCE) links are bound to the browser that asked for them, so exchange directly.
export async function GET(request: NextRequest) {
  const url = request.nextUrl;
  const tokenHash = url.searchParams.get("token_hash");
  if (tokenHash) {
    const next = new URL("/auth/confirm", url.origin);
    next.searchParams.set("token_hash", tokenHash);
    next.searchParams.set("type", url.searchParams.get("type") ?? "email");
    return NextResponse.redirect(next);
  }

  const code = url.searchParams.get("code");
  const db = await createClient();
  const { error } = code ? await db.auth.exchangeCodeForSession(code) : { error: new Error("missing code") };
  const signedIn = !error || !!(await db.auth.getUser()).data.user;
  return NextResponse.redirect(new URL(signedIn ? "/" : "/login", url.origin));
}
