-- Read-only checks after manually applying sport_lineup_layouts.
select to_regprocedure('public.cricket_save_lineup_layout(uuid,jsonb)'),
       to_regprocedure('public.volleyball_save_lineup_layout(uuid,jsonb)');
select table_name,column_name,data_type from information_schema.columns
where table_schema='public' and table_name in ('cricket_game_players','volleyball_game_players')
and column_name in ('lineup_bench','lineup_x','lineup_y');
select has_function_privilege('anon','public.cricket_save_lineup_layout(uuid,jsonb)','execute') as cricket_anon_must_be_false,
       has_function_privilege('anon','public.volleyball_save_lineup_layout(uuid,jsonb)','execute') as volleyball_anon_must_be_false;
select p.game_id,p.user_id,p.attendance_status,p.lineup_bench,t.team_side,p.lineup_x,p.lineup_y
from public.cricket_game_players p left join public.cricket_team_players t using(game_id,user_id);
select p.game_id,p.user_id,p.attendance_status,p.lineup_bench,t.team_side,p.lineup_x,p.lineup_y
from public.volleyball_game_players p left join public.volleyball_team_players t using(game_id,user_id);
-- In each sport's app: confirmed A -> B -> Bench -> A, Save, reload, compare.
-- Maybe remains provisional; Out excluded; participant save must fail 42501.
-- Football and badminton still require their previously supplied migrations.
