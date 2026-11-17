# Feature Task Brief Template (Stage 3 Execution)

> **Instructions for the Developer**:
> Create your feature branch (`git checkout -b feat/<feature-name>`). Provide this brief to your AI assistant. Stay strictly within your owned files and contracts.

---

## 1. Assignment & Feature Identification
- **Assigned Developer**: [Developer A / Developer B / Developer C]
- **Feature Name**: [e.g. Patient Triage Intake]
- **Target Branch**: `feat/<feature-name>`
- **Time Allocation**: 150 minutes

---

## 2. Ownership Boundaries
- **Owned Module Directory**: `apps/web/src/modules/<feature-name>/`
  - `types.ts`
  - `schema.ts`
  - `api.ts`
  - `<feature-name>-page.tsx`
  - Components inside `apps/web/src/modules/<feature-name>/components/`
- **Owned Migration**: `supabase/migrations/YYYYMMDDHHMMSS_<feature-name>.sql`
- **Owned Route**: `/<feature-route>` in `apps/web/src/app/router.tsx`

---

## 3. Allowed Common Dependencies
You may import from:
- `apps/web/src/components/ui/` (Button, Input, FormField, Card, Badge, Dialog, Table, etc.)
- `apps/web/src/components/common/` (EmptyState, ErrorState, ErrorBoundary)
- `apps/web/src/lib/` (supabase client, storage helper, dates, errors, validation)
- `apps/web/src/modules/auth/auth-provider` (`useAuth` hook for user ID, profile, and role)
- Publicly exported types or query hooks from peer features (via their public contracts only).

**STRICT PROHIBITION**: Do not import internal files of another feature module or modify shared common utilities without coordination with the Integration Lead.

---

## 4. Acceptance Criteria & States
- [ ] **Form Validation**: All user inputs validated with React Hook Form + Zod.
- [ ] **Database Integrity**: PostgreSQL constraints and RLS policies enforced.
- [ ] **Loading State**: Accessible skeleton or spinner while queries resolve.
- [ ] **Empty State**: Friendly `<EmptyState>` with a primary CTA on empty queries.
- [ ] **Error State**: Resilient `<ErrorState>` with a retry button for failed operations.
- [ ] **Success Feedback**: `<Toast>` notifications on create, update, or delete.
- [ ] **Accessibility**: All buttons and inputs meet 44px minimum height with visible focus outlines.
- [ ] **Zero Overflow**: Fully responsive down to 360px viewport width.

---

## 5. Verification Commands
Before opening your Pull Request to `main`, run and verify:
```bash
cd apps/web
npm run typecheck   # Must exit with 0 errors
npm run test        # Must pass all tests
npm run build       # Must produce a production build
```

---

## 6. PR & Integration Handoff
1. Push branch: `git push origin feat/<feature-name>`
2. Open Pull Request using `.github/pull_request_template.md`.
3. Notify the team Integration Lead for review.

