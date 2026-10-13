import { snoozeService } from "@/app/actions";
import { Card } from "@/components/Card";
import { Dot } from "@/components/Dot";
import { Header } from "@/components/Header";
import { MonoLabel } from "@/components/MonoLabel";
import { addDays, dayLabel, localDay, monthLabel, timeLabel } from "@/lib/format";
import { loadServices, type ServiceState } from "@/lib/health";
import { session } from "@/lib/session";

export const dynamic = "force-dynamic";

type LinkItem = { label: string; url: string };

// Snooze runs to the first of the month at least 30 days out (mid-Oct → 1 Dec).
function snoozeUntil(): string {
  const d = new Date(`${addDays(localDay(), 30)}T12:00:00Z`);
  return new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth() + 1, 1)).toISOString().slice(0, 10);
}

function detail(s: ServiceState): string {
  if (!s.card.health_url) return "Not running · no health URL";
  if (!s.latest) return `${s.host} · not checked yet`;
  const code = s.latest.status_code ?? "timeout";
  if (s.state === "down" && s.downSince) {
    return `${s.host} · ${code} · down since ${timeLabel(s.downSince)} ${dayLabel(s.downSince).slice(0, 3)}`;
  }
  return `${s.host} · ${code} · ${s.latest.latency_ms}ms · 30d ${s.uptime}%`;
}

export default async function Live() {
  const { db } = await session();
  const [services, { data: shelf }] = await Promise.all([
    loadServices(db),
    db.from("cards").select("id, slug, name, summary, revisit_on").eq("kind", "project").eq("status", "shelved").order("revisit_on"),
  ]);

  const lastChecked = services.map((s) => s.latest?.checked_at).filter(Boolean).sort().at(-1);
  const until = snoozeUntil();

  return (
    <>
      <Header meta={`${lastChecked ? `Checked ${timeLabel(lastChecked)}` : "Not checked yet"} · every 6h`} title="Live & shelf" />
      <div className="flex flex-col gap-2.5 px-gutter pt-1.5">
        <MonoLabel className="pt-1">Live</MonoLabel>
        {services.map((s) => {
          const down = s.state === "down";
          const tone = s.state === "up" ? "up" : down ? "attn" : "off";
          const label = s.state === "up" ? "UP" : down ? "DOWN" : "OFF";
          const link = ((Array.isArray(s.card.links) ? s.card.links : []) as LinkItem[])[0];
          return (
            <Card key={s.card.id} variant={down ? "attn" : "card"} className="flex flex-col gap-2.5 px-4 py-3.5">
              <div className="flex items-center gap-3">
                <Dot tone={tone} size={10} />
                <div className="flex min-w-0 flex-auto flex-col gap-0.5">
                  <span className="text-[15px] font-semibold">{s.card.name}</span>
                  <span className={`font-mono text-[11px] ${down ? "text-body" : "text-muted"}`}>{detail(s)}</span>
                </div>
                <span className={`font-mono text-[11px] ${down ? "text-attn" : s.state === "up" ? "text-up" : "text-muted"}`}>{label}</span>
              </div>
              {down && (
                <div className="flex gap-2">
                  {link && (
                    <a
                      href={link.url}
                      target="_blank"
                      rel="noreferrer"
                      className="flex min-h-11 flex-1 basis-0 items-center justify-center rounded-btn border border-attn-border bg-attn-btn p-2.5 text-[13px] font-medium"
                    >
                      Open {s.host}
                    </a>
                  )}
                  {s.snoozed ? (
                    <span className="flex min-h-11 flex-1 basis-0 items-center justify-center font-mono text-[11px] text-muted">
                      Snoozed till {monthLabel(s.card.revisit_on!)}
                    </span>
                  ) : (
                    <form action={snoozeService.bind(null, s.card.id, until)} className="flex flex-1 basis-0">
                      <button className="min-h-11 w-full rounded-btn border border-attn-border bg-attn-btn p-2.5 text-[13px] font-medium text-fg">
                        Snooze till {monthLabel(until)}
                      </button>
                    </form>
                  )}
                </div>
              )}
            </Card>
          );
        })}

        <MonoLabel className="scroll-mt-4 pt-3.5">
          <span id="shelf">Shelf · nothing to do until the date</span>
        </MonoLabel>
        {(shelf ?? []).map((c) => (
          <Card key={c.id} href={`/p/${c.slug}`} variant="shelf" className="flex items-center gap-3 px-4 py-[13px]">
            <div className="flex min-w-0 flex-auto flex-col gap-0.5">
              <span className="text-[15px] font-medium text-body">{c.name}</span>
              {c.summary && <span className="text-xs leading-[1.4] text-muted">{c.summary}</span>}
            </div>
            {c.revisit_on && (
              <span className="whitespace-nowrap rounded-pill border border-card-border px-2 py-1 font-mono text-[11px] text-muted">
                {monthLabel(c.revisit_on)}
              </span>
            )}
          </Card>
        ))}
      </div>
    </>
  );
}
