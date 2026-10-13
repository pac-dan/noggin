"use client";

// Screen-local interactive bits for /p/[slug]: inline context edit and Open in Claude.

import { useState, useTransition } from "react";
import { saveContext } from "@/app/actions";

export function ContextEdit({ cardId, text }: { cardId: string; text: string }) {
  const [editing, setEditing] = useState(false);
  const [value, setValue] = useState(text);
  const [, start] = useTransition();

  const save = () => {
    setEditing(false);
    if (value !== text) start(() => saveContext(cardId, value));
  };

  return editing ? (
    <textarea
      autoFocus
      value={value}
      onChange={(e) => setValue(e.target.value)}
      onBlur={save}
      rows={Math.max(4, Math.ceil(value.length / 40))}
      className="w-full resize-none rounded-btn border border-button-border bg-bg p-2 text-[13px] leading-normal text-body outline-none"
    />
  ) : (
    <button onClick={() => setEditing(true)} className="text-left text-[13px] leading-normal text-body">
      {value || <span className="text-muted">Tap to add context for Claude.</span>}
    </button>
  );
}

export function OpenInClaude({ prompt }: { prompt: string }) {
  const [copied, setCopied] = useState(false);
  const copy = async () => {
    await navigator.clipboard.writeText(prompt);
    setCopied(true);
    setTimeout(() => setCopied(false), 2500);
  };
  return (
    <button
      onClick={copy}
      className="flex min-h-12 flex-1 basis-0 items-center justify-center rounded-btn-lg bg-fg p-[13px] text-sm font-semibold text-bg"
    >
      {copied ? "Copied — paste into Claude" : "Open in Claude"}
    </button>
  );
}
