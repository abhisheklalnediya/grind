-- Catalog-only pending logging configuration never creates a fake workout snapshot.
\set ON_ERROR_STOP on
begin;
insert into auth.users(id) values ('95000000-0000-4000-8000-000000000001');
insert into grind.exercises(id,origin,name,primary_muscle,equipment,category,load_convention,load_mode,tracking_type,is_configured) values
 ('95000000-0000-4000-8000-000000000101','provider','000 Catalog only','Core','Unknown','Stretching',null,null,null,false);
set local role authenticated;
select set_config('request.jwt.claim.sub','95000000-0000-4000-8000-000000000001',true);
select grind.join_grind(); select grind.complete_grind_setup('kg',120);
do $$ declare w jsonb; wid uuid; eid uuid:=gen_random_uuid(); begin
 if not exists(select 1 from grind.catalog_with_sources() x where x.id='95000000-0000-4000-8000-000000000101' and not x.is_configured and x.load_mode is null and x.tracking_type is null and x.load_convention is null) then raise exception 'pending catalog projection missing'; end if;
 w:=grind.start_workout(gen_random_uuid()); wid:=(w->>'id')::uuid;
 begin
  perform grind.apply_workout_command(gen_random_uuid(),wid,0,jsonb_build_object('type','add_exercise','id',eid,'exercise_id','95000000-0000-4000-8000-000000000101','position',0,'load_mode','bodyweight','tracking_type','duration','notes','','rest_seconds',120));
  raise exception 'unconfigured catalog exercise added to workout';
 exception when check_violation then null; end;
 begin
  perform grind.save_routine(gen_random_uuid(),null,null,jsonb_build_object('name','Fixture','exercises',jsonb_build_array(jsonb_build_object('id',eid,'exercise_id','95000000-0000-4000-8000-000000000101','position',0,'load_mode','bodyweight','tracking_type','duration','notes','','rest_seconds',120,'sets','[]'::jsonb))));
  raise exception 'unconfigured catalog exercise added to routine';
 exception when check_violation then null; end;
 if grind.get_workout(wid)->>'revision'<>'0' then raise exception 'rejected mutation changed workout'; end if;
 perform grind.cancel_workout(gen_random_uuid(),wid,0);
end $$;
reset role;
do $$ begin
 begin insert into grind.exercises(origin,name,primary_muscle,equipment,category,load_convention,load_mode,tracking_type,is_configured) values ('provider','Invalid partial','Core','Unknown','Strength',null,'external',null,false); raise exception 'partial configuration accepted'; exception when check_violation then null; end;
 begin insert into grind.exercises(origin,name,primary_muscle,equipment,category,load_convention,load_mode,tracking_type,is_configured) values ('grind','Invalid origin','Core','Unknown','Strength',null,null,null,false); raise exception 'unconfigured nonprovider accepted'; exception when check_violation then null; end;
 begin update grind.exercises set is_configured=false,load_mode=null,load_convention=null,tracking_type=null where id='10000000-0000-4000-8000-000000000001'; raise exception 'configured seed downgrade accepted'; exception when check_violation then null; end;
 update grind.exercises set is_configured=true,load_mode='bodyweight',load_convention='Duration',tracking_type='duration' where id='95000000-0000-4000-8000-000000000101';
end $$;
set local role authenticated;
do $$ declare w jsonb; begin
 w:=grind.start_workout(gen_random_uuid());
 w:=grind.apply_workout_command(gen_random_uuid(),(w->>'id')::uuid,0,jsonb_build_object('type','add_exercise','id',gen_random_uuid(),'exercise_id','95000000-0000-4000-8000-000000000101','position',0,'load_mode','bodyweight','tracking_type','duration','notes','','rest_seconds',120));
 if w#>>'{exercises,0,tracking_type}'<>'duration' or w#>>'{exercises,0,load_convention}'<>'Duration' then raise exception 'approved configuration was not snapshotted'; end if;
end $$;
reset role;
rollback;
