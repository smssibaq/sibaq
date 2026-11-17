import { Badge, Button, Card, StatusBadge } from '@/components/ui';
import { formatInTimezone } from '@/lib/dates';
import type { CricketGameSummary } from '../types';
import { useJoinByCode, useSetAttendance } from '../api';
import { cricketPaths, formatFormat, useCricketNav } from '../utils';
export function CricketGameCard({game,onClick}:{game:CricketGameSummary;onClick?:()=>void}){
  const go=useCricketNav(),join=useJoinByCode(),attendance=useSetAttendance(game.game_id);
  const closed=game.status!=='scheduled';const busy=join.isPending || attendance.isPending;
  async function joinGame(){try{await join.mutateAsync(game.invite_code);await attendance.mutateAsync('playing');go(cricketPaths.game(game.game_id));}catch{/* Mutation hooks show the server's message. */}}
  return <Card className="space-y-3 p-4"><div className="flex flex-wrap items-start justify-between gap-2"><h3 className="min-w-0 flex-1 break-words font-bold"><a href={cricketPaths.game(game.game_id)} className="focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary" onClick={event=>{event.preventDefault();if(onClick)onClick();else go(cricketPaths.game(game.game_id));}}>{game.title}</a></h3><Badge variant="outline">{formatFormat(game.players_per_side,game.overs_per_innings)}</Badge></div>
    <div className="space-y-1 text-sm text-muted-foreground"><p>{formatInTimezone(game.starts_at)}</p>{game.venue && <p className="break-words">{game.venue}</p>}</div>
    <div className="space-y-2"><p className="text-sm">{game.confirmed_count}/{game.capacity} confirmed</p><div role="progressbar" aria-label="Game capacity" aria-valuenow={game.confirmed_count} aria-valuemin={0} aria-valuemax={game.capacity} className="h-2 overflow-hidden rounded-full bg-secondary"><div className="h-full bg-primary" style={{width:Math.min(100,game.confirmed_count/game.capacity*100)+'%'}} /></div></div>
    <div className="flex flex-wrap items-center gap-2"><Badge variant="outline">{game.is_organizer?'Hosting':game.my_status?'Joined':'Squad game'}</Badge>{game.my_status && <StatusBadge status={game.my_status} />}{closed && <Badge variant="secondary" className="capitalize">{game.status}</Badge>}</div>
    <div className="flex gap-2"><Button variant="outline" className="flex-1" onClick={()=>{if(onClick)onClick();else go(cricketPaths.game(game.game_id));}}>Open game</Button>{game.my_status===null && !closed && <Button className="flex-1" isLoading={busy} disabled={game.confirmed_count>=game.capacity} onClick={()=>{void joinGame();}}>Join</Button>}</div>
  </Card>;
}
