-- Run after badminton_court_positions (and prerequisite badminton_lineup_bench).
select to_regprocedure('public.badminton_save_positioned_lineup(uuid,uuid[],uuid[],uuid[],jsonb)');
select column_name,data_type from information_schema.columns where table_schema='public' and table_name='badminton_pairs' and column_name in ('court_x','court_y');
select has_function_privilege('anon','public.badminton_save_positioned_lineup(uuid,uuid[],uuid[],uuid[],jsonb)','execute') as anon_must_be_false,
       has_function_privilege('authenticated','public.badminton_save_positioned_lineup(uuid,uuid[],uuid[],uuid[],jsonb)','execute') as authenticated_must_be_true;
select game_id,side,user_id,position_index,court_x,court_y from public.badminton_pairs order by game_id,side,position_index;
-- Must return zero rows.
select * from public.badminton_pairs where court_x is not null and
  (court_x not between 0.16 and 0.84 or (side='A' and court_y not between 0.12 and 0.40) or (side='B' and court_y not between 0.60 and 0.88));
-- In app: drag A/B/bench, Save, reload and compare coordinates above.
-- A full team rejects incoming players; invalid drops preserve the draft.
-- A participant's call to the save RPC must fail 42501 without modifying data.
