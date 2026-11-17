import type { FormationPlayer, Team } from '../types';
import { findPresetForFormat, formatFromPlayersPerTeam } from '../presets';
export interface FootballDraft { players: FormationPlayer[]; formation: string; revision: number }
export type FootballDrafts = Record<string, FootballDraft>;
export function moveFootballPlayer(drafts: FootballDrafts, player: FormationPlayer, target: string | 'bench' | 'remove', teams: Team[], capacity: number): FootballDrafts {
  const next = Object.fromEntries(Object.entries(drafts).map(([id, value]) => [id, { ...value, players: value.players.filter(p => p.userId !== player.userId) }]));
  if (target === 'remove') return next;
  const targetId = target === 'bench' ? player.teamId || teams[0]?.id : target;
  const team = teams.find(t => t.id === targetId);
  if (!team || !next[targetId]) throw new Error('This team is unavailable.');
  if (target === 'bench') {
    next[targetId].players.push({ ...player, teamId: targetId, isSubstitute: true, coordinate: null, positionLabel: 'SUB' });
    return next;
  }
  const starters = next[targetId].players.filter(p => !p.isSubstitute);
  if (starters.length >= capacity) throw new Error('This team is full. Move a player to the bench first.');
  const occupied = (x: number, y: number) => starters.some(p => p.coordinate && Math.hypot(p.coordinate.x - x, p.coordinate.y - y) < 9);
  const hasGK = starters.some(p => p.positionLabel.toUpperCase() === 'GK');
  const preset = findPresetForFormat(formatFromPlayersPerTeam(capacity), next[targetId].formation);
  const free = preset.positions.find(p => !(hasGK && p.label === 'GK') && !occupied(p.x, p.y));
  const keep = player.coordinate && !occupied(player.coordinate.x, player.coordinate.y) && !(hasGK && player.positionLabel.toUpperCase() === 'GK');
  if (!keep && !free) throw new Error('No formation position is available.');
  next[targetId].players.push({ ...player, teamId: targetId, isSubstitute: false, coordinate: keep ? { ...player.coordinate! } : { x: free!.x, y: free!.y }, positionLabel: keep ? player.positionLabel : free!.label });
  return next;
}
