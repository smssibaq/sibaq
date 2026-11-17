-- =============================================================================
-- Migration: 20261117000012_squad_rpcs_and_rls_fixes.sql
-- Description: Implements the squad / lineup RPCs that 20261116000004 only
--              documented, fixes recursive squad_members RLS, adds the write
--              policies the web client relies on, the public avatars bucket,
--              and realtime publication for live screens.
-- =============================================================================

-- 0. PROFILE BOOTSTRAP: keep display_name populated for new sign-ups
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_name text := coalesce(new.raw_user_meta_data->>'full_name', new.raw_user_meta_data->>'name', '');
begin
  insert into public.profiles (id, email, full_name, display_name, avatar_url)
  values (
    new.id,
    coalesce(new.email, ''),
    v_name,
    nullif(v_name, ''),
    coalesce(new.raw_user_meta_data->>'avatar_url', new.raw_user_meta_data->>'picture', '')
  )
  on conflict (id) do update set
    email = excluded.email,
    full_name = coalesce(excluded.full_name, public.profiles.full_name),
    display_name = coalesce(public.profiles.display_name, excluded.display_name),
    avatar_url = coalesce(excluded.avatar_url, public.profiles.avatar_url),
    updated_at = now();

  insert into public.user_roles (user_id, role)
  values (new.id, 'user')
  on conflict (user_id, role) do nothing;

  return new;
end;
$$;

-- 1. AUTHORIZATION HELPERS (security definer => no RLS recursion)
create or replace function public.is_squad_member(p_squad uuid, p_user uuid)
returns boolean
language sql
security definer
set search_path = public
stable
as $$
  select exists (
    select 1 from public.squad_members
    where squad_id = p_squad and user_id = p_user and status = 'active'
  ) or exists (
    select 1 from public.squads where id = p_squad and owner_id = p_user
  );
$$;

create or replace function public.is_squad_manager(p_squad uuid, p_user uuid)
returns boolean
language sql
security definer
set search_path = public
stable
as $$
  select exists (
    select 1 from public.squads where id = p_squad and owner_id = p_user
  ) or exists (
    select 1 from public.squad_members
    where squad_id = p_squad
      and user_id = p_user
      and status = 'active'
      and role in ('owner', 'admin')
  );
$$;

revoke all on function public.is_squad_member(uuid, uuid) from public;
revoke all on function public.is_squad_manager(uuid, uuid) from public;
grant execute on function public.is_squad_member(uuid, uuid) to authenticated;
grant execute on function public.is_squad_manager(uuid, uuid) to authenticated;

-- Ensures a profile row exists for FK targets (squads.owner_id, squad_members.user_id ...)
create or replace function public.ensure_profile(p_user uuid)
returns void
language sql
security definer
set search_path = public
as $$
  insert into public.profiles (id, email)
  select u.id, coalesce(u.email, '') from auth.users u where u.id = p_user
  on conflict (id) do nothing;
$$;

revoke all on function public.ensure_profile(uuid) from public;

-- 2. RLS FIX: squad_members policy previously queried squad_members itself
--    (infinite recursion, error 42P17). Use the definer helper instead.
drop policy if exists "Squad members visible to squad" on public.squad_members;
create policy "Squad members visible to squad"
  on public.squad_members for select
  to authenticated
  using (
    user_id = (select auth.uid())
    or public.is_squad_member(squad_id, (select auth.uid()))
  );

drop policy if exists "Squads visible to members" on public.squads;
create policy "Squads visible to members"
  on public.squads for select
  to authenticated
  using (
    owner_id = (select auth.uid())
    or exists (
      select 1 from public.squad_members
      where squad_members.squad_id = squads.id
        and squad_members.user_id = (select auth.uid())
    )
  );

-- 3. WRITE POLICIES used directly by the lineup editor
drop policy if exists "Squad managers can insert team players" on public.team_players;
create policy "Squad managers can insert team players"
  on public.team_players for insert
  to authenticated
  with check (
    public.is_squad_manager(
      (select m.squad_id from public.matches m where m.id = team_players.match_id),
      (select auth.uid())
    )
  );

drop policy if exists "Squad managers can update team players" on public.team_players;
create policy "Squad managers can update team players"
  on public.team_players for update
  to authenticated
  using (
    public.is_squad_manager(
      (select m.squad_id from public.matches m where m.id = team_players.match_id),
      (select auth.uid())
    )
  )
  with check (
    public.is_squad_manager(
      (select m.squad_id from public.matches m where m.id = team_players.match_id),
      (select auth.uid())
    )
  );

drop policy if exists "Squad managers can delete team players" on public.team_players;
create policy "Squad managers can delete team players"
  on public.team_players for delete
  to authenticated
  using (
    public.is_squad_manager(
      (select m.squad_id from public.matches m where m.id = team_players.match_id),
      (select auth.uid())
    )
  );

drop policy if exists "Squad managers can record attendance" on public.match_attendance;
create policy "Squad managers can record attendance"
  on public.match_attendance for insert
  to authenticated
  with check (
    public.is_squad_manager(
      (select m.squad_id from public.matches m where m.id = match_attendance.match_id),
      (select auth.uid())
    )
  );

drop policy if exists "Squad managers can update attendance" on public.match_attendance;
create policy "Squad managers can update attendance"
  on public.match_attendance for update
  to authenticated
  using (
    public.is_squad_manager(
      (select m.squad_id from public.matches m where m.id = match_attendance.match_id),
      (select auth.uid())
    )
  )
  with check (
    public.is_squad_manager(
      (select m.squad_id from public.matches m where m.id = match_attendance.match_id),
      (select auth.uid())
    )
  );

-- 4. RPC: create_squad
create or replace function public.create_squad(
  p_name text,
  p_description text default null
) returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_uid uuid := auth.uid();
  v_squad_id uuid;
begin
  if v_uid is null then
    raise exception 'Unauthenticated' using errcode = '42501';
  end if;

  if p_name is null or length(trim(p_name)) < 3 then
    raise exception 'Squad name must be at least 3 characters' using errcode = '23514';
  end if;
  if length(trim(p_name)) > 50 then
    raise exception 'Squad name must be under 50 characters' using errcode = '23514';
  end if;

  perform public.ensure_profile(v_uid);

  insert into public.squads (name, description, owner_id)
  values (trim(p_name), nullif(trim(coalesce(p_description, '')), ''), v_uid)
  returning id into v_squad_id;

  insert into public.squad_members (squad_id, user_id, role, status)
  values (v_squad_id, v_uid, 'owner', 'active');

  insert into public.squad_audit (squad_id, actor_id, action, details)
  values (v_squad_id, v_uid, 'squad_created', jsonb_build_object('name', trim(p_name)));

  return v_squad_id;
end;
$$;

-- 5. RPC: join_squad (room code => pending request awaiting approval)
create or replace function public.join_squad(
  p_code text
) returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_uid uuid := auth.uid();
  v_squad_id uuid;
  v_status text;
begin
  if v_uid is null then
    raise exception 'Unauthenticated' using errcode = '42501';
  end if;

  select id into v_squad_id
  from public.squads
  where join_code = upper(trim(coalesce(p_code, '')));

  if v_squad_id is null then
    raise exception 'Invalid room code' using errcode = 'P0001';
  end if;

  select status into v_status
  from public.squad_members
  where squad_id = v_squad_id and user_id = v_uid;

  if v_status = 'active' then
    raise exception 'Already a squad member' using errcode = '23505';
  elsif v_status = 'pending' then
    return v_squad_id;
  end if;

  perform public.ensure_profile(v_uid);

  insert into public.squad_members (squad_id, user_id, role, status)
  values (v_squad_id, v_uid, 'player', 'pending');

  insert into public.squad_audit (squad_id, actor_id, action, details)
  values (v_squad_id, v_uid, 'join_requested', jsonb_build_object('via', 'room_code'));

  return v_squad_id;
end;
$$;

-- 6. RPC: approve_member
create or replace function public.approve_member(
  p_squad uuid,
  p_user uuid
) returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  if auth.uid() is null then
    raise exception 'Unauthenticated' using errcode = '42501';
  end if;

  if not public.is_squad_manager(p_squad, auth.uid()) then
    raise exception 'Forbidden: Only squad owner or admin can approve members' using errcode = '42501';
  end if;

  update public.squad_members
  set status = 'active', joined_at = now()
  where squad_id = p_squad and user_id = p_user and status = 'pending';

  if not found then
    raise exception 'No pending request for this player' using errcode = 'P0002';
  end if;

  insert into public.squad_audit (squad_id, actor_id, action, details)
  values (p_squad, auth.uid(), 'member_approved', jsonb_build_object('user_id', p_user));
end;
$$;

-- 7. RPC: set_member_role (owner only; admin <-> player)
create or replace function public.set_member_role(
  p_squad uuid,
  p_user uuid,
  p_role text
) returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_target_role text;
begin
  if auth.uid() is null then
    raise exception 'Unauthenticated' using errcode = '42501';
  end if;

  if not exists (select 1 from public.squads where id = p_squad and owner_id = auth.uid()) then
    raise exception 'Forbidden: Only the squad owner can change roles' using errcode = '42501';
  end if;

  if p_role not in ('admin', 'player') then
    raise exception 'Invalid role (use transfer_squad_owner to change ownership)' using errcode = '23514';
  end if;

  select role into v_target_role
  from public.squad_members
  where squad_id = p_squad and user_id = p_user and status = 'active';

  if v_target_role is null then
    raise exception 'Player is not an active squad member' using errcode = 'P0002';
  end if;
  if v_target_role = 'owner' then
    raise exception 'Cannot change the owner role' using errcode = '42501';
  end if;

  update public.squad_members
  set role = p_role
  where squad_id = p_squad and user_id = p_user;

  insert into public.squad_audit (squad_id, actor_id, action, details)
  values (p_squad, auth.uid(), 'member_role_changed', jsonb_build_object('user_id', p_user, 'role', p_role));
end;
$$;

-- 8. RPC: remove_squad_member (kick, reject pending, or leave)
create or replace function public.remove_squad_member(
  p_squad uuid,
  p_user uuid
) returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_uid uuid := auth.uid();
  v_caller_role text;
  v_target_role text;
  v_is_owner boolean;
begin
  if v_uid is null then
    raise exception 'Unauthenticated' using errcode = '42501';
  end if;

  select role into v_target_role
  from public.squad_members
  where squad_id = p_squad and user_id = p_user;

  if v_target_role is null then
    raise exception 'Player is not part of this squad' using errcode = 'P0002';
  end if;

  if v_target_role = 'owner' or exists (select 1 from public.squads where id = p_squad and owner_id = p_user) then
    raise exception 'The owner must transfer ownership before leaving' using errcode = '42501';
  end if;

  if p_user <> v_uid then
    v_is_owner := exists (select 1 from public.squads where id = p_squad and owner_id = v_uid);
    select role into v_caller_role
    from public.squad_members
    where squad_id = p_squad and user_id = v_uid and status = 'active';

    if not v_is_owner and coalesce(v_caller_role, '') <> 'admin' then
      raise exception 'Forbidden: Only squad owner or admin can remove members' using errcode = '42501';
    end if;
    if not v_is_owner and v_target_role = 'admin' then
      raise exception 'Forbidden: Only the owner can remove an admin' using errcode = '42501';
    end if;
  end if;

  delete from public.team_players tp
  using public.matches m
  where tp.match_id = m.id and m.squad_id = p_squad and tp.user_id = p_user;

  delete from public.squad_members
  where squad_id = p_squad and user_id = p_user;

  insert into public.squad_audit (squad_id, actor_id, action, details)
  values (
    p_squad,
    v_uid,
    case when p_user = v_uid then 'member_left' else 'member_removed' end,
    jsonb_build_object('user_id', p_user)
  );
end;
$$;

-- 9. RPC: transfer_squad_owner
create or replace function public.transfer_squad_owner(
  p_squad uuid,
  p_new_owner uuid
) returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_uid uuid := auth.uid();
begin
  if v_uid is null then
    raise exception 'Unauthenticated' using errcode = '42501';
  end if;

  if not exists (select 1 from public.squads where id = p_squad and owner_id = v_uid) then
    raise exception 'Forbidden: Only the current owner can transfer ownership' using errcode = '42501';
  end if;

  if p_new_owner = v_uid then
    raise exception 'You already own this squad' using errcode = '23514';
  end if;

  if not exists (
    select 1 from public.squad_members
    where squad_id = p_squad and user_id = p_new_owner and status = 'active'
  ) then
    raise exception 'New owner must be an active squad member' using errcode = 'P0002';
  end if;

  update public.squads set owner_id = p_new_owner where id = p_squad;

  update public.squad_members set role = 'owner'
  where squad_id = p_squad and user_id = p_new_owner;

  update public.squad_members set role = 'admin'
  where squad_id = p_squad and user_id = v_uid;

  insert into public.squad_audit (squad_id, actor_id, action, details)
  values (p_squad, v_uid, 'ownership_transferred', jsonb_build_object('new_owner', p_new_owner));
end;
$$;

-- 10. RPC: remove_team_player
create or replace function public.remove_team_player(
  p_match uuid,
  p_user uuid
) returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_squad uuid;
begin
  if auth.uid() is null then
    raise exception 'Unauthenticated' using errcode = '42501';
  end if;

  select squad_id into v_squad from public.matches where id = p_match;
  if v_squad is null then
    raise exception 'Match not found' using errcode = 'P0002';
  end if;

  if not public.is_squad_manager(v_squad, auth.uid()) then
    raise exception 'Forbidden: Only squad owner or admin can edit lineups' using errcode = '42501';
  end if;

  delete from public.team_players where match_id = p_match and user_id = p_user;
end;
$$;

revoke all on function public.create_squad(text, text) from public, anon;
revoke all on function public.join_squad(text) from public, anon;
revoke all on function public.approve_member(uuid, uuid) from public, anon;
revoke all on function public.set_member_role(uuid, uuid, text) from public, anon;
revoke all on function public.remove_squad_member(uuid, uuid) from public, anon;
revoke all on function public.transfer_squad_owner(uuid, uuid) from public, anon;
revoke all on function public.remove_team_player(uuid, uuid) from public, anon;

grant execute on function public.create_squad(text, text) to authenticated;
grant execute on function public.join_squad(text) to authenticated;
grant execute on function public.approve_member(uuid, uuid) to authenticated;
grant execute on function public.set_member_role(uuid, uuid, text) to authenticated;
grant execute on function public.remove_squad_member(uuid, uuid) to authenticated;
grant execute on function public.transfer_squad_owner(uuid, uuid) to authenticated;
grant execute on function public.remove_team_player(uuid, uuid) to authenticated;

-- 11. STORAGE: public avatars bucket, writable only inside the user's folder
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('avatars', 'avatars', true, 2097152, array['image/jpeg', 'image/png', 'image/webp', 'image/gif'])
on conflict (id) do update set
  public = true,
  file_size_limit = 2097152,
  allowed_mime_types = array['image/jpeg', 'image/png', 'image/webp', 'image/gif'];

drop policy if exists "Users can upload own avatar" on storage.objects;
create policy "Users can upload own avatar"
  on storage.objects for insert
  to authenticated
  with check (
    bucket_id = 'avatars'
    and (storage.foldername(name))[1] = (select auth.uid())::text
  );

drop policy if exists "Users can update own avatar" on storage.objects;
create policy "Users can update own avatar"
  on storage.objects for update
  to authenticated
  using (
    bucket_id = 'avatars'
    and (storage.foldername(name))[1] = (select auth.uid())::text
  );

drop policy if exists "Users can delete own avatar" on storage.objects;
create policy "Users can delete own avatar"
  on storage.objects for delete
  to authenticated
  using (
    bucket_id = 'avatars'
    and (storage.foldername(name))[1] = (select auth.uid())::text
  );

-- 12. REALTIME: tables the web client subscribes to
do $$
declare
  t text;
begin
  if exists (select 1 from pg_publication where pubname = 'supabase_realtime') then
    foreach t in array array['squads', 'squad_members', 'squad_invitations', 'matches', 'match_attendance', 'teams', 'team_players']
    loop
      if not exists (
        select 1 from pg_publication_tables
        where pubname = 'supabase_realtime' and schemaname = 'public' and tablename = t
      ) then
        execute format('alter publication supabase_realtime add table public.%I', t);
      end if;
    end loop;
  end if;
end $$;
