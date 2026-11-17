-- Migration: 20261115000003_storage_user_files.sql
-- Description: Isolated private user-files storage bucket and RLS policies

-- 1. Create the private bucket if it does not already exist
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'user-files',
  'user-files',
  false,
  5242880, -- 5MB limit in bytes
  array['image/jpeg', 'image/png', 'image/webp', 'application/pdf', 'text/plain']
)
on conflict (id) do update set
  public = false,
  file_size_limit = 5242880,
  allowed_mime_types = array['image/jpeg', 'image/png', 'image/webp', 'application/pdf', 'text/plain'];

-- 2. Storage Policies scoped to the user's UUID folder: <auth.uid()>/...
-- Pattern: (storage.foldername(name))[1] = (select auth.uid())::text

create policy "Users can read own uploaded files"
  on storage.objects
  for select
  to authenticated
  using (
    bucket_id = 'user-files'
    and (storage.foldername(name))[1] = (select auth.uid())::text
  );

create policy "Users can upload files into own folder"
  on storage.objects
  for insert
  to authenticated
  with check (
    bucket_id = 'user-files'
    and (storage.foldername(name))[1] = (select auth.uid())::text
  );

create policy "Users can update own files in own folder"
  on storage.objects
  for update
  to authenticated
  using (
    bucket_id = 'user-files'
    and (storage.foldername(name))[1] = (select auth.uid())::text
  )
  with check (
    bucket_id = 'user-files'
    and (storage.foldername(name))[1] = (select auth.uid())::text
  );

create policy "Users can delete own files"
  on storage.objects
  for delete
  to authenticated
  using (
    bucket_id = 'user-files'
    and (storage.foldername(name))[1] = (select auth.uid())::text
  );

