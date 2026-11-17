import { describe, expect, it } from 'vitest';
import { moveFootballPlayer, type FootballDrafts } from './football-player-actions';
import type { FormationPlayer, Team } from '../types';
import { useFormationStore } from '../store/use-formation-store';
const teams: Team[] = ['a', 'b'].map((id, index) => ({ id, matchId: 'match', name: `Team ${id}`, side: index === 0 ? 'A' : 'B', color: '#fff', formation: '1-2-1', revision: index + 3, players: [] }));
const player: FormationPlayer = { userId: 'p1', teamId: 'a', positionLabel: 'MID', isSubstitute: false, coordinate: { x: 40, y: 45 } };
const initial = (): FootballDrafts => ({ a: { players: [player], formation: '1-2-1', revision: 3 }, b: { players: [], formation: '1-2-1', revision: 4 } });
describe('football popup moves', () => {
  it('moves A -> B -> Bench -> A locally, preserving revisions and other players', () => {
    let drafts = initial();
    const original = JSON.stringify(drafts);
    drafts = moveFootballPlayer(drafts, player, 'b', teams, 5);
    expect(drafts.a.players).toHaveLength(0);
    expect(drafts.b.players[0].coordinate).toEqual(player.coordinate);
    drafts = moveFootballPlayer(drafts, drafts.b.players[0], 'bench', teams, 5);
    expect(drafts.b.players[0]).toMatchObject({ isSubstitute: true, coordinate: null });
    drafts = moveFootballPlayer(drafts, drafts.b.players[0], 'a', teams, 5);
    expect(drafts.a.players[0].isSubstitute).toBe(false);
    expect(drafts.b.players).toHaveLength(0);
    expect(drafts.a.revision).toBe(3); expect(drafts.b.revision).toBe(4);
    expect(JSON.stringify(initial())).toBe(original);
  });
  it.each([5, 6, 7])('rejects over-capacity %sv%s teams', capacity => {
    const drafts = initial();
    drafts.b.players = Array.from({ length: capacity }, (_, i) => ({ ...player, userId: `other${i}`, teamId: 'b' }));
    expect(() => moveFootballPlayer(drafts, player, 'b', teams, capacity)).toThrow('full');
    expect(drafts.a.players).toHaveLength(1);
  });
  it('supports single-team bench and removal without membership/RSVP changes', () => {
    const drafts = { a: initial().a };
    expect(() => moveFootballPlayer(drafts, player, 'b', teams.slice(0, 1), 5)).toThrow('unavailable');
    expect(moveFootballPlayer(drafts, player, 'remove', teams.slice(0, 1), 5).a.players).toEqual([]);
    expect(player.teamId).toBe('a');
  });
  it('does not auto-promote saved substitutes or change saved coordinates on load', () => {
    const substitute = { ...player, isSubstitute: true, coordinate: null, positionLabel: 'SUB' };
    useFormationStore.getState().hydrateFromServer({ ...teams[0], players: [substitute] }, 5);
    expect(useFormationStore.getState().draftPlayers).toEqual([substitute]);
    expect(useFormationStore.getState().isDirty).toBe(false);
  });
});
