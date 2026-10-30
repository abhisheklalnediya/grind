-- Only approved RepDB dumbbell/EZ-bar rows get weight-and-rep logging.
\set ON_ERROR_STOP on
begin;
insert into grind_private.catalog_sources(source_key,repository_url,license_name,attribution,approval_state)
values ('repdb','https://github.com/RepDB/exercise-dataset','RepDB Free','Exercise data by RepDB (repdb.co)','approved')
on conflict (source_key) do nothing;
-- Rollback-only fixture: vacate the existing active-release slot if populated.
update grind_private.catalog_releases set state='retired'
where source_key='repdb' and state='active';
insert into grind_private.catalog_releases(id,source_key,revision_kind,revision,manifest_hash,schema_version,importer_version,mapping_version,state,record_count)
values ('97000000-0000-4000-8000-000000000001','repdb','archive_sha256',repeat('a',64),repeat('b',64),'3','fixture','fixture','active',4);
insert into grind.exercises(id,origin,name,primary_muscle,equipment,category,load_convention,load_mode,tracking_type,is_configured) values
 ('97000000-0000-4000-8000-000000000101','provider','Fixture dumbbell','Chest','Dumbbell','Strength',null,null,null,false),
 ('97000000-0000-4000-8000-000000000102','provider','Fixture EZ bar','Arms','EZ Curl Bar','Strength',null,null,null,false),
 ('97000000-0000-4000-8000-000000000103','provider','Fixture barbell control','Chest','Barbell','Strength',null,null,null,false),
 ('97000000-0000-4000-8000-000000000104','provider','Fixture cable control','Back','Cable Machine','Strength',null,null,null,false);
insert into grind_private.exercise_source_records(release_id,source_exercise_id,record_hash,raw_payload,rights_state) values
 ('97000000-0000-4000-8000-000000000001','fixture-dumbbell',repeat('c',64),'{}','approved'),
 ('97000000-0000-4000-8000-000000000001','fixture-ez',repeat('d',64),'{}','approved'),
 ('97000000-0000-4000-8000-000000000001','fixture-barbell',repeat('e',64),'{}','approved'),
 ('97000000-0000-4000-8000-000000000001','fixture-cable',repeat('f',64),'{}','approved');
insert into grind_private.exercise_source_links(source_key,source_exercise_id,exercise_id,review_state,rationale) values
 ('repdb','fixture-dumbbell','97000000-0000-4000-8000-000000000101','approved','approved dumbbell rule'),
 ('repdb','fixture-ez','97000000-0000-4000-8000-000000000102','approved','approved EZ-bar rule'),
 ('repdb','fixture-barbell','97000000-0000-4000-8000-000000000103','approved','previous equipment batch'),
 ('repdb','fixture-cable','97000000-0000-4000-8000-000000000104','approved','unrelated control');
do $$ begin
 if grind_private.configure_dumbbell_ez_bar_catalog() <> 2 then raise exception 'expected two matching exercises'; end if;
 if not exists(select 1 from grind.exercises where id='97000000-0000-4000-8000-000000000101' and is_configured and load_mode='external' and tracking_type='reps' and load_convention='Weight per dumbbell') then raise exception 'dumbbell rule missing'; end if;
 if not exists(select 1 from grind.exercises where id='97000000-0000-4000-8000-000000000102' and is_configured and load_mode='external' and tracking_type='reps' and load_convention='Total EZ-bar weight') then raise exception 'EZ-bar rule missing'; end if;
 if exists(select 1 from grind.exercises where id in ('97000000-0000-4000-8000-000000000103','97000000-0000-4000-8000-000000000104') and is_configured) then raise exception 'unrelated equipment was enabled'; end if;
 if grind_private.configure_dumbbell_ez_bar_catalog() <> 0 then raise exception 'configuration is not idempotent'; end if;
end $$;
insert into auth.users(id) values ('97000000-0000-4000-8000-000000000201');
set local role authenticated;
select set_config('request.jwt.claim.sub','97000000-0000-4000-8000-000000000201',true);
select grind.join_grind(); select grind.complete_grind_setup('kg',120);
do $$ declare w jsonb; r jsonb; wid uuid; eid uuid; begin
 w:=grind.start_workout(gen_random_uuid()); wid:=(w->>'id')::uuid; eid:=gen_random_uuid();
 w:=grind.apply_workout_command(gen_random_uuid(),wid,0,jsonb_build_object('type','add_exercise','id',eid,'exercise_id','97000000-0000-4000-8000-000000000101','position',0,'load_mode','external','tracking_type','reps','notes','','rest_seconds',120));
 if w#>>'{exercises,0,load_convention}'<>'Weight per dumbbell' then raise exception 'dumbbell selection snapshot failed'; end if;
 w:=grind.apply_workout_command(gen_random_uuid(),wid,1,jsonb_build_object('type','upsert_set','exercise_id',eid,'set',jsonb_build_object('id',gen_random_uuid(),'position',0,'set_type','working','entered_load','25','entered_unit','kg','reps',8)));
 if w#>>'{exercises,0,sets,0,entered_load}'<>'25' or w#>>'{exercises,0,sets,0,reps}'<>'8' then raise exception 'dumbbell weight-and-rep logging failed'; end if;
 r:=grind.save_routine(gen_random_uuid(),null,null,jsonb_build_object('name','EZ-bar selection fixture','exercises',jsonb_build_array(jsonb_build_object('id',gen_random_uuid(),'exercise_id','97000000-0000-4000-8000-000000000102','position',0,'load_mode','external','tracking_type','reps','notes','','rest_seconds',120,'sets','[]'::jsonb))));
 if r#>>'{exercises,0,load_convention}'<>'Total EZ-bar weight' then raise exception 'EZ-bar routine selection failed'; end if;
 perform grind.cancel_workout(gen_random_uuid(),wid,2);
end $$;
do $$ begin
 begin perform grind_private.configure_dumbbell_ez_bar_catalog(); raise exception 'app role can configure global catalog';
 exception when insufficient_privilege then null; end;
end $$;
reset role;
rollback;
select 'PASS: dumbbell/EZ-bar configuration, selection, logging, and isolation';
