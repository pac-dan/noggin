"use client";

import { useOptimistic, useTransition } from "react";
import { togglePractice } from "@/app/actions";
import { Tick } from "@/lib/icons";

// 76px tile: 22px ring that fills green with a tick when today is checked. Tap toggles.
export function PracticeTile({ cardId, name, streak, on }: { cardId: string; name: string; streak: string; on: boolean }) {
  const [shown, setShown] = useOptimistic(on);
  const [, start] = useTransition();

  const toggle = () =>
    start(async () => {
      setShown(!shown);
      await togglePractice(cardId, !shown);
    });

  return (
    <button
      onClick={toggle}
      aria-pressed={shown}
      aria-label={name}
      className={`fade flex min-h-[76px] flex-col items-center justify-center gap-1.5 rounded-btn-lg border px-1.5 py-3 text-fg ${
        shown ? "border-up-border bg-up-bg" : "border-card-border bg-card"
      }`}
    >
      <span
        className={`fade flex size-[22px] items-center justify-center rounded-full border-2 ${shown ? "border-up bg-up" : "border-off"}`}
      >
        {shown && <Tick size={12} strokeWidth={3} className="text-bg" />}
      </span>
      <span className="text-center text-xs font-medium leading-[1.2]">{name}</span>
      <span className="font-mono text-[10px] text-muted">{streak}</span>
    </button>
  );
}
