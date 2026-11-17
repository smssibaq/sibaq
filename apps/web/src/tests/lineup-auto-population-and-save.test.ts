import { describe, it, expect, beforeEach, vi } from 'vitest';
import {
  autoPopulateSquadLineup,
  FORMATION_PRESETS,
  findPresetForFormat,
  formatFromPlayersPerTeam,
} from '../modules/teams/presets';
import { useFormationStore } from '../modules/teams/store/use-formation-store';
import { teamApi } from '../modules/teams/api';
import { supabase } from '../infrastructure/supabase/client';
import type { MatchAttendance, Team, FormationPreset } from '../modules/teams/types';

// Mock Supabase client
vi.mock('../infrastructure/supabase/client', () => {
  return {
    supabase: {
      auth: {
        getUser: vi.fn(),
      },
      from: vi.fn(),
      rpc: vi.fn(),
    },
  };
});

describe('Lineup Auto-Population by Preferred Position & Confirmation Order', () => {
  const teamId = '11111111-1111-1111-1111-111111111111';

  const createMockMember = (
    id: string,
    name: string,
    pos: 'GK' | 'DEF' | 'MID' | 'ATT' | null,
    status: 'playing' | 'maybe' | 'unconfirmed' = 'playing',
    timestamp = '2026-11-16T10:00:00Z'
  ): MatchAttendance => ({
    matchId: 'match-1',
    userId: id,
    status,
    updatedAt: timestamp,
    profile: {
      id,
      displayName: name,
      avatarUrl: `https://example.com/${id}.png`,
      preferredPosition: pos,
      createdAt: '2026-11-15T00:00:00Z',
      updatedAt: '2026-11-15T00:00:00Z',
    },
  });

  it('correctly maps 7v7 preset with position preferences and puts excess players on bench', () => {
    const preset7v7 = FORMATION_PRESETS.find((p) => p.format === '7v7') as FormationPreset;
    expect(preset7v7).toBeDefined();

    const members: MatchAttendance[] = [
      createMockMember('p1', 'Player Striker 1', 'ATT', 'playing', '2026-11-16T09:00:00Z'),
      createMockMember('p2', 'Player Keeper', 'GK', 'playing', '2026-11-16T09:05:00Z'),
      createMockMember('p3', 'Player Defender 1', 'DEF', 'playing', '2026-11-16T09:10:00Z'),
      createMockMember('p4', 'Player Midfielder 1', 'MID', 'playing', '2026-11-16T09:15:00Z'),
      createMockMember('p5', 'Player Defender 2', 'DEF', 'playing', '2026-11-16T09:20:00Z'),
      createMockMember('p6', 'Player Midfielder 2', 'MID', 'playing', '2026-11-16T09:25:00Z'),
      createMockMember('p7', 'Player Midfielder 3', 'MID', 'playing', '2026-11-16T09:30:00Z'),
      createMockMember('p8', 'Player Sub 1', 'ATT', 'playing', '2026-11-16T09:35:00Z'),
      createMockMember('p9', 'Player Sub 2', 'DEF', 'playing', '2026-11-16T09:40:00Z'),
    ];

    const lineup = autoPopulateSquadLineup(members, preset7v7, teamId);

    const starters = lineup.filter((p) => !p.isSubstitute);
    const substitutes = lineup.filter((p) => p.isSubstitute);

    // 7 starters on pitch, 2 on bench
    expect(starters.length).toBe(7);
    expect(substitutes.length).toBe(2);

    // Goalkeeper correctly assigned to GK slot
    const gk = starters.find((p) => p.userId === 'p2');
    const gkPos = preset7v7.positions.find((pos) => pos.label === 'GK');
    expect(gk).toBeDefined();
    expect(gk?.positionLabel).toBe('GK');
    expect(gk?.coordinate).toEqual({ x: gkPos?.x, y: gkPos?.y });

    // Defenders assigned to defender slots
    const defs = starters.filter((p) => p.userId === 'p3' || p.userId === 'p5');
    expect(defs.length).toBe(2);

    // Substitutes have null coordinates and SUB label
    substitutes.forEach((sub) => {
      expect(sub.coordinate).toBeNull();
      expect(sub.positionLabel).toBe('SUB');
      expect(sub.isSubstitute).toBe(true);
    });

    expect(substitutes.map((s) => s.userId)).toEqual(['p8', 'p9']);
  });

  it('enforces maximum 1 goalkeeper even if multiple players prefer GK', () => {
    const preset5v5 = FORMATION_PRESETS.find((p) => p.format === '5v5') as FormationPreset;

    const members: MatchAttendance[] = [
      createMockMember('gk1', 'First GK', 'GK', 'playing', '2026-11-16T09:00:00Z'),
      createMockMember('gk2', 'Second GK', 'GK', 'playing', '2026-11-16T09:05:00Z'),
      createMockMember('f3', 'Defender', 'DEF', 'playing', '2026-11-16T09:10:00Z'),
      createMockMember('f4', 'Midfielder', 'MID', 'playing', '2026-11-16T09:15:00Z'),
      createMockMember('f5', 'Striker', 'ATT', 'playing', '2026-11-16T09:20:00Z'),
      createMockMember('f6', 'Extra Defender', 'DEF', 'playing', '2026-11-16T09:25:00Z'),
    ];

    const lineup = autoPopulateSquadLineup(members, preset5v5, teamId);

    const gkStarters = lineup.filter(
      (p) => !p.isSubstitute && p.positionLabel?.toUpperCase() === 'GK'
    );
    expect(gkStarters.length).toBe(1);
    expect(gkStarters[0].userId).toBe('gk1'); // Earlier confirmed GK gets the starting slot

    // The second GK goes to remaining unfilled outfield slot or bench, never a second GK on pitch
    const gk2 = lineup.find((p) => p.userId === 'gk2');
    expect(gk2).toBeDefined();
    if (!gk2?.isSubstitute) {
      expect(gk2?.positionLabel).not.toBe('GK');
    } else {
      expect(gk2?.positionLabel).toBe('SUB');
    }
  });

  it('prioritizes playing RSVPs over maybe and unconfirmed RSVPs', () => {
    const preset5v5 = FORMATION_PRESETS.find((p) => p.format === '5v5') as FormationPreset;

    const members: MatchAttendance[] = [
      createMockMember('m1', 'Maybe Member', 'MID', 'maybe', '2026-11-16T08:00:00Z'),
      createMockMember('p1', 'Playing 1', 'DEF', 'playing', '2026-11-16T09:00:00Z'),
      createMockMember('p2', 'Playing 2', 'MID', 'playing', '2026-11-16T09:05:00Z'),
      createMockMember('p3', 'Playing 3', 'ATT', 'playing', '2026-11-16T09:10:00Z'),
      createMockMember('p4', 'Playing 4', 'GK', 'playing', '2026-11-16T09:15:00Z'),
      createMockMember('p5', 'Playing 5', 'DEF', 'playing', '2026-11-16T09:20:00Z'),
    ];

    const lineup = autoPopulateSquadLineup(members, preset5v5, teamId);

    const starters = lineup.filter((p) => !p.isSubstitute);
    const starterIds = new Set(starters.map((p) => p.userId));

    // All 5 playing members should be starters
    expect(starterIds.has('p1')).toBe(true);
    expect(starterIds.has('p2')).toBe(true);
    expect(starterIds.has('p3')).toBe(true);
    expect(starterIds.has('p4')).toBe(true);
    expect(starterIds.has('p5')).toBe(true);

    // The 'maybe' player was relegated to the bench despite earlier timestamp
    const maybePlayer = lineup.find((p) => p.userId === 'm1');
    expect(maybePlayer?.isSubstitute).toBe(true);
  });
});

describe('Store Hydration & Fixture Format Locking', () => {
  beforeEach(() => {
    useFormationStore.setState({
      selectedTeamId: null,
      draftPlayers: [],
      serverPlayers: [],
      teamDrafts: {},
      isDirty: false,
    });
  });

  it('locks format strictly to match playersPerTeam (e.g. 5v5 fixture)', () => {
    const emptyTeam: Team = {
      id: 'team-5',
      matchId: 'match-5',
      name: 'Team 5s',
      side: 'home',
      color: '#B7F34B',
      formation: '1-2-1 Diamond (5s)',
      revision: 1,
      players: [],
    };

    useFormationStore.getState().hydrateFromServer(emptyTeam, 5, []);

    expect(useFormationStore.getState().selectedFormat).toBe('5v5');

    // Attempting to change to 7v7 is blocked because match level is 5v5
    useFormationStore.getState().setSelectedFormat('7v7');
    expect(useFormationStore.getState().selectedFormat).toBe('5v5');
  });

  it('normalizes legacy 2-3-1 formation string to 1-2-1 Diamond (5s) when fixture is 5v5', () => {
    const legacyTeam: Team = {
      id: 'team-legacy',
      matchId: 'match-5',
      name: 'Legacy Team',
      side: 'home',
      color: '#B7F34B',
      formation: '2-3-1', // Default from DB create_match
      revision: 1,
      players: [],
    };

    useFormationStore.getState().hydrateFromServer(legacyTeam, 5, []);
    expect(useFormationStore.getState().selectedFormat).toBe('5v5');
    expect(useFormationStore.getState().formationName).toBe('1-2-1 Diamond (5s)');
  });

  it('correctly maps playersPerTeam to formats and presets', () => {
    expect(formatFromPlayersPerTeam(5)).toBe('5v5');
    expect(formatFromPlayersPerTeam(4)).toBe('5v5');
    expect(formatFromPlayersPerTeam(6)).toBe('6v6');
    expect(formatFromPlayersPerTeam(7)).toBe('7v7');
    expect(formatFromPlayersPerTeam(11)).toBe('7v7');

    // Mismatched formation string safely resolves to format default
    expect(findPresetForFormat('5v5', '2-3-1').name).toBe('1-2-1 Diamond (5s)');
    expect(findPresetForFormat('5v5', '1-2-1').name).toBe('1-2-1 Diamond (5s)');
    expect(findPresetForFormat('5v5', '2-2 Box (5s)').name).toBe('2-2 Box (5s)');
    expect(findPresetForFormat('7v7', '2-3-1').name).toBe('2-3-1 Balanced (7s)');
  });

  it('caps pitch starters to 5 when hydrating a 5v5 fixture even if team had 7 starters saved', () => {
    const overloadedTeam: Team = {
      id: 'team-overload',
      matchId: 'match-5',
      name: 'Overloaded Team',
      side: 'home',
      color: '#B7F34B',
      formation: '2-3-1',
      revision: 1,
      players: [
        { userId: 'p1', teamId: 't1', positionLabel: 'GK', isSubstitute: false, coordinate: { x: 50, y: 92 }, displayName: 'GK', avatarUrl: null },
        { userId: 'p2', teamId: 't1', positionLabel: 'LB', isSubstitute: false, coordinate: { x: 26, y: 72 }, displayName: 'P2', avatarUrl: null },
        { userId: 'p3', teamId: 't1', positionLabel: 'RB', isSubstitute: false, coordinate: { x: 74, y: 72 }, displayName: 'P3', avatarUrl: null },
        { userId: 'p4', teamId: 't1', positionLabel: 'LM', isSubstitute: false, coordinate: { x: 20, y: 46 }, displayName: 'P4', avatarUrl: null },
        { userId: 'p5', teamId: 't1', positionLabel: 'CM', isSubstitute: false, coordinate: { x: 50, y: 48 }, displayName: 'P5', avatarUrl: null },
        { userId: 'p6', teamId: 't1', positionLabel: 'RM', isSubstitute: false, coordinate: { x: 80, y: 46 }, displayName: 'P6', avatarUrl: null },
        { userId: 'p7', teamId: 't1', positionLabel: 'ST', isSubstitute: false, coordinate: { x: 50, y: 15 }, displayName: 'P7', avatarUrl: null },
      ],
    };

    useFormationStore.getState().hydrateFromServer(overloadedTeam, 5, []);
    const starters = useFormationStore.getState().draftPlayers.filter((p) => !p.isSubstitute);
    const subs = useFormationStore.getState().draftPlayers.filter((p) => p.isSubstitute);

    expect(starters.length).toBe(5);
    expect(subs.length).toBe(2);
    expect(starters.some((p) => p.userId === 'p1' && p.positionLabel === 'GK')).toBe(true);
  });

  it('preserves existing saved team players and does not overwrite with auto-population', () => {
    const savedTeam: Team = {
      id: 'team-saved',
      matchId: 'match-1',
      name: 'Saved Team',
      side: 'home',
      color: '#B7F34B',
      formation: '2-3-1 Balanced (7s)',
      revision: 3,
      players: [
        {
          userId: 'saved-gk',
          teamId: 'team-saved',
          positionLabel: 'GK',
          isSubstitute: false,
          coordinate: { x: 50, y: 92 },
          displayName: 'Saved Goalkeeper',
          avatarUrl: null,
        },
        {
          userId: 'saved-sub',
          teamId: 'team-saved',
          positionLabel: 'SUB',
          isSubstitute: true,
          coordinate: null,
          displayName: 'Saved Bench Player',
          avatarUrl: null,
        },
      ],
    };

    const squadPool: MatchAttendance[] = [
      {
        matchId: 'match-1',
        userId: 'new-player-1',
        status: 'playing',
        updatedAt: '2026-11-16T10:00:00Z',
        profile: {
          id: 'new-player-1',
          displayName: 'New Player',
          avatarUrl: null,
          preferredPosition: 'MID',
          createdAt: '',
          updatedAt: '',
        },
      },
    ];

    useFormationStore.getState().hydrateFromServer(savedTeam, 7, squadPool);

    const draft = useFormationStore.getState().draftPlayers;
    expect(draft.length).toBe(2);
    expect(draft[0].userId).toBe('saved-gk');
    expect(draft[1].userId).toBe('saved-sub');
    expect(useFormationStore.getState().isDirty).toBe(false);
  });
});

describe('Lineup Save Server-Side & Client-Side Authorization Checks', () => {
  const mockTeamId = '22222222-2222-2222-2222-222222222222';
  const mockMatchId = '33333333-3333-3333-3333-333333333333';
  const mockSquadId = '44444444-4444-4444-4444-444444444444';
  const ownerUserId = 'user-owner';
  const adminUserId = 'user-admin';
  const regularPlayerUserId = 'user-player';

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('rejects unauthorized ordinary players with HTTP 403 Forbidden', async () => {
    // 1. Mock user is regular player
    (supabase.auth.getUser as unknown as ReturnType<typeof vi.fn>).mockResolvedValue({
      data: { user: { id: regularPlayerUserId } },
      error: null,
    });

    // 2. Mock DB queries
    (supabase.from as unknown as ReturnType<typeof vi.fn>).mockImplementation((table: string) => {
      if (table === 'teams') {
        return {
          select: () => ({
            eq: () => ({
              single: () => Promise.resolve({ data: { id: mockTeamId, match_id: mockMatchId, revision: 1 }, error: null }),
            }),
          }),
        };
      }
      if (table === 'matches') {
        return {
          select: () => ({
            eq: () => ({
              single: () => Promise.resolve({ data: { id: mockMatchId, squad_id: mockSquadId, players_per_team: 7 }, error: null }),
            }),
          }),
        };
      }
      if (table === 'squads') {
        return {
          select: () => ({
            eq: () => ({
              maybeSingle: () => Promise.resolve({ data: { id: mockSquadId, owner_id: ownerUserId }, error: null }),
            }),
          }),
        };
      }
      if (table === 'squad_members') {
        return {
          select: () => ({
            eq: () => ({
              eq: () => ({
                maybeSingle: () => Promise.resolve({ data: { role: 'player', status: 'active' }, error: null }),
              }),
            }),
          }),
        };
      }
      if (table === 'user_roles') {
        return {
          select: () => ({
            eq: () => ({
              eq: () => ({
                maybeSingle: () => Promise.resolve({ data: null, error: null }),
              }),
            }),
          }),
        };
      }
      return { select: () => ({ eq: () => ({ maybeSingle: () => Promise.resolve({ data: null }) }) }) };
    });

    await expect(
      teamApi.saveFormation({
        teamId: mockTeamId,
        formation: '2-3-1 Balanced (7s)',
        expectedRevision: 1,
        positions: [
          {
            userId: regularPlayerUserId,
            positionLabel: 'MID',
            isSubstitute: false,
            pitchX: 50,
            pitchY: 50,
          },
        ],
      })
    ).rejects.toThrowError(/Forbidden: Only squad owners and administrators are authorized/i);
  });

  it('allows active squad owner to save formation and passes normalized parameters', async () => {
    (supabase.auth.getUser as unknown as ReturnType<typeof vi.fn>).mockResolvedValue({
      data: { user: { id: ownerUserId } },
      error: null,
    });

    (supabase.from as unknown as ReturnType<typeof vi.fn>).mockImplementation((table: string) => {
      if (table === 'teams') {
        return {
          select: () => ({
            eq: () => ({
              single: () => Promise.resolve({ data: { id: mockTeamId, match_id: mockMatchId, revision: 2 }, error: null }),
            }),
          }),
        };
      }
      if (table === 'matches') {
        return {
          select: () => ({
            eq: () => ({
              single: () => Promise.resolve({ data: { id: mockMatchId, squad_id: mockSquadId, players_per_team: 7 }, error: null }),
            }),
          }),
        };
      }
      if (table === 'squads') {
        return {
          select: () => ({
            eq: () => ({
              maybeSingle: () => Promise.resolve({ data: { id: mockSquadId, owner_id: ownerUserId }, error: null }),
            }),
          }),
        };
      }
      if (table === 'squad_members') {
        return {
          select: () => ({
            eq: () => ({
              eq: () => ({
                maybeSingle: () => Promise.resolve({ data: { role: 'owner', status: 'active' }, error: null }),
              }),
            }),
          }),
        };
      }
      if (table === 'user_roles') {
        return {
          select: () => ({
            eq: () => ({
              eq: () => ({
                maybeSingle: () => Promise.resolve({ data: null, error: null }),
              }),
            }),
          }),
        };
      }
      if (table === 'match_attendance') {
        return {
          upsert: () => Promise.resolve({ error: null }),
        };
      }
      return { select: () => ({ eq: () => ({ maybeSingle: () => Promise.resolve({ data: null }) }) }) };
    });

    (supabase.rpc as unknown as ReturnType<typeof vi.fn>).mockResolvedValue({
      data: 3,
      error: null,
    });

    const newRev = await teamApi.saveFormation({
      teamId: mockTeamId,
      formation: '2-3-1 Balanced (7s)',
      expectedRevision: 2,
      positions: [
        {
          userId: ownerUserId,
          positionLabel: 'GK',
          isSubstitute: false,
          pitchX: 50, // Should be normalized to 0.5000
          pitchY: 92, // Should be normalized to 0.9200
        },
        {
          userId: regularPlayerUserId,
          positionLabel: 'SUB',
          isSubstitute: true,
          pitchX: null,
          pitchY: null,
        },
      ],
    });

    expect(newRev).toBe(3);
    expect(supabase.rpc).toHaveBeenCalledWith('save_team_formation', {
      p_team: mockTeamId,
      p_formation: '2-3-1 Balanced (7s)',
      p_expected_revision: 2,
      p_positions: [
        {
          user_id: ownerUserId,
          x: 0.5,
          y: 0.92,
          position: 'GK',
          position_label: 'GK',
          is_substitute: false,
          pitch_x: 0.5,
          pitch_y: 0.92,
        },
        {
          user_id: regularPlayerUserId,
          x: null,
          y: null,
          position: 'SUB',
          position_label: 'SUB',
          is_substitute: true,
          pitch_x: null,
          pitch_y: null,
        },
      ],
    });
  });

  it('allows active squad admin to save formation', async () => {
    (supabase.auth.getUser as unknown as ReturnType<typeof vi.fn>).mockResolvedValue({
      data: { user: { id: adminUserId } },
      error: null,
    });

    (supabase.from as unknown as ReturnType<typeof vi.fn>).mockImplementation((table: string) => {
      if (table === 'teams') {
        return {
          select: () => ({
            eq: () => ({
              single: () => Promise.resolve({ data: { id: mockTeamId, match_id: mockMatchId, revision: 1 }, error: null }),
            }),
          }),
        };
      }
      if (table === 'matches') {
        return {
          select: () => ({
            eq: () => ({
              single: () => Promise.resolve({ data: { id: mockMatchId, squad_id: mockSquadId, players_per_team: 7 }, error: null }),
            }),
          }),
        };
      }
      if (table === 'squads') {
        return {
          select: () => ({
            eq: () => ({
              maybeSingle: () => Promise.resolve({ data: { id: mockSquadId, owner_id: ownerUserId }, error: null }),
            }),
          }),
        };
      }
      if (table === 'squad_members') {
        return {
          select: () => ({
            eq: () => ({
              eq: () => ({
                maybeSingle: () => Promise.resolve({ data: { role: 'admin', status: 'active' }, error: null }),
              }),
            }),
          }),
        };
      }
      if (table === 'user_roles') {
        return {
          select: () => ({
            eq: () => ({
              eq: () => ({
                maybeSingle: () => Promise.resolve({ data: null, error: null }),
              }),
            }),
          }),
        };
      }
      if (table === 'match_attendance') {
        return {
          upsert: () => Promise.resolve({ error: null }),
        };
      }
      return { select: () => ({ eq: () => ({ maybeSingle: () => Promise.resolve({ data: null }) }) }) };
    });

    (supabase.rpc as unknown as ReturnType<typeof vi.fn>).mockResolvedValue({
      data: 2,
      error: null,
    });

    const newRev = await teamApi.saveFormation({
      teamId: mockTeamId,
      formation: '2-3-1 Balanced (7s)',
      expectedRevision: 1,
      positions: [
        {
          userId: adminUserId,
          positionLabel: 'MID',
          isSubstitute: false,
          pitchX: 0.5,
          pitchY: 0.48,
        },
      ],
    });

    expect(newRev).toBe(2);
  });

  it('maps revision mismatch error (40001) to HTTP 409 Conflict', async () => {
    (supabase.auth.getUser as unknown as ReturnType<typeof vi.fn>).mockResolvedValue({
      data: { user: { id: ownerUserId } },
      error: null,
    });

    (supabase.from as unknown as ReturnType<typeof vi.fn>).mockImplementation((table: string) => {
      if (table === 'teams') {
        return {
          select: () => ({
            eq: () => ({
              single: () => Promise.resolve({ data: { id: mockTeamId, match_id: mockMatchId, revision: 1 }, error: null }),
            }),
          }),
        };
      }
      if (table === 'matches') {
        return {
          select: () => ({
            eq: () => ({
              single: () => Promise.resolve({ data: { id: mockMatchId, squad_id: mockSquadId, players_per_team: 7 }, error: null }),
            }),
          }),
        };
      }
      if (table === 'squads') {
        return {
          select: () => ({
            eq: () => ({
              maybeSingle: () => Promise.resolve({ data: { id: mockSquadId, owner_id: ownerUserId }, error: null }),
            }),
          }),
        };
      }
      if (table === 'squad_members') {
        return {
          select: () => ({
            eq: () => ({
              eq: () => ({
                maybeSingle: () => Promise.resolve({ data: { role: 'owner', status: 'active' }, error: null }),
              }),
            }),
          }),
        };
      }
      if (table === 'user_roles') {
        return {
          select: () => ({
            eq: () => ({
              eq: () => ({
                maybeSingle: () => Promise.resolve({ data: null, error: null }),
              }),
            }),
          }),
        };
      }
      if (table === 'match_attendance') {
        return {
          upsert: () => Promise.resolve({ error: null }),
        };
      }
      return { select: () => ({ eq: () => ({ maybeSingle: () => Promise.resolve({ data: null }) }) }) };
    });

    (supabase.rpc as unknown as ReturnType<typeof vi.fn>).mockResolvedValue({
      data: null,
      error: {
        code: '40001',
        message: 'Conflict: Lineup revision mismatch (expected 1, current 2)',
      },
    });

    await expect(
      teamApi.saveFormation({
        teamId: mockTeamId,
        formation: '2-3-1 Balanced (7s)',
        expectedRevision: 1,
        positions: [
          {
            userId: ownerUserId,
            positionLabel: 'MID',
            isSubstitute: false,
            pitchX: 0.5,
            pitchY: 0.5,
          },
        ],
      })
    ).rejects.toThrowError(/Conflict: Lineup revision mismatch/i);
  });
});
