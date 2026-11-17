# Turf XI — Developer Feature Ownership & File Isolation

To maintain high development velocity with zero git merge conflicts, feature development is partitioned cleanly across three developers. Each developer has exclusive write ownership over designated directories and files.

---

## Developer A: Squads, Membership & Invitation Systems

**Mission:** Complete squad lifecycle, secure room codes, 7-day token invites, pending member approvals, and squad role governance.

### Exclusive File Ownership:
- `apps/web/src/modules/squads/**`
  - `types.ts`
  - `schema.ts`
  - `api.ts`
  - `squad-new-page.tsx`
  - `squad-detail-page.tsx`
  - `squad-members-page.tsx`
  - `squad-settings-page.tsx`
  - `README.md`
- `apps/web/src/modules/invitations/**`
  - `types.ts`
  - `schema.ts`
  - `api.ts`
  - `join-page.tsx`
  - `invite-page.tsx`
  - `README.md`

### Backend RPCs Owned:
- `create_squad`
- `join_squad`
- `create_squad_invite`
- `join_squad_by_invite`
- `approve_member`
- `set_member_role`
- `remove_squad_member`
- `transfer_squad_owner`

---

## Developer B: Tactical Pitch Board, Formations & Lineups

**Mission:** Build the interactive pitch board, 5v5/7v7 presets, drag-and-drop coordinate mapping, substitute bench, and realtime lineup sync.

### Exclusive File Ownership:
- `apps/web/src/modules/formations/**`
  - `types.ts`
  - `schema.ts`
  - `api.ts`
  - `lineup-page.tsx`
  - `README.md`
- `apps/web/src/modules/teams/**`
  - `types.ts`
  - `schema.ts`
  - `api.ts`
  - `README.md`

### Backend RPCs Owned:
- `assign_team_player`
- `remove_team_player`
- `save_team_formation`

---

## Developer C: Match Coordination, Scheduling & Attendance RSVP

**Mission:** Match fixture scheduling, Kerala turf location management, kickoff dates in IST (`Asia/Kolkata`), match status flow, and one-tap player attendance.

### Exclusive File Ownership:
- `apps/web/src/modules/matches/**`
  - `types.ts`
  - `schema.ts`
  - `api.ts`
  - `match-new-page.tsx`
  - `match-detail-page.tsx`
  - `README.md`
- `apps/web/src/modules/attendance/**`
  - `types.ts`
  - `schema.ts`
  - `api.ts`
  - `README.md`

### Backend RPCs Owned:
- `create_match`
- `update_match`
- `set_attendance`

---

## Shared Foundation Files (Read-Only for Feature Devs, Lead Architect Approval Required for Changes):
- `apps/web/src/types/database.types.ts`
- `apps/web/src/types/contracts.ts`
- `apps/web/src/infrastructure/supabase/client.ts`
- `apps/web/src/infrastructure/supabase/realtime.ts`
- `apps/web/src/infrastructure/query-keys.ts`
- `apps/web/src/app/router.tsx`
- `apps/web/src/stores/ui-store.ts`
- `apps/web/src/design/tokens.css`
- `apps/landing/**`
