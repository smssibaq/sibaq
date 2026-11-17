import { useEffect, useRef } from 'react';
import { useMutation, useQuery, useQueryClient, type QueryClient } from '@tanstack/react-query';
import { supabase } from '@/infrastructure/supabase/client';
import { createWithLocation } from '@/components/location/location-service';
import { useToast } from '@/components/ui';
import type { Json } from '@/types/database.types';
import type { CricketAttendance, CricketFieldPosition, CricketGameDetail, CricketGameSummary, CricketSide, CricketStatus, CreateCricketGameInput } from './types';
import { cricketPaths, useCricketNav } from './utils';

export function cricketErrorMessage(error:unknown):string {
  return error && typeof error==='object' && 'message' in error ? String(error.message) : 'Unable to complete this action.';
}
function forbidden(error:unknown):boolean {
  return Boolean(error && typeof error==='object' && 'code' in error && error.code==='42501');
}
async function unwrap<T>(request:PromiseLike<{data:unknown;error:unknown}>):Promise<T>{
  const {data,error}=await request;if(error)throw error;return data as T;
}
export const cricketKeys={
  all:['cricket'] as const, list:['cricket','games'] as const,
  detail:(id:string)=>['cricket','game',id] as const,
  denied:(id:string)=>['cricket','organizer-denied',id] as const,
};
export async function invalidateCricketGame(client:QueryClient,id:string) {
  await Promise.all([
    client.invalidateQueries({queryKey:cricketKeys.list}),
    ...[cricketKeys.detail(id),['game-context',id],['expense-game-context',id]].map(queryKey=>client.invalidateQueries({queryKey})),
  ]);
}
export const cricketApi={
  getLineupLayout:(id:string)=>unwrap<import('@/components/lineup/sport-lineup-board').LayoutRow[]>(supabase.rpc('cricket_get_lineup_layout',{p_game:id})),
  saveLineupLayout:(id:string,rows:import('@/components/lineup/sport-lineup-board').LayoutRow[])=>unwrap<void>(supabase.rpc('cricket_save_lineup_layout',{p_game:id,p_rows:rows as unknown as Json})),
  listMyGames:()=>unwrap<CricketGameSummary[]>(supabase.rpc('cricket_list_my_games',{})),
  getGame:async(id:string)=>{
    const game=await unwrap<CricketGameDetail>(supabase.rpc('cricket_get_game',{p_game:id}));
    return game ? {...game,players:game.players ?? [],batting_order:game.batting_order ?? [],field_positions:game.field_positions ?? []}:game;
  },
  createGame:(input:CreateCricketGameInput)=>createWithLocation('cricket',{
    p_title:input.title,p_venue:input.venue ?? '',p_starts_at:input.startsAt,
    p_players_per_side:input.playersPerSide,p_overs:input.oversPerInnings,
    p_notes:input.notes?.trim() || null,p_squad:input.squad ?? null,
  },input.location),
  joinByCode:(code:string)=>unwrap<string>(supabase.rpc('cricket_join_by_code',{p_code:code.trim().toUpperCase()})),
  setAttendance:(id:string,status:CricketAttendance)=>unwrap<void>(supabase.rpc('cricket_set_attendance',{p_game:id,p_status:status})),
  setTeam:(id:string,userId:string,side:CricketSide|null)=>unwrap<void>(supabase.rpc('cricket_set_team',{p_game:id,p_user:userId,p_side:side})),
  autoBalance:(id:string)=>unwrap<void>(supabase.rpc('cricket_auto_balance',{p_game:id})),
  setCaptain:(id:string,userId:string|null,side:CricketSide)=>unwrap<void>(supabase.rpc('cricket_set_captain',{p_game:id,p_user:userId,p_side:side})),
  setWicketkeeper:(id:string,userId:string|null,side:CricketSide)=>unwrap<void>(supabase.rpc('cricket_set_wicketkeeper',{p_game:id,p_user:userId,p_side:side})),
  setBattingOrder:(id:string,side:CricketSide,assignments:Array<{player_id:string;batting_position:number}>)=>unwrap<void>(supabase.rpc('cricket_set_batting_order',{p_game:id,p_side:side,p_assignments:assignments})),
  setFieldPositions:(id:string,side:CricketSide,positions:CricketFieldPosition[])=>unwrap<void>(supabase.rpc('cricket_set_field_positions',{p_game:id,p_side:side,p_positions:positions as unknown as Json})),
  recordToss:(id:string,winning:CricketSide,decision:'bat'|'bowl')=>unwrap<void>(supabase.rpc('cricket_record_toss',{p_game:id,p_winning_team:winning,p_decision:decision})),
  setStatus:(id:string,status:Exclude<CricketStatus,'in_progress'>)=>unwrap<void>(supabase.rpc('cricket_set_status',{p_game:id,p_status:status})),
};
function useQueryErrorToast(error:unknown){
  const last=useRef<unknown>(null);const {toast}=useToast();
  useEffect(()=>{if(error && error!==last.current){last.current=error;toast.error('Could not load cricket',cricketErrorMessage(error));}},[error,toast]);
}
export function useCricketGames(){
  const query=useQuery({queryKey:cricketKeys.list,queryFn:cricketApi.listMyGames});
  useQueryErrorToast(query.error);return query;
}
export function useCricketGame(gameId:string|undefined){
  const client=useQueryClient();const id=gameId ?? '';
  const denied=useQuery({queryKey:cricketKeys.denied(id),queryFn:()=>false,enabled:false,initialData:false});
  useEffect(()=>{
    if(!id)return;
    let channel=supabase.channel('cricket:'+id);
    const invalidate=()=>{void invalidateCricketGame(client,id);};
    for(const table of ['cricket_game_players','cricket_team_players','cricket_batting_order','cricket_field_positions','cricket_toss']) {
      channel=channel.on('postgres_changes',{event:'*',schema:'public',table,filter:'game_id=eq.'+id},invalidate);
    }
    channel=channel.on('postgres_changes',{event:'UPDATE',schema:'public',table:'games',filter:'id=eq.'+id},invalidate).subscribe();
    return ()=>{void supabase.removeChannel(channel);};
  },[id,client]);
  const query=useQuery({queryKey:cricketKeys.detail(id),queryFn:()=>cricketApi.getGame(id),enabled:Boolean(id),retry:false});
  useQueryErrorToast(query.error);
  return {...query,data:query.data && denied.data?{...query.data,is_organizer:false}:query.data};
}
function useGameMutation<T>(id:string,fn:(variables:T)=>Promise<unknown>,successMessage?:string){
  const client=useQueryClient();const {toast}=useToast();
  return useMutation({
    mutationFn:fn,
    onSuccess:()=>{if(successMessage)toast.success(successMessage);},
    onError:error=>{
      toast.error('Action failed',cricketErrorMessage(error));
      if(forbidden(error))client.setQueryData(cricketKeys.denied(id),true);
    },
    onSettled:()=>invalidateCricketGame(client,id),
  });
}
export function useSetAttendance(id:string){
  const client=useQueryClient();
  return useGameMutation<CricketAttendance>(id,async status=>{
    const game=client.getQueryData<CricketGameDetail>(cricketKeys.detail(id));
    if(game?.my_status===null)await cricketApi.joinByCode(game.invite_code);
    await cricketApi.setAttendance(id,status);
  });
}
export function useSetTeam(id:string){
  const client=useQueryClient();const {toast}=useToast();
  return useGameMutation<{userId:string;side:CricketSide|null}>(id,async({userId,side})=>{
    const before=client.getQueryData<CricketGameDetail>(cricketKeys.detail(id))?.players.find(p=>p.user_id===userId);
    await cricketApi.setTeam(id,userId,side);
    if(before?.team_side && before.team_side!==side)toast.success('Captain/WK cleared','The batting slot and field placement were also cleared.');
  });
}
export function useAutoBalance(id:string){return useGameMutation<void>(id,()=>cricketApi.autoBalance(id),'Teams balanced');}
export function useSetCaptain(id:string){
  return useGameMutation<{userId:string|null;side:CricketSide}>(id,({userId,side})=>cricketApi.setCaptain(id,userId,side));
}
export function useSetWicketkeeper(id:string){
  return useGameMutation<{userId:string|null;side:CricketSide}>(id,({userId,side})=>cricketApi.setWicketkeeper(id,userId,side));
}
export function useSetBattingOrder(id:string){
  return useGameMutation<{side:CricketSide;assignments:Array<{player_id:string;batting_position:number}>}>(id,({side,assignments})=>cricketApi.setBattingOrder(id,side,assignments),'Batting order saved');
}
export function useSetFieldPositions(id:string){
  return useGameMutation<{side:CricketSide;positions:CricketFieldPosition[]}>(id,({side,positions})=>cricketApi.setFieldPositions(id,side,positions),'Field saved');
}
export function useRecordToss(id:string){
  return useGameMutation<{winning_team:CricketSide;decision:'bat'|'bowl'}>(id,({winning_team,decision})=>cricketApi.recordToss(id,winning_team,decision),'Toss recorded');
}
export function useSetStatus(id:string){return useGameMutation<Exclude<CricketStatus,'in_progress'>>(id,status=>cricketApi.setStatus(id,status),'Game updated');}
export function useCreateGame(){
  const client=useQueryClient();const {toast}=useToast();
  return useMutation({mutationFn:cricketApi.createGame,onSuccess:id=>invalidateCricketGame(client,id),onError:error=>toast.error('Could not create game',cricketErrorMessage(error))});
}
export function useJoinByCode(){
  const client=useQueryClient();const {toast}=useToast();
  return useMutation({mutationFn:cricketApi.joinByCode,onSuccess:id=>invalidateCricketGame(client,id),onError:error=>toast.error('Could not join game',cricketErrorMessage(error))});
}
export function useCricketMutations(gameId?:string){
  const id=gameId ?? '';
  return {createGame:useCreateGame(),joinByCode:useJoinByCode(),setAttendance:useSetAttendance(id),setTeam:useSetTeam(id),autoBalance:useAutoBalance(id),setCaptain:useSetCaptain(id),setWicketkeeper:useSetWicketkeeper(id),setBattingOrder:useSetBattingOrder(id),setFieldPositions:useSetFieldPositions(id),recordToss:useRecordToss(id),setStatus:useSetStatus(id)};
}
export function cricketNav(){
  // eslint-disable-next-line react-hooks/rules-of-hooks
  const go=useCricketNav();
  return {toHub:()=>go(cricketPaths.hub),toCreate:()=>go(cricketPaths.create),toJoin:(code?:string)=>go(cricketPaths.join(code)),toGame:(id:string)=>go(cricketPaths.game(id))};
}

/** Compatibility with the team's already-applied visual-lineup storage. */
export function useCricketLayout(id:string){
  const client=useQueryClient();
  const query=useQuery({queryKey:[...cricketKeys.detail(id),'lineup-layout'],queryFn:()=>cricketApi.getLineupLayout(id),enabled:Boolean(id),retry:false});
  useQueryErrorToast(query.error);
  useEffect(()=>{if(forbidden(query.error))client.setQueryData(cricketKeys.denied(id),true);},[client,id,query.error]);
  return query;
}
export function useSaveCricketLayout(id:string){
  return useGameMutation<import('@/components/lineup/sport-lineup-board').LayoutRow[]>(id,rows=>cricketApi.saveLineupLayout(id,rows));
}
