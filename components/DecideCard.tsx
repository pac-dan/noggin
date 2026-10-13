"use client";

import Link from "next/link";
import { useState, useTransition } from "react";
import { answerQuestion } from "@/app/actions";
import type { Question } from "@/lib/brief";
import { Mic, Tick } from "@/lib/icons";

// A brief/review question: text + option buttons (each a server action), or a voice answer.
// Once answered, the buttons give way to a green Mono confirmation line.
export function DecideCard({
  briefId,
  question,
  prefix = "",
  answered,
  compact = false,
  voice = false,
}: {
  briefId: string;
  question: Question;
  prefix?: string;
  answered?: string;
  compact?: boolean;
  voice?: boolean; // offer "Answer by voice" even when there are options (Sunday review)
}) {
  const [outcome, setOutcome] = useState(answered);
  const [pending, start] = useTransition();
  const voiceLink = (
    <Link
      href={`/capture?brief_id=${briefId}&question_id=${encodeURIComponent(question.id)}`}
      className="flex min-h-11 items-center justify-center gap-2 rounded-btn border border-button-border bg-button p-2.5 text-[13px]"
    >
      <Mic size={14} />
      Answer by voice
    </Link>
  );
  const btn = `min-h-11 flex-1 basis-0 rounded-btn border border-button-border bg-button text-fg disabled:opacity-50 ${
    compact ? "p-2.5 text-[13px]" : "p-[11px] text-sm font-medium"
  }`;

  return (
    <div className={`flex flex-col rounded-card border border-card-border bg-card p-3.5 ${compact ? "gap-2.5" : "gap-3"}`}>
      <div className="text-sm leading-[1.45]">
        {prefix}
        {question.text}
      </div>
      {outcome ? (
        <div className="fade flex items-center gap-2 font-mono text-xs text-up">
          <Tick />
          <span>{outcome}</span>
        </div>
      ) : question.options.length ? (
        <>
          <div className="flex gap-2">
            {question.options.map((o, i) => (
              <button
                key={i}
                disabled={pending}
                onClick={() => start(async () => setOutcome(await answerQuestion(briefId, question.id, i)))}
                className={btn}
              >
                {o.label}
              </button>
            ))}
          </div>
          {voice && voiceLink}
        </>
      ) : (
        voiceLink
      )}
    </div>
  );
}
