-- Read-only verification after manual application. Must show RPC, RLS unchanged,
-- anon execute false, authenticated true. No remote mutation is performed by this file.
select to_regprocedure('public.football_save_lineups(uuid,jsonb)');
select has_function_privilege('anon','public.football_save_lineups(uuid,jsonb)','execute') as anon_must_be_false,
       has_function_privilege('authenticated','public.football_save_lineups(uuid,jsonb)','execute') as authenticated_must_be_true;
select relname,relrowsecurity from pg_class where oid in ('public.teams'::regclass,'public.team_players'::regclass);
select t.match_id,t.side,t.revision,p.user_id,p.is_substitute,p.pitch_x,p.pitch_y,a.status
from public.teams t left join public.team_players p on p.team_id=t.id
left join public.match_attendance a on a.match_id=t.match_id and a.user_id=p.user_id order by t.match_id,t.side;
-- Must return no rows for saved lineups.
select p.match_id,p.user_id,count(*) from public.team_players p group by p.match_id,p.user_id having count(*)>1;
select t.id,t.side,count(*) from public.teams t join public.team_players p on p.team_id=t.id join public.matches m on m.id=t.match_id
where not p.is_substitute group by t.id,t.side,m.players_per_team having count(*)>m.players_per_team;
-- In the app: Playing A -> B -> Bench -> A; save; reload; compare coordinates/revisions.
-- Participant must not see edit actions. Direct save RPC as participant must fail 42501.
-- Stale revision must fail 40001 with no partial team writes.
