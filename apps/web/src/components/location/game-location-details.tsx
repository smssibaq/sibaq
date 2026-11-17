import { useState } from 'react';
import { useMutation,useQuery,useQueryClient } from '@tanstack/react-query';
import { MapPin,ExternalLink,Pencil } from 'lucide-react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Dialog } from '@/components/ui/dialog';
import { useToast } from '@/components/ui/toast';
import { normalizeError } from '@/lib/errors';
import { GameLocationPicker } from './game-location-picker';
import { getGameLocation,saveGameLocation,manualLocation,hasCoordinates,directionsUrl,type GameLocation } from './location-service';
export function GameLocationDetails({gameId,venue,canEdit=false}:{gameId:string;venue:string|null;canEdit?:boolean}){
 const cache=useQueryClient(),{toast}=useToast();const [open,setOpen]=useState(false),[draft,setDraft]=useState<GameLocation>(manualLocation(venue??''));
 const query=useQuery({queryKey:['game-location',gameId],queryFn:()=>getGameLocation(gameId)});const value=query.data??manualLocation(venue??'');
 const save=useMutation({mutationFn:()=>saveGameLocation(gameId,draft),onSuccess:async()=>{await Promise.all([cache.invalidateQueries({queryKey:['game-location',gameId]}),cache.invalidateQueries({queryKey:['matches']}),cache.invalidateQueries({queryKey:['badminton']}),cache.invalidateQueries({queryKey:['cricket']}),cache.invalidateQueries({queryKey:['volleyball']})]);setOpen(false);toast.success('Location saved');},onError:error=>toast.error('Location not saved',normalizeError(error).message)});
 const lat=value.latitude??0,lng=value.longitude??0;
 return <Card className="space-y-3 p-4"><div className="flex items-start gap-2"><MapPin className="mt-0.5 h-4 w-4 shrink-0 text-primary"/><div className="min-w-0 flex-1"><h2 className="break-words text-sm font-bold">{value.name||'Venue to be confirmed'}</h2>{value.address&&<p className="break-words text-xs text-muted-foreground">{value.address}</p>}</div>{canEdit&&<Button size="sm" variant="ghost" onClick={()=>{setDraft(value);setOpen(true);}}><Pencil className="mr-1 h-3 w-3"/>Edit location</Button>}</div>
 {hasCoordinates(value)&&<iframe title="Selected game location" loading="lazy" className="h-36 w-full rounded-xl border border-border" src={`https://www.openstreetmap.org/export/embed.html?bbox=${lng-.005}%2C${lat-.003}%2C${lng+.005}%2C${lat+.003}&layer=mapnik&marker=${lat}%2C${lng}`} />}
 {value.name&&<a href={directionsUrl(value)} target="_blank" rel="noopener noreferrer" className="inline-flex min-h-11 items-center gap-2 text-xs font-semibold text-primary"><ExternalLink className="h-4 w-4"/>Open in Maps</a>}{query.error&&<p role="alert" className="text-xs text-warning">{normalizeError(query.error).message}</p>}
 <Dialog isOpen={open} title="Edit game location" onClose={()=>{if(!save.isPending)setOpen(false);}}><div className="space-y-4"><GameLocationPicker value={draft} onChange={setDraft} disabled={save.isPending}/><Button className="w-full" disabled={!draft.name.trim()} isLoading={save.isPending} onClick={()=>save.mutate()}>Save location</Button></div></Dialog></Card>;
}
