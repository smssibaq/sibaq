import { describe, it, expect } from 'vitest';
import {
  safeParseDate,
  formatDate,
  formatDateTime,
  isValidDateRange,
  toUtcIsoString,
  calculateCountdown,
} from '../lib/dates';

describe('Date & Time Utilities', () => {
  it('safeParseDate parses ISO strings, numbers, and Dates correctly', () => {
    expect(safeParseDate('2026-11-15T10:00:00Z')).toBeInstanceOf(Date);
    expect(safeParseDate(1731664800000)).toBeInstanceOf(Date);
    expect(safeParseDate(new Date())).toBeInstanceOf(Date);
    expect(safeParseDate('invalid-date-string')).toBeNull();
    expect(safeParseDate(null)).toBeNull();
  });

  it('formatDate and formatDateTime format without throwing on bad input', () => {
    const valid = '2026-11-15T12:00:00Z';
    expect(formatDate(valid)).toContain('2026');
    expect(formatDateTime(valid)).toContain('2026');
    expect(formatDate(null)).toBe('—');
    expect(formatDate('invalid')).toBe('—');
  });

  it('isValidDateRange checks logical chronological order', () => {
    expect(isValidDateRange('2026-01-01', '2026-01-02')).toBe(true);
    expect(isValidDateRange('2026-01-01', '2026-01-01', true)).toBe(true);
    expect(isValidDateRange('2026-01-02', '2026-01-01')).toBe(false);
    expect(isValidDateRange('invalid', '2026-01-01')).toBe(false);
  });

  it('toUtcIsoString converts values to UTC ISO format', () => {
    const iso = toUtcIsoString('2026-11-15T14:30:00');
    expect(iso).toMatch(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z$/);
    expect(toUtcIsoString(null)).toBeNull();
  });

  it('calculateCountdown computes remaining time and clamps at zero', () => {
    // Future date
    const future = new Date(Date.now() + 1000 * 3600 * 2); // 2 hours ahead
    const countdown = calculateCountdown(future);
    expect(countdown.isComplete).toBe(false);
    expect(countdown.hours).toBeGreaterThanOrEqual(1);

    // Past date
    const past = new Date(Date.now() - 1000 * 60);
    const expired = calculateCountdown(past);
    expect(expired.isComplete).toBe(true);
    expect(expired.formatted).toBe('00:00:00');
  });
});

