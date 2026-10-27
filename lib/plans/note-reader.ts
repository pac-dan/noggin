import Anthropic from "@anthropic-ai/sdk";
import { zodOutputFormat } from "@anthropic-ai/sdk/helpers/zod";
import { z } from "zod";
import type { Item, Settings } from "@/lib/plans/gut-reset";

// Reads Dan's day note and says which gut-reset controls it implies: items he says he did,
// rough day on or off, antibiotics. The caller applies them; nothing here touches the DB.

const Changes = z.object({
  tick: z.array(z.string()),
  rough: z.boolean().nullable(),
  doxy: z.object({ on: z.boolean(), start: z.string().nullable(), days: z.number().int().nullable() }).nullable(),
});
export type NoteChanges = z.infer<typeof Changes>;

const SYSTEM = `You read Dan's note about his day and work out what it means for his gut reset plan.

You get the date, the day's plan items (id, time, title), which are already ticked, whether it's a rough day, the antibiotics setting, and his note. Return:
- tick: ids of items he clearly says he did today ("had my water and the bowl" → water, bowl). Only ids from the list. Never guess from vague lines like "good day".
- rough: true if he says he's travelling, wrecked, sick, on a late shift or otherwise can only manage the basics; false only if he clearly says he's back on track; otherwise null.
- doxy: only if he mentions doxycycline or antibiotics starting, changing or stopping. on = taking it; start = YYYY-MM-DD (resolve "today", "yesterday" from the date given; null if unchanged); days = 14, 21 or 28 if he names a course length ("three weeks" = 21), else null. Otherwise null.

If the note says nothing about the plan, return tick: [] and nulls.`;

export async function readNote(input: {
  day: string;
  items: Item[];
  ticked: string[];
  rough: boolean;
  settings: Settings;
  note: string;
}): Promise<NoteChanges> {
  const client = new Anthropic();
  const res = await client.messages.parse({
    model: "claude-haiku-5-5",
    max_tokens: 1500,
    output_config: { effort: "low", format: zodOutputFormat(Changes) },
    system: SYSTEM,
    messages: [
      {
        role: "user",
        content: JSON.stringify({
          date: input.day,
          items: input.items.map(({ id, t, title }) => ({ id, time: t, title })),
          ticked: input.ticked,
          rough_day: input.rough,
          antibiotics: input.settings,
          note: input.note,
        }),
      },
    ],
  });
  if (res.stop_reason === "refusal" || !res.parsed_output) throw new Error("couldn't read the note");
  const out = res.parsed_output;
  // Keep only real changes, in shapes the plan accepts.
  const ids = new Set(input.items.map((i) => i.id));
  const d = out.doxy;
  const doxyOk = d && (d.start === null || /^\d{4}-\d{2}-\d{2}$/.test(d.start));
  return {
    tick: [...new Set(out.tick)].filter((id) => ids.has(id) && !input.ticked.includes(id)),
    rough: out.rough === input.rough ? null : out.rough,
    doxy: doxyOk ? { on: d.on, start: d.start, days: [14, 21, 28].includes(d.days ?? 0) ? d.days : null } : null,
  };
}
