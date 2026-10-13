# Claude contract

How Claude reads and writes Noggin's database. Keep in sync with `supabase/migrations/` and `lib/db.types.ts`.

## Connection

- Supabase project `uvvjzhpzoqeuumvxnpcf` (eu-west-1), via the Supabase MCP connector with the **service-role key**. Service role bypasses RLS, so every insert must set `owner` explicitly.
- `owner` = Dan's `auth.users.id`. Look it up once: `select id from auth.users limit 1;` (single-user app).
- Dates are Dan's local day in `Europe/Dublin`, formatted `YYYY-MM-DD`. Timestamps are `timestamptz`.

## Writes

### After a work session

```sql
update cards
set next_up = $next, progress = $pct, context_for_claude = $ctx, status = $status
where id = $card_id;

insert into log_entries (owner, card_id, body, source, progress_delta)
values ($owner, $card_id, $body, 'claude', $delta);
```

- `status` ∈ `planning | building | ongoing | live | shelved | done | archived`.
- `progress` is 0–100. If you set `progress_delta`, also update `cards.progress` so the two agree.
- `body` is terse and in Dan's words. The log is append-only: never update or delete rows.

### Daily brief, 06:30 (scheduled task)

One row per day (`briefs.day` is unique). Upsert on `day`.

```sql
insert into briefs (owner, day, yesterday, today, attention, questions)
values ($owner, $day, $yesterday, $today::jsonb, $attention, $questions::jsonb)
on conflict (day) do update set
  yesterday = excluded.yesterday, today = excluded.today,
  attention = excluded.attention, questions = excluded.questions;
```

| Column | Shape | Rendered as |
|---|---|---|
| `yesterday` | text, one paragraph | Opening paragraph on `/brief` |
| `today` | `[{card_id, label, minutes}]` | "Today · one thing each" rows. `card_id` null (or a practice card) renders the practice row with a tick; `minutes` renders as `20m` / `1h` / `1h30` |
| `attention` | text or null | Detail line in the orange card. The card only shows when a service's latest health check failed and the service is not snoozed |
| `questions` | `[{id, card_id, text, options: [{label, action}]}]` | "Decide" cards. `id` must be unique within the row |

### Sunday review

Same table, written on Sunday **instead of** the daily brief, with `today = null`:

- `yesterday` = the week paragraph.
- `questions` = exactly three questions. A question with `options: []` renders an "Answer by voice" button only.
- The app computes the stat tiles and the practice grid itself; don't write them.

### Option actions

`options[].action` is one of:

| Action | Effect on `questions[].card_id` |
|---|---|
| `keep` | none |
| `shelve:YYYY-MM-DD` | `status = 'shelved'`, `revisit_on = date` |
| `revisit:YYYY-MM-DD` | `revisit_on = date` |
| `promote` | `kind = 'project'`, `status = 'planning'`, idea fields copied into `summary` |
| `archive` | `status = 'archived'` |
| `note:<text>` | inserts `log_entries(body = text, source = 'manual')` |

Every answer also inserts `decisions(brief_id, card_id, question, answer)`. `answer` is the option label, or `voice: <transcript>` when answered by voice.

## Reads (before writing the brief)

```sql
select * from v_quiet_cards;              -- active projects with no log in 7 days
select * from v_practice_streaks;         -- card_id, current_streak, last_day

select distinct on (card_id) card_id, ok, status_code, latency_ms, checked_at
from health_checks order by card_id, checked_at desc;   -- latest check per service

select * from decisions
where created_at > (select max(created_at) from briefs where day < $today)
order by created_at;                      -- what Dan decided since the last brief

select * from log_entries where created_at > now() - interval '1 day' order by created_at;
```

Services with `revisit_on` in the future are snoozed: leave them out of `attention`.

## Capture filing (`/api/capture`, in-app)

Not a Claude-session operation, recorded here so both sides agree. Model `claude-haiku-5-5` (structured output). The system prompt lists all non-archived cards as `{id, name, kind, status, next_up}`. The response is `{items: [{type, card_id, body, progress_delta, idea}]}` with:

- `type` ∈ `log | next_up | task | idea | progress`.
- `card_id` must be a listed id. Anything else is filed as an `idea`. Never invent a card.
- `idea` = `{itch, who, why_now, done}` for ideas, otherwise null. The idea card's `name` is `body`.

The app applies the items: `log_entries` (`source` is `voice` or `manual`), `tasks`, new idea `cards` (`idea_decide_after` = today + 7), and `cards.next_up` / `cards.progress` updates. It keeps the undo data in `captures.filed`, and `captures.status` moves `pending → filed | fixed`.
