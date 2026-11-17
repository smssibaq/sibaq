update public.sports set is_enabled = true where key = 'volleyball';
insert into ops.change_ledger (migration_name, owner, sport, objects, description)
values ('volleyball_enable','dev_c','volleyball','{sports}','Enable volleyball in navigation')
on conflict (migration_name) do nothing;
