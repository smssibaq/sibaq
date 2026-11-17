export const COURT_MARKER_WIDTH = 64;
export const COURT_MARKER_HEIGHT = 60;

/** Keep the whole marker clear of court lines, side labels and the net. */
export function fitCourtMarker(point: { x: number; y: number }, side: 'A' | 'B', width: number, height: number) {
  const w = Math.max(width, 1), h = Math.max(height, 1);
  const insetX = Math.min(.4, Math.max(.16, (COURT_MARKER_WIDTH / 2 + w * .06 + 6) / w));
  const outerY = Math.min(.3, Math.max(.12, (COURT_MARKER_HEIGHT / 2 + Math.max(18, h * .045) + 6) / h));
  const netY = Math.max(.1, (COURT_MARKER_HEIGHT / 2 + 6) / h);
  const minY = side === 'A' ? outerY : Math.max(.6, .5 + netY);
  const maxY = side === 'A' ? Math.min(.4, .5 - netY) : 1 - outerY;
  return {
    x: Math.max(insetX, Math.min(1 - insetX, Number.isFinite(point.x) ? point.x : .5)),
    y: Math.max(minY, Math.min(maxY, Number.isFinite(point.y) ? point.y : side === 'A' ? .28 : .72)),
  };
}
