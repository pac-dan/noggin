"use client";

import { useRouter } from "next/navigation";
import { Close } from "@/lib/icons";

// Full-screen sheet: round close button, Mono title, scrolling body. Close goes back.
export function Sheet({ title, children }: { title: string; children: React.ReactNode }) {
  const router = useRouter();
  const close = () => (history.length > 1 ? router.back() : router.push("/"));
  return (
    <div className="flex min-h-dvh flex-col">
      <header className="flex items-center justify-between px-gutter pb-2.5 pt-[max(52px,calc(env(safe-area-inset-top)+8px))]">
        <button
          onClick={close}
          aria-label="Close"
          className="flex size-10 items-center justify-center rounded-full border border-card-border bg-card"
        >
          <Close />
        </button>
        <div className="font-mono text-xs uppercase tracking-[0.08em] text-muted">{title}</div>
        <span className="w-10" />
      </header>
      <div className="flex flex-auto flex-col gap-4 px-gutter pb-10 pt-2">{children}</div>
    </div>
  );
}
