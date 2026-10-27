-- Noggin — control center: Gut Reset plan state, self-feeding activity, project aliases.
-- Applied to project uvvjzhpzoqeuumvxnpcf on 2026-10-27. Do not re-apply.

-- Folder and repo names that map work to a card ("sales-arena", "higgs-game_dev").
alter table cards add column aliases text[] not null default '{}';
create index cards_aliases on cards using gin (aliases);

-- Raw work events written by the feed: one row per GitHub push (ref = head sha)
-- and one per Claude Code session (ref = session id, updated each turn).
create table activity (
  id uuid primary key default gen_random_uuid(),
  owner uuid not null references auth.users(id),
  card_id uuid references cards(id) on delete set null,
  source text not null check (source in ('git','claude')),
  ref text not null,
  project_key text,
  title text not null,
  body text,
  happened_at timestamptz not null default now(),
  created_at timestamptz default now(),
  unique (source, ref)
);
create index activity_card_happened on activity(card_id, happened_at desc);
create index activity_happened on activity(happened_at desc);

-- Day plans (lib/plans/*). The schedule lives in code; only Dan's state is stored.
create table plan_ticks (
  owner uuid not null references auth.users(id),
  plan text not null,
  day date not null,
  item text not null,
  created_at timestamptz default now(),
  primary key (owner, plan, day, item)
);

create table plan_days (
  owner uuid not null references auth.users(id),
  plan text not null,
  day date not null,
  rough boolean not null default false,
  primary key (owner, plan, day)
);

create table plan_checkins (
  owner uuid not null references auth.users(id),
  plan text not null,
  week int not null,
  scores jsonb not null,
  created_at timestamptz default now(),
  primary key (owner, plan, week)
);

create table plan_settings (
  owner uuid not null references auth.users(id),
  plan text not null,
  settings jsonb not null default '{}',
  primary key (owner, plan)
);

do $$ declare t text; begin
  foreach t in array array['activity','plan_ticks','plan_days','plan_checkins','plan_settings'] loop
    execute format('alter table %I enable row level security', t);
    execute format('create policy %I_owner on %I for all using (owner = auth.uid()) with check (owner = auth.uid())', t, t);
  end loop;
end $$;

-- A project is quiet only when it has neither log entries nor feed activity in 7 days.
create or replace view v_quiet_cards with (security_invoker = true) as
  select c.* from cards c
  where c.kind = 'project' and c.status in ('planning','building','ongoing')
    and not exists (select 1 from log_entries l where l.card_id = c.id and l.created_at > now() - interval '7 days')
    and not exists (select 1 from activity a where a.card_id = c.id and a.happened_at > now() - interval '7 days');
