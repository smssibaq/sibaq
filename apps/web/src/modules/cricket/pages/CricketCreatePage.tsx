import { useState, type FormEvent } from 'react';
import { Button, Card, FormField, Input, Textarea, useToast } from '@/components/ui';
import { PageHeader } from '@/components/common/page-header';
import { GameLocationPicker } from '@/components/location/game-location-picker';
import { manualLocation } from '@/components/location/location-service';
import { useCreateGame } from '../api';
import { cricketPaths, useCricketNav } from '../utils';
export function CricketCreatePage(){
  const go=useCricketNav();const create=useCreateGame();const {toast}=useToast();
  const [title,setTitle]=useState(''),[venue,setVenue]=useState(''),[startsAt,setStartsAt]=useState(''),[notes,setNotes]=useState('');
  const [location,setLocation]=useState(manualLocation());
  const [format,setFormat]=useState(6),[overs,setOvers]=useState('0'),[errors,setErrors]=useState<Record<string,string>>({});
  const minStart=new Date(Date.now()+330*60000).toISOString().slice(0,16);
  function submit(event:FormEvent){
    event.preventDefault();if(create.isPending)return;
    const next:Record<string,string>={};const start=new Date(startsAt+'+05:30');const inningsOvers=Number(overs);
    if(!title.trim() || title.trim().length>80)next.title='Use a title of 1–80 characters.';
    if(!startsAt || Number.isNaN(start.getTime()) || start.getTime()<=Date.now())next.startsAt='Game must be scheduled in the future';
    if(!Number.isInteger(inningsOvers) || inningsOvers<0 || inningsOvers>50)next.overs='Overs must be a whole number from 0 to 50.';
    if(notes.length>500)next.notes='Notes must be 500 characters or fewer.';
    setErrors(next);if(Object.keys(next).length)return;
    create.mutate({title:title.trim(),venue:venue.trim(),startsAt:start.toISOString(),playersPerSide:format,oversPerInnings:inningsOvers,notes,squad:null,location},{onSuccess:id=>{toast.success('Game created','You are confirmed as Playing. Share the code to invite teammates.');go(cricketPaths.game(id));}});
  }
  return <div className="mx-auto max-w-xl space-y-4"><PageHeader title="New cricket game" description="Create a game and invite your squad by code." />
    <form onSubmit={submit} noValidate className="space-y-4"><Card className="space-y-4 p-4 sm:p-6"><fieldset className="space-y-4" disabled={create.isPending}>
      <FormField label="Game title" htmlFor="cr-title" error={errors.title} required><Input id="cr-title" value={title} maxLength={80} onChange={e=>setTitle(e.target.value)} placeholder="Sunday morning cricket" /></FormField>
      <FormField label="Date and time (IST)" htmlFor="cr-start" error={errors.startsAt} required><Input id="cr-start" type="datetime-local" min={minStart} value={startsAt} onChange={e=>setStartsAt(e.target.value)} /></FormField>
      <GameLocationPicker value={location} onChange={value=>{setLocation(value);setVenue(value.name);}} disabled={create.isPending}/>
      <fieldset className="space-y-2"><legend className="mb-2 text-sm font-semibold">Format</legend><div className="grid grid-cols-3 gap-2 sm:grid-cols-5">{[5,6,7,8,11].map(value=><Button type="button" key={value} variant={format===value?'default':'outline'} aria-pressed={format===value} onClick={()=>setFormat(value)}>{value}v{value}</Button>)}</div><p className="text-xs text-muted-foreground">Up to {format*2} confirmed players, {format} per side.</p></fieldset>
      <FormField label="Overs per innings" htmlFor="cr-overs" error={errors.overs}><Input id="cr-overs" type="number" min={0} max={50} step={1} value={overs} onChange={e=>setOvers(e.target.value)} /><p className="mt-1 text-xs text-muted-foreground">0 = no over limit</p></FormField>
      <FormField label="Notes (optional)" htmlFor="cr-notes" error={errors.notes}><Textarea id="cr-notes" maxLength={500} rows={3} value={notes} onChange={e=>setNotes(e.target.value)} /><p className="text-xs text-muted-foreground">{notes.length}/500</p></FormField>
    </fieldset></Card><div className="sticky bottom-0 flex gap-3 border-t border-border bg-surface/95 p-3 pb-[max(.75rem,env(safe-area-inset-bottom))] backdrop-blur"><Button type="button" variant="outline" className="flex-1" disabled={create.isPending} onClick={()=>go(cricketPaths.hub)}>Cancel</Button><Button type="submit" className="flex-1" isLoading={create.isPending}>Create game</Button></div></form>
  </div>;
}
