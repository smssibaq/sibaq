import { useState, type FormEvent } from 'react';
import { Button, Card, Input, useToast } from '@/components/ui';
import type { CricketGameDetail } from '../types';
import { readCricketDeviceValue, saveCricketDeviceValue } from '../device-storage';
export interface CricketMatchScore{
  teamARuns:number;teamAWickets:number;teamAOvers:number;
  teamBRuns:number;teamBWickets:number;teamBOvers:number;summaryText:string;
}
function validScore(value:unknown):value is CricketMatchScore{
  if(!value || typeof value!=='object')return false;
  const score=value as CricketMatchScore;
  return ['teamARuns','teamAWickets','teamAOvers','teamBRuns','teamBWickets','teamBOvers'].every(key=>typeof score[key as keyof CricketMatchScore]==='number' && Number.isFinite(score[key as keyof CricketMatchScore]) && Number(score[key as keyof CricketMatchScore])>=0) && typeof score.summaryText==='string';
}
const emptyScore:CricketMatchScore={teamARuns:0,teamAWickets:0,teamAOvers:0,teamBRuns:0,teamBWickets:0,teamBOvers:0,summaryText:''};
export function CricketResult({game}:{game:CricketGameDetail}){
  const key='cricket:'+game.game_id+':result';
  const [result,setResult]=useState(()=>readCricketDeviceValue(key,validScore));
  const [draft,setDraft]=useState<CricketMatchScore>(result ?? emptyScore);
  const [editing,setEditing]=useState(false);
  const {toast}=useToast();
  function save(event:FormEvent){
    event.preventDefault();if(!game.is_organizer)return;
    if(!validScore(draft) || !Number.isInteger(draft.teamARuns) || !Number.isInteger(draft.teamBRuns) || !Number.isInteger(draft.teamAWickets) || !Number.isInteger(draft.teamBWickets) || draft.teamAWickets>game.players_per_side || draft.teamBWickets>game.players_per_side || [draft.teamAOvers,draft.teamBOvers].some(overs=>Math.round(overs*10)%10>5 || Math.abs(overs*10-Math.round(overs*10))>.000001 || game.overs_per_innings>0 && overs>game.overs_per_innings)){
      toast.error('Check score','Use valid runs, wickets and overs (balls 0–5) within this game’s limits.');return;
    }
    if(saveCricketDeviceValue(key,draft)){setResult({...draft});setEditing(false);toast.success('Saved on this device');}else toast.error('Could not save','Device storage is unavailable.');
  }
  return <Card className="space-y-4 p-4"><div className="flex flex-wrap items-center justify-between gap-2"><div><h2 className="font-bold">Scorecard and result</h2><p className="text-xs text-muted-foreground">{result?'Saved on this device':'Device only · No result saved'}</p></div>
    {game.is_organizer && !editing && <Button variant="outline" onClick={()=>{setDraft(result ?? emptyScore);setEditing(true);}}>{result?'Edit score':'Record score'}</Button>}
  </div>
  {result && (!editing || !game.is_organizer) && <div className="space-y-2"><div className="grid grid-cols-2 gap-3">{(['A','B'] as const).map(side=><div key={side} className="rounded-lg border border-border bg-surface-subtle p-3"><h3 className="text-sm font-semibold">Team {side}</h3><p className="text-xl font-bold">{side==='A'?result.teamARuns:result.teamBRuns}/{side==='A'?result.teamAWickets:result.teamBWickets}</p><p className="text-xs text-muted-foreground">{side==='A'?result.teamAOvers:result.teamBOvers} overs</p></div>)}</div>{result.summaryText && <p className="break-words text-sm font-semibold">{result.summaryText}</p>}</div>}
  {!result && (!editing || !game.is_organizer) && <p className="text-sm text-muted-foreground">No result recorded on this device. Scores are not shared with other devices.</p>}
  {editing && game.is_organizer && <form onSubmit={save} className="space-y-4"><div className="grid gap-3 sm:grid-cols-2">{(['A','B'] as const).map(side=><fieldset key={side} className="space-y-3 rounded-lg border border-border p-3"><legend className="px-1 font-bold">Team {side}</legend><div className="grid grid-cols-3 gap-2">{(['Runs','Wickets','Overs'] as const).map(stat=>{
    const field=('team'+side+stat) as Exclude<keyof CricketMatchScore,'summaryText'>;
    return <label key={stat} className="text-xs">{stat}<Input aria-label={'Team '+side+' '+stat} type="number" min={0} step={stat==='Overs'?'.1':'1'} required value={draft[field]} onChange={e=>setDraft({...draft,[field]:Number(e.target.value)})} /></label>;
  })}</div></fieldset>)}</div><label className="block space-y-1 text-sm">Result summary (optional)<Input value={draft.summaryText} maxLength={160} placeholder="e.g. Team B won by 3 wickets" onChange={e=>setDraft({...draft,summaryText:e.target.value})} /></label><div className="flex gap-2"><Button type="button" variant="outline" onClick={()=>setEditing(false)}>Cancel</Button><Button type="submit">Save result</Button></div></form>}
  </Card>;
}
