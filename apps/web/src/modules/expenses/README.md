# Shared expenses (Dev A)

Import `ExpensePanel` from `@/modules/expenses` and mount `<ExpensePanel gameId={game.id} />` in any sport game page. Football is wired in `match-detail-page.tsx`; badminton, cricket and volleyball can reuse the same public component without sport-specific changes.

The panel checks `get_game_context`, then loads `get_game_expense_summary` for organizers and participants. All writes use the supplied organizer-only RPCs. Values are parsed in integer paise, then sent to RPCs as decimal rupees. Partial payment entry replaces the total paid amount; it does not add to it. The supplied SQL determines payment status and split allocation.

Queries use `['expense', gameId]`; mutations and Realtime share events invalidate that key. Organizers see all returned shares. Participants see only the shares returned for them by the RPC. WhatsApp summaries use the game title and date from `get_game_context` and format dates in Asia/Kolkata.

## Database deployment pending

`supabase/expenses_core.sql` is the supplied migration SQL, unchanged. The configured project is `ctbpkaqyddceacjlujpi`. The connected Supabase account currently denies access, and the app environment contains only a publishable key. No migration has been applied by this implementation.

Using an account with access to this project:

1. Apply the exact SQL with migration name `expenses_core`.
2. Read the assigned version from `list_migrations` and save the same SQL as `supabase/migrations/<version>_expenses_core.sql`.
3. Check security advisors and smoke-test `get_game_expense_summary` as an organizer and a participant in rolled-back transactions.
4. Verify creation, manual-share reset, payment tracking, player resync, and WhatsApp copy in the app.

Do not mark the migration as applied or invent its remote version before deployment succeeds.
