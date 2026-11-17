-- =============================================================================
-- Migration: 20261117143547_multisport_registry_text_refs   owner: platform
-- Description: Store sport table/function references as text instead of
--   regclass/regprocedure (reg* columns outside pg_catalog block pg_upgrade).
--   References are still validated on write and resolved at call time.
-- =============================================================================

alter table public.sports
  alter column game_table type text using game_table::text,
  alter column confirmed_players_fn type text using confirmed_players_fn::text,
  alter column organizer_check_fn type text using organizer_check_fn::text;

create or replace function public.validate_sport_registration()
returns trigger
language plpgsql
set search_path = public
as $$
declare
  v_oid oid;
  v_ret text;
begin
  if new.game_table is not null then
    perform new.game_table::regclass;  -- must exist
  end if;
  if new.confirmed_players_fn is not null then
    v_oid := new.confirmed_players_fn::regprocedure::oid;
    v_ret := pg_get_function_result(v_oid);
    if pg_get_function_identity_arguments(v_oid) !~ '^(p_\w+ )?uuid$' or v_ret <> 'SETOF uuid' then
      raise exception 'confirmed_players_fn for % must be (uuid) returns setof uuid, got (%) returns %',
        new.key, pg_get_function_identity_arguments(v_oid), v_ret;
    end if;
  end if;
  if new.organizer_check_fn is not null then
    v_oid := new.organizer_check_fn::regprocedure::oid;
    v_ret := pg_get_function_result(v_oid);
    if pg_get_function_identity_arguments(v_oid) !~ '^(p_\w+ )?uuid, (p_\w+ )?uuid$' or v_ret <> 'boolean' then
      raise exception 'organizer_check_fn for % must be (uuid, uuid) returns boolean', new.key;
    end if;
  end if;
  return new;
end;
$$;

create or replace function public.is_game_organizer(p_game uuid, p_user uuid)
returns boolean
language plpgsql
security definer
set search_path = public
stable
as $$
declare
  g record;
  v_fn text;
  v_ok boolean;
begin
  if p_user is null then
    return false;
  end if;
  select * into g from public.games where id = p_game;
  if g.id is null then
    return false;
  end if;

  select organizer_check_fn into v_fn from public.sports where key = g.sport;
  if v_fn is not null then
    execute format('select %s($1, $2)', v_fn::regprocedure::regproc) into v_ok using p_game, p_user;
    if coalesce(v_ok, false) then
      return true;
    end if;
  end if;

  return g.created_by = p_user
      or (g.squad_id is not null and public.is_squad_manager(g.squad_id, p_user));
end;
$$;

create or replace function public.game_confirmed_players(p_game uuid)
returns setof uuid
language plpgsql
security definer
set search_path = public
stable
as $$
declare
  v_fn text;
begin
  select s.confirmed_players_fn into v_fn
  from public.games g join public.sports s on s.key = g.sport
  where g.id = p_game;

  if v_fn is null then
    return;
  end if;
  return query execute format('select distinct x from %s($1) as x', v_fn::regprocedure::regproc) using p_game;
end;
$$;

revoke all on function public.validate_sport_registration() from public, anon, authenticated;
revoke all on function public.game_confirmed_players(uuid) from public, anon, authenticated;

insert into ops.change_ledger (migration_name, owner, sport, objects, description)
values ('multisport_registry_text_refs', 'platform', null,
  '{sports.game_table,sports.confirmed_players_fn,sports.organizer_check_fn,is_game_organizer,game_confirmed_players}',
  'Store sport function/table references as text (reg* columns block pg_upgrade)')
on conflict (migration_name) do nothing;
