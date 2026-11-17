# Matches Module — Developer C

**Developer Ownership**: Developer C (`feature/c-matches`)

## Responsibilities
- Match fixture creation (`create_match` RPC)
- Support for Single Team Practice (`single`, 1 team) and Friendly Derby (`friendly`, 2 teams)
- Configurable players per side (3–11: 3v3 through 11v11)
- Kerala turf presets (Decathlon Kalamassery, United Turf Kakkanad, Kickoff Calicut, etc.) + custom venues
- Kickoff time in `Asia/Kolkata` (IST) with countdown calculation and UTC storage
- Match details, editing fixture details (`update_match` RPC), and cancellation guard
- Realtime sync across multi-client browser sessions using Supabase Postgres Changes
- Integration with Developer A (squad memberships, roles) and Developer B (tactical pitch board lineup)

## Authenticated RPCs Owned
- `create_match(p_squad: uuid, p_title: text, p_mode: text, p_turf_name: text, p_starts_at: timestamptz, p_players_per_team: integer) -> uuid`
- `update_match(p_match: uuid, p_title: text, p_turf_name: text, p_starts_at: timestamptz, p_status: text) -> void`

## Query Keys
- `queryKeys.matches.all`: `['matches']`
- `queryKeys.matches.bySquad(squadId)`: `['matches', 'squad', squadId]`
- `queryKeys.matches.detail(matchId)`: `['matches', matchId]`
- `queryKeys.matches.attendance(matchId)`: `['matches', matchId, 'attendance']`

## Route Contracts
- `/squads/$squadId/matches/new` — `MatchNewPage`
- `/matches/$matchId` — `MatchDetailPage`
