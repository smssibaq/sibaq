# Turf XI — System Contracts & RPC API Matrix

This document defines the authoritative API contracts for frontend-to-backend communication in Turf XI. All mutating business logic executes through authenticated Supabase RPC functions (`SECURITY DEFINER`) with strict server-side authorization checks.

---

## 1. RPC Functions Contract Matrix

| RPC Function | Required Role | Request Arguments | Return Type | Error Codes & Conditions | Cache Query Keys Invalidated |
|---|---|---|---|---|---|
| `create_squad` | Authenticated | `p_name: text`<br>`p_description: text \| null` | `uuid` (squadId) | `42501` (Unauthenticated)<br>`23514` (Empty name) | `['squads', 'list']`<br>`['squads', 'detail', squadId]` |
| `join_squad` | Authenticated | `p_code: text` (16-char room code) | `uuid` (squadId) | `P0002` (Code not found)<br>`23505` (Already a member) | `['squads', 'list']`<br>`['squads', 'detail', squadId]` |
| `create_squad_invite` | Owner / Admin | `p_squad: uuid` | `text` (raw token) | `42501` (Forbidden role)<br>`P0002` (Squad missing) | `['invitations', squadId]` |
| `join_squad_by_invite` | Authenticated | `p_token: text` | `uuid` (squadId) | `P0001` (Expired/revoked token)<br>`23505` (Already member) | `['squads', 'list']`<br>`['squads', 'members', squadId]` |
| `approve_member` | Owner / Admin | `p_squad: uuid`<br>`p_user: uuid` | `void` | `42501` (Forbidden role)<br>`P0002` (Pending member missing) | `['squads', 'members', squadId]` |
| `set_member_role` | Squad Owner | `p_squad: uuid`<br>`p_user: uuid`<br>`p_role: text` ('admin'\|'player') | `void` | `42501` (Not squad owner)<br>`23514` (Cannot alter owner role) | `['squads', 'members', squadId]` |
| `remove_squad_member` | Owner / Admin / Self | `p_squad: uuid`<br>`p_user: uuid` | `void` | `42501` (Cannot remove owner)<br>`P0002` (Member not found) | `['squads', 'members', squadId]` |
| `transfer_squad_owner` | Squad Owner | `p_squad: uuid`<br>`p_new_owner: uuid` | `void` | `42501` (Only owner can transfer)<br>`P0002` (Target not active member) | `['squads', 'detail', squadId]`<br>`['squads', 'members', squadId]` |
| `create_match` | Owner / Admin | `p_squad: uuid`<br>`p_title: text`<br>`p_mode: text`<br>`p_turf_name: text`<br>`p_starts_at: timestamptz`<br>`p_players_per_team: int` | `uuid` (matchId) | `42501` (Non-admin member)<br>`23514` (Invalid mode / invalid count) | `['matches', 'list', squadId]`<br>`['matches', 'detail', matchId]` |
| `update_match` | Owner / Admin | `p_match: uuid`<br>`p_title: text`<br>`p_turf_name: text`<br>`p_starts_at: timestamptz`<br>`p_status: text` | `void` | `42501` (Forbidden)<br>`P0002` (Match missing) | `['matches', 'detail', matchId]` |
| `set_attendance` | Squad Member | `p_match: uuid`<br>`p_status: text` ('playing'\|'maybe'\|'not_playing') | `void` | `42501` (Not active squad member)<br>`23514` (Invalid status) | `['matches', 'attendance', matchId]`<br>`['matches', 'detail', matchId]` |
| `assign_team_player` | Owner / Admin | `p_team: uuid`<br>`p_user: uuid`<br>`p_position: text` | `void` | `42501` (Forbidden)<br>`23505` (Player already assigned in match) | `['teams', 'match', matchId]` |
| `remove_team_player` | Owner / Admin | `p_match: uuid`<br>`p_user: uuid` | `void` | `42501` (Forbidden) | `['teams', 'match', matchId]` |
| `save_team_formation` | Owner / Admin | `p_team: uuid`<br>`p_formation: text`<br>`p_expected_revision: int`<br>`p_positions: jsonb` | `int` (new revision) | `P0003` (Revision concurrency mismatch)<br>`42501` (Forbidden) | `['teams', 'match', matchId]` |

---

## 2. Table Column Reference & Schemas

### `profiles`
- `id` (uuid, PK, references `auth.users(id)`)
- `display_name` (text, nullable)
- `avatar_url` (text, nullable)
- `preferred_position` (text: 'GK'|'DEF'|'MID'|'ATT', nullable)
- `created_at` (timestamptz, default now())
- `updated_at` (timestamptz, default now())

### `squads`
- `id` (uuid, PK)
- `name` (text, not null)
- `description` (text, nullable)
- `owner_id` (uuid, references `profiles(id)`)
- `join_code` (text, 6-char unique, e.g., 'KRL7X1')
- `created_at` (timestamptz)

### `squad_members`
- `squad_id` (uuid, PK component)
- `user_id` (uuid, PK component)
- `role` (text: 'owner'|'admin'|'player')
- `status` (text: 'active'|'pending')
- `joined_at` (timestamptz)

### `squad_invitations`
- `id` (uuid, PK)
- `squad_id` (uuid, references `squads(id)`)
- `token_hash` (text, unique sha256 hash)
- `created_by` (uuid, references `profiles(id)`)
- `expires_at` (timestamptz, now() + 7 days)
- `revoked_at` (timestamptz, nullable)
- `created_at` (timestamptz)

### `matches`
- `id` (uuid, PK)
- `squad_id` (uuid, references `squads(id)`)
- `title` (text, not null)
- `mode` (text: 'single'|'friendly')
- `turf_name` (text, not null)
- `starts_at` (timestamptz, not null)
- `players_per_team` (integer, default 7, range 4-11)
- `status` (text: 'scheduled'|'in_progress'|'completed'|'cancelled')
- `created_by` (uuid)
- `created_at` (timestamptz)

### `match_attendance`
- `match_id` (uuid, PK component)
- `user_id` (uuid, PK component)
- `status` (text: 'playing'|'maybe'|'not_playing')
- `updated_at` (timestamptz)

### `teams`
- `id` (uuid, PK)
- `match_id` (uuid, references `matches(id)`)
- `name` (text, e.g., 'Team Green', 'Team Neon')
- `side` (text: 'A'|'B'|'single')
- `color` (text, hex color code)
- `formation` (text, e.g., '2-3-1', '3-2-1')
- `revision` (integer, concurrency control, defaults to 1)

### `team_players`
- `id` (uuid, PK)
- `team_id` (uuid, references `teams(id)`)
- `match_id` (uuid, references `matches(id)`)
- `user_id` (uuid, references `profiles(id)`)
- `position_label` (text, e.g., 'GK', 'CB', 'CM', 'ST')
- `is_substitute` (boolean, default false)
- `pitch_x` (float8, normalized [0.0, 1.0])
- `pitch_y` (float8, normalized [0.0, 1.0])

### `squad_audit`
- `id` (uuid, PK)
- `squad_id` (uuid, references `squads(id)`)
- `actor_id` (uuid, references `profiles(id)`)
- `action` (text, e.g., 'member_approved', 'role_changed')
- `details` (jsonb)
- `created_at` (timestamptz)

---

## 3. Realtime Channel Specification

Subscription channel: `match-realtime:{matchId}`  
Broadcast & Postgres Change Events subscribed:
1. `postgres_changes` on table `team_players` filter: `match_id=eq.{matchId}`
2. `postgres_changes` on table `match_attendance` filter: `match_id=eq.{matchId}`
3. `postgres_changes` on table `teams` filter: `match_id=eq.{matchId}`

When any event fires, the frontend triggers targeted React Query cache invalidation using `matchQueryKeys.attendance(matchId)` and `teamQueryKeys.byMatch(matchId)` with proper cleanup upon component unmount.
