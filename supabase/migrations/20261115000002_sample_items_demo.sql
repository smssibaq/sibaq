-- Migration: 20261115000002_sample_items_demo.sql
-- Description: Removable sample items demonstration table with strict owner RLS & admin oversight

create table if not exists public.sample_items (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid references auth.users(id) on delete cascade not null default (select auth.uid()),
  title text not null check (char_length(trim(title)) >= 1),
  description text,
  status text not null check (status in ('draft', 'active', 'archived')) default 'draft',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- Index for owner lookups and status filtering
create index if not exists idx_sample_items_owner_id on public.sample_items(owner_id);
create index if not exists idx_sample_items_status on public.sample_items(status);

-- Enable RLS
alter table public.sample_items enable row level security;

-- Policies
create policy "Owners and admins can view sample items"
  on public.sample_items
  for select
  to authenticated
  using (
    (select auth.uid()) = owner_id
    or public.is_admin((select auth.uid()))
  );

create policy "Owners can create sample items"
  on public.sample_items
  for insert
  to authenticated
  with check (
    (select auth.uid()) = owner_id
  );

create policy "Owners and admins can update sample items"
  on public.sample_items
  for update
  to authenticated
  using (
    (select auth.uid()) = owner_id
    or public.is_admin((select auth.uid()))
  )
  with check (
    (select auth.uid()) = owner_id
    or public.is_admin((select auth.uid()))
  );

create policy "Owners and admins can delete sample items"
  on public.sample_items
  for delete
  to authenticated
  using (
    (select auth.uid()) = owner_id
    or public.is_admin((select auth.uid()))
  );

