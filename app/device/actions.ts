"use server";

import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";

// A signed-in device makes a one-time sign-in code for another device (the phone).
// generateLink only creates the code, it sends no email, so Supabase's hourly email
// cap doesn't apply. The phone types it into /login like an emailed code.
export async function deviceCode(): Promise<{ email: string; code: string } | { error: string }> {
  const db = await createClient();
  const {
    data: { user },
  } = await db.auth.getUser();
  if (!user?.email) return { error: "Sign in on this device first." };

  const { data, error } = await createAdminClient().auth.admin.generateLink({ type: "magiclink", email: user.email });
  if (error || !data.properties?.email_otp) return { error: error?.message ?? "No code came back. Try again." };
  return { email: user.email, code: data.properties.email_otp };
}
