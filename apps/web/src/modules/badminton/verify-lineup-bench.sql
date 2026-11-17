-- Read-only checks after manually applying badminton_lineup_bench.
select to_regclass('public.badminton_bench') as bench_table,
       to_regprocedure('public.badminton_save_lineup(uuid,uuid[],uuid[],uuid[])') as save_rpc;
select relname,relrowsecurity from pg_class where oid='public.badminton_bench'::regclass;
select policyname,cmd,roles,qual from pg_policies where tablename='badminton_bench' and schemaname='public';
select has_function_privilege('anon','public.badminton_save_lineup(uuid,uuid[],uuid[],uuid[])','EXECUTE') as anon_must_be_false,
       has_function_privilege('authenticated','public.badminton_save_lineup(uuid,uuid[],uuid[],uuid[])','EXECUTE') as authenticated_must_be_true;
-- Both counts must be zero.
select count(*) as invalid_active_assignments from public.badminton_pairs p left join public.badminton_rsvps r
using(game_id,user_id) where r.status is distinct from 'in';
select count(*) as duplicate_active_and_bench from public.badminton_pairs p join public.badminton_bench b using(game_id,user_id);
select count(*) as invalid_bench_players from public.badminton_bench b left join public.badminton_rsvps r using(game_id,user_id)
where r.status is null or r.status not in ('in','maybe');
select count(*) as maybe_players_missing_from_bench from public.badminton_rsvps r
where r.status='maybe' and not exists(select 1 from public.badminton_bench b where b.game_id=r.game_id and b.user_id=r.user_id);
-- Must return no rows.
select p.game_id,p.side,count(*) from public.badminton_pairs p join public.badminton_games g on g.id=p.game_id
group by p.game_id,p.side,g.format having count(*) > case when g.format='singles' then 1 else 2 end;
select p.game_id,p.side,p.position_index,u.display_name,r.status from public.badminton_pairs p
join public.badminton_rsvps r using(game_id,user_id) join public.profiles u on u.id=p.user_id order by p.game_id,p.side,p.position_index;
select b.game_id,u.display_name,r.status from public.badminton_bench b
join public.badminton_rsvps r using(game_id,user_id) join public.profiles u on u.id=b.user_id order by b.game_id,r.status;
-- Use the app as organizer to save A/B/bench, reload, and compare these rows.
-- Repeat with a participant account: no editor and save RPC must raise 42501.
