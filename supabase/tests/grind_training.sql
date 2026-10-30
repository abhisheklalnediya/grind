-- Fictional training fixtures; rollback leaves all shared data unchanged.
\set ON_ERROR_STOP on
begin;
insert into auth.users(id) values ('91000000-0000-4000-8000-000000000001'),('91000000-0000-4000-8000-000000000002');
set local role authenticated;
select set_config('request.jwt.claim.sub','91000000-0000-4000-8000-000000000001',true);
select grind.join_grind();
select grind.complete_grind_setup('kg',120);
do $$ declare w jsonb; replay jsonb; op uuid:=gen_random_uuid(); wid uuid; eid uuid:=gen_random_uuid(); sid uuid:=gen_random_uuid(); r jsonb; custom jsonb; command jsonb; mode text; begin
 w:=grind.start_workout(op); wid:=(w->>'id')::uuid;
 if grind.start_workout(gen_random_uuid())->>'id'<>wid::text then raise exception 'one active invariant failed'; end if;
 command:=jsonb_build_object('type','add_exercise','id',eid,'exercise_id','10000000-0000-4000-8000-000000000001','position',0,'load_mode','external','notes','','rest_seconds',120);
 -- Use a real independently authored catalog seed, irrespective of its UUID.
 command:=jsonb_set(command,'{exercise_id}',to_jsonb((select id from grind.exercises where origin='grind' order by id limit 1)::text));
 w:=grind.apply_workout_command(gen_random_uuid(),wid,0,command);
 begin perform grind.apply_workout_command(gen_random_uuid(),wid,0,command); raise exception 'stale revision accepted'; exception when sqlstate 'PT409' then null; end;
 op:=gen_random_uuid();
 command:=jsonb_build_object('type','upsert_set','exercise_id',eid,'set',jsonb_build_object('id',sid,'position',0,'set_type','working','entered_load','000.500','entered_unit','lb','reps',8));
 w:=grind.apply_workout_command(op,wid,1,command); replay:=w;
 if grind.apply_workout_command(op,wid,1,command)<>replay then raise exception 'lost response replay differs'; end if;
 if (select canonical_kg from grind.workout_sets where id=sid) is distinct from 0.226796185 then raise exception 'exact conversion failed'; end if;
 begin perform grind.apply_workout_command(op,wid,1,jsonb_set(command,'{set,reps}','9')); raise exception 'changed receipt payload accepted'; exception when check_violation then null; end;
 w:=grind.apply_workout_command(gen_random_uuid(),wid,2,jsonb_build_object('type','complete_set','exercise_id',eid,'set_id',sid,'completed',true));
 w:=grind.finish_workout(gen_random_uuid(),wid,3);
 if w->>'status'<>'completed' or w#>>'{exercises,0,sets,0,entered_load}'<>'000.500' then raise exception 'snapshot or original text lost'; end if;
 if grind.apply_workout_command(op,wid,1,command)<>replay then raise exception 'later mutation changed receipt'; end if;
 if grind.get_previous_performance((w#>>'{exercises,0,exercise_id}')::uuid,'external') is null then raise exception 'previous missing'; end if;
 if jsonb_array_length(grind.list_workout_history()->'items')<>1 then raise exception 'history missing completed'; end if;
 begin perform grind.cancel_workout(gen_random_uuid(),wid,4); raise exception 'completed workout mutated'; exception when check_violation then null; end;
 r:=grind.save_routine(gen_random_uuid(),null,null,jsonb_build_object('name','Fictional routine','exercises','[]'::jsonb));
 begin perform grind.archive_routine(gen_random_uuid(),(r->>'id')::uuid,0); raise exception 'routine version ignored'; exception when sqlstate 'PT409' then null; end;
 r:=grind.archive_routine(gen_random_uuid(),(r->>'id')::uuid,1);
 if jsonb_array_length(grind.list_routines())<>0 then raise exception 'archive listed'; end if;
 foreach mode in array array['external','bodyweight','assisted','weighted_bodyweight'] loop
 custom:=grind.save_custom_exercise(gen_random_uuid(),null,jsonb_build_object('name','Fictional mode','primary_muscle','Arms','equipment','None','category','Strength','load_convention','Entered load','load_mode',mode));
 if custom->>'load_mode'<>mode then raise exception 'mode lost'; end if;
 perform grind.archive_custom_exercise(gen_random_uuid(),(custom->>'id')::uuid);
 end loop;
 begin update grind.workout_sessions set name='raw'; raise exception 'raw DML accepted'; exception when insufficient_privilege then null; end;
end $$;
do $$ declare c jsonb; r jsonb; w jsonb; original jsonb; eid uuid; sid uuid; wid uuid; mode text; load text; begin
 foreach mode in array array['external','bodyweight','assisted','weighted_bodyweight'] loop
 c:=grind.save_custom_exercise(gen_random_uuid(),null,jsonb_build_object('name','Snapshot name','primary_muscle','Arms','equipment','None','category','Strength','load_convention','Snapshot convention','load_mode',mode));
 eid:=gen_random_uuid(); sid:=gen_random_uuid(); load:=case when mode='bodyweight' then null else '001.500' end;
 r:=grind.save_routine(gen_random_uuid(),null,null,jsonb_build_object('name','Snapshot routine','exercises',jsonb_build_array(jsonb_build_object('id',eid,'exercise_id',c->>'id','position',0,'load_mode',mode,'notes','','rest_seconds',15,'sets',jsonb_build_array(jsonb_build_object('id',sid,'position',0,'set_type','warmup','entered_load',load,'entered_unit','kg','reps',5))))));
 perform grind.archive_custom_exercise(gen_random_uuid(),(c->>'id')::uuid);
 w:=grind.start_workout(gen_random_uuid(),(r->>'id')::uuid,'UTC'); wid:=(w->>'id')::uuid;
 if w#>>'{exercises,0,name}'<>'Snapshot name' then raise exception 'archived routine reference lost'; end if;
 eid:=(w#>>'{exercises,0,id}')::uuid; sid:=(w#>>'{exercises,0,sets,0,id}')::uuid;
 begin perform grind.finish_workout(gen_random_uuid(),wid,0); raise exception 'unfinished sets accepted'; exception when check_violation then null; end;
 w:=grind.apply_workout_command(gen_random_uuid(),wid,0,jsonb_build_object('type','complete_set','exercise_id',eid,'set_id',sid,'completed',true));
 w:=grind.finish_workout(gen_random_uuid(),wid,1); original:=w;
 perform grind.archive_routine(gen_random_uuid(),(r->>'id')::uuid,1);
 if grind.get_workout(wid)<>original then raise exception 'routine archive changed snapshot'; end if;
 if grind.get_previous_performance((c->>'id')::uuid,mode)#>>'{sets,0,ordinal}'<>'0' then raise exception 'previous type ordinal mismatch'; end if;
 end loop;
 if jsonb_array_length(grind.list_workout_history(null,null,2)->'items')<>2 or grind.list_workout_history(null,null,2)->'next_cursor'='null'::jsonb then raise exception 'history cursor missing'; end if;
end $$;
-- Previous must compare against the active workout snapshot, not a renamed convention.
do $$ declare c jsonb; payload jsonb; w jsonb; old_wid uuid; active_wid uuid; eid uuid; sid uuid; stage integer; begin
 payload:=jsonb_build_object('name','Convention fixture','primary_muscle','Arms','equipment','None','category','Strength','load_convention','Original total load','load_mode','external');
 c:=grind.save_custom_exercise(gen_random_uuid(),null,payload);
 for stage in 1..2 loop
  w:=grind.start_workout(gen_random_uuid()); eid:=gen_random_uuid(); sid:=gen_random_uuid();
  w:=grind.apply_workout_command(gen_random_uuid(),(w->>'id')::uuid,0,jsonb_build_object('type','add_exercise','id',eid,'exercise_id',c->>'id','position',0,'load_mode','external','notes','','rest_seconds',120));
  w:=grind.apply_workout_command(gen_random_uuid(),(w->>'id')::uuid,1,jsonb_build_object('type','upsert_set','exercise_id',eid,'set',jsonb_build_object('id',sid,'position',0,'set_type','working','entered_load','12','entered_unit','kg','reps',8)));
  w:=grind.apply_workout_command(gen_random_uuid(),(w->>'id')::uuid,2,jsonb_build_object('type','complete_set','exercise_id',eid,'set_id',sid,'completed',true));
  w:=grind.finish_workout(gen_random_uuid(),(w->>'id')::uuid,3);
  if stage=1 then
   old_wid:=(w->>'id')::uuid;
   w:=grind.start_workout(gen_random_uuid()); active_wid:=(w->>'id')::uuid; eid:=gen_random_uuid();
   w:=grind.apply_workout_command(gen_random_uuid(),active_wid,0,jsonb_build_object('type','add_exercise','id',eid,'exercise_id',c->>'id','position',0,'load_mode','external','notes','','rest_seconds',120));
   c:=grind.save_custom_exercise(gen_random_uuid(),(c->>'id')::uuid,jsonb_set(payload,'{load_convention}','"Per hand load"'));
   if grind.get_workout(active_wid)#>>'{exercises,0,load_convention}'<>'Original total load' then raise exception 'active snapshot convention changed'; end if;
   if grind.get_previous_performance((c->>'id')::uuid,'external') is not null then raise exception 'legacy current convention matched old load'; end if;
   if grind.get_previous_performance((c->>'id')::uuid,'external','Per hand load') is not null then raise exception 'new convention matched old load'; end if;
   perform grind.cancel_workout(gen_random_uuid(),active_wid,1);
  else
   if coalesce(grind.get_previous_performance((c->>'id')::uuid,'external')->>'session_id','missing')<>(w->>'id') then raise exception 'legacy convention fallback missing new workout'; end if;
  end if;
  if coalesce(grind.get_previous_performance((c->>'id')::uuid,'external','Original total load')->>'session_id','missing')<>old_wid::text then raise exception 'explicit snapshot previous lost'; end if;
 end loop;
 begin perform grind.get_previous_performance((c->>'id')::uuid,'external',''); raise exception 'empty convention accepted'; exception when check_violation then null; end;
 begin perform grind.get_previous_performance((c->>'id')::uuid,'external',' '); raise exception 'blank convention accepted'; exception when check_violation then null; end;
 begin perform grind.get_previous_performance((c->>'id')::uuid,'external',repeat('x',81)); raise exception 'oversized convention accepted'; exception when check_violation then null; end;
 perform set_config('request.jwt.claim.sub','91000000-0000-4000-8000-000000000002',true);
 perform grind.join_grind(); perform grind.complete_grind_setup('kg',120);
 begin perform grind.get_previous_performance((c->>'id')::uuid,'external','Original total load'); raise exception 'cross-owner previous allowed'; exception when insufficient_privilege then null; end;
 perform set_config('request.jwt.claim.sub','91000000-0000-4000-8000-000000000001',true);
end $$;
select set_config('request.jwt.claim.sub','91000000-0000-4000-8000-000000000002',true);
select grind.join_grind(); select grind.complete_grind_setup('kg',120);
do $$ begin
 if exists(select 1 from grind.workout_sessions) or exists(select 1 from grind.routine_templates) then raise exception 'owner RLS leaked'; end if;
 begin perform grind.get_workout('91000000-0000-4000-8000-000000000001'); raise exception 'unknown owner read allowed'; exception when insufficient_privilege then null; end;
end $$;
reset role;
rollback;
select 'PASS: GRIND training ownership, receipts, revisions, history, modes, archives and exact load' as result;
