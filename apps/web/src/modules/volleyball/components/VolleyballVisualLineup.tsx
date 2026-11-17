import { useQuery, useQueryClient } from '@tanstack/react-query';
import { SportLineupBoard } from '@/components/lineup/sport-lineup-board';
import { volleyballApi, volleyballKeys } from '../api';
import type { VolleyballGameDetail } from '@/types/sports/volleyball.db';
export function VolleyballVisualLineup({ game }: { game: VolleyballGameDetail }) {
 const cache = useQueryClient();
 const query = useQuery({ queryKey: [...volleyballKeys.detail(game.game_id), 'lineup-layout'], queryFn: () => volleyballApi.getLineupLayout(game.game_id), retry: false });
 return <SportLineupBoard key={game.game_id} sport="volleyball" capacity={game.players_per_side} canEdit={game.is_organizer && !['completed','cancelled'].includes(game.status)} players={game.players.map(p => ({ id: p.user_id, name: p.name, avatar: p.avatar_url, status: p.attendance_status, side: p.team_side }))} layout={query.data ?? []} storageReady={query.isSuccess} onSave={async rows => { await volleyballApi.saveLineupLayout(game.game_id,rows); await cache.invalidateQueries({ queryKey: volleyballKeys.detail(game.game_id) }); }} />;
}
