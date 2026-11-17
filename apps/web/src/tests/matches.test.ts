import { describe, it, expect } from 'vitest';
import { createMatchSchema, updateMatchSchema, KERALA_TURF_PRESETS } from '../modules/matches/schema';
import { calculateCountdown, formatInTimezone, DEFAULT_TIMEZONE } from '../lib/dates';

describe('Match Management & Scheduling Contracts (Developer C)', () => {
  const validUuid = '11111111-1111-1111-1111-111111111111';

  it('validates a correct friendly match fixture creation payload', () => {
    const validData = {
      squadId: validUuid,
      title: 'Kochi Derby 7s',
      mode: 'friendly' as const,
      turfName: 'Decathlon Turf Arena, Kalamassery',
      locationDescription: 'Pitch #1 near parking',
      date: '2026-11-20',
      kickoffTime: '20:30',
      playersPerTeam: 7,
    };

    const result = createMatchSchema.safeParse(validData);
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.title).toBe('Kochi Derby 7s');
      expect(result.data.mode).toBe('friendly');
      expect(result.data.playersPerTeam).toBe(7);
    }
  });

  it('validates a single-team practice session', () => {
    const practiceData = {
      squadId: validUuid,
      title: 'Midweek Tactical Drills',
      mode: 'single' as const,
      turfName: 'United Turf Arena, Kakkanad',
      date: '2026-11-22',
      kickoffTime: '19:00',
      playersPerTeam: 5,
    };

    const result = createMatchSchema.safeParse(practiceData);
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.mode).toBe('single');
      expect(result.data.playersPerTeam).toBe(5);
    }
  });

  it('supports configurable players per team between 3 and 11', () => {
    // Valid boundaries
    expect(
      createMatchSchema.safeParse({
        squadId: validUuid,
        title: '3v3 Cage Match',
        mode: 'friendly',
        turfName: 'Cage Turf',
        date: '2026-11-25',
        kickoffTime: '18:00',
        playersPerTeam: 3,
      }).success
    ).toBe(true);

    expect(
      createMatchSchema.safeParse({
        squadId: validUuid,
        title: '11v11 Full Pitch',
        mode: 'friendly',
        turfName: 'Stadium Turf',
        date: '2026-11-25',
        kickoffTime: '18:00',
        playersPerTeam: 11,
      }).success
    ).toBe(true);

    // Invalid counts
    expect(
      createMatchSchema.safeParse({
        squadId: validUuid,
        title: 'Too Small',
        mode: 'friendly',
        turfName: 'Turf',
        date: '2026-11-25',
        kickoffTime: '18:00',
        playersPerTeam: 2,
      }).success
    ).toBe(false);

    expect(
      createMatchSchema.safeParse({
        squadId: validUuid,
        title: 'Too Large',
        mode: 'friendly',
        turfName: 'Turf',
        date: '2026-11-25',
        kickoffTime: '18:00',
        playersPerTeam: 12,
      }).success
    ).toBe(false);
  });

  it('rejects invalid title length and invalid formats', () => {
    // Title too short
    const shortTitle = createMatchSchema.safeParse({
      squadId: validUuid,
      title: 'AB',
      mode: 'friendly',
      turfName: 'Turf',
      date: '2026-11-25',
      kickoffTime: '18:00',
      playersPerTeam: 7,
    });
    expect(shortTitle.success).toBe(false);

    // Invalid date format
    const badDate = createMatchSchema.safeParse({
      squadId: validUuid,
      title: 'Valid Title',
      mode: 'friendly',
      turfName: 'Turf',
      date: '25-11-2026',
      kickoffTime: '18:00',
      playersPerTeam: 7,
    });
    expect(badDate.success).toBe(false);

    // Invalid time format
    const badTime = createMatchSchema.safeParse({
      squadId: validUuid,
      title: 'Valid Title',
      mode: 'friendly',
      turfName: 'Turf',
      date: '2026-11-25',
      kickoffTime: '8 PM',
      playersPerTeam: 7,
    });
    expect(badTime.success).toBe(false);

    // Past date rejection
    const pastDate = createMatchSchema.safeParse({
      squadId: validUuid,
      title: 'Valid Title',
      mode: 'friendly',
      turfName: 'Turf',
      date: '2020-01-01',
      kickoffTime: '18:00',
      playersPerTeam: 7,
    });
    expect(pastDate.success).toBe(false);
    if (!pastDate.success) {
      expect(pastDate.error.issues[0].message).toContain('future');
    }
  });

  it('validates optional RSVP deadline: must be strictly before match kickoff', () => {
    // Valid: RSVP deadline 4 hours before kickoff
    const validDeadline = createMatchSchema.safeParse({
      squadId: validUuid,
      title: 'Friday Derby',
      mode: 'friendly',
      turfName: 'Decathlon Arena',
      date: '2026-11-25',
      kickoffTime: '20:00',
      rsvpDeadlineDate: '2026-11-25',
      rsvpDeadlineTime: '16:00',
      playersPerTeam: 7,
    });
    expect(validDeadline.success).toBe(true);

    // Invalid: RSVP deadline after kickoff
    const deadlineAfterKickoff = createMatchSchema.safeParse({
      squadId: validUuid,
      title: 'Friday Derby',
      mode: 'friendly',
      turfName: 'Decathlon Arena',
      date: '2026-11-25',
      kickoffTime: '20:00',
      rsvpDeadlineDate: '2026-11-25',
      rsvpDeadlineTime: '21:00',
      playersPerTeam: 7,
    });
    expect(deadlineAfterKickoff.success).toBe(false);
    if (!deadlineAfterKickoff.success) {
      expect(deadlineAfterKickoff.error.issues[0].message).toContain('before match kickoff');
    }

    // Invalid: RSVP deadline in the past
    const pastDeadline = createMatchSchema.safeParse({
      squadId: validUuid,
      title: 'Friday Derby',
      mode: 'friendly',
      turfName: 'Decathlon Arena',
      date: '2026-11-25',
      kickoffTime: '20:00',
      rsvpDeadlineDate: '2020-01-01',
      rsvpDeadlineTime: '12:00',
      playersPerTeam: 7,
    });
    expect(pastDeadline.success).toBe(false);
    if (!pastDeadline.success) {
      expect(pastDeadline.error.issues[0].message).toContain('future');
    }
  });

  it('validates updateMatchSchema with valid status transitions and optional deadline', () => {
    const validUpdate = {
      title: 'Rescheduled Derby 7s',
      turfName: 'United Turf Arena',
      date: '2026-11-28',
      kickoffTime: '21:00',
      rsvpDeadlineDate: '2026-11-28',
      rsvpDeadlineTime: '17:00',
      status: 'in_progress' as const,
    };

    expect(updateMatchSchema.safeParse(validUpdate).success).toBe(true);

    const cancelledUpdate = {
      title: 'Rescheduled Derby 7s',
      turfName: 'United Turf Arena',
      date: '2026-11-28',
      kickoffTime: '21:00',
      status: 'cancelled' as const,
    };

    expect(updateMatchSchema.safeParse(cancelledUpdate).success).toBe(true);

    // Invalid status
    expect(
      updateMatchSchema.safeParse({
        ...validUpdate,
        status: 'postponed',
      }).success
    ).toBe(false);
  });

  it('includes popular Kerala turf presets', () => {
    expect(KERALA_TURF_PRESETS.length).toBeGreaterThanOrEqual(5);
    const kochiTurfs = KERALA_TURF_PRESETS.filter((t) => t.city === 'Kochi');
    expect(kochiTurfs.length).toBeGreaterThanOrEqual(1);
  });

  it('calculates countdown accurately in Asia/Kolkata timezone', () => {
    const futureDate = new Date(Date.now() + 3600 * 1000 * 2).toISOString(); // 2 hours in future
    const cd = calculateCountdown(futureDate);
    expect(cd.isComplete).toBe(false);
    expect(cd.hours).toBeGreaterThanOrEqual(1);

    const pastDate = new Date(Date.now() - 3600 * 1000).toISOString();
    const pastCd = calculateCountdown(pastDate);
    expect(pastCd.isComplete).toBe(true);
    expect(pastCd.formatted).toBe('00:00:00');
  });

  it('formats dates in Asia/Kolkata timezone by default', () => {
    expect(DEFAULT_TIMEZONE).toBe('Asia/Kolkata');
    const testUtcDate = '2026-11-20T14:30:00.000Z'; // 14:30 UTC = 8:00 PM IST (+5:30)
    const formatted = formatInTimezone(testUtcDate, 'Asia/Kolkata');
    expect(formatted).toContain('8:00 PM');
  });
});
