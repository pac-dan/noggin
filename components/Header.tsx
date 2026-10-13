import Link from "next/link";
import { Mic, Plus } from "@/lib/icons";

// Screen header: Mono meta line + 30px title, round 44px action top-right (opens Capture).
export function Header({
  meta,
  title,
  action = "mic",
  actionHref = "/capture",
}: {
  meta: React.ReactNode;
  title: string;
  action?: "mic" | "plus" | "none";
  actionHref?: string;
}) {
  return (
    <header className="flex items-end justify-between px-gutter pb-2.5 pt-[max(56px,calc(env(safe-area-inset-top)+12px))]">
      <div className="flex min-w-0 flex-col gap-1">
        <div className="font-mono text-xs uppercase tracking-[0.08em] text-muted">{meta}</div>
        <h1 className="text-[30px] font-semibold leading-[1.1] tracking-[-0.02em]">{title}</h1>
      </div>
      {action !== "none" && (
        <Link
          href={actionHref}
          aria-label={action === "plus" ? "New idea" : "Capture a note"}
          className="flex size-11 flex-none items-center justify-center rounded-full bg-fg text-bg"
        >
          {action === "plus" ? <Plus /> : <Mic />}
        </Link>
      )}
    </header>
  );
}
