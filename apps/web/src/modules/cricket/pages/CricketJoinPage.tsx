import { useCallback, useEffect, useRef, useState, type FormEvent } from 'react';
import { useSearch } from '@tanstack/react-router';
import { Button, Card, Input, useToast } from '@/components/ui';
import { PageHeader } from '@/components/common/page-header';
import { cricketErrorMessage, useJoinByCode } from '../api';
import { cricketPaths, useCricketNav } from '../utils';
export function CricketJoinPage(){
  const search=useSearch({strict:false}) as {code?:string};
  const initialCode=String(search.code ?? '').trim().toUpperCase();
  const [code,setCode]=useState(initialCode),[error,setError]=useState('');
  const attempted=useRef<string|null>(null);
  const {mutate,isPending}=useJoinByCode();const go=useCricketNav();const {toast}=useToast();
  const join=useCallback((value:string)=>{
    const clean=value.trim().toUpperCase();if(!clean){setError('Enter an invitation code.');return;}
    setError('');mutate(clean,{onSuccess:id=>{toast.success('Joined as Maybe — confirm if you’re playing');go(cricketPaths.game(id));},onError:error=>setError(cricketErrorMessage(error))});
  },[mutate,go,toast]);
  useEffect(()=>{if(initialCode && attempted.current!==initialCode){attempted.current=initialCode;join(initialCode);}},[initialCode,join]);
  function submit(event:FormEvent){event.preventDefault();if(!isPending)join(code);}
  return <div className="mx-auto max-w-md space-y-4"><Button variant="ghost" onClick={()=>go(cricketPaths.hub)}>Back to cricket</Button><PageHeader title="Join cricket game" description="Enter the organizer’s invitation code. You’ll join as Maybe." />
    <Card className="p-4 sm:p-6"><form onSubmit={submit} className="space-y-4"><label className="block space-y-2 text-sm font-semibold">Invitation code<Input autoFocus autoCapitalize="characters" autoComplete="off" value={code} disabled={isPending} onChange={e=>{setCode(e.target.value.toUpperCase());setError('');}} placeholder="Enter code" className="text-center font-mono text-lg tracking-widest" aria-invalid={Boolean(error)} /></label>{error && <p role="alert" className="text-sm text-danger">{error}</p>}<Button type="submit" className="w-full" isLoading={isPending} disabled={!code.trim()}>Join game</Button></form></Card>
  </div>;
}
