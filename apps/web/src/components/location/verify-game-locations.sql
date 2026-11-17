-- Read-only checks after manually applying game_locations.
select to_regclass('public.game_locations'),
       to_regprocedure('public.create_game_with_location(text,jsonb,jsonb)'),
       to_regprocedure('public.update_game_with_location(uuid,jsonb,jsonb)');
select conname,pg_get_constraintdef(oid) from pg_constraint where conrelid='public.game_locations'::regclass;
select relrowsecurity from pg_class where oid='public.game_locations'::regclass;
select policyname,cmd,roles,qual from pg_policies where schemaname='public' and tablename='game_locations';
select has_function_privilege('anon','public.set_game_location(uuid,jsonb)','execute') as anon_must_be_false,
       has_function_privilege('authenticated','public.set_game_location(uuid,jsonb)','execute') as authenticated_must_be_true;
select g.id,g.sport,g.venue,l.name,l.address,l.latitude,l.longitude
from public.games g join public.game_locations l on l.game_id=g.id order by l.updated_at desc;
select sport,count(*) as text_only_games from public.games g
where not exists(select 1 from public.game_locations l where l.game_id=g.id) group by sport;
-- App: create each sport with a manual venue; then select a pin, save, reload,
-- edit it and verify Maps uses the exact coordinates above.
-- Invalid/partial coordinates must fail atomically; participant edits must fail 42501.
