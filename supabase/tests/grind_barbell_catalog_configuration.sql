-- Only approved RepDB barbell/Smith rows get weight-and-rep logging.
\set ON_ERROR_STOP on
begin;
insert into grind_private.catalog_sources(source_key,repository_url,license_name,attribution,approval_state)
values ('repdb','https://github.com/RepDB/exercise-dataset','RepDB Free','Exercise data by RepDB (repdb.co)','approved')
on conflict (source_key) do nothing;
-- This is a rollback-only fixture; temporarily vacate the active-release slot.
update grind_private.catalog_releases set state='retired'
where source_key='repdb' and state='active';
insert into grind_private.catalog_releases(id,source_key,revision_kind,revision,manifest_hash,schema_version,importer_version,mapping_version,state,record_count)
values ('96000000-0000-4000-8000-000000000001','repdb','archive_sha256',repeat('a',64),repeat('b',64),'3','fixture','fixture','active',3);
insert into grind.exercises(id,origin,name,primary_muscle,equipment,category,load_convention,load_mode,tracking_type,is_configured) values
 ('96000000-0000-4000-8000-000000000101','provider','Fixture barbell','Chest','Barbell','Strength',null,null,null,false),
 ('96000000-0000-4000-8000-000000000102','provider','Fixture Smith','Chest','Smith Machine','Strength',null,null,null,false),
 ('96000000-0000-4000-8000-000000000103','provider','Fixture dumbbell','Chest','Dumbbell','Strength',null,null,null,false);
insert into grind_private.exercise_source_records(release_id,source_exercise_id,record_hash,raw_payload,rights_state) values
 ('96000000-0000-4000-8000-000000000001','fixture-barbell',repeat('c',64),'{}','approved'),
 ('96000000-0000-4000-8000-000000000001','fixture-smith',repeat('d',64),'{}','approved'),
 ('96000000-0000-4000-8000-000000000001','fixture-dumbbell',repeat('e',64),'{}','approved');
insert into grind_private.exercise_source_links(source_key,source_exercise_id,exercise_id,review_state,rationale) values
 ('repdb','fixture-barbell','96000000-0000-4000-8000-000000000101','approved','approved barbell rule'),
 ('repdb','fixture-smith','96000000-0000-4000-8000-000000000102','approved','approved Smith rule'),
 ('repdb','fixture-dumbbell','96000000-0000-4000-8000-000000000103','approved','unrelated control');
do $$ begin
 if grind_private.configure_barbell_catalog() <> 2 then raise exception 'expected two matching exercises'; end if;
 if not exists(select 1 from grind.exercises where id='96000000-0000-4000-8000-000000000101' and is_configured and load_mode='external' and tracking_type='reps' and load_convention='Total barbell weight') then raise exception 'barbell rule missing'; end if;
 if not exists(select 1 from grind.exercises where id='96000000-0000-4000-8000-000000000102' and is_configured and load_mode='external' and tracking_type='reps' and load_convention='Smith machine displayed weight') then raise exception 'Smith rule missing'; end if;
 if exists(select 1 from grind.exercises where id='96000000-0000-4000-8000-000000000103' and is_configured) then raise exception 'unrelated equipment was enabled'; end if;
 if grind_private.configure_barbell_catalog() <> 0 then raise exception 'configuration is not idempotent'; end if;
end $$;
insert into auth.users(id) values ('96000000-0000-4000-8000-000000000201');
set local role authenticated;
select set_config('request.jwt.claim.sub','96000000-0000-4000-8000-000000000201',true);
select grind.join_grind(); select grind.complete_grind_setup('kg',120);
do $$ declare w jsonb; r jsonb; wid uuid; eid uuid; begin
 w:=grind.start_workout(gen_random_uuid()); wid:=(w->>'id')::uuid; eid:=gen_random_uuid();
 w:=grind.apply_workout_command(gen_random_uuid(),wid,0,jsonb_build_object('type','add_exercise','id',eid,'exercise_id','96000000-0000-4000-8000-000000000101','position',0,'load_mode','external','tracking_type','reps','notes','','rest_seconds',120));
 if w#>>'{exercises,0,load_convention}'<>'Total barbell weight' then raise exception 'barbell selection snapshot failed'; end if;
 w:=grind.apply_workout_command(gen_random_uuid(),wid,1,jsonb_build_object('type','upsert_set','exercise_id',eid,'set',jsonb_build_object('id',gen_random_uuid(),'position',0,'set_type','working','entered_load','20','entered_unit','kg','reps',5)));
 if w#>>'{exercises,0,sets,0,entered_load}'<>'20' or w#>>'{exercises,0,sets,0,reps}'<>'5' then raise exception 'weight-and-rep logging failed'; end if;
 r:=grind.save_routine(gen_random_uuid(),null,null,jsonb_build_object('name','Equipment selection fixture','exercises',jsonb_build_array(jsonb_build_object('id',gen_random_uuid(),'exercise_id','96000000-0000-4000-8000-000000000102','position',0,'load_mode','external','tracking_type','reps','notes','','rest_seconds',120,'sets','[]'::jsonb))));
 if r#>>'{exercises,0,load_convention}'<>'Smith machine displayed weight' then raise exception 'Smith routine selection failed'; end if;
 perform grind.cancel_workout(gen_random_uuid(),wid,2);
end $$;
do $$ begin
 begin perform grind_private.configure_barbell_catalog(); raise exception 'app role can configure global catalog';
 exception when insufficient_privilege then null; end;
end $$;
rollback;
select 'PASS: RepDB barbell/Smith configuration is scoped, distinct and idempotent';
