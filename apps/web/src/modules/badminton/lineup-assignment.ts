import type { BadmintonSide } from '@/types/sports/badminton.db';

export type LineupSlots = (string | null)[];

// Badminton's RSVP table uses 'in'; football's 'playing' is not a badminton status.
export function confirmedPlayers<T extends { userId: string; status: string }>(players: T[]): T[] {
  return players.filter(player => player.status === 'in');
}

export function cleanSlots(slots: LineupSlots, confirmedIds: string[], perSide: number): LineupSlots {
  const allowed = new Set(confirmedIds);
  const seen = new Set<string>();
  return Array.from({ length: perSide * 2 }, (_, index) => {
    const id = slots[index];
    if (!id || !allowed.has(id) || seen.has(id)) return null;
    seen.add(id);
    return id;
  });
}

// Moving onto an occupied court position swaps its occupant back to the source.
export function placePlayer(slots: LineupSlots, playerId: string, target: number): LineupSlots {
  if (target < 0 || target >= slots.length) return slots;
  const next = [...slots];
  const source = next.indexOf(playerId);
  if (source === target) return slots;
  if (source >= 0) next[source] = next[target];
  next[target] = playerId;
  return next;
}

export function assignSide(slots: LineupSlots, playerId: string, side: BadmintonSide, perSide: number): LineupSlots | null {
  const start = side === 'A' ? 0 : perSide;
  if (slots.slice(start, start + perSide).includes(playerId)) return slots;
  const target = slots.findIndex((id, index) => index >= start && index < start + perSide && !id);
  // A full opposing team swaps its first position with an already assigned player.
  if (target < 0) return slots.includes(playerId) ? placePlayer(slots, playerId, start) : null;
  return placePlayer(slots, playerId, target);
}

export function lineupPayload(slots: LineupSlots, perSide: number) {
  return {
    sideA: slots.slice(0, perSide).filter((id): id is string => id !== null),
    sideB: slots.slice(perSide, perSide * 2).filter((id): id is string => id !== null),
  };
}

export interface CourtPosition { x: number; y: number }
export interface LineupDraft { slots: LineupSlots; bench: string[]; positions?: Record<string, CourtPosition> }
export function cleanLineup(draft: LineupDraft, players: { userId: string; status: string }[], perSide: number): LineupDraft {
  const slots = cleanSlots(draft.slots, confirmedPlayers(players).map(p => p.userId), perSide);
  const active = new Set(slots.filter(Boolean));
  const eligible = new Set(players.filter(p => p.status === 'in' || p.status === 'maybe').map(p => p.userId));
  const bench = [...new Set([...draft.bench, ...players.filter(p => p.status === 'maybe').map(p => p.userId)])].filter(id => eligible.has(id) && !active.has(id));
  return { slots, bench, ...(draft.positions ? { positions: Object.fromEntries(Object.entries(draft.positions).filter(([id]) => active.has(id))) } : {}) };
}
export function moveLineupPlayer(draft: LineupDraft, player: { userId: string; status: string }, target: 'A' | 'B' | 'bench' | 'remove', perSide: number): LineupDraft | null {
  if (player.status !== 'in' && !(player.status === 'maybe' && target === 'bench')) return null;
  if (target === 'A' || target === 'B') {
    const slots = assignSide(draft.slots, player.userId, target, perSide);
    return slots ? { ...draft, slots, bench: draft.bench.filter(id => id !== player.userId) } : null;
  }
  return {
    ...draft,
    slots: draft.slots.map(id => id === player.userId ? null : id),
    bench: [...draft.bench.filter(id => id !== player.userId), ...(target === 'bench' ? [player.userId] : [])],
  };
}

// Reject full teams instead of silently swapping a player chosen only by a half-court drop.
export function dropLineupPlayer(draft: LineupDraft, player: { userId: string; status: string }, target: 'A' | 'B' | 'bench', perSide: number, position?: CourtPosition): LineupDraft | null {
  if (player.status !== 'in') return null;
  if (target === 'bench') return moveLineupPlayer(draft, player, target, perSide);
  const start = target === 'A' ? 0 : perSide;
  if (!draft.slots.slice(start, start + perSide).includes(player.userId) && draft.slots.slice(start, start + perSide).every(Boolean)) return null;
  const next = moveLineupPlayer(draft, player, target, perSide);
  if (!next) return null;
  const positions = { ...draft.positions }; delete positions[player.userId];
  if (position) positions[player.userId] = { x: Math.max(.16, Math.min(.84, position.x)), y: target === 'A' ? Math.max(.12, Math.min(.4, position.y)) : Math.max(.6, Math.min(.88, position.y)) };
  return { ...next, positions };
}
