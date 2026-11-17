import { describe, it, expect } from 'vitest';
import { normalizeError, AppError } from '../lib/errors';

describe('Error Normalization Utility', () => {
  it('preserves AppError instances directly', () => {
    const appErr = new AppError('Custom domain error', 'VALIDATION_FAILED', 422);
    const normalized = normalizeError(appErr);
    expect(normalized.message).toBe('Custom domain error');
    expect(normalized.code).toBe('VALIDATION_FAILED');
    expect(normalized.statusCode).toBe(422);
  });

  it('normalizes PostgreSQL 42501 permission denied errors safely', () => {
    const pgError = {
      code: '42501',
      message: 'permission denied for table sample_items',
    };
    const normalized = normalizeError(pgError);
    expect(normalized.code).toBe('FORBIDDEN');
    expect(normalized.statusCode).toBe(403);
    expect(normalized.message).not.toContain('table sample_items');
  });

  it('normalizes fetch network failures without leaking system internals', () => {
    const fetchErr = new TypeError('Failed to fetch from backend');
    const normalized = normalizeError(fetchErr);
    expect(normalized.code).toBe('NETWORK_ERROR');
    expect(normalized.message).toContain('internet connection');
  });

  it('normalizes PostgREST not found error (PGRST116)', () => {
    const pgrstError = {
      code: 'PGRST116',
      message: 'The result contains 0 rows',
    };
    const normalized = normalizeError(pgrstError);
    expect(normalized.code).toBe('NOT_FOUND');
    expect(normalized.statusCode).toBe(404);
  });

  it('sanitizes messages containing SQL queries or tokens', () => {
    const rawSqlError = {
      message: 'syntax error at or near "SELECT * FROM secret_table WHERE apikey=xyz"',
    };
    const normalized = normalizeError(rawSqlError);
    expect(normalized.message).not.toContain('secret_table');
    expect(normalized.message).not.toContain('xyz');
  });
});

