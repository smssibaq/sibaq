# Squads Module — Turf XI (Developer A)

## Overview
This module governs the complete squad lifecycle, membership governance, role management, and squad settings for Turf XI.

## Routes
- `/dashboard` — Displays all squads where the authenticated user is an active or pending member.
- `/squads/new` — Squad creation with form validation and automated 16-character room code generation.
- `/squads/$squadId` — Squad Hub with overview statistics, 16-char code copy, active roster preview, and quick invite actions.
- `/squads/$squadId/members` — Comprehensive roster management, active vs. pending tabs, role promotion/demotion (Player ↔ Admin), member kicking, and ownership transfer.
- `/squads/$squadId/settings` — General profile settings, active invitation token management, and atomic ownership transfer.

## Security & Architecture
- **Server-Side Authorization**: All mutations invoke Postgres `SECURITY DEFINER` RPC functions with strict caller role checks.
- **Role Hierarchy**:
  - `owner`: Primary captain. Full permissions. Can promote/demote admins, transfer primary ownership, kick members, and configure settings. Exactly 1 owner per squad.
  - `admin`: Vice captains. Can approve pending join requests, schedule matches, and kick standard players.
  - `player`: Team roster member. Can view squad, attendance, and lineups.
- **Supabase Realtime**:
  - `useSquadRealtime`: Automatically invalidates TanStack Query cache on changes to `squads`, `squad_members`, or `squad_invitations`.
