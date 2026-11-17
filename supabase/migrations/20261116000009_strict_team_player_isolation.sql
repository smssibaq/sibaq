-- =============================================================================
-- Migration: 20261116000008_strict_team_player_isolation.sql
-- Description: Enforce strict single-team membership per player per match
-- Developer: Developer B (Team Management & Formation Editor)
-- Target Database: Supabase Cloud (project: czhkpkhtpdafiiadvgje, ap-south-1)
-- =============================================================================

-- 1. DATA INTEGRITY AUDIT: Verify no player belongs to multiple teams in the same match
do $$
declare
  v_duplicates text;
begin
  select string_agg('Player ' || user_id::text || ' in match ' || match_id::text, '; ') into v_duplicates
  from (
    select match_id, user_id, count(distinct team_id) as team_count
    from public.team_players
    group by match_id, user_id
    having count(distinct team_id) > 1
  ) d;

  if v_duplicates is not null then
    raise exception 'Data integrity violation: Found duplicate team memberships: [%]. Manual resolution required.', v_duplicates;
  end if;
end $$;

-- 2. DATABASE CONSTRAINT: Enforce unique player membership per match
create unique index if not exists unique_player_team_membership
on public.team_players (match_id, user_id);

-- 3. TRIGGER: Enforce that a player can only belong to one team per match
create or replace function public.check_unique_player_team_membership()
returns trigger as $$
begin
  if exists (
    select 1 from public.team_players
    where match_id = new.match_id
      and user_id = new.user_id
      and id != coalesce(new.id, '00000000-0000-0000-0000-000000000000'::uuid)
  ) then
    -- Remove the previous membership automatically if transferring teams
    delete from public.team_players
    where match_id = new.match_id
      and user_id = new.user_id
      and id != coalesce(new.id, '00000000-0000-0000-0000-000000000000'::uuid);
  end if;
  return new;
end;
$$ language plpgsql;

drop trigger if exists trg_enforce_player_team_membership on public.team_players;
create trigger trg_enforce_player_team_membership
  before insert or update on public.team_players
  for each row
  execute function public.check_unique_player_team_membership();

-- 4. RPC: assign_team_player with explicit previous membership removal
create or replace function public.assign_team_player(
  p_team uuid,
  p_user uuid,
  p_position text
) returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_match uuid;
  v_squad uuid;
  v_caller_role text;
  v_pos text;
  v_is_sub boolean;
  v_x double precision;
  v_y double precision;
begin
  if auth.uid() is null then
    raise exception 'Unauthenticated' using errcode = '42501';
  end if;

  select match_id into v_match from public.teams where id = p_team;
  if v_match is null then
    raise exception 'Team not found' using errcode = 'P0002';
  end if;

  select squad_id into v_squad from public.matches where id = v_match;

  select role into v_caller_role
  from public.squad_members
  where squad_id = v_squad
    and user_id = auth.uid()
    and status = 'active';

  if v_caller_role not in ('owner', 'admin') then
    if not exists (select 1 from public.squads where id = v_squad and owner_id = auth.uid()) then
      raise exception 'Forbidden: Only squad owner or admin can assign players' using errcode = '42501';
    end if;
  end if;

  v_pos := coalesce(nullif(trim(p_position), ''), 'SUB');
  v_is_sub := (upper(v_pos) = 'SUB');

  -- Enforce maximum one goalkeeper per team
  if upper(v_pos) = 'GK' then
    if exists (
      select 1 from public.team_players
      where team_id = p_team
        and user_id != p_user
        and upper(trim(position_label)) = 'GK'
    ) then
      raise exception 'This team already has a goalkeeper. Only one goalkeeper is allowed per team.'
        using errcode = '23505';
    end if;
  end if;

  if v_is_sub then
    v_x := null;
    v_y := null;
  else
    v_x := 0.5;
    v_y := case when upper(v_pos) = 'GK' then 0.92 else 0.5 end;
  end if;

  -- 1. Explicitly remove any existing membership in ANY team for this match
  delete from public.team_players
  where match_id = v_match
    and user_id = p_user;

  -- 2. Insert new team membership
  insert into public.team_players (
    team_id,
    match_id,
    user_id,
    position_label,
    is_substitute,
    pitch_x,
    pitch_y
  ) values (
    p_team,
    v_match,
    p_user,
    v_pos,
    v_is_sub,
    v_x,
    v_y
  );
end;
$$;

-- 5. RPC: save_team_formation with strict team isolation
create or replace function public.save_team_formation(
  p_team uuid,
  p_formation text,
  p_expected_revision integer,
  p_positions jsonb
) returns integer
language plpgsql
security definer
set search_path = public
as $$
declare
  v_match uuid;
  v_squad uuid;
  v_current_rev integer;
  v_caller_role text;
  v_item jsonb;
  v_gk_count integer := 0;
begin
  if auth.uid() is null then
    raise exception 'Unauthenticated' using errcode = '42501';
  end if;

  select match_id, revision into v_match, v_current_rev
  from public.teams
  where id = p_team;

  if v_match is null then
    raise exception 'Team not found' using errcode = 'P0002';
  end if;

  select squad_id into v_squad from public.matches where id = v_match;

  select role into v_caller_role
  from public.squad_members
  where squad_id = v_squad
    and user_id = auth.uid()
    and status = 'active';

  if v_caller_role not in ('owner', 'admin') then
    if not exists (select 1 from public.squads where id = v_squad and owner_id = auth.uid()) then
      raise exception 'Forbidden: Only squad owner or admin can update formations' using errcode = '42501';
    end if;
  end if;

  if p_expected_revision != v_current_rev then
    raise exception 'Conflict: Lineup revision mismatch (expected %, current %)', p_expected_revision, v_current_rev
      using errcode = '40001';
  end if;

  -- Validate that maximum 1 goalkeeper is present in the payload
  for v_item in select * from jsonb_array_elements(p_positions)
  loop
    if upper(trim(coalesce(v_item->>'position_label', ''))) = 'GK' then
      v_gk_count := v_gk_count + 1;
    end if;
  end loop;

  if v_gk_count > 1 then
    raise exception 'This team already has a goalkeeper. Only one goalkeeper is allowed per team.'
      using errcode = '23505';
  end if;

  -- 1. Remove previous memberships in this match for any players being assigned to this team
  delete from public.team_players
  where match_id = v_match
    and user_id in (
      select (item->>'user_id')::uuid
      from jsonb_array_elements(p_positions) item
    );

  -- 2. Clear previous players for this specific team
  delete from public.team_players where team_id = p_team;

  -- 3. Insert fresh player memberships
  for v_item in select * from jsonb_array_elements(p_positions)
  loop
    insert into public.team_players (
      team_id,
      match_id,
      user_id,
      position_label,
      is_substitute,
      pitch_x,
      pitch_y
    ) values (
      p_team,
      v_match,
      (v_item->>'user_id')::uuid,
      coalesce(v_item->>'position_label', 'MID'),
      coalesce((v_item->>'is_substitute')::boolean, false),
      nullif(v_item->>'pitch_x', '')::double precision,
      nullif(v_item->>'pitch_y', '')::double precision
    );
  end loop;

  update public.teams
  set formation = p_formation,
      revision = v_current_rev + 1
  where id = p_team;

  return v_current_rev + 1;
end;
$$;
