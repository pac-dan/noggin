import { createClient } from "@/lib/supabase/server";

// Step 1 placeholder: proves the app can reach the database.
export default async function Home() {
  const db = await createClient();
  const { error } = await db.from("cards").select("id", { head: true, count: "exact" });
  return (
    <main className="p-gutter pt-14">
      <div className="label">Noggin · step 1</div>
      <h1 className="text-[30px] font-semibold tracking-[-0.02em]">Scaffold</h1>
      <p className="text-sub">{error ? `DB error: ${error.message}` : "Database reachable."}</p>
    </main>
  );
}
