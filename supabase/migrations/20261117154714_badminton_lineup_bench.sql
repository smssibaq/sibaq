-- MANUAL APPLICATION ONLY. Run in the project configured in apps/web/.env.local.
-- Additive badminton-only migration. Existing A/B records remain compatible.
begin;
alter table public.badminton_pairs add column if not exists position_index integer;
do $$ begin
  if not exists (select 1 from pg_constraint where conrelid='public.badminton_pairs'::regclass and conname='badminton_pairs_position_check') then
    alter table public.badminton_pairs add constraint badminton_pairs_position_check check (position_index is null or position_index between 0 and 1);
  end if;
end $$;
create table if not exists public.badminton_bench (
  game_id uuid not null,
  user_id uuid not null,
  created_at timestamptz not null default now(),
  primary key(game_id,user_id),
  foreign key(game_id,user_id) references public.badminton_rsvps(game_id,user_id) on delete cascade
);
alter table public.badminton_bench enable row level security;
drop policy if exists "badminton bench visible to viewers" on public.badminton_bench;
create policy "badminton bench visible to viewers" on public.badminton_bench for select to authenticated
using (public.can_view_game(game_id,(select auth.uid())));
revoke all on public.badminton_bench from anon;
revoke insert,update,delete on public.badminton_bench from authenticated;
grant select on public.badminton_bench to authenticated;

-- Keep RSVP authoritative, including clients using the existing RSVP RPC.
create or replace function public.badminton_sync_lineup_attendance()
returns trigger language plpgsql security definer set search_path=public as $$
begin
  if new.status <> 'in' then
    delete from public.badminton_pairs where game_id=new.game_id and user_id=new.user_id;
  end if;
  if new.status='out' then
    delete from public.badminton_bench where game_id=new.game_id and user_id=new.user_id;
  elsif new.status='maybe' then
    insert into public.badminton_bench(game_id,user_id) values(new.game_id,new.user_id) on conflict do nothing;
  end if;
  return new;
end $$;
revoke all on function public.badminton_sync_lineup_attendance() from public,anon,authenticated;
drop trigger if exists badminton_sync_lineup_attendance on public.badminton_rsvps;
create trigger badminton_sync_lineup_attendance after insert or update of status on public.badminton_rsvps
for each row execute function public.badminton_sync_lineup_attendance();

-- Legacy pair assignment must also remove that player from the bench.
create or replace function public.badminton_clear_active_bench()
returns trigger language plpgsql security definer set search_path=public as $$
begin
  delete from public.badminton_bench where game_id=new.game_id and user_id=new.user_id;
  return new;
end $$;
revoke all on function public.badminton_clear_active_bench() from public,anon,authenticated;
drop trigger if exists badminton_clear_active_bench on public.badminton_pairs;
create trigger badminton_clear_active_bench after insert or update on public.badminton_pairs
for each row execute function public.badminton_clear_active_bench();

create or replace function public.badminton_save_lineup(p_game uuid,p_side_a uuid[],p_side_b uuid[],p_bench uuid[])
returns void language plpgsql security definer set search_path=public as $$
declare
  v_a uuid[]:=array(select id from unnest(p_side_a) t(id) where id is not null);
  v_b uuid[]:=array(select id from unnest(p_side_b) t(id) where id is not null);
  v_bench uuid[]:=coalesce(p_bench,'{}');
  v_per_side integer;
begin
  if auth.uid() is null or not public.is_game_organizer(p_game,auth.uid()) then
    raise exception 'Forbidden: organizer only' using errcode='42501';
  end if;
  select case when format='singles' then 1 else 2 end into v_per_side from public.badminton_games where id=p_game for update;
  if not found then raise exception 'Badminton game not found' using errcode='P0002'; end if;
  if coalesce(cardinality(p_side_a),0)>v_per_side or coalesce(cardinality(p_side_b),0)>v_per_side then
    raise exception 'Too many court positions' using errcode='23514';
  end if;
  -- RSVP writes use this same game lock; hold attendance rows against direct changes too.
  perform 1 from public.badminton_rsvps where game_id=p_game for update;
  if exists(select 1 from unnest(v_a||v_b||v_bench) t(id) where id is null)
     or (select count(distinct id) from unnest(v_a||v_b||v_bench) t(id)) <> cardinality(v_a||v_b||v_bench) then
    raise exception 'Duplicate or null lineup player' using errcode='23514';
  end if;
  if exists(select 1 from unnest(v_bench) t(id) where not exists(
    select 1 from public.badminton_rsvps r where r.game_id=p_game and r.user_id=t.id and r.status in ('in','maybe')
  )) then raise exception 'Only joined confirmed or Maybe players can be benched' using errcode='23514'; end if;
  -- Existing RPC enforces organizer, confirmed attendance, side capacity and duplicates.
  perform public.badminton_set_pairs(p_game,v_a,v_b);
  update public.badminton_pairs p set position_index=t.ordinality-1
  from unnest(p_side_a) with ordinality t(id,ordinality) where p.game_id=p_game and p.user_id=t.id;
  update public.badminton_pairs p set position_index=t.ordinality-1
  from unnest(p_side_b) with ordinality t(id,ordinality) where p.game_id=p_game and p.user_id=t.id;
  delete from public.badminton_bench where game_id=p_game;
  insert into public.badminton_bench(game_id,user_id)
  select p_game,id from unnest(v_bench) t(id)
  union
  select p_game,user_id from public.badminton_rsvps where game_id=p_game and status='maybe';
end $$;
revoke all on function public.badminton_save_lineup(uuid,uuid[],uuid[],uuid[]) from public,anon;
grant execute on function public.badminton_save_lineup(uuid,uuid[],uuid[],uuid[]) to authenticated;

-- Initialize automatic Maybe substitutes; clear only assignments invalid under RSVP.
delete from public.badminton_pairs p where not exists(
  select 1 from public.badminton_rsvps r where r.game_id=p.game_id and r.user_id=p.user_id and r.status='in'
);
insert into public.badminton_bench(game_id,user_id)
select game_id,user_id from public.badminton_rsvps where status='maybe' on conflict do nothing;
do $$ begin
  if exists(select 1 from pg_publication where pubname='supabase_realtime') and not exists(
    select 1 from pg_publication_tables where pubname='supabase_realtime' and schemaname='public' and tablename='badminton_bench'
  ) then alter publication supabase_realtime add table public.badminton_bench; end if;
end $$;
insert into ops.change_ledger(migration_name,owner,sport,objects,description)
values('badminton_lineup_bench','dev_a','badminton','{badminton_bench,badminton_pairs,badminton_save_lineup,badminton_sync_lineup_attendance,badminton_clear_active_bench}',
'Bench persistence, ordered court slots, atomic organizer save and RSVP cleanup') on conflict(migration_name) do nothing;
notify pgrst,'reload schema';
commit;
