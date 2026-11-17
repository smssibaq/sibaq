-- =============================================================================
-- Migration: 20261117000013_harden_rpc_authorization.sql
-- Description: Close a NULL-role authorization bypass in squad/match RPCs.
--
-- Several RPCs guard with:
--     if v_caller_role not in ('owner', 'admin') then ... raise ...
-- When the caller is NOT a squad member, v_caller_role is NULL, so the
-- condition evaluates to NULL and the guard is skipped entirely: any signed-in
-- user who knows a squad/match UUID could create/update matches, edit squad
-- settings, revoke invites or assign players. Rewrite the guard in place to
-- coalesce(v_caller_role, '') so non-members are rejected.
-- =============================================================================

do $$
declare
  r record;
  v_def text;
begin
  for r in
    select p.oid, p.proname
    from pg_proc p
    join pg_namespace n on n.oid = p.pronamespace
    where n.nspname = 'public'
      and p.proname in ('update_squad_settings', 'revoke_squad_invite', 'create_match', 'update_match', 'assign_team_player')
  loop
    v_def := pg_get_functiondef(r.oid);
    if position('if v_caller_role not in' in v_def) > 0 then
      v_def := replace(v_def, 'if v_caller_role not in', 'if coalesce(v_caller_role, '''') not in');
      execute v_def;
    end if;
  end loop;
end $$;

-- These RPCs all require auth.uid(); there is no reason to expose them to anon.
revoke execute on function public.create_squad_invite(uuid) from anon;
revoke execute on function public.join_squad_by_invite(text) from anon;
revoke execute on function public.save_team_formation(uuid, text, integer, jsonb) from anon;

-- Supabase grants EXECUTE on new public functions to anon by default.
-- Every RPC here needs a signed-in user, so take anon (and PUBLIC) off all of them,
-- and keep internal helpers off the REST API for signed-in users too.
do $$
declare
  r record;
begin
  for r in
    select p.oid::regprocedure as sig, p.proname
    from pg_proc p
    join pg_namespace n on n.oid = p.pronamespace
    where n.nspname = 'public' and p.prokind = 'f'
  loop
    execute format('revoke execute on function %s from public, anon', r.sig);
    if r.proname in ('handle_new_user', 'ensure_profile', 'check_single_goalkeeper_per_team', 'check_unique_player_team_membership') then
      execute format('revoke execute on function %s from authenticated', r.sig);
    end if;
  end loop;
end $$;

-- Pin search_path on the remaining functions flagged by the Supabase linter.
alter function public.create_match(uuid, text, text, text, timestamptz, integer) set search_path = public;
alter function public.update_match(uuid, text, text, timestamptz, text) set search_path = public;
alter function public.set_attendance(uuid, text) set search_path = public;
alter function public.check_single_goalkeeper_per_team() set search_path = public;
alter function public.check_unique_player_team_membership() set search_path = public;
