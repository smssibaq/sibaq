-- Badminton MVP (owner: dev_a). Based on supabase/templates/sport_module_template.sql.
-- Objects: badminton_games, badminton_rsvps, badminton_pairs and their RPCs.

-- 1. Game details (1:1 with public.games). Capacity is derived from the format.
create table if not exists public.badminton_games (
  id uuid primary key,
  sport text not null default 'badminton' check (sport = 'badminton'),
  format text not null default 'doubles' check (format in ('singles', 'doubles')),
  capacity integer generated always as (case when format = 'singles' then 2 else 4 end) stored,
  court text,
  skill_level text,
  result_score text check (result_score is null or char_length(result_score) <= 60),
  winner_side text check (winner_side is null or winner_side in ('A', 'B')),
  result_recorded_at timestamptz,
  created_at timestamptz not null default now(),
  constraint fk_badminton_games_game foreign key (id, sport)
    references public.games(id, sport) on delete cascade
);

-- 2. Confirmations
create table if not exists public.badminton_rsvps (
  game_id uuid not null references public.badminton_games(id) on delete cascade,
  user_id uuid not null references public.profiles(id) on delete cascade,
  status text not null check (status in ('in', 'maybe', 'out')),
  updated_at timestamptz not null default now(),
  primary key (game_id, user_id)
);
create index if not exists badminton_rsvps_user_idx on public.badminton_rsvps(user_id);

-- 3. Organize: sides A / B
create table if not exists public.badminton_pairs (
  game_id uuid not null references public.badminton_games(id) on delete cascade,
  side text not null check (side in ('A', 'B')),
  user_id uuid not null references public.profiles(id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (game_id, user_id)
);
create index if not exists badminton_pairs_user_idx on public.badminton_pairs(user_id);

alter table public.badminton_games enable row level security;
alter table public.badminton_rsvps enable row level security;
alter table public.badminton_pairs enable row level security;

drop policy if exists "badminton games visible to viewers" on public.badminton_games;
create policy "badminton games visible to viewers"
  on public.badminton_games for select to authenticated
  using (public.can_view_game(id, (select auth.uid())));

drop policy if exists "badminton rsvps visible to viewers" on public.badminton_rsvps;
create policy "badminton rsvps visible to viewers"
  on public.badminton_rsvps for select to authenticated
  using (public.can_view_game(game_id, (select auth.uid())));

drop policy if exists "badminton pairs visible to viewers" on public.badminton_pairs;
create policy "badminton pairs visible to viewers"
  on public.badminton_pairs for select to authenticated
  using (public.can_view_game(game_id, (select auth.uid())));
-- No direct write policies: writes go through the RPCs below.

-- 4. Required interface function
create or replace function public.badminton_confirmed_players(p_game uuid)
returns setof uuid
language sql
security definer
set search_path = public
stable
as $$
  select user_id from public.badminton_rsvps where game_id = p_game and status = 'in';
$$;

-- 5. RPCs
create or replace function public.badminton_create_game(
  p_squad uuid,
  p_title text,
  p_venue text,
  p_starts_at timestamptz,
  p_format text default 'doubles',
  p_court text default null,
  p_skill_level text default null
) returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_id uuid;
begin
  if auth.uid() is null then
    raise exception 'Unauthenticated' using errcode = '42501';
  end if;
  if p_format not in ('singles', 'doubles') then
    raise exception 'Invalid format' using errcode = '22023';
  end if;
  v_id := public.create_game('badminton', p_squad, p_title, p_venue, p_starts_at);
  insert into public.badminton_games (id, format, court, skill_level)
  values (v_id, p_format,
          nullif(trim(coalesce(p_court, '')), ''),
          nullif(trim(coalesce(p_skill_level, '')), ''));
  return v_id;
end;
$$;

create or replace function public.badminton_set_rsvp(p_game uuid, p_status text)
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
  if p_status not in ('in', 'maybe', 'out') then
    raise exception 'Invalid status' using errcode = '22023';
  end if;
  if not public.can_view_game(p_game, v_uid) then
    raise exception 'Forbidden' using errcode = '42501';
  end if;

  select capacity into v_cap from public.badminton_games where id = p_game for update;
  if v_cap is null then
    raise exception 'Game not found' using errcode = 'P0002';
  end if;

  if p_status = 'in' then
    select count(*) into v_in from public.badminton_rsvps
    where game_id = p_game and status = 'in' and user_id <> v_uid;
    if v_in >= v_cap then
      raise exception 'GAME_FULL' using errcode = '23514';
    end if;
  else
    -- No longer confirmed: drop them from the pairing.
    delete from public.badminton_pairs where game_id = p_game and user_id = v_uid;
  end if;

  perform public.ensure_profile(v_uid);

  insert into public.badminton_rsvps (game_id, user_id, status)
  values (p_game, v_uid, p_status)
  on conflict (game_id, user_id) do update set status = excluded.status, updated_at = now();
end;
$$;

create or replace function public.badminton_set_pairs(p_game uuid, p_side_a uuid[], p_side_b uuid[])
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_uid uuid := auth.uid();
  v_format text;
  v_per_side integer;
  v_a uuid[] := coalesce(p_side_a, '{}');
  v_b uuid[] := coalesce(p_side_b, '{}');
begin
  if v_uid is null then
    raise exception 'Unauthenticated' using errcode = '42501';
  end if;
  if not public.is_game_organizer(p_game, v_uid) then
    raise exception 'Forbidden: organizer only' using errcode = '42501';
  end if;

  select format into v_format from public.badminton_games where id = p_game for update;
  if v_format is null then
    raise exception 'Game not found' using errcode = 'P0002';
  end if;
  v_per_side := case when v_format = 'singles' then 1 else 2 end;

  if cardinality(v_a) > v_per_side or cardinality(v_b) > v_per_side then
    raise exception 'Too many players per side (max %)', v_per_side using errcode = '23514';
  end if;
  if (select count(distinct x) from unnest(v_a || v_b) x) <> cardinality(v_a || v_b) then
    raise exception 'A player can only be on one side' using errcode = '23514';
  end if;
  if exists (
    select 1 from unnest(v_a || v_b) x
    where x not in (select public.badminton_confirmed_players(p_game))
  ) then
    raise exception 'Only confirmed players can be paired' using errcode = '23514';
  end if;

  delete from public.badminton_pairs where game_id = p_game;
  insert into public.badminton_pairs (game_id, side, user_id)
  select p_game, 'A', x from unnest(v_a) x
  union all
  select p_game, 'B', x from unnest(v_b) x;
end;
$$;

create or replace function public.badminton_record_result(p_game uuid, p_score text, p_winner_side text)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_uid uuid := auth.uid();
begin
  if v_uid is null then
    raise exception 'Unauthenticated' using errcode = '42501';
  end if;
  if not public.is_game_organizer(p_game, v_uid) then
    raise exception 'Forbidden: organizer only' using errcode = '42501';
  end if;
  if p_winner_side is not null and p_winner_side not in ('A', 'B') then
    raise exception 'Invalid winner side' using errcode = '22023';
  end if;

  update public.badminton_games
  set result_score = nullif(trim(coalesce(p_score, '')), ''),
      winner_side = p_winner_side,
      result_recorded_at = case when p_winner_side is null and nullif(trim(coalesce(p_score, '')), '') is null
                                then null else now() end
  where id = p_game;
  if not found then
    raise exception 'Game not found' using errcode = 'P0002';
  end if;
end;
$$;

revoke all on function public.badminton_confirmed_players(uuid) from public, anon, authenticated;
revoke all on function public.badminton_create_game(uuid, text, text, timestamptz, text, text, text) from public, anon;
revoke all on function public.badminton_set_rsvp(uuid, text) from public, anon;
revoke all on function public.badminton_set_pairs(uuid, uuid[], uuid[]) from public, anon;
revoke all on function public.badminton_record_result(uuid, text, text) from public, anon;
grant execute on function public.badminton_create_game(uuid, text, text, timestamptz, text, text, text) to authenticated;
grant execute on function public.badminton_set_rsvp(uuid, text) to authenticated;
grant execute on function public.badminton_set_pairs(uuid, uuid[], uuid[]) to authenticated;
grant execute on function public.badminton_record_result(uuid, text, text) to authenticated;

-- 6. Register
update public.sports
set game_table = 'public.badminton_games',
    confirmed_players_fn = 'public.badminton_confirmed_players(uuid)',
    is_enabled = true
where key = 'badminton';

-- 7. Realtime for live RSVP counts and pairs
do $$
begin
  if exists (select 1 from pg_publication where pubname = 'supabase_realtime') then
    if not exists (select 1 from pg_publication_tables
                   where pubname = 'supabase_realtime' and schemaname = 'public' and tablename = 'badminton_rsvps') then
      alter publication supabase_realtime add table public.badminton_rsvps;
    end if;
    if not exists (select 1 from pg_publication_tables
                   where pubname = 'supabase_realtime' and schemaname = 'public' and tablename = 'badminton_pairs') then
      alter publication supabase_realtime add table public.badminton_pairs;
    end if;
  end if;
end $$;

-- 8. Ledger
insert into ops.change_ledger (migration_name, owner, sport, objects, description)
values ('badminton_core', 'dev_a', 'badminton',
  '{badminton_games,badminton_rsvps,badminton_pairs,badminton_confirmed_players,badminton_create_game,badminton_set_rsvp,badminton_set_pairs,badminton_record_result}',
  'Badminton MVP: singles/doubles games, RSVPs with capacity, pairs, result, registration')
on conflict (migration_name) do nothing;
