# Database Schema & Migrations — Turf XI

## Overview
PostgreSQL tables are secured via Row Level Security (RLS) on all exposed schemas in Supabase project `czhkpkhtpdafiiadvgje` (Region: `ap-south-1`). Frontend route guards are for UX only; actual authorization is enforced by PostgreSQL RLS and `SECURITY DEFINER` stored procedures.

---

## 1. Tables

### 1.1 `public.profiles`
- Primary Key: `id uuid references auth.users(id) on delete cascade`
- Fields:
  - `display_name text`
  - `avatar_url text`
  - `preferred_position text check (preferred_position in ('GK', 'DEF', 'MID', 'ATT') or preferred_position is null)`
  - `created_at timestamptz default now()`
  - `updated_at timestamptz default now()`
- **RLS**: Authenticated users can view profiles; users can insert and update only their own profile (`auth.uid() = id`).

### 1.2 `public.squads`
- Primary Key: `id uuid default gen_random_uuid()`
- Fields:
  - `name text not null`
  - `description text`
  - `owner_id uuid references public.profiles(id)`
  - `join_code text unique` (6-char alphanumeric room code)
  - `created_at timestamptz default now()`
- **RLS**: Visible to active squad members and owner.

### 1.3 `public.squad_members`
- Primary Key: `(squad_id, user_id)`
- Fields:
  - `squad_id uuid references public.squads(id)`
  - `user_id uuid references public.profiles(id)`
  - `role text check (role in ('owner', 'admin', 'player'))`
  - `status text check (status in ('active', 'pending'))`
  - `joined_at timestamptz default now()`
- **RLS**: Visible to active members of the same squad.

### 1.4 `public.squad_invitations`
- Primary Key: `id uuid default gen_random_uuid()`
- Fields:
  - `squad_id uuid references public.squads(id)`
  - `token_hash text unique`
  - `created_by uuid references public.profiles(id)`
  - `expires_at timestamptz default (now() + interval '7 days')`
  - `revoked_at timestamptz`
  - `created_at timestamptz default now()`
- **RLS**: Created and read via security definer RPC functions.

### 1.5 `public.matches`
- Primary Key: `id uuid default gen_random_uuid()`
- Fields:
  - `squad_id uuid references public.squads(id)`
  - `title text not null`
  - `mode text check (mode in ('single', 'friendly'))`
  - `turf_name text not null`
  - `starts_at timestamptz not null`
  - `players_per_team integer default 7 check (players_per_team between 4 and 11)`
  - `status text check (status in ('scheduled', 'in_progress', 'completed', 'cancelled'))`
  - `created_by uuid references public.profiles(id)`
  - `created_at timestamptz default now()`
- **RLS**: Visible to active squad members.

### 1.6 `public.match_attendance`
- Primary Key: `(match_id, user_id)`
- Fields:
  - `match_id uuid references public.matches(id)`
  - `user_id uuid references public.profiles(id)`
  - `status text check (status in ('playing', 'maybe', 'not_playing'))`
  - `updated_at timestamptz default now()`
- **RLS**: Visible to squad members associated with the match.

### 1.7 `public.teams`
- Primary Key: `id uuid default gen_random_uuid()`
- Fields:
  - `match_id uuid references public.matches(id)`
  - `name text not null`
  - `side text check (side in ('A', 'B', 'single'))`
  - `color text default '#B7F34B'`
  - `formation text default '2-3-1'`
  - `revision integer default 1`
- Unique Constraint: `(match_id, side)`
- **RLS**: Visible to match squad members.

### 1.8 `public.team_players`
- Primary Key: `id uuid default gen_random_uuid()`
- Fields:
  - `team_id uuid references public.teams(id)`
  - `match_id uuid references public.matches(id)`
  - `user_id uuid references public.profiles(id)`
  - `position_label text not null`
  - `is_substitute boolean default false`
  - `pitch_x double precision check (pitch_x between 0.0 and 1.0)`
  - `pitch_y double precision check (pitch_y between 0.0 and 1.0)`
- Unique Constraint: `(match_id, user_id)`
- **RLS**: Visible to match squad members.

### 1.9 `public.squad_audit`
- Primary Key: `id uuid default gen_random_uuid()`
- Fields:
  - `squad_id uuid references public.squads(id)`
  - `actor_id uuid references public.profiles(id)`
  - `action text not null`
  - `details jsonb`
  - `created_at timestamptz default now()`

---

## 2. Authenticated RPC Procedures
1. `create_squad(p_name, p_description)`
2. `join_squad(p_code)`
3. `create_squad_invite(p_squad)`
4. `join_squad_by_invite(p_token)`
5. `approve_member(p_squad, p_user)`
6. `set_member_role(p_squad, p_user, p_role)`
7. `remove_squad_member(p_squad, p_user)`
8. `transfer_squad_owner(p_squad, p_new_owner)`
9. `create_match(p_squad, p_title, p_mode, p_turf_name, p_starts_at, p_players_per_team)`
10. `update_match(p_match, p_title, p_turf_name, p_starts_at, p_status)`
11. `set_attendance(p_match, p_status)`
12. `assign_team_player(p_team, p_user, p_position)`
13. `remove_team_player(p_match, p_user)`
14. `save_team_formation(p_team, p_formation, p_expected_revision, p_positions)`
