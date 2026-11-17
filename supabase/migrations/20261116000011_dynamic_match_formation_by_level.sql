-- ==============================================================================
-- 20261116000010_dynamic_match_formation_by_level.sql
-- Fix: Align match team initial formations dynamically with match players_per_team
-- ==============================================================================

create or replace function public.create_match(
  p_squad uuid,
  p_title text,
  p_mode text,
  p_turf_name text,
  p_starts_at timestamptz,
  p_players_per_team integer,
  p_rsvp_deadline timestamptz default null
) returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_match_id uuid;
  v_caller_role text;
  v_initial_formation text;
begin
  if auth.uid() is null then
    raise exception 'Unauthenticated' using errcode = '42501';
  end if;

  select role into v_caller_role
  from public.squad_members
  where squad_id = p_squad
    and user_id = auth.uid()
    and status = 'active';

  if v_caller_role not in ('owner', 'admin') then
    if not exists (select 1 from public.squads where id = p_squad and owner_id = auth.uid()) then
      raise exception 'Forbidden: Only squad owner or admin can create matches' using errcode = '42501';
    end if;
  end if;

  if p_players_per_team < 3 or p_players_per_team > 11 then
    raise exception 'Players per team must be between 3 and 11' using errcode = '23514';
  end if;

  if p_mode not in ('single', 'friendly') then
    raise exception 'Invalid match mode' using errcode = '23514';
  end if;

  if p_starts_at <= now() then
    raise exception 'Match kickoff must be scheduled in the future' using errcode = '23514';
  end if;

  if p_rsvp_deadline is not null then
    if p_rsvp_deadline > p_starts_at then
      raise exception 'RSVP deadline must be before kickoff' using errcode = '23514';
    end if;
    if p_rsvp_deadline <= now() then
      raise exception 'RSVP deadline must be in the future' using errcode = '23514';
    end if;
  end if;

  -- Determine default formation matching format level
  if p_players_per_team <= 5 then
    v_initial_formation := '1-2-1 Diamond (5s)';
  elsif p_players_per_team = 6 then
    v_initial_formation := '2-2-1 Balanced (6s)';
  else
    v_initial_formation := '2-3-1 Balanced (7s)';
  end if;

  insert into public.matches (
    squad_id,
    title,
    mode,
    turf_name,
    starts_at,
    players_per_team,
    rsvp_deadline,
    status,
    created_by
  ) values (
    p_squad,
    trim(p_title),
    p_mode,
    trim(p_turf_name),
    p_starts_at,
    p_players_per_team,
    p_rsvp_deadline,
    'scheduled',
    auth.uid()
  ) returning id into v_match_id;

  if p_mode = 'single' then
    insert into public.teams (match_id, name, side, color, formation, revision)
    values (v_match_id, 'Squad XI', 'single', '#B7F34B', v_initial_formation, 1);
  elsif p_mode = 'friendly' then
    insert into public.teams (match_id, name, side, color, formation, revision)
    values
      (v_match_id, 'Team Green', 'A', '#B7F34B', v_initial_formation, 1),
      (v_match_id, 'Team White', 'B', '#F5F7F4', v_initial_formation, 1);
  end if;

  insert into public.squad_audit (squad_id, actor_id, action, details)
  values (
    p_squad,
    auth.uid(),
    'match_created',
    jsonb_build_object('match_id', v_match_id, 'title', p_title, 'mode', p_mode, 'players_per_team', p_players_per_team)
  );

  return v_match_id;
end;
$$;

grant execute on function public.create_match(uuid, text, text, text, timestamptz, integer, timestamptz) to authenticated;

-- Backward-compatible 6-parameter create_match
create or replace function public.create_match(
  p_squad uuid,
  p_title text,
  p_mode text,
  p_turf_name text,
  p_starts_at timestamptz,
  p_players_per_team integer
) returns uuid
language sql
security definer
as $$
  select public.create_match(p_squad, p_title, p_mode, p_turf_name, p_starts_at, p_players_per_team, null);
$$;

grant execute on function public.create_match(uuid, text, text, text, timestamptz, integer) to authenticated;

-- Retrofit existing matches whose teams defaulted to 2-3-1 on 5v5 / 6v6 fixtures
update public.teams t
set formation = '1-2-1 Diamond (5s)'
from public.matches m
where t.match_id = m.id
  and m.players_per_team <= 5
  and (t.formation = '2-3-1' or t.formation is null);

update public.teams t
set formation = '2-2-1 Balanced (6s)'
from public.matches m
where t.match_id = m.id
  and m.players_per_team = 6
  and (t.formation = '2-3-1' or t.formation is null);
