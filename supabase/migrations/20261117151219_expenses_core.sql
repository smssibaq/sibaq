-- expenses_core: shared money splitting for every sport (owner: dev_a)

create table if not exists public.game_expenses (
  id uuid primary key default gen_random_uuid(),
  game_id uuid not null,
  sport text not null,
  organizer_id uuid not null references public.profiles(id) on delete cascade,
  base_amount numeric(12,2) not null check (base_amount > 0),
  extra_amount numeric(12,2) not null default 0 check (extra_amount >= 0),
  total_amount numeric(12,2) generated always as (base_amount + extra_amount) stored,
  description text check (description is null or length(description) <= 200),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint uq_game_expenses_game unique (game_id),
  constraint fk_game_expenses_game foreign key (game_id, sport)
    references public.games(id, sport) on delete cascade
);

create table if not exists public.game_expense_shares (
  id uuid primary key default gen_random_uuid(),
  expense_id uuid not null references public.game_expenses(id) on delete cascade,
  player_id uuid not null references public.profiles(id) on delete cascade,
  share_amount numeric(12,2) not null check (share_amount >= 0),
  paid_amount numeric(12,2) not null default 0 check (paid_amount >= 0),
  is_manual boolean not null default false,
  status text generated always as (
    case when paid_amount <= 0 then 'unpaid'
         when paid_amount >= share_amount then 'paid'
         else 'partial' end
  ) stored,
  updated_at timestamptz not null default now(),
  constraint uq_expense_share_player unique (expense_id, player_id)
);

create index if not exists idx_expense_shares_player on public.game_expense_shares(player_id);

alter table public.game_expenses enable row level security;
alter table public.game_expense_shares enable row level security;

drop policy if exists "Expenses visible to organizer and participants" on public.game_expenses;
create policy "Expenses visible to organizer and participants"
  on public.game_expenses for select to authenticated
  using (
    public.is_game_organizer(game_id, (select auth.uid()))
    or public.is_game_participant(game_id, (select auth.uid()))
  );

drop policy if exists "Shares visible to organizer or own player" on public.game_expense_shares;
create policy "Shares visible to organizer or own player"
  on public.game_expense_shares for select to authenticated
  using (
    player_id = (select auth.uid())
    or exists (
      select 1 from public.game_expenses e
      where e.id = game_expense_shares.expense_id
        and public.is_game_organizer(e.game_id, (select auth.uid()))
    )
  );
-- No write policies: all writes go through the RPCs below.

-- Internal: (re)split the non-manual part across confirmed players, in integer paise.
create or replace function public.expense_resplit_internal(p_expense uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_game uuid;
  v_total_paise bigint;
  v_manual_paise bigint;
  v_n integer;
  v_each bigint;
  v_rem integer;
  r record;
  i integer := 0;
begin
  select game_id, round(total_amount * 100)::bigint into v_game, v_total_paise
  from public.game_expenses where id = p_expense for update;

  -- drop unpaid, non-manual shares of players who are no longer confirmed
  delete from public.game_expense_shares s
  where s.expense_id = p_expense and not s.is_manual and s.paid_amount = 0
    and s.player_id not in (select x from public.game_confirmed_players(v_game) x);

  -- add newly confirmed players
  insert into public.game_expense_shares (expense_id, player_id, share_amount)
  select p_expense, x, 0 from public.game_confirmed_players(v_game) x
  on conflict (expense_id, player_id) do nothing;

  select coalesce(sum(round(share_amount * 100)), 0)::bigint into v_manual_paise
  from public.game_expense_shares where expense_id = p_expense and is_manual;

  select count(*) into v_n
  from public.game_expense_shares where expense_id = p_expense and not is_manual;

  if v_n = 0 then
    return;
  end if;

  v_each := greatest(v_total_paise - v_manual_paise, 0) / v_n;
  v_rem := (greatest(v_total_paise - v_manual_paise, 0) % v_n)::integer;

  for r in
    select id from public.game_expense_shares
    where expense_id = p_expense and not is_manual
    order by player_id
  loop
    update public.game_expense_shares
    set share_amount = ((v_each + case when i < v_rem then 1 else 0 end)::numeric / 100),
        updated_at = now()
    where id = r.id;
    i := i + 1;
  end loop;
end;
$$;

create or replace function public.create_game_expense(
  p_game uuid,
  p_base_amount numeric,
  p_extra_amount numeric default 0,
  p_description text default null
) returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_uid uuid := auth.uid();
  v_sport text;
  v_id uuid;
begin
  if v_uid is null then
    raise exception 'Unauthenticated' using errcode = '42501';
  end if;
  if not public.is_game_organizer(p_game, v_uid) then
    raise exception 'Forbidden: Only the organizer can add expenses' using errcode = '42501';
  end if;
  select sport into v_sport from public.games where id = p_game;
  if not exists (select 1 from public.game_confirmed_players(p_game)) then
    raise exception 'No confirmed players to split with' using errcode = '23514';
  end if;

  insert into public.game_expenses (game_id, sport, organizer_id, base_amount, extra_amount, description)
  values (p_game, v_sport, v_uid, round(p_base_amount, 2), round(coalesce(p_extra_amount, 0), 2), nullif(trim(coalesce(p_description, '')), ''))
  returning id into v_id;

  perform public.expense_resplit_internal(v_id);
  return v_id;
end;
$$;

create or replace function public.update_game_expense(
  p_expense uuid,
  p_base_amount numeric,
  p_extra_amount numeric default 0,
  p_description text default null
) returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_game uuid;
begin
  select game_id into v_game from public.game_expenses where id = p_expense;
  if v_game is null then
    raise exception 'Expense not found' using errcode = 'P0002';
  end if;
  if not public.is_game_organizer(v_game, auth.uid()) then
    raise exception 'Forbidden' using errcode = '42501';
  end if;
  update public.game_expenses
  set base_amount = round(p_base_amount, 2),
      extra_amount = round(coalesce(p_extra_amount, 0), 2),
      description = nullif(trim(coalesce(p_description, '')), ''),
      updated_at = now()
  where id = p_expense;
  perform public.expense_resplit_internal(p_expense);
end;
$$;

-- Re-sync with the current confirmed list (keeps manual shares and payments)
create or replace function public.resplit_game_expense(p_expense uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_game uuid;
begin
  select game_id into v_game from public.game_expenses where id = p_expense;
  if v_game is null or not public.is_game_organizer(v_game, auth.uid()) then
    raise exception 'Forbidden' using errcode = '42501';
  end if;
  perform public.expense_resplit_internal(p_expense);
end;
$$;

-- Manual adjustment: fix one player's share (null = back to equal split)
create or replace function public.set_expense_share(
  p_expense uuid,
  p_player uuid,
  p_share_amount numeric
) returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_game uuid;
begin
  select game_id into v_game from public.game_expenses where id = p_expense;
  if v_game is null or not public.is_game_organizer(v_game, auth.uid()) then
    raise exception 'Forbidden' using errcode = '42501';
  end if;
  if p_share_amount is not null and p_share_amount < 0 then
    raise exception 'Share cannot be negative' using errcode = '23514';
  end if;

  insert into public.game_expense_shares (expense_id, player_id, share_amount, is_manual)
  values (p_expense, p_player, coalesce(round(p_share_amount, 2), 0), p_share_amount is not null)
  on conflict (expense_id, player_id) do update
  set share_amount = coalesce(round(p_share_amount, 2), game_expense_shares.share_amount),
      is_manual = p_share_amount is not null,
      updated_at = now();

  perform public.expense_resplit_internal(p_expense);
end;
$$;

-- Payment tracking: paid amount 0 = unpaid, >= share = paid, otherwise partial
create or replace function public.record_expense_payment(
  p_expense uuid,
  p_player uuid,
  p_paid_amount numeric
) returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_game uuid;
begin
  select game_id into v_game from public.game_expenses where id = p_expense;
  if v_game is null or not public.is_game_organizer(v_game, auth.uid()) then
    raise exception 'Forbidden' using errcode = '42501';
  end if;
  if p_paid_amount is null or p_paid_amount < 0 then
    raise exception 'Paid amount must be zero or more' using errcode = '23514';
  end if;

  update public.game_expense_shares
  set paid_amount = round(p_paid_amount, 2), updated_at = now()
  where expense_id = p_expense and player_id = p_player;

  if not found then
    raise exception 'Player has no share in this expense' using errcode = 'P0002';
  end if;
end;
$$;

-- One call for the UI. Organizer gets every share; a player gets totals + own share.
create or replace function public.get_game_expense_summary(p_game uuid)
returns jsonb
language plpgsql
security definer
set search_path = public
stable
as $$
declare
  v_uid uuid := auth.uid();
  v_is_org boolean;
  e record;
begin
  v_is_org := public.is_game_organizer(p_game, v_uid);
  if not v_is_org and not public.is_game_participant(p_game, v_uid) then
    raise exception 'Forbidden' using errcode = '42501';
  end if;

  select * into e from public.game_expenses where game_id = p_game;
  if e.id is null then
    return null;
  end if;

  return jsonb_build_object(
    'expense_id', e.id,
    'game_id', e.game_id,
    'sport', e.sport,
    'description', e.description,
    'base_amount', e.base_amount,
    'extra_amount', e.extra_amount,
    'total_amount', e.total_amount,
    'allocated_amount', (select coalesce(sum(share_amount), 0) from public.game_expense_shares where expense_id = e.id),
    'collected_amount', (select coalesce(sum(least(paid_amount, share_amount)), 0) from public.game_expense_shares where expense_id = e.id),
    'outstanding_amount', (select coalesce(sum(greatest(share_amount - paid_amount, 0)), 0) from public.game_expense_shares where expense_id = e.id),
    'unpaid_count', (select count(*) from public.game_expense_shares where expense_id = e.id and status <> 'paid'),
    'is_organizer', v_is_org,
    'shares', coalesce((
      select jsonb_agg(jsonb_build_object(
        'player_id', s.player_id,
        'display_name', coalesce(p.display_name, p.full_name, 'Player'),
        'share_amount', s.share_amount,
        'paid_amount', s.paid_amount,
        'status', s.status,
        'is_manual', s.is_manual
      ) order by s.status desc, coalesce(p.display_name, p.full_name))
      from public.game_expense_shares s
      left join public.profiles p on p.id = s.player_id
      where s.expense_id = e.id and (v_is_org or s.player_id = v_uid)
    ), '[]'::jsonb)
  );
end;
$$;

revoke all on function public.expense_resplit_internal(uuid) from public, anon, authenticated;
revoke all on function public.create_game_expense(uuid, numeric, numeric, text) from public, anon;
revoke all on function public.update_game_expense(uuid, numeric, numeric, text) from public, anon;
revoke all on function public.resplit_game_expense(uuid) from public, anon;
revoke all on function public.set_expense_share(uuid, uuid, numeric) from public, anon;
revoke all on function public.record_expense_payment(uuid, uuid, numeric) from public, anon;
revoke all on function public.get_game_expense_summary(uuid) from public, anon;
grant execute on function public.create_game_expense(uuid, numeric, numeric, text) to authenticated;
grant execute on function public.update_game_expense(uuid, numeric, numeric, text) to authenticated;
grant execute on function public.resplit_game_expense(uuid) to authenticated;
grant execute on function public.set_expense_share(uuid, uuid, numeric) to authenticated;
grant execute on function public.record_expense_payment(uuid, uuid, numeric) to authenticated;
grant execute on function public.get_game_expense_summary(uuid) to authenticated;

do $$
begin
  if exists (select 1 from pg_publication where pubname = 'supabase_realtime')
     and not exists (select 1 from pg_publication_tables
                     where pubname = 'supabase_realtime' and schemaname = 'public' and tablename = 'game_expense_shares') then
    alter publication supabase_realtime add table public.game_expense_shares;
  end if;
end $$;

insert into ops.change_ledger (migration_name, owner, sport, objects, description)
values ('expenses_core', 'dev_a', null,
  '{game_expenses,game_expense_shares,create_game_expense,update_game_expense,resplit_game_expense,set_expense_share,record_expense_payment,get_game_expense_summary}',
  'Shared money splitting: equal split in paise, manual shares, payment tracking, summary')
on conflict (migration_name) do nothing;