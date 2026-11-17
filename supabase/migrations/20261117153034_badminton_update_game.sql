-- Organizer edits title / venue / start time of a badminton game (wraps the shared update_game_core).
create or replace function public.badminton_update_game(
  p_game uuid,
  p_title text,
  p_venue text,
  p_starts_at timestamptz
) returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  if auth.uid() is null then
    raise exception 'Unauthenticated' using errcode = '42501';
  end if;
  if not exists (select 1 from public.badminton_games where id = p_game) then
    raise exception 'Game not found' using errcode = 'P0002';
  end if;
  if p_title is null or char_length(trim(p_title)) < 2 then
    raise exception 'Title is required' using errcode = '22023';
  end if;
  if p_starts_at is null then
    raise exception 'Start time is required' using errcode = '22023';
  end if;
  -- organizer check happens inside update_game_core
  perform public.update_game_core(p_game, trim(p_title), coalesce(trim(p_venue), ''), p_starts_at, null);
end;
$$;

revoke all on function public.badminton_update_game(uuid, text, text, timestamptz) from public, anon;
grant execute on function public.badminton_update_game(uuid, text, text, timestamptz) to authenticated;

insert into ops.change_ledger (migration_name, owner, sport, objects, description)
values ('badminton_update_game', 'dev_a', 'badminton', '{badminton_update_game}',
  'Organizer can edit badminton game title, venue and start time')
on conflict (migration_name) do nothing;
