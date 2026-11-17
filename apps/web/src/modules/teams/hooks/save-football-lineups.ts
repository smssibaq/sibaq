import { supabase } from '@/infrastructure/supabase/client';
import type { Json } from '@/types/database.types';
import type { FootballDrafts } from './football-player-actions';
export async function saveFootballLineups(matchId: string, drafts: FootballDrafts) {
  const payload = Object.entries(drafts).map(([teamId, draft]) => ({ team_id: teamId, formation: draft.formation, expected_revision: draft.revision,
    positions: draft.players.map(p => ({ user_id: p.userId, position: p.isSubstitute ? 'SUB' : p.positionLabel, is_substitute: p.isSubstitute,
      x: !p.isSubstitute && p.coordinate ? p.coordinate.x / 100 : null, y: !p.isSubstitute && p.coordinate ? p.coordinate.y / 100 : null })),
  }));
  const { error } = await supabase.rpc('football_save_lineups', { p_match: matchId, p_teams: payload as unknown as Json });
  if (error) {
    if (error.code === 'PGRST202') throw new Error('Run the football_popup_lineups SQL migration before saving.');
    throw error;
  }
}
