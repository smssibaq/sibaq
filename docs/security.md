# Security & Authorization Guidelines

## 1. Secrets Management
- **Never expose privileged keys**: The Supabase `service_role` key and database passwords must NEVER be placed in client `.env` files or referenced in frontend code.
- **Client variables**: Only `VITE_SUPABASE_URL` and `VITE_SUPABASE_PUBLISHABLE_KEY` (or anon key) are permitted in `apps/web/.env.local`.
- **Edge Functions**: Server-side secrets belong in Supabase Secrets (`supabase secrets set KEY=VALUE`).

## 2. Row Level Security (RLS)
- Every table in any exposed schema (`public`) MUST have RLS enabled: `ALTER TABLE ... ENABLE ROW LEVEL SECURITY;`.
- Use `(select auth.uid())` instead of bare `auth.uid()` for query optimization in PostgreSQL.
- Combine `TO authenticated` with explicit row-ownership predicates (`(select auth.uid()) = owner_id`).
- For update policies, specify both `USING` and `WITH CHECK`.
- Never trust client-sent user metadata for authorization checks; query `public.user_roles` via the audited `is_admin()` security definer function.

## 3. Storage Security
- Objects in `user-files` are strictly partitioned under the user's UUID: `(storage.foldername(name))[1] = (select auth.uid())::text`.
- File sizes and MIME types are validated both client-side and enforced at the database bucket level.
- File URLs are generated as short-lived signed URLs (5 minutes default) rather than public permanent URLs.

## 4. Open-Redirect Prevention
All redirect queries (`returnUrl`) are sanitized using `sanitizeReturnUrl()` to ensure they begin with a single `/` and cannot redirect to external origins.

