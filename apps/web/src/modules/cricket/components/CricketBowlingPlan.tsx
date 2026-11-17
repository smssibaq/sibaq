import { useState } from 'react';
import { ArrowDown, ArrowUp } from 'lucide-react';
import { Button, Input, useToast } from '@/components/ui';
import type { CricketGameDetail, CricketSide } from '../types';
import { readCricketDeviceValue, saveCricketDeviceValue } from '../device-storage';
interface BowlingSlot{playerId:string;plannedOvers:number}
type BowlingPlans=Record<CricketSide,BowlingSlot[]>;
function validPlans(value:unknown):value is BowlingPlans{
  if(!value || typeof value!=='object')return false;
  return (['A','B'] as const).every(side=>side in value && Array.isArray((value as BowlingPlans)[side]) && (value as BowlingPlans)[side].every(s=>s && typeof s.playerId==='string' && Number.isInteger(s.plannedOvers) && s.plannedOvers>0));
}
export function CricketBowlingPlan({game,side:controlledSide,onSideChange}:{game:CricketGameDetail;side?:CricketSide;onSideChange?:(side:CricketSide)=>void}){
  const key='cricket:'+game.game_id+':bowling';
  const [localSide,setLocalSide]=useState<CricketSide>('A');
  const side=controlledSide ?? localSide;
  const setSide=onSideChange ?? setLocalSide;
  const [plans,setPlans]=useState<BowlingPlans>(()=>readCricketDeviceValue(key,validPlans) ?? {A:[],B:[]});
  const [saved,setSaved]=useState(()=>readCricketDeviceValue(key,validPlans)!==null);
  const {toast}=useToast();
  const team=game.players.filter(p=>p.attendance_status==='playing' && p.team_side===side);
  const plan=plans[side].filter(s=>team.some(p=>p.user_id===s.playerId));
  const canEdit=game.is_organizer && game.status==='scheduled';
  const total=plan.reduce((sum,s)=>sum+s.plannedOvers,0);
  function update(next:BowlingSlot[]){setPlans(previous=>({...previous,[side]:next}));setSaved(false);}
  function move(index:number,offset:number){const next=[...plan];[next[index],next[index+offset]]=[next[index+offset],next[index]];update(next);}
  function save(){
    if(!canEdit)return;
    if(plan.some(s=>!Number.isInteger(s.plannedOvers) || s.plannedOvers<1) || game.overs_per_innings>0 && total>game.overs_per_innings){toast.error('Check bowling plan','Use positive whole overs within the innings limit.');return;}
    const clean=Object.fromEntries((['A','B'] as const).map(s=>[s,plans[s].filter(slot=>game.players.some(p=>p.user_id===slot.playerId && p.team_side===s && p.attendance_status==='playing'))]));
    if(!validPlans(clean) || game.overs_per_innings>0 && Object.values(clean).some(slots=>slots.reduce((sum,slot)=>sum+slot.plannedOvers,0)>game.overs_per_innings)){toast.error('Check bowling plan','Both sides must use valid overs within the innings limit.');return;}
    if(saveCricketDeviceValue(key,clean)){setSaved(true);toast.success('Saved on this device');}else toast.error('Could not save','Device storage is unavailable.');
  }
  return <section className="space-y-4" aria-label="Bowling plan"><div className="flex flex-wrap items-center justify-between gap-2"><div><h3 className="font-bold">Bowling plan</h3><p role="status" className="text-xs text-muted-foreground">{saved?'Saved on this device':'Device only · Unsaved changes'}</p></div>{controlledSide===undefined && <div className="flex gap-2">{(['A','B'] as const).map(s=><Button key={s} variant={side===s?'default':'outline'} onClick={()=>setSide(s)} aria-pressed={side===s}>Team {s}</Button>)}</div>}</div>
    <p className="text-sm text-muted-foreground">{total} overs planned{game.overs_per_innings>0?' / '+game.overs_per_innings+' overs':' · No over limit'}</p>
    {!plan.length && <p className="rounded-lg border border-dashed border-border p-5 text-sm text-muted-foreground">No bowling plan saved for Team {side} on this device.</p>}
    <ol className="space-y-2">{plan.map((slot,index)=>{
      const player=team.find(p=>p.user_id===slot.playerId)!;
      return <li key={slot.playerId} className="flex flex-wrap items-center gap-2 rounded-lg border border-border p-3"><span className="min-w-0 flex-1 break-words text-sm font-semibold">{index+1}. {player.name}</span>
        {canEdit?<><label className="text-xs">Overs<Input aria-label={'Overs for '+player.name} type="number" min={1} step={1} value={slot.plannedOvers} className="w-20" onChange={e=>update(plan.map((s,i)=>i===index?{...s,plannedOvers:Number(e.target.value)}:s))} /></label>
          <Button size="icon" variant="outline" aria-label={'Move '+player.name+' up'} disabled={index===0} onClick={()=>move(index,-1)}><ArrowUp className="h-4 w-4" /></Button><Button size="icon" variant="outline" aria-label={'Move '+player.name+' down'} disabled={index===plan.length-1} onClick={()=>move(index,1)}><ArrowDown className="h-4 w-4" /></Button><Button variant="ghost" onClick={()=>update(plan.filter(s=>s.playerId!==slot.playerId))}>Remove</Button>
        </>:<span className="text-sm">{slot.plannedOvers} overs</span>}
      </li>;
    })}</ol>
    {canEdit && <><div className="flex flex-wrap gap-2">{team.filter(p=>!plan.some(s=>s.playerId===p.user_id)).map(player=><Button key={player.user_id} variant="outline" onClick={()=>update([...plan,{playerId:player.user_id,plannedOvers:1}])}>Add {player.name}</Button>)}</div><Button onClick={save}>Save bowling plan</Button></>}
  </section>;
}
