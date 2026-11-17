# Master Initialization Prompt (Stage 2 Execution)

> **Instructions for the Team**:
> After completing `docs/ai-prompts/PROJECT_PLAN.md`, ONE developer executes this prompt against the starter codebase.
> This will scaffold the agreed domain foundations, types, navigation, and migrations so all three developers can branch off simultaneously.

```markdown
You are our Senior Full-Stack Architect. We have completed our Buildathon planning in `docs/ai-prompts/PROJECT_PLAN.md`. Initialize the project foundation based on that plan.

Follow these strict constraints:
1. Read `docs/ai-prompts/PROJECT_PLAN.md`, `docs/architecture.md`, `docs/module-contracts.md`, and `docs/database-schema.md`.
2. Preserve the starter's core architecture:
   - Decoupled Next.js landing and React + Vite web application.
   - TanStack Router, TanStack Query, and Zustand for UI-only state.
   - 60-30-10 design token system and 44px accessible control targets.
   - Supabase client, storage utilities, and date-fns helpers in `src/lib/`.
3. Apply the agreed branding:
   - Update `apps/landing/src/config/site.ts` with the project name, tagline, description, and feature highlights.
   - Update `apps/web/src/components/common/app-layout.tsx` branding and sidebar navigation links for Feature A, Feature B, and Feature C.
4. Establish feature module scaffolding:
   - Create `apps/web/src/modules/<feature-a>/` with `types.ts`, `schema.ts`, `api.ts`, `<feature-a>-page.tsx`, and `README.md`.
   - Create `apps/web/src/modules/<feature-b>/` with `types.ts`, `schema.ts`, `api.ts`, `<feature-b>-page.tsx`, and `README.md`.
   - Create `apps/web/src/modules/<feature-c>/` with `types.ts`, `schema.ts`, `api.ts`, `<feature-c>-page.tsx`, and `README.md`.
   - Register the three feature routes in `apps/web/src/app/router.tsx` inside `<ProtectedRoute>`.
   - Establish typed public service contracts between features as defined in the project plan.
5. Author the agreed Supabase migrations:
   - Create sequential migrations in `supabase/migrations/` (e.g. `20261115000004_<feature_a>.sql`, etc.).
   - Include PostgreSQL constraints, indexes, and explicit RLS policies (`TO authenticated USING (...) WITH CHECK (...)`).
   - If storage is needed, add bucket definitions and UUID-scoped RLS policies.
6. Verify quality gates:
   - Run `npm run typecheck` across both apps.
   - Run `npm run test` in `apps/web`.
   - Run `npm run build` in both apps.
7. Produce three separate feature briefs using `docs/ai-prompts/FEATURE_TASK.md`:
   - Task brief for Developer A on `feat/feature-a`.
   - Task brief for Developer B on `feat/feature-b`.
   - Task brief for Developer C on `feat/feature-c`.
8. Update `STATUS.md` recording all initialized files, migration order, and confirm that Developers A, B, and C can safely begin parallel feature development.

Do not implement complete business logic for all three features now. Establish the clean scaffolding, types, route registrations, database schemas, and contracts so each developer can work without merge conflicts.
```

