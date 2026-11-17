import { describe, it, expect } from 'vitest';
import { sanitizeReturnUrl } from '../modules/auth/auth-provider';

describe('Security & Authorization Contracts', () => {
  it('sanitizeReturnUrl prevents open-redirect and protocol-relative attacks', () => {
    // Valid internal relative routes
    expect(sanitizeReturnUrl('/dashboard')).toBe('/dashboard');
    expect(sanitizeReturnUrl('/sample-items?filter=active')).toBe('/sample-items?filter=active');
    expect(sanitizeReturnUrl('/profile')).toBe('/profile');

    // Attack attempts
    expect(sanitizeReturnUrl('https://malicious-site.com')).toBe('/dashboard');
    expect(sanitizeReturnUrl('http://attacker.com/steal')).toBe('/dashboard');
    expect(sanitizeReturnUrl('//evil.com/redirect')).toBe('/dashboard');
    expect(sanitizeReturnUrl('javascript:alert(1)')).toBe('/dashboard');
    expect(sanitizeReturnUrl('')).toBe('/dashboard');
    expect(sanitizeReturnUrl(null)).toBe('/dashboard');
    expect(sanitizeReturnUrl(undefined)).toBe('/dashboard');
  });

  it('ensures environment variables do not contain service_role keys in web bundle', () => {
    const env = import.meta.env;
    expect(env).not.toHaveProperty('SUPABASE_SERVICE_ROLE_KEY');
    expect(env).not.toHaveProperty('SERVICE_ROLE_KEY');
    expect(env).not.toHaveProperty('DATABASE_PASSWORD');
  });
});

