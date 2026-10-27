"use client";

import { useRouter } from "next/navigation";
import { useEffect, useState, useTransition } from "react";
import { saveDayNote, savePlanCheckin, savePlanSettings, setRoughDay, togglePlanTick } from "@/app/actions";
import { MonoLabel } from "@/components/MonoLabel";
import { addDays } from "@/lib/format";
import { Back, Chevron, Tick } from "@/lib/icons";
import { END, PLAN, PHASES, SCORES, START, bannersFor, doxyEnd, phaseOf, visibleItems, type Item, type Settings } from "@/lib/plans/gut-reset";

const mins = (t: string) => {
  const [h, m] = t.split(":").map(Number);
  return h * 60 + m;
};
const deviceMinutes = () => {
  const d = new Date();
  return d.getHours() * 60 + d.getMinutes();
};
const fmtShort = (day: string) =>
  new Date(`${day}T12:00:00Z`).toLocaleDateString("en-IE", { weekday: "short", day: "numeric", month: "short", timeZone: "UTC" });
const fmtLong = (day: string) =>
  new Date(`${day}T12:00:00Z`).toLocaleDateString("en-IE", { weekday: "long", day: "numeric", month: "long", timeZone: "UTC" });

const tagClass: Record<string, string> = {
  med: "bg-attn-bg text-attn",
  anchor: "bg-building-bg text-building",
  other: "bg-planning-bg text-planning",
};

export function TodayPlan({
  view,
  today,
  settings: initialSettings,
  rough: initialRough,
  note: initialNote,
  notes: initialNotes,
  ticks,
  checkins: initialCheckins,
  daysLeft,
  builds,
}: {
  view: string;
  today: string;
  settings: Settings;
  rough: boolean;
  note: string;
  notes: { day: string; note: string }[];
  ticks: string[];
  checkins: Record<number, Record<string, number>>;
  daysLeft: number;
  builds: React.ReactNode;
}) {
  const router = useRouter();
  const [, start] = useTransition();
  const [done, setDone] = useState(() => new Set(ticks));
  const [rough, setRough] = useState(initialRough);
  const [settings, setSettings] = useState(initialSettings);
  const [checkins, setCheckins] = useState(initialCheckins);
  const [notes, setNotes] = useState(initialNotes);
  const [now, setNow] = useState(deviceMinutes);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const t = setInterval(() => setNow(deviceMinutes()), 60_000);
    return () => clearInterval(t);
  }, []);

  const run = (fn: () => Promise<unknown>) =>
    start(async () => {
      try {
        await fn();
        setError(null);
      } catch {
        setError("Couldn't save that. Check your signal and tap again.");
      }
    });

  const items = visibleItems(view, settings, rough);
  const isToday = view === today;
  const pending = items.filter((i) => !done.has(i.id));
  const due = pending.filter((i) => mins(i.t) <= now);
  const nowItem: Item | null = isToday ? (due.at(-1) ?? pending[0] ?? null) : (pending[0] ?? null);
  const noteOf = (i: Item) => (rough && i.minNote ? i.minNote : i.note);

  const toggle = (id: string) => {
    const on = !done.has(id);
    setDone((s) => {
      const next = new Set(s);
      if (on) next.add(id);
      else next.delete(id);
      return next;
    });
    run(() => togglePlanTick(PLAN, view, id, on));
  };

  const go = (day: string) => router.push(day === today ? "/today" : `/today?d=${day}`);
  const total = Math.round(((Date.parse(view) - Date.parse(START)) / (Date.parse(END) - Date.parse(START))) * 100);

  return (
    <div className="flex flex-col gap-3.5">
      <div className="flex items-center gap-2">
        <button onClick={() => go(addDays(view, -1))} disabled={view <= START} aria-label="Previous day" className="flex size-11 items-center justify-center rounded-btn border border-button-border bg-button disabled:opacity-35">
          <Back />
        </button>
        <div className="flex min-w-0 flex-1 flex-col items-center">
          <span className="text-[15px] font-semibold">{fmtLong(view)}</span>
          {isToday ? (
            <span className="font-mono text-[11px] text-muted">{daysLeft > 0 ? `${daysLeft} days to Bansko` : "Bansko time"}</span>
          ) : (
            <button onClick={() => go(today)} className="font-mono text-[11px] text-planning">
              Back to today
            </button>
          )}
        </div>
        <button onClick={() => go(addDays(view, 1))} disabled={view >= END} aria-label="Next day" className="flex size-11 items-center justify-center rounded-btn border border-button-border bg-button disabled:opacity-35">
          <Chevron />
        </button>
      </div>
      <div className="h-1 overflow-hidden rounded-full bg-card-border">
        <div className="h-full rounded-full bg-up" style={{ width: `${Math.max(3, total)}%` }} />
      </div>

      {bannersFor(view, today, settings).map((b) => (
        <div key={b.lead} className={`rounded-btn-lg px-3.5 py-3 text-sm leading-[1.45] ${b.special ? "bg-building-bg" : "bg-up-bg"}`}>
          <span className="font-semibold">{b.lead}</span> {b.text}
        </div>
      ))}

      {/* Right now */}
      {nowItem ? (
        <div className="flex flex-col gap-2 rounded-card border border-building/40 bg-building-bg p-4">
          <span className="label !text-building">{isToday ? (mins(nowItem.t) <= now ? "Right now" : `Up next · ${nowItem.t}`) : `First up · ${nowItem.t}`}</span>
          <span className="text-[22px] font-semibold leading-[1.15]">{nowItem.title}</span>
          {(noteOf(nowItem) || nowItem.detail) && (
            <span className="text-sm leading-[1.45] text-body">{noteOf(nowItem) ?? nowItem.detail!.join(" · ")}</span>
          )}
          <button onClick={() => toggle(nowItem.id)} className="mt-1 self-start rounded-btn-lg bg-fg px-5 py-3 text-sm font-semibold text-bg">
            Done
          </button>
        </div>
      ) : (
        <div className="flex flex-col gap-1 rounded-card border border-card-border bg-card p-4">
          <span className="label">All done</span>
          <span className="text-[20px] font-semibold">{isToday ? "That's the day sorted." : "Every box ticked."}</span>
          <span className="text-sm text-sub">Never miss two days in a row. That's the only rule.</span>
        </div>
      )}

      {error && <div className="font-mono text-xs text-attn">{error}</div>}

      {builds}

      {/* Rough day */}
      <div className="flex items-center justify-between gap-3 rounded-card border border-card-border bg-card px-3.5 py-3">
        <div className="flex flex-col">
          <span className="text-sm font-semibold">Rough day</span>
          <span className="text-[13px] leading-[1.4] text-sub">Travelling, late shift or wrecked? Just the basics. It still counts.</span>
        </div>
        <Switch
          on={rough}
          label="Rough day mode"
          onClick={() => {
            setRough(!rough);
            run(() => setRoughDay(PLAN, view, !rough));
          }}
        />
      </div>

      <DayNote
        day={view}
        initial={initialNote}
        notes={notes}
        onOpen={go}
        onSave={(text) => {
          const rest = notes.filter((n) => n.day !== view);
          setNotes(text.trim() ? [{ day: view, note: text.trim() }, ...rest].sort((a, b) => b.day.localeCompare(a.day)) : rest);
          run(() => saveDayNote(PLAN, view, text));
        }}
      />

      {/* The day */}
      <div className="flex items-baseline justify-between">
        <MonoLabel>{isToday ? "Gut reset · today" : view < today ? "Gut reset · that day" : "Gut reset · the plan"}</MonoLabel>
        <span className="font-mono text-[11px] text-muted">
          {items.filter((i) => done.has(i.id)).length} / {items.length}
        </span>
      </div>
      <div className="overflow-hidden rounded-card border border-card-border bg-card">
        {items.map((i, idx) => {
          const d = done.has(i.id);
          const late = isToday && !d && mins(i.t) < now - 60 && i !== nowItem;
          const tag = i.tag === "med" ? "med" : i.anchor ? "anchor" : i.tag;
          return (
            <div
              key={i.id}
              className={`grid grid-cols-[44px_1fr_36px] items-start gap-2.5 px-3.5 py-3 ${idx ? "border-t border-card-border" : ""} ${
                i === nowItem && isToday ? "bg-building-bg" : ""
              }`}
            >
              <span className={`pt-0.5 font-mono text-xs ${late ? "text-attn" : "text-muted"}`}>{i.t}</span>
              <div className="min-w-0">
                <div className={`text-sm font-semibold ${d ? "text-faint line-through" : ""}`}>
                  {i.title}
                  {tag && (
                    <span className={`ml-1.5 rounded-pill px-1.5 py-px align-[1px] font-mono text-[10px] uppercase tracking-[0.06em] ${tagClass[tag] ?? tagClass.other}`}>
                      {tag}
                    </span>
                  )}
                </div>
                {noteOf(i) && <p className="mt-0.5 text-[13px] leading-[1.4] text-sub">{noteOf(i)}</p>}
                {i.detail && !(rough && i.minNote) && (
                  <details className="mt-0.5">
                    <summary className="cursor-pointer list-none text-[13px] text-muted">+ {i.detail.length} steps</summary>
                    <ol className="mt-1 list-decimal pl-4 text-[13px] leading-[1.45] text-sub">
                      {i.detail.map((x) => (
                        <li key={x}>{x}</li>
                      ))}
                    </ol>
                  </details>
                )}
              </div>
              <button
                role="checkbox"
                aria-checked={d}
                aria-label={i.title}
                onClick={() => toggle(i.id)}
                className={`fade flex size-8 items-center justify-center justify-self-end rounded-full border-2 ${d ? "border-up bg-up text-bg" : "border-off"}`}
              >
                {d && <Tick size={14} strokeWidth={3} />}
              </button>
            </div>
          );
        })}
      </div>

      <Checkin
        view={view}
        open={new Date(`${view}T12:00:00Z`).getUTCDay() === 0}
        checkins={checkins}
        onSave={(week, scores) => {
          setCheckins((c) => ({ ...c, [week]: scores }));
          run(() => savePlanCheckin(PLAN, week, scores));
        }}
      />

      <details className="rounded-card border border-card-border bg-card px-3.5 py-3">
        <summary className="cursor-pointer list-none text-sm font-semibold">Antibiotics {settings.doxy ? "· on" : ""}</summary>
        <div className="mt-3 flex flex-col gap-3">
          <div className="flex items-center justify-between gap-3">
            <span className="text-[13px] leading-[1.4] text-sub">On doxycycline: adds both doses and keeps kefir 2–3 hours away from them.</span>
            <Switch
              on={settings.doxy}
              label="On doxycycline"
              onClick={() => {
                const next = { ...settings, doxy: !settings.doxy };
                setSettings(next);
                run(() => savePlanSettings(PLAN, next));
              }}
            />
          </div>
          {settings.doxy && (
            <>
              <div className="flex flex-wrap items-center gap-2.5 text-sm">
                <label htmlFor="doxyStart">Started</label>
                <input
                  id="doxyStart"
                  type="date"
                  value={settings.doxyStart}
                  onChange={(e) => {
                    if (!e.target.value) return;
                    const next = { ...settings, doxyStart: e.target.value };
                    setSettings(next);
                    run(() => savePlanSettings(PLAN, next));
                  }}
                  className="rounded-btn border border-button-border bg-bg px-2 py-1.5"
                />
                <label htmlFor="doxyDays">Course</label>
                <select
                  id="doxyDays"
                  value={settings.doxyDays}
                  onChange={(e) => {
                    const next = { ...settings, doxyDays: Number(e.target.value) };
                    setSettings(next);
                    run(() => savePlanSettings(PLAN, next));
                  }}
                  className="rounded-btn border border-button-border bg-bg px-2 py-1.5"
                >
                  {[14, 21, 28].map((d) => (
                    <option key={d} value={d}>
                      {d} days
                    </option>
                  ))}
                </select>
              </div>
              <span className="text-[13px] text-sub">Last dose {fmtLong(doxyEnd(settings))}. Use SPF 50 and sunglasses until a few days after that.</span>
            </>
          )}
        </div>
      </details>
    </div>
  );
}

// A free-text note for the day (a dodgy meal, a bad night, a flare-up), kept with the
// plan so the check-ins and the morning brief can see it. Past notes fold out below.
function DayNote({
  day,
  initial,
  notes,
  onOpen,
  onSave,
}: {
  day: string;
  initial: string;
  notes: { day: string; note: string }[];
  onOpen: (day: string) => void;
  onSave: (text: string) => void;
}) {
  const [text, setText] = useState(initial);
  const [saved, setSaved] = useState(initial);
  const dirty = text.trim() !== saved.trim();
  const others = notes.filter((n) => n.day !== day);

  const save = () => {
    if (!dirty) return;
    onSave(text);
    setSaved(text);
  };

  return (
    <div className="flex flex-col gap-2 rounded-card border border-card-border bg-card px-3.5 py-3">
      <label htmlFor="dayNote" className="text-sm font-semibold">
        Note for the day
      </label>
      <textarea
        id="dayNote"
        rows={3}
        value={text}
        onChange={(e) => setText(e.target.value)}
        onBlur={save}
        placeholder="How's the gut, sleep, energy? Anything off, like a dodgy meal."
        className="w-full resize-none rounded-btn border border-button-border bg-bg px-3 py-2 text-sm leading-[1.45] text-fg placeholder:text-faint"
      />
      <div className="flex items-center justify-between gap-2">
        <span className="font-mono text-[11px] text-muted">{dirty ? "Not saved yet" : saved.trim() ? "Saved" : ""}</span>
        <button onClick={save} disabled={!dirty} className="rounded-btn bg-fg px-3.5 py-2 text-[13px] font-semibold text-bg disabled:opacity-40">
          Save note
        </button>
      </div>
      {others.length > 0 && (
        <details className="mt-1 border-t border-card-border pt-2">
          <summary className="cursor-pointer list-none text-[13px] text-muted">+ Past notes ({others.length})</summary>
          <ul className="mt-2 flex flex-col gap-2">
            {others.map((n) => (
              <li key={n.day} className="text-[13px] leading-[1.45]">
                <button onClick={() => onOpen(n.day)} className="font-mono text-[11px] text-planning">
                  {fmtShort(n.day)}
                </button>
                <p className="text-sub">{n.note}</p>
              </li>
            ))}
          </ul>
        </details>
      )}
    </div>
  );
}

function Switch({ on, label, onClick }: { on: boolean; label: string; onClick: () => void }) {
  return (
    <button role="switch" aria-checked={on} aria-label={label} onClick={onClick} className={`fade relative h-7 w-12 flex-none rounded-full ${on ? "bg-building" : "bg-button-border"}`}>
      <span className={`fade absolute left-[3px] top-[3px] size-[22px] rounded-full bg-fg ${on ? "translate-x-5" : ""}`} />
    </button>
  );
}

function Checkin({
  view,
  open,
  checkins,
  onSave,
}: {
  view: string;
  open: boolean;
  checkins: Record<number, Record<string, number>>;
  onSave: (week: number, scores: Record<string, number>) => void;
}) {
  const week = (phaseOf(view) ?? PHASES[PHASES.length - 1]).n;
  const [scores, setScores] = useState<Record<string, number>>(() => Object.fromEntries(SCORES.map((s) => [s.k, checkins[week]?.[s.k] ?? 5])));
  const [saved, setSaved] = useState(false);
  const weeks = Object.keys(checkins).map(Number).sort((a, b) => a - b);

  return (
    <details open={open} className="rounded-card border border-card-border bg-card px-3.5 py-3">
      <summary className="cursor-pointer list-none text-sm font-semibold">Sunday check-in · week {week}</summary>
      <div className="mt-3 flex flex-col gap-3">
        <span className="text-[13px] leading-[1.4] text-sub">Score each from 0 to 10, where 10 is best. If a score hasn't moved by week 3, change something rather than quitting.</span>
        {SCORES.map((s) => (
          <label key={s.k} className="flex flex-col gap-1 text-sm">
            <span className="flex justify-between">
              <span>{s.label}</span>
              <span className="font-mono">{scores[s.k]}</span>
            </span>
            <input
              type="range"
              min={0}
              max={10}
              step={1}
              value={scores[s.k]}
              onChange={(e) => setScores({ ...scores, [s.k]: Number(e.target.value) })}
              className="w-full accent-[var(--color-up)]"
            />
          </label>
        ))}
        <button
          onClick={() => {
            onSave(week, scores);
            setSaved(true);
            setTimeout(() => setSaved(false), 1500);
          }}
          className="self-start rounded-btn bg-up px-4 py-2.5 text-sm font-semibold text-bg"
        >
          {saved ? "Saved" : "Save check-in"}
        </button>
        {weeks.length > 0 && (
          <div className="overflow-x-auto">
            <table className="w-full border-collapse text-[13px]">
              <thead>
                <tr className="text-muted">
                  <th className="py-1 text-left font-medium">Week</th>
                  {SCORES.map((s) => (
                    <th key={s.k} className="py-1 font-medium capitalize">
                      {s.k}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {weeks.map((w) => (
                  <tr key={w} className="border-t border-card-border">
                    <td className="py-1">Week {w}</td>
                    {SCORES.map((s) => (
                      <td key={s.k} className="py-1 text-center font-mono">
                        {checkins[w][s.k] ?? "–"}
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </details>
  );
}
