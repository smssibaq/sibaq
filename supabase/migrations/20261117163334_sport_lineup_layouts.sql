-- MANUAL ONLY. Additive cricket/volleyball storage; existing team metadata and RSVP remain unchanged.
begin;

alter table public.cricket_game_players add column if not exists lineup_bench boolean not null default false;
alter table public.cricket_game_players add column if not exists lineup_x double precision;
alter table public.cricket_game_players add column if not exists lineup_y double precision;
create or replace function public.cricket_get_lineup_layout(p_game uuid)
returns jsonb language plpgsql security definer set search_path=public as $$
begin
 if auth.uid() is null or not public.can_view_game(p_game,auth.uid()) then raise exception 'Forbidden' using errcode='42501'; end if;
 return coalesce((select jsonb_agg(jsonb_build_object('user_id',p.user_id,'assignment',case when p.attendance_status='maybe' then 'bench' when p.attendance_status<>'playing' then null when t.team_side is not null then t.team_side when p.lineup_bench then 'bench' else null end,'x',case when t.team_side is not null then p.lineup_x end,'y',case when t.team_side is not null then p.lineup_y end))
 from public.cricket_game_players p left join public.cricket_team_players t using(game_id,user_id) where p.game_id=p_game and p.attendance_status in ('playing','maybe')),'[]'::jsonb);
end $$;
create or replace function public.cricket_save_lineup_layout(p_game uuid,p_rows jsonb)
returns void language plpgsql security definer set search_path=public as $$
declare v_capacity integer; r jsonb; v_side text; v_x double precision; v_y double precision;
begin
 if auth.uid() is null or not public.is_game_organizer(p_game,auth.uid()) then raise exception 'Organizer only' using errcode='42501'; end if;
 select players_per_side into v_capacity from public.cricket_games where id=p_game for update;
 if not found then raise exception 'Game not found'; end if;
 perform 1 from public.cricket_game_players where game_id=p_game for update;
 if jsonb_typeof(p_rows) is distinct from 'array' then raise exception 'Expected lineup array'; end if;
 if (select count(distinct p->>'user_id') from jsonb_array_elements(p_rows) p)<>jsonb_array_length(p_rows) then raise exception 'Duplicate or missing player'; end if;
 if exists(select 1 from jsonb_array_elements(p_rows) p where coalesce(p->>'assignment','') not in ('','A','B','bench')) then raise exception 'Invalid assignment'; end if;
 if exists(select p->>'assignment' from jsonb_array_elements(p_rows) p where p->>'assignment' in ('A','B') group by p->>'assignment' having count(*)>v_capacity) then raise exception 'Team is full'; end if;
 if exists(select 1 from jsonb_array_elements(p_rows) r where not exists(select 1 from public.cricket_game_players p where p.game_id=p_game and p.user_id=(r->>'user_id')::uuid and p.attendance_status in ('playing','maybe') and (coalesce(r->>'assignment','') not in ('A','B') or p.attendance_status='playing'))) then raise exception 'Only joined confirmed players can be active'; end if;
 delete from public.cricket_team_players t where t.game_id=p_game and not exists(select 1 from jsonb_array_elements(p_rows) r where (r->>'user_id')::uuid=t.user_id and r->>'assignment' in ('A','B'));
 update public.cricket_game_players set lineup_bench=false,lineup_x=null,lineup_y=null where game_id=p_game;
 for r in select value from jsonb_array_elements(p_rows) loop
   v_side:=r->>'assignment'; v_x:=(r->>'x')::double precision; v_y:=(r->>'y')::double precision;
   if v_side in ('A','B') then
     if (v_x is null)<>(v_y is null) or (v_x is not null and (v_x not between .16 and .84 or (v_side='A' and v_y not between .12 and .40) or (v_side='B' and v_y not between .60 and .88))) then raise exception 'Position is outside assigned half'; end if;
     insert into public.cricket_team_players(game_id,user_id,team_side) values(p_game,(r->>'user_id')::uuid,v_side) on conflict(game_id,user_id) do update set team_side=excluded.team_side;
   end if;
   update public.cricket_game_players set lineup_bench=coalesce(v_side='bench',false),lineup_x=case when v_side in ('A','B') then v_x end,lineup_y=case when v_side in ('A','B') then v_y end where game_id=p_game and user_id=(r->>'user_id')::uuid;
 end loop;
end $$;
revoke all on function public.cricket_get_lineup_layout(uuid) from public,anon;
revoke all on function public.cricket_save_lineup_layout(uuid,jsonb) from public,anon;
grant execute on function public.cricket_get_lineup_layout(uuid) to authenticated;
grant execute on function public.cricket_save_lineup_layout(uuid,jsonb) to authenticated;
insert into ops.change_ledger(migration_name,owner,sport,objects,description)
values('cricket_lineup_layout','dev_a','cricket','{cricket_game_players,cricket_get_lineup_layout,cricket_save_lineup_layout}','Atomic team, bench and normalized layout save; existing attendance and team metadata preserved') on conflict(migration_name) do nothing;

alter table public.volleyball_game_players add column if not exists lineup_bench boolean not null default false;
alter table public.volleyball_game_players add column if not exists lineup_x double precision;
alter table public.volleyball_game_players add column if not exists lineup_y double precision;
create or replace function public.volleyball_get_lineup_layout(p_game uuid)
returns jsonb language plpgsql security definer set search_path=public as $$
begin
 if auth.uid() is null or not public.can_view_game(p_game,auth.uid()) then raise exception 'Forbidden' using errcode='42501'; end if;
 return coalesce((select jsonb_agg(jsonb_build_object('user_id',p.user_id,'assignment',case when p.attendance_status='maybe' then 'bench' when p.attendance_status<>'playing' then null when t.team_side is not null then t.team_side when p.lineup_bench then 'bench' else null end,'x',case when t.team_side is not null then p.lineup_x end,'y',case when t.team_side is not null then p.lineup_y end))
 from public.volleyball_game_players p left join public.volleyball_team_players t using(game_id,user_id) where p.game_id=p_game and p.attendance_status in ('playing','maybe')),'[]'::jsonb);
end $$;
create or replace function public.volleyball_save_lineup_layout(p_game uuid,p_rows jsonb)
returns void language plpgsql security definer set search_path=public as $$
declare v_capacity integer; r jsonb; v_side text; v_x double precision; v_y double precision;
begin
 if auth.uid() is null or not public.is_game_organizer(p_game,auth.uid()) then raise exception 'Organizer only' using errcode='42501'; end if;
 select players_per_side into v_capacity from public.volleyball_games where id=p_game for update;
 if not found then raise exception 'Game not found'; end if;
 perform 1 from public.volleyball_game_players where game_id=p_game for update;
 if jsonb_typeof(p_rows) is distinct from 'array' then raise exception 'Expected lineup array'; end if;
 if (select count(distinct p->>'user_id') from jsonb_array_elements(p_rows) p)<>jsonb_array_length(p_rows) then raise exception 'Duplicate or missing player'; end if;
 if exists(select 1 from jsonb_array_elements(p_rows) p where coalesce(p->>'assignment','') not in ('','A','B','bench')) then raise exception 'Invalid assignment'; end if;
 if exists(select p->>'assignment' from jsonb_array_elements(p_rows) p where p->>'assignment' in ('A','B') group by p->>'assignment' having count(*)>v_capacity) then raise exception 'Team is full'; end if;
 if exists(select 1 from jsonb_array_elements(p_rows) r where not exists(select 1 from public.volleyball_game_players p where p.game_id=p_game and p.user_id=(r->>'user_id')::uuid and p.attendance_status in ('playing','maybe') and (coalesce(r->>'assignment','') not in ('A','B') or p.attendance_status='playing'))) then raise exception 'Only joined confirmed players can be active'; end if;
 delete from public.volleyball_team_players t where t.game_id=p_game and not exists(select 1 from jsonb_array_elements(p_rows) r where (r->>'user_id')::uuid=t.user_id and r->>'assignment' in ('A','B'));
 update public.volleyball_game_players set lineup_bench=false,lineup_x=null,lineup_y=null where game_id=p_game;
 for r in select value from jsonb_array_elements(p_rows) loop
   v_side:=r->>'assignment'; v_x:=(r->>'x')::double precision; v_y:=(r->>'y')::double precision;
   if v_side in ('A','B') then
     if (v_x is null)<>(v_y is null) or (v_x is not null and (v_x not between .16 and .84 or (v_side='A' and v_y not between .12 and .40) or (v_side='B' and v_y not between .60 and .88))) then raise exception 'Position is outside assigned half'; end if;
     insert into public.volleyball_team_players(game_id,user_id,team_side) values(p_game,(r->>'user_id')::uuid,v_side) on conflict(game_id,user_id) do update set team_side=excluded.team_side;
   end if;
   update public.volleyball_game_players set lineup_bench=coalesce(v_side='bench',false),lineup_x=case when v_side in ('A','B') then v_x end,lineup_y=case when v_side in ('A','B') then v_y end where game_id=p_game and user_id=(r->>'user_id')::uuid;
 end loop;
end $$;
revoke all on function public.volleyball_get_lineup_layout(uuid) from public,anon;
revoke all on function public.volleyball_save_lineup_layout(uuid,jsonb) from public,anon;
grant execute on function public.volleyball_get_lineup_layout(uuid) to authenticated;
grant execute on function public.volleyball_save_lineup_layout(uuid,jsonb) to authenticated;
insert into ops.change_ledger(migration_name,owner,sport,objects,description)
values('volleyball_lineup_layout','dev_a','volleyball','{volleyball_game_players,volleyball_get_lineup_layout,volleyball_save_lineup_layout}','Atomic team, bench and normalized layout save; existing attendance and team metadata preserved') on conflict(migration_name) do nothing;
notify pgrst,'reload schema';
commit;
