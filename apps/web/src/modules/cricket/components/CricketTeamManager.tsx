import { useState } from 'react';
import { Avatar, Badge, Button, Card, ConfirmDialog, useToast } from '@/components/ui';
import type { CricketGameDetail, CricketPlayer, CricketSide } from '../types';
import { useAutoBalance, useSetCaptain, useSetTeam, useSetWicketkeeper } from '../api';

export function CricketTeamManager({game}:{game:CricketGameDetail}){
  const [confirm,setConfirm]=useState(false);
  const team=useSetTeam(game.game_id),captain=useSetCaptain(game.game_id),keeper=useSetWicketkeeper(game.game_id),balance=useAutoBalance(game.game_id);
  const {toast}=useToast();
  const confirmed=game.players.filter(p=>p.attendance_status==='playing');
  const canEdit=game.is_organizer && game.status==='scheduled';
  const busy=team.isPending || captain.isPending || keeper.isPending || balance.isPending;
  function move(player:CricketPlayer,side:CricketSide|null){
    if(!canEdit)return;
    team.mutate({userId:player.user_id,side},{onSuccess:()=>{
      if(player.team_side && player.team_side!==side)toast.success('Captain/WK cleared','Their batting slot and field placement were also cleared.');
    }});
  }
  return <Card className="space-y-4 p-4 sm:p-5">
    <div className="flex flex-wrap items-center justify-between gap-2"><h2 className="text-lg font-bold">Teams</h2>
      {canEdit && <Button variant="outline" onClick={()=>setConfirm(true)} disabled={busy || confirmed.length<2}>Auto balance</Button>}
    </div>
    {!confirmed.some(p=>p.team_side) && <p className="text-sm text-muted-foreground">No teams yet. Tap Auto balance or assign players.</p>}
    <div className="grid gap-3 sm:grid-cols-2">{(['A','B',null] as const).map(side=>{
      const players=confirmed.filter(p=>p.team_side===side);
      return <section key={side ?? 'unassigned'} className={'space-y-3 rounded-xl border border-border bg-surface-subtle p-3 '+(side?'':'sm:col-span-2')}>
        <h3 className="font-bold">{side?'Team '+side:'Unassigned'} <span className="text-sm font-normal text-muted-foreground">({players.length}{side?'/'+game.players_per_side:''})</span></h3>
        {!players.length && <p className="text-sm text-muted-foreground">{side?'No players assigned.':'All confirmed players have a team.'}</p>}
        {players.map(player=><div key={player.user_id} className="space-y-2 rounded-lg border border-border bg-surface p-3">
          <div className="flex items-center gap-2"><Avatar src={player.avatar_url} fallback={player.name} size="sm" /><span className="min-w-0 flex-1 break-words text-sm font-semibold">{player.name}</span>
            {player.is_captain && <Badge variant="outline">C</Badge>}{player.is_wicketkeeper && <Badge variant="outline">WK</Badge>}
          </div>
          {canEdit && <div className="flex flex-wrap gap-2">
            {(['A','B'] as const).filter(target=>target!==side).map(target=><Button key={target} variant="outline" disabled={busy || confirmed.filter(p=>p.team_side===target).length>=game.players_per_side} onClick={()=>move(player,target)}>To {target}</Button>)}
            {side && <>
              <Button variant={player.is_captain?'default':'outline'} aria-pressed={player.is_captain} aria-label={(player.is_captain?'Clear captain: ':'Make captain: ')+player.name} disabled={busy} onClick={()=>captain.mutate({userId:player.is_captain?null:player.user_id,side})}>C</Button>
              <Button variant={player.is_wicketkeeper?'default':'outline'} aria-pressed={player.is_wicketkeeper} aria-label={(player.is_wicketkeeper?'Clear wicketkeeper: ':'Make wicketkeeper: ')+player.name} disabled={busy} onClick={()=>keeper.mutate({userId:player.is_wicketkeeper?null:player.user_id,side})}>WK</Button>
              <Button variant="ghost" disabled={busy} onClick={()=>move(player,null)}>Remove</Button>
            </>}
          </div>}
        </div>)}
      </section>;
    })}</div>
    <ConfirmDialog isOpen={confirm && canEdit} onClose={()=>{if(!busy)setConfirm(false);}} title="Auto balance teams?"
      message="This resets teams, captains, batting order and field placements. Wicketkeepers are also cleared."
      confirmText="Reset and balance" isDestructive isLoading={balance.isPending}
      onConfirm={()=>balance.mutate(undefined,{onSettled:()=>setConfirm(false)})} />
  </Card>;
}
