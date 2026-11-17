/* eslint-disable @typescript-eslint/no-explicit-any */
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { useFormationStore } from '../modules/teams/store/use-formation-store';
import { saveFormationSchema, GOALKEEPER_DUPLICATE_MESSAGE } from '../modules/teams/schema';
import { teamApi } from '../modules/teams/api';
import { formationApi } from '../modules/formations/api';
import { normalizeError, AppError } from '../lib/errors';
import type { Team } from '../modules/teams/types';

describe('Goalkeeper Enforcement (Single GK Per Team)', () => {
  const teamAId = '11111111-1111-1111-1111-111111111111';
  const teamBId = '22222222-2222-2222-2222-222222222222';
  const matchId = '33333333-3333-3333-3333-333333333333';
  const player1Id = 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa';
  const player2Id = 'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb';
  const player3Id = 'cccccccc-cccc-cccc-cccc-cccccccccccc';

  const mockTeamA: Team = {
    id: teamAId,
    matchId,
    name: 'Team A (Green)',
    side: 'A',
    color: '#B7F34B',
    formation: '2-3-1',
    revision: 1,
    players: [],
  };

  const mockTeamB: Team = {
    id: teamBId,
    matchId,
    name: 'Team B (White)',
    side: 'B',
    color: '#F5F7F4',
    formation: '2-3-1',
    revision: 1,
    players: [],
  };

  beforeEach(() => {
    // Reset Zustand store state before each test
    const store = useFormationStore.getState();
    store.resetDraft();
    store.clearValidationError();
    vi.restoreAllMocks();
  });

  // -------------------------------------------------------------------------
  // 1. FRONTEND STORE VALIDATION
  // -------------------------------------------------------------------------
  describe('Frontend Store Validation (useFormationStore)', () => {
    it('Scenario 1: Assign first goalkeeper to a team -> Allowed', () => {
      const store = useFormationStore.getState();
      store.setSelectedTeamId(teamAId, mockTeamA);

      // Add two players on the team
      store.addPlayerToBench({
        userId: player1Id,
        displayName: 'Player One',
      } as any);
      store.addPlayerToBench({
        userId: player2Id,
        displayName: 'Player Two',
      } as any);

      // Assign player 1 as goalkeeper
      const success = useFormationStore.getState().updatePlayerPosition(player1Id, 'GK');
      expect(success).toBe(true);

      const state = useFormationStore.getState();
      const p1 = state.draftPlayers.find((p) => p.userId === player1Id);
      expect(p1?.positionLabel).toBe('GK');
      expect(state.validationError).toBeNull();
    });

    it('Scenario 2: Assign second goalkeeper to same team -> Rejected', () => {
      const store = useFormationStore.getState();
      store.setSelectedTeamId(teamAId, mockTeamA);

      store.addPlayerToBench({ userId: player1Id, displayName: 'Player One' } as any);
      store.addPlayerToBench({ userId: player2Id, displayName: 'Player Two' } as any);

      // First GK assigned
      store.updatePlayerPosition(player1Id, 'GK');

      // Attempt to assign second GK to player 2 on the same team
      const success = useFormationStore.getState().updatePlayerPosition(player2Id, 'GK');
      expect(success).toBe(false);

      const state = useFormationStore.getState();
      const p2 = state.draftPlayers.find((p) => p.userId === player2Id);
      expect(p2?.positionLabel).not.toBe('GK');
      expect(state.validationError).toBe(GOALKEEPER_DUPLICATE_MESSAGE);
    });

    it('Scenario 3: Assign goalkeeper to another team -> Allowed', () => {
      const store = useFormationStore.getState();

      // Team A has a GK
      store.setSelectedTeamId(teamAId, mockTeamA);
      store.addPlayerToBench({ userId: player1Id, displayName: 'Team A Player' } as any);
      const resA = store.updatePlayerPosition(player1Id, 'GK');
      expect(resA).toBe(true);

      // Switch to Team B
      store.setSelectedTeamId(teamBId, mockTeamB);
      store.addPlayerToBench({ userId: player2Id, displayName: 'Team B Player' } as any);

      // Assign GK on Team B
      const resB = useFormationStore.getState().updatePlayerPosition(player2Id, 'GK');
      expect(resB).toBe(true);

      const stateB = useFormationStore.getState();
      const pB = stateB.draftPlayers.find((p) => p.userId === player2Id);
      expect(pB?.positionLabel).toBe('GK');
      expect(stateB.validationError).toBeNull();
    });

    it('Scenario 4: Change existing goalkeeper to defender -> Allowed', () => {
      const store = useFormationStore.getState();
      store.setSelectedTeamId(teamAId, mockTeamA);
      store.addPlayerToBench({ userId: player1Id, displayName: 'Player One' } as any);

      store.updatePlayerPosition(player1Id, 'GK');
      expect(useFormationStore.getState().draftPlayers[0].positionLabel).toBe('GK');

      // Change GK to DEF
      const success = useFormationStore.getState().updatePlayerPosition(player1Id, 'DEF');
      expect(success).toBe(true);

      const state = useFormationStore.getState();
      expect(state.draftPlayers[0].positionLabel).toBe('DEF');
      expect(state.validationError).toBeNull();
    });

    it('Scenario 5: Assign another player as goalkeeper after replacement -> Allowed', () => {
      const store = useFormationStore.getState();
      store.setSelectedTeamId(teamAId, mockTeamA);
      store.addPlayerToBench({ userId: player1Id, displayName: 'Player One' } as any);
      store.addPlayerToBench({ userId: player2Id, displayName: 'Player Two' } as any);

      // Player 1 is initially GK
      store.updatePlayerPosition(player1Id, 'GK');

      // Step 1: Change Player 1 from GK to DEF
      store.updatePlayerPosition(player1Id, 'DEF');

      // Step 2: Now Player 2 can become GK
      const success = useFormationStore.getState().updatePlayerPosition(player2Id, 'GK');
      expect(success).toBe(true);

      const state = useFormationStore.getState();
      const p1 = state.draftPlayers.find((p) => p.userId === player1Id);
      const p2 = state.draftPlayers.find((p) => p.userId === player2Id);
      expect(p1?.positionLabel).toBe('DEF');
      expect(p2?.positionLabel).toBe('GK');
      expect(state.validationError).toBeNull();
    });

    it('Scenario 6: Update another player position to goalkeeper when one exists -> Rejected', () => {
      const store = useFormationStore.getState();
      store.setSelectedTeamId(teamAId, mockTeamA);
      store.addPlayerToBench({ userId: player1Id, displayName: 'Player One' } as any);
      store.addPlayerToBench({ userId: player2Id, displayName: 'Player Two' } as any);

      store.updatePlayerPosition(player1Id, 'GK');
      store.updatePlayerPosition(player2Id, 'MID');

      // Player 2 attempts to change from MID to GK
      const success = useFormationStore.getState().updatePlayerPosition(player2Id, 'GK');
      expect(success).toBe(false);
      expect(useFormationStore.getState().validationError).toBe(GOALKEEPER_DUPLICATE_MESSAGE);
    });

    it('Scenario 7: Dragging a second player into goalkeeper area (Y >= 84) -> Clamps & Rejects GK assignment', () => {
      const store = useFormationStore.getState();
      store.setSelectedTeamId(teamAId, mockTeamA);

      // Player 1 deployed to goal (GK)
      store.deployPlayerToPitch({
        userId: player1Id,
        displayName: 'Existing GK',
        positionLabel: 'GK',
      } as any);

      // Player 2 deployed to outfield
      store.deployPlayerToPitch({
        userId: player2Id,
        displayName: 'Outfielder',
        positionLabel: 'MID',
      } as any);

      // Drag Player 2 into the goal area (y = 90)
      store.movePlayerCoordinate(player2Id, { x: 50, y: 90 });

      const state = useFormationStore.getState();
      const p2 = state.draftPlayers.find((p) => p.userId === player2Id);

      // Player 2 must NOT become GK
      expect(p2?.positionLabel).not.toBe('GK');
      expect(p2?.positionLabel).toBe('DEF');
      expect(p2?.coordinate?.y).toBeLessThan(84);
      expect(state.validationError).toBe(GOALKEEPER_DUPLICATE_MESSAGE);
    });

    it('Scenario 8: Remove existing goalkeeper -> Allowed, frees GK role', () => {
      const store = useFormationStore.getState();
      store.setSelectedTeamId(teamAId, mockTeamA);

      store.deployPlayerToPitch({
        userId: player1Id,
        displayName: 'Player One',
        positionLabel: 'GK',
      } as any);
      store.addPlayerToBench({
        userId: player2Id,
        displayName: 'Player Two',
      } as any);

      // Toggle GK to bench (substitute)
      store.toggleSubstitute(player1Id);

      // Player 1 is now on bench with positionLabel SUB
      const state = useFormationStore.getState();
      const p1 = state.draftPlayers.find((p) => p.userId === player1Id);
      expect(p1?.isSubstitute).toBe(true);
      expect(p1?.positionLabel).toBe('SUB');

      // Now Player 2 can be assigned as GK
      const success = useFormationStore.getState().updatePlayerPosition(player2Id, 'GK');
      expect(success).toBe(true);
      expect(useFormationStore.getState().draftPlayers.find((p) => p.userId === player2Id)?.positionLabel).toBe('GK');
    });
  });

  // -------------------------------------------------------------------------
  // 2. BACKEND & SCHEMA VALIDATION
  // -------------------------------------------------------------------------
  describe('Backend Schema & Business Logic Validation', () => {
    it('Zod Schema: Validates lineup with single goalkeeper', () => {
      const validPayload = {
        teamId: teamAId,
        formation: '2-3-1',
        expectedRevision: 1,
        positions: [
          { userId: player1Id, positionLabel: 'GK', isSubstitute: false, pitchX: 0.5, pitchY: 0.9 },
          { userId: player2Id, positionLabel: 'DEF', isSubstitute: false, pitchX: 0.3, pitchY: 0.7 },
          { userId: player3Id, positionLabel: 'MID', isSubstitute: false, pitchX: 0.5, pitchY: 0.5 },
        ],
      };

      const result = saveFormationSchema.safeParse(validPayload);
      expect(result.success).toBe(true);
    });

    it('Zod Schema: Rejects lineup with duplicate goalkeepers', () => {
      const duplicateGkPayload = {
        teamId: teamAId,
        formation: '2-3-1',
        expectedRevision: 1,
        positions: [
          { userId: player1Id, positionLabel: 'GK', isSubstitute: false, pitchX: 0.5, pitchY: 0.9 },
          { userId: player2Id, positionLabel: 'GK', isSubstitute: false, pitchX: 0.3, pitchY: 0.7 }, // Duplicate!
        ],
      };

      const result = saveFormationSchema.safeParse(duplicateGkPayload);
      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.errors[0].message).toBe(GOALKEEPER_DUPLICATE_MESSAGE);
      }
    });

    it('formationApi.saveFormation: Rejects multiple goalkeepers with HTTP 409 Conflict', async () => {
      await expect(
        formationApi.saveFormation({
          teamId: teamAId,
          formation: '2-3-1',
          expectedRevision: 1,
          positions: [
            { userId: player1Id, positionLabel: 'GK', isSubstitute: false, pitchX: 0.5, pitchY: 0.9 },
            { userId: player2Id, positionLabel: 'GK', isSubstitute: false, pitchX: 0.5, pitchY: 0.8 },
          ],
        })
      ).rejects.toThrow(GOALKEEPER_DUPLICATE_MESSAGE);
    });

    it('teamApi.saveFormation: Rejects multiple goalkeepers with HTTP 409 Conflict', async () => {
      try {
        await teamApi.saveFormation({
          teamId: teamAId,
          formation: '2-3-1',
          expectedRevision: 1,
          positions: [
            { userId: player1Id, positionLabel: 'GK', isSubstitute: false, pitchX: 50, pitchY: 90 },
            { userId: player2Id, positionLabel: 'GK', isSubstitute: false, pitchX: 50, pitchY: 70 },
          ],
        });
        expect.unreachable('Should have thrown 409 error');
      } catch (err) {
        expect(err).toBeInstanceOf(AppError);
        const appErr = err as AppError;
        expect(appErr.statusCode).toBe(409);
        expect(appErr.message).toBe(GOALKEEPER_DUPLICATE_MESSAGE);
      }
    });
  });

  // -------------------------------------------------------------------------
  // 3. DATABASE CONSTRAINTS & ERROR NORMALIZATION
  // -------------------------------------------------------------------------
  describe('Database-Level Protection & Error Mapping', () => {
    it('normalizeError: Maps PostgreSQL 23505 unique_goalkeeper_per_team error to 409 Conflict', () => {
      const postgresError = {
        code: '23505',
        message: 'duplicate key value violates unique constraint "unique_goalkeeper_per_team"',
        details: 'Key (team_id)=(11111111-1111-1111-1111-111111111111) already exists.',
      };

      const normalized = normalizeError(postgresError);
      expect(normalized.statusCode).toBe(409);
      expect(normalized.code).toBe('CONFLICT');
      expect(normalized.message).toBe(GOALKEEPER_DUPLICATE_MESSAGE);
    });

    it('normalizeError: Maps custom goalkeeper trigger exception to 409 Conflict', () => {
      const triggerError = {
        code: '23505',
        message: 'This team already has a goalkeeper. Only one goalkeeper is allowed per team.',
        details: null,
      };

      const normalized = normalizeError(triggerError);
      expect(normalized.statusCode).toBe(409);
      expect(normalized.code).toBe('CONFLICT');
      expect(normalized.message).toBe(GOALKEEPER_DUPLICATE_MESSAGE);
    });
  });
});

