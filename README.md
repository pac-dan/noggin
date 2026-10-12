# Noggin

A personal, single-user, phone-first PWA that holds everything Dan has on the go as **cards** — projects, daily practices, live services, ideas — with a short state on each (status, last done, next up, progress), an append-only log, and a morning brief. Claude is the second user: it reads and writes the same Supabase database through the Supabase MCP connector, so a Claude session can end by updating a card, and a scheduled Claude task writes the brief each morning.

Design intent, in one line: **the app tells Dan where to start; Dan tells the app what happened, by voice.**

**Claude Code: build this exactly as this file describes, in the order in §9, stopping after each step.**

Design canvas (source of truth for look and layout): https://claude.ai/artifact/3H6fUsAJRo7d1VpwmBCP1G
Match it screen for screen. Do not add screens, fields or features that are not in this document.

---

## 1. Already done (don't redo)

- Supabase project **`noggin`** exists: ref `uvvjzhpzoqeuumvxnpcf`, region eu-west-1, URL `https://uvvjzhpzoqeuumvxnpcf.supabase.co`.
- The migration in `supabase/migrations/0001_init.sql` has **already been applied** to it (8 tables, RLS, trigger, indexes, 2 views). Keep the file as the record; do not re-apply. Any schema change is a new numbered migration.
- `.env.example` lists every env var. Public values are filled in; secrets are not.

## 2. Stack

- **Next.js 15, App Router, TypeScript, Tailwind.** Server components for reads, server actions for writes. No component library.
- **Supabase**: Postgres + Auth + RLS. Email magic-link, one user. Use `@supabase/ssr`.
- **Vercel** hosting. Env: see `.env.example`.
- **PWA**: `manifest.webmanifest` (name "Noggin", short_name "Noggin", display standalone, theme_color `#0F1012`, background_color `#0F1012`, icons 192/512 + apple-touch-icon 180), minimal service worker (cache shell; network-first for data). `<meta name="apple-mobile-web-app-capable">`, `viewport-fit=cover`, safe-area padding on header and tab bar.
- Fonts: IBM Plex Sans (400/500/600/700) and IBM Plex Mono (400/500) via `next/font/google`.

## 3. Design tokens (from the Tokens artboard)

Surfaces: `bg #0F1012`, `shelf #16171A` (border `#22232A`), `card #1C1D21` (border `#2A2B30`), `button #26272C` (border `#34353B`).
Text: `fg #F2F0EA`, `body #D9D7CF`, `sub #B9B7AF`, `muted #9A9890`, `faint #6B6A64`.
Status (pill bg / fg): building `#2B2311/#F0B64A` · planning `#13232B/#5AB6E0` · live/ongoing/up `#15281C/#6FCF8E` · attention/down `#2B1A14/#F08A5A` (border `#5A3326`) · shelved `#26272C/#9A9890` · off/ring `#4A4B52`.
Type: screen title 30/600 letter-spacing -0.02em; card title 17/600; body 14/400 lh 1.45; secondary 13 sub; label = Mono 11, 0.08em, uppercase, muted.
Shape: cards 14px radius; buttons 10–12px; pills 6px; gutter 20px; card padding 14–16px; gap 10px; tap targets ≥44px; tab bar 84px; progress bar 4px (6px on Project).
Put all of these in `globals.css` as CSS variables and Tailwind theme tokens. No other colours.

## 4. Schema

See `supabase/migrations/0001_init.sql` (applied). Summary:

- `cards` — kind (`project|practice|service|idea`), status (`planning|building|ongoing|live|shelved|done|archived`), name, slug, summary, `context_for_claude`, progress 0–100, `next_up`, people[], links jsonb `[{label,url}]`, `health_url` (service), `revisit_on` (shelved), idea fields `idea_itch / idea_who / idea_why_now / idea_done / idea_decide_after`, sort.
- `log_entries` — card_id, body, source (`manual|voice|claude`), progress_delta.
- `tasks` — card_id, label, done, sort.
- `practice_checks` — card_id, day (unique per card/day).
- `health_checks` — card_id, checked_at, ok, status_code, latency_ms.
- `briefs` — day (unique), yesterday, today jsonb `[{card_id,label,minutes}]`, attention, questions jsonb `[{id,card_id,text,options:[{label,action}]}]`.
- `decisions` — brief_id, card_id, question, answer.
- `captures` — transcript, filed jsonb, status (`pending|filed|fixed`).
- Views: `v_quiet_cards` (active projects with no log in 7 days), `v_practice_streaks` (card_id, current_streak, last_day).
- Every table has `owner uuid` and an owner-only RLS policy.

Generate TypeScript types (`supabase gen types typescript --project-id uvvjzhpzoqeuumvxnpcf`) into `lib/db.types.ts`.

## 5. Screens (one route each; match the artboard with the same number)

Shared: header (Mono date/meta line + 30px title, top-right round 44px mic button that opens Capture), scrollable body with 20px gutter, 84px bottom tab bar (Brief · Board · Ideas · Live). Active tab `fg`, others `muted`. Safe-area aware.

**1. `/brief` — landing (artboard 1).** Reads today's `briefs` row. Sections: one-paragraph `yesterday`; "Today · one thing each" — one row per `today` item: 36px square chip (minutes, status-coloured; a tick for practices), card name muted, label 15/500, tap → card; "Decide" — one card per `questions` item, question text + buttons from `options` (each button = server action that writes `decisions` and applies the action: `keep`, `shelve:<date>`, `revisit:<date>`, `promote`, `archive`, `note:<text>`); on answer, replace buttons with a green Mono confirmation line; "Attention" — orange card when any service's latest health check failed. No brief for today → show "No brief yet" + latest brief. Greeting: "Morning, Dan." before 12:00, "Afternoon." / "Evening." otherwise.

**2. `/board` (artboard 2).** Meta line "N active · N practices · N shelved". Active: project cards with status in (planning, building, ongoing): name 17/600, status pill, next-up line with coloured dot, 4px progress bar + "ago" (time since last log). Practices: 3-column grid of tiles (76px min): 22px ring that fills green with a tick when today's `practice_checks` row exists; tap toggles; streak label from `v_practice_streaks`. Shelf: one collapsed shelf-coloured row listing shelved names, tap → `/live#shelf`.

**3. `/p/[slug]` (artboard 3).** Back button, name 22/600, Mono meta (domain · people · "since Mon"), status pill — tap cycles building → live → shelved (server action). Progress: label row + 6px bar. "Context for Claude" card: `context_for_claude`, tap to edit inline (textarea, save on blur). "Next up": task checklist, toggle = server action, done tasks struck through muted. "Log": vertical timeline, newest first, Mono date + source tag chip, body 13px. Link chips from `links`. Two buttons: "Log a note" → Capture with `card_id` preset; **"Open in Claude"** → copies to clipboard: `Project: <name>\n\n<context_for_claude>\n\nNext up: <next_up>\nOpen tasks: <tasks>\nRecent log:\n<last 3 entries>` and shows "Copied — paste into Claude".

**4. `/capture` (artboard 4).** Full-screen sheet. Three states. *Idle*: 120px white mic button, "Just talk.", sub-copy, text input fallback. *Recording*: button becomes orange square-in-ring stop, Mono timer, live transcript below (Web Speech API where available for live text; the audio blob is still sent to Whisper on stop — Whisper result wins). *Filed*: POST `/api/capture` → inserts `captures` row, calls Claude (Haiku-class model, prompt in §7) with transcript + list of cards → returns filed items → app inserts `log_entries` / `tasks` / idea `cards` / `cards.next_up` updates and shows one review card per item (Mono header `LOG · Sales Arena`, `+ progress 70 → 80%` in amber when `progress_delta`, `NEXT UP · …`, `IDEA · new`). Buttons: "Fix something" (back to idle with transcript in the text box, filed items deleted) / "Looks right" (marks capture `filed`, back to previous screen).

**5. `/ideas` (artboard 5).** Meta "N ideas · N ready to decide". Intro line. Cards for `kind='idea'` and status not archived: name 16/600 + age; 2×2 grid of Mono-labelled fields (The itch / For who / Why now / Done looks like). If `today >= idea_decide_after`: three buttons — **Let it go** (status archived), **Keep a week** (idea_decide_after += 7), **Promote** (kind → project, status planning, idea fields copied into `summary`). Else Mono "Decide in N days". After action, replace buttons with green Mono outcome line. "+" in header → Capture (Claude files as idea) — there is no form.

**6. `/live` (artboard 6).** Meta "Checked HH:MM · every 6h". Live: one row per `kind='service'`: 10px dot (green/orange/grey), name, Mono "<host> · <status_code> · <latency>ms · 30d <uptime>%", UP/DOWN/OFF. A DOWN row is attention-coloured and expands with two buttons: "Open <host>" (links[0]) and "Snooze till <month>" (sets `revisit_on`, suppresses from brief). Shelf (`#shelf`): rows for status shelved — name, note (`summary`), month chip from `revisit_on`; tap → project.

**7. `/review` (artboard 7).** Landing on Sundays instead of Brief; otherwise reachable from Brief's meta line. Reads the `briefs` row for that Sunday where `today` is null — the generator writes `yesterday` as the week paragraph and `questions` as the three questions. Three stat tiles: progress delta on top project, sessions logged, ideas let go (computed server-side). Practices grid: 7 squares per practice, green = checked, Mono "n/7". Questions: tap options as in Brief, or "Answer by voice" → Capture with question id preset. "Set next week" → `/brief`.

## 6. Background jobs

- **`/api/health-check`** — Vercel cron every 6h (`vercel.json`), `Authorization: Bearer CRON_SECRET`. For each service card with `health_url`: GET with 10s timeout, insert `health_checks`.
- **Brief and review generation are done by Claude, not by this app.** A scheduled Claude task reads the DB via the Supabase MCP connector at 06:30 daily and writes the `briefs` row (Sunday: the review shape). The app only renders. Leave a stub `supabase/functions/brief/README.md` explaining this.

## 7. Claude contract (write `CLAUDE_CONTRACT.md` in step 6; keep in sync with schema)

Claude connects with the service-role key via MCP. Operations it performs:
- `update cards set next_up, progress, context_for_claude, status` after a work session.
- `insert log_entries (card_id, body, source='claude', progress_delta)`.
- `insert briefs (day, yesterday, today, attention, questions)` daily; `options[].action` ∈ `keep`, `shelve:<YYYY-MM-DD>`, `revisit:<YYYY-MM-DD>`, `promote`, `archive`, `note:<text>`.
- Read `v_quiet_cards`, `v_practice_streaks`, latest `health_checks`, `decisions` since last brief.

**Capture filing prompt** (`/api/capture`): system prompt lists all non-archived cards (id, name, kind, status, next_up) and instructs: return a JSON array of `{type: 'log'|'next_up'|'task'|'idea'|'progress', card_id?, body, progress_delta?, idea:{itch,who,why_now,done}?}`; one item per distinct thing said; never invent a card — unknown subject → `idea`; terse bodies in Dan's words.

## 8. Seed (`scripts/seed.ts`, takes the user id — run after first magic-link login)

Projects: Sales Arena [building 70, people Kevin, links sales1v1.com, next "Stripe checkout live on PRO CARD", context: "Competitive sales training; free 1v1 battles, paid PRO CARD. Next.js + Supabase (RLS, claim_ai_session security-definer) + Stripe hosted Checkout. Esports branding deliberate. Kevin owns sales brain + marketing. No org tier until 50 paying users. Rejected: Electron widget (old Salesy)."] · Voice AI for businesses [planning 15, Kevin, next "Pick one niche, build the demo agent"] · Irish phrase app [building 30, next "Test Irish speech-to-text options"] · Ginger bug sodas [ongoing, next "New bug, try a 4th flavour"].
Shelved (revisit_on): Adventure tours 2026-12-01 · Fermentation app 2027-01-05 · Project Orion 2027-01-05 · Momentum Digital 2027-01-05 · Garden 2027-02-01 · Nature-economy mission 2027-03-01.
Practices: Gym / surf · Guitar · Irish · Skate · Ferments · Garden.
Services: sales1v1.com (health_url https://sales1v1.com) · whiterabbit / Momentum Clips (Render; health_url TBC) · Project Orion bot (no URL).
Ideas: Cheap bass · Kimchi from Irish cabbage · Mountain Leader award · Sea moss harvest run (fill the four fields plausibly; `idea_decide_after` = now + 7d).

## 9. Build order — stop and show after each

1. ~~Supabase project + migration~~ (done). Generate types, write `scripts/seed.ts`, scaffold the Next.js app with `.env.local` from `.env.example`. Prove the DB connection with a query.
2. Auth (magic link) + layout shell (header, tab bar, tokens, fonts, PWA manifest + icons + SW). Deploy to Vercel (`vercel` CLI is fine). Dan installs it on the phone and logs in once; then run the seed.
3. `/board` and `/p/[slug]` reading real data; task toggle, practice toggle, status cycle, context edit, Open in Claude.
4. `/live` + health-check cron. `/ideas` with the three actions.
5. `/capture` — recording, Whisper, filing, review cards.
6. `/brief` and `/review` rendering from `briefs` + decisions actions. Write `CLAUDE_CONTRACT.md`.

## 10. Rules

- Nothing not in this file. If you think something is missing, say so in the step summary; don't build it.
- `npm run build` green before any step is called done. Commit per step.
- Hand-write ~12 components: `Header`, `TabBar`, `Card`, `Pill`, `ProgressBar`, `Dot`, `MonoLabel`, `TaskRow`, `PracticeTile`, `LogTimeline`, `DecideCard`, `Sheet`. No others unless a screen needs it.
- Mobile first at 390px; usable at desktop widths (max-width 480px centred column is acceptable).
- No animations beyond 150ms opacity/transform on state changes. No gradients, no emoji, no icon library — inline stroke SVGs copied from the design.
- Never commit `.env.local` or any key.
