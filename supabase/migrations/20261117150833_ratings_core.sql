-- Ratings & match reviews for every sport (owner: dev_a).
-- Writes only through SECURITY DEFINER RPCs; tables have RLS with read policies only.

create table if not exists public.game_player_ratings (
  id uuid primary key default gen_random_uuid(),
  game_id uuid not null,
  sport text not null,
  rated_player_id uuid not null references public.profiles(id) on delete cascade,
  rated_by uuid not null references public.profiles(id) on delete cascade,
  rating smallint not null check (rating between 1 and 5),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint game_player_ratings_unique unique (game_id, rated_player_id, rated_by),
  constraint fk_game_player_ratings_game foreign key (game_id, sport)
    references public.games(id, sport) on delete cascade
);
create index if not exists game_player_ratings_player_idx on public.game_player_ratings(rated_player_id);
create index if not exists game_player_ratings_by_idx on public.game_player_ratings(rated_by);
create index if not exists game_player_ratings_game_sport_idx on public.game_player_ratings(game_id, sport);

create table if not exists public.game_match_reviews (
  id uuid primary key default gen_random_uuid(),
  game_id uuid not null,
  sport text not null,
  reviewer_id uuid not null references public.profiles(id) on delete cascade,
  rating smallint not null check (rating between 1 and 5),
  feedback text check (feedback is null or char_length(feedback) <= 500),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint game_match_reviews_unique unique (game_id, reviewer_id),
  constraint fk_game_match_reviews_game foreign key (game_id, sport)
    references public.games(id, sport) on delete cascade
);
create index if not exists game_match_reviews_reviewer_idx on public.game_match_reviews(reviewer_id);
create index if not exists game_match_reviews_game_sport_idx on public.game_match_reviews(game_id, sport);

alter table public.game_player_ratings enable row level security;
alter table public.game_match_reviews enable row level security;

-- Reads: own rows, plus organizers of the game. Aggregates go through the RPCs.
drop policy if exists "player ratings readable by author, subject, organizer" on public.game_player_ratings;
create policy "player ratings readable by author, subject, organizer"
  on public.game_player_ratings for select to authenticated
  using (
    rated_by = (select auth.uid())
    or rated_player_id = (select auth.uid())
    or public.is_game_organizer(game_id, (select auth.uid()))
  );

drop policy if exists "match reviews readable by author and organizer" on public.game_match_reviews;
create policy "match reviews readable by author and organizer"
  on public.game_match_reviews for select to authenticated
  using (
    reviewer_id = (select auth.uid())
    or public.is_game_organizer(game_id, (select auth.uid()))
  );

-- Organizer rates a confirmed player (upsert: the author or an organizer can edit).
create or replace function public.rate_player(p_game uuid, p_player uuid, p_rating integer)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_uid uuid := auth.uid();
  v_sport text;
  v_starts timestamptz;
begin
  if v_uid is null then
    raise exception 'Unauthenticated' using errcode = '42501';
  end if;
  if p_rating is null or p_rating < 1 or p_rating > 5 then
    raise exception 'Rating must be 1-5' using errcode = '22023';
  end if;
  select sport, starts_at into v_sport, v_starts from public.games where id = p_game;
  if v_sport is null then
    raise exception 'Game not found' using errcode = 'P0002';
  end if;
  if not public.is_game_organizer(p_game, v_uid) then
    raise exception 'Forbidden: organizer only' using errcode = '42501';
  end if;
  if v_starts >= now() then
    raise exception 'Ratings open after the game starts' using errcode = '23514';
  end if;
  if p_player = v_uid then
    raise exception 'You cannot rate yourself' using errcode = '23514';
  end if;
  if not exists (select 1 from public.game_confirmed_players(p_game) x where x = p_player) then
    raise exception 'Player was not confirmed for this game' using errcode = '23514';
  end if;

  insert into public.game_player_ratings (game_id, sport, rated_player_id, rated_by, rating)
  values (p_game, v_sport, p_player, v_uid, p_rating)
  on conflict (game_id, rated_player_id, rated_by)
  do update set rating = excluded.rating, updated_at = now();
end;
$$;

-- Participant reviews the match (upsert own).
create or replace function public.review_match(p_game uuid, p_rating integer, p_feedback text default null)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_uid uuid := auth.uid();
  v_sport text;
  v_starts timestamptz;
  v_feedback text := nullif(trim(coalesce(p_feedback, '')), '');
begin
  if v_uid is null then
    raise exception 'Unauthenticated' using errcode = '42501';
  end if;
  if p_rating is null or p_rating < 1 or p_rating > 5 then
    raise exception 'Rating must be 1-5' using errcode = '22023';
  end if;
  if v_feedback is not null and char_length(v_feedback) > 500 then
    raise exception 'Feedback is limited to 500 characters' using errcode = '22001';
  end if;
  select sport, starts_at into v_sport, v_starts from public.games where id = p_game;
  if v_sport is null then
    raise exception 'Game not found' using errcode = 'P0002';
  end if;
  if not public.is_game_participant(p_game, v_uid) then
    raise exception 'Forbidden: only players of this game can review it' using errcode = '42501';
  end if;
  if v_starts >= now() then
    raise exception 'Reviews open after the game starts' using errcode = '23514';
  end if;

  insert into public.game_match_reviews (game_id, sport, reviewer_id, rating, feedback)
  values (p_game, v_sport, v_uid, p_rating, v_feedback)
  on conflict (game_id, reviewer_id)
  do update set rating = excluded.rating, feedback = excluded.feedback, updated_at = now();
end;
$$;

-- Summary for one game. Match average for participants/organizers; per-player only for organizers.
create or replace function public.get_game_ratings_summary(p_game uuid)
returns jsonb
language plpgsql
stable
security definer
set search_path = public
as $$
declare
  v_uid uuid := auth.uid();
  v_org boolean;
  v_part boolean;
  v_result jsonb;
begin
  if v_uid is null then
    raise exception 'Unauthenticated' using errcode = '42501';
  end if;
  if not public.can_view_game(p_game, v_uid) then
    raise exception 'Forbidden' using errcode = '42501';
  end if;
  v_org := public.is_game_organizer(p_game, v_uid);
  v_part := public.is_game_participant(p_game, v_uid);

  select jsonb_build_object(
    'is_organizer', v_org,
    'is_participant', v_part,
    'is_open', (select starts_at < now() from public.games where id = p_game),
    'match_avg', case when v_org or v_part then
        (select round(avg(rating)::numeric, 2) from public.game_match_reviews where game_id = p_game) end,
    'match_count', case when v_org or v_part then
        (select count(*) from public.game_match_reviews where game_id = p_game) end,
    'my_review', (select jsonb_build_object('rating', rating, 'feedback', feedback)
                  from public.game_match_reviews where game_id = p_game and reviewer_id = v_uid),
    'players', case when v_org then coalesce((
        select jsonb_agg(jsonb_build_object(
                 'player_id', cp.id,
                 'display_name', coalesce(pr.display_name, 'Player'),
                 'avg', (select round(avg(r.rating)::numeric, 2) from public.game_player_ratings r
                         where r.game_id = p_game and r.rated_player_id = cp.id),
                 'count', (select count(*) from public.game_player_ratings r
                           where r.game_id = p_game and r.rated_player_id = cp.id),
                 'my_rating', (select r.rating from public.game_player_ratings r
                               where r.game_id = p_game and r.rated_player_id = cp.id and r.rated_by = v_uid))
               order by coalesce(pr.display_name, 'Player'))
        from public.game_confirmed_players(p_game) as cp(id)
        left join public.profiles pr on pr.id = cp.id
        where cp.id <> v_uid), '[]'::jsonb) end
  ) into v_result;
  return v_result;
end;
$$;

-- The caller's own rating history (ratings received, per game).
create or replace function public.get_my_rating_history()
returns table (game_id uuid, sport text, title text, starts_at timestamptz, avg_rating numeric, rating_count integer)
language plpgsql
stable
security definer
set search_path = public
as $$
declare
  v_uid uuid := auth.uid();
begin
  if v_uid is null then
    raise exception 'Unauthenticated' using errcode = '42501';
  end if;
  return query
  select g.id, g.sport, g.title, g.starts_at, round(avg(r.rating)::numeric, 2), count(*)::int
  from public.game_player_ratings r
  join public.games g on g.id = r.game_id
  where r.rated_player_id = v_uid
  group by g.id, g.sport, g.title, g.starts_at
  order by g.starts_at desc;
end;
$$;

revoke all on function public.rate_player(uuid, uuid, integer) from public, anon;
revoke all on function public.review_match(uuid, integer, text) from public, anon;
revoke all on function public.get_game_ratings_summary(uuid) from public, anon;
revoke all on function public.get_my_rating_history() from public, anon;
grant execute on function public.rate_player(uuid, uuid, integer) to authenticated;
grant execute on function public.review_match(uuid, integer, text) to authenticated;
grant execute on function public.get_game_ratings_summary(uuid) to authenticated;
grant execute on function public.get_my_rating_history() to authenticated;

insert into ops.change_ledger (migration_name, owner, sport, objects, description)
values ('ratings_core', 'dev_a', null,
  '{game_player_ratings,game_match_reviews,rate_player,review_match,get_game_ratings_summary,get_my_rating_history}',
  'Shared ratings: organizer rates confirmed players, participants review the match')
on conflict (migration_name) do nothing;
