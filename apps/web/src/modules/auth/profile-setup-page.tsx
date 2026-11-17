import { useState, type FormEvent } from 'react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { useToast } from '@/components/ui/toast';
import { AboutStep } from '@/modules/profile/components/AboutStep';
import { SportPicker } from '@/modules/profile/components/SportPicker';
import { SportPlayStyle } from '@/modules/profile/components/SportPlayStyle';
import { useProfileEditor } from '@/modules/profile/use-profile-editor';
import { profileErrorMessage, validateAbout } from '@/modules/profile/api';
import { sanitizeReturnUrl } from './auth-provider';

const steps=['About you','Your sports','How you play'];
export function ProfileSetupPage() {
  const [step,setStep]=useState(0);
  const editor=useProfileEditor();
  const {draft,setDraft,catalog,busy,setUploading}=editor;
  const {toast}=useToast();
  const params=new URLSearchParams(window.location.search);
  const target=sanitizeReturnUrl(params.get('redirect') || params.get('returnUrl'));
  const returnUrl=['/profile/setup','/login','/auth/callback'].includes(target.split(/[?#]/)[0])?'/dashboard':target;
  async function submit(event:FormEvent) {
    event.preventDefault();if(busy)return;
    if(step===0){const error=validateAbout(draft);if(error){toast.error('Check your details',error);return;}}
    if(step===1 && !draft.sports.length){toast.error('Choose your sports','Pick at least one sport');return;}
    if(step<2){setStep(step+1);return;}
    if(await editor.save())window.location.assign(returnUrl);
  }
  return <main className="dark min-h-screen bg-background text-foreground px-4 py-8 sm:py-12">
    <form onSubmit={submit} className="mx-auto max-w-xl space-y-6 pb-6">
      <header className="space-y-2">
        <p className="text-sm font-bold uppercase tracking-widest text-primary">Kalikkanundo</p>
        <h1 className="text-3xl font-black">Your game starts here</h1>
        <p className="text-sm text-muted-foreground">A little about you, your sports, and how you play.</p>
      </header>
      <ol aria-label="Onboarding progress" className="grid grid-cols-3 gap-2">
        {steps.map((label,index)=><li key={label} aria-current={step===index?'step':undefined} className="flex items-center gap-2 text-xs sm:text-sm">
          <span aria-hidden="true" className={'flex h-7 w-7 shrink-0 items-center justify-center rounded-full font-bold '+(index<=step?'bg-primary text-primary-foreground':'bg-surface-subtle text-muted-foreground')}>{index+1}</span>
          <span className={index===step?'font-bold':'text-muted-foreground'}>{label}</span>
        </li>)}
      </ol>
      <Card className="space-y-5 p-4 sm:p-6">
        <div><p className="text-xs text-primary">Step {step+1} of 3</p><h2 className="text-xl font-bold">{steps[step]}</h2></div>
        {step===0 && <AboutStep draft={draft} onChange={setDraft} disabled={busy} onUploading={setUploading} />}
        {step>0 && catalog.isPending && <p role="status">Loading sports...</p>}
        {step>0 && catalog.isError && <div role="alert" className="space-y-3"><p className="text-sm text-danger">{profileErrorMessage(catalog.error)}</p><Button type="button" variant="outline" onClick={()=>{void catalog.refetch();}}>Retry sports catalog</Button></div>}
        {step>0 && catalog.isSuccess && !catalog.data.length && <p role="alert">No sports are available yet. Please try again later.</p>}
        {step===1 && catalog.data && <SportPicker catalog={catalog.data} value={draft.sports} onChange={sports=>setDraft({...draft,sports})} disabled={busy} />}
        {step===2 && catalog.data && <SportPlayStyle catalog={catalog.data} value={draft.sports} onChange={sports=>setDraft({...draft,sports})} disabled={busy} />}
      </Card>
      <footer className="sticky bottom-0 z-10 flex gap-3 border-t border-border bg-background/95 py-4 pb-[max(1rem,env(safe-area-inset-bottom))] backdrop-blur">
        {step>0 && <Button type="button" variant="outline" className="min-h-11 flex-1" disabled={busy} onClick={()=>setStep(step-1)}>Back</Button>}
        <Button type="submit" className="min-h-11 flex-1" isLoading={busy} disabled={step>0 && (!catalog.data?.length || !draft.sports.length)}>{step===2?"Let’s play":'Next'}</Button>
      </footer>
    </form>
  </main>;
}
