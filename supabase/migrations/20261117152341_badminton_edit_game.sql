-- Developer A: badminton-only organizer editing. Coordinate application to the
-- configured project; do not apply to the conflicting project in the brief.
create or replace function public.badminton_update_game(
  p_game uuid, p_title text, p_venue text, p_starts_at timestamptz
) returns void language plpgsql security definer set search_path = public
as $$
begin
  if auth.uid() is null or not public.is_game_organizer(p_game, auth.uid()) then
    raise exception 'Forbidden: organizer only' using errcode = '42501';
  end if;
  perform 1 from public.badminton_games where id = p_game for update;
  if not found then raise exception 'Badminton game not found' using errcode = 'P0002'; end if;
  if nullif(trim(p_title), '') is null or p_starts_at is null then
    raise exception 'Title and start time are required' using errcode = '22023';
  end if;
  perform public.update_game_core(p_game, trim(p_title), trim(p_venue), p_starts_at, null);
end;
$$;
revoke all on function public.badminton_update_game(uuid, text, text, timestamptz) from public, anon;
grant execute on function public.badminton_update_game(uuid, text, text, timestamptz) to authenticated;
insert into ops.change_ledger(migration_name, owner, sport, objects, description)
values ('badminton_edit_game', 'dev_a', 'badminton', '{badminton_update_game}', 'Organizer-only badminton title, venue and schedule editing; no shared schema changes')
on conflict (migration_name) do nothing;
