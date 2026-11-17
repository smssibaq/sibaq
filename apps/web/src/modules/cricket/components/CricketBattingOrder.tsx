import { useCallback, useMemo, useState } from 'react';
import { ArrowUp, ArrowDown } from 'lucide-react';
import { Avatar, Badge, Button } from '@/components/ui';
import type { CricketDraftAction, CricketGameDetail, CricketSide } from '../types';
import { useSetBattingOrder } from '../api';
import { useLineupDraft, usePublishDraft } from '../lineup-draft';

export function CricketBattingOrder({game,onDraftChange,side:controlledSide,onSideChange}:{game:CricketGameDetail;onDraftChange?:(action:CricketDraftAction|null)=>void;side?:CricketSide;onSideChange?:(side:CricketSide)=>void}){
  const [localSide,setLocalSide]=useState<CricketSide>('A');
  const side=controlledSide ?? localSide;
  const setSide=onSideChange ?? setLocalSide;
  const {mutate,isPending}=useSetBattingOrder(game.game_id);
  const team=useMemo(()=>game.players.filter(p=>p.attendance_status==='playing' && p.team_side===side).sort((a,b)=>a.joined_at.localeCompare(b.joined_at)),[game.players,side]);
  const saved=useMemo(()=>game.batting_order.filter(s=>s.team_side===side && team.some(p=>p.user_id===s.player_id)).sort((a,b)=>a.batting_position-b.batting_position),[game.batting_order,side,team]);
  const initial=useMemo(()=>{
    const ids=saved.map(s=>s.player_id);
    return [...ids,...team.filter(p=>!ids.includes(p.user_id)).map(p=>p.user_id)];
  },[saved,team]);
  const [order,setOrder]=useLineupDraft(initial,side,team.map(p=>p.user_id).join(','));
  const payload=useMemo(()=>order.map((player_id,i)=>({player_id,batting_position:i+1})),[order]);
  const dirty=JSON.stringify(payload)!==JSON.stringify(saved.map(({player_id,batting_position})=>({player_id,batting_position})));
  const canEdit=game.is_organizer && game.status==='scheduled';
  const save=useCallback(()=>{if(canEdit && dirty && !isPending)mutate({side,assignments:payload});},[canEdit,dirty,isPending,mutate,side,payload]);
  usePublishDraft(onDraftChange,canEdit && dirty,isPending,save);
  function move(index:number,offset:number){
    setOrder(previous=>{const next=[...previous];[next[index],next[index+offset]]=[next[index+offset],next[index]];return next;});
  }
  return <section className="space-y-4" aria-label="Batting order">
    <div className="flex flex-wrap items-center justify-between gap-2"><h3 className="font-bold">Batting order</h3>
      {controlledSide===undefined && <div className="flex gap-2">{(['A','B'] as const).map(s=><Button key={s} variant={side===s?'default':'outline'} onClick={()=>setSide(s)} disabled={isPending} aria-pressed={side===s}>Team {s}</Button>)}</div>}
    </div>
    {!team.length && <p className="rounded-lg border border-dashed border-border p-5 text-sm text-muted-foreground">No batters on Team {side}. Assign confirmed players to this side first.</p>}
    <ol className="space-y-2">{order.map((id,index)=>{
      const player=team.find(p=>p.user_id===id);if(!player)return null;
      return <li key={id} className="flex flex-wrap items-center gap-2 rounded-lg border border-border p-3">
        <span className="w-6 font-mono font-bold text-primary">{index+1}</span><Avatar src={player.avatar_url} fallback={player.name} size="sm" />
        <span className="min-w-0 flex-1 break-words text-sm font-semibold">{player.name}</span>
        {player.is_captain && <Badge variant="outline">C</Badge>}{player.is_wicketkeeper && <Badge variant="outline">WK</Badge>}
        {canEdit && <div className="flex gap-1">
          <Button size="icon" variant="outline" disabled={index===0 || isPending} aria-label={'Move '+player.name+' up'} onClick={()=>move(index,-1)}><ArrowUp className="h-4 w-4" /></Button>
          <Button size="icon" variant="outline" disabled={index===order.length-1 || isPending} aria-label={'Move '+player.name+' down'} onClick={()=>move(index,1)}><ArrowDown className="h-4 w-4" /></Button>
        </div>}
      </li>;
    })}</ol>
    {canEdit && <div className="flex flex-wrap items-center justify-between gap-2"><p role="status" className="text-xs text-muted-foreground">{dirty?'Unsaved changes':'Order saved'}</p><Button onClick={save} disabled={!dirty} isLoading={isPending}>Save order</Button></div>}
  </section>;
}
