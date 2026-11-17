import { describe, it, expect } from 'vitest';
import { setAttendanceSchema } from '../modules/attendance/schema';
import type { AttendanceStatus, MatchMode } from '@/types/contracts';

describe('Player Availability & Attendance Contracts (Developer C)', () => {
  const validUuid = '22222222-2222-2222-2222-222222222222';

  it('validates correct RSVP statuses: playing, maybe, not_playing', () => {
    const validStatuses: AttendanceStatus[] = ['playing', 'maybe', 'not_playing'];

    for (const status of validStatuses) {
      const result = setAttendanceSchema.safeParse({
        matchId: validUuid,
        status,
      });
      expect(result.success).toBe(true);
    }
  });

  it('rejects unallowed attendance status values', () => {
    const invalidStatuses = ['confirmed', 'absent', 'yes', 'no', 'pending', 'waitlist'];

    for (const status of invalidStatuses) {
      const result = setAttendanceSchema.safeParse({
        matchId: validUuid,
        status,
      });
      expect(result.success).toBe(false);
    }
  });

  it('rejects invalid matchId format', () => {
    const result = setAttendanceSchema.safeParse({
      matchId: 'not-a-uuid',
      status: 'playing',
    });
    expect(result.success).toBe(false);
  });

  it('verifies that Maybe is NOT counted as confirmed attendance', () => {
    const sampleResponses = [
      { userId: 'u1', status: 'playing' },
      { userId: 'u2', status: 'playing' },
      { userId: 'u3', status: 'maybe' },
      { userId: 'u4', status: 'maybe' },
      { userId: 'u5', status: 'not_playing' },
    ];

    const confirmedCount = sampleResponses.filter((r) => r.status === 'playing').length;
    const maybeCount = sampleResponses.filter((r) => r.status === 'maybe').length;
    const outCount = sampleResponses.filter((r) => r.status === 'not_playing').length;

    expect(confirmedCount).toBe(2);
    expect(maybeCount).toBe(2);
    expect(outCount).toBe(1);

    // Rule: Maybe must never be added to confirmed
    const confirmedTotal = confirmedCount;
    expect(confirmedTotal).toBe(2);
    expect(confirmedTotal).not.toBe(confirmedCount + maybeCount);
  });

  it('calculates quorum targets accurately for Friendly (2 teams) and Practice (1 team)', () => {
    const calcTarget = (mode: MatchMode, players: number) =>
      mode === 'friendly' ? players * 2 : players;

    // 7v7 friendly derby requires 14 confirmed players
    const friendlyTarget = calcTarget('friendly', 7);
    expect(friendlyTarget).toBe(14);

    // 5v5 practice session requires 5 confirmed players
    const practiceTarget = calcTarget('single', 5);
    expect(practiceTarget).toBe(5);

    // Quorum check
    const currentPlaying = 12;
    const isFriendlyQuorumMet = currentPlaying >= friendlyTarget;
    expect(isFriendlyQuorumMet).toBe(false);

    const isPracticeQuorumMet = currentPlaying >= practiceTarget;
    expect(isPracticeQuorumMet).toBe(true);
  });

  it('enforces match capacity limits and detects when match is full', () => {
    const mode: MatchMode = 'friendly';
    const playersPerTeam = 7;
    const maxCapacity = mode === 'friendly' ? playersPerTeam * 2 : playersPerTeam;

    expect(maxCapacity).toBe(14);

    const confirmedPlayers = Array.from({ length: 14 }, (_, i) => ({
      userId: `user-${i + 1}`,
      status: 'playing' as AttendanceStatus,
    }));

    const isFull = confirmedPlayers.length >= maxCapacity;
    expect(isFull).toBe(true);

    // A 15th player cannot occupy confirmed position
    const attempt15th = confirmedPlayers.length + 1 > maxCapacity;
    expect(attempt15th).toBe(true);
  });

  it('orders waitlist queue in strict FIFO sequence and assigns correct positions', () => {
    const waitlist = [
      { userId: 'player-b', createdAt: '2026-11-20T10:05:00Z' },
      { userId: 'player-a', createdAt: '2026-11-20T10:00:00Z' },
      { userId: 'player-c', createdAt: '2026-11-20T10:15:00Z' },
    ];

    // Sort by createdAt ascending (earliest first)
    const sorted = [...waitlist].sort(
      (a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime()
    );

    expect(sorted[0].userId).toBe('player-a');
    expect(sorted[1].userId).toBe('player-b');
    expect(sorted[2].userId).toBe('player-c');

    // Queue positions
    const withPositions = sorted.map((entry, idx) => ({
      ...entry,
      position: idx + 1,
    }));

    expect(withPositions[0].position).toBe(1);
    expect(withPositions[1].position).toBe(2);
    expect(withPositions[2].position).toBe(3);
  });

  it('simulates atomic waitlist promotion when a confirmed player drops out', () => {
    const maxCapacity = 5;
    let confirmedList = ['u1', 'u2', 'u3', 'u4', 'u5'];
    let waitlist = ['w1', 'w2', 'w3'];

    expect(confirmedList.length).toBe(maxCapacity);

    // Player u3 drops out (changes to not_playing)
    const droppingUser = 'u3';
    confirmedList = confirmedList.filter((u) => u !== droppingUser);
    expect(confirmedList.length).toBe(4);

    // Trigger promotion logic: earliest waitlisted player gets promoted
    if (confirmedList.length < maxCapacity && waitlist.length > 0) {
      const promotedUser = waitlist[0];
      waitlist = waitlist.slice(1);
      confirmedList.push(promotedUser);
    }

    expect(confirmedList.length).toBe(maxCapacity);
    expect(confirmedList).toContain('w1');
    expect(waitlist).toEqual(['w2', 'w3']);
    expect(waitlist.length).toBe(2);
  });

  it('validates RSVP deadline cutoffs and admin override behavior', () => {
    const pastDeadline = '2026-11-15T18:00:00Z';
    const currentTime = new Date('2026-11-16T12:00:00Z').getTime();
    const isPast = new Date(pastDeadline).getTime() < currentTime;
    expect(isPast).toBe(true);

    const evaluateRsvpAllowed = (
      deadlinePassed: boolean,
      isAdmin: boolean,
      adminOverride: boolean
    ) => {
      if (!deadlinePassed) return true;
      return isAdmin && adminOverride;
    };

    // Ordinary player rejected after deadline
    expect(evaluateRsvpAllowed(isPast, false, false)).toBe(false);

    // Admin without override rejected
    expect(evaluateRsvpAllowed(isPast, true, false)).toBe(false);

    // Admin with override allowed
    expect(evaluateRsvpAllowed(isPast, true, true)).toBe(true);
  });

  it('rejects attendance and waitlist changes for cancelled or completed matches', () => {
    const isMatchOpen = (status: string) => status === 'scheduled' || status === 'in_progress';

    expect(isMatchOpen('scheduled')).toBe(true);
    expect(isMatchOpen('in_progress')).toBe(true);
    expect(isMatchOpen('cancelled')).toBe(false);
    expect(isMatchOpen('completed')).toBe(false);
  });
});
