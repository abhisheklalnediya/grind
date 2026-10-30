-- Disposable fictional fixtures; no persistent user or workout data.
\set ON_ERROR_STOP on
begin;
insert into auth.users(id) values ('92000000-0000-4000-8000-000000000001');
insert into grind.exercises(id,origin,name,primary_muscle,equipment,category,load_convention,load_mode,tracking_type) values
 ('92000000-0000-4000-8000-000000000101','provider','Timed fixture','Core','None','Stretching','Duration','bodyweight','duration'),
 ('92000000-0000-4000-8000-000000000102','provider','Distance fixture','Legs','None','Cardio','Distance and duration','bodyweight','distance_duration');
set local role authenticated;
select set_config('request.jwt.claim.sub','92000000-0000-4000-8000-000000000001',true);
select grind.join_grind();
select grind.complete_grind_setup('kg',120);
do $$
declare w jsonb; r jsonb; replay jsonb; prev jsonb; wid uuid; eid uuid; sid uuid; op uuid; command jsonb; stage integer; exercise uuid; tracking text; valueset jsonb; begin
 for stage in 1..2 loop
  exercise:=case stage when 1 then '92000000-0000-4000-8000-000000000101'::uuid else '92000000-0000-4000-8000-000000000102'::uuid end;
  tracking:=case stage when 1 then 'duration' else 'distance_duration' end;
  w:=grind.start_workout(gen_random_uuid()); wid:=(w->>'id')::uuid; eid:=gen_random_uuid(); sid:=gen_random_uuid();
  w:=grind.apply_workout_command(gen_random_uuid(),wid,0,jsonb_build_object('type','add_exercise','id',eid,'exercise_id',exercise,'position',0,'load_mode','bodyweight','tracking_type',tracking,'notes','','rest_seconds',120));
  if w#>>'{exercises,0,tracking_type}'<>tracking then raise exception 'tracking snapshot missing'; end if;
  valueset:=jsonb_build_object('id',sid,'position',0,'set_type','working','entered_load',null,'entered_unit','kg','reps',null,'duration_seconds',60,'entered_distance',null,'distance_unit',null);
  if stage=2 then valueset:=valueset||jsonb_build_object('entered_distance','001.250','distance_unit','mi'); end if;
  op:=gen_random_uuid(); command:=jsonb_build_object('type','upsert_set','exercise_id',eid,'set',valueset);
  w:=grind.apply_workout_command(op,wid,1,command); replay:=w;
  if grind.apply_workout_command(op,wid,1,command)<>replay then raise exception 'measurement receipt replay differs'; end if;
  if stage=2 and (select canonical_distance_km from grind.workout_sets where id=sid) is distinct from 2.011680 then raise exception 'mile conversion failed'; end if;
  w:=grind.apply_workout_command(gen_random_uuid(),wid,2,jsonb_build_object('type','complete_set','exercise_id',eid,'set_id',sid,'completed',true));
  valueset:=jsonb_set(valueset,'{duration_seconds}','61');
  w:=grind.apply_workout_command(gen_random_uuid(),wid,3,jsonb_build_object('type','upsert_set','exercise_id',eid,'set',valueset));
  if w#>>'{exercises,0,sets,0,completed_at}' is not null then raise exception 'measurement change did not clear completion'; end if;
  begin perform grind.finish_workout(gen_random_uuid(),wid,4); raise exception 'unfinished measurement accepted'; exception when check_violation then null; end;
  w:=grind.apply_workout_command(gen_random_uuid(),wid,4,jsonb_build_object('type','complete_set','exercise_id',eid,'set_id',sid,'completed',true));
  w:=grind.finish_workout(gen_random_uuid(),wid,5);
  prev:=grind.get_previous_performance(exercise,'bodyweight',null,tracking);
  if prev#>>'{sets,0,duration_seconds}'<>'61' or grind.get_previous_performance(exercise,'bodyweight') is not null then raise exception 'previous tracking isolation failed'; end if;
  if stage=2 and (prev#>>'{sets,0,entered_distance}'<>'001.250' or prev#>>'{sets,0,distance_unit}'<>'mi') then raise exception 'distance source values lost'; end if;
 end loop;
 -- Routine → workout copies measurement values and tracking snapshots.
 eid:=gen_random_uuid(); sid:=gen_random_uuid();
 r:=grind.save_routine(gen_random_uuid(),null,null,jsonb_build_object('name','Timed routine','exercises',jsonb_build_array(jsonb_build_object('id',eid,'exercise_id','92000000-0000-4000-8000-000000000101','position',0,'tracking_type','duration','load_mode','bodyweight','notes','','rest_seconds',120,'sets',jsonb_build_array(jsonb_build_object('id',sid,'position',0,'set_type','working','entered_load',null,'entered_unit','kg','reps',null,'duration_seconds',90,'entered_distance',null,'distance_unit',null))))));
 w:=grind.start_workout(gen_random_uuid(),(r->>'id')::uuid,'UTC');
 if w#>>'{exercises,0,tracking_type}'<>'duration' or w#>>'{exercises,0,sets,0,duration_seconds}'<>'90' then raise exception 'routine measurement copy failed'; end if;
 perform grind.cancel_workout(gen_random_uuid(),(w->>'id')::uuid,0);
 -- Repetition legacy payloads remain accepted without new fields.
 w:=grind.start_workout(gen_random_uuid()); wid:=(w->>'id')::uuid; eid:=gen_random_uuid(); sid:=gen_random_uuid();
 w:=grind.apply_workout_command(gen_random_uuid(),wid,0,jsonb_build_object('type','add_exercise','id',eid,'exercise_id','10000000-0000-4000-8000-000000000001','position',0,'load_mode','external','notes','','rest_seconds',120));
 w:=grind.apply_workout_command(gen_random_uuid(),wid,1,jsonb_build_object('type','upsert_set','exercise_id',eid,'set',jsonb_build_object('id',sid,'position',0,'set_type','working','entered_load','20','entered_unit','kg','reps',4)));
 w:=grind.apply_workout_command(gen_random_uuid(),wid,2,jsonb_build_object('type','complete_set','exercise_id',eid,'set_id',sid,'completed',true));
 perform grind.finish_workout(gen_random_uuid(),wid,3);
end $$;
reset role;
-- Reviewed source identity cannot silently change a retained seed's load convention.
insert into grind_private.catalog_sources(source_key,repository_url,license_name,attribution,approval_state) values ('test_measurements','local','fixture','fixture','approved');
insert into grind_private.catalog_releases(id,source_key,revision,manifest_hash,schema_version,importer_version,mapping_version,state,record_count)
 values ('92000000-0000-4000-8000-000000000201','test_measurements',repeat('a',40),repeat('b',64),'3','test','test','approved',1);
insert into grind_private.exercise_source_records(release_id,source_exercise_id,record_hash,raw_payload,rights_state)
 values ('92000000-0000-4000-8000-000000000201','bench',repeat('c',64),'{}','approved');
do $$ declare base jsonb := '[{"source_id":"bench","reviewed":true,"existing_id":"10000000-0000-4000-8000-000000000001","tracking_type":"reps","load_mode":"external"}]'; begin
 begin perform grind_private.import_reviewed_exercises('92000000-0000-4000-8000-000000000201',jsonb_set(base,'{0,load_convention}','"Per dumbbell"')); raise exception 'mismatched convention accepted'; exception when check_violation then null; end;
 begin perform grind_private.import_reviewed_exercises('92000000-0000-4000-8000-000000000201',jsonb_set(base,'{0,load_convention}','" "')); raise exception 'blank convention accepted'; exception when check_violation then null; end;
 begin perform grind_private.import_reviewed_exercises('92000000-0000-4000-8000-000000000201',jsonb_set(base,'{0,load_convention}','null')); raise exception 'null convention accepted'; exception when check_violation then null; end;
 if grind_private.import_reviewed_exercises('92000000-0000-4000-8000-000000000201',jsonb_set(base,'{0,load_convention}','"Total barbell weight"'))<>1 then raise exception 'matching convention rejected'; end if;
 if grind_private.import_reviewed_exercises('92000000-0000-4000-8000-000000000201',base)<>1 then raise exception 'legacy convention omission rejected'; end if;
 begin perform grind_private.import_reviewed_exercises('92000000-0000-4000-8000-000000000201',jsonb_set(base,'{0,load_convention}','"Per dumbbell"')); raise exception 'linked mismatch accepted'; exception when check_violation then null; end;
end $$;
do $$ begin
 begin perform grind_private.distance_km('0','km'); raise exception 'zero distance accepted'; exception when check_violation then null; end;
 begin perform grind_private.distance_km('1.0001','km'); raise exception 'excess precision accepted'; exception when check_violation then null; end;
 begin perform grind_private.distance_km('1','m'); raise exception 'invalid unit accepted'; exception when check_violation then null; end;
 begin perform grind_private.measurements('{"reps":null,"entered_load":null,"duration_seconds":86401}'::jsonb,'duration'); raise exception 'duration overflow accepted'; exception when check_violation then null; end;
 begin perform grind_private.measurements('{"reps":1,"entered_load":null}'::jsonb,'duration'); raise exception 'timed reps accepted'; exception when check_violation then null; end;
 if grind_private.set_complete('distance_duration','bodyweight',null,null,60,null,null) then raise exception 'distance required'; end if;
 if grind_private.set_complete('duration','bodyweight',null,null,null,null,null) then raise exception 'duration required'; end if;
 if grind_private.set_complete('reps','external',1,null,null,null,null) then raise exception 'external load required'; end if;
 begin perform grind_private.measurements('{"reps":null,"entered_load":null,"entered_distance":"1","distance_unit":"km"}'::jsonb,'duration'); raise exception 'distance accepted for duration-only'; exception when check_violation then null; end;
 begin perform grind_private.measurements('{"reps":1,"entered_load":null,"duration_seconds":60}'::jsonb,'reps'); raise exception 'duration accepted for reps'; exception when check_violation then null; end;
end $$;
rollback;
