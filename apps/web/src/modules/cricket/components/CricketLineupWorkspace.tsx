import { useCallback, useEffect, useState } from 'react';
import { Activity, Compass, ListOrdered, Users, Shield, Crown } from 'lucide-react';
import { Badge, Button, Card } from '@/components/ui';
import type { CricketDraftAction, CricketGameDetail, CricketSide } from '../types';
import { CricketBattingOrder } from './CricketBattingOrder';
import { CricketBowlingPlan } from './CricketBowlingPlan';
import { CricketFieldPositions } from './CricketFieldPositions';
import { CricketTeamManager } from './CricketTeamManager';
import { CricketSubstituteBench } from './CricketSubstituteBench';

export type LineupSection='fielding'|'batting'|'bowling'|'squad';
const SECTIONS=[{key:'fielding',label:'Set the field',Icon:Compass},{key:'batting',label:'Batting XI',Icon:ListOrdered},{key:'bowling',label:'Bowling',Icon:Activity},{key:'squad',label:'Teams',Icon:Users}] as const;
export function CricketLineupWorkspace({game,onDraftChange}:{game:CricketGameDetail;onDraftChange?:(action:CricketDraftAction|null)=>void}){
  const [section,setSection]=useState<LineupSection>('fielding');
  const [side,setSide]=useState<CricketSide>(()=>game.toss?(game.toss.decision==='bowl'?game.toss.winning_team:game.toss.winning_team==='A'?'B':'A'):'A');
  const [fieldAction,setFieldAction]=useState<CricketDraftAction|null>(null);
  const [battingAction,setBattingAction]=useState<CricketDraftAction|null>(null);
  const saveAll=useCallback(()=>{if(fieldAction?.dirty)fieldAction.save();if(battingAction?.dirty)battingAction.save();},[fieldAction,battingAction]);
  useEffect(()=>{onDraftChange?.({dirty:Boolean(fieldAction?.dirty || battingAction?.dirty),pending:Boolean(fieldAction?.pending || battingAction?.pending),save:saveAll});return()=>onDraftChange?.(null);},[fieldAction,battingAction,onDraftChange,saveAll]);
  const switchSide=(next:CricketSide)=>{
    if(next===side || fieldAction?.pending || battingAction?.pending)return;
    if(game.is_organizer && game.status==='scheduled' && (fieldAction?.dirty || battingAction?.dirty))saveAll();
    setSide(next);
  };
  const players=game.players.filter(p=>p.attendance_status==='playing' && p.team_side===side);
  const captain=players.find(p=>p.is_captain),keeper=players.find(p=>p.is_wicketkeeper);
  const fieldingSide=game.toss?(game.toss.decision==='bowl'?game.toss.winning_team:game.toss.winning_team==='A'?'B':'A'):null;
  const pending=Boolean(fieldAction?.pending || battingAction?.pending);
  return <Card className="overflow-hidden border-border p-0">
    <header className="space-y-5 border-b border-border bg-surface-subtle p-4 sm:p-6">
      <div className="flex flex-wrap items-start justify-between gap-3"><div><p className="mb-1 text-[10px] font-bold uppercase tracking-[.2em] text-primary">Cricket · Matchday tactics</p><h2 className="text-xl font-black sm:text-2xl">Build your game plan</h2><p className="mt-1 text-xs text-muted-foreground">Two teams. One ground. Every position with a purpose.</p></div><Badge variant="outline">{game.players_per_side} a side · {game.overs_per_innings || 'Open'}{game.overs_per_innings?' overs':''}</Badge></div>
      <div className="grid grid-cols-2 gap-3">{(['A','B'] as const).map(team=>{
        const count=game.players.filter(p=>p.attendance_status==='playing' && p.team_side===team).length;
        return <button type="button" key={team} aria-pressed={side===team} disabled={pending} onClick={()=>switchSide(team)} className={'flex min-h-20 items-center justify-between rounded-xl border-2 p-3 text-left transition-colors sm:p-4 '+(side===team?'border-primary bg-primary/10':'border-border bg-surface hover:border-primary/40')}><span><span className="block text-lg font-black">Team {team}</span><span className="text-xs text-muted-foreground">{fieldingSide===team?'Fielding first':fieldingSide?'Batting first':'Pick your playing side'}</span></span><span className={'flex h-11 w-11 items-center justify-center rounded-full text-sm font-bold '+(side===team?'bg-primary text-primary-foreground':'bg-surface-subtle text-muted-foreground')}>{count}/{game.players_per_side}</span></button>;
      })}</div>
      <div className="flex flex-wrap gap-x-5 gap-y-2 text-xs text-muted-foreground"><span className="inline-flex items-center gap-1.5"><Crown className="h-3.5 w-3.5 text-primary" />{captain?.name || 'No captain selected'}</span><span className="inline-flex items-center gap-1.5"><Shield className="h-3.5 w-3.5 text-primary" />{keeper?.name || 'No wicketkeeper selected'}</span></div>
    </header>
    <nav aria-label="Cricket tactics" className="grid grid-cols-4 border-b border-border bg-surface">{SECTIONS.map(({key,label,Icon})=><button key={key} type="button" aria-current={section===key?'page':undefined} onClick={()=>setSection(key)} className={'flex min-h-16 flex-col items-center justify-center gap-1 border-b-2 px-1 text-[10px] font-bold transition-colors sm:text-xs '+(section===key?'border-primary bg-primary/5 text-primary':'border-transparent text-muted-foreground hover:bg-surface-subtle')}><Icon className="h-4 w-4" />{label}{key==='fielding' && fieldAction?.dirty || key==='batting' && battingAction?.dirty?<span className="h-1 w-1 rounded-full bg-primary" aria-label="Unsaved changes" />:null}</button>)}</nav>
    <div className="p-3 sm:p-5">
      <div hidden={section!=='fielding'}><CricketFieldPositions game={game} side={side} onSideChange={switchSide} onDraftChange={setFieldAction} onManageTeams={()=>setSection('squad')} /></div>
      <div hidden={section!=='batting'}><CricketBattingOrder game={game} side={side} onSideChange={switchSide} onDraftChange={setBattingAction} /></div>
      <div hidden={section!=='bowling'}><CricketBowlingPlan game={game} side={side} onSideChange={switchSide} /></div>
      <div hidden={section!=='squad'} className="space-y-4"><CricketTeamManager game={game} /><CricketSubstituteBench game={game} /></div>
    </div>
    {game.is_organizer && game.status==='scheduled' && <footer className="flex flex-wrap items-center justify-between gap-3 border-t border-border bg-surface-subtle p-4"><p className="text-xs text-muted-foreground">{fieldAction?.dirty || battingAction?.dirty?'Unsaved changes · Save before leaving':'Switching teams saves pending field and batting edits'}</p><Button onClick={saveAll} disabled={!fieldAction?.dirty && !battingAction?.dirty} isLoading={pending}>Save tactics</Button></footer>}
  </Card>;
}
