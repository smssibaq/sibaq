import { describe, it, expect } from 'vitest';
import {
  trimmedString,
  emailSchema,
  urlSchema,
  numberRange,
  dateRangeSchema,
  fileUploadSchema,
} from '../lib/validation';

describe('Validation Schemas', () => {
  it('trimmedString trims and enforces min/max length', () => {
    const schema = trimmedString(3, 10, 'Name');
    expect(schema.safeParse('   valid   ').success).toBe(true);
    expect(schema.safeParse('  v  ').success).toBe(false); // trimmed length < 3
    expect(schema.safeParse('this is too long').success).toBe(false);
  });

  it('emailSchema accepts valid emails and rejects invalid ones', () => {
    expect(emailSchema.safeParse('user@example.com').success).toBe(true);
    expect(emailSchema.safeParse('  user@sub.domain.co  ').success).toBe(true);
    expect(emailSchema.safeParse('invalid-email').success).toBe(false);
    expect(emailSchema.safeParse('').success).toBe(false);
  });

  it('urlSchema validates http and https protocols', () => {
    expect(urlSchema.safeParse('https://example.com').success).toBe(true);
    expect(urlSchema.safeParse('http://localhost:3000').success).toBe(true);
    expect(urlSchema.safeParse('ftp://example.com').success).toBe(false);
    expect(urlSchema.safeParse('javascript:alert(1)').success).toBe(false);
  });

  it('numberRange enforces numeric boundaries', () => {
    const schema = numberRange(10, 100, 'Score');
    expect(schema.safeParse(50).success).toBe(true);
    expect(schema.safeParse(10).success).toBe(true);
    expect(schema.safeParse(9).success).toBe(false);
    expect(schema.safeParse(101).success).toBe(false);
  });

  it('dateRangeSchema validates start <= end', () => {
    expect(
      dateRangeSchema.safeParse({
        startDate: '2026-11-15',
        endDate: '2026-11-16',
      }).success
    ).toBe(true);

    expect(
      dateRangeSchema.safeParse({
        startDate: '2026-11-15',
        endDate: '2026-11-15',
      }).success
    ).toBe(true);

    expect(
      dateRangeSchema.safeParse({
        startDate: '2026-11-16',
        endDate: '2026-11-15',
      }).success
    ).toBe(false);
  });

  it('fileUploadSchema validates file size and mime types', () => {
    const schema = fileUploadSchema(1024 * 1024, ['image/png']);
    const validFile = new File(['data'], 'test.png', { type: 'image/png' });
    expect(schema.safeParse(validFile).success).toBe(true);

    const invalidTypeFile = new File(['data'], 'test.exe', { type: 'application/x-msdownload' });
    expect(schema.safeParse(invalidTypeFile).success).toBe(false);
  });
});

