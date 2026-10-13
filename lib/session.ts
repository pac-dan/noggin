import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";

// The signed-in user plus an RLS-bound client. Every insert sets owner = user.id.
export async function session() {
  const db = await createClient();
  const {
    data: { user },
  } = await db.auth.getUser();
  if (!user) redirect("/login");
  return { db, owner: user.id };
}
