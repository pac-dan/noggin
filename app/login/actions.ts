"use server";

import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";

async function origin() {
  const h = await headers();
  const host = h.get("x-forwarded-host") ?? h.get("host");
  const proto = h.get("x-forwarded-proto") ?? (host?.startsWith("localhost") ? "http" : "https");
  return `${proto}://${host}`;
}

export async function sendLink(email: string): Promise<{ error?: string }> {
  const db = await createClient();
  const { error } = await db.auth.signInWithOtp({
    email,
    options: { emailRedirectTo: `${await origin()}/auth/callback` },
  });
  return error ? { error: error.message } : {};
}

// Installed iPhone apps don't share cookies with Safari, so a tapped link can sign
// in the browser instead of the app. Typing the 6-digit code from the same email
// signs in wherever this page is open.
export async function verifyCode(email: string, token: string): Promise<{ error?: string }> {
  const db = await createClient();
  const { error } = await db.auth.verifyOtp({ email, token, type: "email" });
  if (error) return { error: error.message };
  redirect("/");
}
