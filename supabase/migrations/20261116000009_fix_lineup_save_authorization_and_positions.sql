-- =============================================================================
-- Migration: 20261116000009_fix_lineup_save_authorization_and_positions.sql
-- Description: Fix save_team_formation authorization logic, parameter contracts (x/y/position), and error handling
-- Developer: Developer C (Match Management, Attendance & Realtime)
-- =============================================================================

-- Drop existing function with matching signature to ensure clean replacement
drop function if exists public.save_team_formation(uuid, text, integer, jsonb);

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
  v_is_authorized boolean := false;
  v_item jsonb;
  v_gk_count integer := 0;
  v_pos text;
  v_is_sub boolean;
  v_x double precision;
  v_y double precision;
begin
  -- 1. Check authentication
  if auth.uid() is null then
    raise exception 'Unauthenticated' using errcode = '42501';
  end if;

  -- 2. Validate team existence and get current revision & match ID
  select match_id, revision into v_match, v_current_rev
  from public.teams
  where id = p_team;

  if v_match is null then
    raise exception 'Team not found' using errcode = 'P0002';
  end if;

  -- 3. Resolve match host squad
  select squad_id into v_squad from public.matches where id = v_match;

  if v_squad is null then
    raise exception 'Match or host squad not found' using errcode = 'P0002';
  end if;

  -- 4. Server-side authorization check:
  -- Check A: Squad owner in squads table
  if exists (select 1 from public.squads where id = v_squad and owner_id = auth.uid()) then
    v_is_authorized := true;
  end if;

  -- Check B: Active squad owner or admin in squad_members table
  if not v_is_authorized then
    select role into v_caller_role
    from public.squad_members
    where squad_id = v_squad
      and user_id = auth.uid()
      and status = 'active';

    if v_caller_role in ('owner', 'admin') then
      v_is_authorized := true;
    end if;
  end if;

  -- Check C: System administrator in user_roles table
  if not v_is_authorized then
    if exists (select 1 from public.user_roles where user_id = auth.uid() and role = 'admin') then
      v_is_authorized := true;
    end if;
  end if;

  if not v_is_authorized then
    raise exception 'Not authorized: Only squad owner or admin can update formations' using errcode = '42501';
  end if;

  -- 5. Concurrency control: check revision match
  if p_expected_revision != v_current_rev then
    raise exception 'Conflict: Lineup revision mismatch (expected %, current %)', p_expected_revision, v_current_rev
      using errcode = '40001';
  end if;

  -- 6. Goalkeeper validation: maximum 1 goalkeeper allowed per team
  for v_item in select * from jsonb_array_elements(p_positions)
  loop
    v_pos := upper(trim(coalesce(v_item->>'position', v_item->>'position_label', '')));
    if v_pos = 'GK' then
      v_gk_count := v_gk_count + 1;
    end if;
  end loop;

  if v_gk_count > 1 then
    raise exception 'This team already has a goalkeeper. Only one goalkeeper is allowed per team.'
      using errcode = '23505';
  end if;

  -- 7. Remove previous match assignments for players included in this payload
  delete from public.team_players
  where match_id = v_match
    and user_id in (
      select (item->>'user_id')::uuid
      from jsonb_array_elements(p_positions) item
    );

  -- 8. Clear previous player records for this team
  delete from public.team_players where team_id = p_team;

  -- 9. Insert fresh team player records
  for v_item in select * from jsonb_array_elements(p_positions)
  loop
    v_pos := coalesce(nullif(trim(coalesce(v_item->>'position', v_item->>'position_label', '')), ''), 'MID');
    v_is_sub := coalesce(
      (v_item->>'is_substitute')::boolean,
      upper(v_pos) = 'SUB'
    );

    v_x := coalesce(
      nullif(v_item->>'x', '')::double precision,
      nullif(v_item->>'pitch_x', '')::double precision
    );
    v_y := coalesce(
      nullif(v_item->>'y', '')::double precision,
      nullif(v_item->>'pitch_y', '')::double precision
    );

    -- Normalize percentage [0.0, 100.0] coordinates to [0.0, 1.0] if needed
    if v_x is not null and v_x > 1.0 then
      v_x := v_x / 100.0;
    end if;
    if v_y is not null and v_y > 1.0 then
      v_y := v_y / 100.0;
    end if;

    if v_is_sub then
      v_x := null;
      v_y := null;
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
      (v_item->>'user_id')::uuid,
      v_pos,
      v_is_sub,
      v_x,
      v_y
    );
  end loop;

  -- 10. Update team formation metadata and increment revision
  update public.teams
  set formation = p_formation,
      revision = v_current_rev + 1
  where id = p_team;

  return v_current_rev + 1;
end;
$$;

-- Grant execution permissions
grant execute on function public.save_team_formation(uuid, text, integer, jsonb) to authenticated, anon;
