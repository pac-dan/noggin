"use client";

// Screen-local: the three idea decisions, replaced by a green outcome line once taken.

import { useState, useTransition } from "react";
import { decideIdea, type IdeaAction } from "@/app/actions";

const outcomes: Record<IdeaAction, string> = {
  archive: "Let go — archived",
  keep: "Kept — decide again in 7 days",
  promote: "Promoted — now a project card",
};

const btn = "min-h-11 flex-1 basis-0 rounded-btn p-2.5 text-[13px] disabled:opacity-50";

export function IdeaDecide({ cardId }: { cardId: string }) {
  const [done, setDone] = useState<IdeaAction>();
  const [pending, start] = useTransition();

  const act = (a: IdeaAction) =>
    start(async () => {
      await decideIdea(cardId, a);
      setDone(a);
    });

  if (done) return <div className="fade font-mono text-[11px] text-up">{outcomes[done]}</div>;
  return (
    <div className="flex gap-2">
      <button disabled={pending} onClick={() => act("archive")} className={`${btn} border border-button-border bg-button font-medium text-sub`}>
        Let it go
      </button>
      <button disabled={pending} onClick={() => act("keep")} className={`${btn} border border-button-border bg-button font-medium text-fg`}>
        Keep a week
      </button>
      <button disabled={pending} onClick={() => act("promote")} className={`${btn} bg-fg font-semibold text-bg`}>
        Promote
      </button>
    </div>
  );
}
