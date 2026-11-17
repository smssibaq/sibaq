-- Volleyball module (Dev C). Owns only volleyball_* objects + the volleyball row in public.sports.
-- Shared fields (title, venue, starts_at, status, created_by) live in public.games; this module
-- adds the sport extension, RSVPs, and team sides. All writes go through SECURITY DEFINER RPCs.

-- ---------------------------------------------------------------- tables
create table public.volleyball_games (
  id uuid primary key,
  sport text not null default 'volleyball' check (sport = 'volleyball'),
  players_per_side int not null default 6 check (players_per_side in (4, 6)),
  capacity int not null default 12,
  invite_code text not null,
  notes text check (notes is null or length(notes) <= 500),
  created_at timestamptz not null default now(),
  constraint volleyball_games_capacity_check check (capacity = players_per_side * 2),
  constraint volleyball_games_invite_code_key unique (invite_code),
  constraint volleyball_games_game_fkey foreign key (id, sport)
    references public.games (id, sport) on delete cascade
);

create table public.volleyball_game_players (
  game_id uuid not null references public.volleyball_games (id) on delete cascade,
  user_id uuid not null references public.profiles (id) on delete cascade,
  attendance_status text not null default 'maybe'
    check (attendance_status in ('playing', 'maybe', 'not_playing')),
  joined_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  primary key (game_id, user_id)
);
create index volleyball_game_players_user_idx on public.volleyball_game_players (user_id);

create table public.volleyball_team_players (
  game_id uuid not null,
  user_id uuid not null,
  team_side text not null check (team_side in ('A', 'B')),
  assigned_at timestamptz not null default now(),
  primary key (game_id, user_id),  -- a player can be on only one team per game
  foreign key (game_id, user_id)
    references public.volleyball_game_players (game_id, user_id) on delete cascade
);

-- ---------------------------------------------------------------- helpers
create or replace function public.volleyball_confirmed_players(p_game uuid)
returns setof uuid
language sql stable security definer set search_path = public as $$
  select user_id from public.volleyball_game_players
  where game_id = p_game and attendance_status = 'playing';
$$;

create or replace function public.volleyball_is_member(p_game uuid, p_user uuid)
returns boolean
language sql stable security definer set search_path = public as $$
  select p_user is not null and (
    exists (select 1 from public.games g where g.id = p_game and g.sport = 'volleyball' and g.created_by = p_user)
    or exists (select 1 from public.volleyball_game_players p where p.game_id = p_game and p.user_id = p_user)
  );
$$;

-- ---------------------------------------------------------------- RLS (read-only for clients)
alter table public.volleyball_games enable row level security;
alter table public.volleyball_game_players enable row level security;
alter table public.volleyball_team_players enable row level security;

create policy volleyball_games_select on public.volleyball_games
  for select to authenticated
  using (public.volleyball_is_member(id, (select auth.uid())));
create policy volleyball_game_players_select on public.volleyball_game_players
  for select to authenticated
  using (public.volleyball_is_member(game_id, (select auth.uid())));
create policy volleyball_team_players_select on public.volleyball_team_players
  for select to authenticated
  using (public.volleyball_is_member(game_id, (select auth.uid())));

revoke all on public.volleyball_games, public.volleyball_game_players, public.volleyball_team_players from public, anon, authenticated;
grant select on public.volleyball_games, public.volleyball_game_players, public.volleyball_team_players to authenticated;

-- ---------------------------------------------------------------- RPCs
create or replace function public.volleyball_create_game(
  p_title text,
  p_venue text,
  p_starts_at timestamptz,
  p_players_per_side int default 6,
  p_notes text default null,
  p_squad uuid default null
) returns uuid
language plpgsql security definer set search_path = public as $$
declare
  v_uid uuid := auth.uid();
  v_id uuid;
  v_code text;
  v_try int := 0;
begin
  if v_uid is null then
    raise exception 'Unauthenticated' using errcode = '42501';
  end if;
  if p_title is null or length(trim(p_title)) not between 1 and 80 then
    raise exception 'Title must be 1-80 characters' using errcode = '23514';
  end if;
  if p_players_per_side not in (4, 6) then
    raise exception 'Format must be 4v4 or 6v6' using errcode = '23514';
  end if;
  if p_notes is not null and length(p_notes) > 500 then
    raise exception 'Notes are too long' using errcode = '23514';
  end if;

  v_id := public.create_game('volleyball', p_squad, p_title, p_venue, p_starts_at);

  loop
    v_code := upper(substr(md5(random()::text || clock_timestamp()::text), 1, 8));
    begin
      insert into public.volleyball_games (id, players_per_side, capacity, invite_code, notes)
      values (v_id, p_players_per_side, p_players_per_side * 2, v_code, nullif(trim(coalesce(p_notes, '')), ''));
      exit;
    exception when unique_violation then
      v_try := v_try + 1;
      if v_try > 5 then raise; end if;
    end;
  end loop;

  insert into public.volleyball_game_players (game_id, user_id, attendance_status)
  values (v_id, v_uid, 'playing');

  return v_id;
end;
$$;

-- Lightweight preview for the invite screen (does not reveal the roster).
create or replace function public.volleyball_preview_by_code(p_code text)
returns table (game_id uuid, title text, venue text, starts_at timestamptz, status text,
               players_per_side int, capacity int, playing_count int, already_joined boolean)
language plpgsql stable security definer set search_path = public as $$
begin
  if auth.uid() is null then
    raise exception 'Unauthenticated' using errcode = '42501';
  end if;
  return query
  select g.id, g.title, g.venue, g.starts_at, g.status, v.players_per_side, v.capacity,
         (select count(*)::int from public.volleyball_game_players p where p.game_id = v.id and p.attendance_status = 'playing'),
         exists (select 1 from public.volleyball_game_players p where p.game_id = v.id and p.user_id = auth.uid())
  from public.volleyball_games v join public.games g on g.id = v.id
  where v.invite_code = upper(trim(p_code));
end;
$$;

create or replace function public.volleyball_join_by_code(p_code text)
returns uuid
language plpgsql security definer set search_path = public as $$
declare
  v_uid uuid := auth.uid();
  v_game uuid;
  v_status text;
begin
  if v_uid is null then
    raise exception 'Unauthenticated' using errcode = '42501';
  end if;
  select v.id, g.status into v_game, v_status
  from public.volleyball_games v join public.games g on g.id = v.id
  where v.invite_code = upper(trim(coalesce(p_code, '')));
  if v_game is null then
    raise exception 'Invalid invitation code' using errcode = 'P0002';
  end if;
  if v_status in ('completed', 'cancelled') then
    raise exception 'This game is no longer open' using errcode = 'P0001';
  end if;

  perform public.ensure_profile(v_uid);
  insert into public.volleyball_game_players (game_id, user_id, attendance_status)
  values (v_game, v_uid, 'maybe')
  on conflict (game_id, user_id) do nothing;  -- duplicate join is a no-op
  return v_game;
end;
$$;

create or replace function public.volleyball_set_attendance(p_game uuid, p_status text)
returns void
language plpgsql security definer set search_path = public as $$
declare
  v_uid uuid := auth.uid();
  v_cap int;
  v_gstatus text;
  v_playing int;
begin
  if v_uid is null then
    raise exception 'Unauthenticated' using errcode = '42501';
  end if;
  if p_status not in ('playing', 'maybe', 'not_playing') then
    raise exception 'Invalid attendance status' using errcode = '23514';
  end if;

  -- Serialise RSVPs per game so capacity can't be exceeded by concurrent requests.
  select v.capacity, g.status into v_cap, v_gstatus
  from public.volleyball_games v join public.games g on g.id = v.id
  where v.id = p_game
  for update of v;
  if v_cap is null then
    raise exception 'Game not found' using errcode = 'P0002';
  end if;
  if not exists (select 1 from public.volleyball_game_players where game_id = p_game and user_id = v_uid) then
    raise exception 'Join the game with its invitation code first' using errcode = '42501';
  end if;
  if v_gstatus in ('completed', 'cancelled') then
    raise exception 'This game is no longer open' using errcode = 'P0001';
  end if;

  if p_status = 'playing' then
    select count(*) into v_playing from public.volleyball_game_players
    where game_id = p_game and attendance_status = 'playing' and user_id <> v_uid;
    if v_playing >= v_cap then
      raise exception 'Game is full (% players)', v_cap using errcode = 'P0001';
    end if;
  else
    delete from public.volleyball_team_players where game_id = p_game and user_id = v_uid;
  end if;

  update public.volleyball_game_players
  set attendance_status = p_status, updated_at = now()
  where game_id = p_game and user_id = v_uid;
end;
$$;

-- p_side = 'A' | 'B' assigns or moves; null removes the assignment.
create or replace function public.volleyball_set_team(p_game uuid, p_user uuid, p_side text)
returns void
language plpgsql security definer set search_path = public as $$
declare
  v_pps int;
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

  select players_per_side into v_pps from public.volleyball_games where id = p_game for update;
  if v_pps is null then
    raise exception 'Game not found' using errcode = 'P0002';
  end if;

  if p_side is null then
    delete from public.volleyball_team_players where game_id = p_game and user_id = p_user;
    return;
  end if;

  if not exists (select 1 from public.volleyball_game_players
                 where game_id = p_game and user_id = p_user and attendance_status = 'playing') then
    raise exception 'Only confirmed players can be assigned to a team' using errcode = 'P0001';
  end if;

  select count(*) into v_count from public.volleyball_team_players
  where game_id = p_game and team_side = p_side and user_id <> p_user;
  if v_count >= v_pps then
    raise exception 'Team % is full (% players)', p_side, v_pps using errcode = 'P0001';
  end if;

  insert into public.volleyball_team_players (game_id, user_id, team_side)
  values (p_game, p_user, p_side)
  on conflict (game_id, user_id) do update set team_side = excluded.team_side, assigned_at = now();
end;
$$;

create or replace function public.volleyball_auto_balance(p_game uuid)
returns void
language plpgsql security definer set search_path = public as $$
declare
  v_pps int;
  r record;
  i int := 0;
begin
  if auth.uid() is null then
    raise exception 'Unauthenticated' using errcode = '42501';
  end if;
  if not public.is_game_organizer(p_game, auth.uid()) then
    raise exception 'Forbidden: only the organizer can manage teams' using errcode = '42501';
  end if;
  select players_per_side into v_pps from public.volleyball_games where id = p_game for update;
  if v_pps is null then
    raise exception 'Game not found' using errcode = 'P0002';
  end if;

  delete from public.volleyball_team_players where game_id = p_game;
  for r in
    select user_id from public.volleyball_game_players
    where game_id = p_game and attendance_status = 'playing'
    order by random()
  loop
    exit when i >= v_pps * 2;
    insert into public.volleyball_team_players (game_id, user_id, team_side)
    values (p_game, r.user_id, case when i % 2 = 0 then 'A' else 'B' end);
    i := i + 1;
  end loop;
end;
$$;

create or replace function public.volleyball_set_status(p_game uuid, p_status text)
returns void
language plpgsql security definer set search_path = public as $$
begin
  if p_status not in ('scheduled', 'completed', 'cancelled') then
    raise exception 'Invalid status' using errcode = '23514';
  end if;
  if not exists (select 1 from public.volleyball_games where id = p_game) then
    raise exception 'Game not found' using errcode = 'P0002';
  end if;
  perform public.update_game_core(p_game, null, null, null, p_status);  -- organizer check inside
end;
$$;

create or replace function public.volleyball_list_my_games()
returns table (game_id uuid, title text, venue text, starts_at timestamptz, status text,
               players_per_side int, capacity int, invite_code text, is_organizer boolean,
               my_status text, playing_count int, maybe_count int)
language sql stable security definer set search_path = public as $$
  select g.id, g.title, g.venue, g.starts_at, g.status, v.players_per_side, v.capacity, v.invite_code,
         public.is_game_organizer(g.id, auth.uid()),
         (select p.attendance_status from public.volleyball_game_players p where p.game_id = v.id and p.user_id = auth.uid()),
         (select count(*)::int from public.volleyball_game_players p where p.game_id = v.id and p.attendance_status = 'playing'),
         (select count(*)::int from public.volleyball_game_players p where p.game_id = v.id and p.attendance_status = 'maybe')
  from public.volleyball_games v
  join public.games g on g.id = v.id
  where auth.uid() is not null and public.volleyball_is_member(v.id, auth.uid())
  order by g.starts_at asc;
$$;

create or replace function public.volleyball_get_game(p_game uuid)
returns jsonb
language plpgsql stable security definer set search_path = public as $$
declare
  v_uid uuid := auth.uid();
  v_result jsonb;
begin
  if v_uid is null then
    raise exception 'Unauthenticated' using errcode = '42501';
  end if;
  if not public.volleyball_is_member(p_game, v_uid) then
    raise exception 'Forbidden' using errcode = '42501';
  end if;

  select jsonb_build_object(
    'game_id', g.id, 'title', g.title, 'venue', g.venue, 'starts_at', g.starts_at, 'status', g.status,
    'players_per_side', v.players_per_side, 'capacity', v.capacity, 'invite_code', v.invite_code,
    'notes', v.notes, 'created_by', g.created_by,
    'is_organizer', public.is_game_organizer(g.id, v_uid),
    'my_status', (select p.attendance_status from public.volleyball_game_players p where p.game_id = v.id and p.user_id = v_uid),
    'players', coalesce((
      select jsonb_agg(jsonb_build_object(
        'user_id', p.user_id,
        'name', coalesce(pr.display_name, pr.full_name, 'Player'),
        'avatar_url', pr.avatar_url,
        'attendance_status', p.attendance_status,
        'team_side', t.team_side,
        'joined_at', p.joined_at) order by p.joined_at)
      from public.volleyball_game_players p
      left join public.profiles pr on pr.id = p.user_id
      left join public.volleyball_team_players t on t.game_id = p.game_id and t.user_id = p.user_id
      where p.game_id = v.id), '[]'::jsonb)
  ) into v_result
  from public.volleyball_games v join public.games g on g.id = v.id
  where v.id = p_game;

  return v_result;
end;
$$;

-- ---------------------------------------------------------------- grants
revoke all on function public.volleyball_confirmed_players(uuid) from public, anon, authenticated;
revoke all on function public.volleyball_is_member(uuid, uuid) from public, anon;
grant execute on function public.volleyball_is_member(uuid, uuid) to authenticated;  -- used by RLS policies

revoke all on function public.volleyball_create_game(text, text, timestamptz, int, text, uuid) from public, anon;
revoke all on function public.volleyball_preview_by_code(text) from public, anon;
revoke all on function public.volleyball_join_by_code(text) from public, anon;
revoke all on function public.volleyball_set_attendance(uuid, text) from public, anon;
revoke all on function public.volleyball_set_team(uuid, uuid, text) from public, anon;
revoke all on function public.volleyball_auto_balance(uuid) from public, anon;
revoke all on function public.volleyball_set_status(uuid, text) from public, anon;
revoke all on function public.volleyball_list_my_games() from public, anon;
revoke all on function public.volleyball_get_game(uuid) from public, anon;
grant execute on function public.volleyball_create_game(text, text, timestamptz, int, text, uuid) to authenticated;
grant execute on function public.volleyball_preview_by_code(text) to authenticated;
grant execute on function public.volleyball_join_by_code(text) to authenticated;
grant execute on function public.volleyball_set_attendance(uuid, text) to authenticated;
grant execute on function public.volleyball_set_team(uuid, uuid, text) to authenticated;
grant execute on function public.volleyball_auto_balance(uuid) to authenticated;
grant execute on function public.volleyball_set_status(uuid, text) to authenticated;
grant execute on function public.volleyball_list_my_games() to authenticated;
grant execute on function public.volleyball_get_game(uuid) to authenticated;

-- ---------------------------------------------------------------- realtime
do $$
declare t text;
begin
  foreach t in array array['volleyball_games', 'volleyball_game_players', 'volleyball_team_players'] loop
    if not exists (select 1 from pg_publication_tables
                   where pubname = 'supabase_realtime' and schemaname = 'public' and tablename = t) then
      execute format('alter publication supabase_realtime add table public.%I', t);
    end if;
  end loop;
end $$;

-- ---------------------------------------------------------------- registry (left disabled until the UI is wired)
update public.sports
set game_table = 'public.volleyball_games',
    confirmed_players_fn = 'public.volleyball_confirmed_players(uuid)'
where key = 'volleyball';

insert into ops.change_ledger (migration_name, owner, sport, objects, description)
values ('volleyball_core', 'dev_c', 'volleyball',
  '{volleyball_games,volleyball_game_players,volleyball_team_players,volleyball_confirmed_players,volleyball_is_member,volleyball_create_game,volleyball_preview_by_code,volleyball_join_by_code,volleyball_set_attendance,volleyball_set_team,volleyball_auto_balance,volleyball_set_status,volleyball_list_my_games,volleyball_get_game}',
  'Volleyball MVP: game extension, RSVP with capacity lock, team A/B, invite codes, RLS read-only + definer RPCs');
