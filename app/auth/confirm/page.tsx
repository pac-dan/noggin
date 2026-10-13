import { redirect } from "next/navigation";
import type { EmailOtpType } from "@supabase/supabase-js";
import { createClient } from "@/lib/supabase/server";

// Login links land here instead of signing in on GET: link previews and mail
// scanners fetch links but never press buttons, so they can't burn the one-time token.
async function confirm(form: FormData) {
  "use server";
  const db = await createClient();
  const { error } = await db.auth.verifyOtp({
    token_hash: String(form.get("token_hash")),
    type: String(form.get("type") || "email") as EmailOtpType,
  });
  redirect(error ? "/login?expired=1" : "/");
}

export default async function Confirm({ searchParams }: { searchParams: Promise<{ token_hash?: string; type?: string }> }) {
  const { token_hash, type } = await searchParams;
  return (
    <main className="flex min-h-dvh flex-col gap-6 px-gutter pt-[max(56px,calc(env(safe-area-inset-top)+12px))]">
      <div className="flex flex-col gap-1">
        <div className="label text-xs">Noggin</div>
        <h1 className="text-[30px] font-semibold leading-[1.1] tracking-[-0.02em]">One tap.</h1>
      </div>
      <form action={confirm}>
        <input type="hidden" name="token_hash" value={token_hash ?? ""} />
        <input type="hidden" name="type" value={type ?? "email"} />
        <button className="min-h-12 w-full rounded-btn-lg bg-fg p-[13px] text-sm font-semibold text-bg">Open Noggin</button>
      </form>
    </main>
  );
}
