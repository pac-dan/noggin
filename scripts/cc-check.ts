// Control-center checks (.runs/2026-10-27-control-center). One mode per checklist item.
// Usage: npx tsx --env-file=.env.local scripts/cc-check.ts <schema|plan|ticks|cards|ingest|github|brief>
import { createHmac } from "node:crypto";
import { createAdminClient } from "../lib/supabase/admin";
import { localDay } from "../lib/format";
import { DEFAULT_SETTINGS, itemsFor, visibleItems } from "../lib/plans/gut-reset";
import { askBrief, gatherInputs } from "../lib/brief-gen";
import { readNote } from "../lib/plans/note-reader";

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

  async device() {
    // The code is made without an email; the value itself is never printed.
    const { data: u } = await db().auth.admin.getUserById(process.env.NOGGIN_OWNER_ID!);
    const { data, error } = await db().auth.admin.generateLink({ type: "magiclink", email: u.user!.email! });
    assert(!error && /^\d{6,10}$/.test(data.properties?.email_otp ?? ""), `generateLink returns a numeric one-time code (${data.properties?.email_otp?.length ?? 0} digits)${error ? ` ${error.message}` : ""}`);
    const res = await fetch(`${BASE}/device`, { redirect: "manual" });
    assert(res.status === 307 && res.headers.get("location")?.includes("/login"), `/device signed out → ${res.status} ${res.headers.get("location")}`);
    const login = await (await fetch(`${BASE}/login`)).text();
    assert(login.includes("I have a code"), "login page offers 'I have a code'");
  },

  async notes() {
    // The note reader on sample notes (a Claude call; nothing is written).
    const day = "2026-10-27";
    const base = { day, items: itemsFor(day, DEFAULT_SETTINGS), ticked: [] as string[], rough: false, settings: DEFAULT_SETTINGS };
    const a = await readNote({ ...base, note: "Had my pint of water and the gut bowl. Wrecked after a bug last night from something off. GP put me on doxy today for three weeks." });
    console.log("full:", JSON.stringify(a));
    assert(a.tick.includes("water") && a.tick.includes("bowl") && a.tick.length === 2, "ticks water and bowl only");
    assert(a.rough === true, "switches on rough day");
    assert(a.doxy?.on === true && a.doxy.start === day && a.doxy.days === 21, "antibiotics on from today, 21 days");
    const b = await readNote({ ...base, note: "Bit of a bug last night from eating something that was off." });
    console.log("bug:", JSON.stringify(b));
    assert(b.tick.length === 0 && b.doxy === null, "a symptom note ticks nothing and leaves antibiotics alone");
    const c = await readNote({ ...base, ticked: ["water"], note: "Good day, had the water." });
    console.log("already:", JSON.stringify(c));
    assert(c.tick.length === 0 && c.rough === null && c.doxy === null, "nothing new to change → no changes");
  },

  async note() {
    // Uses a throwaway plan name so Dan's gut-reset rows are never touched.
    const owner = process.env.NOGGIN_OWNER_ID!;
    const key = { owner, plan: "cc-check", day: "2026-10-27" };
    await db().from("plan_days").upsert({ ...key, note: "Bit of a bug last night from something off." }, { onConflict: "owner,plan,day" });
    await db().from("plan_days").upsert({ ...key, rough: true }, { onConflict: "owner,plan,day" }); // what the rough-day switch sends
    const { data } = await db().from("plan_days").select("note, rough").match(key).single();
    console.log(JSON.stringify(data));
    assert(data?.note === "Bit of a bug last night from something off." && data.rough === true, "note saved and survives a rough-day toggle");
    await db().from("plan_days").delete().match(key);
  },

  async stale() {
    // Feed the brief Sales Arena's 13 Oct notes and a week of commits that moved past them:
    // it must refresh the notes from the commits, not repeat the old blocker.
    const g = await gatherInputs(db(), process.env.NOGGIN_OWNER_ID!, localDay());
    const sa = g.input.projects.find((p) => p.name === "Sales Arena")!;
    sa.next_up = "Fix the Railway worker deploy (failing since the beta release)";
    sa.context = "Competitive sales training: free 1v1 battles, paid PRO CARD. Site is gated (access codes); /beta takes beta requests. Open: Railway worker deploy failing on the last two main commits; migration 0083 (beta_requests) waiting to be applied; three Codex review findings on /beta.";
    g.input.activity = g.input.activity.filter((a) => a.project === "Sales Arena").slice(-60);
    const out = await askBrief(g);
    const u = out.card_updates.find((x) => x.card_id === sa.id);
    console.log("today:", JSON.stringify(out.today.map((t) => t.label)));
    console.log("update:", JSON.stringify(u, null, 2));
    const said = [out.yesterday, ...out.today.map((t) => t.label), u?.next_up ?? "", u?.context ?? ""].join(" ").toLowerCase();
    assert(u?.context && !/site is gated|takes beta requests/.test(u.context.toLowerCase()), "context rewritten without the old gated-site status");
    assert(!/railway worker deploy (is )?(still )?failing|fix the railway/.test(said), "old Railway blocker not repeated");
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
