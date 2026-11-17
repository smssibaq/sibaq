import { useState } from 'react';
import { useAuth } from '@/modules/auth/auth-provider';
import { Button, Card, ConfirmDialog } from '@/components/ui';
import type { CricketAttendance as Status, CricketGameDetail } from '../types';
import { useSetAttendance } from '../api';

export function CricketAttendance({game,compact=false}:{game:CricketGameDetail;compact?:boolean}){
  const mutation=useSetAttendance(game.game_id);
  const {user}=useAuth();
  const [confirm,setConfirm]=useState<Status|null>(null);
  const playing=game.players.filter(p=>p.attendance_status==='playing').length;
  const current=game.players.find(p=>p.user_id===user?.id);
  const closed=game.status!=='scheduled';
  const full=playing>=game.capacity && game.my_status!=='playing';
  function choose(status:Status){
    if(closed || mutation.isPending || game.my_status===status)return;
    if(game.my_status==='playing' && current?.team_side && status!=='playing'){setConfirm(status);return;}
    mutation.mutate(status);
  }
  // Squad viewers must become game members before changing their RSVP.
  // The same mutation handles both RPC errors and refreshes all related queries.
  const content=<>
    {!compact && <div className="space-y-2"><p className="text-sm font-semibold">{playing}/{game.capacity} confirmed</p><div role="progressbar" aria-label="Confirmed players" aria-valuenow={playing} aria-valuemax={game.capacity} aria-valuemin={0} className="h-2 overflow-hidden rounded-full bg-secondary"><div className="h-full bg-primary" style={{width:Math.min(100,playing/game.capacity*100)+'%'}} /></div></div>}
    <div className="grid grid-cols-3 gap-2">{([{value:'playing',label:'Playing'},{value:'maybe',label:'Maybe'},{value:'not_playing',label:'Not playing'}] as const).map(option=><Button key={option.value} variant={game.my_status===option.value?'default':'outline'} aria-pressed={game.my_status===option.value} disabled={closed || mutation.isPending || option.value==='playing' && full} onClick={()=>choose(option.value)} className="min-h-11 px-2 text-xs sm:text-sm">{option.value==='playing' && full?'Full':option.label}</Button>)}</div>
    {!compact && full && !closed && <p className="text-xs text-muted-foreground">Full · Pick Maybe to stay in the loop.</p>}
    <ConfirmDialog isOpen={confirm!==null && !closed} onClose={()=>setConfirm(null)} title="Change attendance?" message={"You'll be removed from Team "+current?.team_side+'. Your batting slot and field placement will also be cleared.'} confirmText="Change RSVP" isLoading={mutation.isPending} onConfirm={()=>{if(confirm)mutation.mutate(confirm,{onSettled:()=>setConfirm(null)});}} />
  </>;
  return compact?<div className="space-y-2">{content}</div>:<Card className="space-y-4 p-4"><h2 className="font-bold">Your RSVP</h2>{content}</Card>;
}
