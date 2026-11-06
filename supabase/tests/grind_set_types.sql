-- Disposable fictional account; all data is rolled back.
\set ON_ERROR_STOP on
begin;
insert into auth.users(id) values ('93000000-0000-4000-8000-000000000001');
set local role authenticated;
select set_config('request.jwt.claim.sub','93000000-0000-4000-8000-000000000001',true);
select grind.join_grind();
select grind.complete_grind_setup('kg',120);

do $$
declare
  routine jsonb;
  session jsonb;
  previous jsonb;
  routine_id uuid;
  exercise_id uuid := '10000000-0000-4000-8000-000000000001';
  exercise_instance uuid := '93000000-0000-4000-8000-000000000101';
  types text[] := array['warmup','working','drop','failure','rest_pause','working'];
  valueset jsonb;
  set_id uuid;
  v_workout_exercise_id uuid;
  ordinal integer := 0;
begin
  -- Existing and proposed values survive routine validation, storage and graph serialization.
  for ordinal in 1..array_length(types,1) loop
    valueset:=jsonb_build_object(
      'id',gen_random_uuid(),'position',ordinal-1,'set_type',types[ordinal],
      'entered_load','20','entered_unit','kg','reps',10
    );
    if ordinal=1 then
      routine:=jsonb_build_object('name','Set type fixture','exercises',jsonb_build_array(jsonb_build_object(
        'id',exercise_instance,'exercise_id',exercise_id,'position',0,'load_mode','external',
        'notes','','rest_seconds',120,'sets',jsonb_build_array(valueset)
      )));
    else
      routine:=jsonb_set(routine,'{exercises,0,sets}',(routine#>'{exercises,0,sets}')||jsonb_build_array(valueset));
    end if;
  end loop;
  routine:=grind.save_routine(gen_random_uuid(),null,null,routine);
  routine_id:=(routine->>'id')::uuid;
  if (select array_agg(value->>'set_type' order by ordinality)
      from jsonb_array_elements(routine#>'{exercises,0,sets}') with ordinality as set_row(value,ordinality)) is distinct from types then
    raise exception 'routine set type round trip failed';
  end if;

  -- Starting from a routine copies every type; completion and history keep them.
  session:=grind.start_workout(gen_random_uuid(),routine_id,'UTC');
  if (select array_agg(value->>'set_type' order by ordinality)
      from jsonb_array_elements(session#>'{exercises,0,sets}') with ordinality as set_row(value,ordinality)) is distinct from types then
    raise exception 'routine-to-workout set type copy failed';
  end if;
  v_workout_exercise_id:=(session#>>'{exercises,0,id}')::uuid;
  for ordinal in 0..array_length(types,1)-1 loop
    set_id:=(session#>>array['exercises','0','sets',ordinal::text,'id'])::uuid;
    session:=grind.apply_workout_command(gen_random_uuid(),(session->>'id')::uuid,(session->>'revision')::integer,
      jsonb_build_object('type','complete_set','exercise_id',v_workout_exercise_id,'set_id',set_id,'completed',true));
  end loop;
  session:=grind.finish_workout(gen_random_uuid(),(session->>'id')::uuid,(session->>'revision')::integer);
  if (select array_agg(value->>'set_type' order by ordinality)
      from jsonb_array_elements(session#>'{exercises,0,sets}') with ordinality as set_row(value,ordinality)) is distinct from types then
    raise exception 'completed history lost set types';
  end if;

  -- Previous performance preserves each kind and numbers repeated kinds independently.
  previous:=grind.get_previous_performance(exercise_id,'external','Total barbell weight','reps');
  if (select array_agg(item->>'set_type' order by item->>'set_type', (item->>'ordinal')::integer)
      from jsonb_array_elements(previous->'sets') as set_row(item)) is distinct from
      array['drop','failure','rest_pause','warmup','working','working'] then
    raise exception 'previous performance omitted set types';
  end if;
  if (select max((item->>'ordinal')::integer) from jsonb_array_elements(previous->'sets') as set_row(item)
      where item->>'set_type'='working')<>1 then
    raise exception 'previous ordinal was not partitioned by type';
  end if;

  if grind.get_supported_set_types()->'set_types' is distinct from
      ' ["warmup", "working", "drop", "failure"]'::jsonb then
    raise exception 'capability response differs';
  end if;
  if not has_function_privilege('authenticated','grind.get_supported_set_types()','EXECUTE')
     or has_function_privilege('anon','grind.get_supported_set_types()','EXECUTE') then
    raise exception 'capability RPC grants are not scoped to authenticated members';
  end if;
  perform set_config('request.jwt.claim.sub','93000000-0000-4000-8000-000000000099',true);
  begin
    perform grind.get_supported_set_types();
    raise exception 'nonmember capability request accepted';
  exception when insufficient_privilege then null;
  end;
  perform set_config('request.jwt.claim.sub','93000000-0000-4000-8000-000000000001',true);

end $$;

reset role;
-- Run constraint probes as the database test role; authenticated has SELECT-only table access.
do $$ begin
  begin
    insert into grind.routine_sets(id,routine_exercise_id,position,set_type,entered_unit)
      values(gen_random_uuid(),'93000000-0000-4000-8000-000000000101',6,'unknown','kg');
    raise exception 'unknown routine set type accepted';
  exception when check_violation then null;
  end;
  begin
    update grind.workout_sets set set_type='unknown'
      where workout_exercise_id in (
        select e.id from grind.workout_exercises e
        join grind.workout_sessions w on w.id=e.session_id
        where w.owner_id='93000000-0000-4000-8000-000000000001' and w.status='completed'
      );
    raise exception 'unknown workout set type accepted';
  exception when check_violation then null;
  end;
end $$;
rollback;
