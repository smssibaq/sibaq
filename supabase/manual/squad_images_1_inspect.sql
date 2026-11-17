-- STEP 1 - INSPECTION (read-only). Run first; nothing here changes data.

-- Buckets (expect: avatars exists; squad-images missing before the migration)
select id, public, file_size_limit, allowed_mime_types from storage.buckets order by id;

-- Image columns on profiles / squads (expect profiles.avatar_url; no squads.image_url yet)
select table_name, column_name, data_type
from information_schema.columns
where table_schema = 'public' and table_name in ('profiles', 'squads')
  and (column_name ilike '%avatar%' or column_name ilike '%image%' or column_name ilike '%logo%');

-- Existing storage policies
select policyname, cmd, roles, qual, with_check
from pg_policies where schemaname = 'storage' and tablename = 'objects' order by policyname;

-- Helpers the migration relies on (both must return a row)
select proname, pg_get_function_identity_arguments(oid) as args
from pg_proc where pronamespace = 'public'::regnamespace and proname = 'is_squad_manager';
