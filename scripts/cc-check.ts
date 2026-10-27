// Control-center checks (.runs/2026-10-27-control-center). One mode per checklist item.
// Usage: npx tsx --env-file=.env.local scripts/cc-check.ts <schema|plan|ticks|cards|ingest|github|brief>
import { createHmac } from "node:crypto";
import { createAdminClient } from "../lib/supabase/admin";
import { localDay } from "../lib/format";
import { DEFAULT_SETTINGS, itemsFor, visibleItems } from "../lib/plans/gut-reset";

const BASE = process.env.NOGGIN_URL ?? "https://noggin-nu.vercel.app";
const assert = (ok: unknown, what: string) => {
  console.log(`${ok ? "PASS" : "FAIL"}  ${what}`);
  if (!ok) process.exitCode = 1;
};
const db = () => createAdminClient();

const modes: Record<string, () => Promise<void>> = {
  async schema() {
    for (const t of ["activity", "plan_ticks", "plan_days", "plan_checkins", "plan_settings"] as const) {
      const { error, count } = await db().from(t).select("*", { count: "exact", head: true });
      assert(!error, `table ${t} readable (rows=${count ?? "?"})${error ? ` ${error.message}` : ""}`);
    }
    const { error } = await db().from("cards").select("aliases").limit(1);
    assert(!error, `cards.aliases column${error ? ` ${error.message}` : ""}`);
  },

  async plan() {
    const ids = (d: string, s = DEFAULT_SETTINGS) => itemsFor(d, s).map((i) => i.id);
    const mon = ids("2026-10-26");
    console.log("2026-10-26", mon.join(","));
    assert(["gp", "meb", "wash", "shower", "bowl", "gymneck"].every((x) => mon.includes(x)), "Mon 26 Oct: GP, first dose, hot wash, shower, gym neck");
    const sun = ids("2026-11-01");
    console.log("2026-11-01", sun.join(","));
    assert(sun.includes("cook") && sun.includes("checkin") && !sun.includes("gymneck"), "Sun 1 Nov: cook-up + check-in, no gym");
    const n16 = itemsFor("2026-11-16", DEFAULT_SETTINGS).find((i) => i.id === "neck")!;
    assert(n16.detail!.some((d) => d.startsWith("Surf drill")), "Mon 16 Nov (week 4): neck has the surf drill");
    const n23 = ids("2026-11-23");
    assert(!n23.includes("shower") && !n23.includes("clothes"), "Mon 23 Nov: hygiene routine over");
    const doxy = itemsFor("2026-10-28", { doxy: true, doxyStart: "2026-10-26", doxyDays: 21 });
    assert(doxy.some((i) => i.id === "doxy1") && doxy.find((i) => i.id === "bowl")!.t === "10:30", "doxy on: both doses, bowl moves to 10:30");
    const rough = visibleItems("2026-10-27", DEFAULT_SETTINGS, true).map((i) => i.id);
    console.log("rough 2026-10-27", rough.join(","));
    assert(rough.join(",") === "water,bowl,neck,dinner", "rough day = water, bowl, neck, dinner");
  },

  async ticks() {
    const { data, error } = await db().from("plan_ticks").select("day, item").eq("plan", "gut-reset").order("item");
    console.log(JSON.stringify(data));
    assert(!error && ["bowl", "shower", "water"].every((x) => data!.some((t) => t.day === "2026-10-26" && t.item === x)), "26 Oct ticks imported: water, shower, bowl");
  },

  async cards() {
    const { data } = await db().from("cards").select("name, status, aliases").eq("kind", "project").neq("status", "archived").order("name");
    for (const c of data ?? []) console.log(`${c.name} [${c.status}] ${c.aliases.join(",")}`);
    for (const [name, alias] of [["Higgs", "higgs-game_dev"], ["MotionFrame", "motionframe"], ["Kino zombies", "kino-zombies"], ["White Rabbit", "whiterabbit"], ["Noggin", "noggin"], ["Sales Arena", "sales-arena"]]) {
      assert(data?.some((c) => c.name === name && c.aliases.includes(alias)), `${name} has alias ${alias}`);
    }
  },

  async ingest() {
    const ref = `cc-check-${Date.now()}`;
    const post = (auth: string) =>
      fetch(`${BASE}/api/ingest`, {
        method: "POST",
        headers: { "content-type": "application/json", authorization: auth },
        body: JSON.stringify({ session_id: ref, project: "noggin", text: "Check run: ingest wired. Second sentence is detail." }),
      });
    const bad = await post("Bearer wrong");
    assert(bad.status === 401, `bad secret → ${bad.status}`);
    const good = await post(`Bearer ${process.env.INGEST_SECRET}`);
    const body = await good.json();
    console.log(good.status, JSON.stringify(body));
    assert(good.status === 200 && body.card === "Noggin", "ingest → 200, filed to Noggin");
    const { data } = await db().from("activity").select("title, source, card_id").eq("ref", ref).maybeSingle();
    console.log(JSON.stringify(data));
    assert(data?.title === "Check run: ingest wired." && data.source === "claude", "activity row written with first-sentence title");
    await db().from("activity").delete().eq("ref", ref);
  },

  async github() {
    const ref = `cc-check-${Date.now()}`;
    const raw = JSON.stringify({
      ref: "refs/heads/main",
      repository: { name: "noggin" },
      commits: [{ message: "Check run: webhook wired\n\nbody" }],
      head_commit: { id: ref, message: "Check run: webhook wired", timestamp: new Date().toISOString() },
    });
    const sig = (secret: string) => `sha256=${createHmac("sha256", secret).update(raw).digest("hex")}`;
    const post = (s: string) => fetch(`${BASE}/api/github`, { method: "POST", headers: { "content-type": "application/json", "x-github-event": "push", "x-hub-signature-256": s }, body: raw });
    const bad = await post(sig("wrong"));
    assert(bad.status === 401, `bad signature → ${bad.status}`);
    const good = await post(sig(process.env.GITHUB_WEBHOOK_SECRET!));
    const body = await good.json();
    console.log(good.status, JSON.stringify(body));
    assert(good.status === 200 && body.card === "Noggin", "signed push → 200, filed to Noggin");
    const { data } = await db().from("activity").select("title, source").eq("ref", ref).maybeSingle();
    console.log(JSON.stringify(data));
    assert(data?.title === "1 commit to main: Check run: webhook wired", "activity row title");
    await db().from("activity").delete().eq("ref", ref);
  },

  async brief() {
    const res = await fetch(`${BASE}/api/brief?force=1`, { headers: { authorization: `Bearer ${process.env.CRON_SECRET}` } });
    const body = await res.json();
    console.log(res.status, JSON.stringify(body));
    assert(res.status === 200 && !body.error, "brief route → 200");
    const { data } = await db().from("briefs").select("day, yesterday, today, questions, created_at").eq("day", localDay()).maybeSingle();
    console.log(JSON.stringify(data, null, 2));
    assert(data && data.yesterday, `briefs row for ${localDay()} written`);
  },
};

const mode = process.argv[2];
if (!modes[mode]) {
  console.error(`mode must be one of ${Object.keys(modes).join(", ")}`);
  process.exit(2);
}
modes[mode]().catch((e) => {
  console.error(e);
  process.exit(1);
});
