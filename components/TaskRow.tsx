"use client";

import { useOptimistic, useTransition } from "react";
import { toggleTask } from "@/app/actions";
import { Tick } from "@/lib/icons";

// Checklist row: 20px rounded box; done = green tick, label struck through muted.
export function TaskRow({ id, label, done }: { id: string; label: string; done: boolean }) {
  const [shown, setShown] = useOptimistic(done);
  const [, start] = useTransition();

  const toggle = () =>
    start(async () => {
      setShown(!shown);
      await toggleTask(id, !shown);
    });

  return (
    <button
      onClick={toggle}
      aria-pressed={shown}
      className="flex min-h-12 items-center gap-3 rounded-btn-lg border border-card-border bg-card px-3.5 py-[13px] text-left text-fg"
    >
      <span className={`fade flex size-5 flex-none items-center justify-center rounded-pill border-2 ${shown ? "border-up bg-up" : "border-off"}`}>
        {shown && <Tick size={12} strokeWidth={3} className="text-bg" />}
      </span>
      <span className={`text-sm leading-[1.35] ${shown ? "text-muted line-through" : ""}`}>{label}</span>
    </button>
  );
}
