-- STEP 2 - MIGRATION: squad logos. Additive and idempotent; safe to re-run.
-- Requires public.is_squad_manager(uuid, uuid) (owner/admin check). The `avatars` bucket and its
-- own-folder policies already exist (migration 20261117000012) and are not touched.

-- 1. Column
alter table public.squads add column if not exists image_url text;

-- 2. Public bucket (random uuid file names), 2 MB, images only
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('squad-images', 'squad-images', true, 2097152, array['image/jpeg', 'image/png', 'image/webp'])
on conflict (id) do nothing;

-- 3. Squad id from an object path "squads/<squadId>/<file>"; null for any other shape
create or replace function public.squad_image_squad_id(p_name text)
returns uuid
language sql
immutable
set search_path = public
as $$
  select case
    when (storage.foldername(p_name))[1] = 'squads'
     and (storage.foldername(p_name))[2] ~* '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$'
    then ((storage.foldername(p_name))[2])::uuid
  end;
$$;
grant execute on function public.squad_image_squad_id(text) to authenticated;

-- 4. Storage policies: only the squad owner / admin (checked against real membership rows)
--    can write. Reads need no policy because the bucket is public.
drop policy if exists "Squad managers can upload squad images" on storage.objects;
create policy "Squad managers can upload squad images"
  on storage.objects for insert to authenticated
  with check (
    bucket_id = 'squad-images'
    and public.is_squad_manager(public.squad_image_squad_id(name), (select auth.uid()))
  );

drop policy if exists "Squad managers can update squad images" on storage.objects;
create policy "Squad managers can update squad images"
  on storage.objects for update to authenticated
  using (
    bucket_id = 'squad-images'
    and public.is_squad_manager(public.squad_image_squad_id(name), (select auth.uid()))
  )
  with check (
    bucket_id = 'squad-images'
    and public.is_squad_manager(public.squad_image_squad_id(name), (select auth.uid()))
  );

drop policy if exists "Squad managers can delete squad images" on storage.objects;
create policy "Squad managers can delete squad images"
  on storage.objects for delete to authenticated
  using (
    bucket_id = 'squad-images'
    and public.is_squad_manager(public.squad_image_squad_id(name), (select auth.uid()))
  );

-- 5. Only way for the client to change squads.image_url: owner/admin, and the URL must point
--    at this squad's own folder in the squad-images bucket (or be null to remove).
create or replace function public.set_squad_image(p_squad uuid, p_image_url text)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  if auth.uid() is null then
    raise exception 'Unauthenticated' using errcode = '42501';
  end if;
  if not public.is_squad_manager(p_squad, auth.uid()) then
    raise exception 'Forbidden: only the squad owner or an admin can change the squad image' using errcode = '42501';
  end if;
  if p_image_url is not null
     and position('/storage/v1/object/public/squad-images/squads/' || p_squad::text || '/' in p_image_url) = 0 then
    raise exception 'Invalid squad image URL' using errcode = '22023';
  end if;
  update public.squads set image_url = p_image_url where id = p_squad;
end;
$$;
revoke all on function public.set_squad_image(uuid, text) from public, anon;
grant execute on function public.set_squad_image(uuid, text) to authenticated;

-- 6. Ledger entry (skipped automatically if ops.change_ledger does not exist in your project)
do $$
begin
  if to_regclass('ops.change_ledger') is not null then
    insert into ops.change_ledger (migration_name, owner, sport, objects, description)
    values ('squad_images', 'dev_a', null,
      '{squads.image_url,squad-images,set_squad_image,squad_image_squad_id}',
      'Squad logos: image_url column, squad-images bucket, owner/admin-only storage policies')
    on conflict (migration_name) do nothing;
  end if;
end $$;
