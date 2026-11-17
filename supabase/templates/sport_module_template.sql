-- =============================================================================
-- TEMPLATE: new sport module. NOT a migration — copy it, then replace
--   __SPORT__  with your sport key (badminton | cricket | volleyball)
--   __OWNER__  with dev_a | dev_b | dev_c
-- Keep only objects prefixed __SPORT___ (plus the sports row for your key).
-- Apply through Supabase MCP apply_migration (name: __SPORT___<what>), then save
-- the file as supabase/migrations/<version from list_migrations>___SPORT___<what>.sql
-- =============================================================================

-- 1. Sport-specific game details, 1:1 with public.games (sport is pinned)
create table if not exists public.__SPORT___games (
  id uuid primary key,
  sport text not null default '__SPORT__' check (sport = '__SPORT__'),
  capacity integer not null default 4 check (capacity between 2 and 30),
  -- add sport-specific columns here (format, overs, sets_to_win, court_no ...)
  created_at timestamptz not null default now(),
  constraint fk___SPORT___games_game foreign key (id, sport)
    references public.games(id, sport) on delete cascade
);

-- 2. Confirmations (Create -> Invite -> Confirm)
create table if not exists public.__SPORT___rsvps (
  game_id uuid not null references public.__SPORT___games(id) on delete cascade,
  user_id uuid not null references public.profiles(id) on delete cascade,
  status text not null check (status in ('in', 'maybe', 'out')),
  updated_at timestamptz not null default now(),
  primary key (game_id, user_id)
);

alter table public.__SPORT___games enable row level security;
alter table public.__SPORT___rsvps enable row level security;

drop policy if exists "__SPORT__ games visible to viewers" on public.__SPORT___games;
create policy "__SPORT__ games visible to viewers"
  on public.__SPORT___games for select to authenticated
  using (public.can_view_game(id, (select auth.uid())));

drop policy if exists "__SPORT__ rsvps visible to viewers" on public.__SPORT___rsvps;
create policy "__SPORT__ rsvps visible to viewers"
  on public.__SPORT___rsvps for select to authenticated
  using (public.can_view_game(game_id, (select auth.uid())));
-- No direct write policies: all writes go through the RPCs below.

-- 3. REQUIRED interface function: confirmed players (used by ratings & expenses)
create or replace function public.__SPORT___confirmed_players(p_game uuid)
returns setof uuid
language sql
security definer
set search_path = public
stable
as $$
  select user_id from public.__SPORT___rsvps where game_id = p_game and status = 'in';
$$;

-- 4. OPTIONAL interface function: extra organizer rule (creator and squad
--    owner/admin are always organizers by default). Delete if not needed.
-- create or replace function public.__SPORT___is_organizer(p_game uuid, p_user uuid)
-- returns boolean language sql security definer set search_path = public stable
-- as $$ select false $$;

-- 5. RPCs
create or replace function public.__SPORT___create_game(
  p_squad uuid,
  p_title text,
  p_venue text,
  p_starts_at timestamptz,
  p_capacity integer default 4
) returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_id uuid;
begin
  v_id := public.create_game('__SPORT__', p_squad, p_title, p_venue, p_starts_at);  -- checks auth + squad manager
  insert into public.__SPORT___games (id, capacity) values (v_id, p_capacity);
  return v_id;
end;
$$;

create or replace function public.__SPORT___set_rsvp(p_game uuid, p_status text)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_uid uuid := auth.uid();
  v_cap integer;
  v_in integer;
begin
  if v_uid is null then
    raise exception 'Unauthenticated' using errcode = '42501';
  end if;
  if not public.can_view_game(p_game, v_uid) then
    raise exception 'Forbidden' using errcode = '42501';
  end if;

  select capacity into v_cap from public.__SPORT___games where id = p_game for update;
  if v_cap is null then
    raise exception 'Game not found' using errcode = 'P0002';
  end if;

  if p_status = 'in' then
    select count(*) into v_in from public.__SPORT___rsvps
    where game_id = p_game and status = 'in' and user_id <> v_uid;
    if v_in >= v_cap then
      raise exception 'GAME_FULL' using errcode = '23514';
    end if;
  end if;

  insert into public.__SPORT___rsvps (game_id, user_id, status)
  values (p_game, v_uid, p_status)
  on conflict (game_id, user_id) do update set status = excluded.status, updated_at = now();
end;
$$;

revoke all on function public.__SPORT___confirmed_players(uuid) from public, anon, authenticated;
revoke all on function public.__SPORT___create_game(uuid, text, text, timestamptz, integer) from public, anon;
revoke all on function public.__SPORT___set_rsvp(uuid, text) from public, anon;
grant execute on function public.__SPORT___create_game(uuid, text, text, timestamptz, integer) to authenticated;
grant execute on function public.__SPORT___set_rsvp(uuid, text) to authenticated;

-- 6. Register the module (validated by trigger: wrong signatures are rejected)
update public.sports
set game_table = 'public.__SPORT___games',
    confirmed_players_fn = 'public.__SPORT___confirmed_players(uuid)',
    -- organizer_check_fn = 'public.__SPORT___is_organizer(uuid, uuid)',
    is_enabled = true
where key = '__SPORT__';

-- 7. Realtime (optional)
do $$
begin
  if exists (select 1 from pg_publication where pubname = 'supabase_realtime')
     and not exists (select 1 from pg_publication_tables
                     where pubname = 'supabase_realtime' and schemaname = 'public' and tablename = '__SPORT___rsvps') then
    alter publication supabase_realtime add table public.__SPORT___rsvps;
  end if;
end $$;

-- 8. Ledger entry (required in every migration)
insert into ops.change_ledger (migration_name, owner, sport, objects, description)
values ('__SPORT___core', '__OWNER__', '__SPORT__',
  '{__SPORT___games,__SPORT___rsvps,__SPORT___confirmed_players,__SPORT___create_game,__SPORT___set_rsvp}',
  '__SPORT__ MVP: games, RSVPs, registration')
on conflict (migration_name) do nothing;
