-- MANUAL ONLY: run in the existing environment's Supabase SQL Editor.
-- Atomic wrapper retains save_team_formation's authorization, coordinate and GK logic.
begin;
create or replace function public.football_save_lineups(p_match uuid,p_teams jsonb)
returns jsonb language plpgsql security definer set search_path=public as $$
declare
  v_squad uuid; v_capacity integer; v_item jsonb; v_team uuid; v_revision integer; v_new integer;
  v_result jsonb:='{}'::jsonb;
begin
  if auth.uid() is null then raise exception 'Unauthenticated' using errcode='42501'; end if;
  select squad_id,players_per_team into v_squad,v_capacity from public.matches where id=p_match for update;
  if not found then raise exception 'Football match not found' using errcode='P0002'; end if;
  if not (exists(select 1 from public.squads where id=v_squad and owner_id=auth.uid())
    or exists(select 1 from public.squad_members where squad_id=v_squad and user_id=auth.uid() and status='active' and role in ('owner','admin'))
    or exists(select 1 from public.user_roles where user_id=auth.uid() and role='admin')) then
    raise exception 'Only squad owners and authorized admins can save' using errcode='42501';
  end if;
  if p_teams is null or jsonb_typeof(p_teams)<>'array' then raise exception 'Expected team array' using errcode='22023'; end if;
  perform 1 from public.teams where match_id=p_match order by id for update;
  perform 1 from public.match_attendance where match_id=p_match for update;
  if jsonb_array_length(p_teams)<>(select count(*) from public.teams where match_id=p_match)
    or (select count(distinct t->>'team_id') from jsonb_array_elements(p_teams) t)<>jsonb_array_length(p_teams) then
    raise exception 'Include every match team exactly once' using errcode='23514';
  end if;
  for v_item in select value from jsonb_array_elements(p_teams) loop
    v_team:=(v_item->>'team_id')::uuid;
    select revision into v_revision from public.teams where id=v_team and match_id=p_match;
    if not found then raise exception 'Team does not belong to this match' using errcode='23514'; end if;
    if v_revision is distinct from (v_item->>'expected_revision')::integer then
      raise exception 'Conflict: lineup revision mismatch. Reload and review incoming changes.' using errcode='40001';
    end if;
    if jsonb_typeof(v_item->'positions') is distinct from 'array' then raise exception 'Positions must be an array' using errcode='22023'; end if;
    if (select count(*) from jsonb_array_elements(v_item->'positions') p where not coalesce((p->>'is_substitute')::boolean,false))>v_capacity then
      raise exception 'Team exceeds match format capacity' using errcode='23514';
    end if;
    if exists(select 1 from jsonb_array_elements(v_item->'positions') p where not exists(
      select 1 from public.match_attendance a where a.match_id=p_match and a.user_id=(p->>'user_id')::uuid and a.status='playing'
    )) then raise exception 'Only Playing attendees can be assigned. Maybe players remain on the provisional bench.' using errcode='23514'; end if;
    if exists(select 1 from jsonb_array_elements(v_item->'positions') p where not coalesce((p->>'is_substitute')::boolean,false)
      and ((p->>'x') is null or (p->>'y') is null or (p->>'x')::numeric not between 0 and 1 or (p->>'y')::numeric not between 0 and 1)) then
      raise exception 'Valid active player coordinates are required' using errcode='23514';
    end if;
  end loop;
  if exists(select p->>'user_id' from jsonb_array_elements(p_teams) t cross join lateral jsonb_array_elements(t->'positions') p
    group by p->>'user_id' having count(*)>1) then raise exception 'Duplicate player assignment' using errcode='23514'; end if;
  for v_item in select value from jsonb_array_elements(p_teams) loop
    v_team:=(v_item->>'team_id')::uuid;
    v_new:=public.save_team_formation(v_team,v_item->>'formation',(v_item->>'expected_revision')::integer,v_item->'positions');
    v_result:=v_result||jsonb_build_object(v_team::text,v_new);
  end loop;
  return v_result;
end $$;
revoke all on function public.football_save_lineups(uuid,jsonb) from public,anon;
grant execute on function public.football_save_lineups(uuid,jsonb) to authenticated;

-- RSVP changes never promote attendance; they only clear invalid football assignments.
create or replace function public.football_clear_ineligible_lineup()
returns trigger language plpgsql security definer set search_path=public as $$
begin
  if new.status<>'playing' then
    with removed as (delete from public.team_players where match_id=new.match_id and user_id=new.user_id returning team_id)
    update public.teams set revision=revision+1 where id in (select team_id from removed);
  end if;
  return new;
end $$;
revoke all on function public.football_clear_ineligible_lineup() from public,anon,authenticated;
drop trigger if exists football_clear_ineligible_lineup on public.match_attendance;
create trigger football_clear_ineligible_lineup after insert or update of status on public.match_attendance for each row execute function public.football_clear_ineligible_lineup();
insert into ops.change_ledger(migration_name,owner,sport,objects,description)
values('football_popup_lineups','dev_a','football','{football_save_lineups,football_clear_ineligible_lineup}',
'Atomic all-team football save using existing formation revisions; attendance cleanup; no RSVP promotion') on conflict(migration_name) do nothing;
notify pgrst,'reload schema';
commit;
