"use client";

import { useState, useTransition } from "react";
import { sendLink, verifyCode } from "./actions";

const input =
  "min-h-12 w-full rounded-btn-lg border border-card-border bg-card px-3.5 py-[13px] text-sm text-fg placeholder:text-muted";
const primary = "min-h-12 w-full rounded-btn-lg bg-fg p-[13px] text-sm font-semibold text-bg disabled:opacity-50";

export default function Login() {
  const [email, setEmail] = useState("");
  const [code, setCode] = useState("");
  const [sent, setSent] = useState(false);
  const [error, setError] = useState<string>();
  const [pending, start] = useTransition();

  const send = () =>
    start(async () => {
      const r = await sendLink(email.trim());
      setError(r.error);
      if (!r.error) setSent(true);
    });

  const verify = () =>
    start(async () => {
      const r = await verifyCode(email.trim(), code.trim());
      if (r?.error) setError(r.error);
    });

  return (
    <main className="flex min-h-dvh flex-col gap-6 px-gutter pt-[max(56px,calc(env(safe-area-inset-top)+12px))]">
      <div className="flex flex-col gap-1">
        <div className="label text-xs">Noggin</div>
        <h1 className="text-[30px] font-semibold leading-[1.1] tracking-[-0.02em]">Sign in.</h1>
      </div>

      {!sent ? (
        <form
          className="flex flex-col gap-3"
          onSubmit={(e) => {
            e.preventDefault();
            send();
          }}
        >
          <label className="flex flex-col gap-1.5 text-xs text-muted">
            Email
            <input className={input} type="email" required autoComplete="email" value={email} onChange={(e) => setEmail(e.target.value)} />
          </label>
          <button className={primary} disabled={pending || !email}>
            Send magic link
          </button>
          {/* A code shown on an already signed-in device (/device): no email needed. */}
          <button type="button" className="min-h-11 text-sm text-muted disabled:opacity-50" disabled={!email} onClick={() => setSent(true)}>
            I have a code
          </button>
        </form>
      ) : (
        <form
          className="flex flex-col gap-3"
          onSubmit={(e) => {
            e.preventDefault();
            verify();
          }}
        >
          <p className="text-sm text-body">Type the code from the email to {email}, or the one Noggin shows on your laptop.</p>
          <label className="flex flex-col gap-1.5 text-xs text-muted">
            Code
            <input
              className={`${input} font-mono tracking-[0.2em]`}
              inputMode="numeric"
              autoComplete="one-time-code"
              value={code}
              onChange={(e) => setCode(e.target.value)}
            />
          </label>
          <button className={primary} disabled={pending || code.length < 6}>
            Sign in
          </button>
          <button type="button" className="min-h-11 text-sm text-muted" onClick={() => setSent(false)}>
            Use a different email
          </button>
        </form>
      )}

      {error && <p className="font-mono text-xs text-attn">{error}</p>}
    </main>
  );
}
