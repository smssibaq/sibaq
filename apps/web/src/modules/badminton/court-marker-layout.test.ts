import { describe, expect, it } from 'vitest';
import { COURT_MARKER_HEIGHT, COURT_MARKER_WIDTH, fitCourtMarker } from './court-marker-layout';

describe('badminton marker bounds', () => {
  it.each([220, 279, 334, 512])('keeps complete markers inside each half at court width %i', width => {
    const height = width * 1.4;
    for (const side of ['A', 'B'] as const) {
      for (const x of [-1, .5, 2]) for (const y of [-1, .5, 2]) {
        const point = fitCourtMarker({ x, y }, side, width, height);
        expect(point.x * width - COURT_MARKER_WIDTH / 2).toBeGreaterThan(width * .06);
        expect(point.x * width + COURT_MARKER_WIDTH / 2).toBeLessThan(width * .94);
        expect(point.y * height - COURT_MARKER_HEIGHT / 2).toBeGreaterThan(side === 'A' ? 18 : height * .5);
        expect(point.y * height + COURT_MARKER_HEIGHT / 2).toBeLessThan(side === 'A' ? height * .5 : height - 18);
        expect(point.x).toBeGreaterThanOrEqual(.16);
        expect(point.x).toBeLessThanOrEqual(.84);
        expect(point.y).toBeGreaterThanOrEqual(side === 'A' ? .12 : .6);
        expect(point.y).toBeLessThanOrEqual(side === 'A' ? .4 : .88);
      }
    }
  });
});
