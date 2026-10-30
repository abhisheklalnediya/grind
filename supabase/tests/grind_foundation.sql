-- Run only on disposable local combined database; all fictional fixtures roll back.
\set ON_ERROR_STOP on
begin;
insert into auth.users(id) values
 ('90000000-0000-4000-8000-000000000001'),
 ('90000000-0000-4000-8000-000000000002'),
 ('90000000-0000-4000-8000-000000000003');
set local role anon;
do $$ begin
  begin perform grind.join_grind(); raise exception 'anonymous join allowed'; exception when insufficient_privilege then null; end;
  begin perform * from grind.exercises; raise exception 'anonymous catalog allowed'; exception when insufficient_privilege then null; end;
end $$;
reset role;
set local role authenticated;
select set_config('request.jwt.claim.sub','90000000-0000-4000-8000-000000000001',true);
do $$ declare a grind.app_accounts; b grind.app_accounts; saved grind.user_settings; begin
  if exists(select 1 from grind.exercises) then raise exception 'nonmember catalog exposed'; end if;
  begin perform grind.complete_grind_setup('kg',120); raise exception 'nonmember setup allowed'; exception when insufficient_privilege then null; end;
  a := grind.join_grind(); b := grind.join_grind();
  if a.user_id <> auth.uid() or a.created_at <> b.created_at then raise exception 'join not idempotent or not caller-owned'; end if;
  if a.setup_completed_at is not null then raise exception 'join bypassed setup'; end if;
  if (select count(*) from grind.app_accounts) <> 1 then raise exception 'membership row count wrong'; end if;
  if not exists(select 1 from grind.exercises where id='10000000-0000-4000-8000-000000000001' and archived_at is null) then raise exception 'member seed unavailable'; end if;
  begin perform grind.save_grind_settings('kg',120); raise exception 'save bypassed initial setup'; exception when insufficient_privilege then null; end;
  begin perform grind.complete_grind_setup('stone',120); raise exception 'invalid unit accepted'; exception when check_violation then null; end;
  begin perform grind.complete_grind_setup('kg',0); raise exception 'zero rest accepted'; exception when check_violation then null; end;
  begin perform grind.complete_grind_setup('kg',3601); raise exception 'excess rest accepted'; exception when check_violation then null; end;
  begin perform grind.complete_grind_setup(null,120); raise exception 'null unit accepted'; exception when check_violation then null; end;
  saved := grind.complete_grind_setup('lb',90);
  if saved.preferred_unit <> 'lb' or saved.default_rest_seconds <> 90 or saved.user_id <> auth.uid() then raise exception 'setup result mismatch'; end if;
  if not exists(select 1 from grind.app_accounts where setup_completed_at is not null) then raise exception 'setup completion missing'; end if;
  perform grind.join_grind();
  if (select preferred_unit from grind.user_settings) <> 'lb' then raise exception 'rejoin overwrote settings'; end if;
  saved := grind.save_grind_settings('kg',15);
  if saved.default_rest_seconds <> 15 then raise exception 'valid bound rejected'; end if;
  begin insert into grind.app_accounts(user_id) values('90000000-0000-4000-8000-000000000003'); raise exception 'raw membership insert allowed'; exception when insufficient_privilege then null; end;
  begin update grind.user_settings set preferred_unit='lb'; raise exception 'raw settings update allowed'; exception when insufficient_privilege then null; end;
  begin delete from grind.app_accounts; raise exception 'raw membership delete allowed'; exception when insufficient_privilege then null; end;
  begin delete from grind.exercises; raise exception 'catalog delete allowed'; exception when insufficient_privilege then null; end;
  if has_schema_privilege(current_user,'grind_private','USAGE') then raise exception 'private schema exposed'; end if;
end $$;
reset role;
insert into grind.exercises(origin,owner_id,name,primary_muscle,equipment,category,load_convention) values
 ('custom','90000000-0000-4000-8000-000000000001','Fictional owner movement','Arms','Cable','Strength','Stack display weight');
set local role authenticated;
select set_config('request.jwt.claim.sub','90000000-0000-4000-8000-000000000002',true);
do $$ declare saved grind.user_settings; begin
  if exists(select 1 from grind.app_accounts) or exists(select 1 from grind.user_settings) or exists(select 1 from grind.exercises) then raise exception 'nonmember leaked data'; end if;
  perform grind.join_grind();
  if not exists(select 1 from grind.exercises where id='10000000-0000-4000-8000-000000000001' and archived_at is null) then raise exception 'member catalog unavailable'; end if;
  if exists(select 1 from grind.exercises where owner_id='90000000-0000-4000-8000-000000000001') then raise exception 'other member saw private custom exercise'; end if;
  if (select count(*) from grind.app_accounts) <> 1 or (select user_id from grind.app_accounts) <> auth.uid() then raise exception 'cross-user membership leak'; end if;
  saved := grind.complete_grind_setup('lb',3600);
  if saved.user_id <> auth.uid() then raise exception 'setup targeted other owner'; end if;
end $$;
reset role;
select set_config('request.jwt.claim.sub','',true);
set local role authenticated;
do $$ begin
  begin perform grind.join_grind(); raise exception 'missing identity accepted'; exception when insufficient_privilege then null; end;
end $$;
reset role;
do $$ begin
  if (select preferred_unit from grind.user_settings where user_id='90000000-0000-4000-8000-000000000001') <> 'kg' then raise exception 'other user mutated settings'; end if;
  if (select count(*) from grind.app_accounts where user_id in ('90000000-0000-4000-8000-000000000001','90000000-0000-4000-8000-000000000002','90000000-0000-4000-8000-000000000003')) <> 2 then raise exception 'unexpected fixture membership created'; end if;
  if not exists(select 1 from auth.users where id='90000000-0000-4000-8000-000000000003') then raise exception 'GRIND auth user removed'; end if;
end $$;
rollback;
select 'PASS: standalone Grind membership/setup/settings/catalog RLS, grants and identity preservation' as result;
