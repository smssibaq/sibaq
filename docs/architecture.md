# Architecture Overview

## Monorepo Strategy
ApexBuild uses an isolated multi-application structure where both applications maintain independent package definitions, dependencies, and lockfiles:

- `apps/landing` — Next.js 15 App Router. Public marketing, SEO metadata, responsive hero, feature highlights, and navigation CTA. Zero business logic or database access.
- `apps/web` — React 18 + Vite + TypeScript. Authenticated product Single Page Application.
- `supabase/` — Authoritative database migration history, Edge Functions, security policies, and seed data.

There are no shared npm packages, no hoisting, and no cross-app source imports. This completely eliminates dependency synchronization conflicts between Next.js and Vite.

## Application Architecture (apps/web)
The product application is structured as a modular monolith:

```text
apps/web/src/
  ├── app/                  # Router tree, query/auth providers, entry point
  ├── components/
  │   ├── ui/               # Presentation primitives (Button, Input, Dialog, etc.)
  │   └── common/           # Shared cross-cutting components (AppLayout, ErrorState, etc.)
  ├── design/               # Tokens, CSS variables, global styling
  ├── lib/                  # Infrastructure (Supabase client, storage, dates, errors)
  ├── modules/              # Domain modules
  │   ├── auth/             # Session restoration, Google OAuth, route guards, profile
  │   ├── dashboard/        # System metrics, neutral welcome, quick actions
  │   ├── sample-items/     # Removable sample CRUD demonstration
  │   └── admin/            # Role management and security audit
  ├── stores/               # Zustand UI-only cross-route state
  ├── types/                # Typed database entities
  └── tests/                # Unit, integration, and security tests
```

## State Management Rules
1. **Server State**: Managed exclusively by TanStack Query.
2. **Client UI State**: Managed by Zustand (`stores/ui-store.ts`) for cross-route UI states only (e.g. sidebar toggle, theme preference). Never duplicate database rows in Zustand.
3. **Forms**: React Hook Form with Zod schemas (`@hookform/resolvers/zod`).

