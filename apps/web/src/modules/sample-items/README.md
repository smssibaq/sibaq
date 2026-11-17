# Sample Items Module (Removable Demo)

This module demonstrates the recommended structure for domain features:

```text
sample-items/
  api.ts               # TanStack Query queries, mutations, cache invalidation
  schema.ts            # Zod form validation schemas
  types.ts             # Domain entity and input interfaces
  sample-items-page.tsx# UI presentation layer
  README.md            # Module ownership documentation
```

## How to Remove or Replace in Production

1. Remove route registration in `apps/web/src/app/router.tsx`.
2. Remove navigation entry in `apps/web/src/components/common/app-layout.tsx`.
3. Drop the `sample_items` table in a new migration or archive `supabase/migrations/20261115000002_sample_items_demo.sql`.
4. Delete the `src/modules/sample-items` folder.

