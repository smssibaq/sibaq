# Kalikkanundo Multi-Sport Playbook

**Four sports, three developers, one buildathon.** This is the shared reference for everyone working on the project. Read it before your first change.

> Theme: *The Small Irritation.* Every time friends plan a game, someone has to ask who's playing, count confirmations, organize players and keep updating the group chat. Kalikkanundo handles that for every sport with one flow: **Create → Invite → Confirm → Organize → Play**.

---

## 1. Who owns what

| Sport / feature | Owner | Frontend | Database objects |
|---|---|---|---|
| Football (existing) | Platform (Dev A keeps it working) | `modules/squads`, `matches`, `attendance`, `teams`, `formations`, `invitations` | `matches`, `match_*`, `teams`, `team_players`, `squad_*` |
| Badminton | **Dev A** | `modules/badminton` | `badminton_*` |
| Cricket | **Dev B** | `modules/cricket` | `cricket_*` |
| Volleyball | **Dev C** | `modules/volleyball` | `volleyball_*` |
| Shared platform (games, sports registry, ledger) | Dev A | `types/database.types.ts` (core part), `types/sport-module.ts` | `sports`, `games`, `ops.change_ledger`, `create_game`, `is_game_*`, `get_game_context` |
| Sport navigation (integration) | **Dev A only** | `app/router.tsx`, app layout and nav | — |
| Ratings & match reviews (all sports) | **Dev A** | `modules/ratings` | `game_player_ratings`, `game_match_reviews` |
| Money splitting (all sports) | **Dev A**, after the badminton MVP (*the brief also says "by dev c"; confirm before starting*) | `modules/expenses` | `game_expenses`, `game_expense_shares` |

**Hard rule:** never edit another developer's module or another sport's `<sport>_*` objects. Shared objects change only through Dev A.

---

## 2. How the database works now

```
auth.users ─ profiles ─ squads (shared groups for every sport, invites, roles)
                           │
public.sports  ◄── registry: football, badminton, cricket, volleyball
     │
public.games   ◄── ONE row per playable game, any sport (id, sport, squad, title, venue, starts_at, status, created_by)
     │  (id, sport) is unique → sport tables and shared features reference it by both columns
     ├── matches            (football: unchanged, auto-linked by trigger)
     ├── badminton_games    (Dev A)
     ├── cricket_games      (Dev B)
     └── volleyball_games   (Dev C)

Shared features: game_player_ratings, game_match_reviews, game_expenses, ...
   └── FOREIGN KEY (game_id, sport) REFERENCES games(id, sport)
```

- **Squads are shared groups.** One squad can play any sport. `squads.default_sport` only decides which tab the UI opens first. Create → Invite works the same everywhere (`create_squad`, room codes, invite links, approvals).
- **A sport table can only point at a game of its own sport.** The pinned `sport` column plus the composite foreign key guarantee it. The same mechanism makes the sport + game ID check automatic for ratings and expenses.
- **Football didn't change.** `create_match` and all football RPCs work as before. A trigger copies each match into `games` and keeps it in sync.

### Standard cross-sport interface (shared features use only these)

| Function | Who calls it | Purpose |
|---|---|---|
| `create_game(sport, squad, title, venue, starts_at)` | your sport RPCs only (not clients) | Creates the `games` row; checks auth and that the caller is squad owner/admin |
| `update_game_core(game, title?, venue?, starts_at?, status?)` | your sport RPCs only | Updates shared fields; organizer only |
| `is_game_organizer(game, user)` | RLS, RPCs, client | Creator, squad owner/admin, or the sport's extra rule |
| `game_confirmed_players(game) → setof uuid` | RLS, RPCs (not clients) | Dispatches to the sport's `<sport>_confirmed_players` |
| `is_game_participant(game, user)` | RLS, RPCs, client | User is confirmed for the game |
| `can_view_game(game, user)` | RLS, RPCs, client | Creator, active squad member, or participant |
| `get_game_context(game)` | client | One-call summary: sport, title, status, `is_organizer`, `is_participant`, `confirmed_count` |

### What each sport must provide

1. `public.<sport>_games (id uuid pk, sport text default '<sport>' check (sport='<sport>'), ..., foreign key (id, sport) references games(id, sport) on delete cascade)`
2. `public.<sport>_confirmed_players(p_game uuid) returns setof uuid` (**required**)
3. Optionally `public.<sport>_is_organizer(p_game uuid, p_user uuid) returns boolean`
4. Register it: `update public.sports set game_table = 'public.<sport>_games', confirmed_players_fn = 'public.<sport>_confirmed_players(uuid)', is_enabled = true where key = '<sport>';`
   A trigger rejects functions with the wrong signature.

**Start from `supabase/templates/sport_module_template.sql`.** It includes the game table, RSVPs with capacity, RLS, the two RPCs, registration and the ledger entry. Replace `__SPORT__` and `__OWNER__`, then add your sport-specific columns and logic (cricket overs and innings, volleyball sets, badminton singles/doubles). The template was tested end to end on the live project inside a rolled-back transaction.

---

## 3. Migration workflow (every developer, from your own chat)

All three of us apply migrations to the **same Supabase project** (`ctbpkaqyddceacjlujpi`) through the Supabase MCP tools in our own Claude chats.

1. `git pull --rebase` on `main`.
2. Check what changed recently:
   `select migration_name, owner, sport, description, recorded_at from ops.change_ledger order by recorded_at desc limit 20;`
3. Write SQL that touches **only your prefix** (`badminton_` / `cricket_` / `volleyball_`) plus your own row in `public.sports`.
4. End the migration with a ledger insert:
   `insert into ops.change_ledger (migration_name, owner, sport, objects, description) values ('<name>', 'dev_b', 'cricket', '{cricket_games,...}', 'what changed');`
5. Apply it with **`apply_migration`**, name `<sport>_<what>` (e.g. `cricket_innings_scoring`).
6. Run **`list_migrations`**, take the version Supabase assigned, and save the exact SQL as `supabase/migrations/<version>_<name>.sql`. The repo then always matches the remote history and filenames never collide.
7. Add your types to `apps/web/src/types/sports/<sport>.db.ts` (only your file).
8. Commit the migration and the types together, `git pull --rebase`, push.

Rules:
- **Never edit an applied migration.** Fix it with a new one.
- **No `drop`, `truncate` or `alter` on shared or other-sport objects.** Ask Dev A.
- Every table gets RLS. Writes go through `SECURITY DEFINER` RPCs that check `auth.uid()` and call `is_game_organizer` / `can_view_game`. Don't rely on hiding UI controls.
- Revoke `anon` on every function (`revoke all on function ... from public, anon;`) and grant `authenticated` only to client-facing RPCs.
- After each migration, run `get_advisors` (security) and fix new warnings.
- Test with a rolled-back transaction (`begin; ... rollback;`) and `set local role authenticated` plus `request.jwt.claims`, the way the template was tested.

---

## 4. Frontend contract

- Work only inside `apps/web/src/modules/<sport>/`.
- Export a `SportModule` (see `apps/web/src/types/sport-module.ts`) from `modules/<sport>/index.ts`:
  `{ key, label, basePath: '/<sport>', HubPage, GamePage, Icon? }`
- **Don't edit `app/router.tsx`, the app layout or the nav.** Dev A wires the modules in from the enabled rows of `public.sports` (`select * from sports where is_enabled order by sort_order`).
- Use `get_game_context(gameId)` for shared game info, and your own tables and RPCs for sport details.
- Reuse `components/ui/*` and design tokens. Don't fork shared components; if one is missing, ask Dev A.
- Tests go in `src/tests/<sport>-*.test.ts`.

---

## 5. Shared features (Dev A), built on the interface above

### Ratings & match reviews
- `game_player_ratings (id, game_id, sport, rated_player_id, rated_by, rating 1–5, created_at, updated_at, unique (game_id, rated_player_id, rated_by), foreign key (game_id, sport) → games(id, sport))`
- `game_match_reviews (id, game_id, sport, reviewer_id, rating 1–5, feedback, created_at, updated_at, unique (game_id, reviewer_id), same FK)`
- RLS and RPCs:
  - Rate players: `is_game_organizer(game, auth.uid())`, and the rated player must be in `game_confirmed_players(game)`.
  - Edit a player rating: its author or an organizer.
  - Review the match: `is_game_participant(game, auth.uid())`. Edit: own review only.
  - Match average: participants and organizers.
  - Player history: the player themself and organizers of their squads.
- Ratings are optional and constructive. No public ranking or leaderboard.

### Money splitting (after the badminton MVP)
- `game_expenses (id, game_id, sport, organizer_id, amount numeric(12,2), description, ...)` and `game_expense_shares (expense_id, player_id, share_amount numeric(12,2), paid_amount numeric(12,2), status paid|unpaid|partial)`.
- Same `(game_id, sport)` foreign key. Organizer only through `is_game_organizer`. Players see their own share.
- Split equally among `game_confirmed_players(game)`. Compute in integer paise in the app. Allow manual share edits by the organizer. Show a live collected/outstanding summary and a WhatsApp copy text.
- Cricket and volleyball take part automatically through their registered `confirmed_players` functions. **Dev B and C never touch the expense or rating tables.**

---

## 6. Next steps

**Dev A (football + badminton + integration)**
1. Badminton MVP from the template (singles/doubles, court, capacity 2/4), plus `modules/badminton`.
2. Sport navigation: sport switcher driven by `public.sports`, routes for each `SportModule`.
3. Ratings & match reviews (shared).
4. Money splitting (shared), after the badminton MVP.

**Dev B (cricket)**
1. `cricket_*` migration from the template (format/overs, team size up to 11 a side, optional team split).
2. Register `cricket_confirmed_players` (and `cricket_is_organizer` if captains should count as organizers).
3. `modules/cricket` exporting `cricketModule: SportModule`, plus types in `types/sports/cricket.db.ts`.

**Dev C (volleyball)**
1. `volleyball_*` migration from the template (sets to win, 6-a-side with rotation or casual, capacity).
2. Register `volleyball_confirmed_players`.
3. `modules/volleyball` exporting `volleyballModule: SportModule`, plus types in `types/sports/volleyball.db.ts`.

**Everyone:** small commits on `main`, pull before you push, one ledger row per migration, and post in the team chat before any shared-database operation.

---

## 7. Current state (2026-11-17)

- Supabase project `ctbpkaqyddceacjlujpi` (ap-southeast-2), 15 migrations applied; repo files match the remote history.
- `public.sports` is seeded: football enabled; badminton, cricket and volleyball registered but disabled until their modules call `update ... set is_enabled = true`.
- Football is linked to `games` (create, update and delete stay in sync) and registered with `football_confirmed_players` (RSVP "playing" or placed in a lineup) and `football_is_organizer`.
- Change ledger: `ops.change_ledger` (private schema, not exposed through the API), backfilled for every migration so far.
