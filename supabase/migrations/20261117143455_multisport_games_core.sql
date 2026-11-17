-- =============================================================================
-- Migration: 20261117143455_multisport_games_core   owner: platform
-- Description: Shared multi-sport foundation. Every sport (football, badminton,
--   cricket, volleyball, ...) registers in public.sports and every playable
--   game gets one row in public.games. Sport modules keep their own
--   <sport>_* tables keyed 1:1 to games(id, sport), and expose two standard
--   functions so shared features (ratings, expenses, ...) work for all sports:
--     <sport>_confirmed_players(p_game uuid) returns setof uuid
--     <sport>_is_organizer(p_game uuid, p_user uuid) returns boolean
--   Football is wired in without changing its existing tables or RPCs.
-- =============================================================================

-- 0. CHANGE LEDGER (private schema, not exposed through the REST API)
create schema if not exists ops;
revoke all on schema ops from public, anon, authenticated;

create table if not exists ops.change_ledger (
  id bigint generated always as identity primary key,
  migration_name text not null unique,
  owner text not null,            -- 'platform', 'dev_a', 'dev_b', 'dev_c'
  sport text,                     -- null = shared / platform change
  objects text[] not null default '{}',
  description text not null,
  recorded_at timestamptz not null default now()
);

insert into ops.change_ledger (migration_name, owner, sport, objects, description) values
  ('initial_profiles_and_roles', 'platform', null, '{profiles,user_roles,is_admin}', 'Profiles, roles, admin helper'),
  ('sample_items_demo', 'platform', null, '{sample_items}', 'Starter demo table'),
  ('storage_user_files', 'platform', null, '{storage:user-files}', 'Private user-files bucket'),
  ('turf_xi_core_schema', 'platform', 'football', '{squads,squad_members,squad_invitations,matches,match_attendance,teams,team_players,squad_audit}', 'Football core schema'),
  ('squad_management_enhancements', 'platform', null, '{update_squad_settings,revoke_squad_invite}', 'Squad settings and invites'),
  ('smart_rsvp_and_waitlist', 'platform', 'football', '{match_waitlist,create_match,update_match,set_attendance}', 'RSVP deadlines and waitlist'),
  ('enforce_single_goalkeeper_per_team', 'platform', 'football', '{team_players,assign_team_player,save_team_formation}', 'Single goalkeeper rule'),
  ('fix_invitations_and_roles', 'platform', null, '{create_squad_invite,join_squad_by_invite}', 'Invite tokens'),
  ('strict_team_player_isolation', 'platform', 'football', '{team_players}', 'One team per player per match'),
  ('fix_lineup_save_authorization_and_positions', 'platform', 'football', '{save_team_formation}', 'Lineup save auth'),
  ('dynamic_match_formation_by_level', 'platform', 'football', '{create_match}', 'Formation by format'),
  ('squad_rpcs_and_rls_fixes', 'platform', null, '{create_squad,join_squad,approve_member,set_member_role,remove_squad_member,transfer_squad_owner,remove_team_player,storage:avatars}', 'Missing squad RPCs, RLS recursion fix'),
  ('harden_rpc_authorization', 'platform', null, '{rpc grants}', 'Non-member auth bypass fix, anon revokes')
on conflict (migration_name) do nothing;

-- 1. SPORT REGISTRY
create table if not exists public.sports (
  key text primary key check (key ~ '^[a-z][a-z0-9_]{1,30}$'),
  name text not null,
  owner text not null,
  game_table regclass,                  -- the sport's own game table (e.g. public.badminton_games)
  confirmed_players_fn regprocedure,    -- (uuid) -> setof uuid
  organizer_check_fn regprocedure,      -- (uuid, uuid) -> boolean
  is_team_sport boolean not null default true,
  min_players integer check (min_players is null or min_players >= 1),
  max_players integer check (max_players is null or max_players >= coalesce(min_players, 1)),
  is_enabled boolean not null default false,
  sort_order integer not null default 100,
  created_at timestamptz not null default now()
);

alter table public.sports enable row level security;
drop policy if exists "Sports readable by everyone signed in" on public.sports;
create policy "Sports readable by everyone signed in"
  on public.sports for select to authenticated using (true);

-- Registered functions must have the agreed signatures
create or replace function public.validate_sport_registration()
returns trigger
language plpgsql
set search_path = public
as $$
declare
  v_ret text;
begin
  if new.confirmed_players_fn is not null then
    select pg_get_function_result(new.confirmed_players_fn::oid) into v_ret;
    if pg_get_function_identity_arguments(new.confirmed_players_fn::oid) !~ '^(p_\w+ )?uuid$' or v_ret <> 'SETOF uuid' then
      raise exception 'confirmed_players_fn for % must be (uuid) returns setof uuid, got (%) returns %',
        new.key, pg_get_function_identity_arguments(new.confirmed_players_fn::oid), v_ret;
    end if;
  end if;
  if new.organizer_check_fn is not null then
    select pg_get_function_result(new.organizer_check_fn::oid) into v_ret;
    if pg_get_function_identity_arguments(new.organizer_check_fn::oid) !~ '^(p_\w+ )?uuid, (p_\w+ )?uuid$' or v_ret <> 'boolean' then
      raise exception 'organizer_check_fn for % must be (uuid, uuid) returns boolean', new.key;
    end if;
  end if;
  return new;
end;
$$;

drop trigger if exists trg_validate_sport_registration on public.sports;
create trigger trg_validate_sport_registration
  before insert or update on public.sports
  for each row execute function public.validate_sport_registration();

-- 2. SHARED GAMES TABLE
create table if not exists public.games (
  id uuid primary key default gen_random_uuid(),
  sport text not null references public.sports(key),
  squad_id uuid references public.squads(id) on delete cascade,
  title text not null check (length(trim(title)) >= 1),
  venue text,
  starts_at timestamptz not null,
  status text not null default 'scheduled'
    check (status in ('scheduled', 'in_progress', 'completed', 'cancelled')),
  created_by uuid not null references public.profiles(id) on delete cascade,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint uq_games_id_sport unique (id, sport)   -- target for (game_id, sport) foreign keys
);

create index if not exists idx_games_sport_starts on public.games(sport, starts_at);
create index if not exists idx_games_squad on public.games(squad_id);
create index if not exists idx_games_created_by on public.games(created_by);

alter table public.games enable row level security;

drop policy if exists "Games visible to squad members and creator" on public.games;
create policy "Games visible to squad members and creator"
  on public.games for select to authenticated
  using (
    created_by = (select auth.uid())
    or (squad_id is not null and public.is_squad_member(squad_id, (select auth.uid())))
  );
-- No direct writes: games are created/updated only by sport RPCs (SECURITY DEFINER)
-- through public.create_game / public.update_game_core, or by the football triggers.

-- Squads are shared groups for every sport; remember the group's main sport for the UI
alter table public.squads add column if not exists default_sport text not null default 'football';

-- 3. SEED SPORTS
insert into public.sports (key, name, owner, is_team_sport, min_players, max_players, is_enabled, sort_order) values
  ('football',   'Football',   'platform', true,  6, 22, true,  10),
  ('badminton',  'Badminton',  'dev_a',    false, 2, 4,  false, 20),
  ('cricket',    'Cricket',    'dev_b',    true,  4, 22, false, 30),
  ('volleyball', 'Volleyball', 'dev_c',    true,  4, 12, false, 40)
on conflict (key) do nothing;

alter table public.squads drop constraint if exists squads_default_sport_fkey;
alter table public.squads add constraint squads_default_sport_fkey
  foreign key (default_sport) references public.sports(key);

-- 4. CORE HELPERS FOR SPORT RPCS (call these from your SECURITY DEFINER RPCs)
create or replace function public.create_game(
  p_sport text,
  p_squad uuid,
  p_title text,
  p_venue text,
  p_starts_at timestamptz
) returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_uid uuid := auth.uid();
  v_id uuid;
begin
  if v_uid is null then
    raise exception 'Unauthenticated' using errcode = '42501';
  end if;
  if not exists (select 1 from public.sports where key = p_sport) then
    raise exception 'Unknown sport %', p_sport using errcode = '23503';
  end if;
  if p_squad is not null and not public.is_squad_manager(p_squad, v_uid) then
    raise exception 'Forbidden: Only squad owner or admin can create games' using errcode = '42501';
  end if;
  if p_starts_at <= now() then
    raise exception 'Game must be scheduled in the future' using errcode = '23514';
  end if;

  perform public.ensure_profile(v_uid);

  insert into public.games (sport, squad_id, title, venue, starts_at, created_by)
  values (p_sport, p_squad, trim(p_title), nullif(trim(coalesce(p_venue, '')), ''), p_starts_at, v_uid)
  returning id into v_id;

  if p_squad is not null then
    insert into public.squad_audit (squad_id, actor_id, action, details)
    values (p_squad, v_uid, 'game_created', jsonb_build_object('game_id', v_id, 'sport', p_sport, 'title', trim(p_title)));
  end if;

  return v_id;
end;
$$;

create or replace function public.update_game_core(
  p_game uuid,
  p_title text default null,
  p_venue text default null,
  p_starts_at timestamptz default null,
  p_status text default null
) returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  if not public.is_game_organizer(p_game, auth.uid()) then
    raise exception 'Forbidden: Only the game organizer can update it' using errcode = '42501';
  end if;
  update public.games
  set title = coalesce(nullif(trim(p_title), ''), title),
      venue = coalesce(p_venue, venue),
      starts_at = coalesce(p_starts_at, starts_at),
      status = coalesce(p_status, status),
      updated_at = now()
  where id = p_game;
end;
$$;

-- 5. STANDARD CROSS-SPORT INTERFACE (used by ratings, expenses, sport navigation)
create or replace function public.game_sport(p_game uuid)
returns text
language sql
security definer
set search_path = public
stable
as $$
  select sport from public.games where id = p_game;
$$;

create or replace function public.is_game_organizer(p_game uuid, p_user uuid)
returns boolean
language plpgsql
security definer
set search_path = public
stable
as $$
declare
  g record;
  v_fn regprocedure;
  v_ok boolean;
begin
  if p_user is null then
    return false;
  end if;
  select * into g from public.games where id = p_game;
  if g.id is null then
    return false;
  end if;

  select organizer_check_fn into v_fn from public.sports where key = g.sport;
  if v_fn is not null then
    execute format('select %s($1, $2)', v_fn::regproc) into v_ok using p_game, p_user;
    if coalesce(v_ok, false) then
      return true;
    end if;
  end if;

  -- Default rule for every sport: creator, or owner/admin of the hosting squad
  return g.created_by = p_user
      or (g.squad_id is not null and public.is_squad_manager(g.squad_id, p_user));
end;
$$;

create or replace function public.game_confirmed_players(p_game uuid)
returns setof uuid
language plpgsql
security definer
set search_path = public
stable
as $$
declare
  v_fn regprocedure;
begin
  select s.confirmed_players_fn into v_fn
  from public.games g join public.sports s on s.key = g.sport
  where g.id = p_game;

  if v_fn is null then
    return;
  end if;
  return query execute format('select distinct x from %s($1) as x', v_fn::regproc) using p_game;
end;
$$;

create or replace function public.is_game_participant(p_game uuid, p_user uuid)
returns boolean
language sql
security definer
set search_path = public
stable
as $$
  select p_user is not null and exists (
    select 1 from public.game_confirmed_players(p_game) as x where x = p_user
  );
$$;

create or replace function public.can_view_game(p_game uuid, p_user uuid)
returns boolean
language sql
security definer
set search_path = public
stable
as $$
  select exists (
    select 1 from public.games g
    where g.id = p_game
      and (
        g.created_by = p_user
        or (g.squad_id is not null and public.is_squad_member(g.squad_id, p_user))
      )
  ) or public.is_game_participant(p_game, p_user);
$$;

-- Client-facing summary for any game (sport-agnostic UI, ratings, expenses)
create or replace function public.get_game_context(p_game uuid)
returns table (
  game_id uuid,
  sport text,
  squad_id uuid,
  title text,
  venue text,
  starts_at timestamptz,
  status text,
  is_organizer boolean,
  is_participant boolean,
  confirmed_count integer
)
language plpgsql
security definer
set search_path = public
stable
as $$
declare
  v_uid uuid := auth.uid();
begin
  if not public.can_view_game(p_game, v_uid) then
    raise exception 'Forbidden' using errcode = '42501';
  end if;
  return query
  select g.id, g.sport, g.squad_id, g.title, g.venue, g.starts_at, g.status,
         public.is_game_organizer(g.id, v_uid),
         public.is_game_participant(g.id, v_uid),
         (select count(*)::int from public.game_confirmed_players(g.id))
  from public.games g
  where g.id = p_game;
end;
$$;

-- 6. FOOTBALL ADAPTER: matches become football games, no change to football RPCs
alter table public.matches add column if not exists sport text not null default 'football';
alter table public.matches drop constraint if exists chk_matches_sport_football;
alter table public.matches add constraint chk_matches_sport_football check (sport = 'football');

create or replace function public.football_sync_game()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if tg_op = 'INSERT' then
    insert into public.games (id, sport, squad_id, title, venue, starts_at, status, created_by, created_at)
    values (new.id, 'football', new.squad_id, new.title, new.turf_name, new.starts_at, new.status, new.created_by, new.created_at)
    on conflict (id) do nothing;
    return new;
  elsif tg_op = 'UPDATE' then
    update public.games
    set title = new.title,
        venue = new.turf_name,
        starts_at = new.starts_at,
        status = new.status,
        squad_id = new.squad_id,
        updated_at = now()
    where id = new.id;
    return new;
  else
    delete from public.games where id = old.id;
    return old;
  end if;
end;
$$;

drop trigger if exists trg_football_game_insert on public.matches;
create trigger trg_football_game_insert
  before insert on public.matches
  for each row execute function public.football_sync_game();

drop trigger if exists trg_football_game_update on public.matches;
create trigger trg_football_game_update
  after update of title, turf_name, starts_at, status, squad_id on public.matches
  for each row execute function public.football_sync_game();

drop trigger if exists trg_football_game_delete on public.matches;
create trigger trg_football_game_delete
  after delete on public.matches
  for each row execute function public.football_sync_game();

-- Backfill any existing matches, then enforce the (id, sport) link
insert into public.games (id, sport, squad_id, title, venue, starts_at, status, created_by, created_at)
select m.id, 'football', m.squad_id, m.title, m.turf_name, m.starts_at, m.status, m.created_by, m.created_at
from public.matches m
on conflict (id) do nothing;

alter table public.matches drop constraint if exists fk_matches_game;
alter table public.matches add constraint fk_matches_game
  foreign key (id, sport) references public.games(id, sport) on delete cascade;

create or replace function public.football_confirmed_players(p_game uuid)
returns setof uuid
language sql
security definer
set search_path = public
stable
as $$
  select user_id from public.match_attendance where match_id = p_game and status = 'playing'
  union
  select user_id from public.team_players where match_id = p_game;
$$;

create or replace function public.football_is_organizer(p_game uuid, p_user uuid)
returns boolean
language sql
security definer
set search_path = public
stable
as $$
  select exists (
    select 1 from public.matches m
    where m.id = p_game
      and (m.created_by = p_user or public.is_squad_manager(m.squad_id, p_user))
  );
$$;

update public.sports
set game_table = 'public.matches'::regclass,
    confirmed_players_fn = 'public.football_confirmed_players(uuid)'::regprocedure,
    organizer_check_fn = 'public.football_is_organizer(uuid, uuid)'::regprocedure
where key = 'football';

-- 7. GRANTS: helpers are internal, only the context reader is callable by clients
revoke all on function public.create_game(text, uuid, text, text, timestamptz) from public, anon, authenticated;
revoke all on function public.update_game_core(uuid, text, text, timestamptz, text) from public, anon, authenticated;
revoke all on function public.football_sync_game() from public, anon, authenticated;
revoke all on function public.validate_sport_registration() from public, anon, authenticated;
revoke all on function public.football_confirmed_players(uuid) from public, anon, authenticated;
revoke all on function public.football_is_organizer(uuid, uuid) from public, anon, authenticated;
revoke all on function public.game_confirmed_players(uuid) from public, anon, authenticated;
revoke all on function public.game_sport(uuid) from public, anon;
revoke all on function public.is_game_organizer(uuid, uuid) from public, anon;
revoke all on function public.is_game_participant(uuid, uuid) from public, anon;
revoke all on function public.can_view_game(uuid, uuid) from public, anon;
revoke all on function public.get_game_context(uuid) from public, anon;

grant execute on function public.game_sport(uuid) to authenticated;
grant execute on function public.is_game_organizer(uuid, uuid) to authenticated;
grant execute on function public.is_game_participant(uuid, uuid) to authenticated;
grant execute on function public.can_view_game(uuid, uuid) to authenticated;
grant execute on function public.get_game_context(uuid) to authenticated;

-- 8. REALTIME
do $$
begin
  if exists (select 1 from pg_publication where pubname = 'supabase_realtime')
     and not exists (select 1 from pg_publication_tables
                     where pubname = 'supabase_realtime' and schemaname = 'public' and tablename = 'games') then
    alter publication supabase_realtime add table public.games;
  end if;
end $$;

-- 9. LEDGER
insert into ops.change_ledger (migration_name, owner, sport, objects, description)
values ('multisport_games_core', 'platform', null,
  '{ops.change_ledger,sports,games,squads.default_sport,matches.sport,create_game,update_game_core,game_sport,is_game_organizer,game_confirmed_players,is_game_participant,can_view_game,get_game_context,football_confirmed_players,football_is_organizer}',
  'Multi-sport foundation: sport registry, shared games table, cross-sport interface, football adapter, change ledger')
on conflict (migration_name) do nothing;
