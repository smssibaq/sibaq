import { describe, expect, it } from 'vitest';
import { assignSide, cleanSlots, confirmedPlayers, lineupPayload, placePlayer, cleanLineup, moveLineupPlayer, dropLineupPlayer } from './lineup-assignment';

describe('badminton manual assignment', () => {
  it('drops bench to A/B, moves between sides, then returns to bench', () => {
    const player = { userId: 'p1', status: 'in' };
    let state = { slots: [null, null] as (string | null)[], bench: ['p1'] };
    state = dropLineupPlayer(state, player, 'A', 1, { x: .4, y: .3 })!;
    expect(state.slots).toEqual(['p1', null]);
    state = dropLineupPlayer(state, player, 'B', 1, { x: .6, y: .7 })!;
    expect(state.slots).toEqual([null, 'p1']);
    state = dropLineupPlayer(state, player, 'bench', 1)!;
    expect(state.slots).toEqual([null, null]); expect(state.bench).toEqual(['p1']);
  });
  it('rejects full teams and Maybe without changing the original draft', () => {
    const state = { slots: ['p1', 'p2'], bench: ['p3'] };
    expect(dropLineupPlayer(state, { userId: 'p1', status: 'in' }, 'B', 1)).toBeNull();
    expect(dropLineupPlayer(state, { userId: 'p3', status: 'maybe' }, 'A', 1)).toBeNull();
    expect(state.slots).toEqual(['p1', 'p2']);
  });
  it('clamps coordinates to the assigned half and retains them through draft reload', () => {
    const next = dropLineupPlayer({ slots: ['p1', null], bench: [] }, { userId: 'p1', status: 'in' }, 'B', 1, { x: 2, y: .1 })!;
    expect(next.positions?.p1).toEqual({ x: .84, y: .6 });
    expect(cleanLineup(JSON.parse(JSON.stringify(next)), [{ userId: 'p1', status: 'in' }], 1).positions).toEqual(next.positions);
  });
  it('moves confirmed players between active sides, bench and unassigned without changing RSVP', () => {
    const player = { userId: 'p1', status: 'in' };
    let state = { slots: ['p1', null], bench: [] as string[] };
    state = moveLineupPlayer(state, player, 'bench', 1)!;
    expect(state).toEqual({ slots: [null, null], bench: ['p1'] });
    state = moveLineupPlayer(state, player, 'B', 1)!;
    expect(state).toEqual({ slots: [null, 'p1'], bench: [] });
    state = moveLineupPlayer(state, player, 'remove', 1)!;
    expect(state).toEqual({ slots: [null, null], bench: [] });
    expect(player.status).toBe('in');
  });
  it('automatically benches Maybe, rejects active moves and removes Out assignments', () => {
    const maybe = { userId: 'm', status: 'maybe' };
    const out = { userId: 'o', status: 'out' };
    const state = cleanLineup({ slots: ['m', 'o'], bench: ['o'] }, [maybe, out], 1);
    expect(state).toEqual({ slots: [null, null], bench: ['m'] });
    expect(moveLineupPlayer(state, maybe, 'A', 1)).toBeNull();
    expect(moveLineupPlayer(state, maybe, 'B', 1)).toBeNull();
    expect(moveLineupPlayer(state, maybe, 'remove', 1)).toBeNull();
    expect(moveLineupPlayer(state, out, 'bench', 1)).toBeNull();
    expect(moveLineupPlayer(state, { ...maybe, status: 'in' }, 'B', 1)).toEqual({ slots: [null, 'm'], bench: [] });
  });
  it('preserves empty court positions and removes active/bench duplicates on reload', () => {
    const state = { slots: [null, 'p1', 'p2', null], bench: ['p1', 'p3'] };
    const players = ['p1', 'p2', 'p3'].map(userId => ({ userId, status: 'in' }));
    expect(cleanLineup(JSON.parse(JSON.stringify(state)), players, 2)).toEqual({ slots: state.slots, bench: ['p3'] });
  });
  it('excludes Maybe/Out and clears invalid and duplicate assignments', () => {
    const players = [{ userId: 'p1', status: 'in' }, { userId: 'p2', status: 'maybe' }, { userId: 'p3', status: 'out' }];
    expect(confirmedPlayers(players).map(p => p.userId)).toEqual(['p1']);
    expect(cleanSlots(['p1', 'p2', 'p3', 'p1'], ['p1'], 2)).toEqual(['p1', null, null, null]);
    expect(cleanSlots(['p1', null], [], 1)).toEqual([null, null]);
  });
  for (const perSide of [1, 2]) {
    it(`assigns both teams and moves players with ${perSide} per side`, () => {
      let slots = Array<string | null>(perSide * 2).fill(null);
      slots = assignSide(slots, 'p1', 'A', perSide)!;
      slots = assignSide(slots, 'p2', 'B', perSide)!;
      expect(slots[0]).toBe('p1');
      expect(slots[perSide]).toBe('p2');
      slots = assignSide(slots, 'p1', 'B', perSide)!;
      expect(slots.slice(perSide)).toContain('p1');
      expect(slots.filter(id => id === 'p1')).toHaveLength(1);
      const payload = lineupPayload(slots, perSide);
      expect(payload.sideA.length).toBeLessThanOrEqual(perSide);
      expect(payload.sideB.length).toBeLessThanOrEqual(perSide);
      const persisted = JSON.parse(JSON.stringify(payload));
      const reloaded = ['A', 'B'].flatMap(side => Array.from({ length: perSide }, (_, i) => (side === 'A' ? persisted.sideA : persisted.sideB)[i] ?? null));
      expect(lineupPayload(reloaded, perSide)).toEqual(payload);
    });
  }
  it('swaps occupied positions and rejects an extra player on a full team', () => {
    expect(placePlayer(['p1', 'p2'], 'p1', 1)).toEqual(['p2', 'p1']);
    expect(assignSide(['p1', 'p2'], 'p3', 'B', 1)).toBeNull();
    expect(assignSide(['p1', 'p2'], 'p1', 'B', 1)).toEqual(['p2', 'p1']);
  });
  it('saves partial lineups and removals without null IDs', () => {
    expect(lineupPayload(['p1', null, null, 'p2'], 2)).toEqual({ sideA: ['p1'], sideB: ['p2'] });
    expect(lineupPayload([null, null], 1)).toEqual({ sideA: [], sideB: [] });
  });
});
