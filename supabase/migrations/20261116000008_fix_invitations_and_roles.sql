-- =============================================================================
-- Migration: 20261116000008_fix_invitations_and_roles.sql
-- Description: Complete, authorized implementation of squad invitation RPCs
-- Developer: Developer C (Integration & Invitations Recovery)
-- Target Database: Supabase Cloud (project: czhkpkhtpdafiiadvgje, ap-south-1)
-- =============================================================================

-- Enable pgcrypto for secure cryptographic token generation and SHA-256 hashing
create extension if not exists "pgcrypto";

-- Drop existing functions first to safely allow changing return types
drop function if exists public.create_squad_invite(uuid);
drop function if exists public.join_squad_by_invite(text);

-- 1. RPC: create_squad_invite
-- Generates a 48-character cryptographically secure token, stores its SHA-256 hash,
-- and returns the raw token for shareable invite link construction.
create or replace function public.create_squad_invite(
  p_squad uuid
) returns text
language plpgsql
security definer
set search_path = public, extensions
as $$
declare
  v_caller_role text;
  v_raw_token text;
  v_token_hash text;
begin
  if auth.uid() is null then
    raise exception 'Unauthenticated' using errcode = '42501';
  end if;

  -- Verify squad exists
  if not exists (select 1 from public.squads where id = p_squad) then
    raise exception 'Squad not found' using errcode = 'P0002';
  end if;

  -- Caller must be active member or owner
  select role into v_caller_role
  from public.squad_members
  where squad_id = p_squad
    and user_id = auth.uid()
    and status = 'active';

  if v_caller_role is null then
    if not exists (select 1 from public.squads where id = p_squad and owner_id = auth.uid()) then
      raise exception 'Forbidden: Not an active member of this squad' using errcode = '42501';
    end if;
    v_caller_role := 'owner';
  end if;

  -- Generate 24 random bytes as hex (48 characters)
  v_raw_token := encode(gen_random_bytes(24), 'hex');
  v_token_hash := encode(digest(v_raw_token, 'sha256'), 'hex');

  -- Store invitation record with 7-day expiration
  insert into public.squad_invitations (
    squad_id,
    token_hash,
    created_by,
    expires_at,
    created_at
  ) values (
    p_squad,
    v_token_hash,
    auth.uid(),
    now() + interval '7 days',
    now()
  );

  -- Record in squad audit log
  insert into public.squad_audit (squad_id, actor_id, action, details)
  values (
    p_squad,
    auth.uid(),
    'invite_created',
    jsonb_build_object('expires_at', (now() + interval '7 days'))
  );

  return v_raw_token;
end;
$$;

-- Grant execution permissions
grant execute on function public.create_squad_invite(uuid) to authenticated;
grant execute on function public.create_squad_invite(uuid) to anon;

-- 2. RPC: join_squad_by_invite
-- Hashes the provided token, validates against active non-expired records,
-- or matches by invitation ID / room code, and joins the user as an active player.
create or replace function public.join_squad_by_invite(
  p_token text
) returns uuid
language plpgsql
security definer
set search_path = public, extensions
as $$
declare
  v_token_clean text;
  v_token_hash text;
  v_squad_id uuid;
  v_existing_status text;
begin
  if auth.uid() is null then
    raise exception 'Unauthenticated' using errcode = '42501';
  end if;

  v_token_clean := trim(p_token);
  if length(v_token_clean) = 0 then
    raise exception 'Invalid invitation token' using errcode = 'P0001';
  end if;

  v_token_hash := encode(digest(v_token_clean, 'sha256'), 'hex');

  -- 1. Look up by token_hash or direct invite id
  select squad_id into v_squad_id
  from public.squad_invitations
  where (token_hash = v_token_hash or id::text = v_token_clean)
    and revoked_at is null
    and expires_at > now()
  order by created_at desc
  limit 1;

  -- 2. Fallback to room join_code on squads table
  if v_squad_id is null then
    select id into v_squad_id
    from public.squads
    where join_code = upper(v_token_clean);
  end if;

  if v_squad_id is null then
    raise exception 'Invitation link has expired or is invalid' using errcode = 'P0001';
  end if;

  -- Check existing squad membership
  select status into v_existing_status
  from public.squad_members
  where squad_id = v_squad_id
    and user_id = auth.uid();

  if v_existing_status = 'active' then
    raise exception 'Already a squad member' using errcode = '23505';
  elsif v_existing_status = 'pending' then
    -- Upgrade pending applicant directly to active player
    update public.squad_members
    set status = 'active', role = 'player', joined_at = now()
    where squad_id = v_squad_id and user_id = auth.uid();
  else
    insert into public.squad_members (squad_id, user_id, role, status, joined_at)
    values (v_squad_id, auth.uid(), 'player', 'active', now());
  end if;

  -- Log member joined in audit trail
  insert into public.squad_audit (squad_id, actor_id, action, details)
  values (
    v_squad_id,
    auth.uid(),
    'member_joined_by_invite',
    jsonb_build_object('joined_at', now())
  );

  return v_squad_id;
end;
$$;

-- Grant execution permissions
grant execute on function public.join_squad_by_invite(text) to authenticated;
grant execute on function public.join_squad_by_invite(text) to anon;

-- 3. Row Level Security: Allow active squad members to insert invitation records
drop policy if exists "Squad invitations insertable by squad members" on public.squad_invitations;
create policy "Squad invitations insertable by squad members"
  on public.squad_invitations for insert
  to authenticated
  with check (
    exists (
      select 1 from public.squad_members
      where squad_members.squad_id = squad_invitations.squad_id
        and squad_members.user_id = auth.uid()
        and squad_members.status = 'active'
    ) or exists (
      select 1 from public.squads
      where squads.id = squad_invitations.squad_id
        and squads.owner_id = auth.uid()
    )
  );
