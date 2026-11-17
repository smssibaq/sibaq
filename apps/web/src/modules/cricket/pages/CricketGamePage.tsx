import { useEffect, useState } from 'react';
import { GameLocationDetails } from '@/components/location/game-location-details';
import { Badge, Button, Card, ConfirmDialog } from '@/components/ui';
import { Skeleton } from '@/components/ui/skeleton';
import { EmptyState } from '@/components/common/empty-state';
import { ErrorState } from '@/components/common/error-state';
import { RatingsPanel } from '@/modules/ratings';
import { ExpensePanel } from '@/modules/expenses';
import { formatInTimezone } from '@/lib/dates';
import { cricketErrorMessage, useCricketGame, useSetStatus } from '../api';
import type { CricketDraftAction, CricketStatus } from '../types';
import { CricketAttendance } from '../components/CricketAttendance';
import { CricketToss } from '../components/CricketToss';
import { CricketLineupWorkspace } from '../components/CricketLineupWorkspace';
import { CricketResult } from '../components/CricketResult';
import { CricketShare } from '../components/CricketShare';
import { cricketPaths, formatFormat, useCricketNav } from '../utils';

export function CricketGamePage({gameId}:{gameId:string}){
  const go=useCricketNav();const query=useCricketGame(gameId);const status=useSetStatus(gameId);
  const [confirm,setConfirm]=useState<Exclude<CricketStatus,'in_progress'>|null>(null);
  const [actionsOpen,setActionsOpen]=useState(false);
  const [draftAction,setDraftAction]=useState<CricketDraftAction|null>(null);
  const [now,setNow]=useState(Date.now);
  useEffect(()=>{const timer=setInterval(()=>setNow(Date.now()),60000);return()=>clearInterval(timer);},[]);
  const back=<Button variant="ghost" onClick={()=>go(cricketPaths.hub)}>Back to cricket games</Button>;
  if(query.isLoading)return <div role="status" aria-label="Loading cricket game" className="mx-auto max-w-5xl space-y-4"><Skeleton className="h-40 w-full" /><Skeleton className="h-28 w-full" /><Skeleton className="h-64 w-full" /></div>;
  if(query.error)return <div className="space-y-4">{back}<ErrorState message={cricketErrorMessage(query.error)} onRetry={()=>{void query.refetch();}} isRetrying={query.isRefetching} /></div>;
  const game=query.data;
  if(!game || !gameId)return <EmptyState title="Game not found" description="This cricket game is unavailable." actionText="Back to games" onAction={()=>go(cricketPaths.hub)} />;
  const closed=game.status!=='scheduled';
  const canSeeShared=game.is_organizer || game.my_status==='playing';
  return <div className="mx-auto max-w-5xl space-y-4 pb-6">{back}
    <Card className="space-y-4 p-4 sm:p-6"><div className="flex items-start justify-between gap-3"><div className="min-w-0 space-y-2"><h1 className="break-words text-xl font-black sm:text-2xl">{game.title}</h1><div className="flex flex-wrap gap-2"><Badge variant="outline">{formatFormat(game.players_per_side,game.overs_per_innings)}</Badge><Badge variant={game.status==='cancelled'?'danger':game.status==='completed'?'secondary':'success'} className="capitalize">{game.status}</Badge>{game.is_organizer && <Badge variant="outline">Organizer</Badge>}</div></div>
      {game.is_organizer && <div className="relative shrink-0"><Button variant="outline" aria-expanded={actionsOpen} aria-controls="cricket-organizer-actions" disabled={status.isPending} onClick={()=>setActionsOpen(!actionsOpen)}>Actions</Button>
        {actionsOpen && <div id="cricket-organizer-actions" className="absolute right-0 z-30 mt-2 w-56 space-y-2 rounded-xl border border-border bg-surface p-3 shadow-lg">{([{value:'completed',label:'Mark completed'},{value:'cancelled',label:'Cancel game'},{value:'scheduled',label:'Reopen'}] as const).filter(action=>action.value!==game.status).map(action=><Button key={action.value} variant="outline" className="w-full justify-start" onClick={()=>{setActionsOpen(false);setConfirm(action.value);}}>{action.label}</Button>)}</div>}
      </div>}
    </div><div className="space-y-1 text-sm text-muted-foreground"><p>{formatInTimezone(game.starts_at)}</p><p>{game.capacity} players · {game.players_per_side} per side</p></div>{game.notes && <p className="whitespace-pre-wrap break-words border-t border-border pt-3 text-sm">{game.notes}</p>}</Card>
    <GameLocationDetails gameId={game.game_id} venue={game.venue} canEdit={game.is_organizer} />
    {closed && <p role="status" className="rounded-lg border border-border bg-surface-subtle p-4 text-sm">This game is {game.status}. Attendance and lineup editing are closed.</p>}
    <CricketAttendance game={game} />
    <CricketToss game={game} />
    <div id="cricket-lineup" className="scroll-mt-4"><CricketLineupWorkspace key={gameId} game={game} onDraftChange={setDraftAction} /></div>
    <CricketResult key={gameId} game={game} />
    {!closed && <CricketShare title={game.title} code={game.invite_code} />}
    {canSeeShared && new Date(game.starts_at).getTime()<=now && <RatingsPanel gameId={gameId} />}
    {canSeeShared && <ExpensePanel gameId={gameId} />}
    {!closed && <div className="sticky bottom-0 z-20 rounded-xl border border-border bg-surface/95 p-3 pb-[max(.75rem,env(safe-area-inset-bottom))] backdrop-blur">
      {game.is_organizer?draftAction?.dirty?<div className="flex items-center justify-between gap-3"><span className="text-sm">Unsaved lineup changes</span><Button onClick={draftAction.save} isLoading={draftAction.pending}>Save lineup</Button></div>:<a href="#cricket-lineup" className="flex min-h-11 items-center justify-center rounded-md bg-primary px-4 font-bold text-primary-foreground">Manage lineup</a>:<CricketAttendance game={game} compact />}
    </div>}
    <ConfirmDialog isOpen={confirm!==null && game.is_organizer} onClose={()=>{if(!status.isPending)setConfirm(null);}} title={confirm==='scheduled'?'Reopen this game?':confirm==='cancelled'?'Cancel this game?':'Mark game completed?'} message={confirm==='scheduled'?'Attendance and lineup editing will open again.':'Attendance and lineup editing will close. Saved lineups will remain visible.'} confirmText={confirm==='scheduled'?'Reopen':confirm==='cancelled'?'Cancel game':'Mark completed'} isDestructive={confirm==='cancelled'} isLoading={status.isPending} onConfirm={()=>{if(confirm)status.mutate(confirm,{onSettled:()=>setConfirm(null)});}} />
  </div>;
}
