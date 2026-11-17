# Module Boundaries & Team Contracts

## Modular Monolith Rules
Each developer owns an assigned domain module inside `apps/web/src/modules/`.

1. **No Internal Imports**: Module `A` must never import private implementation files from Module `B`.
2. **Explicit Public Contracts**: If Module `A` needs data or actions from Module `B`, Module `B` must export a typed contract or API hook via its index/public interface.
3. **Common Utilities**: Reusable presentation primitives live in `src/components/ui/`, layout wrappers live in `src/components/common/`, and infrastructural adapters live in `src/lib/`.
4. **Independent Migrations**: Each developer writes sequential, additive migration files in `supabase/migrations/` using timestamp prefixes (`YYYYMMDDHHMMSS_<feature>.sql`).

## Standard Feature Folder Structure
```text
src/modules/<feature-name>/
  ├── types.ts          # Domain entity interfaces and mutation inputs
  ├── schema.ts         # Zod validation schemas for forms
  ├── api.ts            # TanStack Query hooks (queries, mutations, invalidation)
  ├── <feature>-page.tsx# Primary view component
  └── README.md         # Ownership and contract notes
```

## Three-Person Parallel Workflow
- **Developer A**: Owns Feature A (module, migrations, routes, validation, UI).
- **Developer B**: Owns Feature B (module, migrations, routes, validation, UI).
- **Developer C**: Owns Feature C (module, migrations, routes, validation, UI).
- **Integration Owner**: Rotates among team members to coordinate root router registration and review PRs.

