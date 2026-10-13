import { createClient } from "@supabase/supabase-js";
import type { Database } from "@/lib/db.types";

// Service-role client. Bypasses RLS: server-only (cron, seed). Never import from client code.
export function createAdminClient() {
  return createClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { persistSession: false, autoRefreshToken: false } },
  );
}
