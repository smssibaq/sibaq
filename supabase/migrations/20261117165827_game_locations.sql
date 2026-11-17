-- MANUAL ONLY. Shared location metadata; existing venue columns and records are preserved.
begin;
create table if not exists public.game_locations (
 game_id uuid primary key references public.games(id) on delete cascade,
 name text not null check(char_length(trim(name)) between 1 and 100),
 address text not null default '' check(char_length(address)<=500),
 latitude double precision,
 longitude double precision,
 updated_at timestamptz not null default now(),
 constraint game_locations_coordinates check ((latitude is null and longitude is null) or (latitude is not null and longitude is not null and latitude between -90 and 90 and longitude between -180 and 180))
);
alter table public.game_locations enable row level security;
drop policy if exists "game locations visible to viewers" on public.game_locations;
create policy "game locations visible to viewers" on public.game_locations for select to authenticated using(public.can_view_game(game_id,(select auth.uid())));
revoke all on public.game_locations from anon;
revoke insert,update,delete on public.game_locations from authenticated;
grant select on public.game_locations to authenticated;
create or replace function public.get_game_location(p_game uuid) returns jsonb language plpgsql security definer set search_path=public as $$
begin
 if auth.uid() is null or not public.can_view_game(p_game,auth.uid()) then raise exception 'Forbidden' using errcode='42501'; end if;
 return (select jsonb_build_object('name',name,'address',address,'latitude',latitude,'longitude',longitude) from public.game_locations where game_id=p_game);
end $$;
create or replace function public.set_game_location(p_game uuid,p_location jsonb) returns void language plpgsql security definer set search_path=public as $$
declare v_sport text; v_name text;
begin
 if auth.uid() is null or not (public.is_game_organizer(p_game,auth.uid()) or exists(select 1 from public.user_roles where user_id=auth.uid() and role='admin')) then raise exception 'Organizer only' using errcode='42501'; end if;
 select sport into v_sport from public.games where id=p_game for update;
 if not found then raise exception 'Game not found'; end if;
 if jsonb_typeof(p_location) is distinct from 'object' then raise exception 'Location must be an object'; end if;
 v_name:=trim(p_location->>'name');
 if v_name is null or v_name='' then raise exception 'Enter a venue name'; end if;
 insert into public.game_locations(game_id,name,address,latitude,longitude)
 values(p_game,v_name,coalesce(p_location->>'address',''),(p_location->>'latitude')::double precision,(p_location->>'longitude')::double precision)
 on conflict(game_id) do update set name=excluded.name,address=excluded.address,latitude=excluded.latitude,longitude=excluded.longitude,updated_at=now();
 if v_sport='football' then update public.matches set turf_name=v_name where id=p_game;
 else update public.games set venue=v_name,updated_at=now() where id=p_game; end if;
end $$;
create or replace function public.create_game_with_location(p_sport text,p_args jsonb,p_location jsonb) returns uuid language plpgsql security definer set search_path=public as $$
declare v_id uuid;
begin
 if auth.uid() is null then raise exception 'Unauthenticated' using errcode='42501'; end if;
 case p_sport
 when 'football' then v_id:=public.create_match((p_args->>'p_squad')::uuid,p_args->>'p_title',p_args->>'p_mode',p_args->>'p_turf_name',(p_args->>'p_starts_at')::timestamptz,(p_args->>'p_players_per_team')::integer,(p_args->>'p_rsvp_deadline')::timestamptz);
 when 'badminton' then v_id:=public.badminton_create_game((p_args->>'p_squad')::uuid,p_args->>'p_title',p_args->>'p_venue',(p_args->>'p_starts_at')::timestamptz,p_args->>'p_format',p_args->>'p_court',p_args->>'p_skill_level');
 when 'cricket' then v_id:=public.cricket_create_game(p_args->>'p_title',p_args->>'p_venue',(p_args->>'p_starts_at')::timestamptz,(p_args->>'p_players_per_side')::integer,(p_args->>'p_overs')::integer,p_args->>'p_notes',(p_args->>'p_squad')::uuid);
 when 'volleyball' then v_id:=public.volleyball_create_game(p_args->>'p_title',p_args->>'p_venue',(p_args->>'p_starts_at')::timestamptz,(p_args->>'p_players_per_side')::integer,p_args->>'p_notes',(p_args->>'p_squad')::uuid);
 else raise exception 'Unsupported sport'; end case;
 perform public.set_game_location(v_id,p_location);
 return v_id;
end $$;
create or replace function public.update_game_with_location(p_game uuid,p_changes jsonb,p_location jsonb) returns void language plpgsql security definer set search_path=public as $$
declare v_sport text;
begin
 if auth.uid() is null or not (public.is_game_organizer(p_game,auth.uid()) or exists(select 1 from public.user_roles where user_id=auth.uid() and role='admin')) then raise exception 'Organizer only' using errcode='42501'; end if;
 select sport into v_sport from public.games where id=p_game for update;
 if v_sport='football' then
   perform public.update_match(p_game,p_changes->>'p_title',p_changes->>'p_turf_name',(p_changes->>'p_starts_at')::timestamptz,p_changes->>'p_status',(p_changes->>'p_rsvp_deadline')::timestamptz);
 elsif v_sport='badminton' then
   perform public.update_game_core(p_game,p_changes->>'p_title',p_changes->>'p_venue',(p_changes->>'p_starts_at')::timestamptz,null);
 else raise exception 'Use location editing for this sport'; end if;
 perform public.set_game_location(p_game,p_location);
end $$;
revoke all on function public.get_game_location(uuid) from public,anon;
revoke all on function public.set_game_location(uuid,jsonb) from public,anon;
revoke all on function public.create_game_with_location(text,jsonb,jsonb) from public,anon;
revoke all on function public.update_game_with_location(uuid,jsonb,jsonb) from public,anon;
grant execute on function public.get_game_location(uuid),public.set_game_location(uuid,jsonb),public.create_game_with_location(text,jsonb,jsonb),public.update_game_with_location(uuid,jsonb,jsonb) to authenticated;
insert into ops.change_ledger(migration_name,owner,sport,objects,description) values('game_locations','dev_a',null,'{game_locations,get_game_location,set_game_location,create_game_with_location,update_game_with_location}','Shared optional venue coordinates/address; atomic wrappers reuse sport creation and edit authorization; existing venue text preserved') on conflict(migration_name) do nothing;
notify pgrst,'reload schema';
commit;
