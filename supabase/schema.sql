-- Ursinho Aventura: shared ranking, admin settings and player hearts.
-- Run in Supabase: Dashboard → SQL Editor → New query → paste → Run.
-- Specs: docs/specs/ranking-supabase.md, docs/specs/admin-config.md

-- ───────────── ranking: one row per finished 3-phase run ─────────────
create table if not exists public.ranking (
  id uuid primary key default gen_random_uuid(),
  name text not null check (char_length(btrim(name)) between 1 and 20),
  bear text not null check (bear in ('menino', 'menina')),
  difficulty text not null default 'normal'
    check (difficulty in ('facil', 'normal', 'dificil')),
  -- 1s..1h: rejects obviously forged times sent straight to the API.
  time_ms integer not null check (time_ms between 1000 and 3600000),
  hearts smallint not null default 0 check (hearts between 0 and 100),
  created_at timestamptz not null default now()
);
alter table public.ranking add column if not exists difficulty text not null default 'normal'
  check (difficulty in ('facil', 'normal', 'dificil'));
create index if not exists ranking_difficulty_time_idx on public.ranking (difficulty, time_ms);

-- The browser uses the public key, so RLS is the only guard: anonymous visitors may
-- read and add results, never change or delete them.
alter table public.ranking enable row level security;
drop policy if exists ranking_public_read on public.ranking;
create policy ranking_public_read on public.ranking
  for select to anon, authenticated using (true);
drop policy if exists ranking_public_insert on public.ranking;
create policy ranking_public_insert on public.ranking
  for insert to anon, authenticated with check (true);
revoke all on public.ranking from anon, authenticated;
grant select, insert on public.ranking to anon, authenticated;

-- Best time per player per difficulty. security_invoker makes the view obey the table's
-- RLS instead of running with the owner's rights.
drop view if exists public.ranking_best;
create view public.ranking_best with (security_invoker = true) as
select distinct on (difficulty, lower(name)) name, bear, difficulty, time_ms, hearts, created_at
from public.ranking
order by difficulty, lower(name), time_ms asc;
grant select on public.ranking_best to anon, authenticated;

-- ───────────── phase_results: one row per finished phase ─────────────
create table if not exists public.phase_results (
  id uuid primary key default gen_random_uuid(),
  name text not null check (char_length(btrim(name)) between 1 and 20),
  bear text not null check (bear in ('menino', 'menina')),
  phase smallint not null check (phase between 0 and 2),
  hearts smallint not null check (hearts between 0 and 50),
  created_at timestamptz not null default now()
);
create index if not exists phase_results_name_idx on public.phase_results (lower(name), phase);
alter table public.phase_results enable row level security;
drop policy if exists phase_results_public_read on public.phase_results;
create policy phase_results_public_read on public.phase_results
  for select to anon, authenticated using (true);
drop policy if exists phase_results_public_insert on public.phase_results;
create policy phase_results_public_insert on public.phase_results
  for insert to anon, authenticated with check (true);
revoke all on public.phase_results from anon, authenticated;
grant select, insert on public.phase_results to anon, authenticated;

-- Hearts a player "owns": best result in each phase, summed — replaying a phase
-- cannot inflate it.
drop view if exists public.player_hearts;
create view public.player_hearts with (security_invoker = true) as
select min(name) as name, sum(best)::int as hearts, count(*)::int as phases
from (
  select distinct on (lower(name), phase) name, phase, hearts as best
  from public.phase_results
  order by lower(name), phase, hearts desc
) per_phase
group by lower(name);
grant select on public.player_hearts to anon, authenticated;

-- ───────────── admin: only Rebeca may change settings ─────────────
-- Membership table instead of "any authenticated user": public sign-up may be on.
create table if not exists public.admins (
  user_id uuid primary key references auth.users (id) on delete cascade
);
alter table public.admins enable row level security;
revoke all on public.admins from anon, authenticated;

create table if not exists public.settings (
  id smallint primary key default 1 check (id = 1),
  difficulty text not null default 'normal'
    check (difficulty in ('facil', 'normal', 'dificil')),
  updated_at timestamptz not null default now()
);
insert into public.settings (id) values (1) on conflict (id) do nothing;
alter table public.settings enable row level security;
drop policy if exists settings_public_read on public.settings;
create policy settings_public_read on public.settings
  for select to anon, authenticated using (true);
-- SECURITY DEFINER so the policy can consult admins while admins itself stays
-- unreadable to every API role (a plain subquery would need GRANT SELECT on admins).
create or replace function public.is_admin() returns boolean
language sql stable security definer set search_path = '' as $$
  select exists (select 1 from public.admins a where a.user_id = auth.uid());
$$;
revoke all on function public.is_admin() from public, anon;
grant execute on function public.is_admin() to authenticated;

drop policy if exists settings_admin_update on public.settings;
create policy settings_admin_update on public.settings
  for update to authenticated
  using (public.is_admin())
  with check (public.is_admin());
revoke all on public.settings from anon, authenticated;
grant select on public.settings to anon, authenticated;
grant update (difficulty, updated_at) on public.settings to authenticated;

-- After creating Rebeca's user (Authentication → Users → Add user), register her:
-- insert into public.admins (user_id)
--   select id from auth.users where email = '<e-mail da Rebeca>';

-- LGPD retention: wipe the children's nicknames when the fair ends.
-- delete from public.ranking; delete from public.phase_results;
