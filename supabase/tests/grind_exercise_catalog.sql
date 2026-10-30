-- Disposable combined database only; fictional fixtures roll back.
\set ON_ERROR_STOP on
begin;
insert into auth.users(id) values ('91000000-0000-4000-8000-000000000001'),('91000000-0000-4000-8000-000000000002');
insert into grind.app_accounts(user_id) values ('91000000-0000-4000-8000-000000000001');
insert into grind.exercises(id,origin,owner_id,name,primary_muscle,equipment,category,load_convention) values
 ('91000000-0000-4000-8000-000000000011','custom','91000000-0000-4000-8000-000000000001','Unique Curl','Arms','Cable','Strength','Stack'),
 ('91000000-0000-4000-8000-000000000012','grind',null,'Unique Press','Chest','Barbell','Strength','Total');
set local role authenticated;
select set_config('request.jwt.claim.sub','91000000-0000-4000-8000-000000000002',true);
do $$ begin
 begin perform * from grind.search_catalog(); raise exception 'nonmember allowed'; exception when insufficient_privilege then null; end;
end $$;
select set_config('request.jwt.claim.sub','91000000-0000-4000-8000-000000000001',true);
do $$ declare first_row grind.exercises; begin
 if (select count(*) from grind.search_catalog('unique'))<>2 then raise exception 'search failed'; end if;
 if (select count(*) from grind.search_catalog('unique','rm','abl'))<>1 then raise exception 'filter failed'; end if;
 select * into first_row from grind.search_catalog('unique',null,null,null,null,1);
 if first_row.name <> 'Unique Curl' then raise exception 'order failed'; end if;
 if (select name from grind.search_catalog('unique',null,null,first_row.name,first_row.id,1)) <> 'Unique Press' then raise exception 'cursor failed'; end if;
 if (select count(*) from grind.search_catalog('unique',null,null,null,null,1,true))<>1 then raise exception 'custom search failed'; end if;
 if (select count(*) from grind.search_catalog('unique',null,null,first_row.name,first_row.id,1,true))<>0 then raise exception 'custom pagination failed'; end if;
 begin perform * from grind.search_catalog('',null,null,null,null,51); raise exception 'limit accepted'; exception when check_violation then null; end;
 begin perform * from grind.search_catalog('',null,null,'x',null,1); raise exception 'partial cursor accepted'; exception when check_violation then null; end;
 begin perform * from grind_private.catalog_releases; raise exception 'private catalog exposed'; exception when insufficient_privilege then null; end;
end $$;
reset role;
insert into grind.app_accounts(user_id) values ('91000000-0000-4000-8000-000000000002');
set local role authenticated;
select set_config('request.jwt.claim.sub','91000000-0000-4000-8000-000000000002',true);
do $$ begin
 if (select count(*) from grind.search_catalog('unique'))<>1 then raise exception 'private exercise leaked'; end if;
end $$;
reset role;
rollback;
select 'PASS: catalog search ownership, bounds, pagination and private provenance' as result;
