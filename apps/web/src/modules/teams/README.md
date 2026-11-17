# Teams & eFootball Formation Editor Module

**Developer Ownership**: Developer B (`feature/b-formations`)

## Responsibilities
- Match team management (`Team A`, `Team B`, or `Single Squad`)
- Interactive eFootball-grade tactical pitch with 60fps drag-and-drop and proximity player swapping
- Substitute bench management (one-click pitch promotion & benching)
- Attendance assignment panel (confirmed match players to teams)
- Tactical formation presets (`5v5`, `6v6`, `7v7`) with automated smart position recalculation
- Optimistic UI updates with rollback and revision-based conflict detection
- Supabase Realtime synchronization with drag-protection locks

## Public Contracts & RPCs
- **Supabase RPCs**:
  - `assign_team_player(p_team, p_user, p_position)`
  - `remove_team_player(p_match, p_user)`
  - `save_team_formation(p_team, p_formation, p_expected_revision, p_positions)`
- **Service Contract**: Implements `TeamService` in [contracts.ts](file:///home/shammasktl/Desktop/template/apps/web/src/types/contracts.ts).

## Module Architecture

```
apps/web/src/modules/teams/
├── api.ts                         # Supabase RPC & query callers (0-100% UI <-> 0.0-1.0 DB coordinate mapping)
├── schema.ts                      # Zod validation schemas for pitch coordinates & RPC payloads
├── types.ts                       # Domain types (FormationPlayer, PitchCoordinate, FormationPreset, LineupData)
├── presets.ts                     # Tactical formation presets (5v5, 6v6, 7v7) & tactical zone helpers
├── store/
│   └── use-formation-store.ts    # Ephemeral Zustand draft store (active drag, proximity swap, dirty/revision tracking)
├── hooks/
│   ├── use-team-lineup.ts        # TanStack Query queries & mutations with optimistic updates & error rollbacks
│   └── use-lineup-realtime.ts    # Realtime subscription ignoring updates while dragging/dirty to protect edits
└── components/
    ├── player-token.tsx           # Tactile player disc with role pill, glow ring, drag scaling, & swap ring
    ├── tactical-pitch.tsx         # SVG pitch markings, touch/pointer drag engine, 8.5% proximity swap detection
    ├── formation-toolbar.tsx      # Team tab switcher, format pills (5v5/6v6/7v7), preset select, dirty indicator, save/reset
    ├── substitutes-bench.tsx      # Interactive bench with swap target, promote to pitch, and unassign actions
    ├── team-assignment-panel.tsx  # Unassigned confirmed attendance pool with search & quick 1-click assignment
    └── lineup-editor-page.tsx     # Full cohesive tactical formation route view
```

## Coordinate System
- **Database (`team_players`)**: `pitch_x` and `pitch_y` are `NUMERIC(4,3)` in range `0.000` to `1.000`.
- **UI & Zustand**: Percentage values `[0, 100]` with pitch bounds clamped to `[6, 94]` to prevent tokens clipping outer borders.
- **Conversion**: Handled automatically in `api.ts` on read and write.
