-- STEP 3 - VERIFICATION (read-only). Run after the migration.

-- 1. Column exists -> 1 row
select column_name, data_type from information_schema.columns
where table_schema = 'public' and table_name = 'squads' and column_name = 'image_url';

-- 2. Bucket exists, public, 2 MB, 3 mime types -> 1 row
select id, public, file_size_limit, allowed_mime_types from storage.buckets where id = 'squad-images';

-- 3. Three write policies (insert / update / delete), none for anon -> 3 rows
select policyname, cmd, roles from pg_policies
where schemaname = 'storage' and tablename = 'objects' and policyname like 'Squad managers can % squad images'
order by cmd;

-- 4. Avatars policies still in place -> own-folder insert/update/delete
select policyname, cmd from pg_policies
where schemaname = 'storage' and tablename = 'objects' and policyname ilike '%avatar%' order by cmd;

-- 5. RPC is callable by signed-in users only -> anon = false, authenticated = true
select has_function_privilege('anon', 'public.set_squad_image(uuid, text)', 'execute') as anon_can_run,
       has_function_privilege('authenticated', 'public.set_squad_image(uuid, text)', 'execute') as authenticated_can_run;

-- 6. Path helper: valid path -> uuid, anything else -> null
select public.squad_image_squad_id('squads/00000000-0000-0000-0000-000000000001/a.webp') as ok_path,
       public.squad_image_squad_id('other/00000000-0000-0000-0000-000000000001/a.webp') as wrong_prefix,
       public.squad_image_squad_id('squads/not-a-uuid/a.webp') as bad_id;
