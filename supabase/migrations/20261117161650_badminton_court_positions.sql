-- MANUAL ONLY. Requires badminton_lineup_bench migration first.
begin;
alter table public.badminton_pairs add column if not exists court_x double precision;
alter table public.badminton_pairs add column if not exists court_y double precision;
do $$ begin
  if not exists(select 1 from pg_constraint where conrelid='public.badminton_pairs'::regclass and conname='badminton_court_position_bounds') then
    alter table public.badminton_pairs add constraint badminton_court_position_bounds check (
      (court_x is null and court_y is null) or
      (court_x is not null and court_y is not null and court_x between 0.16 and 0.84 and
        ((side='A' and court_y between 0.12 and 0.40) or (side='B' and court_y between 0.60 and 0.88)))
    );
  end if;
end $$;
create or replace function public.badminton_save_positioned_lineup(p_game uuid,p_side_a uuid[],p_side_b uuid[],p_bench uuid[],p_positions jsonb)
returns void language plpgsql security definer set search_path=public as $$
declare v_item record; v_x double precision; v_y double precision; v_side text;
begin
  if auth.uid() is null or not public.is_game_organizer(p_game,auth.uid()) then raise exception 'Forbidden: organizer only' using errcode='42501'; end if;
  if jsonb_typeof(p_positions) is distinct from 'object' then raise exception 'Positions must be an object' using errcode='22023'; end if;
  -- Existing atomic save validates all game membership, RSVP, duplicate, capacity and bench rules.
  perform public.badminton_save_lineup(p_game,p_side_a,p_side_b,p_bench);
  for v_item in select key,value from jsonb_each(p_positions) loop
    select side into v_side from public.badminton_pairs where game_id=p_game and user_id=v_item.key::uuid;
    if not found then raise exception 'Position player is not active in this game' using errcode='23514'; end if;
    v_x:=(v_item.value->>'x')::double precision; v_y:=(v_item.value->>'y')::double precision;
    if v_x is null or v_y is null then raise exception 'Both court coordinates are required' using errcode='23514'; end if;
    update public.badminton_pairs set court_x=v_x,court_y=v_y where game_id=p_game and user_id=v_item.key::uuid;
    -- Table constraint restricts coordinates to the player's assigned half.
  end loop;
end $$;
revoke all on function public.badminton_save_positioned_lineup(uuid,uuid[],uuid[],uuid[],jsonb) from public,anon;
grant execute on function public.badminton_save_positioned_lineup(uuid,uuid[],uuid[],uuid[],jsonb) to authenticated;
insert into ops.change_ledger(migration_name,owner,sport,objects,description)
values('badminton_court_positions','dev_a','badminton','{badminton_pairs,badminton_save_positioned_lineup}',
'Normalized editable court positions with assigned-half constraints and atomic organizer save') on conflict(migration_name) do nothing;
notify pgrst,'reload schema';
commit;
