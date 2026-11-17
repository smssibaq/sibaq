-- =============================================================================
-- Migration: 20261117160000_cricket_core   owner: dev_b
-- Description: Cricket module. Owns only cricket_* objects + the cricket row in
--   public.sports. Shared fields (title, venue, starts_at, status, created_by)
--   live in public.games; this module adds the sport extension, RSVPs, team
--   sides, batting order, field positions, and toss.
--   All writes go through SECURITY DEFINER RPCs — no direct INSERT/UPDATE/DELETE
--   from clients.
-- =============================================================================

-- ---------------------------------------------------------------- tables

create table public.cricket_games (
  id           uuid primary key,
  sport        text not null default 'cricket' check (sport = 'cricket'),
  players_per_side int not null default 6
    check (players_per_side in (5, 6, 7, 8, 11)),
  overs_per_innings int not null default 0
    check (overs_per_innings >= 0),          -- 0 = unlimited / declaration
  invite_code  text not null,
  notes        text check (notes is null or length(notes) <= 500),
  created_at   timestamptz not null default now(),
  constraint cricket_games_invite_code_key unique (invite_code),
  constraint cricket_games_game_fkey foreign key (id, sport)
    references public.games (id, sport) on delete cascade
);

create table public.cricket_game_players (
  game_id           uuid not null references public.cricket_games (id) on delete cascade,
  user_id           uuid not null references public.profiles (id) on delete cascade,
  attendance_status text not null default 'maybe'
    check (attendance_status in ('playing', 'maybe', 'not_playing')),
  joined_at         timestamptz not null default now(),
  updated_at        timestamptz not null default now(),
  primary key (game_id, user_id)
);
create index cricket_game_players_user_idx on public.cricket_game_players (user_id);

create table public.cricket_team_players (
  game_id          uuid not null,
  user_id          uuid not null,
  team_side        text not null check (team_side in ('A', 'B')),
  captain          boolean not null default false,
  wicketkeeper     boolean not null default false,
  batting_position int,
  assigned_at      timestamptz not null default now(),
  primary key (game_id, user_id),          -- one team per player per game
  foreign key (game_id, user_id)
    references public.cricket_game_players (game_id, user_id) on delete cascade
);

create table public.cricket_batting_order (
  id              uuid primary key default gen_random_uuid(),
  game_id         uuid not null references public.cricket_games (id) on delete cascade,
  team_side       text not null check (team_side in ('A', 'B')),
  player_id       uuid not null references public.profiles (id) on delete cascade,
  batting_position int not null check (batting_position >= 1),
  constraint cricket_batting_order_player_unique unique (game_id, team_side, player_id),
  constraint cricket_batting_order_position_unique unique (game_id, team_side, batting_position)
);

create table public.cricket_field_positions (
  id            uuid primary key default gen_random_uuid(),
  game_id       uuid not null references public.cricket_games (id) on delete cascade,
  team_side     text not null check (team_side in ('A', 'B')),
  player_id     uuid not null references public.profiles (id) on delete cascade,
  position_name text not null,
  x_pos         numeric,
  y_pos         numeric,
  is_custom     boolean not null default false,
  constraint cricket_field_positions_player_unique unique (game_id, team_side, player_id)
);

create table public.cricket_toss (
  game_id      uuid primary key references public.cricket_games (id) on delete cascade,
  winning_team text not null check (winning_team in ('A', 'B')),
  decision     text not null check (decision in ('bat', 'bowl')),
  recorded_by  uuid not null references public.profiles (id) on delete cascade,
  recorded_at  timestamptz not null default now()
);

-- ---------------------------------------------------------------- helpers

create or replace function public.cricket_confirmed_players(p_game uuid)
returns setof uuid
language sql stable security definer set search_path = public as $$
  select user_id from public.cricket_game_players
  where game_id = p_game and attendance_status = 'playing';
$$;

create or replace function public.cricket_is_member(p_game uuid, p_user uuid)
returns boolean
language sql stable security definer set search_path = public as $$
  select p_user is not null and (
    exists (select 1 from public.games g where g.id = p_game and g.sport = 'cricket' and g.created_by = p_user)
    or exists (select 1 from public.cricket_game_players p where p.game_id = p_game and p.user_id = p_user)
  );
$$;

-- ---------------------------------------------------------------- RLS (read-only for clients)

alter table public.cricket_games          enable row level security;
alter table public.cricket_game_players   enable row level security;
alter table public.cricket_team_players   enable row level security;
alter table public.cricket_batting_order  enable row level security;
alter table public.cricket_field_positions enable row level security;
alter table public.cricket_toss           enable row level security;

create policy cricket_games_select on public.cricket_games
  for select to authenticated
  using (public.cricket_is_member(id, (select auth.uid())));

create policy cricket_game_players_select on public.cricket_game_players
  for select to authenticated
  using (public.cricket_is_member(game_id, (select auth.uid())));

create policy cricket_team_players_select on public.cricket_team_players
  for select to authenticated
  using (public.cricket_is_member(game_id, (select auth.uid())));

create policy cricket_batting_order_select on public.cricket_batting_order
  for select to authenticated
  using (public.cricket_is_member(game_id, (select auth.uid())));

create policy cricket_field_positions_select on public.cricket_field_positions
  for select to authenticated
  using (public.cricket_is_member(game_id, (select auth.uid())));

create policy cricket_toss_select on public.cricket_toss
  for select to authenticated
  using (public.cricket_is_member(game_id, (select auth.uid())));

revoke all on
  public.cricket_games,
  public.cricket_game_players,
  public.cricket_team_players,
  public.cricket_batting_order,
  public.cricket_field_positions,
  public.cricket_toss
from public, anon, authenticated;

grant select on
  public.cricket_games,
  public.cricket_game_players,
  public.cricket_team_players,
  public.cricket_batting_order,
  public.cricket_field_positions,
  public.cricket_toss
to authenticated;

-- ---------------------------------------------------------------- RPCs

-- cricket_create_game
create or replace function public.cricket_create_game(
  p_title          text,
  p_venue          text,
  p_starts_at      timestamptz,
  p_players_per_side int default 6,
  p_overs          int default 0,
  p_notes          text default null
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
  if p_players_per_side not in (5, 6, 7, 8, 11) then
    raise exception 'players_per_side must be 5, 6, 7, 8, or 11' using errcode = '23514';
  end if;
  if p_overs is null or p_overs < 0 then
    raise exception 'overs_per_innings must be >= 0 (0 = unlimited)' using errcode = '23514';
  end if;
  if p_notes is not null and length(p_notes) > 500 then
    raise exception 'Notes are too long (max 500 characters)' using errcode = '23514';
  end if;

  v_id := public.create_game('cricket', null, p_title, p_venue, p_starts_at);

  loop
    v_code := upper(substr(md5(random()::text || clock_timestamp()::text), 1, 8));
    begin
      insert into public.cricket_games (id, sport, players_per_side, overs_per_innings, invite_code, notes)
      values (v_id, 'cricket', p_players_per_side, p_overs, v_code,
              nullif(trim(coalesce(p_notes, '')), ''));
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

-- cricket_list_my_games
create or replace function public.cricket_list_my_games()
returns table (
  game_id          uuid,
  title            text,
  venue            text,
  starts_at        timestamptz,
  status           text,
  players_per_side int,
  overs_per_innings int,
  capacity         int,
  invite_code      text,
  is_organizer     boolean,
  confirmed_count  int,
  my_status        text
)
language sql stable security definer set search_path = public as $$
  select
    g.id,
    g.title,
    g.venue,
    g.starts_at,
    g.status,
    c.players_per_side,
    c.overs_per_innings,
    c.players_per_side * 2,                                      -- capacity = 2 sides
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

-- cricket_get_game
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
      g.id                                       as game_id,
      g.title,
      g.venue,
      g.starts_at,
      g.status,
      c.players_per_side,
      c.overs_per_innings,
      c.players_per_side * 2                     as capacity,
      c.invite_code,
      c.notes,
      g.created_by,
      public.is_game_organizer(g.id, v_uid)      as is_organizer,
      (select p.attendance_status
       from public.cricket_game_players p
       where p.game_id = c.id and p.user_id = v_uid)   as my_status,
      -- toss
      (select row_to_json(t)
       from public.cricket_toss t
       where t.game_id = c.id)                   as toss,
      -- players with team / batting details
      coalesce((
        select json_agg(
          json_build_object(
            'user_id',          p.user_id,
            'name',             coalesce(pr.display_name, 'Player'),
            'avatar_url',       pr.avatar_url,
            'attendance_status',p.attendance_status,
            'team_side',        tp.team_side,
            'batting_position', tp.batting_position,
            'is_captain',       coalesce(tp.captain, false),
            'is_wicketkeeper',  coalesce(tp.wicketkeeper, false),
            'joined_at',        p.joined_at
          ) order by p.joined_at
        )
        from public.cricket_game_players p
        left join public.profiles pr
          on pr.id = p.user_id
        left join public.cricket_team_players tp
          on tp.game_id = p.game_id and tp.user_id = p.user_id
        where p.game_id = c.id
      ), '[]'::json)                             as players
    from public.cricket_games c
    join public.games g on g.id = c.id
    where c.id = p_game
  ) q;

  return v_result;
end;
$$;

-- cricket_join_by_code
create or replace function public.cricket_join_by_code(p_code text)
returns uuid
language plpgsql security definer set search_path = public as $$
declare
  v_uid      uuid := auth.uid();
  v_game     uuid;
  v_gstatus  text;
  v_pps      int;
  v_confirmed int;
begin
  if v_uid is null then
    raise exception 'Unauthenticated' using errcode = '42501';
  end if;

  select c.id, g.status, c.players_per_side
  into   v_game, v_gstatus, v_pps
  from public.cricket_games c
  join public.games g on g.id = c.id
  where c.invite_code = upper(trim(coalesce(p_code, '')));

  if v_game is null then
    raise exception 'Invalid invitation code' using errcode = 'P0002';
  end if;
  if v_gstatus in ('completed', 'cancelled') then
    raise exception 'This game is no longer open' using errcode = 'P0001';
  end if;
  if exists (select 1 from public.cricket_game_players
             where game_id = v_game and user_id = v_uid) then
    return v_game;   -- duplicate join is a no-op; return game id
  end if;

  -- Capacity check: confirmed < both-sides capacity
  select count(*) into v_confirmed
  from public.cricket_game_players
  where game_id = v_game and attendance_status = 'playing';
  if v_confirmed >= v_pps * 2 then
    raise exception 'Game is full (% confirmed players)', v_pps * 2 using errcode = 'P0001';
  end if;

  perform public.ensure_profile(v_uid);

  insert into public.cricket_game_players (game_id, user_id, attendance_status)
  values (v_game, v_uid, 'maybe');

  return v_game;
end;
$$;

-- cricket_set_attendance
create or replace function public.cricket_set_attendance(p_game uuid, p_status text)
returns void
language plpgsql security definer set search_path = public as $$
declare
  v_uid      uuid := auth.uid();
  v_pps      int;
  v_gstatus  text;
  v_confirmed int;
begin
  if v_uid is null then
    raise exception 'Unauthenticated' using errcode = '42501';
  end if;
  if p_status not in ('playing', 'maybe', 'not_playing') then
    raise exception 'Invalid attendance status' using errcode = '23514';
  end if;

  -- Lock the row to serialise concurrent RSVPs
  select c.players_per_side, g.status
  into   v_pps, v_gstatus
  from public.cricket_games c
  join public.games g on g.id = c.id
  where c.id = p_game
  for update of c;

  if v_pps is null then
    raise exception 'Game not found' using errcode = 'P0002';
  end if;
  if not exists (select 1 from public.cricket_game_players
                 where game_id = p_game and user_id = v_uid) then
    raise exception 'Join the game with its invitation code first' using errcode = '42501';
  end if;
  if v_gstatus in ('completed', 'cancelled') then
    raise exception 'This game is no longer open' using errcode = 'P0001';
  end if;

  if p_status = 'playing' then
    select count(*) into v_confirmed
    from public.cricket_game_players
    where game_id = p_game and attendance_status = 'playing' and user_id <> v_uid;
    if v_confirmed >= v_pps * 2 then
      raise exception 'Game is full (% players)', v_pps * 2 using errcode = 'P0001';
    end if;
  else
    -- Leaving: drop team assignment
    delete from public.cricket_team_players where game_id = p_game and user_id = v_uid;
  end if;

  update public.cricket_game_players
  set attendance_status = p_status, updated_at = now()
  where game_id = p_game and user_id = v_uid;
end;
$$;

-- cricket_set_team
create or replace function public.cricket_set_team(p_game uuid, p_user uuid, p_side text)
returns void
language plpgsql security definer set search_path = public as $$
declare
  v_pps   int;
  v_count int;
begin
  if auth.uid() is null then
    raise exception 'Unauthenticated' using errcode = '42501';
  end if;
  if not public.is_game_organizer(p_game, auth.uid()) then
    raise exception 'Forbidden: only the organizer can manage teams' using errcode = '42501';
  end if;
  if p_side is not null and p_side not in ('A', 'B') then
    raise exception 'Invalid team side' using errcode = '23514';
  end if;

  select players_per_side into v_pps from public.cricket_games where id = p_game for update;
  if v_pps is null then
    raise exception 'Game not found' using errcode = 'P0002';
  end if;

  if p_side is null then
    delete from public.cricket_team_players where game_id = p_game and user_id = p_user;
    return;
  end if;

  if not exists (
    select 1 from public.cricket_game_players
    where game_id = p_game and user_id = p_user and attendance_status = 'playing'
  ) then
    raise exception 'Only confirmed players can be assigned to a team' using errcode = 'P0001';
  end if;

  select count(*) into v_count
  from public.cricket_team_players
  where game_id = p_game and team_side = p_side and user_id <> p_user;
  if v_count >= v_pps then
    raise exception 'Team % is full (% players)', p_side, v_pps using errcode = 'P0001';
  end if;

  insert into public.cricket_team_players (game_id, user_id, team_side)
  values (p_game, p_user, p_side)
  on conflict (game_id, user_id) do update
    set team_side = excluded.team_side, assigned_at = now();
end;
$$;

-- cricket_auto_balance
create or replace function public.cricket_auto_balance(p_game uuid)
returns void
language plpgsql security definer set search_path = public as $$
declare
  v_pps int;
  r     record;
  i     int := 0;
begin
  if auth.uid() is null then
    raise exception 'Unauthenticated' using errcode = '42501';
  end if;
  if not public.is_game_organizer(p_game, auth.uid()) then
    raise exception 'Forbidden: only the organizer can manage teams' using errcode = '42501';
  end if;

  select players_per_side into v_pps from public.cricket_games where id = p_game for update;
  if v_pps is null then
    raise exception 'Game not found' using errcode = 'P0002';
  end if;

  delete from public.cricket_team_players where game_id = p_game;

  for r in
    select user_id from public.cricket_game_players
    where game_id = p_game and attendance_status = 'playing'
    order by random()
  loop
    exit when i >= v_pps * 2;
    insert into public.cricket_team_players (game_id, user_id, team_side)
    values (p_game, r.user_id, case when i % 2 = 0 then 'A' else 'B' end);
    i := i + 1;
  end loop;
end;
$$;

-- cricket_set_captain
create or replace function public.cricket_set_captain(p_game uuid, p_user uuid, p_side text)
returns void
language plpgsql security definer set search_path = public as $$
begin
  if auth.uid() is null then
    raise exception 'Unauthenticated' using errcode = '42501';
  end if;
  if not public.is_game_organizer(p_game, auth.uid()) then
    raise exception 'Forbidden: only the organizer can set captains' using errcode = '42501';
  end if;
  if p_side not in ('A', 'B') then
    raise exception 'Invalid team side' using errcode = '23514';
  end if;
  if not exists (
    select 1 from public.cricket_team_players
    where game_id = p_game and user_id = p_user and team_side = p_side
  ) then
    raise exception 'Player is not on that team' using errcode = 'P0002';
  end if;

  -- Unset existing captain for this side
  update public.cricket_team_players
  set captain = false
  where game_id = p_game and team_side = p_side and captain = true;

  -- Set new captain
  update public.cricket_team_players
  set captain = true
  where game_id = p_game and user_id = p_user and team_side = p_side;
end;
$$;

-- cricket_set_wicketkeeper
create or replace function public.cricket_set_wicketkeeper(p_game uuid, p_user uuid, p_side text)
returns void
language plpgsql security definer set search_path = public as $$
begin
  if auth.uid() is null then
    raise exception 'Unauthenticated' using errcode = '42501';
  end if;
  if not public.is_game_organizer(p_game, auth.uid()) then
    raise exception 'Forbidden: only the organizer can set the wicketkeeper' using errcode = '42501';
  end if;
  if p_side not in ('A', 'B') then
    raise exception 'Invalid team side' using errcode = '23514';
  end if;
  if not exists (
    select 1 from public.cricket_team_players
    where game_id = p_game and user_id = p_user and team_side = p_side
  ) then
    raise exception 'Player is not on that team' using errcode = 'P0002';
  end if;

  -- Unset existing wicketkeeper for this side
  update public.cricket_team_players
  set wicketkeeper = false
  where game_id = p_game and team_side = p_side and wicketkeeper = true;

  -- Set new wicketkeeper
  update public.cricket_team_players
  set wicketkeeper = true
  where game_id = p_game and user_id = p_user and team_side = p_side;
end;
$$;

-- cricket_set_batting_order
-- p_assignments: JSON array of {"player_id": "<uuid>", "batting_position": <int>}
create or replace function public.cricket_set_batting_order(
  p_game        uuid,
  p_side        text,
  p_assignments jsonb
) returns void
language plpgsql security definer set search_path = public as $$
declare
  v_row jsonb;
  v_pid uuid;
  v_pos int;
begin
  if auth.uid() is null then
    raise exception 'Unauthenticated' using errcode = '42501';
  end if;
  if not public.is_game_organizer(p_game, auth.uid()) then
    raise exception 'Forbidden: only the organizer can set batting order' using errcode = '42501';
  end if;
  if p_side not in ('A', 'B') then
    raise exception 'Invalid team side' using errcode = '23514';
  end if;
  if not exists (select 1 from public.cricket_games where id = p_game) then
    raise exception 'Game not found' using errcode = 'P0002';
  end if;

  -- Full replace for the given side
  delete from public.cricket_batting_order where game_id = p_game and team_side = p_side;

  for v_row in select jsonb_array_elements(p_assignments)
  loop
    v_pid := (v_row->>'player_id')::uuid;
    v_pos := (v_row->>'batting_position')::int;

    if v_pid is null or v_pos is null or v_pos < 1 then
      raise exception 'Each assignment needs a valid player_id and batting_position >= 1'
        using errcode = '23514';
    end if;
    if not exists (
      select 1 from public.cricket_team_players
      where game_id = p_game and user_id = v_pid and team_side = p_side
    ) then
      raise exception 'Player % is not on team %', v_pid, p_side using errcode = 'P0002';
    end if;

    insert into public.cricket_batting_order (game_id, team_side, player_id, batting_position)
    values (p_game, p_side, v_pid, v_pos);
  end loop;
end;
$$;

-- cricket_set_field_positions
-- p_positions: JSON array of {"player_id":"<uuid>","position_name":"<text>","x_pos":<num>,"y_pos":<num>,"is_custom":<bool>}
create or replace function public.cricket_set_field_positions(
  p_game      uuid,
  p_side      text,
  p_positions jsonb
) returns void
language plpgsql security definer set search_path = public as $$
declare
  v_row jsonb;
  v_pid uuid;
begin
  if auth.uid() is null then
    raise exception 'Unauthenticated' using errcode = '42501';
  end if;
  if not public.is_game_organizer(p_game, auth.uid()) then
    raise exception 'Forbidden: only the organizer can set field positions' using errcode = '42501';
  end if;
  if p_side not in ('A', 'B') then
    raise exception 'Invalid team side' using errcode = '23514';
  end if;
  if not exists (select 1 from public.cricket_games where id = p_game) then
    raise exception 'Game not found' using errcode = 'P0002';
  end if;

  -- Full replace for the given side
  delete from public.cricket_field_positions where game_id = p_game and team_side = p_side;

  for v_row in select jsonb_array_elements(p_positions)
  loop
    v_pid := (v_row->>'player_id')::uuid;
    if v_pid is null then
      raise exception 'Each position entry must have a player_id' using errcode = '23514';
    end if;
    if not exists (
      select 1 from public.cricket_team_players
      where game_id = p_game and user_id = v_pid and team_side = p_side
    ) then
      raise exception 'Player % is not on team %', v_pid, p_side using errcode = 'P0002';
    end if;

    insert into public.cricket_field_positions
      (game_id, team_side, player_id, position_name, x_pos, y_pos, is_custom)
    values (
      p_game,
      p_side,
      v_pid,
      v_row->>'position_name',
      (v_row->>'x_pos')::numeric,
      (v_row->>'y_pos')::numeric,
      coalesce((v_row->>'is_custom')::boolean, false)
    );
  end loop;
end;
$$;

-- cricket_record_toss
create or replace function public.cricket_record_toss(
  p_game         uuid,
  p_winning_team text,
  p_decision     text
) returns void
language plpgsql security definer set search_path = public as $$
declare
  v_uid uuid := auth.uid();
begin
  if v_uid is null then
    raise exception 'Unauthenticated' using errcode = '42501';
  end if;
  if not public.is_game_organizer(p_game, v_uid) then
    raise exception 'Forbidden: only the organizer can record the toss' using errcode = '42501';
  end if;
  if p_winning_team not in ('A', 'B') then
    raise exception 'winning_team must be A or B' using errcode = '23514';
  end if;
  if p_decision not in ('bat', 'bowl') then
    raise exception 'decision must be bat or bowl' using errcode = '23514';
  end if;
  if not exists (select 1 from public.cricket_games where id = p_game) then
    raise exception 'Game not found' using errcode = 'P0002';
  end if;

  insert into public.cricket_toss (game_id, winning_team, decision, recorded_by)
  values (p_game, p_winning_team, p_decision, v_uid)
  on conflict (game_id) do update
    set winning_team = excluded.winning_team,
        decision     = excluded.decision,
        recorded_by  = excluded.recorded_by,
        recorded_at  = now();
end;
$$;

-- cricket_set_status
create or replace function public.cricket_set_status(p_game uuid, p_status text)
returns void
language plpgsql security definer set search_path = public as $$
begin
  if p_status not in ('scheduled', 'completed', 'cancelled') then
    raise exception 'Invalid status' using errcode = '23514';
  end if;
  if not exists (select 1 from public.cricket_games where id = p_game) then
    raise exception 'Game not found' using errcode = 'P0002';
  end if;
  perform public.update_game_core(p_game, null, null, null, p_status);  -- organizer check inside
end;
$$;

-- ---------------------------------------------------------------- grants

revoke all on function public.cricket_confirmed_players(uuid)                           from public, anon, authenticated;
revoke all on function public.cricket_is_member(uuid, uuid)                             from public, anon;
revoke all on function public.cricket_create_game(text, text, timestamptz, int, int, text) from public, anon;
revoke all on function public.cricket_list_my_games()                                   from public, anon;
revoke all on function public.cricket_get_game(uuid)                                    from public, anon;
revoke all on function public.cricket_join_by_code(text)                                from public, anon;
revoke all on function public.cricket_set_attendance(uuid, text)                        from public, anon;
revoke all on function public.cricket_set_team(uuid, uuid, text)                        from public, anon;
revoke all on function public.cricket_auto_balance(uuid)                                from public, anon;
revoke all on function public.cricket_set_captain(uuid, uuid, text)                     from public, anon;
revoke all on function public.cricket_set_wicketkeeper(uuid, uuid, text)                from public, anon;
revoke all on function public.cricket_set_batting_order(uuid, text, jsonb)              from public, anon;
revoke all on function public.cricket_set_field_positions(uuid, text, jsonb)            from public, anon;
revoke all on function public.cricket_record_toss(uuid, text, text)                     from public, anon;
revoke all on function public.cricket_set_status(uuid, text)                            from public, anon;

grant execute on function public.cricket_is_member(uuid, uuid)                             to authenticated;  -- used by RLS
grant execute on function public.cricket_create_game(text, text, timestamptz, int, int, text) to authenticated;
grant execute on function public.cricket_list_my_games()                                   to authenticated;
grant execute on function public.cricket_get_game(uuid)                                    to authenticated;
grant execute on function public.cricket_join_by_code(text)                                to authenticated;
grant execute on function public.cricket_set_attendance(uuid, text)                        to authenticated;
grant execute on function public.cricket_set_team(uuid, uuid, text)                        to authenticated;
grant execute on function public.cricket_auto_balance(uuid)                                to authenticated;
grant execute on function public.cricket_set_captain(uuid, uuid, text)                     to authenticated;
grant execute on function public.cricket_set_wicketkeeper(uuid, uuid, text)                to authenticated;
grant execute on function public.cricket_set_batting_order(uuid, text, jsonb)              to authenticated;
grant execute on function public.cricket_set_field_positions(uuid, text, jsonb)            to authenticated;
grant execute on function public.cricket_record_toss(uuid, text, text)                     to authenticated;
grant execute on function public.cricket_set_status(uuid, text)                            to authenticated;

-- ---------------------------------------------------------------- realtime

do $$
declare t text;
begin
  foreach t in array array[
    'cricket_games', 'cricket_game_players', 'cricket_team_players',
    'cricket_batting_order', 'cricket_field_positions', 'cricket_toss'
  ] loop
    if not exists (select 1 from pg_publication_tables
                   where pubname = 'supabase_realtime'
                     and schemaname = 'public'
                     and tablename = t) then
      execute format('alter publication supabase_realtime add table public.%I', t);
    end if;
  end loop;
end $$;

-- ---------------------------------------------------------------- sports registry

-- Ensure the row exists (the seed in multisport_games_core already inserted it
-- with is_enabled=false; upsert here so the migration is replayable).
insert into public.sports (key, name, owner, is_enabled, sort_order)
values ('cricket', 'Cricket', 'dev_b', true, 30)
on conflict (key) do update
  set name       = excluded.name,
      owner      = excluded.owner,
      is_enabled = excluded.is_enabled,
      sort_order = excluded.sort_order;

update public.sports
set game_table            = 'public.cricket_games',
    confirmed_players_fn  = 'public.cricket_confirmed_players(uuid)'
where key = 'cricket';

-- ---------------------------------------------------------------- change ledger

insert into ops.change_ledger (migration_name, owner, sport, objects, description)
values (
  'cricket_core',
  'dev_b',
  'cricket',
  '{cricket_games,cricket_game_players,cricket_team_players,cricket_batting_order,cricket_field_positions,cricket_toss,cricket_confirmed_players,cricket_is_member,cricket_create_game,cricket_list_my_games,cricket_get_game,cricket_join_by_code,cricket_set_attendance,cricket_set_team,cricket_auto_balance,cricket_set_captain,cricket_set_wicketkeeper,cricket_set_batting_order,cricket_set_field_positions,cricket_record_toss,cricket_set_status}',
  'Cricket MVP: game extension, RSVP with capacity lock, team A/B, batting order, field positions, toss, captain/wicketkeeper roles, invite codes, RLS read-only + SECURITY DEFINER RPCs'
)
on conflict (migration_name) do nothing;
