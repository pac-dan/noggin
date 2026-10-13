"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Bulb, Grid, Pulse, Sun } from "@/lib/icons";

const tabs = [
  { href: "/brief", label: "Brief", Icon: Sun },
  { href: "/board", label: "Board", Icon: Grid },
  { href: "/ideas", label: "Ideas", Icon: Bulb },
  { href: "/live", label: "Live", Icon: Pulse },
];

// 84px bottom tab bar. Active tab fg, others muted. Safe-area aware.
export function TabBar() {
  const path = usePathname();
  return (
    <nav className="fixed bottom-0 left-1/2 z-10 flex min-h-tabbar w-full max-w-[480px] -translate-x-1/2 items-center justify-around border-t border-card-border bg-bg px-3 pb-[max(16px,env(safe-area-inset-bottom))]">
      {tabs.map(({ href, label, Icon }) => (
        <Link
          key={href}
          href={href}
          className={`flex min-h-11 min-w-16 flex-col items-center justify-center gap-1 text-[11px] ${
            path.startsWith(href) ? "text-fg" : "text-muted"
          }`}
        >
          <Icon />
          {label}
        </Link>
      ))}
    </nav>
  );
}
