-- Catalog projection: scoped membership, exact approved links, and keyset pagination.
\set ON_ERROR_STOP on
begin;
insert into auth.users(id) values ('94000000-0000-4000-8000-000000000001'),('94000000-0000-4000-8000-000000000002');
set local role authenticated;
select set_config('request.jwt.claim.sub','94000000-0000-4000-8000-000000000001',true);
select grind.join_grind(); select grind.complete_grind_setup('kg',120);
select set_config('request.jwt.claim.sub','94000000-0000-4000-8000-000000000002',true);
select grind.join_grind(); select grind.complete_grind_setup('kg',120);
reset role;
insert into grind_private.catalog_sources(source_key,repository_url,license_name,attribution,approval_state) values ('repdb','local','fixture','fixture','approved') on conflict (source_key) do nothing;
insert into grind_private.exercise_source_links(source_key,source_exercise_id,exercise_id,review_state) values ('repdb','bench-press','10000000-0000-4000-8000-000000000001','approved') on conflict (source_key,source_exercise_id) do nothing;
insert into grind.exercises(id,origin,owner_id,name,primary_muscle,equipment,category,load_convention,load_mode) values
 ('94000000-0000-4000-8000-000000000011','custom','94000000-0000-4000-8000-000000000001','My test','Arms','None','Strength','Reps','bodyweight'),
 ('94000000-0000-4000-8000-000000000012','custom','94000000-0000-4000-8000-000000000002','Other test','Arms','None','Strength','Reps','bodyweight');
set local role authenticated;
select set_config('request.jwt.claim.sub','94000000-0000-4000-8000-000000000001',true);
do $$ declare rec record; page_count integer; seen integer:=0; last_name text:=null; last_id uuid:=null;
 seed_seen boolean:=false; own_seen boolean:=false; other_seen boolean:=false; seen_ids uuid[]:='{}'; begin
 loop
  page_count:=0;
  for rec in select * from grind.catalog_with_sources(last_name,last_id,100) loop
   page_count:=page_count+1; seen:=seen+1;
   if rec.id=any(seen_ids) then raise exception 'pagination duplicated an exercise'; end if;
   seen_ids:=array_append(seen_ids,rec.id);
   if rec.id='10000000-0000-4000-8000-000000000001' and rec.source_key='repdb' and rec.source_exercise_id='bench-press' then seed_seen:=true; end if;
   if rec.id='94000000-0000-4000-8000-000000000011' and rec.source_key is null then own_seen:=true; end if;
   if rec.id='94000000-0000-4000-8000-000000000012' then other_seen:=true; end if;
   last_name:=rec.name; last_id:=rec.id;
  end loop;
  exit when page_count<100;
  if seen>10000 then raise exception 'pagination did not terminate'; end if;
 end loop;
 if seen=0 then raise exception 'catalog unexpectedly empty'; end if;
 if not seed_seen then raise exception 'seed source mapping absent'; end if;
 if other_seen then raise exception 'other custom exercise leaked'; end if;
 if not own_seen then raise exception 'own custom missing'; end if;
 begin perform grind.catalog_with_sources(null,null,101); raise exception 'excessive limit accepted'; exception when check_violation then null; end;
 begin perform grind.catalog_with_sources('name',null,10); raise exception 'partial cursor accepted'; exception when check_violation then null; end;
end $$;
reset role;
set local role anon;
do $$ begin
 begin perform grind.catalog_with_sources(); raise exception 'anonymous catalog projection accepted'; exception when insufficient_privilege then null; end;
end $$;
reset role;
rollback;
