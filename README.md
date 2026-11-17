# Kalikkanundo

Turf football squad, match and lineup manager. `apps/landing` is the Next.js marketing site, `apps/web` is the React/Vite PWA, and `supabase/` holds the database migrations.

## Getting started

Requirements: Node 22+ (see `.nvmrc`) and npm.

```bash
# 1. Install everything and create apps/*/.env.local from the examples
powershell ./scripts/setup.ps1      # Windows
./scripts/setup.sh                  # macOS / Linux / Git Bash
# (or: npm run setup, then copy apps/*/.env.example to apps/*/.env.local)

# 2. Run landing (http://localhost:3000) and web app (http://localhost:5173)
npm run dev
```

### Supabase

The apps point at Supabase project `ctbpkaqyddceacjlujpi` (`https://ctbpkaqyddceacjlujpi.supabase.co`, region ap-southeast-2). All 13 migrations in `supabase/migrations/` are applied there and the remote migration history matches the file versions, so `supabase db push` only sends new files.

To use a different project, change `VITE_SUPABASE_URL` and `VITE_SUPABASE_PUBLISHABLE_KEY` in `apps/web/.env.local` and run:

```bash
supabase link --project-ref <ref>
supabase db push
```

In the Supabase dashboard, under **Authentication → URL Configuration**, set the Site URL to `http://localhost:5173` and add `http://localhost:5173/auth/callback` (plus your production URLs) to the redirect allow-list. Google sign-in also needs the Google provider enabled.

---

## Original starter notes: ApexBuild — Domain-Neutral Buildathon Starter

A production-grade, reusable Buildathon template optimized for a **3-person team** and a **240-minute competition window**.

---

## 1. Architecture Highlights

- **Decoupled Applications**:
  - `apps/landing` — Next.js 15 (App Router, Tailwind CSS, Lucide Icons). Fast, responsive public marketing shell and CTA to product app.
  - `apps/web` — React 18 + Vite (TanStack Router, TanStack Query, Zustand, Tailwind CSS, Lucide Icons, date-fns). Authenticated product Single Page Application.
  - **No Shared Packages / No Hoisting**: Each frontend maintains its own independent `package.json`, `package-lock.json`, and `node_modules`.
- **Modular Monolith**:
  - Domain features live in isolated folders inside `apps/web/src/modules/` (`auth`, `dashboard`, `sample-items`, `admin`).
  - No internal source cross-imports; explicit public contracts only.
- **Supabase Cloud Native**:
  - PostgreSQL database with strict Row Level Security (RLS) on all exposed tables.
  - Google OAuth with PKCE browser flow and safe return URL validation.
  - Multi-tenant role system (`user` vs `admin`) governed by database constraints and an audited `is_admin()` security definer function.
  - Private `user-files` storage bucket with ownership-scoped RLS policies.
  - Supabase Edge Function template for trusted server operations.
- **60-30-10 Design System**:
  - 60% base canvas (`#F8FAFC`), 30% surface containers (`#FFFFFF` / `#E2E8F0`), 10% accent actions (`#4F46E5`).
  - Minimum 44px touch targets (`min-h-control`), accessible keyboard focus states (`:focus-visible`), and reduced-motion support.

---

## 2. Directory Tree

```text
buildathon/
  apps/
    landing/                 # Next.js 15 marketing site
      package.json
      package-lock.json
      src/app/
      src/components/
      src/config/
      src/styles/
      .env.example
    web/                     # React 18 + Vite product application
      package.json
      package-lock.json
      src/
        app/                 # Router tree, query & auth providers, main entry
        components/ui/       # Accessible UI primitives (Button, Input, Dialog, etc.)
        components/common/   # AppLayout, EmptyState, ErrorState, ErrorBoundary, Gallery
        design/              # CSS tokens, theme variables, global styles
        lib/                 # Supabase client, storage, dates, errors, validation
        modules/
          auth/              # Google OAuth, protected routes, profile & storage test
          dashboard/         # Metrics, neutral welcome, navigation shortcuts
          sample-items/      # Removable CRUD demo with RLS
          admin/             # Role oversight and security audit
        stores/              # UI-only Zustand store (no database rows in Zustand)
        types/               # Typed database interfaces
        tests/               # Vitest unit, integration, and security tests
      .env.example
      vercel.json            # SPA history rewrite fallback
  supabase/
    migrations/              # Ordered, authoritative PostgreSQL migrations
    functions/               # Supabase Edge Functions (CORS, JWT verification)
    seed.sql                 # Sample data & admin role provisioning instructions
    config.toml              # Supabase CLI configuration
  docs/
    architecture.md          # Architectural decisions & state management rules
    module-contracts.md      # Feature isolation and team boundaries
    database-schema.md       # RLS policies, tables, and storage buckets
    design-system.md         # 60-30-10 tokens, Poppins typography, breakpoints
    security.md              # Secret hygiene, open-redirect prevention, RLS
    deployment.md            # Independent Vercel & Supabase Cloud deployment
    runbook.md               # 240-minute competition timeline & emergency playbook
    ai-prompts/
      PROJECT_PLAN.md        # Stage 2 planning worksheet
      MASTER_PROMPT.md       # Prompt for ONE developer to initialize the chosen domain
      FEATURE_TASK.md        # Task brief template for Developers A, B, and C
  scripts/                   # Cross-platform development and build scripts
  .github/workflows/ci.yml   # Independent CI testing and building
  .github/pull_request_template.md
  STATUS.md                  # Verification ledger and credential tracking
  README.md
```

---

## 3. Quickstart Commands

```bash
# Install dependencies across root and both apps in one command
npm run install:all
# (or just `npm install`, which triggers postinstall for all apps)
# Alternatively: powershell ./scripts/install.ps1 (Windows) or ./scripts/install.sh (Linux/macOS)

# Run both applications concurrently in one command
# Landing on http://localhost:3000
# Product app on http://localhost:5173
npm run dev

# Or run individual apps:
npm run dev:landing
npm run dev:web

# Run all quality gates
npm run check
```

---

## 4. Quality Verification Results

| Quality Gate | Command | Result | Notes |
|---|---|---|---|
| **Typecheck Landing** | `npm --prefix apps/landing run typecheck` | **PASS** | 0 TypeScript errors |
| **Typecheck Web** | `npm --prefix apps/web run typecheck` | **PASS** | 0 TypeScript errors |
| **Unit & Integration Tests** | `npm --prefix apps/web run test` | **PASS** | 22/22 tests passed (validation, dates, errors, storage, security) |
| **Build Landing** | `npm --prefix apps/landing run build` | **PASS** | Optimized Next.js static pages generated |
| **Build Web** | `npm --prefix apps/web run build` | **PASS** | Vite production bundle compiled |

---

## 5. Live Environment Setup (When Credentials Available)

1. **Copy Environment Examples**:
   - `apps/landing/.env.example` -> `apps/landing/.env.local`
   - `apps/web/.env.example` -> `apps/web/.env.local`
2. **Supabase Cloud**:
   - Add your `VITE_SUPABASE_URL` and `VITE_SUPABASE_PUBLISHABLE_KEY` in `apps/web/.env.local`.
   - Run migrations from `supabase/migrations/` in the Supabase SQL Editor.
   - Configure Google OAuth under **Auth -> Providers -> Google**.
   - Add `http://localhost:5173/auth/callback` to **Auth -> URL Configuration -> Redirect URLs**.

---

## 6. How to Execute During the Competition

### Stage 1: Reusable Starter (Current State)
The starter technical foundation is fully built, tested, and ready.

### Stage 2: Project Initialization (Minute 0–30)
1. Receive the problem statement.
2. Complete `docs/ai-prompts/PROJECT_PLAN.md` with your team.
3. **ONE developer** runs `docs/ai-prompts/MASTER_PROMPT.md` against this starter.
4. The master prompt establishes the domain tables, types, route registrations, and produces three feature task briefs.

### Stage 3: Parallel Feature Development (Minute 30–180)
The three developers can now work independently without git conflicts:
- **Developer A**: Works on `feat/feature-a` using `FEATURE_TASK.md` (owns `src/modules/feature-a/`).
- **Developer B**: Works on `feat/feature-b` using `FEATURE_TASK.md` (owns `src/modules/feature-b/`).
- **Developer C**: Works on `feat/feature-c` using `FEATURE_TASK.md` (owns `src/modules/feature-c/`).
- Merge small, working pull requests into `main` after running `npm run check`.

# starter
# starter


## For Depoloyment
- This happened for deployment