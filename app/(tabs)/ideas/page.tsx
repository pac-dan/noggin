import { Card } from "@/components/Card";
import { Header } from "@/components/Header";
import { daysBetween, localDay } from "@/lib/format";
import { session } from "@/lib/session";
import { IdeaDecide } from "./client";

export const dynamic = "force-dynamic";

const fields = [
  ["The itch", "idea_itch"],
  ["For who", "idea_who"],
  ["Why now", "idea_why_now"],
  ["Done looks like", "idea_done"],
] as const;

export default async function Ideas() {
  const { db } = await session();
  const today = localDay();
  const { data } = await db.from("cards").select("*").eq("kind", "idea").neq("status", "archived").order("created_at");
  const ideas = (data ?? []).map((i) => ({
    ...i,
    ready: !i.idea_decide_after || today >= i.idea_decide_after,
    left: i.idea_decide_after ? daysBetween(today, i.idea_decide_after) : 0,
    age: i.created_at ? daysBetween(localDay(new Date(i.created_at)), today) : 0,
  }));
  const ready = ideas.filter((i) => i.ready).length;

  return (
    <>
      <Header meta={`${ideas.length} ideas · ${ready} ready to decide`} title="Ideas" action="plus" />
      <div className="flex flex-col gap-2.5 px-gutter pt-1.5">
        <p className="pb-1 text-[13px] leading-normal text-muted">
          Ideas sit here for a week before you can promote them. Most should die here. That&apos;s the point.
        </p>
        {ideas.map((i) => (
          <Card key={i.id} className="flex flex-col gap-2.5 p-3.5">
            <div className="flex items-start justify-between gap-2">
              <span className="text-base font-semibold leading-[1.3]">{i.name}</span>
              <span className="whitespace-nowrap font-mono text-[11px] text-muted">{i.age}d</span>
            </div>
            <div className="grid grid-cols-2 gap-x-3 gap-y-1.5 text-xs leading-[1.4]">
              {fields.map(([label, key]) => (
                <div key={key} className="flex flex-col gap-px">
                  <span className="font-mono text-[10px] uppercase text-muted">{label}</span>
                  <span className="text-body">{i[key] ?? "—"}</span>
                </div>
              ))}
            </div>
            {i.ready ? (
              <IdeaDecide cardId={i.id} />
            ) : (
              <div className="font-mono text-[11px] text-muted">
                Decide in {i.left} {i.left === 1 ? "day" : "days"}
              </div>
            )}
          </Card>
        ))}
      </div>
    </>
  );
}
