import { Star, Check } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import type { PlayerSportInput, SportCatalogItem } from '../types';

export function SportPicker({catalog,value,onChange,disabled}: {
  catalog:SportCatalogItem[]; value:PlayerSportInput[]; onChange:(sports:PlayerSportInput[])=>void; disabled?:boolean;
}) {
  function toggle(sport:SportCatalogItem) {
    const exists=value.some(s=>s.sport===sport.key);
    const next=exists?value.filter(s=>s.sport!==sport.key):[...value,{sport:sport.key,skill_level:'casual' as const,roles:[],is_primary:value.length===0}];
    if(next.length && !next.some(s=>s.is_primary))next[0]={...next[0],is_primary:true};
    onChange(next);
  }
  return <section className="space-y-3" aria-label="Choose your sports">
    <p className="text-sm text-muted-foreground">Pick at least one. Star your main sport. Coming-soon sports are selectable too.</p>
    <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
      {catalog.map(sport=>{
        const selected=value.find(s=>s.sport===sport.key);
        return <div key={sport.key} className={'flex items-center gap-2 rounded-xl border p-3 '+(selected?'border-primary bg-primary/10':'border-border bg-surface')}>
          <button type="button" aria-pressed={Boolean(selected)} disabled={disabled} onClick={()=>toggle(sport)}
            className="flex min-h-11 min-w-0 flex-1 items-center gap-3 rounded-lg text-left focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary disabled:opacity-50">
            <span className="text-3xl" aria-hidden="true">{sport.emoji || '🎯'}</span>
            <span className="flex min-w-0 flex-1 flex-col items-start gap-1"><span className="font-bold">{sport.name}</span>
              {!sport.is_enabled && <Badge variant="secondary">Coming soon</Badge>}
              {selected?.is_primary && <span className="text-xs text-primary">Primary sport</span>}
            </span>
            {selected && <Check className="h-4 w-4 shrink-0 text-primary" />}
          </button>
          <button type="button" aria-label={'Make '+sport.name+' your primary sport'} aria-pressed={Boolean(selected?.is_primary)}
            disabled={disabled} onClick={()=>{
              const next=selected?value:[...value,{sport:sport.key,skill_level:'casual' as const,roles:[],is_primary:false}];
              onChange(next.map(s=>({...s,is_primary:s.sport===sport.key})));
            }} className="flex h-11 w-11 shrink-0 items-center justify-center rounded-lg text-primary hover:bg-primary/10 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary disabled:opacity-50">
            <Star className="h-5 w-5" fill={selected?.is_primary?'currentColor':'none'} />
          </button>
        </div>;
      })}
    </div>
  </section>;
}
