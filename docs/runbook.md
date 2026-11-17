# Competition Runbook (240-Minute Execution)

## Timeline Breakdown
- **0–30 min**: Problem Statement Analysis & Planning
  - Fill out `docs/ai-prompts/PROJECT_PLAN.md`.
  - Agree on Feature A, B, and C ownership.
  - One developer runs `docs/ai-prompts/MASTER_PROMPT.md` to initialize project scaffolding and migration contracts.
- **30–180 min**: Parallel Feature Development
  - Dev A works on Feature A in `feat/feature-a`.
  - Dev B works on Feature B in `feat/feature-b`.
  - Dev C works on Feature C in `feat/feature-c`.
  - Regular small PR merges to `main`.
- **180–210 min**: Integration & End-to-End Verification
  - Deploy to Vercel and verify live Supabase data.
  - Run `npm run check` across both apps.
- **210–240 min**: Polish, Demo Run-through, Presentation Prep.

## Common CLI Commands
```bash
# Start both apps locally
npm run dev:landing   # http://localhost:3000
npm run dev:web       # http://localhost:5173

# Quality gates
npm run typecheck
npm run test
npm run build
npm run check
```

## Emergency Troubleshooting
- **Issue: Google OAuth redirects with error.**
  - Check Supabase Dashboard -> Authentication -> URL Configuration.
  - Ensure the redirect URL `http://localhost:5173/auth/callback` or production Vercel URL is listed in Allowed Redirect URLs.
- **Issue: Database query returns empty array or permission denied (42501).**
  - Check Row Level Security policies in `supabase/migrations/`.
  - Ensure `(select auth.uid()) = owner_id` matches the authenticated user.
- **Issue: Vercel returns 404 on page refresh in apps/web.**
  - Ensure `apps/web/vercel.json` is deployed with rewrite to `/index.html`.

