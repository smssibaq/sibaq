-- =============================================================================
-- Migration: cricket_core   owner: dev_b
-- Cricket module. Owns only cricket_* objects + the cricket row in public.sports.
-- Same RPC names/args as the frontend on main (commit c0dae07); p_squad is an
-- extra optional arg on cricket_create_game.
-- =============================================================================

-- 1. TABLES
create table if not exists public.cricket_games (
  id                uuid primary key,
  sport             text not null default 'cricket' check (sport = 'cricket'),
  players_per_side  int  not null default 6 check (players_per_side in (5, 6, 7, 8, 11)),
  overs_per_innings int  not null default 0 check (overs_per_innings between 0 and 50),
  invite_code       text not null,
  notes             text check (notes is null or length(notes) <= 500),
  created_at        timestamptz not null default now(),
  constraint cricket_games_invite_code_key unique (invite_code),
  constraint cricket_games_game_fkey foreign key (id, sport)
    references public.games (id, sport) on delete cascade
);

create table if not exists public.cricket_game_players (
  game_id           uuid not null references public.cricket_games (id) on delete cascade,
  user_id           uuid not null references public.profiles (id) on delete cascade,
  attendance_status text not null default 'maybe'
    check (attendance_status in ('playing', 'maybe', 'not_playing')),
  joined_at         timestamptz not null default now(),
  updated_at        timestamptz not null default now(),
  primary key (game_id, user_id)
);
create index if not exists cricket_game_players_user_idx on public.cricket_game_players (user_id);

create table if not exists public.cricket_team_players (
  game_id          uuid not null,
  user_id          uuid not null,
  team_side        text not null check (team_side in ('A', 'B')),
  captain          boolean not null default false,
  wicketkeeper     boolean not null default false,
  batting_position int,
  assigned_at      timestamptz not null default now(),
  primary key (game_id, user_id),
  foreign key (game_id, user_id)
    references public.cricket_game_players (game_id, user_id) on delete cascade
);
create unique index if not exists cricket_one_captain_per_side
  on public.cricket_team_players (game_id, team_side) where captain;
create unique index if not exists cricket_one_wk_per_side
  on public.cricket_team_players (game_id, team_side) where wicketkeeper;

create table if not exists public.cricket_batting_order (
  id               uuid primary key default gen_random_uuid(),
  game_id          uuid not null references public.cricket_games (id) on delete cascade,
  team_side        text not null check (team_side in ('A', 'B')),
  player_id        uuid not null references public.profiles (id) on delete cascade,
  batting_position int  not null check (batting_position >= 1),
  constraint cricket_batting_order_player_unique   unique (game_id, team_side, player_id),
  constraint cricket_batting_order_position_unique unique (game_id, team_side, batting_position)
);

create table if not exists public.cricket_field_positions (
  id            uuid primary key default gen_random_uuid(),
  game_id       uuid not null references public.cricket_games (id) on delete cascade,
  team_side     text not null check (team_side in ('A', 'B')),
  player_id     uuid not null references public.profiles (id) on delete cascade,
  position_name text not null check (length(position_name) between 1 and 40),
  x_pos         numeric,
  y_pos         numeric,
  is_custom     boolean not null default false,
  constraint cricket_field_positions_player_unique unique (game_id, team_side, player_id)
);

create table if not exists public.cricket_toss (
  game_id      uuid primary key references public.cricket_games (id) on delete cascade,
  winning_team text not null check (winning_team in ('A', 'B')),
  decision     text not null check (decision in ('bat', 'bowl')),
  recorded_by  uuid not null references public.profiles (id) on delete cascade,
  recorded_at  timestamptz not null default now()
);

-- 2. HELPERS
create or replace function public.cricket_confirmed_players(p_game uuid)
returns setof uuid
language sql stable security definer set search_path = public as $$
  select user_id from public.cricket_game_players
  where game_id = p_game and attendance_status = 'playing';
$$;

-- creator, anyone who joined (any RSVP), or an active member of the game's squad
create or replace function public.cricket_is_member(p_game uuid, p_user uuid)
returns boolean
language sql stable security definer set search_path = public as $$
  select p_user is not null and (
    exists (select 1 from public.cricket_game_players p where p.game_id = p_game and p.user_id = p_user)
    or exists (select 1 from public.games g where g.id = p_game and g.sport = 'cricket'
               and (g.created_by = p_user
                    or (g.squad_id is not null and public.is_squad_member(g.squad_id, p_user))))
  );
$$;

-- internal: drop a player's lineup data (team, batting order, field position)
create or replace function public.cricket_clear_lineup_internal(p_game uuid, p_user uuid)
returns void
language sql security definer set search_path = public as $$
  delete from public.cricket_team_players    where game_id = p_game and user_id   = p_user;
  delete from public.cricket_batting_order   where game_id = p_game and player_id = p_user;
  delete from public.cricket_field_positions where game_id = p_game and player_id = p_user;
$$;

-- 3. RLS (read-only for clients; writes go through the RPCs)
alter table public.cricket_games           enable row level security;
alter table public.cricket_game_players    enable row level security;
alter table public.cricket_team_players    enable row level security;
alter table public.cricket_batting_order   enable row level security;
alter table public.cricket_field_positions enable row level security;
alter table public.cricket_toss            enable row level security;

drop policy if exists cricket_games_select on public.cricket_games;
create policy cricket_games_select on public.cricket_games
  for select to authenticated using (public.cricket_is_member(id, (select auth.uid())));

drop policy if exists cricket_game_players_select on public.cricket_game_players;
create policy cricket_game_players_select on public.cricket_game_players
  for select to authenticated using (public.cricket_is_member(game_id, (select auth.uid())));

drop policy if exists cricket_team_players_select on public.cricket_team_players;
create policy cricket_team_players_select on public.cricket_team_players
  for select to authenticated using (public.cricket_is_member(game_id, (select auth.uid())));

drop policy if exists cricket_batting_order_select on public.cricket_batting_order;
create policy cricket_batting_order_select on public.cricket_batting_order
  for select to authenticated using (public.cricket_is_member(game_id, (select auth.uid())));

drop policy if exists cricket_field_positions_select on public.cricket_field_positions;
create policy cricket_field_positions_select on public.cricket_field_positions
  for select to authenticated using (public.cricket_is_member(game_id, (select auth.uid())));

drop policy if exists cricket_toss_select on public.cricket_toss;
create policy cricket_toss_select on public.cricket_toss
  for select to authenticated using (public.cricket_is_member(game_id, (select auth.uid())));

revoke all on public.cricket_games, public.cricket_game_players, public.cricket_team_players,
  public.cricket_batting_order, public.cricket_field_positions, public.cricket_toss from anon;
grant select on public.cricket_games, public.cricket_game_players, public.cricket_team_players,
  public.cricket_batting_order, public.cricket_field_positions, public.cricket_toss to authenticated;

-- 4. RPCS
create or replace function public.cricket_create_game(
  p_title            text,
  p_venue            text,
  p_starts_at        timestamptz,
  p_players_per_side int  default 6,
  p_overs            int  default 0,
  p_notes            text default null,
  p_squad            uuid default null
) returns uuid
language plpgsql security definer set search_path = public as $$
declare
  v_uid  uuid := auth.uid();
  v_id   uuid;
  v_code text;
  v_try  int := 0;
begin
  if v_uid is null then
    raise exception 'Unauthenticated' using errcode = '42501';
  end if;
  if p_title is null or length(trim(p_title)) not between 1 and 80 then
    raise exception 'Title must be 1-80 characters' using errcode = '23514';
  end if;
  if p_players_per_side is null or p_players_per_side not in (5, 6, 7, 8, 11) then
    raise exception 'Format must be 5, 6, 7, 8, or 11 players per side' using errcode = '23514';
  end if;
  if p_overs is not null and p_overs not between 0 and 50 then
    raise exception 'Overs must be between 0 and 50' using errcode = '23514';
  end if;
  if p_notes is not null and length(p_notes) > 500 then
    raise exception 'Notes are too long' using errcode = '23514';
  end if;

  -- shared games row: auth, squad manager check, future start time
  v_id := public.create_game('cricket', p_squad, p_title, p_venue, p_starts_at);

  loop
    v_code := upper(substr(md5(random()::text || clock_timestamp()::text), 1, 8));
    begin
      insert into public.cricket_games (id, players_per_side, overs_per_innings, invite_code, notes)
      values (v_id, p_players_per_side, coalesce(p_overs, 0), v_code, nullif(trim(coalesce(p_notes, '')), ''));
      exit;
    exception when unique_violation then
      v_try := v_try + 1;
      if v_try > 5 then raise; end if;
    end;
  end loop;

  insert into public.cricket_game_players (game_id, user_id, attendance_status)
  values (v_id, v_uid, 'playing');

  return v_id;
end;
$$;

create or replace function public.cricket_list_my_games()
returns table (
  game_id           uuid,
  title             text,
  venue             text,
  starts_at         timestamptz,
  status            text,
  players_per_side  int,
  overs_per_innings int,
  capacity          int,
  invite_code       text,
  is_organizer      boolean,
  confirmed_count   int,
  my_status         text
)
language sql stable security definer set search_path = public as $$
  select
    g.id, g.title, g.venue, g.starts_at, g.status,
    c.players_per_side, c.overs_per_innings, c.players_per_side * 2,
    c.invite_code,
    public.is_game_organizer(g.id, auth.uid()),
    (select count(*)::int from public.cricket_game_players p
     where p.game_id = c.id and p.attendance_status = 'playing'),
    (select p.attendance_status from public.cricket_game_players p
     where p.game_id = c.id and p.user_id = auth.uid())
  from public.cricket_games c
  join public.games g on g.id = c.id
  where auth.uid() is not null
    and public.cricket_is_member(c.id, auth.uid())
  order by g.starts_at asc;
$$;

create or replace function public.cricket_get_game(p_game uuid)
returns json
language plpgsql stable security definer set search_path = public as $$
declare
  v_uid    uuid := auth.uid();
  v_result json;
begin
  if v_uid is null then
    raise exception 'Unauthenticated' using errcode = '42501';
  end if;
  if not public.cricket_is_member(p_game, v_uid) then
    raise exception 'Forbidden' using errcode = '42501';
  end if;

  select row_to_json(q) into v_result from (
    select
      g.id                                  as game_id,
      g.title, g.venue, g.starts_at, g.status,
      c.players_per_side,
      c.overs_per_innings,
      c.players_per_side * 2                as capacity,
      c.invite_code,
      c.notes,
      g.created_by,
      public.is_game_organizer(g.id, v_uid) as is_organizer,
      (select p.attendance_status from public.cricket_game_players p
       where p.game_id = c.id and p.user_id = v_uid) as my_status,
      (select row_to_json(t) from public.cricket_toss t where t.game_id = c.id) as toss,
      coalesce((
        select json_agg(json_build_object(
          'user_id',           p.user_id,
          'name',              coalesce(pr.display_name, 'Player'),
          'avatar_url',        pr.avatar_url,
          'attendance_status', p.attendance_status,
          'team_side',         tp.team_side,
          'batting_position',  bo.batting_position,
          'is_captain',        coalesce(tp.captain, false),
          'is_wicketkeeper',   coalesce(tp.wicketkeeper, false),
          'joined_at',         p.joined_at
        ) order by p.joined_at)
        from public.cricket_game_players p
        left join public.profiles pr on pr.id = p.user_id
        left join public.cricket_team_players tp on tp.game_id = p.game_id and tp.user_id = p.user_id
        left join public.cricket_batting_order bo
          on bo.game_id = p.game_id and bo.player_id = p.user_id and bo.team_side = tp.team_side
        where p.game_id = c.id
      ), '[]'::json) as players,
      coalesce((
        select json_agg(json_build_object(
          'team_side', b.team_side, 'player_id', b.player_id, 'batting_position', b.batting_position
        ) order by b.team_side, b.batting_position)
        from public.cricket_batting_order b where b.game_id = c.id
      ), '[]'::json) as batting_order,
      coalesce((
        select json_agg(json_build_object(
          'team_side', f.team_side, 'player_id', f.player_id, 'position_name', f.position_name,
          'x_pos', f.x_pos, 'y_pos', f.y_pos, 'is_custom', f.is_custom
        ) order by f.team_side, f.position_name)
        from public.cricket_field_positions f where f.game_id = c.id
      ), '[]'::json) as field_positions
    from public.cricket_games c
    join public.games g on g.id = c.id
    where c.id = p_game
  ) q;

  return v_result;
end;
$$;

create or replace function public.cricket_join_by_code(p_code text)
returns uuid
language plpgsql security definer set search_path = public as $$
declare
  v_uid       uuid := auth.uid();
  v_game      uuid;
  v_gstatus   text;
  v_pps       int;
  v_confirmed int;
begin
  if v_uid is null then
    raise exception 'Unauthenticated' using errcode = '42501';
  end if;

  select c.id, g.status, c.players_per_side
  into   v_game, v_gstatus, v_pps
  from public.cricket_games c
  join public.games g on g.id = c.id
  where c.invite_code = upper(trim(coalesce(p_code, '')))
  for update of c;

  if v_game is null then
    raise exception 'Invalid invitation code' using errcode = 'P0002';
  end if;
  if v_gstatus in ('completed', 'cancelled') then
    raise exception 'This game is no longer open' using errcode = 'P0001';
  end if;
  if exists (select 1 from public.cricket_game_players where game_id = v_game and user_id = v_uid) then
    return v_game;
  end if;

  select count(*) into v_confirmed
  from public.cricket_game_players
  where game_id = v_game and attendance_status = 'playing';
  if v_confirmed >= v_pps * 2 then
    raise exception 'Game is full' using errcode = 'P0001';
  end if;

  perform public.ensure_profile(v_uid);

  insert into public.cricket_game_players (game_id, user_id, attendance_status)
  values (v_game, v_uid, 'maybe');

  return v_game;
end;
$$;

create or replace function public.cricket_set_attendance(p_game uuid, p_status text)
returns void
language plpgsql security definer set search_path = public as $$
declare
  v_uid       uuid := auth.uid();
  v_pps       int;
  v_gstatus   text;
  v_confirmed int;
begin
  if v_uid is null then
    raise exception 'Unauthenticated' using errcode = '42501';
  end if;
  if p_status is null or p_status not in ('playing', 'maybe', 'not_playing') then
    raise exception 'Invalid attendance status' using errcode = '23514';
  end if;

  select c.players_per_side, g.status
  into   v_pps, v_gstatus
  from public.cricket_games c
  join public.games g on g.id = c.id
  where c.id = p_game
  for update of c;

  if v_pps is null then
    raise exception 'Game not found' using errcode = 'P0002';
  end if;
  if v_gstatus in ('completed', 'cancelled') then
    raise exception 'RSVPs are closed' using errcode = 'P0001';
  end if;
  if not exists (select 1 from public.cricket_game_players where game_id = p_game and user_id = v_uid) then
    raise exception 'Not a member of this game' using errcode = '42501';
  end if;

  if p_status = 'playing' then
    select count(*) into v_confirmed
    from public.cricket_game_players
    where game_id = p_game and attendance_status = 'playing' and user_id <> v_uid;
    if v_confirmed >= v_pps * 2 then
      raise exception 'Game is full (% players confirmed)', v_pps * 2 using errcode = 'P0001';
    end if;
  end if;

  update public.cricket_game_players
  set attendance_status = p_status, updated_at = now()
  where game_id = p_game and user_id = v_uid;

  if p_status <> 'playing' then
    perform public.cricket_clear_lineup_internal(p_game, v_uid);
  end if;
end;
$$;

create or replace function public.cricket_set_team(p_game uuid, p_user uuid, p_side text)
returns void
language plpgsql security definer set search_path = public as $$
declare
  v_old text;
begin
  if auth.uid() is null then
    raise exception 'Unauthenticated' using errcode = '42501';
  end if;
  if not public.is_game_organizer(p_game, auth.uid()) then
    raise exception 'Forbidden: only the organizer can assign teams' using errcode = '42501';
  end if;
  if p_side is not null and p_side not in ('A', 'B') then
    raise exception 'Side must be A, B, or null' using errcode = '23514';
  end if;

  if p_side is null then
    perform public.cricket_clear_lineup_internal(p_game, p_user);
    return;
  end if;

  if not exists (select 1 from public.cricket_game_players
                 where game_id = p_game and user_id = p_user and attendance_status = 'playing') then
    raise exception 'Only confirmed players can be assigned to teams' using errcode = 'P0001';
  end if;

  select team_side into v_old from public.cricket_team_players where game_id = p_game and user_id = p_user;
  if v_old is not null and v_old <> p_side then
    -- moving sides: drop old-side lineup data and roles
    delete from public.cricket_batting_order   where game_id = p_game and player_id = p_user;
    delete from public.cricket_field_positions where game_id = p_game and player_id = p_user;
  end if;

  insert into public.cricket_team_players (game_id, user_id, team_side)
  values (p_game, p_user, p_side)
  on conflict (game_id, user_id) do update
    set team_side    = excluded.team_side,
        captain      = case when cricket_team_players.team_side = excluded.team_side then cricket_team_players.captain else false end,
        wicketkeeper = case when cricket_team_players.team_side = excluded.team_side then cricket_team_players.wicketkeeper else false end,
        assigned_at  = now();
end;
$$;

create or replace function public.cricket_auto_balance(p_game uuid)
returns void
language plpgsql security definer set search_path = public as $$
declare
  v_uids uuid[];
  v_len  int;
begin
  if auth.uid() is null then
    raise exception 'Unauthenticated' using errcode = '42501';
  end if;
  if not public.is_game_organizer(p_game, auth.uid()) then
    raise exception 'Forbidden: only the organizer can balance teams' using errcode = '42501';
  end if;

  select array_agg(user_id order by joined_at) into v_uids
  from public.cricket_game_players
  where game_id = p_game and attendance_status = 'playing';

  v_len := coalesce(cardinality(v_uids), 0);
  if v_len < 2 then
    raise exception 'Need at least 2 confirmed players to balance teams' using errcode = 'P0001';
  end if;

  -- new teams invalidate the old lineup
  delete from public.cricket_team_players    where game_id = p_game;
  delete from public.cricket_batting_order   where game_id = p_game;
  delete from public.cricket_field_positions where game_id = p_game;

  insert into public.cricket_team_players (game_id, user_id, team_side)
  select p_game, v_uids[i], case when i % 2 = 1 then 'A' else 'B' end
  from generate_series(1, v_len) i;
end;
$$;

create or replace function public.cricket_set_captain(p_game uuid, p_user uuid, p_side text)
returns void
language plpgsql security definer set search_path = public as $$
begin
  if auth.uid() is null then
    raise exception 'Unauthenticated' using errcode = '42501';
  end if;
  if not public.is_game_organizer(p_game, auth.uid()) then
    raise exception 'Forbidden: only the organizer can assign captains' using errcode = '42501';
  end if;
  if p_side is null or p_side not in ('A', 'B') then
    raise exception 'Side must be A or B' using errcode = '23514';
  end if;
  if p_user is not null and not exists (select 1 from public.cricket_team_players
                 where game_id = p_game and user_id = p_user and team_side = p_side) then
    raise exception 'Player is not on team %', p_side using errcode = 'P0001';
  end if;

  update public.cricket_team_players set captain = false
  where game_id = p_game and team_side = p_side and captain;

  if p_user is not null then
    update public.cricket_team_players set captain = true
    where game_id = p_game and user_id = p_user and team_side = p_side;
  end if;
end;
$$;

create or replace function public.cricket_set_wicketkeeper(p_game uuid, p_user uuid, p_side text)
returns void
language plpgsql security definer set search_path = public as $$
begin
  if auth.uid() is null then
    raise exception 'Unauthenticated' using errcode = '42501';
  end if;
  if not public.is_game_organizer(p_game, auth.uid()) then
    raise exception 'Forbidden: only the organizer can assign wicketkeeper' using errcode = '42501';
  end if;
  if p_side is null or p_side not in ('A', 'B') then
    raise exception 'Side must be A or B' using errcode = '23514';
  end if;
  if p_user is not null and not exists (select 1 from public.cricket_team_players
                 where game_id = p_game and user_id = p_user and team_side = p_side) then
    raise exception 'Player is not on team %', p_side using errcode = 'P0001';
  end if;

  update public.cricket_team_players set wicketkeeper = false
  where game_id = p_game and team_side = p_side and wicketkeeper;

  if p_user is not null then
    update public.cricket_team_players set wicketkeeper = true
    where game_id = p_game and user_id = p_user and team_side = p_side;
  end if;
end;
$$;

-- p_assignments: [{"player_id": "...", "batting_position": 1}, ...]  (replaces the side's order)
create or replace function public.cricket_set_batting_order(p_game uuid, p_side text, p_assignments jsonb)
returns void
language plpgsql security definer set search_path = public as $$
begin
  if auth.uid() is null then
    raise exception 'Unauthenticated' using errcode = '42501';
  end if;
  if not public.is_game_organizer(p_game, auth.uid()) then
    raise exception 'Forbidden: only the organizer can set batting order' using errcode = '42501';
  end if;
  if p_side is null or p_side not in ('A', 'B') then
    raise exception 'Side must be A or B' using errcode = '23514';
  end if;
  if p_assignments is null or jsonb_typeof(p_assignments) <> 'array' then
    raise exception 'Assignments must be an array' using errcode = '23514';
  end if;
  if exists (
    select 1 from jsonb_array_elements(p_assignments) a
    where not exists (select 1 from public.cricket_team_players t
                      where t.game_id = p_game and t.team_side = p_side
                        and t.user_id = (a->>'player_id')::uuid)
  ) then
    raise exception 'Every batter must be on team %', p_side using errcode = 'P0001';
  end if;

  delete from public.cricket_batting_order where game_id = p_game and team_side = p_side;

  insert into public.cricket_batting_order (game_id, team_side, player_id, batting_position)
  select p_game, p_side, (a->>'player_id')::uuid, (a->>'batting_position')::int
  from jsonb_array_elements(p_assignments) a;
end;
$$;

-- p_positions: [{"player_id","position_name","x_pos","y_pos","is_custom"}, ...]  (replaces the side's field)
create or replace function public.cricket_set_field_positions(p_game uuid, p_side text, p_positions jsonb)
returns void
language plpgsql security definer set search_path = public as $$
begin
  if auth.uid() is null then
    raise exception 'Unauthenticated' using errcode = '42501';
  end if;
  if not public.is_game_organizer(p_game, auth.uid()) then
    raise exception 'Forbidden: only the organizer can set field positions' using errcode = '42501';
  end if;
  if p_side is null or p_side not in ('A', 'B') then
    raise exception 'Side must be A or B' using errcode = '23514';
  end if;
  if p_positions is null or jsonb_typeof(p_positions) <> 'array' then
    raise exception 'Positions must be an array' using errcode = '23514';
  end if;
  if exists (
    select 1 from jsonb_array_elements(p_positions) a
    where not exists (select 1 from public.cricket_team_players t
                      where t.game_id = p_game and t.team_side = p_side
                        and t.user_id = (a->>'player_id')::uuid)
  ) then
    raise exception 'Every fielder must be on team %', p_side using errcode = 'P0001';
  end if;

  delete from public.cricket_field_positions where game_id = p_game and team_side = p_side;

  insert into public.cricket_field_positions
    (game_id, team_side, player_id, position_name, x_pos, y_pos, is_custom)
  select p_game, p_side, (a->>'player_id')::uuid, a->>'position_name',
         (a->>'x_pos')::numeric, (a->>'y_pos')::numeric,
         coalesce((a->>'is_custom')::boolean, false)
  from jsonb_array_elements(p_positions) a;
end;
$$;

create or replace function public.cricket_record_toss(p_game uuid, p_winning_team text, p_decision text)
returns void
language plpgsql security definer set search_path = public as $$
begin
  if auth.uid() is null then
    raise exception 'Unauthenticated' using errcode = '42501';
  end if;
  if not public.is_game_organizer(p_game, auth.uid()) then
    raise exception 'Forbidden: only the organizer can record the toss' using errcode = '42501';
  end if;
  if p_winning_team is null or p_winning_team not in ('A', 'B') then
    raise exception 'Toss winner must be A or B' using errcode = '23514';
  end if;
  if p_decision is null or p_decision not in ('bat', 'bowl') then
    raise exception 'Decision must be bat or bowl' using errcode = '23514';
  end if;

  insert into public.cricket_toss (game_id, winning_team, decision, recorded_by)
  values (p_game, p_winning_team, p_decision, auth.uid())
  on conflict (game_id) do update
    set winning_team = excluded.winning_team,
        decision     = excluded.decision,
        recorded_by  = excluded.recorded_by,
        recorded_at  = now();
end;
$$;

create or replace function public.cricket_set_status(p_game uuid, p_status text)
returns void
language plpgsql security definer set search_path = public as $$
begin
  if auth.uid() is null then
    raise exception 'Unauthenticated' using errcode = '42501';
  end if;
  if not public.is_game_organizer(p_game, auth.uid()) then
    raise exception 'Forbidden' using errcode = '42501';
  end if;
  if p_status is null or p_status not in ('scheduled', 'completed', 'cancelled') then
    raise exception 'Invalid status' using errcode = '23514';
  end if;

  update public.games set status = p_status, updated_at = now()
  where id = p_game and sport = 'cricket';
end;
$$;

-- 5. GRANTS (no anon; internal helpers not callable by clients)
revoke all on function public.cricket_confirmed_players(uuid)              from public, anon, authenticated;
revoke all on function public.cricket_clear_lineup_internal(uuid, uuid)    from public, anon, authenticated;
revoke all on function public.cricket_is_member(uuid, uuid)                from public, anon;
revoke all on function public.cricket_create_game(text, text, timestamptz, int, int, text, uuid) from public, anon;
revoke all on function public.cricket_list_my_games()                      from public, anon;
revoke all on function public.cricket_get_game(uuid)                       from public, anon;
revoke all on function public.cricket_join_by_code(text)                   from public, anon;
revoke all on function public.cricket_set_attendance(uuid, text)           from public, anon;
revoke all on function public.cricket_set_team(uuid, uuid, text)           from public, anon;
revoke all on function public.cricket_auto_balance(uuid)                   from public, anon;
revoke all on function public.cricket_set_captain(uuid, uuid, text)        from public, anon;
revoke all on function public.cricket_set_wicketkeeper(uuid, uuid, text)   from public, anon;
revoke all on function public.cricket_set_batting_order(uuid, text, jsonb) from public, anon;
revoke all on function public.cricket_set_field_positions(uuid, text, jsonb) from public, anon;
revoke all on function public.cricket_record_toss(uuid, text, text)        from public, anon;
revoke all on function public.cricket_set_status(uuid, text)               from public, anon;

grant execute on function public.cricket_is_member(uuid, uuid)                to authenticated; -- used by RLS
grant execute on function public.cricket_create_game(text, text, timestamptz, int, int, text, uuid) to authenticated;
grant execute on function public.cricket_list_my_games()                      to authenticated;
grant execute on function public.cricket_get_game(uuid)                       to authenticated;
grant execute on function public.cricket_join_by_code(text)                   to authenticated;
grant execute on function public.cricket_set_attendance(uuid, text)           to authenticated;
grant execute on function public.cricket_set_team(uuid, uuid, text)           to authenticated;
grant execute on function public.cricket_auto_balance(uuid)                   to authenticated;
grant execute on function public.cricket_set_captain(uuid, uuid, text)        to authenticated;
grant execute on function public.cricket_set_wicketkeeper(uuid, uuid, text)   to authenticated;
grant execute on function public.cricket_set_batting_order(uuid, text, jsonb) to authenticated;
grant execute on function public.cricket_set_field_positions(uuid, text, jsonb) to authenticated;
grant execute on function public.cricket_record_toss(uuid, text, text)        to authenticated;
grant execute on function public.cricket_set_status(uuid, text)               to authenticated;

-- 6. REGISTER & ENABLE (row already seeded by multisport_games_core)
update public.sports
set game_table           = 'public.cricket_games',
    confirmed_players_fn = 'public.cricket_confirmed_players(uuid)',
    is_enabled           = true
where key = 'cricket';

insert into ops.change_ledger (migration_name, owner, sport, objects, description)
values ('cricket_core', 'dev_b', 'cricket',
  '{cricket_games,cricket_game_players,cricket_team_players,cricket_batting_order,cricket_field_positions,cricket_toss,cricket_confirmed_players,cricket_is_member,cricket_create_game,cricket_list_my_games,cricket_get_game,cricket_join_by_code,cricket_set_attendance,cricket_set_team,cricket_auto_balance,cricket_set_captain,cricket_set_wicketkeeper,cricket_set_batting_order,cricket_set_field_positions,cricket_record_toss,cricket_set_status}',
  'Cricket module: games (5-11 a side, overs), RSVP with capacity, teams A/B, captain/WK, batting order, field positions, toss; registered and enabled')
on conflict (migration_name) do nothing;