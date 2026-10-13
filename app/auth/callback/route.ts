import { NextResponse, type NextRequest } from "next/server";
import type { EmailOtpType } from "@supabase/supabase-js";
import { createClient } from "@/lib/supabase/server";

// Magic-link landing. Handles both the PKCE `code` flow and a `token_hash` template link.
export async function GET(request: NextRequest) {
  const url = request.nextUrl;
  const code = url.searchParams.get("code");
  const tokenHash = url.searchParams.get("token_hash");
  const type = (url.searchParams.get("type") ?? "email") as EmailOtpType;
  const db = await createClient();

  const { error } = code
    ? await db.auth.exchangeCodeForSession(code)
    : tokenHash
      ? await db.auth.verifyOtp({ token_hash: tokenHash, type })
      : { error: new Error("missing code") };

  return NextResponse.redirect(new URL(error ? "/login" : "/", url.origin));
}
