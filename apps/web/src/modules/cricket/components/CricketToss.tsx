import { useState } from 'react';
import { Button, Card } from '@/components/ui';
import { useRecordToss } from '../api';
import type { CricketGameDetail, CricketSide } from '../types';
export function CricketToss({game}:{game:CricketGameDetail}){
  const mutation=useRecordToss(game.game_id);
  const [editing,setEditing]=useState(false);
  const [winner,setWinner]=useState<CricketSide>('A');
  const [decision,setDecision]=useState<'bat'|'bowl'>('bat');
  const canEdit=game.is_organizer && game.status==='scheduled';
  return <Card className="space-y-4 p-4"><div className="flex flex-wrap items-center justify-between gap-2"><h2 className="font-bold">Toss</h2>
    {canEdit && !editing && <Button variant="outline" onClick={()=>{setWinner(game.toss?.winning_team ?? 'A');setDecision(game.toss?.decision ?? 'bat');setEditing(true);}}>{game.toss?'Change toss':'Record toss'}</Button>}
  </div>
  {game.toss?<p className="text-sm">Team {game.toss.winning_team} won the toss and chose to {game.toss.decision}.</p>:<p className="text-sm text-muted-foreground">No toss recorded yet.</p>}
  {editing && canEdit && <fieldset disabled={mutation.isPending} className="space-y-3"><legend className="sr-only">Record toss</legend>
    <div className="grid grid-cols-2 gap-2">{(['A','B'] as const).map(side=><Button key={side} variant={winner===side?'default':'outline'} aria-pressed={winner===side} onClick={()=>setWinner(side)}>Team {side} won</Button>)}</div>
    <div className="grid grid-cols-2 gap-2">{(['bat','bowl'] as const).map(value=><Button key={value} variant={decision===value?'default':'outline'} aria-pressed={decision===value} onClick={()=>setDecision(value)} className="capitalize">{value} first</Button>)}</div>
    <div className="flex gap-2"><Button variant="outline" onClick={()=>setEditing(false)} disabled={mutation.isPending}>Cancel</Button><Button isLoading={mutation.isPending} onClick={()=>mutation.mutate({winning_team:winner,decision},{onSuccess:()=>setEditing(false)})}>Save toss</Button></div>
  </fieldset>}
  </Card>;
}
