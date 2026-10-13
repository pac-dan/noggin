import Link from "next/link";
import { notFound } from "next/navigation";
import { cycleStatus } from "@/app/actions";
import { Card } from "@/components/Card";
import { LogTimeline } from "@/components/LogTimeline";
import { MonoLabel } from "@/components/MonoLabel";
import { Pill } from "@/components/Pill";
import { ProgressBar } from "@/components/ProgressBar";
import { TaskRow } from "@/components/TaskRow";
import { dayLabel, hostOf, sinceLabel } from "@/lib/format";
import { Back, Mic } from "@/lib/icons";
import { session } from "@/lib/session";
import { toneFg, toneOf } from "@/lib/status";
import { ContextEdit, OpenInClaude } from "./client";

export const dynamic = "force-dynamic";

type LinkItem = { label: string; url: string };

export default async function Project({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const { db } = await session();

  const { data: card } = await db.from("cards").select("*").eq("slug", slug).maybeSingle();
  if (!card) notFound();

  const [{ data: tasks }, { data: log }] = await Promise.all([
    db.from("tasks").select("id, label, done").eq("card_id", card.id).order("sort").order("created_at"),
    db.from("log_entries").select("id, body, source, created_at").eq("card_id", card.id).order("created_at", { ascending: false }).limit(50),
  ]);

  const tone = toneOf(card.status);
  const links = (Array.isArray(card.links) ? card.links : []) as LinkItem[];
  const meta = [hostOf(links[0]?.url), (card.people ?? []).join(", "), sinceLabel(card.created_at)].filter(Boolean).join(" · ");
  const openTasks = (tasks ?? []).filter((t) => !t.done);
  const entries = log ?? [];

  const prompt = [
    `Project: ${card.name}`,
    "",
    card.context_for_claude ?? "",
    "",
    `Next up: ${card.next_up ?? ""}`,
    `Open tasks: ${openTasks.map((t) => t.label).join("; ")}`,
    "Recent log:",
    ...entries.slice(0, 3).map((e) => `${e.created_at ? dayLabel(e.created_at) : ""} · ${e.body}`),
  ].join("\n");

  return (
    <main>
      <header className="flex items-center gap-3 px-gutter pb-2.5 pt-[max(52px,calc(env(safe-area-inset-top)+8px))]">
        <Link
          href="/board"
          aria-label="Back to board"
          className="flex size-10 flex-none items-center justify-center rounded-full border border-card-border bg-card"
        >
          <Back />
        </Link>
        <div className="flex min-w-0 flex-auto flex-col gap-0.5">
          <h1 className="text-[22px] font-semibold leading-[1.1]">{card.name}</h1>
          {meta && <div className="font-mono text-[11px] text-muted">{meta}</div>}
        </div>
        <form action={cycleStatus.bind(null, card.id, card.status)}>
          <button className="flex min-h-11 items-center" aria-label={`Status ${card.status}, tap to change`}>
            <Pill tone={tone} className="px-2.5 py-1.5">
              {card.status}
            </Pill>
          </button>
        </form>
      </header>

      <div className="flex flex-col gap-3.5 px-gutter pb-10 pt-1">
        {card.progress != null && (
          <div className="flex flex-col gap-2">
            <div className="label flex justify-between">
              <span>Progress</span>
              <span className={toneFg[tone]}>{card.progress}%</span>
            </div>
            <ProgressBar pct={card.progress} tone={tone} thick />
          </div>
        )}

        <Card className="flex flex-col gap-2 p-3.5">
          <div className="flex items-center justify-between">
            <MonoLabel>Context for Claude</MonoLabel>
            {card.updated_at && <span className="font-mono text-[11px] text-muted">edited {dayLabel(card.updated_at).slice(4)}</span>}
          </div>
          <ContextEdit cardId={card.id} text={card.context_for_claude ?? ""} />
        </Card>

        <div className="flex flex-col gap-2">
          <MonoLabel>Next up</MonoLabel>
          {(tasks ?? []).map((t) => (
            <TaskRow key={t.id} id={t.id} label={t.label} done={!!t.done} />
          ))}
          {!tasks?.length && <div className="text-sm text-body">{card.next_up ?? "Nothing queued."}</div>}
        </div>

        <div className="flex flex-col gap-2">
          <MonoLabel>Log</MonoLabel>
          <LogTimeline entries={entries} tone={tone} />
        </div>

        {links.length > 0 && (
          <div className="flex flex-wrap gap-2">
            {links.map((l) => (
              <a
                key={l.url}
                href={l.url}
                target="_blank"
                rel="noreferrer"
                className="flex min-h-10 items-center rounded-btn border border-card-border bg-card px-3 py-[9px] text-[13px]"
              >
                {l.label}
              </a>
            ))}
          </div>
        )}

        <div className="flex gap-2">
          <Link
            href={`/capture?card_id=${card.id}`}
            className="flex min-h-12 flex-1 basis-0 items-center justify-center gap-2 rounded-btn-lg border border-card-border bg-card p-[13px] text-sm font-medium"
          >
            <Mic size={16} />
            Log a note
          </Link>
          <OpenInClaude prompt={prompt} />
        </div>
      </div>
    </main>
  );
}
