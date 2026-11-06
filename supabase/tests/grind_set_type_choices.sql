-- Disposable fictional member; verify the advertised choices and legacy
-- rest_pause read/write compatibility without rewriting existing rows.
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
  routine_id uuid;
  workout_id uuid;
  workout_exercise_id uuid;
  set_id uuid;
  routine_set_id uuid := '93000000-0000-4000-8000-000000000201';
  exercise_id uuid := '10000000-0000-4000-8000-000000000001';
  exercise_instance uuid := '93000000-0000-4000-8000-000000000101';
begin
  if grind.get_supported_set_types()->'set_types' is distinct from
      '["warmup", "working", "drop", "failure"]'::jsonb then
    raise exception 'supported set type choices differ';
  end if;

  -- A legacy type remains valid in routine data after this choice change.
  routine := jsonb_build_object(
    'name','Legacy type compatibility',
    'exercises',jsonb_build_array(jsonb_build_object(
      'id',exercise_instance,'exercise_id',exercise_id,'position',0,
      'load_mode','external','notes','','rest_seconds',120,
      'sets',jsonb_build_array(jsonb_build_object(
        'id',routine_set_id,'position',0,'set_type','rest_pause',
        'entered_load','20','entered_unit','kg','reps',10
      ))
    ))
  );
  routine := grind.save_routine(gen_random_uuid(),null,null,routine);
  routine_id := (routine->>'id')::uuid;
  if routine#>>'{exercises,0,sets,0,set_type}' <> 'rest_pause' then
    raise exception 'legacy routine type was not preserved';
  end if;

  session := grind.start_workout(gen_random_uuid(),routine_id,'UTC');
  if session#>>'{exercises,0,sets,0,set_type}' <> 'rest_pause' then
    raise exception 'legacy type was not copied into workout';
  end if;
  workout_id := (session->>'id')::uuid;
  workout_exercise_id := (session#>>'{exercises,0,id}')::uuid;
  set_id := (session#>>'{exercises,0,sets,0,id}')::uuid;

  -- Editing an existing legacy row remains valid while the UI no longer
  -- advertises rest_pause as a choice for new sets.
  session := grind.apply_workout_command(
    gen_random_uuid(),workout_id,(session->>'revision')::integer,
    jsonb_build_object('type','upsert_set','exercise_id',workout_exercise_id,
      'set',jsonb_build_object(
        'id',set_id,'position',0,'set_type','rest_pause',
        'entered_load','22','entered_unit','kg','reps',8
      ))
  );
  if session#>>'{exercises,0,sets,0,set_type}' <> 'rest_pause'
     or session#>>'{exercises,0,sets,0,entered_load}' <> '22' then
    raise exception 'legacy workout row could not be updated and preserved';
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
end $$;

reset role;
-- Persisted member row remains untouched by this forward-only migration.
do $$ begin
  if not exists (
    select 1 from grind.routine_sets
    where routine_exercise_id='93000000-0000-4000-8000-000000000101'
      and set_type='rest_pause'
  ) then
    raise exception 'legacy set type was rewritten or lost';
  end if;
end $$;
rollback;
