-- Noggin — initial schema. Applied to project uvvjzhpzoqeuumvxnpcf on 2026-10-12. Do not re-apply.

create type card_kind   as enum ('project','practice','service','idea');
create type card_status as enum ('planning','building','ongoing','live','shelved','done','archived');

create table cards (
  id uuid primary key default gen_random_uuid(),
  owner uuid not null references auth.users(id),
  kind card_kind not null,
  status card_status not null default 'planning',
  name text not null,
  slug text not null unique,
  summary text,
  context_for_claude text,
  progress int check (progress between 0 and 100),
  next_up text,
  people text[] default '{}',
  links jsonb default '[]',
  health_url text,
  revisit_on date,
  idea_itch text, idea_who text, idea_why_now text, idea_done text,
  idea_decide_after date,
  sort int default 0,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

create table log_entries (
  id uuid primary key default gen_random_uuid(),
  owner uuid not null references auth.users(id),
  card_id uuid not null references cards(id) on delete cascade,
  body text not null,
  source text not null default 'manual' check (source in ('manual','voice','claude')),
  progress_delta int,
  created_at timestamptz default now()
);

create table tasks (
  id uuid primary key default gen_random_uuid(),
  owner uuid not null references auth.users(id),
  card_id uuid not null references cards(id) on delete cascade,
  label text not null,
  done boolean default false,
  sort int default 0,
  created_at timestamptz default now()
);

create table practice_checks (
  id uuid primary key default gen_random_uuid(),
  owner uuid not null references auth.users(id),
  card_id uuid not null references cards(id) on delete cascade,
  day date not null default current_date,
  unique (card_id, day)
);

create table health_checks (
  id uuid primary key default gen_random_uuid(),
  owner uuid not null references auth.users(id),
  card_id uuid not null references cards(id) on delete cascade,
  checked_at timestamptz default now(),
  ok boolean not null,
  status_code int,
  latency_ms int
);

create table briefs (
  id uuid primary key default gen_random_uuid(),
  owner uuid not null references auth.users(id),
  day date not null unique,
  yesterday text,
  today jsonb,
  attention text,
  questions jsonb,
  created_at timestamptz default now()
);

create table decisions (
  id uuid primary key default gen_random_uuid(),
  owner uuid not null references auth.users(id),
  brief_id uuid references briefs(id) on delete set null,
  card_id uuid references cards(id) on delete set null,
  question text not null,
  answer text not null,
  created_at timestamptz default now()
);

create table captures (
  id uuid primary key default gen_random_uuid(),
  owner uuid not null references auth.users(id),
  transcript text not null,
  filed jsonb,
  status text not null default 'pending' check (status in ('pending','filed','fixed')),
  created_at timestamptz default now()
);

create or replace function set_updated_at() returns trigger language plpgsql as $$
begin new.updated_at = now(); return new; end $$;
create trigger cards_updated_at before update on cards for each row execute function set_updated_at();

do $$ declare t text; begin
  foreach t in array array['cards','log_entries','tasks','practice_checks','health_checks','briefs','decisions','captures'] loop
    execute format('alter table %I enable row level security', t);
    execute format('create policy %I_owner on %I for all using (owner = auth.uid()) with check (owner = auth.uid())', t, t);
  end loop;
end $$;

create index log_entries_card_created on log_entries(card_id, created_at desc);
create index practice_checks_card_day on practice_checks(card_id, day desc);
create index health_checks_card_checked on health_checks(card_id, checked_at desc);
create index cards_owner_kind_status on cards(owner, kind, status);

create view v_quiet_cards with (security_invoker = true) as
  select c.* from cards c
  where c.kind = 'project' and c.status in ('planning','building','ongoing')
    and not exists (select 1 from log_entries l where l.card_id = c.id and l.created_at > now() - interval '7 days');

create view v_practice_streaks with (security_invoker = true) as
with ranked as (
  select card_id, day, day - (row_number() over (partition by card_id order by day))::int as grp
  from practice_checks
),
runs as (
  select card_id, grp, min(day) as start_day, max(day) as end_day, count(*) as len
  from ranked group by card_id, grp
)
select c.id as card_id,
  coalesce((select len from runs r where r.card_id = c.id and r.end_day >= current_date - 1 order by end_day desc limit 1), 0) as current_streak,
  (select max(day) from practice_checks p where p.card_id = c.id) as last_day
from cards c where c.kind = 'practice';
