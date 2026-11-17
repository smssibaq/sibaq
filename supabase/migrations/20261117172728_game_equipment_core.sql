-- game_equipment_core: "Who is bringing the ball?" for every sport (owner: dev_a / platform)
-- Shared kit checklist on any game in public.games. Each sport declares its default
-- kit in public.sports.equipment; new games are seeded automatically by a trigger,
-- so sport modules need no changes at all.

-- 1. DEFAULT KIT PER SPORT
alter table public.sports add column if not exists equipment jsonb not null default '[]'::jsonb
  check (jsonb_typeof(equipment) = 'array');

update public.sports set equipment =
  '[{"item":"Ball","required":true},{"item":"Bibs / vests","required":false},{"item":"Pump","required":false}]'
where key = 'football';
update public.sports set equipment =
  '[{"item":"Shuttlecocks","required":true},{"item":"Spare racket","required":false}]'
where key = 'badminton';
update public.sports set equipment =
  '[{"item":"Ball","required":true},{"item":"Bat","required":true},{"item":"Stumps","required":false},{"item":"Pads & gloves","required":false}]'
where key = 'cricket';
update public.sports set equipment =
  '[{"item":"Ball","required":true},{"item":"Net","required":false},{"item":"Pump","required":false}]'
where key = 'volleyball';

-- 2. THE CHECKLIST
create table if not exists public.game_equipment (
  id uuid primary key default gen_random_uuid(),
  game_id uuid not null,
  sport text not null,
  item text not null check (length(trim(item)) between 1 and 40),
  is_required boolean not null default false,
  claimed_by uuid references public.profiles(id) on delete set null,
  claimed_at timestamptz,
  is_brought boolean not null default false,
  note text check (note is null or length(note) <= 80),
  created_by uuid references public.profiles(id) on delete set null,  -- null = auto-seeded
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint fk_game_equipment_game foreign key (game_id, sport)
    references public.games(id, sport) on delete cascade,
  constraint chk_brought_needs_claim check (not is_brought or claimed_by is not null)
);

create unique index if not exists uq_game_equipment_item
  on public.game_equipment (game_id, lower(trim(item)));
create index if not exists idx_game_equipment_game on public.game_equipment(game_id);
create index if not exists idx_game_equipment_claimed on public.game_equipment(claimed_by);

alter table public.game_equipment enable row level security;

drop policy if exists "Equipment visible to game viewers" on public.game_equipment;
create policy "Equipment visible to game viewers"
  on public.game_equipment for select to authenticated
  using (public.can_view_game(game_id, (select auth.uid())));
-- No write policies: everything goes through the RPCs below.

-- 3. SEED EVERY NEW GAME WITH ITS SPORT'S DEFAULT KIT
create or replace function public.seed_game_equipment()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.game_equipment (game_id, sport, item, is_required)
  select new.id, new.sport, trim(e->>'item'), coalesce((e->>'required')::boolean, false)
  from public.sports s, jsonb_array_elements(s.equipment) e
  where s.key = new.sport and length(trim(coalesce(e->>'item', ''))) > 0
  on conflict do nothing;
  return new;
end;
$$;

drop trigger if exists trg_seed_game_equipment on public.games;
create trigger trg_seed_game_equipment
  after insert on public.games
  for each row execute function public.seed_game_equipment();

-- Backfill games that already exist
insert into public.game_equipment (game_id, sport, item, is_required)
select g.id, g.sport, trim(e->>'item'), coalesce((e->>'required')::boolean, false)
from public.games g
join public.sports s on s.key = g.sport
cross join lateral jsonb_array_elements(s.equipment) e
where length(trim(coalesce(e->>'item', ''))) > 0
on conflict do nothing;

-- 4. READ: one call for the panel
create or replace function public.get_game_equipment(p_game uuid)
returns jsonb
language plpgsql
security definer
set search_path = public
stable
as $$
declare
  v_uid uuid := auth.uid();
  v_can_edit boolean;
  v_can_claim boolean;
begin
  if not public.can_view_game(p_game, v_uid) then
    raise exception 'Forbidden' using errcode = '42501';
  end if;
  v_can_edit := public.is_game_organizer(p_game, v_uid);
  v_can_claim := v_can_edit or public.is_game_participant(p_game, v_uid);

  return jsonb_build_object(
    'game_id', p_game,
    'can_edit', v_can_edit,
    'can_claim', v_can_claim,
    'total_count', (select count(*) from public.game_equipment where game_id = p_game),
    'claimed_count', (select count(*) from public.game_equipment where game_id = p_game and claimed_by is not null),
    'unclaimed_required', (select count(*) from public.game_equipment
                           where game_id = p_game and is_required and claimed_by is null),
    'items', coalesce((
      select jsonb_agg(jsonb_build_object(
        'id', eq.id,
        'item', eq.item,
        'is_required', eq.is_required,
        'claimed_by', eq.claimed_by,
        'claimed_by_name', coalesce(pr.display_name, pr.full_name),
        'claimed_by_avatar', nullif(pr.avatar_url, ''),
        'is_mine', eq.claimed_by = v_uid,
        'is_brought', eq.is_brought,
        'note', eq.note,
        'can_remove', v_can_edit or (eq.created_by = v_uid and eq.claimed_by is null)
      ) order by eq.is_required desc, eq.created_at, eq.item)
      from public.game_equipment eq
      left join public.profiles pr on pr.id = eq.claimed_by
      where eq.game_id = p_game
    ), '[]'::jsonb)
  );
end;
$$;

-- 5. CLAIM / RELEASE — "I'll bring it"
create or replace function public.claim_game_equipment(
  p_item uuid,
  p_claim boolean default true,
  p_note text default null
) returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_uid uuid := auth.uid();
  eq record;
  v_is_org boolean;
begin
  if v_uid is null then
    raise exception 'Unauthenticated' using errcode = '42501';
  end if;

  select * into eq from public.game_equipment where id = p_item for update;
  if eq.id is null then
    raise exception 'Item not found' using errcode = 'P0002';
  end if;

  v_is_org := public.is_game_organizer(eq.game_id, v_uid);
  if not v_is_org and not public.is_game_participant(eq.game_id, v_uid) then
    raise exception 'Confirm you are playing before claiming kit' using errcode = '42501';
  end if;

  if p_claim then
    if eq.claimed_by is not null and eq.claimed_by <> v_uid then
      raise exception 'ALREADY_CLAIMED: Someone else is already bringing this' using errcode = '23505';
    end if;
    update public.game_equipment
    set claimed_by = v_uid,
        claimed_at = now(),
        note = coalesce(nullif(trim(coalesce(p_note, '')), ''), note),
        updated_at = now()
    where id = p_item;
  else
    -- release: your own claim, or an organizer freeing it up
    if eq.claimed_by is not null and eq.claimed_by <> v_uid and not v_is_org then
      raise exception 'Only the organizer can unassign someone else' using errcode = '42501';
    end if;
    update public.game_equipment
    set claimed_by = null, claimed_at = null, is_brought = false, note = null, updated_at = now()
    where id = p_item;
  end if;

  return public.get_game_equipment(eq.game_id);
end;
$$;

-- 6. ADD / REMOVE an item
create or replace function public.add_game_equipment(
  p_game uuid,
  p_item text,
  p_required boolean default false
) returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_uid uuid := auth.uid();
  v_sport text;
begin
  if v_uid is null then
    raise exception 'Unauthenticated' using errcode = '42501';
  end if;
  if not public.can_view_game(p_game, v_uid) then
    raise exception 'Forbidden' using errcode = '42501';
  end if;
  if p_item is null or length(trim(p_item)) = 0 or length(trim(p_item)) > 40 then
    raise exception 'Item name must be 1-40 characters' using errcode = '23514';
  end if;

  select sport into v_sport from public.games where id = p_game;

  insert into public.game_equipment (game_id, sport, item, is_required, created_by)
  values (p_game, v_sport, trim(p_item),
          p_required and public.is_game_organizer(p_game, v_uid), v_uid)
  on conflict do nothing;

  return public.get_game_equipment(p_game);
end;
$$;

create or replace function public.remove_game_equipment(p_item uuid)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_uid uuid := auth.uid();
  eq record;
begin
  select * into eq from public.game_equipment where id = p_item;
  if eq.id is null then
    raise exception 'Item not found' using errcode = 'P0002';
  end if;
  if not (public.is_game_organizer(eq.game_id, v_uid)
          or (eq.created_by = v_uid and eq.claimed_by is null)) then
    raise exception 'Forbidden' using errcode = '42501';
  end if;

  delete from public.game_equipment where id = p_item;
  return public.get_game_equipment(eq.game_id);
end;
$$;

-- 7. TICK OFF on the day
create or replace function public.set_equipment_brought(p_item uuid, p_brought boolean)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_uid uuid := auth.uid();
  eq record;
begin
  select * into eq from public.game_equipment where id = p_item;
  if eq.id is null then
    raise exception 'Item not found' using errcode = 'P0002';
  end if;
  if eq.claimed_by is null then
    raise exception 'Nobody is bringing this yet' using errcode = '23514';
  end if;
  if eq.claimed_by <> v_uid and not public.is_game_organizer(eq.game_id, v_uid) then
    raise exception 'Forbidden' using errcode = '42501';
  end if;

  update public.game_equipment
  set is_brought = coalesce(p_brought, false), updated_at = now()
  where id = p_item;

  return public.get_game_equipment(eq.game_id);
end;
$$;

-- 8. GRANTS
revoke all on function public.seed_game_equipment() from public, anon, authenticated;
revoke all on function public.get_game_equipment(uuid) from public, anon;
revoke all on function public.claim_game_equipment(uuid, boolean, text) from public, anon;
revoke all on function public.add_game_equipment(uuid, text, boolean) from public, anon;
revoke all on function public.remove_game_equipment(uuid) from public, anon;
revoke all on function public.set_equipment_brought(uuid, boolean) from public, anon;
grant execute on function public.get_game_equipment(uuid) to authenticated;
grant execute on function public.claim_game_equipment(uuid, boolean, text) to authenticated;
grant execute on function public.add_game_equipment(uuid, text, boolean) to authenticated;
grant execute on function public.remove_game_equipment(uuid) to authenticated;
grant execute on function public.set_equipment_brought(uuid, boolean) to authenticated;

-- 9. REALTIME
do $$
begin
  if exists (select 1 from pg_publication where pubname = 'supabase_realtime')
     and not exists (select 1 from pg_publication_tables
                     where pubname = 'supabase_realtime' and schemaname = 'public' and tablename = 'game_equipment') then
    alter publication supabase_realtime add table public.game_equipment;
  end if;
end $$;

insert into ops.change_ledger (migration_name, owner, sport, objects, description)
values ('game_equipment_core', 'dev_a', null,
  '{sports.equipment,game_equipment,seed_game_equipment,get_game_equipment,claim_game_equipment,add_game_equipment,remove_game_equipment,set_equipment_brought}',
  'Who is bringing the ball: shared kit checklist, auto-seeded per sport, claim/release/brought')
on conflict (migration_name) do nothing;
