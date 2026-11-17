-- =============================================================================
-- Migration: 20261116000005_squad_management_enhancements.sql
-- Description: Policies and helper procedures for squad updates, invites & role management
-- Developer: Developer A (Squads, Membership & Invitation Systems)
-- Target Database: Supabase Cloud (project: czhkpkhtpdafiiadvgje, ap-south-1)
-- =============================================================================

-- 1. Squads Update Policy for Squad Owners and Admins
drop policy if exists "Squads updateable by owner and admin" on public.squads;
create policy "Squads updateable by owner and admin"
  on public.squads for update
  to authenticated
  using (
    owner_id = auth.uid() or exists (
      select 1 from public.squad_members
      where squad_members.squad_id = squads.id
        and squad_members.user_id = auth.uid()
        and squad_members.role in ('owner', 'admin')
        and squad_members.status = 'active'
    )
  )
  with check (
    owner_id = auth.uid() or exists (
      select 1 from public.squad_members
      where squad_members.squad_id = squads.id
        and squad_members.user_id = auth.uid()
        and squad_members.role in ('owner', 'admin')
        and squad_members.status = 'active'
    )
  );

-- 2. Squad Invitations Policies for Squad Owners and Admins
drop policy if exists "Squad invitations viewable by squad admins" on public.squad_invitations;
create policy "Squad invitations viewable by squad admins"
  on public.squad_invitations for select
  to authenticated
  using (
    exists (
      select 1 from public.squad_members
      where squad_members.squad_id = squad_invitations.squad_id
        and squad_members.user_id = auth.uid()
        and squad_members.role in ('owner', 'admin')
        and squad_members.status = 'active'
    )
  );

drop policy if exists "Squad invitations updateable by squad admins" on public.squad_invitations;
create policy "Squad invitations updateable by squad admins"
  on public.squad_invitations for update
  to authenticated
  using (
    exists (
      select 1 from public.squad_members
      where squad_members.squad_id = squad_invitations.squad_id
        and squad_members.user_id = auth.uid()
        and squad_members.role in ('owner', 'admin')
        and squad_members.status = 'active'
    )
  );

-- 3. Procedure: update_squad_settings (atomic and authorized)
create or replace function public.update_squad_settings(
  p_squad uuid,
  p_name text,
  p_description text default null
) returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_caller_role text;
begin
  if auth.uid() is null then
    raise exception 'Unauthenticated' using errcode = '42501';
  end if;

  if p_name is null or length(trim(p_name)) < 3 then
    raise exception 'Squad name must be at least 3 characters' using errcode = '23514';
  end if;

  select role into v_caller_role
  from public.squad_members
  where squad_id = p_squad
    and user_id = auth.uid()
    and status = 'active';

  if v_caller_role not in ('owner', 'admin') then
    if not exists (select 1 from public.squads where id = p_squad and owner_id = auth.uid()) then
      raise exception 'Forbidden: Only squad owner or admin can update settings' using errcode = '42501';
    end if;
  end if;

  update public.squads
  set name = trim(p_name),
      description = trim(p_description)
  where id = p_squad;

  insert into public.squad_audit (squad_id, actor_id, action, details)
  values (
    p_squad,
    auth.uid(),
    'squad_settings_updated',
    jsonb_build_object('name', trim(p_name), 'description', trim(p_description))
  );
end;
$$;

grant execute on function public.update_squad_settings(uuid, text, text) to authenticated;

-- 4. Procedure: revoke_squad_invite
create or replace function public.revoke_squad_invite(
  p_invite uuid
) returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_squad_id uuid;
  v_caller_role text;
begin
  if auth.uid() is null then
    raise exception 'Unauthenticated' using errcode = '42501';
  end if;

  select squad_id into v_squad_id
  from public.squad_invitations
  where id = p_invite;

  if v_squad_id is null then
    raise exception 'Invitation not found' using errcode = 'P0002';
  end if;

  select role into v_caller_role
  from public.squad_members
  where squad_id = v_squad_id
    and user_id = auth.uid()
    and status = 'active';

  if v_caller_role not in ('owner', 'admin') then
    if not exists (select 1 from public.squads where id = v_squad_id and owner_id = auth.uid()) then
      raise exception 'Forbidden: Only squad owner or admin can revoke invitations' using errcode = '42501';
    end if;
  end if;

  update public.squad_invitations
  set revoked_at = now()
  where id = p_invite;

  insert into public.squad_audit (squad_id, actor_id, action, details)
  values (
    v_squad_id,
    auth.uid(),
    'invite_revoked',
    jsonb_build_object('invite_id', p_invite)
  );
end;
$$;

grant execute on function public.revoke_squad_invite(uuid) to authenticated;
