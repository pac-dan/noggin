// Seeds Dan's cards (README §8). Run once after the first magic-link login:
//   npm run seed -- <auth user id>
// Idempotent on slug: re-running updates the same rows instead of duplicating them.
import { createAdminClient } from "../lib/supabase/admin";
import type { TablesInsert } from "../lib/db.types";

type CardSeed = Omit<TablesInsert<"cards">, "owner" | "slug">;

const slugify = (s: string) =>
  s.toLowerCase().replace(/&/g, "and").replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");

const inDays = (n: number) => {
  const d = new Date();
  d.setDate(d.getDate() + n);
  return d.toISOString().slice(0, 10);
};

const projects: CardSeed[] = [
  {
    kind: "project", status: "building", name: "Sales Arena", progress: 70,
    people: ["Kevin"],
    links: [{ label: "sales1v1.com", url: "https://sales1v1.com" }],
    next_up: "Stripe checkout live on PRO CARD",
    context_for_claude:
      "Competitive sales training; free 1v1 battles, paid PRO CARD. Next.js + Supabase (RLS, claim_ai_session security-definer) + Stripe hosted Checkout. Esports branding deliberate. Kevin owns sales brain + marketing. No org tier until 50 paying users. Rejected: Electron widget (old Salesy).",
  },
  {
    kind: "project", status: "planning", name: "Voice AI for businesses", progress: 15,
    people: ["Kevin"], next_up: "Pick one niche, build the demo agent",
  },
  { kind: "project", status: "building", name: "Irish phrase app", progress: 30, next_up: "Test Irish speech-to-text options" },
  { kind: "project", status: "ongoing", name: "Ginger bug sodas", next_up: "New bug, try a 4th flavour" },
];

const shelved: CardSeed[] = [
  // summary = the shelf note shown on /live (wording from the Live artboard).
  ["Adventure tours", "2026-12-01", "Go / no-go for summer 2027"],
  ["Fermentation app", "2027-01-05", "Blueprint done; after Sales Arena ships"],
  ["Project Orion", "2027-01-05", "Multi-bot crypto, paused"],
  ["Momentum Digital", "2027-01-05", "Restaurant sites, Kevin + Eoghan"],
  ["Garden", "2027-02-01", "Beds and seed order"],
  ["Nature-economy mission", "2027-03-01", "Thinking only"],
].map(([name, revisit_on, summary]) => ({ kind: "project", status: "shelved", name, revisit_on, summary }));

const practices: CardSeed[] = ["Gym / surf", "Guitar", "Irish", "Skate", "Ferments", "Garden"].map((name) => ({
  kind: "practice",
  status: "ongoing",
  name,
}));

const services: CardSeed[] = [
  {
    kind: "service", status: "live", name: "sales1v1.com", summary: "Vercel", health_url: "https://sales1v1.com",
    links: [{ label: "sales1v1.com", url: "https://sales1v1.com" }],
  },
  // summary = hosting provider, shown on /live. whiterabbit health_url TBC.
  { kind: "service", status: "live", name: "whiterabbit / Momentum Clips", summary: "Render", links: [{ label: "Render", url: "https://dashboard.render.com" }] },
  { kind: "service", status: "live", name: "Project Orion bot" },
];

const decideAfter = inDays(7);
const ideas: CardSeed[] = [
  // Field wording from the Ideas artboard: terse, Dan's voice.
  { name: "Cheap bass", idea_itch: "Want to learn bass", idea_who: "Me", idea_why_now: "Guitar is sticking", idea_done: "Bass in the house" },
  { name: "Kimchi from Irish cabbage", idea_itch: "Local-ingredient ferment", idea_who: "Soda customers", idea_why_now: "Winter cabbage soon", idea_done: "One good batch" },
  { name: "Mountain Leader award", idea_itch: "Legit lead hikes", idea_who: "Tours business", idea_why_now: "Needed before summer 27", idea_done: "Booked on a course" },
  { name: "Sea moss harvest run", idea_itch: "Have the spots mapped", idea_who: "Shop vision", idea_why_now: "Spring tides", idea_done: "First dried batch" },
].map((i) => ({ ...i, kind: "idea", status: "planning", idea_decide_after: decideAfter }));

async function main() {
  const owner = process.argv[2];
  if (!owner || !/^[0-9a-f-]{36}$/i.test(owner)) {
    console.error("usage: npm run seed -- <auth user id>");
    process.exit(1);
  }
  const db = createAdminClient();

  const all = [...projects, ...shelved, ...practices, ...services, ...ideas];
  // Slugs are globally unique; "Garden" is both a shelved project and a practice.
  const seen = new Set<string>();
  const rows: TablesInsert<"cards">[] = all.map((c, i) => {
    let slug = slugify(c.name);
    if (seen.has(slug)) slug = `${slug}-${c.kind}`;
    seen.add(slug);
    return { ...c, owner, slug, sort: i };
  });
  const { data, error } = await db.from("cards").upsert(rows, { onConflict: "slug" }).select("id, slug, next_up, kind, status");
  if (error) throw new Error(`cards upsert failed: ${error.message}`);

  // One open task per active project, mirroring next_up, so the Project screen's checklist isn't empty.
  const active = data.filter((c) => c.kind === "project" && c.status !== "shelved" && c.next_up);
  for (const c of active) {
    const { count } = await db.from("tasks").select("*", { count: "exact", head: true }).eq("card_id", c.id);
    if (count) continue;
    const { error: e } = await db.from("tasks").insert({ owner, card_id: c.id, label: c.next_up! });
    if (e) throw new Error(`task insert failed for ${c.slug}: ${e.message}`);
  }

  console.log(`seeded ${data.length} cards, tasks for ${active.length} active projects`);
}

main().catch((e) => {
  console.error(e.message);
  process.exit(1);
});
