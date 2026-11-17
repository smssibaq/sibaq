-- Migration: 20261115000001_initial_profiles_and_roles.sql
-- Description: Core profiles, role management, and secure admin authorization

-- 1. Profiles Table
create table if not exists public.profiles (
  id uuid references auth.users(id) on delete cascade primary key,
  email text not null,
  full_name text,
  avatar_url text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- 2. User Roles Table
create table if not exists public.user_roles (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users(id) on delete cascade not null,
  role text not null check (role in ('admin', 'user')) default 'user',
  created_at timestamptz not null default now(),
  constraint uq_user_roles_user_role unique (user_id, role)
);

-- Indexes
create index if not exists idx_profiles_email on public.profiles(email);
create index if not exists idx_user_roles_user_id on public.user_roles(user_id);

-- 3. Security Definer Helper for Admin Checks (prevents RLS recursion)
create or replace function public.is_admin(check_user_id uuid)
returns boolean
language sql
security definer
set search_path = public
stable
as $$
  select exists (
    select 1
    from public.user_roles
    where user_id = check_user_id
      and role = 'admin'
  );
$$;

revoke all on function public.is_admin(uuid) from public;
grant execute on function public.is_admin(uuid) to authenticated;

-- 4. Automatic Profile and Default Role Bootstrap Trigger
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  -- Idempotent insert into public.profiles
  insert into public.profiles (id, email, full_name, avatar_url)
  values (
    new.id,
    coalesce(new.email, ''),
    coalesce(new.raw_user_meta_data->>'full_name', new.raw_user_meta_data->>'name', ''),
    coalesce(new.raw_user_meta_data->>'avatar_url', new.raw_user_meta_data->>'picture', '')
  )
  on conflict (id) do update set
    email = excluded.email,
    full_name = coalesce(excluded.full_name, public.profiles.full_name),
    avatar_url = coalesce(excluded.avatar_url, public.profiles.avatar_url),
    updated_at = now();

  -- Assign default 'user' role (never admin)
  insert into public.user_roles (user_id, role)
  values (new.id, 'user')
  on conflict (user_id, role) do nothing;

  return new;
end;
$$;

-- Trigger attached to auth.users
drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- 5. Row Level Security Policies

-- Enable RLS
alter table public.profiles enable row level security;
alter table public.user_roles enable row level security;

-- Profiles Policies
create policy "Authenticated users can read basic profiles"
  on public.profiles
  for select
  to authenticated
  using (true);

create policy "Users can update their own profile"
  on public.profiles
  for update
  to authenticated
  using ((select auth.uid()) = id)
  with check ((select auth.uid()) = id);

-- User Roles Policies
create policy "Users can read own role and admins can read all roles"
  on public.user_roles
  for select
  to authenticated
  using (
    (select auth.uid()) = user_id
    or public.is_admin((select auth.uid()))
  );

create policy "Only verified admins can insert roles"
  on public.user_roles
  for insert
  to authenticated
  with check (public.is_admin((select auth.uid())));

create policy "Only verified admins can update roles"
  on public.user_roles
  for update
  to authenticated
  using (public.is_admin((select auth.uid())))
  with check (public.is_admin((select auth.uid())));

create policy "Only verified admins can delete roles"
  on public.user_roles
  for delete
  to authenticated
  using (public.is_admin((select auth.uid())));

