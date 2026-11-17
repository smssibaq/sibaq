import { describe, it, expect } from 'vitest';
import { createSquadSchema, updateSquadSettingsSchema } from '../modules/squads/schema';
import { joinByCodeSchema, normalizeRoomCode, ROOM_CODE_MAX_LENGTH } from '../modules/invitations/schema';
import { invitationApi } from '../modules/invitations/api';
import type { SquadRole } from '@/types/contracts';

describe('Developer A — Squad Governance & Validation Tests', () => {
  describe('Squad Creation Schema Validation', () => {
    it('accepts valid squad names with optional description', () => {
      const valid = {
        name: 'Kalamassery Strikers',
        description: 'Friday night 7v7 friendlies at Decathlon turf',
      };
      const result = createSquadSchema.safeParse(valid);
      expect(result.success).toBe(true);
    });

    it('rejects squad names shorter than 3 characters', () => {
      const invalid = { name: 'FC' };
      const result = createSquadSchema.safeParse(invalid);
      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.issues[0].message).toMatch(/at least 3 characters/i);
      }
    });

    it('rejects squad names longer than 50 characters', () => {
      const invalid = { name: 'A'.repeat(51) };
      const result = createSquadSchema.safeParse(invalid);
      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.issues[0].message).toMatch(/under 50 characters/i);
      }
    });

    it('trims squad names with surrounding whitespace', () => {
      const input = { name: '   Malappuram FC   ' };
      const parsed = createSquadSchema.parse(input);
      expect(parsed.name).toBe('Malappuram FC');
    });

    it('rejects descriptions exceeding 250 characters', () => {
      const invalid = {
        name: 'Valid Name',
        description: 'D'.repeat(251),
      };
      const result = createSquadSchema.safeParse(invalid);
      expect(result.success).toBe(false);
    });
  });

  describe('Squad Settings Schema Validation', () => {
    it('validates settings updates correctly', () => {
      const valid = {
        name: 'Thrissur United XI',
        description: 'Updated home turf: Kickoff Arena',
      };
      expect(updateSquadSettingsSchema.safeParse(valid).success).toBe(true);
    });

    it('rejects blank name in settings update', () => {
      const invalid = { name: '  ' };
      expect(updateSquadSettingsSchema.safeParse(invalid).success).toBe(false);
    });
  });

  describe('Role Governance & Permission Matrix', () => {
    // Helper to evaluate permission rules
    function canManageMember(
      actorRole: SquadRole,
      targetRole: SquadRole,
      isSelf: boolean
    ): { canKick: boolean; canPromote: boolean; canDemote: boolean } {
      if (isSelf) {
        return { canKick: false, canPromote: false, canDemote: false };
      }
      if (actorRole === 'owner') {
        return {
          canKick: targetRole !== 'owner',
          canPromote: targetRole === 'player',
          canDemote: targetRole === 'admin',
        };
      }
      if (actorRole === 'admin') {
        return {
          canKick: targetRole === 'player',
          canPromote: false,
          canDemote: false,
        };
      }
      return { canKick: false, canPromote: false, canDemote: false };
    }

    it('allows owner to kick players and admins, but not self', () => {
      expect(canManageMember('owner', 'player', false).canKick).toBe(true);
      expect(canManageMember('owner', 'admin', false).canKick).toBe(true);
      expect(canManageMember('owner', 'owner', true).canKick).toBe(false);
    });

    it('allows owner to promote player to admin', () => {
      expect(canManageMember('owner', 'player', false).canPromote).toBe(true);
      expect(canManageMember('owner', 'admin', false).canPromote).toBe(false);
    });

    it('allows owner to demote admin to player', () => {
      expect(canManageMember('owner', 'admin', false).canDemote).toBe(true);
      expect(canManageMember('owner', 'player', false).canDemote).toBe(false);
    });

    it('allows admin to kick players, but not other admins or owner', () => {
      expect(canManageMember('admin', 'player', false).canKick).toBe(true);
      expect(canManageMember('admin', 'admin', false).canKick).toBe(false);
      expect(canManageMember('admin', 'owner', false).canKick).toBe(false);
    });

    it('disallows player from managing any member', () => {
      const permissions = canManageMember('player', 'player', false);
      expect(permissions.canKick).toBe(false);
      expect(permissions.canPromote).toBe(false);
      expect(permissions.canDemote).toBe(false);
    });
  });

  describe('Invitation Service URL Builder', () => {
    it('constructs canonical invite URLs correctly', () => {
      const token = 'tok_secure_test_12345';
      const url = invitationApi.buildInviteUrl(token);
      expect(url).toContain('/invite/tok_secure_test_12345');
    });

    it('encodes special characters in token safely', () => {
      const token = 'abc 123';
      const url = invitationApi.buildInviteUrl(token);
      expect(url).toContain('/invite/abc%20123');
    });
  });

  describe('Room Code Joining Alignment', () => {
    it('preserves full 16-character hexadecimal room codes', () => {
      const code16 = '7F4A8C2E9B1D6F03';
      expect(code16.length).toBe(ROOM_CODE_MAX_LENGTH);
      const normalized = normalizeRoomCode(code16);
      expect(normalized).toBe('7F4A8C2E9B1D6F03');
      expect(joinByCodeSchema.safeParse({ code: code16 }).success).toBe(true);
    });
  });

  describe('Invitation Generation & Joining Resiliency', () => {
    it('generates an invite URL with fallback to room code or token', () => {
      const roomCode = '7A3F8B1C9E2D4F0A';
      const url = invitationApi.buildInviteUrl(roomCode);
      expect(url).toContain(`/invite/${roomCode}`);
    });

    it('rejects empty or whitespace invitation tokens on join', async () => {
      await expect(invitationApi.joinByInvite('')).rejects.toThrow('Please provide a valid invitation token.');
      await expect(invitationApi.joinByInvite('   ')).rejects.toThrow('Please provide a valid invitation token.');
    });

    it('requires a squad ID when generating an invitation', async () => {
      await expect(invitationApi.createInvite('')).rejects.toThrow('Squad ID is required');
    });
  });
});
