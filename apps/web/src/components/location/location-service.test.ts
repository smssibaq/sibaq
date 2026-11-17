import { describe, expect, it, vi } from 'vitest';
vi.mock('@/infrastructure/supabase/client', () => ({ supabase: {} }));
import { directionsUrl, hasCoordinates, manualLocation } from './location-service';

describe('game locations', () => {
  it('keeps a manual venue without inventing coordinates', () => {
    const value = manualLocation('Local ground');
    expect(value.latitude).toBeNull(); expect(value.longitude).toBeNull();
    expect(hasCoordinates(value)).toBe(false);
    expect(new URL(directionsUrl(value)).searchParams.get('query')).toBe('Local ground');
  });
  it('uses exact coordinates for directions, including a legitimate zero coordinate', () => {
    const value = { name: 'Selected pin', address: '', latitude: 0, longitude: 76.12345 };
    expect(hasCoordinates(value)).toBe(true);
    expect(new URL(directionsUrl(value)).searchParams.get('destination')).toBe('0,76.12345');
  });
  it('rejects partial, nonfinite and out-of-range coordinates', () => {
    expect(hasCoordinates({ ...manualLocation(), latitude: 10 })).toBe(false);
    expect(hasCoordinates({ ...manualLocation(), latitude: 91, longitude: 20 })).toBe(false);
    expect(hasCoordinates({ ...manualLocation(), latitude: 10, longitude: Infinity })).toBe(false);
  });
});
