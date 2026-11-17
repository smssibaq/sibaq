# Turf XI — Project Foundation Status

## Baseline Status Overview

| Checkpoint | Scope | Status | Notes |
|---|---|---|---|
| **C0: Environment & Architecture** | Monorepo isolation & scripts | **PASS** | `apps/landing` (Next.js 15) and `apps/web` (React/Vite). Independent lockfiles and node_modules. Root `npm run dev` and `npm run install:all` configured. |
| **C1: Database & RPC Inspection** | Live Supabase probe | **PASS** | Schema rebuilt from migrations on project `ctbpkaqyddceacjlujpi` (ap-southeast-2): 12 public tables and all RPCs the web client calls. Smoke-tested create squad → join → approve → role change → ownership transfer, and outsider rejection. |
| **C2: Theme & Tokens** | 60/30/10 Palette & Typography | **PASS** | `#0B1F19` deep pitch canvas (60%), `#132E26` stadium surface (30%), `#B7F34B` electric neon lime (10%). High-contrast accessible text on accent (`#0B1F19`). Poppins typography. |
| **C3: Type System & Contracts** | Database & Domain Contracts | **PASS** | Complete typed Supabase client with PKCE. App-level domain interfaces in `src/types/contracts.ts` and `src/types/database.types.ts`. Centralized query keys. |
| **C4: Landing & Routing** | Next.js Landing & TanStack Router | **PASS** | Turf XI branded hero, CSS football pitch board preview, and dynamic CTA to web app. Router placeholders for all squad, match, invite, and lineup routes. |
| **C5: Realtime & Offline Resilience** | Scoped Subscriptions | **PASS** | `useMatchRealtime` hook for live team, attendance, and player updates. Honest UI states for loading, errors, and empty states. Self-healing profile creation on auth. |
| **C6: Automated Quality Gates** | Typecheck, Test, Lint, Build | **PASS** | Typecheck: 0 errors. Test: 22/22 passed. Lint: 0 errors/warnings. Build: SSG landing + Vite web production bundles generated. |

---

## Live Supabase Credentials Configured
- **Project Reference:** `ctbpkaqyddceacjlujpi` (migrated 2026-11-17; previously `czhkpkhtpdafiiadvgje`)
- **Region:** `ap-southeast-2`
- **API URL:** `https://ctbpkaqyddceacjlujpi.supabase.co`
- **Publishable Key:** `sb_publishable_y6T_800vf2xdiMeUTRqSaQ_zn5eySE_` (safe to expose in the frontend)
- **Migrations:** all 15 files in `supabase/migrations/` applied; remote history versions match the filenames.
- **Multi-sport:** shared `sports` registry + `games` table; see `docs/multisport-playbook.md`.

### Migration notes (2026-11-17)
- Duplicate `20261116000008` version renumbered (000009–000011 shifted by one).
- `20261117000012` implements the squad/lineup RPCs that were previously only documented, fixes recursive `squad_members` RLS, adds the `avatars` bucket and realtime publication.
- `20261117000013` closes a NULL-role authorization bypass in the RPCs and removes anon EXECUTE.

---

## Developer Handoff
- **Developer A:** `apps/web/src/modules/squads/**`, `apps/web/src/modules/invitations/**`
- **Developer B:** `apps/web/src/modules/formations/**`, `apps/web/src/modules/teams/**`
- **Developer C:** `apps/web/src/modules/matches/**`, `apps/web/src/modules/attendance/**`
