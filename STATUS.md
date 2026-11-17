# Turf XI — Project Foundation Status

## Baseline Status Overview

| Checkpoint | Scope | Status | Notes |
|---|---|---|---|
| **C0: Environment & Architecture** | Monorepo isolation & scripts | **PASS** | `apps/landing` (Next.js 15) and `apps/web` (React/Vite). Independent lockfiles and node_modules. Root `npm run dev` and `npm run install:all` configured. |
| **C1: Database & RPC Inspection** | Live Supabase probe | **PASS** | Probed project `czhkpkhtpdafiiadvgje` (ap-south-1). Verified all 9 public tables, exact schema columns, and 14 `SECURITY DEFINER` RPCs. Documented in `20261116000004_turf_xi_core_schema.sql`. |
| **C2: Theme & Tokens** | 60/30/10 Palette & Typography | **PASS** | `#0B1F19` deep pitch canvas (60%), `#132E26` stadium surface (30%), `#B7F34B` electric neon lime (10%). High-contrast accessible text on accent (`#0B1F19`). Poppins typography. |
| **C3: Type System & Contracts** | Database & Domain Contracts | **PASS** | Complete typed Supabase client with PKCE. App-level domain interfaces in `src/types/contracts.ts` and `src/types/database.types.ts`. Centralized query keys. |
| **C4: Landing & Routing** | Next.js Landing & TanStack Router | **PASS** | Turf XI branded hero, CSS football pitch board preview, and dynamic CTA to web app. Router placeholders for all squad, match, invite, and lineup routes. |
| **C5: Realtime & Offline Resilience** | Scoped Subscriptions | **PASS** | `useMatchRealtime` hook for live team, attendance, and player updates. Honest UI states for loading, errors, and empty states. Self-healing profile creation on auth. |
| **C6: Automated Quality Gates** | Typecheck, Test, Lint, Build | **PASS** | Typecheck: 0 errors. Test: 22/22 passed. Lint: 0 errors/warnings. Build: SSG landing + Vite web production bundles generated. |

---

## Live Supabase Credentials Configured
- **Project Reference:** `czhkpkhtpdafiiadvgje`
- **Region:** `ap-south-1`
- **API URL:** `https://czhkpkhtpdafiiadvgje.supabase.co`
- **Publishable Key:** `sb_publishable_fVvf3BGpEVonkiEBm5BDvw_pv2_iFhz` (safely exposed in frontend)

---

## Developer Handoff
- **Developer A:** `apps/web/src/modules/squads/**`, `apps/web/src/modules/invitations/**`
- **Developer B:** `apps/web/src/modules/formations/**`, `apps/web/src/modules/teams/**`
- **Developer C:** `apps/web/src/modules/matches/**`, `apps/web/src/modules/attendance/**`
