-- multisport_player_profiles: sport-agnostic onboarding & profiles (owner: dev_a / platform)
-- Each player picks the sports they play, with a skill level and sport-specific roles.
-- Role options live in public.sports.roles, so a new sport only updates its own row.

-- 1. SPORT METADATA FOR THE UI
alter table public.sports add column if not exists emoji text;
alter table public.sports add column if not exists role_label text not null default 'Position';
alter table public.sports add column if not exists max_roles integer not null default 2 check (max_roles between 1 and 6);
alter table public.sports add column if not exists roles jsonb not null default '[]'::jsonb
  check (jsonb_typeof(roles) = 'array');

update public.sports set emoji = '⚽', role_label = 'Position', max_roles = 2,
  roles = '[{"key":"GK","label":"Goalkeeper"},{"key":"DEF","label":"Defender"},{"key":"MID","label":"Midfielder"},{"key":"ATT","label":"Forward"}]'
where key = 'football';
update public.sports set emoji = '🏸', role_label = 'Plays', max_roles = 3,
  roles = '[{"key":"SINGLES","label":"Singles"},{"key":"DOUBLES","label":"Doubles"},{"key":"MIXED","label":"Mixed doubles"}]'
where key = 'badminton';
update public.sports set emoji = '🏏', role_label = 'Role', max_roles = 2,
  roles = '[{"key":"BAT","label":"Batter"},{"key":"BOWL","label":"Bowler"},{"key":"AR","label":"All-rounder"},{"key":"WK","label":"Wicketkeeper"}]'
where key = 'cricket';
update public.sports set emoji = '🏐', role_label = 'Position', max_roles = 2,
  roles = '[{"key":"SET","label":"Setter"},{"key":"OH","label":"Outside hitter"},{"key":"MB","label":"Middle blocker"},{"key":"OPP","label":"Opposite"},{"key":"LIB","label":"Libero"},{"key":"ANY","label":"Any position"}]'
where key = 'volleyball';

-- 2. PROFILE BASICS
alter table public.profiles add column if not exists home_area text check (home_area is null or length(home_area) <= 80);
alter table public.profiles add column if not exists bio text check (bio is null or length(bio) <= 160);
alter table public.profiles add column if not exists onboarding_completed_at timestamptz;

-- 3. PER-SPORT PLAYER PROFILE
create table if not exists public.player_sport_profiles (
  user_id uuid not null references public.profiles(id) on delete cascade,
  sport text not null references public.sports(key) on delete cascade,
  skill_level text not null default 'casual'
    check (skill_level in ('beginner', 'casual', 'intermediate', 'advanced')),
  roles text[] not null default '{}',
  is_primary boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  primary key (user_id, sport)
);

create unique index if not exists uq_player_primary_sport
  on public.player_sport_profiles(user_id) where is_primary;
create index if not exists idx_player_sport_profiles_sport on public.player_sport_profiles(sport);

alter table public.player_sport_profiles enable row level security;

drop policy if exists "Sport profiles readable by signed-in users" on public.player_sport_profiles;
create policy "Sport profiles readable by signed-in users"
  on public.player_sport_profiles for select to authenticated using (true);
-- Writes only through save_my_profile (below).

-- Roles must be valid for the sport and within max_roles
create or replace function public.validate_player_sport_profile()
returns trigger
language plpgsql
set search_path = public
as $$
declare
  v_allowed text[];
  v_max integer;
begin
  select coalesce(array(select r->>'key' from jsonb_array_elements(s.roles) r), '{}'), s.max_roles
  into v_allowed, v_max
  from public.sports s where s.key = new.sport;

  -- normalise: upper-case, drop blanks and duplicates, keep the player's order (first = main role)
  new.roles := coalesce(array(
    select r from (
      select upper(trim(x)) as r, min(ord) as o
      from unnest(new.roles) with ordinality u(x, ord)
      where trim(x) <> ''
      group by 1
    ) q order by o
  ), '{}');
  if cardinality(new.roles) > v_max then
    raise exception 'Pick at most % for %', v_max, new.sport using errcode = '23514';
  end if;
  if cardinality(v_allowed) > 0 and not (new.roles <@ v_allowed) then
    raise exception 'Invalid role for %: allowed %', new.sport, v_allowed using errcode = '23514';
  end if;
  new.updated_at := now();
  return new;
end;
$$;

drop trigger if exists trg_validate_player_sport_profile on public.player_sport_profiles;
create trigger trg_validate_player_sport_profile
  before insert or update on public.player_sport_profiles
  for each row execute function public.validate_player_sport_profile();

-- Keep the legacy football columns (used by football lineups) in sync
create or replace function public.sync_football_positions()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if tg_op = 'DELETE' then
    if old.sport = 'football' then
      update public.profiles set preferred_position = null, secondary_position = null, updated_at = now()
      where id = old.user_id;
    end if;
    return old;
  end if;
  if new.sport = 'football' then
    update public.profiles
    set preferred_position = new.roles[1],
        secondary_position = new.roles[2],
        updated_at = now()
    where id = new.user_id;
  end if;
  return new;
end;
$$;

drop trigger if exists trg_sync_football_positions on public.player_sport_profiles;
create trigger trg_sync_football_positions
  after insert or update or delete on public.player_sport_profiles
  for each row execute function public.sync_football_positions();

-- 4. BACKFILL existing football-only profiles
insert into public.player_sport_profiles (user_id, sport, skill_level, roles, is_primary)
select p.id, 'football', 'casual',
       array_remove(array[p.preferred_position, p.secondary_position], null), true
from public.profiles p
where p.preferred_position is not null
on conflict (user_id, sport) do nothing;

update public.profiles p
set onboarding_completed_at = coalesce(p.onboarding_completed_at, now())
where exists (select 1 from public.player_sport_profiles s where s.user_id = p.id)
  and coalesce(trim(p.display_name), '') <> '';

-- 5. RPC: one atomic save for onboarding and the profile editor
-- p_sports: [{"sport":"football","skill_level":"intermediate","roles":["MID","ATT"],"is_primary":true}, ...]
-- Sports not in the list are removed from the player's profile.
create or replace function public.save_my_profile(
  p_display_name text,
  p_sports jsonb,
  p_home_area text default null,
  p_bio text default null,
  p_avatar_url text default null
) returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_uid uuid := auth.uid();
  v_item jsonb;
  v_primary text;
  v_keys text[];
begin
  if v_uid is null then
    raise exception 'Unauthenticated' using errcode = '42501';
  end if;
  if p_display_name is null or length(trim(p_display_name)) < 2 or length(trim(p_display_name)) > 40 then
    raise exception 'Name must be 2-40 characters' using errcode = '23514';
  end if;
  if p_sports is null or jsonb_typeof(p_sports) <> 'array' or jsonb_array_length(p_sports) = 0 then
    raise exception 'Pick at least one sport' using errcode = '23514';
  end if;

  select array_agg(distinct x->>'sport') into v_keys from jsonb_array_elements(p_sports) x;
  if exists (select 1 from unnest(v_keys) k where k is null or not exists (select 1 from public.sports s where s.key = k)) then
    raise exception 'Unknown sport in selection' using errcode = '23503';
  end if;

  -- primary = the flagged one, else the first in the list
  select x->>'sport' into v_primary
  from jsonb_array_elements(p_sports) with ordinality t(x, n)
  order by coalesce((x->>'is_primary')::boolean, false) desc, n
  limit 1;

  perform public.ensure_profile(v_uid);

  update public.profiles
  set display_name = trim(p_display_name),
      home_area = nullif(trim(coalesce(p_home_area, '')), ''),
      bio = nullif(trim(coalesce(p_bio, '')), ''),
      avatar_url = coalesce(nullif(trim(coalesce(p_avatar_url, '')), ''), avatar_url),
      onboarding_completed_at = coalesce(onboarding_completed_at, now()),
      updated_at = now()
  where id = v_uid;

  delete from public.player_sport_profiles
  where user_id = v_uid and sport <> all (v_keys);

  update public.player_sport_profiles set is_primary = false where user_id = v_uid and is_primary;

  for v_item in select * from jsonb_array_elements(p_sports)
  loop
    insert into public.player_sport_profiles (user_id, sport, skill_level, roles, is_primary)
    values (
      v_uid,
      v_item->>'sport',
      coalesce(nullif(v_item->>'skill_level', ''), 'casual'),
      coalesce(array(select jsonb_array_elements_text(coalesce(v_item->'roles', '[]'::jsonb))), '{}'),
      (v_item->>'sport') = v_primary
    )
    on conflict (user_id, sport) do update
    set skill_level = excluded.skill_level,
        roles = excluded.roles,
        is_primary = excluded.is_primary;
  end loop;

  return public.get_player_profile(v_uid);
end;
$$;

-- 6. RPC: full profile card (own or someone else's)
create or replace function public.get_player_profile(p_user uuid default null)
returns jsonb
language plpgsql
security definer
set search_path = public
stable
as $$
declare
  v_me uuid := auth.uid();
  v_user uuid := coalesce(p_user, auth.uid());
  v_is_me boolean;
  p record;
begin
  if v_me is null then
    raise exception 'Unauthenticated' using errcode = '42501';
  end if;
  v_is_me := v_user = v_me;

  select * into p from public.profiles where id = v_user;
  if p.id is null then
    return null;
  end if;

  return jsonb_build_object(
    'id', p.id,
    'display_name', p.display_name,
    'avatar_url', nullif(p.avatar_url, ''),
    'home_area', p.home_area,
    'bio', p.bio,
    'is_me', v_is_me,
    'onboarding_completed', p.onboarding_completed_at is not null,
    'sports', coalesce((
      select jsonb_agg(jsonb_build_object(
        'sport', s.key,
        'name', s.name,
        'emoji', s.emoji,
        'role_label', s.role_label,
        'skill_level', ps.skill_level,
        'roles', to_jsonb(ps.roles),
        'role_labels', (select coalesce(jsonb_agg(r->>'label' order by array_position(ps.roles, r->>'key')), '[]'::jsonb)
                        from jsonb_array_elements(s.roles) r where (r->>'key') = any (ps.roles)),
        'is_primary', ps.is_primary,
        'is_enabled', s.is_enabled,
        'games_played', (select count(*) from public.games g
                         where g.sport = s.key and g.starts_at < now() and g.status <> 'cancelled'
                           and public.is_game_participant(g.id, v_user)),
        'upcoming_games', case when v_is_me then (select count(*) from public.games g
                         where g.sport = s.key and g.starts_at >= now() and g.status = 'scheduled'
                           and public.is_game_participant(g.id, v_user)) else null end
      ) order by ps.is_primary desc, s.sort_order)
      from public.player_sport_profiles ps
      join public.sports s on s.key = ps.sport
      where ps.user_id = v_user
    ), '[]'::jsonb),
    -- Ratings are private: only the player sees their own average
    'my_rating', case when v_is_me then (
      select jsonb_build_object('average', round(avg(r.rating)::numeric, 1), 'count', count(*))
      from public.game_player_ratings r where r.rated_player_id = v_user
    ) else null end
  );
end;
$$;

-- 7. RPC: sports catalogue for onboarding (enabled first, includes "coming soon")
create or replace function public.list_sports_catalog()
returns table (
  key text, name text, emoji text, role_label text, max_roles integer,
  roles jsonb, is_team_sport boolean, is_enabled boolean, sort_order integer
)
language sql
security definer
set search_path = public
stable
as $$
  select s.key, s.name, s.emoji, s.role_label, s.max_roles, s.roles, s.is_team_sport, s.is_enabled, s.sort_order
  from public.sports s
  order by s.is_enabled desc, s.sort_order;
$$;

-- 8. New sign-ups: onboarding is not complete until save_my_profile runs
--    (handle_new_user already creates the profile row; nothing to change there).

-- 9. GRANTS
revoke all on function public.validate_player_sport_profile() from public, anon, authenticated;
revoke all on function public.sync_football_positions() from public, anon, authenticated;
revoke all on function public.save_my_profile(text, jsonb, text, text, text) from public, anon;
revoke all on function public.get_player_profile(uuid) from public, anon;
revoke all on function public.list_sports_catalog() from public, anon;
grant execute on function public.save_my_profile(text, jsonb, text, text, text) to authenticated;
grant execute on function public.get_player_profile(uuid) to authenticated;
grant execute on function public.list_sports_catalog() to authenticated;

insert into ops.change_ledger (migration_name, owner, sport, objects, description)
values ('multisport_player_profiles', 'dev_a', null,
  '{sports.emoji,sports.role_label,sports.max_roles,sports.roles,profiles.home_area,profiles.bio,profiles.onboarding_completed_at,player_sport_profiles,save_my_profile,get_player_profile,list_sports_catalog}',
  'Multi-sport onboarding and profiles: per-sport skill + roles, football positions kept in sync')
on conflict (migration_name) do nothing;
