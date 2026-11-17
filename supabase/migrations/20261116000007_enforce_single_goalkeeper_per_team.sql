-- =============================================================================
-- Migration: 20261116000007_enforce_single_goalkeeper_per_team.sql
-- Description: Enforce strict single goalkeeper rule per team across constraints, triggers, and RPCs
-- Developer: Developer B (Team Management & Formation Editor)
-- Target Database: Supabase Cloud (project: czhkpkhtpdafiiadvgje, ap-south-1)
-- =============================================================================

-- 1. DATA INTEGRITY AUDIT: Ensure no existing teams violate single goalkeeper rule
do $$
declare
  v_violating_teams text;
begin
  select string_agg(team_id::text, ', ') into v_violating_teams
  from (
    select team_id, count(*) as gk_count
    from public.team_players
    where upper(trim(position_label)) = 'GK'
    group by team_id
    having count(*) > 1
  ) t;

  if v_violating_teams is not null then
    raise exception 'Data integrity violation: Teams [%] have multiple goalkeepers. Explicit manual resolution required before applying constraint.', v_violating_teams;
  end if;
end $$;

-- 2. DATABASE CONSTRAINT: Partial unique index enforcing maximum 1 GK per team
create unique index if not exists unique_goalkeeper_per_team
on public.team_players (team_id)
where upper(trim(position_label)) = 'GK';

-- 3. TRIGGER: Pre-insert & Pre-update validation with user-friendly error message
create or replace function public.check_single_goalkeeper_per_team()
returns trigger as $$
begin
  if upper(trim(new.position_label)) = 'GK' then
    if exists (
      select 1 from public.team_players
      where team_id = new.team_id
        and id != coalesce(new.id, '00000000-0000-0000-0000-000000000000'::uuid)
        and user_id != new.user_id
        and upper(trim(position_label)) = 'GK'
    ) then
      raise exception 'This team already has a goalkeeper. Only one goalkeeper is allowed per team.'
        using errcode = '23505';
    end if;
  end if;
  return new;
end;
$$ language plpgsql;

drop trigger if exists trg_enforce_single_goalkeeper on public.team_players;
create trigger trg_enforce_single_goalkeeper
  before insert or update on public.team_players
  for each row
  execute function public.check_single_goalkeeper_per_team();

-- 4. RPC: assign_team_player with single-goalkeeper enforcement
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
  )
  on conflict (match_id, user_id) do update
  set team_id = excluded.team_id,
      position_label = excluded.position_label,
      is_substitute = excluded.is_substitute,
      pitch_x = excluded.pitch_x,
      pitch_y = excluded.pitch_y;
end;
$$;

-- 5. RPC: save_team_formation with single-goalkeeper enforcement
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

  delete from public.team_players where team_id = p_team;

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

