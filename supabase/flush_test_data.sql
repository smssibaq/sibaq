-- =============================================================================
-- Script: supabase/flush_test_data.sql
-- Description: Flushes test data across all Turf XI transactional tables.
-- Safe Mode: Retains auth.users and public.profiles so developer accounts remain valid.
-- Target: Supabase Cloud SQL Editor (Project: ctbpkaqyddceacjlujpi)
-- =============================================================================

BEGIN;

-- 1. Flush all match and team transactional data
TRUNCATE TABLE 
  public.team_players,
  public.teams,
  public.match_waitlist,
  public.match_attendance,
  public.matches
CASCADE;

-- 2. Flush all squad memberships, invitations, and squads
TRUNCATE TABLE 
  public.squad_invitations,
  public.squad_members,
  public.squads
CASCADE;

-- 3. Flush demo items
TRUNCATE TABLE 
  public.sample_items
CASCADE;

COMMIT;

-- =============================================================================
-- OPTIONAL FULL RESET (Uncomment below if you also want to delete profiles & user roles):
-- NOTE: If you delete profiles, logged-in users will need to re-complete onboarding.
-- =============================================================================
-- TRUNCATE TABLE 
--   public.user_roles,
--   public.profiles
-- CASCADE;
