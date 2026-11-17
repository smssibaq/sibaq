import {
  format,
  parseISO,
  isValid,
  isBefore,
  isAfter,
  differenceInSeconds,
  formatDistanceToNow,
  startOfDay,
  endOfDay,
} from 'date-fns';

export const DEFAULT_TIMEZONE =
  import.meta.env.VITE_DISPLAY_TIMEZONE || 'Asia/Kolkata';

export interface Countdown {
  days: number;
  hours: number;
  minutes: number;
  seconds: number;
  isComplete: boolean;
  formatted: string;
}

/**
 * Safely parses an ISO string, timestamp number, or Date object.
 * Returns null if the value is invalid.
 */
export function safeParseDate(value: unknown): Date | null {
  if (!value) return null;
  if (value instanceof Date) {
    return isValid(value) ? value : null;
  }
  if (typeof value === 'number') {
    const d = new Date(value);
    return isValid(d) ? d : null;
  }
  if (typeof value === 'string') {
    const parsed = parseISO(value);
    return isValid(parsed) ? parsed : null;
  }
  return null;
}

/**
 * Formats a date into a localized string with specified pattern.
 */
export function formatDate(
  value: unknown,
  pattern = 'MMM dd, yyyy'
): string {
  const d = safeParseDate(value);
  if (!d) return '—';
  try {
    return format(d, pattern);
  } catch {
    return 'Invalid date';
  }
}

/**
 * Formats a date with time.
 */
export function formatDateTime(
  value: unknown,
  pattern = 'MMM dd, yyyy hh:mm a'
): string {
  return formatDate(value, pattern);
}

/**
 * Formats a date in relative human-friendly time (e.g. "2 hours ago").
 */
export function formatRelativeTime(value: unknown): string {
  const d = safeParseDate(value);
  if (!d) return '—';
  try {
    return formatDistanceToNow(d, { addSuffix: true });
  } catch {
    return '—';
  }
}

/**
 * Validates that a date range is coherent (start <= end).
 */
export function isValidDateRange(
  start: unknown,
  end: unknown,
  allowEqual = true
): boolean {
  const startDate = safeParseDate(start);
  const endDate = safeParseDate(end);

  if (!startDate || !endDate) return false;

  if (allowEqual && startDate.getTime() === endDate.getTime()) {
    return true;
  }

  return isBefore(startDate, endDate);
}

/**
 * Converts a date to an absolute UTC ISO string for database storage.
 */
export function toUtcIsoString(value: unknown): string | null {
  const d = safeParseDate(value);
  return d ? d.toISOString() : null;
}

/**
 * Calculates a countdown against a fixed absolute deadline.
 * Clamps at zero when complete.
 */
export function calculateCountdown(deadline: unknown): Countdown {
  const target = safeParseDate(deadline);
  if (!target) {
    return {
      days: 0,
      hours: 0,
      minutes: 0,
      seconds: 0,
      isComplete: true,
      formatted: '00:00:00',
    };
  }

  const now = new Date();
  const totalSeconds = Math.max(0, differenceInSeconds(target, now));

  if (totalSeconds <= 0) {
    return {
      days: 0,
      hours: 0,
      minutes: 0,
      seconds: 0,
      isComplete: true,
      formatted: '00:00:00',
    };
  }

  const days = Math.floor(totalSeconds / 86400);
  const hours = Math.floor((totalSeconds % 86400) / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = totalSeconds % 60;

  const pad = (n: number) => n.toString().padStart(2, '0');
  const formatted =
    days > 0
      ? `${days}d ${pad(hours)}:${pad(minutes)}:${pad(seconds)}`
      : `${pad(hours)}:${pad(minutes)}:${pad(seconds)}`;

  return {
    days,
    hours,
    minutes,
    seconds,
    isComplete: false,
    formatted,
  };
}

/**
 * Formats a date using the Intl API in the configured timezone.
 */
export function formatInTimezone(
  value: unknown,
  timeZone = DEFAULT_TIMEZONE,
  options?: Intl.DateTimeFormatOptions
): string {
  const d = safeParseDate(value);
  if (!d) return '—';

  try {
    return new Intl.DateTimeFormat('en-US', {
      timeZone,
      dateStyle: 'medium',
      timeStyle: 'short',
      ...options,
    }).format(d);
  } catch {
    return formatDate(d);
  }
}

export { isBefore, isAfter, startOfDay, endOfDay };

