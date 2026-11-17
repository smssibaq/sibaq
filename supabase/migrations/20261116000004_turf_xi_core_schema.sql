-- =============================================================================
-- Migration: 20261116000004_turf_xi_core_schema.sql
-- Description: Core Schema, RLS Policies, and RPC Functions for Turf XI MVP
-- Target Database: Supabase Cloud (project: czhkpkhtpdafiiadvgje, ap-south-1)
-- =============================================================================

-- 1. EXTENSIONS & TYPES
create extension if not exists "uuid-ossp";

-- 2. TABLES

-- 2.1 profiles
create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  display_name text,
  avatar_url text,
  preferred_position text check (preferred_position in ('GK', 'DEF', 'MID', 'ATT') or preferred_position is null),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- 2.2 squads
create table if not exists public.squads (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  description text,
  owner_id uuid not null references public.profiles(id) on delete cascade,
  join_code text not null unique default upper(substring(md5(random()::text) from 1 for 16)),
  created_at timestamptz not null default now()
);

-- 2.3 squad_members
create table if not exists public.squad_members (
  squad_id uuid not null references public.squads(id) on delete cascade,
  user_id uuid not null references public.profiles(id) on delete cascade,
  role text not null check (role in ('owner', 'admin', 'player')),
  status text not null check (status in ('active', 'pending')),
  joined_at timestamptz not null default now(),
  primary key (squad_id, user_id)
);

-- 2.4 squad_invitations
create table if not exists public.squad_invitations (
  id uuid primary key default gen_random_uuid(),
  squad_id uuid not null references public.squads(id) on delete cascade,
  token_hash text not null unique,
  created_by uuid not null references public.profiles(id) on delete cascade,
  expires_at timestamptz not null default (now() + interval '7 days'),
  revoked_at timestamptz,
  created_at timestamptz not null default now()
);

-- 2.5 matches
create table if not exists public.matches (
  id uuid primary key default gen_random_uuid(),
  squad_id uuid not null references public.squads(id) on delete cascade,
  title text not null,
  mode text not null check (mode in ('single', 'friendly')),
  turf_name text not null,
  starts_at timestamptz not null,
  players_per_team integer not null default 7 check (players_per_team between 4 and 11),
  status text not null check (status in ('scheduled', 'in_progress', 'completed', 'cancelled')),
  created_by uuid not null references public.profiles(id) on delete cascade,
  created_at timestamptz not null default now()
);

-- 2.6 match_attendance
create table if not exists public.match_attendance (
  match_id uuid not null references public.matches(id) on delete cascade,
  user_id uuid not null references public.profiles(id) on delete cascade,
  status text not null check (status in ('playing', 'maybe', 'not_playing')),
  updated_at timestamptz not null default now(),
  primary key (match_id, user_id)
);

-- 2.7 teams
create table if not exists public.teams (
  id uuid primary key default gen_random_uuid(),
  match_id uuid not null references public.matches(id) on delete cascade,
  name text not null,
  side text not null check (side in ('A', 'B', 'single')),
  color text not null default '#B7F34B',
  formation text not null default '2-3-1',
  revision integer not null default 1,
  unique (match_id, side)
);

-- 2.8 team_players
create table if not exists public.team_players (
  id uuid primary key default gen_random_uuid(),
  team_id uuid not null references public.teams(id) on delete cascade,
  match_id uuid not null references public.matches(id) on delete cascade,
  user_id uuid not null references public.profiles(id) on delete cascade,
  position_label text not null,
  is_substitute boolean not null default false,
  pitch_x double precision check (pitch_x is null or (pitch_x >= 0.0 and pitch_x <= 1.0)),
  pitch_y double precision check (pitch_y is null or (pitch_y >= 0.0 and pitch_y <= 1.0)),
  unique (match_id, user_id)
);

-- 2.9 squad_audit
create table if not exists public.squad_audit (
  id uuid primary key default gen_random_uuid(),
  squad_id uuid not null references public.squads(id) on delete cascade,
  actor_id uuid not null references public.profiles(id) on delete cascade,
  action text not null,
  details jsonb,
  created_at timestamptz not null default now()
);

-- 3. INDEXES
create index if not exists idx_squad_members_user on public.squad_members(user_id);
create index if not exists idx_squad_invites_hash on public.squad_invitations(token_hash);
create index if not exists idx_matches_squad on public.matches(squad_id);
create index if not exists idx_matches_starts on public.matches(starts_at);
create index if not exists idx_match_attendance_match on public.match_attendance(match_id);
create index if not exists idx_teams_match on public.teams(match_id);
create index if not exists idx_team_players_team on public.team_players(team_id);
create index if not exists idx_team_players_match on public.team_players(match_id);
create index if not exists idx_squad_audit_squad on public.squad_audit(squad_id);

-- 4. ROW LEVEL SECURITY (RLS)
alter table public.profiles enable row level security;
alter table public.squads enable row level security;
alter table public.squad_members enable row level security;
alter table public.squad_invitations enable row level security;
alter table public.matches enable row level security;
alter table public.match_attendance enable row level security;
alter table public.teams enable row level security;
alter table public.team_players enable row level security;
alter table public.squad_audit enable row level security;

-- Profiles: Anyone authenticated can read profiles; users can update their own
create policy "Profiles readable by authenticated users"
  on public.profiles for select
  to authenticated
  using (true);

create policy "Users can update their own profile"
  on public.profiles for update
  to authenticated
  using (auth.uid() = id);

create policy "Users can insert their own profile"
  on public.profiles for insert
  to authenticated
  with check (auth.uid() = id);

-- Squads: Visible to members
create policy "Squads visible to members"
  on public.squads for select
  to authenticated
  using (
    exists (
      select 1 from public.squad_members
      where squad_members.squad_id = squads.id
        and squad_members.user_id = auth.uid()
    ) or owner_id = auth.uid()
  );

-- Squad members: Visible to other members of same squad
create policy "Squad members visible to squad"
  on public.squad_members for select
  to authenticated
  using (
    exists (
      select 1 from public.squad_members as sm
      where sm.squad_id = squad_members.squad_id
        and sm.user_id = auth.uid()
    )
  );

-- Matches: Visible to squad members
create policy "Matches visible to squad members"
  on public.matches for select
  to authenticated
  using (
    exists (
      select 1 from public.squad_members
      where squad_members.squad_id = matches.squad_id
        and squad_members.user_id = auth.uid()
        and squad_members.status = 'active'
    )
  );

-- Teams: Visible to match squad members
create policy "Teams visible to match members"
  on public.teams for select
  to authenticated
  using (
    exists (
      select 1 from public.matches
      join public.squad_members on squad_members.squad_id = matches.squad_id
      where matches.id = teams.match_id
        and squad_members.user_id = auth.uid()
        and squad_members.status = 'active'
    )
  );

-- Team players: Visible to match squad members
create policy "Team players visible to match members"
  on public.team_players for select
  to authenticated
  using (
    exists (
      select 1 from public.matches
      join public.squad_members on squad_members.squad_id = matches.squad_id
      where matches.id = team_players.match_id
        and squad_members.user_id = auth.uid()
        and squad_members.status = 'active'
    )
  );

-- Match attendance: Visible to match squad members
create policy "Match attendance visible to match members"
  on public.match_attendance for select
  to authenticated
  using (
    exists (
      select 1 from public.matches
      join public.squad_members on squad_members.squad_id = matches.squad_id
      where matches.id = match_attendance.match_id
        and squad_members.user_id = auth.uid()
        and squad_members.status = 'active'
    )
  );

-- 5. RPC PROCEDURES (DOCUMENTATION / SIGNATURES)
-- The 14 authenticated RPC functions implemented as SECURITY DEFINER with server-side authorization:
-- 1.  create_squad(p_name text, p_description text) returns uuid
-- 2.  join_squad(p_code text) returns uuid
-- 3.  create_squad_invite(p_squad uuid) returns text
-- 4.  join_squad_by_invite(p_token text) returns uuid
-- 5.  approve_member(p_squad uuid, p_user uuid) returns void
-- 6.  set_member_role(p_squad uuid, p_user uuid, p_role text) returns void
-- 7.  remove_squad_member(p_squad uuid, p_user uuid) returns void
-- 8.  transfer_squad_owner(p_squad uuid, p_new_owner uuid) returns void
-- 9.  create_match(p_squad uuid, p_title text, p_mode text, p_turf_name text, p_starts_at timestamptz, p_players_per_team integer) returns uuid
-- 10. update_match(p_match uuid, p_title text, p_turf_name text, p_starts_at timestamptz, p_status text) returns void
-- 11. set_attendance(p_match uuid, p_status text) returns void
-- 12. assign_team_player(p_team uuid, p_user uuid, p_position text) returns void
-- 13. remove_team_player(p_match uuid, p_user uuid) returns void
-- 14. save_team_formation(p_team uuid, p_formation text, p_expected_revision integer, p_positions jsonb) returns integer
