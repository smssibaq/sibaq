# Shared expenses (Dev A)

Import `ExpensePanel` from `@/modules/expenses` and mount `<ExpensePanel gameId={game.id} />` in any sport game page. Football is wired in `match-detail-page.tsx`; badminton, cricket and volleyball can reuse the same public component without sport-specific changes.

The panel checks `get_game_context`, then loads `get_game_expense_summary` for organizers and participants. All writes use the supplied organizer-only RPCs. Values are parsed in integer paise, then sent to RPCs as decimal rupees. Partial payment entry replaces the total paid amount; it does not add to it. The supplied SQL determines payment status and split allocation.

Queries use `['expense', gameId]`; mutations and Realtime share events invalidate that key. Organizers see all returned shares. Participants see only the shares returned for them by the RPC. WhatsApp summaries use the game title and date from `get_game_context` and format dates in Asia/Kolkata.

## Database verified

The connected Sibaq project is `ctbpkaqyddceacjlujpi`. The migration was already applied as `20261117151219_expenses_core`; its recorded SQL matches `supabase/expenses_core.sql`. The same SQL is saved in `supabase/migrations/20261117151219_expenses_core.sql` to match the remote history.

On 2026-11-17, an authenticated organizer smoke test verified creation, summary totals, manual shares, partial/full/unpaid payments, reset-to-equal, player resplitting, and amount updates. A non-participant identity was denied both summary access and payment writes. The entire transaction was rolled back; no expense or payment test data remains.

Both tables have RLS enabled and only authenticated SELECT policies. The internal resplit function and anonymous summary access are revoked. Expense shares are included in the Realtime publication.

Security advisors flag the intentionally authenticated SECURITY DEFINER expense RPCs. Their organizer/participant authorization checks remain as supplied. The project also has existing unrelated notices for squad_audit policies and disabled leaked-password protection; this feature does not change those settings.

Frontend typecheck, production build, and expense-module lint passed. Browser interaction and multi-player realtime behavior still require a UI check with real sessions. No new unit tests were added.
