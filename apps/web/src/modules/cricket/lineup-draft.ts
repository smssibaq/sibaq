import { useCallback, useEffect, useState, type SetStateAction } from 'react';
import type { CricketDraftAction, CricketSide } from './types';

/** Keep each side's edits until the corresponding server snapshot or roster changes. */
export function useLineupDraft<T>(source:T,side:CricketSide,rosterKey:string){
  const sourceKey=JSON.stringify(source)+rosterKey;
  const [drafts,setDrafts]=useState<Partial<Record<CricketSide,{sourceKey:string;value:T}>>>({});
  const value=drafts[side]?.sourceKey===sourceKey?drafts[side]!.value:source;
  const update=useCallback((next:SetStateAction<T>)=>setDrafts(previous=>{
    const current=previous[side]?.sourceKey===sourceKey?previous[side]!.value:source;
    return {...previous,[side]:{sourceKey,value:typeof next==='function'?(next as (v:T)=>T)(current):next}};
  }),[side,sourceKey,source]);
  return [value,update] as const;
}
export function usePublishDraft(onChange:((action:CricketDraftAction|null)=>void)|undefined,dirty:boolean,pending:boolean,save:()=>void){
  useEffect(()=>{
    onChange?.({dirty,pending,save});
    return ()=>onChange?.(null);
  },[onChange,dirty,pending,save]);
}
