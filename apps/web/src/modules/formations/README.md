# Formations Module

**Developer Ownership**: Developer B (`feature/b-formations`)

## Responsibilities
- Pitch board rendering and responsive touch canvas
- Formation presets (5v5, 6v6, 7v7, custom)
- Normalized coordinate translation (`x`, `y` in `[0, 1]`)
- Drag-and-drop pointer interactions
- Player swaps and substitute bench
- Formation persistence (`save_team_formation` RPC with `p_expected_revision`)
- Real-time lineup sync (`useMatchRealtime`)

## Public Contract
- Service: `FormationService` in `src/types/contracts.ts`
- Routes:
  - `/matches/$matchId/lineup`
