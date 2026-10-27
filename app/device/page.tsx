"use client";

import Link from "next/link";
import { useState, useTransition } from "react";
import { Back } from "@/lib/icons";
import { deviceCode } from "./actions";

const primary = "min-h-12 w-full rounded-btn-lg bg-fg p-[13px] text-sm font-semibold text-bg disabled:opacity-50";

// Sign in another device without an email: this (signed-in) device shows a one-time
// code, the other device types it on the login page.
export default function Device() {
  const [result, setResult] = useState<{ email: string; code: string } | null>(null);
  const [error, setError] = useState<string>();
  const [pending, start] = useTransition();

  const make = () =>
    start(async () => {
      const r = await deviceCode();
      if ("error" in r) setError(r.error);
      else {
        setError(undefined);
        setResult(r);
      }
    });

  return (
    <main className="flex min-h-dvh flex-col gap-6 px-gutter pt-[max(56px,calc(env(safe-area-inset-top)+12px))]">
      <Link href="/today" aria-label="Back" className="flex size-11 items-center justify-center rounded-full bg-button">
        <Back />
      </Link>
      <div className="flex flex-col gap-1">
        <div className="label text-xs">Noggin</div>
        <h1 className="text-[30px] font-semibold leading-[1.1] tracking-[-0.02em]">Sign in your phone.</h1>
      </div>

      {result ? (
        <div className="flex flex-col gap-4">
          <div className="rounded-card border border-card-border bg-card p-5 text-center">
            <div className="font-mono text-[40px] font-medium tracking-[0.25em]">{result.code}</div>
          </div>
          <ol className="list-decimal pl-5 text-sm leading-[1.6] text-body">
            <li>On your phone, open Noggin from the home-screen icon.</li>
            <li>Type {result.email} and tap "I have a code".</li>
            <li>Type the code above. It works once, for the next hour.</li>
          </ol>
          <button className="min-h-11 text-sm text-muted" onClick={make} disabled={pending}>
            Make a new code
          </button>
        </div>
      ) : (
        <div className="flex flex-col gap-3">
          <p className="text-sm text-body">This shows a one-time code. Type it on your phone instead of waiting for an email.</p>
          <button className={primary} onClick={make} disabled={pending}>
            Show a code
          </button>
        </div>
      )}

      {error && <p className="font-mono text-xs text-attn">{error}</p>}
    </main>
  );
}
