// Proves the service-role connection and that the 0001 schema is present.
// Usage: npm run db:check
import { createAdminClient } from "../lib/supabase/admin";

async function main() {
  const db = createAdminClient();
  const { count, error } = await db.from("cards").select("*", { count: "exact", head: true });
  if (error) throw new Error(`cards query failed: ${error.message}`);
  console.log(`connected · select count(*) from cards = ${count}`);
}

main().catch((e) => {
  console.error(e.message);
  process.exit(1);
});
