-- MANUAL REPAIR: existing squad-images bucket only. No bucket recreation or data deletion.
begin;
alter table public.squads add column if not exists image_url text;
do $$ begin
 if not exists(select 1 from storage.buckets where id='squad-images') then
  raise exception 'Bucket squad-images is missing. Apply the existing squad_images migration first.';
 end if;
end $$;
create or replace function public.can_manage_squad_image(p_squad uuid,p_user uuid)
returns boolean language sql stable security definer set search_path=public as $$
 select p_user is not null and p_user=auth.uid() and (
  exists(select 1 from public.squads s where s.id=p_squad and s.owner_id=p_user)
  or exists(select 1 from public.squad_members m where m.squad_id=p_squad and m.user_id=p_user and m.status='active' and m.role in ('owner','admin'))
 );
$$;
revoke all on function public.can_manage_squad_image(uuid,uuid) from public,anon;
grant execute on function public.can_manage_squad_image(uuid,uuid) to authenticated;
create or replace function public.squad_image_squad_id(p_name text)
returns uuid language sql immutable set search_path=public as $$
 select case when (storage.foldername(p_name))[1]='squads'
 and (storage.foldername(p_name))[2] ~* '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$'
 and array_length(storage.foldername(p_name),1)=2
 then ((storage.foldername(p_name))[2])::uuid end;
$$;
grant execute on function public.squad_image_squad_id(text) to authenticated;
drop policy if exists "Squad managers can select squad images" on storage.objects;
create policy "Squad managers can select squad images" on storage.objects for select to authenticated
using(bucket_id='squad-images' and public.can_manage_squad_image(public.squad_image_squad_id(name),auth.uid()));
drop policy if exists "Squad managers can upload squad images" on storage.objects;
create policy "Squad managers can upload squad images" on storage.objects for insert to authenticated
with check(bucket_id='squad-images' and public.can_manage_squad_image(public.squad_image_squad_id(name),auth.uid()));
drop policy if exists "Squad managers can update squad images" on storage.objects;
create policy "Squad managers can update squad images" on storage.objects for update to authenticated
using(bucket_id='squad-images' and public.can_manage_squad_image(public.squad_image_squad_id(name),auth.uid()))
with check(bucket_id='squad-images' and public.can_manage_squad_image(public.squad_image_squad_id(name),auth.uid()));
drop policy if exists "Squad managers can delete squad images" on storage.objects;
create policy "Squad managers can delete squad images" on storage.objects for delete to authenticated
using(bucket_id='squad-images' and public.can_manage_squad_image(public.squad_image_squad_id(name),auth.uid()));
create or replace function public.set_squad_image(p_squad uuid,p_image_url text)
returns void language plpgsql security definer set search_path=public as $$
begin
 if not public.can_manage_squad_image(p_squad,auth.uid()) then raise exception 'Forbidden: squad owner or active squad admin required' using errcode='42501'; end if;
 if p_image_url is not null and p_image_url !~ ('^https://[^/]+/storage/v1/object/public/squad-images/squads/'||p_squad::text||'/[a-zA-Z0-9_.-]+$') then raise exception 'Invalid squad image URL' using errcode='22023'; end if;
 update public.squads set image_url=p_image_url where id=p_squad;
 if not found then raise exception 'Squad not found' using errcode='P0002'; end if;
end $$;
revoke all on function public.set_squad_image(uuid,text) from public,anon;
grant execute on function public.set_squad_image(uuid,text) to authenticated;
notify pgrst,'reload schema';
commit;

-- VERIFICATION (read-only): four scoped Storage policies, correct bucket, restricted RPC.
select id,public from storage.buckets where id='squad-images';
select policyname,cmd,roles,qual,with_check from pg_policies where schemaname='storage' and tablename='objects' and policyname like 'Squad managers can % squad images';
select has_function_privilege('anon','public.set_squad_image(uuid,text)','execute') as anon_must_be_false,
 has_function_privilege('authenticated','public.set_squad_image(uuid,text)','execute') as authenticated_must_be_true;
select id,owner_id,image_url from public.squads order by created_at desc limit 10;
-- After upload/change/remove in app, confirm image_url updates above.
-- SQL Editor has no user JWT: auth.uid() is NULL there. Test owner/admin actions in the signed-in app.
