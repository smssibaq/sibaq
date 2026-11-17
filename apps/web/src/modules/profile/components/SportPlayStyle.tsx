import { Badge } from '@/components/ui/badge';
import { useToast } from '@/components/ui/toast';
import type { SkillLevel, PlayerSportInput, SportCatalogItem } from '../types';
const skills:Array<{key:SkillLevel;label:string}>=[{key:'beginner',label:'Beginner'},{key:'casual',label:'Casual'},{key:'intermediate',label:'Intermediate'},{key:'advanced',label:'Advanced'}];
export function SportPlayStyle({catalog,value,onChange,disabled}: {
  catalog:SportCatalogItem[];value:PlayerSportInput[];onChange:(sports:PlayerSportInput[])=>void;disabled?:boolean;
}) {
  const {toast}=useToast();
  const update=(item:PlayerSportInput)=>onChange(value.map(s=>s.sport===item.sport?item:s));
  return <section aria-label="How you play" className="space-y-4">
    {value.map(item=>{
      const sport=catalog.find(s=>s.key===item.sport);if(!sport)return null;
      return <fieldset key={item.sport} className="space-y-4 rounded-xl border border-border bg-surface p-4" disabled={disabled}>
        <legend className="px-1 font-bold">{sport.emoji} {sport.name} {item.is_primary && <Badge variant="outline">Primary</Badge>}</legend>
        <div role="group" aria-label={sport.name+' skill level'} className="flex flex-wrap gap-2">
          {skills.map(skill=><button key={skill.key} type="button" aria-pressed={item.skill_level===skill.key} onClick={()=>update({...item,skill_level:skill.key})}
            className={'min-h-11 rounded-full border px-3 text-sm font-medium focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary '+(item.skill_level===skill.key?'border-primary bg-primary text-primary-foreground':'border-border bg-surface-subtle text-foreground')}>
            {skill.label}</button>)}
        </div>
        {sport.roles.length>0 && <div className="space-y-2">
          <p className="text-sm text-muted-foreground">{sport.role_label} · optional · pick up to {sport.max_roles}. First selected is your main role.</p>
          <div role="group" aria-label={sport.name+' '+sport.role_label} className="flex flex-wrap gap-2">
            {sport.roles.map(role=>{
              const index=item.roles.indexOf(role.key);
              return <button key={role.key} type="button" aria-pressed={index>=0} onClick={()=>{
                if(index>=0)update({...item,roles:item.roles.filter(r=>r!==role.key)});
                else if(item.roles.length<sport.max_roles)update({...item,roles:[...item.roles,role.key]});
                else toast.warning('Role limit','Pick at most '+sport.max_roles+' for '+sport.name);
              }} className={'flex min-h-11 items-center gap-2 rounded-full border px-3 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary '+(index>=0?'border-primary bg-primary/10 text-primary':'border-border text-foreground')}>
                {role.label}{index>=0 && <Badge variant="outline">{index===0?'Main':index===1?'2nd':(index+1)+'th'}</Badge>}
              </button>;
            })}
          </div>
        </div>}
      </fieldset>;
    })}
  </section>;
}
