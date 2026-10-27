import { addDays, daysBetween } from "@/lib/format";

// Gut reset, Banna to Bansko. Ported from the Gut Reset Daily artifact
// (claude.ai/artifact/65uK1T7zrYyRn9XsF2gYq2): the schedule lives here, Dan's ticks live in plan_* tables.

export const PLAN = "gut-reset";
export const START = "2026-10-26";
export const END = "2026-11-30";
export const BANSKO = "2026-12-01";

export type Phase = { from: string; to: string; n: number; name: string; focus: string };
export const PHASES: Phase[] = [
  { from: "2026-10-26", to: "2026-11-01", n: 1, name: "Clear", focus: "First worm dose, hygiene routine, gentle food, start the neck routine." },
  { from: "2026-11-02", to: "2026-11-08", n: 2, name: "Settle", focus: "Keep up the hygiene. Kefir up to 250 ml. More cooked veg." },
  { from: "2026-11-09", to: "2026-11-15", n: 3, name: "Second dose", focus: "Second worm dose and hygiene again. Bring in raw veg and full portions of ferments." },
  { from: "2026-11-16", to: "2026-11-22", n: 4, name: "Build", focus: "25+ different plants. Surf neck drill added. Follow up on test results." },
  { from: "2026-11-23", to: "2026-11-30", n: 5, name: "Lock in", focus: "Keep it running. Sort how kefir works in Bansko: bring grains or find live yogurt." },
];

// 0 = Sunday
const MENU: Record<number, { l: string; d: string }> = {
  0: { l: "Light lunch before the cook-up", d: "Fresh roast chicken with roast veg" },
  1: { l: "Chicken, rice, roast veg and sauerkraut", d: "Salmon or mackerel, potatoes, greens" },
  2: { l: "Chicken broth soup with rice and veg", d: "Chicken stir-fry with garlic, ginger, rice and broccoli" },
  3: { l: "Leftover stir-fry", d: "Lentil dal with rice and natural yogurt" },
  4: { l: "Dal, boiled eggs and a side salad", d: "Duck breast, potatoes, asparagus or green beans" },
  5: { l: "Eggs on sourdough with avocado and kimchi", d: "Hake or cod with roast veg and rice" },
  6: { l: "Free: eat out, but pick grilled over fried", d: "Free, or an omelette with veg and sourdough" },
};

export const SCORES = [
  { k: "stools", label: "Stools (10 = formed and easy)" },
  { k: "bloating", label: "Bloating (10 = none)" },
  { k: "itch", label: "Itch (10 = none)" },
  { k: "neck", label: "Neck (10 = no pain)" },
  { k: "energy", label: "Midday energy (10 = great)" },
] as const;

export type Settings = { doxy: boolean; doxyStart: string; doxyDays: number };
export const DEFAULT_SETTINGS: Settings = { doxy: false, doxyStart: START, doxyDays: 21 };

export type Item = {
  id: string;
  t: string; // "07:30"
  title: string;
  note?: string;
  tag?: "hygiene" | "med" | "today";
  anchor?: boolean;
  min?: boolean; // part of the rough-day minimum
  minNote?: string; // replaces note on a rough day
  detail?: string[];
};

export const phaseOf = (day: string) => PHASES.find((p) => day >= p.from && day <= p.to);
export const weekday = (day: string) => new Date(`${day}T12:00:00Z`).getUTCDay();
export const clampDay = (day: string) => (day < START ? START : day > END ? END : day);
export const doxyEnd = (s: Settings) => addDays(s.doxyStart, Number(s.doxyDays) - 1);

function doxyActive(day: string, s: Settings) {
  if (!s.doxy) return false;
  const n = daysBetween(s.doxyStart, day);
  return n >= 0 && n < Number(s.doxyDays);
}

/** Every item scheduled for a day, sorted by time. */
export function itemsFor(day: string, s: Settings): Item[] {
  const dow = weekday(day);
  const ph = phaseOf(day) ?? PHASES[PHASES.length - 1];
  const wk = ph.n;
  const doxy = doxyActive(day, s);
  const hygiene = day >= START && day <= "2026-11-22";
  const doseDay = day === "2026-10-26" || day === "2026-11-09";
  const washDay = hygiene && (doseDay || daysBetween(day < "2026-11-09" ? "2026-10-26" : "2026-11-09", day) % 3 === 0);
  const kefirMl = wk === 1 ? "150 ml" : "250 ml";
  const ferment = wk <= 2 ? "a forkful of sauerkraut or kimchi" : "a proper portion of sauerkraut or kimchi";

  const L: Item[] = [];
  L.push({ id: "water", t: "07:30", title: "Pint of water", note: "Before coffee or your phone.", anchor: true, min: true });
  if (hygiene) L.push({ id: "shower", t: "07:40", title: "Morning shower", note: "Wash around your bum. Threadworm eggs are laid overnight.", tag: "hygiene" });
  if (doxy) L.push({ id: "doxy1", t: "07:50", title: "Doxycycline, morning dose", note: "Full glass of water. Stay upright for 30 minutes. No dairy for 2–3 hours.", tag: "med", min: true });
  if (day === "2026-10-26")
    L.push({
      id: "gp",
      t: "09:00",
      title: "Ring the GP and book today",
      tag: "today",
      detail: [
        "Thigh bite and the photo",
        "Months of tick bites from the dunes",
        "Alpha-gal history: ask for the IgE test and an allergy referral",
        "Ask about an adrenaline pen",
        "Midday tiredness",
        "Mention you're taking mebendazole",
      ],
    });
  L.push({
    id: "bowl",
    t: doxy ? "10:30" : "08:30",
    title: "Gut bowl with kefir",
    note: `${kefirMl} kefir, 40 g oats, banana or berries, flax or chia, pumpkin seeds, grated ginger.${doxy ? " Keep it 2–3 hours after the tablet." : ""}`,
    anchor: true,
    min: true,
  });
  if (doseDay)
    L.push({
      id: "meb",
      t: "11:00",
      title: day === "2026-10-26" ? "Mebendazole, first dose" : "Mebendazole, second dose",
      note: "100 mg. Everyone in the house takes it today. Ask the pharmacist if it contains gelatin.",
      tag: "med",
    });
  if (washDay) L.push({ id: "wash", t: "11:30", title: "Hot wash bedding and towels", note: "60°C. Don't shake them out first. Use your own towel only.", tag: "hygiene" });
  if (dow === 6)
    L.push({
      id: "shop",
      t: "12:00",
      title: "Weekly shop",
      note: "Same list every week, plus one new veg and one new fruit. Restock the emergency press: oats, rice, tinned fish, lentils, eggs, frozen veg.",
    });
  L.push({ id: "lunch", t: "13:00", title: "Lunch", note: `${MENU[dow].l}. Add ${ferment}.` });
  L.push({ id: "snack", t: "16:00", title: "Snack", note: "Fruit, nuts, boiled eggs, or oatcakes with hummus." });
  L.push({
    id: "neck",
    t: "17:30",
    title: "Neck and mobility, 10 min",
    anchor: true,
    note: wk >= 4 ? "Includes the surf drill this week." : "After the sauna is ideal.",
    detail: [
      "Chin tucks lying down: lift head 1 cm, hold 10 s × 8",
      "Slow neck turns, 10 each side",
      "Prone cobra: chin tucked, thumbs up, hold 20 s × 5",
      "Thoracic extension over a foam roller or towel, 10 reps",
      "Upper trap and levator stretch, 30 s each side",
      ...(wk >= 4 ? ["Surf drill: paddle position on a bench, head up, chin tucked, turn slowly left and right, 3 × 30 s"] : []),
    ],
    minNote: "Rough day: 2 minutes of chin tucks is enough.",
    min: true,
  });
  if (dow === 1 || dow === 3 || dow === 5)
    L.push({
      id: "gymneck",
      t: "17:45",
      title: "Gym: add the neck block",
      detail: ["Band pull-aparts 3 × 15", "Face pulls 3 × 12", "Prone Y-T-W raises 2 × 8 each", "Chest-supported rows 3 × 10", "Dead hangs 3 × 20–30 s"],
    });
  L.push({ id: "sauna", t: "18:00", title: "After sauna: water with a pinch of salt", note: "Never sauna on an empty, dehydrated gut." });
  if (dow === 0)
    L.push({
      id: "cook",
      t: "17:00",
      title: "Sunday cook-up",
      detail: ["Roast a whole chicken or 8 thighs", "Pot of rice", "Tray of roast veg: carrot, courgette, peppers, red onion, sweet potato", "Broth from the bones"],
    });
  if (dow === 3) L.push({ id: "cook", t: "17:00", title: "Wednesday cook-up", detail: ["Lentil dal with ginger, turmeric and spinach", "Second tray of roast veg", "6 boiled eggs"] });
  if (doxy) L.push({ id: "doxy2", t: "18:45", title: "Doxycycline, evening dose", note: "Before dinner, with a full glass of water. Keep evening kefir well away.", tag: "med", min: true });
  L.push({
    id: "dinner",
    t: "19:00",
    title: "Dinner",
    note: `${MENU[dow].d}. Finish 3 hours before bed.`,
    anchor: true,
    min: true,
    minNote: "Rough day: one proper meal with protein and something green.",
  });
  L.push({ id: "ticks", t: "21:30", title: "Tick check, then shower", note: "Backs of knees, groin, waistband. Remove any tick with fine tweezers close to the skin." });
  L.push({ id: "tea", t: "21:45", title: "Ginger or peppermint tea" });
  if (hygiene) L.push({ id: "clothes", t: "22:30", title: "Clean boxers and clothes to bed", tag: "hygiene" });
  if (dow === 0) L.push({ id: "checkin", t: "21:00", title: "Sunday check-in", note: "Two minutes. It's at the bottom of this page." });
  L.push({ id: "bed", t: "23:30", title: "In bed by midnight", note: "Aim for 7.5 to 8 hours. Your gut repairs overnight.", anchor: true });
  L.sort((a, b) => a.t.localeCompare(b.t));
  return L;
}

/** What the day shows: the rough-day minimum, or everything. */
export const visibleItems = (day: string, s: Settings, rough: boolean) => {
  const all = itemsFor(day, s);
  return rough ? all.filter((i) => i.min) : all;
};

/** Banners for a day, in the artifact's wording. */
export function bannersFor(day: string, today: string, s: Settings): { text: string; lead: string; special: boolean }[] {
  const ph = phaseOf(day);
  const b: { text: string; lead: string; special: boolean }[] = [];
  if (today < START && day === START) b.push({ lead: "Starts tomorrow.", text: "Here's Monday so you know what's coming.", special: true });
  if (day === "2026-10-26") b.push({ lead: "Big day.", text: "GP visit, first threadworm dose for the whole house, and the bedding goes on a hot wash.", special: true });
  if (day === "2026-11-09") b.push({ lead: "Second dose today.", text: "Everyone in the house again, plus a hot wash.", special: true });
  if (ph && day === ph.from) b.push({ lead: `Week ${ph.n}: ${ph.name}.`, text: ph.focus, special: false });
  if (s.doxy && day === doxyEnd(s)) b.push({ lead: "Last antibiotic day.", text: "Keep the sunscreen on for a few more days.", special: false });
  return b;
}

export const parseSettings = (j: unknown): Settings => {
  const o = (j && typeof j === "object" ? j : {}) as Partial<Settings>;
  return {
    doxy: !!o.doxy,
    doxyStart: typeof o.doxyStart === "string" ? o.doxyStart : DEFAULT_SETTINGS.doxyStart,
    doxyDays: Number(o.doxyDays) || DEFAULT_SETTINGS.doxyDays,
  };
};
