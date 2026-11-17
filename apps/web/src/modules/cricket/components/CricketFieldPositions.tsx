import { useCallback, useMemo, useState } from 'react';
import { Button } from '@/components/ui';
import type { CricketDraftAction, CricketFieldPosition, CricketGameDetail, CricketSide } from '../types';
import { useSetFieldPositions } from '../api';
import { useLineupDraft, usePublishDraft } from '../lineup-draft';
export interface FieldPositionDef {
  name: string;
  category: 'central' | 'off' | 'leg';
  x: number; // 0 to 1 normalized
  y: number; // 0 to 1 normalized
}

export const STANDARD_FIELD_POSITIONS: FieldPositionDef[] = [
  // Central
  { name: 'Wicketkeeper', category: 'central', x: 0.5, y: 0.76 },
  { name: 'Bowler', category: 'central', x: 0.5, y: 0.24 },
  { name: 'Short Leg', category: 'central', x: 0.42, y: 0.68 },
  { name: 'Short Midwicket', category: 'central', x: 0.38, y: 0.55 },

  // Off Side
  { name: 'Slip', category: 'off', x: 0.58, y: 0.78 },
  { name: 'Second Slip', category: 'off', x: 0.63, y: 0.75 },
  { name: 'Third Slip', category: 'off', x: 0.68, y: 0.72 },
  { name: 'Gully', category: 'off', x: 0.73, y: 0.67 },
  { name: 'Point', category: 'off', x: 0.8, y: 0.5 },
  { name: 'Backward Point', category: 'off', x: 0.78, y: 0.6 },
  { name: 'Cover', category: 'off', x: 0.75, y: 0.38 },
  { name: 'Extra Cover', category: 'off', x: 0.68, y: 0.28 },
  { name: 'Mid Off', category: 'off', x: 0.58, y: 0.28 },
  { name: 'Long Off', category: 'off', x: 0.64, y: 0.12 },

  // Leg Side
  { name: 'Square Leg', category: 'leg', x: 0.2, y: 0.5 },
  { name: 'Deep Square Leg', category: 'leg', x: 0.12, y: 0.55 },
  { name: 'Fine Leg', category: 'leg', x: 0.38, y: 0.84 },
  { name: 'Deep Fine Leg', category: 'leg', x: 0.3, y: 0.92 },
  { name: 'Midwicket', category: 'leg', x: 0.26, y: 0.38 },
  { name: 'Deep Midwicket', category: 'leg', x: 0.16, y: 0.3 },
  { name: 'Mid On', category: 'leg', x: 0.42, y: 0.28 },
  { name: 'Long On', category: 'leg', x: 0.36, y: 0.12 },
];


const PRESETS={
  attacking:['Wicketkeeper','Bowler','Slip','Second Slip','Gully','Short Leg','Point','Cover','Mid Off','Mid On','Midwicket'],
  balanced:['Wicketkeeper','Bowler','Slip','Point','Cover','Mid Off','Mid On','Midwicket','Square Leg','Fine Leg','Long Off'],
  defensive:['Wicketkeeper','Bowler','Long Off','Long On','Deep Midwicket','Deep Square Leg','Deep Fine Leg','Cover','Point','Mid Off','Mid On'],
};
const clamp=(n:number)=>Math.round(Math.max(0,Math.min(100,n))*100)/100;
export function CricketFieldPositions({game,onDraftChange}:{game:CricketGameDetail;onDraftChange?:(action:CricketDraftAction|null)=>void}){
  const [side,setSide]=useState<CricketSide>('A');
  const [selected,setSelected]=useState<string|null>(null);
  const {mutate,isPending}=useSetFieldPositions(game.game_id);
  const team=useMemo(()=>game.players.filter(p=>p.attendance_status==='playing' && p.team_side===side),[game.players,side]);
  const source=useMemo<CricketFieldPosition[]>(()=>game.field_positions.filter(s=>s.team_side===side && team.some(p=>p.user_id===s.player_id)).sort((a,b)=>a.player_id.localeCompare(b.player_id)).map(s=>{
    const standard=STANDARD_FIELD_POSITIONS.find(p=>p.name===s.position_name);
    return {player_id:s.player_id,position_name:s.position_name,x_pos:clamp(s.x_pos ?? (standard?.x ?? .5)*100),y_pos:clamp(s.y_pos ?? (standard?.y ?? .5)*100),is_custom:s.is_custom};
  }),[game.field_positions,side,team]);
  const [positions,setPositions]=useLineupDraft(source,side,team.map(p=>p.user_id).join(','));
  const selectedId=team.some(p=>p.user_id===selected)?selected:null;
  const canEdit=game.is_organizer && game.status==='scheduled';
  const dirty=JSON.stringify(positions)!==JSON.stringify(source);
  const save=useCallback(()=>{if(canEdit && dirty && !isPending)mutate({side,positions});},[canEdit,dirty,isPending,mutate,side,positions]);
  usePublishDraft(onDraftChange,canEdit && dirty,isPending,save);
  function place(name:string,x:number,y:number,custom=false){
    if(!canEdit || isPending || !selectedId)return;
    setPositions(previous=>[...previous.filter(p=>p.player_id!==selectedId),{player_id:selectedId,position_name:name,x_pos:clamp(x),y_pos:clamp(y),is_custom:custom}]);
    setSelected(null);
  }
  function preset(key:keyof typeof PRESETS){
    if(!canEdit || isPending)return;
    setPositions(team.map((player,index)=>{
      const standard=STANDARD_FIELD_POSITIONS.find(p=>p.name===PRESETS[key][index])!;
      return {player_id:player.user_id,position_name:standard.name,x_pos:standard.x*100,y_pos:standard.y*100,is_custom:false};
    }));
    setSelected(null);
  }
  return <section aria-label="Field positions" className="space-y-4">
    <div className="flex flex-wrap items-center justify-between gap-2"><h3 className="font-bold">Field placements</h3><div className="flex gap-2">{(['A','B'] as const).map(s=><Button key={s} variant={side===s?'default':'outline'} disabled={isPending} onClick={()=>{setSide(s);setSelected(null);}} aria-pressed={side===s}>Team {s}</Button>)}</div></div>
    {canEdit && <div className="flex flex-wrap gap-2">{(Object.keys(PRESETS) as Array<keyof typeof PRESETS>).map(key=><Button key={key} variant="outline" disabled={!team.length || isPending} onClick={()=>preset(key)} className="capitalize">{key}</Button>)}</div>}
    {!team.length && <p className="rounded-lg border border-dashed border-border p-5 text-sm text-muted-foreground">No teams yet. Tap Auto balance or assign players.</p>}
    <svg viewBox="0 0 100 100" role="img" aria-label={'Team '+side+' fielding ground'} className="mx-auto block w-full max-w-md rounded-2xl bg-[#0B1F19] touch-manipulation" onClick={event=>{
      if(!selectedId)return;
      const rect=event.currentTarget.getBoundingClientRect();
      place('Custom spot',(event.clientX-rect.left)/rect.width*100,(event.clientY-rect.top)/rect.height*100,true);
    }}>
      <ellipse cx="50" cy="50" rx="46" ry="44" fill="#132E26" stroke="#B7F34B" strokeWidth=".5" />
      <ellipse cx="50" cy="50" rx="27" ry="24" fill="none" stroke="#B7F34B" strokeDasharray="1 1" opacity=".4" />
      <rect x="46" y="32" width="8" height="36" fill="#735D3F" rx="1" />
      <path d="M44 36H56M44 64H56" stroke="white" strokeWidth=".6" />
      {canEdit && selectedId && STANDARD_FIELD_POSITIONS.map(spot=><g key={spot.name} onClick={event=>{event.stopPropagation();place(spot.name,spot.x*100,spot.y*100);}} className="cursor-pointer"><circle cx={spot.x*100} cy={spot.y*100} r="3" fill="#B7F34B" fillOpacity=".3" stroke="#B7F34B" strokeWidth=".3" /><title>{spot.name}</title></g>)}
      {positions.map(spot=>{
        const player=team.find(p=>p.user_id===spot.player_id);if(!player)return null;
        return <g key={spot.player_id} onClick={event=>{event.stopPropagation();if(canEdit && !isPending)setSelected(spot.player_id);}} className={canEdit?'cursor-pointer':''}>
          <circle cx={spot.x_pos} cy={spot.y_pos} r="6" fill="transparent" />
          <circle cx={spot.x_pos} cy={spot.y_pos} r="4" fill={selectedId===spot.player_id?'#B7F34B':'#132E26'} stroke="#B7F34B" strokeWidth=".5" />
          <text x={spot.x_pos} y={spot.y_pos+1} textAnchor="middle" fill={selectedId===spot.player_id?'#0B1F19':'white'} fontSize="3" fontWeight="bold">{player.name.slice(0,2).toUpperCase()}</text>
          <text x={spot.x_pos} y={Math.min(98,spot.y_pos+7)} textAnchor="middle" fill="white" fontSize="2.5">{spot.position_name}</text><title>{player.name+': '+spot.position_name}</title>
        </g>;
      })}
    </svg>
    <ul className="space-y-2">{team.map(player=>{
      const spot=positions.find(p=>p.player_id===player.user_id);
      return <li key={player.user_id} className="flex flex-wrap items-center justify-between gap-2 rounded-lg border border-border p-3"><span className="min-w-0 break-words text-sm"><strong>{player.name}</strong> · {spot?.position_name || 'Not placed'}</span>
        {canEdit && <div className="flex gap-2"><Button variant={selectedId===player.user_id?'default':'outline'} disabled={isPending} onClick={()=>setSelected(player.user_id)}>Place</Button>{spot && <Button variant="ghost" disabled={isPending} onClick={()=>setPositions(previous=>previous.filter(p=>p.player_id!==player.user_id))}>Remove</Button>}</div>}
      </li>;
    })}</ul>
    {canEdit && selectedId && <div className="space-y-2"><p className="text-sm text-primary">Tap a spot on the ground or choose a position below.</p><div className="flex flex-wrap gap-2">{STANDARD_FIELD_POSITIONS.map(spot=><Button variant="outline" key={spot.name} disabled={isPending} onClick={()=>place(spot.name,spot.x*100,spot.y*100)}>{spot.name}</Button>)}</div></div>}
    {canEdit && <div className="flex flex-wrap items-center justify-between gap-2"><p role="status" className="text-xs text-muted-foreground">{dirty?'Unsaved changes':'Field saved'}</p><Button onClick={save} disabled={!dirty} isLoading={isPending}>Save field</Button></div>}
  </section>;
}
