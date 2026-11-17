-- =============================================================================
-- Migration: 20261116000006_smart_rsvp_and_waitlist.sql
-- Description: Smart RSVP deadlines, capacity enforcement, and atomic waitlist promotion
-- Developer: Developer C (Match Coordination, Scheduling & Attendance RSVP)
-- Target Database: Supabase Cloud (project: czhkpkhtpdafiiadvgje, ap-south-1)
-- =============================================================================

-- 1. ADD RSVP DEADLINE TO MATCHES
alter table public.matches 
  add column if not exists rsvp_deadline timestamptz;

alter table public.matches 
  drop constraint if exists chk_matches_rsvp_deadline;

alter table public.matches 
  add constraint chk_matches_rsvp_deadline 
  check (rsvp_deadline is null or rsvp_deadline <= starts_at);

-- 2. CREATE MATCH WAITLIST TABLE
create table if not exists public.match_waitlist (
  id uuid primary key default gen_random_uuid(),
  match_id uuid not null references public.matches(id) on delete cascade,
  user_id uuid not null references public.profiles(id) on delete cascade,
  created_at timestamptz not null default now(),
  constraint uq_match_waitlist_match_user unique (match_id, user_id)
);

create index if not exists idx_match_waitlist_match on public.match_waitlist(match_id, created_at asc);
create index if not exists idx_match_waitlist_user on public.match_waitlist(user_id);

-- 3. ENABLE RLS ON WAITLIST
alter table public.match_waitlist enable row level security;

drop policy if exists "Match waitlist visible to match squad members" on public.match_waitlist;
create policy "Match waitlist visible to match squad members"
  on public.match_waitlist for select
  to authenticated
  using (
    exists (
      select 1 from public.matches
      join public.squad_members on squad_members.squad_id = matches.squad_id
      where matches.id = match_waitlist.match_id
        and squad_members.user_id = auth.uid()
        and squad_members.status = 'active'
    )
  );

-- 4. REALTIME PUBLICATION
do $$
begin
  if exists (select 1 from pg_publication where pubname = 'supabase_realtime') then
    if not exists (
      select 1 from pg_publication_tables 
      where pubname = 'supabase_realtime' 
        and schemaname = 'public' 
        and tablename = 'match_waitlist'
    ) then
      alter publication supabase_realtime add table public.match_waitlist;
    end if;
  end if;
end $$;

-- 5. RPC: create_match (with optional rsvp_deadline)
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
    values (v_match_id, 'Squad XI', 'single', '#B7F34B', '2-3-1', 1);
  elsif p_mode = 'friendly' then
    insert into public.teams (match_id, name, side, color, formation, revision)
    values
      (v_match_id, 'Team Green', 'A', '#B7F34B', '2-3-1', 1),
      (v_match_id, 'Team White', 'B', '#F5F7F4', '2-3-1', 1);
  end if;

  insert into public.squad_audit (squad_id, actor_id, action, details)
  values (
    p_squad,
    auth.uid(),
    'match_created',
    jsonb_build_object('match_id', v_match_id, 'title', p_title, 'mode', p_mode)
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

-- 6. RPC: update_match (with optional rsvp_deadline)
create or replace function public.update_match(
  p_match uuid,
  p_title text,
  p_turf_name text,
  p_starts_at timestamptz,
  p_status text,
  p_rsvp_deadline timestamptz default null
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
  from public.matches
  where id = p_match;

  if v_squad_id is null then
    raise exception 'Match not found' using errcode = 'P0002';
  end if;

  select role into v_caller_role
  from public.squad_members
  where squad_id = v_squad_id
    and user_id = auth.uid()
    and status = 'active';

  if v_caller_role not in ('owner', 'admin') then
    if not exists (select 1 from public.squads where id = v_squad_id and owner_id = auth.uid()) then
      raise exception 'Forbidden: Only squad owner or admin can update match' using errcode = '42501';
    end if;
  end if;

  if p_rsvp_deadline is not null and p_rsvp_deadline > p_starts_at then
    raise exception 'RSVP deadline must be before kickoff' using errcode = '23514';
  end if;

  update public.matches
  set title = trim(p_title),
      turf_name = trim(p_turf_name),
      starts_at = p_starts_at,
      status = p_status,
      rsvp_deadline = p_rsvp_deadline
  where id = p_match;

  insert into public.squad_audit (squad_id, actor_id, action, details)
  values (
    v_squad_id,
    auth.uid(),
    'match_updated',
    jsonb_build_object('match_id', p_match, 'status', p_status)
  );
end;
$$;

grant execute on function public.update_match(uuid, text, text, timestamptz, text, timestamptz) to authenticated;

-- Backward-compatible 5-parameter update_match
create or replace function public.update_match(
  p_match uuid,
  p_title text,
  p_turf_name text,
  p_starts_at timestamptz,
  p_status text
) returns void
language sql
security definer
as $$
  select public.update_match(p_match, p_title, p_turf_name, p_starts_at, p_status, null);
$$;

grant execute on function public.update_match(uuid, text, text, timestamptz, text) to authenticated;

-- 7. RPC: set_attendance (atomic capacity enforcement, deadline cutoff & automatic waitlist promotion)
create or replace function public.set_attendance(
  p_match uuid,
  p_status text,
  p_admin_override boolean default false
) returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_user_id uuid;
  v_match record;
  v_caller_role text;
  v_cutoff timestamptz;
  v_capacity integer;
  v_confirmed_count integer;
  v_prev_status text;
  v_next_waitlist_user uuid;
begin
  v_user_id := auth.uid();
  if v_user_id is null then
    raise exception 'Unauthenticated' using errcode = '42501';
  end if;

  if p_status not in ('playing', 'maybe', 'not_playing') then
    raise exception 'Invalid attendance status' using errcode = '23514';
  end if;

  -- Lock match row to protect against concurrent requests for the final spot
  select * into v_match
  from public.matches
  where id = p_match
  for update;

  if v_match.id is null then
    raise exception 'Match not found' using errcode = 'P0002';
  end if;

  -- Verify active squad membership
  select role into v_caller_role
  from public.squad_members
  where squad_id = v_match.squad_id
    and user_id = v_user_id
    and status = 'active';

  if v_caller_role is null then
    raise exception 'Forbidden: Active squad membership required' using errcode = '42501';
  end if;

  if v_match.status in ('cancelled', 'completed') then
    raise exception 'Match is % - RSVP changes are closed', v_match.status using errcode = '23514';
  end if;

  -- RSVP Deadline Check (coalesce deadline to kickoff)
  v_cutoff := coalesce(v_match.rsvp_deadline, v_match.starts_at);
  if now() > v_cutoff then
    if not (p_admin_override and v_caller_role in ('owner', 'admin')) then
      raise exception 'RSVP_DEADLINE_PASSED: The RSVP cutoff has passed for this match.' using errcode = '23514';
    end if;
  end if;

  -- Calculate capacity
  v_capacity := case when v_match.mode = 'friendly' then v_match.players_per_team * 2 else v_match.players_per_team end;

  -- Check user's current status
  select status into v_prev_status
  from public.match_attendance
  where match_id = p_match and user_id = v_user_id;

  if p_status = 'playing' then
    if v_prev_status = 'playing' then
      -- Already playing, no change
      return;
    end if;

    -- Check current confirmed count (excluding current user)
    select count(*) into v_confirmed_count
    from public.match_attendance
    where match_id = p_match
      and status = 'playing'
      and user_id != v_user_id;

    if v_confirmed_count >= v_capacity then
      raise exception 'MATCH_FULL: Capacity reached (% / %). Please join the waitlist.', v_confirmed_count, v_capacity using errcode = '23514';
    end if;

    -- Upsert attendance record to 'playing'
    insert into public.match_attendance (match_id, user_id, status, updated_at)
    values (p_match, v_user_id, 'playing', now())
    on conflict (match_id, user_id)
    do update set status = 'playing', updated_at = now();

    -- Remove user from waitlist if they were waitlisted
    delete from public.match_waitlist
    where match_id = p_match and user_id = v_user_id;

  else
    -- User is selecting 'not_playing' or 'maybe'
    insert into public.match_attendance (match_id, user_id, status, updated_at)
    values (p_match, v_user_id, p_status, now())
    on conflict (match_id, user_id)
    do update set status = p_status, updated_at = now();

    delete from public.match_waitlist
    where match_id = p_match and user_id = v_user_id;

    -- If a confirmed player gave up their spot, automatically promote the earliest waitlisted player
    if v_prev_status = 'playing' then
      select count(*) into v_confirmed_count
      from public.match_attendance
      where match_id = p_match and status = 'playing';

      while v_confirmed_count < v_capacity loop
        select user_id into v_next_waitlist_user
        from public.match_waitlist
        where match_id = p_match
        order by created_at asc
        limit 1
        for update skip locked;

        if v_next_waitlist_user is not null then
          -- Remove from waitlist
          delete from public.match_waitlist
          where match_id = p_match and user_id = v_next_waitlist_user;

          -- Promote to playing
          insert into public.match_attendance (match_id, user_id, status, updated_at)
          values (p_match, v_next_waitlist_user, 'playing', now())
          on conflict (match_id, user_id)
          do update set status = 'playing', updated_at = now();

          -- Audit promotion event
          insert into public.squad_audit (squad_id, actor_id, action, details)
          values (
            v_match.squad_id,
            v_next_waitlist_user,
            'waitlist_promoted',
            jsonb_build_object('match_id', p_match, 'promoted_user_id', v_next_waitlist_user)
          );

          v_confirmed_count := v_confirmed_count + 1;
        else
          exit;
        end if;
      end loop;
    end if;
  end if;
end;
$$;

grant execute on function public.set_attendance(uuid, text, boolean) to authenticated;

-- Backward-compatible 2-parameter set_attendance
create or replace function public.set_attendance(
  p_match uuid,
  p_status text
) returns void
language sql
security definer
as $$
  select public.set_attendance(p_match, p_status, false);
$$;

grant execute on function public.set_attendance(uuid, text) to authenticated;

-- 8. RPC: join_waitlist
create or replace function public.join_waitlist(
  p_match uuid
) returns integer
language plpgsql
security definer
set search_path = public
as $$
declare
  v_user_id uuid;
  v_match record;
  v_caller_role text;
  v_cutoff timestamptz;
  v_curr_status text;
  v_position integer;
begin
  v_user_id := auth.uid();
  if v_user_id is null then
    raise exception 'Unauthenticated' using errcode = '42501';
  end if;

  select * into v_match
  from public.matches
  where id = p_match
  for update;

  if v_match.id is null then
    raise exception 'Match not found' using errcode = 'P0002';
  end if;

  select role into v_caller_role
  from public.squad_members
  where squad_id = v_match.squad_id
    and user_id = v_user_id
    and status = 'active';

  if v_caller_role is null then
    raise exception 'Forbidden: Active squad membership required' using errcode = '42501';
  end if;

  if v_match.status in ('cancelled', 'completed') then
    raise exception 'Match is % - Waitlist is closed', v_match.status using errcode = '23514';
  end if;

  v_cutoff := coalesce(v_match.rsvp_deadline, v_match.starts_at);
  if now() > v_cutoff then
    raise exception 'RSVP_DEADLINE_PASSED: The cutoff has passed for this match.' using errcode = '23514';
  end if;

  -- Ensure not already confirmed playing
  select status into v_curr_status
  from public.match_attendance
  where match_id = p_match and user_id = v_user_id;

  if v_curr_status = 'playing' then
    raise exception 'You are already confirmed playing in this match' using errcode = '23514';
  end if;

  -- Insert into waitlist (idempotent on duplicate)
  insert into public.match_waitlist (match_id, user_id, created_at)
  values (p_match, v_user_id, now())
  on conflict (match_id, user_id)
  do nothing;

  -- Calculate queue position
  select count(*) into v_position
  from public.match_waitlist
  where match_id = p_match
    and created_at <= (
      select created_at 
      from public.match_waitlist 
      where match_id = p_match and user_id = v_user_id
    );

  return v_position;
end;
$$;

grant execute on function public.join_waitlist(uuid) to authenticated;

-- 9. RPC: leave_waitlist
create or replace function public.leave_waitlist(
  p_match uuid
) returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_user_id uuid;
begin
  v_user_id := auth.uid();
  if v_user_id is null then
    raise exception 'Unauthenticated' using errcode = '42501';
  end if;

  delete from public.match_waitlist
  where match_id = p_match and user_id = v_user_id;
end;
$$;

grant execute on function public.leave_waitlist(uuid) to authenticated;

-- 10. RPC: get_match_waitlist
create or replace function public.get_match_waitlist(
  p_match uuid
) returns table (
  id uuid,
  match_id uuid,
  user_id uuid,
  created_at timestamptz,
  queue_position bigint,
  display_name text,
  avatar_url text,
  preferred_position text
)
language sql
security definer
set search_path = public
as $$
  select 
    w.id,
    w.match_id,
    w.user_id,
    w.created_at,
    row_number() over (order by w.created_at asc) as queue_position,
    p.display_name,
    p.avatar_url,
    p.preferred_position
  from public.match_waitlist w
  left join public.profiles p on p.id = w.user_id
  where w.match_id = p_match
  order by w.created_at asc;
$$;

grant execute on function public.get_match_waitlist(uuid) to authenticated;
