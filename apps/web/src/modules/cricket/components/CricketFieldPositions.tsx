import { useCallback, useId, useMemo, useRef, useState } from 'react';
import { ArrowRightLeft, Crown, Crosshair, Shield, Users, Wand2 } from 'lucide-react';
import { Avatar, Badge, Button } from '@/components/ui';
import type { CricketDraftAction, CricketFieldPosition, CricketGameDetail, CricketSide } from '../types';
import { useSetCaptain, useSetFieldPositions, useSetTeam, useSetWicketkeeper } from '../api';
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
function pointOnGround(x:number,y:number){
  const dx=(x-50)/44,dy=(y-50)/42,scale=Math.max(1,Math.hypot(dx,dy));
  return {x:Math.round((50+dx/scale*44)*100)/100,y:Math.round((50+dy/scale*42)*100)/100};
}
export function CricketFieldPositions({game,onDraftChange,side:controlledSide,onSideChange,onManageTeams}:{game:CricketGameDetail;onDraftChange?:(action:CricketDraftAction|null)=>void;side?:CricketSide;onSideChange?:(side:CricketSide)=>void;onManageTeams?:()=>void}){
  const [localSide,setLocalSide]=useState<CricketSide>('A');
  const side=controlledSide ?? localSide,setSide=onSideChange ?? setLocalSide;
  const [selected,setSelected]=useState<string|null>(null);
  const [preview,setPreview]=useState<{id:string;x:number;y:number}|null>(null);
  const drag=useRef<{id:string;startX:number;startY:number;moved:boolean}|null>(null);
  const swallowClick=useRef(false);
  const svg=useRef<SVGSVGElement|null>(null);
  const grassId='cricket-grass-'+useId().replace(/:/g,'');
  const {mutate,isPending}=useSetFieldPositions(game.game_id);
  const moveTeam=useSetTeam(game.game_id),captain=useSetCaptain(game.game_id),keeper=useSetWicketkeeper(game.game_id);
  const busy=isPending || moveTeam.isPending || captain.isPending || keeper.isPending;
  const team=useMemo(()=>game.players.filter(p=>p.attendance_status==='playing' && p.team_side===side),[game.players,side]);
  const source=useMemo<CricketFieldPosition[]>(()=>game.field_positions.filter(s=>s.team_side===side && team.some(p=>p.user_id===s.player_id)).sort((a,b)=>a.player_id.localeCompare(b.player_id)).map(s=>{
    const standard=STANDARD_FIELD_POSITIONS.find(p=>p.name===s.position_name);
    return {player_id:s.player_id,position_name:s.position_name,x_pos:s.x_pos ?? (standard?.x ?? .5)*100,y_pos:s.y_pos ?? (standard?.y ?? .5)*100,is_custom:s.is_custom};
  }),[game.field_positions,side,team]);
  const [positions,setPositions]=useLineupDraft(source,side,team.map(p=>p.user_id).join(','));
  const selectedPlayer=team.find(p=>p.user_id===selected);
  const canEdit=game.is_organizer && game.status==='scheduled';
  const dirty=JSON.stringify(positions)!==JSON.stringify(source);
  const save=useCallback(()=>{if(canEdit && dirty && !busy)mutate({side,positions});},[canEdit,dirty,busy,mutate,side,positions]);
  usePublishDraft(onDraftChange,canEdit && dirty,busy,save);
  function placePlayer(id:string,x:number,y:number,name?:string){
    if(!canEdit || busy || !team.some(p=>p.user_id===id))return;
    const point=pointOnGround(x,y);
    const nearest=STANDARD_FIELD_POSITIONS.reduce((best,p)=>Math.hypot(p.x*100-point.x,p.y*100-point.y)<Math.hypot(best.x*100-point.x,best.y*100-point.y)?p:best);
    const named=name || (Math.hypot(nearest.x*100-point.x,nearest.y*100-point.y)<7?nearest.name:'Custom spot');
    setPositions(previous=>[...previous.filter(p=>p.player_id!==id),{player_id:id,position_name:named,x_pos:point.x,y_pos:point.y,is_custom:named==='Custom spot'}]);
    setSelected(id);
  }
  function pointerPoint(clientX:number,clientY:number){
    const rect=svg.current!.getBoundingClientRect();return pointOnGround((clientX-rect.left)/rect.width*100,(clientY-rect.top)/rect.height*100);
  }
  function preset(key:keyof typeof PRESETS){
    if(!canEdit || busy)return;
    const wicketkeeper=team.find(p=>p.is_wicketkeeper);
    const ordered=wicketkeeper?[wicketkeeper,...team.filter(p=>p.user_id!==wicketkeeper.user_id)]:team;
    setPositions(ordered.map((player,index)=>{const standard=STANDARD_FIELD_POSITIONS.find(p=>p.name===PRESETS[key][index % PRESETS[key].length])!;return {player_id:player.user_id,position_name:standard.name,x_pos:standard.x*100,y_pos:standard.y*100,is_custom:false};}));
    setSelected(null);
  }
  const unassigned=game.players.filter(p=>p.attendance_status==='playing' && !p.team_side);
  const otherSide:CricketSide=side==='A'?'B':'A';
  return <section aria-label={'Team '+side+' tactical field'} className="space-y-4">
    <div className="flex flex-wrap items-center justify-between gap-3"><div><h3 className="flex items-center gap-2 text-base font-black"><Crosshair className="h-4 w-4 text-primary" />Team {side} · Fielding plan</h3><p className="mt-1 text-xs text-muted-foreground">{canEdit?'Drag a fielder, or pick a player and tap the ground. Save when ready.':'The organizer’s saved field placements.'}</p></div><Badge variant={dirty?'warning':'outline'}>{positions.length}/{team.length} placed{dirty?' · Unsaved':''}</Badge>
      {controlledSide===undefined && <div className="flex gap-2">{(['A','B'] as const).map(s=><Button key={s} variant={side===s?'default':'outline'} disabled={busy} onClick={()=>setSide(s)}>Team {s}</Button>)}</div>}
    </div>
    {canEdit && <div className="flex flex-wrap items-center gap-2 rounded-xl border border-border bg-surface-subtle p-2"><span className="inline-flex items-center gap-1 px-2 text-[10px] font-bold uppercase tracking-wider text-muted-foreground"><Wand2 className="h-3.5 w-3.5" />Quick field</span>{(Object.keys(PRESETS) as Array<keyof typeof PRESETS>).map(key=><Button key={key} variant="outline" className="capitalize" disabled={!team.length || busy} onClick={()=>preset(key)}>{key}</Button>)}</div>}
    <div className="grid items-start gap-4 md:grid-cols-[minmax(0,1fr)_240px]">
      <div className="overflow-hidden rounded-2xl border border-[#294B3B] bg-[#0B1F19] p-2 sm:p-4">
        <div className="mb-1 flex items-center justify-between px-2 text-[9px] font-bold uppercase tracking-[.16em] text-[#A3B6AA]"><span>Team {side} · {team.length} fielders</span><span>Right-hand batter</span></div>
        <svg ref={svg} viewBox="0 0 100 100" role="img" aria-label={'Team '+side+' cricket ground. Select and drag fielders to reposition.'} className="block aspect-square w-full select-none touch-none"
          onPointerMove={event=>{const active=drag.current;if(!active)return;if(Math.hypot(event.clientX-active.startX,event.clientY-active.startY)>4)active.moved=true;if(active.moved){const point=pointerPoint(event.clientX,event.clientY);setPreview({id:active.id,...point});}}}
          onPointerUp={event=>{const active=drag.current;if(!active)return;drag.current=null;if(active.moved){const point=pointerPoint(event.clientX,event.clientY);placePlayer(active.id,point.x,point.y);swallowClick.current=true;}setPreview(null);}}
          onPointerCancel={()=>{drag.current=null;setPreview(null);}}
          onClick={event=>{if(swallowClick.current){swallowClick.current=false;return;}if(selectedPlayer){const point=pointerPoint(event.clientX,event.clientY);placePlayer(selectedPlayer.user_id,point.x,point.y);}}}
          onDragOver={event=>{if(canEdit && !busy)event.preventDefault();}}
          onDrop={event=>{event.preventDefault();const id=event.dataTransfer.getData('text/plain');if(team.some(p=>p.user_id===id)){const point=pointerPoint(event.clientX,event.clientY);placePlayer(id,point.x,point.y);}}}>
          <defs><radialGradient id={grassId}><stop offset="0%" stopColor="#285C3E" /><stop offset="100%" stopColor="#143727" /></radialGradient><clipPath id={grassId+'-boundary'}><ellipse cx="50" cy="50" rx="46" ry="44" /></clipPath></defs>
          <ellipse cx="50" cy="50" rx="47" ry="45" fill="#132E26" stroke="#54745D" strokeWidth=".6" />
          <ellipse cx="50" cy="50" rx="46" ry="44" fill={'url(#'+grassId+')'} />
          <g clipPath={'url(#'+grassId+'-boundary)'} opacity=".12">{[10,26,42,58,74,90].map(x=><rect key={x} x={x} y="4" width="8" height="92" fill="#B7F34B" />)}</g>
          <ellipse cx="50" cy="50" rx="28" ry="25" fill="none" stroke="#C8D7AF" strokeWidth=".4" strokeDasharray="1 1" opacity=".55" />
          <rect x="46.5" y="34" width="7" height="32" rx="1" fill="#B19B70" /><rect x="47" y="35" width="6" height="30" fill="#CAB58C" opacity=".55" />
          <path d="M44 38H56M44 62H56M47 35V39M53 35V39M47 61V65M53 61V65" fill="none" stroke="#F5F7F4" strokeWidth=".5" />
          <path d="M49 36V38M50 36V38M51 36V38M49 62V64M50 62V64M51 62V64" stroke="#B7F34B" strokeWidth=".5" />
          <text x="9" y="51" fill="#9FBAA8" fontSize="2.5" letterSpacing=".7">LEG</text><text x="85" y="51" fill="#9FBAA8" fontSize="2.5" letterSpacing=".7">OFF</text>
          {canEdit && selectedPlayer && STANDARD_FIELD_POSITIONS.map(spot=><g key={spot.name} className="cursor-crosshair" onClick={event=>{event.stopPropagation();placePlayer(selectedPlayer.user_id,spot.x*100,spot.y*100,spot.name);}}><circle cx={spot.x*100} cy={spot.y*100} r="4" fill="#B7F34B" fillOpacity=".08" stroke="#B7F34B" strokeWidth=".25" strokeDasharray=".5 .5" /><title>{spot.name}</title></g>)}
          {positions.map(spot=>{const player=team.find(p=>p.user_id===spot.player_id);if(!player)return null;const x=preview?.id===player.user_id?preview.x:spot.x_pos,y=preview?.id===player.user_id?preview.y:spot.y_pos;const active=selectedPlayer?.user_id===player.user_id;
            return <g key={player.user_id} role={canEdit?'button':undefined} tabIndex={canEdit?0:undefined} aria-label={player.name+', '+spot.position_name} className={canEdit?'cursor-grab active:cursor-grabbing outline-none':''}
              onPointerDown={event=>{if(!canEdit || busy)return;event.preventDefault();event.stopPropagation();event.currentTarget.setPointerCapture(event.pointerId);setSelected(player.user_id);drag.current={id:player.user_id,startX:event.clientX,startY:event.clientY,moved:false};}}
              onKeyDown={event=>{if(canEdit && (event.key==='Enter' || event.key===' ')){event.preventDefault();setSelected(player.user_id);}}}
              onClick={event=>{event.stopPropagation();if(swallowClick.current){swallowClick.current=false;return;}if(canEdit && !busy)setSelected(player.user_id);}}>
              <circle cx={x} cy={y} r="6" fill="transparent" />{active && <circle cx={x} cy={y} r="5.6" fill="none" stroke="#B7F34B" strokeWidth=".45" />}
              <circle cx={x} cy={y} r="4.4" fill={active?'#B7F34B':player.is_wicketkeeper?'#1F7180':'#132E26'} stroke={active?'#B7F34B':'#B8CAB6'} strokeWidth=".45" />
              <foreignObject x={x-4.1} y={y-4.1} width="8.2" height="8.2" pointerEvents="none"><Avatar userId={player.user_id} src={player.avatar_url} alt={player.name} fallback={player.name} className="h-full w-full border-0 bg-[#132E26] text-white" style={{fontSize:'3px'}} /></foreignObject>
              <circle cx={x+3.6} cy={y+3.4} r="1.9" fill={active?'#B7F34B':'#F5F7F4'} stroke="#132E26" strokeWidth=".3" /><text x={x+3.6} y={y+4.1} textAnchor="middle" fill="#0B1F19" fontSize="2" fontWeight="900">{team.findIndex(p=>p.user_id===player.user_id)+1}</text>
              <text x={Math.max(12,Math.min(88,x))} y={Math.min(96,y+8)} textAnchor="middle" fill="#FFFFFF" fontSize="2.8" fontWeight="700" paintOrder="stroke" stroke="#0B1F19" strokeWidth="1.1">{player.name.split(' ')[0].slice(0,14)}</text><title>{player.name+' · '+spot.position_name}</title>
            </g>;
          })}
        </svg>
        <p className="py-2 text-center text-[10px] text-[#9FBAA8]">{selectedPlayer?'Selected: '+selectedPlayer.name+' · Tap a position or drag the marker':'Boundary · Inner ring · Pitch'}</p>
      </div>
      <aside className="space-y-3"><div className="flex items-center justify-between"><h4 className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Team {side} fielders</h4><span className="text-xs text-muted-foreground">{team.length}/{game.players_per_side}</span></div>
        {!team.length && <div className="space-y-3 rounded-xl border border-dashed border-border p-4 text-sm text-muted-foreground"><Users className="h-7 w-7 text-primary" /><p>Start with your teams. Auto balance the confirmed players, then choose a field.</p>{canEdit && onManageTeams && <Button onClick={onManageTeams}>Set up teams</Button>}</div>}
        <div className="grid grid-cols-2 gap-2 md:grid-cols-1">{team.map(player=>{const spot=positions.find(p=>p.player_id===player.user_id);const active=selectedPlayer?.user_id===player.user_id;return <button key={player.user_id} type="button" draggable={canEdit && !busy} onDragStart={event=>{event.dataTransfer.setData('text/plain',player.user_id);event.dataTransfer.effectAllowed='move';}} disabled={!canEdit || busy} onClick={()=>setSelected(player.user_id)} className={'flex min-h-16 items-center gap-2 rounded-xl border p-2.5 text-left transition-colors disabled:opacity-100 '+(active?'border-primary bg-primary/10':'border-border bg-surface hover:bg-surface-subtle')}><Avatar userId={player.user_id} src={player.avatar_url} alt={player.name} fallback={player.name} size="sm" className="h-9 w-9 border-2 border-border" /><span className="min-w-0 flex-1"><span className="block truncate text-xs font-bold">{player.name}</span><span className="block truncate text-[10px] text-muted-foreground">{spot?.position_name || 'Tap to place on ground'}</span></span>{player.is_captain && <Crown className="h-3 w-3 shrink-0 text-primary" />}{player.is_wicketkeeper && <Shield className="h-3 w-3 shrink-0 text-primary" />}</button>;})}</div>
      </aside>
    </div>
    {selectedPlayer && canEdit && <div className="space-y-3 rounded-xl border border-primary/30 bg-primary/5 p-3"><div className="flex items-center gap-2"><Avatar userId={selectedPlayer.user_id} alt={selectedPlayer.name} src={selectedPlayer.avatar_url} fallback={selectedPlayer.name} size="sm" /><div className="min-w-0 flex-1"><p className="truncate text-sm font-bold">{selectedPlayer.name}</p><p className="text-xs text-muted-foreground">Choose a named position or drag anywhere inside the boundary.</p></div><Button variant="ghost" onClick={()=>setSelected(null)}>Done</Button></div>
      <div className="flex gap-2 overflow-x-auto pb-2">{STANDARD_FIELD_POSITIONS.map(spot=><Button key={spot.name} variant="outline" className="shrink-0" disabled={busy} onClick={()=>placePlayer(selectedPlayer.user_id,spot.x*100,spot.y*100,spot.name)}>{spot.name}</Button>)}</div>
      <div className="flex flex-wrap gap-2 border-t border-border pt-3"><Button variant={selectedPlayer.is_captain?'default':'outline'} disabled={busy} onClick={()=>captain.mutate({userId:selectedPlayer.is_captain?null:selectedPlayer.user_id,side})}><Crown className="mr-1 h-3.5 w-3.5" />Captain</Button><Button variant={selectedPlayer.is_wicketkeeper?'default':'outline'} disabled={busy} onClick={()=>keeper.mutate({userId:selectedPlayer.is_wicketkeeper?null:selectedPlayer.user_id,side})}><Shield className="mr-1 h-3.5 w-3.5" />WK</Button><Button variant="outline" disabled={busy || game.players.filter(p=>p.team_side===otherSide && p.attendance_status==='playing').length>=game.players_per_side} onClick={()=>moveTeam.mutate({userId:selectedPlayer.user_id,side:otherSide})}><ArrowRightLeft className="mr-1 h-3.5 w-3.5" />To Team {otherSide}</Button><Button variant="ghost" disabled={busy} onClick={()=>setPositions(previous=>previous.filter(p=>p.player_id!==selectedPlayer.user_id))}>Unplace</Button><Button variant="ghost" disabled={busy} onClick={()=>moveTeam.mutate({userId:selectedPlayer.user_id,side:null})}>Move to bench</Button></div>
    </div>}
    {canEdit && unassigned.length>0 && <div className="space-y-2 rounded-xl border border-dashed border-border p-3"><p className="text-xs font-bold text-muted-foreground">Available · {unassigned.length} confirmed players without a team</p><div className="flex flex-wrap gap-2">{unassigned.map(player=><Button key={player.user_id} variant="outline" disabled={busy || team.length>=game.players_per_side} onClick={()=>moveTeam.mutate({userId:player.user_id,side})}>+ {player.name}</Button>)}</div></div>}
  </section>;
}
