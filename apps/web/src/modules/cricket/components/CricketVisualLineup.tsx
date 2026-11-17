import { useQuery, useQueryClient } from '@tanstack/react-query';
import { SportLineupBoard } from '@/components/lineup/sport-lineup-board';
import { cricketApi, cricketKeys } from '../api';
import type { CricketGameDetail } from '../types';
export function CricketVisualLineup({ game }: { game: CricketGameDetail }) {
 const cache = useQueryClient();
 const query = useQuery({ queryKey: [...cricketKeys.detail(game.game_id), 'lineup-layout'], queryFn: () => cricketApi.getLineupLayout(game.game_id), retry: false });
 return <SportLineupBoard key={game.game_id} sport="cricket" capacity={game.players_per_side} canEdit={game.is_organizer && !['completed','cancelled'].includes(game.status)} players={game.players.map(p => ({ id: p.user_id, name: p.name, avatar: p.avatar_url, status: p.attendance_status, side: p.team_side }))} layout={query.data ?? []} storageReady={query.isSuccess} onSave={async rows => { await cricketApi.saveLineupLayout(game.game_id,rows); await cache.invalidateQueries({ queryKey: cricketKeys.detail(game.game_id) }); }} />;
}
