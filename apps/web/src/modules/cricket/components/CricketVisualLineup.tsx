import { SportLineupBoard } from '@/components/lineup/sport-lineup-board';
import { ErrorState } from '@/components/common/error-state';
import { Skeleton } from '@/components/ui/skeleton';
import { cricketErrorMessage, useCricketLayout, useSaveCricketLayout } from '../api';
import type { CricketGameDetail } from '../types';
export function CricketVisualLineup({game}:{game:CricketGameDetail}){
  const query=useCricketLayout(game.game_id);
  const save=useSaveCricketLayout(game.game_id);
  if(query.isPending)return <Skeleton className="h-64 w-full" aria-label="Loading visual lineup" />;
  if(query.error)return <ErrorState message={cricketErrorMessage(query.error)} onRetry={()=>{void query.refetch();}} />;
  return <SportLineupBoard key={game.game_id} sport="cricket" capacity={game.players_per_side} canEdit={game.is_organizer && game.status==='scheduled'} players={game.players.map(p=>({id:p.user_id,name:p.name,avatar:p.avatar_url,status:p.attendance_status,side:p.team_side}))} layout={query.data ?? []} storageReady={query.isSuccess} onSave={rows=>save.mutateAsync(rows)} />;
}
