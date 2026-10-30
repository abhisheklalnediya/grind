-- GRIND M2/M3 training. Forward-only GRIND history; local verification first.
-- Cohesive migration intentionally contains schema, private validators and transactional RPCs.
begin;
alter table grind.exercises add column load_mode text not null default 'external'
  check (load_mode in ('external','bodyweight','assisted','weighted_bodyweight'));
update grind.exercises set load_mode='bodyweight' where id='10000000-0000-4000-8000-000000000007';

create table grind.routine_templates (
 id uuid primary key default gen_random_uuid(), owner_id uuid not null references grind.app_accounts(user_id) on delete cascade,
 name text not null check(char_length(btrim(name)) between 1 and 80), version integer not null default 1 check(version>0),
 archived_at timestamptz, created_at timestamptz not null default now()
);
create table grind.routine_exercises (
 id uuid primary key, routine_id uuid not null references grind.routine_templates(id) on delete cascade,
 exercise_id uuid not null references grind.exercises(id), position integer not null check(position between 0 and 99),
 load_mode text not null check(load_mode in ('external','bodyweight','assisted','weighted_bodyweight')),
 notes text not null default '' check(char_length(notes)<=2000), rest_seconds integer not null check(rest_seconds between 15 and 3600),
 unique(routine_id,position) deferrable initially deferred
);
create table grind.routine_sets (
 id uuid primary key, routine_exercise_id uuid not null references grind.routine_exercises(id) on delete cascade,
 position integer not null check(position between 0 and 99), set_type text not null check(set_type in ('warmup','working')),
 entered_load text, entered_unit text not null check(entered_unit in ('kg','lb')), reps integer check(reps between 1 and 10000),
 canonical_kg numeric, unique(routine_exercise_id,position) deferrable initially deferred
);
create table grind.workout_sessions (
 id uuid primary key default gen_random_uuid(), owner_id uuid not null references grind.app_accounts(user_id) on delete cascade,
 source_routine_id uuid references grind.routine_templates(id), name text not null check(char_length(btrim(name)) between 1 and 80),
 status text not null default 'active' check(status in ('active','completed','cancelled')),
 started_at timestamptz not null default now(), finished_at timestamptz, timezone text not null,
 revision integer not null default 0 check(revision>=0), check(status<>'completed' or finished_at is not null)
);
create unique index grind_one_active_workout on grind.workout_sessions(owner_id) where status='active';
create index grind_workout_history on grind.workout_sessions(owner_id,finished_at desc,id desc) where status='completed';
create table grind.workout_exercises (
 id uuid primary key, session_id uuid not null references grind.workout_sessions(id) on delete cascade,
 exercise_id uuid not null references grind.exercises(id), position integer not null check(position between 0 and 99),
 name text not null, load_convention text not null, load_mode text not null check(load_mode in ('external','bodyweight','assisted','weighted_bodyweight')),
 notes text not null default '' check(char_length(notes)<=2000), rest_seconds integer not null check(rest_seconds between 15 and 3600),
 unique(session_id,position) deferrable initially deferred
);
create index grind_workout_exercise_lookup on grind.workout_exercises(exercise_id,session_id);
create table grind.workout_sets (
 id uuid primary key, workout_exercise_id uuid not null references grind.workout_exercises(id) on delete cascade,
 position integer not null check(position between 0 and 99), set_type text not null check(set_type in ('warmup','working')),
 entered_load text, entered_unit text not null check(entered_unit in ('kg','lb')), canonical_kg numeric,
 reps integer check(reps between 1 and 10000), completed_at timestamptz,
 unique(workout_exercise_id,position) deferrable initially deferred
);
create table grind.workout_command_receipts (
 owner_id uuid not null references grind.app_accounts(user_id) on delete cascade,
 operation_id uuid not null, request jsonb not null, result jsonb not null, created_at timestamptz not null default now(),
 primary key(owner_id,operation_id)
);
create index grind_routine_owner on grind.routine_templates(owner_id);
create index grind_routine_exercise_parent on grind.routine_exercises(routine_id);
create index grind_routine_set_parent on grind.routine_sets(routine_exercise_id);
create index grind_workout_set_parent on grind.workout_sets(workout_exercise_id);

-- Direct writes are denied; child ownership follows actual parent rows, never submitted owner IDs.
alter table grind.routine_templates enable row level security;
alter table grind.routine_exercises enable row level security;
alter table grind.routine_sets enable row level security;
alter table grind.workout_sessions enable row level security;
alter table grind.workout_exercises enable row level security;
alter table grind.workout_sets enable row level security;
alter table grind.workout_command_receipts enable row level security;
revoke all on grind.routine_templates,grind.routine_exercises,grind.routine_sets,grind.workout_sessions,grind.workout_exercises,grind.workout_sets,grind.workout_command_receipts from public,anon,authenticated;
grant select on grind.routine_templates,grind.routine_exercises,grind.routine_sets,grind.workout_sessions,grind.workout_exercises,grind.workout_sets,grind.workout_command_receipts to authenticated;
create policy routine_owner on grind.routine_templates for select to authenticated using(owner_id=(select auth.uid()));
create policy routine_exercise_owner on grind.routine_exercises for select to authenticated using(exists(select 1 from grind.routine_templates r where r.id=routine_id and r.owner_id=(select auth.uid())));
create policy routine_set_owner on grind.routine_sets for select to authenticated using(exists(select 1 from grind.routine_exercises e join grind.routine_templates r on r.id=e.routine_id where e.id=routine_exercise_id and r.owner_id=(select auth.uid())));
create policy workout_owner on grind.workout_sessions for select to authenticated using(owner_id=(select auth.uid()));
create policy workout_exercise_owner on grind.workout_exercises for select to authenticated using(exists(select 1 from grind.workout_sessions w where w.id=session_id and w.owner_id=(select auth.uid())));
create policy workout_set_owner on grind.workout_sets for select to authenticated using(exists(select 1 from grind.workout_exercises e join grind.workout_sessions w on w.id=e.session_id where e.id=workout_exercise_id and w.owner_id=(select auth.uid())));
create policy receipt_owner on grind.workout_command_receipts for select to authenticated using(owner_id=(select auth.uid()));

create function grind_private.member() returns uuid language plpgsql stable set search_path='' as $$
declare caller uuid:=auth.uid(); begin
 if caller is null or not exists(select 1 from grind.app_accounts where user_id=caller and setup_completed_at is not null) then
  raise exception 'FORBIDDEN: completed Grind setup required' using errcode='42501'; end if;
 return caller;
end $$;
create function grind_private.keys(value jsonb, allowed text[], required text[]) returns void language plpgsql immutable set search_path='' as $$
begin
 if jsonb_typeof(value) is distinct from 'object' or exists(select 1 from jsonb_object_keys(value) k where not(k=any(allowed)))
 or exists(select 1 from unnest(required) k where not(value ? k)) then
  raise exception 'VALIDATION: invalid command fields' using errcode='23514'; end if;
end $$;
create function grind_private.text_value(value jsonb, minimum integer, maximum integer) returns text language plpgsql immutable set search_path='' as $$
declare result text; begin
 if jsonb_typeof(value) is distinct from 'string' then raise exception 'VALIDATION: text required' using errcode='23514'; end if;
 result:=value#>>'{}';
 if char_length(result)<minimum or char_length(result)>maximum then raise exception 'VALIDATION: text length' using errcode='23514'; end if;
 return result;
end $$;
create function grind_private.uuid_value(value jsonb) returns uuid language plpgsql immutable set search_path='' as $$
begin return grind_private.text_value(value,1,36)::uuid;
exception when invalid_text_representation then raise exception 'VALIDATION: invalid ID' using errcode='23514'; end $$;
create function grind_private.int_value(value jsonb, minimum integer, maximum integer) returns integer language plpgsql immutable set search_path='' as $$
declare result numeric; begin
 if jsonb_typeof(value) is distinct from 'number' or (value#>>'{}')!~'^[0-9]+$' then raise exception 'VALIDATION: integer required' using errcode='23514'; end if;
 result:=(value#>>'{}')::numeric;
 if result<minimum or result>maximum then raise exception 'VALIDATION: integer range' using errcode='23514'; end if;
 return result::integer;
end $$;
create function grind_private.mode(value text) returns text language plpgsql immutable set search_path='' as $$
begin
 if value is null or value not in ('external','bodyweight','assisted','weighted_bodyweight') then raise exception 'VALIDATION: invalid load mode' using errcode='23514'; end if;
 return value;
end $$;
create function grind_private.load_kg(value text, unit text, mode text) returns numeric language plpgsql immutable set search_path='' as $$
begin
 perform grind_private.mode(mode);
 if unit is null or unit not in ('kg','lb') then raise exception 'VALIDATION: invalid unit' using errcode='23514'; end if;
 if mode='bodyweight' then
  if value is not null then raise exception 'VALIDATION: bodyweight has no load' using errcode='23514'; end if;
  return null;
 end if;
 if value is null then return null; end if;
 if char_length(value)>32 or value!~'^([0-9]+(\.[0-9]{1,3})?|\.[0-9]{1,3})$' then raise exception 'VALIDATION: decimal load required' using errcode='23514'; end if;
 if value::numeric>100000 or (mode='assisted' and value::numeric<=0) then raise exception 'VALIDATION: load range' using errcode='23514'; end if;
 return value::numeric * case when unit='lb' then 0.45359237::numeric else 1::numeric end;
end $$;
create function grind_private.set_values(value jsonb, mode text) returns void language plpgsql immutable set search_path='' as $$
declare load text; begin
 perform grind_private.keys(value,array['id','position','set_type','entered_load','entered_unit','reps'],array['id','position','set_type','entered_load','entered_unit','reps']);
 perform grind_private.uuid_value(value->'id'); perform grind_private.int_value(value->'position',0,99);
 if (value->>'set_type') is null or value->>'set_type' not in ('warmup','working') then raise exception 'VALIDATION: set type' using errcode='23514'; end if;
 if value->'entered_load'<>'null'::jsonb then load:=grind_private.text_value(value->'entered_load',1,32); end if;
 perform grind_private.load_kg(load,value->>'entered_unit',mode);
 if value->'reps'<>'null'::jsonb then perform grind_private.int_value(value->'reps',1,10000); end if;
end $$;
create function grind_private.command_start(op uuid, payload jsonb) returns jsonb language plpgsql set search_path='' as $$
declare caller uuid:=grind_private.member(); receipt grind.workout_command_receipts; begin
 if op is null then raise exception 'VALIDATION: operation ID required' using errcode='23514'; end if;
 -- Owner-level serialization protects starts, receipt replay and routine/custom commands together.
 perform pg_advisory_xact_lock(hashtextextended(caller::text,0));
 select * into receipt from grind.workout_command_receipts where owner_id=caller and operation_id=op;
 if found then
  if receipt.request<>payload then raise exception 'VALIDATION: operation ID reused with different payload' using errcode='23514'; end if;
  return receipt.result;
 end if;
 return null;
end $$;
create function grind_private.command_end(op uuid,payload jsonb,result jsonb) returns jsonb language plpgsql set search_path='' as $$
begin insert into grind.workout_command_receipts(owner_id,operation_id,request,result) values(auth.uid(),op,payload,result); return result; end $$;
create function grind_private.catalog(id uuid, allow_archived boolean default false) returns grind.exercises language plpgsql stable set search_path='' as $$
declare e grind.exercises; caller uuid:=grind_private.member(); begin
 select * into e from grind.exercises x where x.id=catalog.id and (x.owner_id is null or x.owner_id=caller) and (allow_archived or x.archived_at is null);
 if not found then raise exception 'FORBIDDEN: exercise unavailable' using errcode='42501'; end if;
 return e;
end $$;
create function grind_private.session_graph(wid uuid) returns jsonb language sql stable set search_path='' as $$
 select jsonb_build_object('id',w.id,'status',w.status,'name',w.name,'started_at',w.started_at,'finished_at',w.finished_at,'timezone',w.timezone,'revision',w.revision,'source_routine_id',w.source_routine_id,
  'exercises',coalesce((select jsonb_agg(jsonb_build_object('id',e.id,'exercise_id',e.exercise_id,'position',e.position,'name',e.name,'load_convention',e.load_convention,'load_mode',e.load_mode,'notes',e.notes,'rest_seconds',e.rest_seconds,
   'sets',coalesce((select jsonb_agg(jsonb_build_object('id',s.id,'position',s.position,'set_type',s.set_type,'entered_load',s.entered_load,'entered_unit',s.entered_unit,'reps',s.reps,'completed_at',s.completed_at) order by s.position) from grind.workout_sets s where s.workout_exercise_id=e.id),'[]'::jsonb)) order by e.position) from grind.workout_exercises e where e.session_id=w.id),'[]'::jsonb))
 from grind.workout_sessions w where w.id=wid
$$;
create function grind_private.routine_graph(rid uuid) returns jsonb language sql stable set search_path='' as $$
 select jsonb_build_object('id',r.id,'name',r.name,'version',r.version,'archived_at',r.archived_at,
 'exercises',coalesce((select jsonb_agg(jsonb_build_object('id',e.id,'exercise_id',e.exercise_id,'position',e.position,'load_mode',e.load_mode,'notes',e.notes,'rest_seconds',e.rest_seconds,
 'sets',coalesce((select jsonb_agg(jsonb_build_object('id',s.id,'position',s.position,'set_type',s.set_type,'entered_load',s.entered_load,'entered_unit',s.entered_unit,'reps',s.reps) order by s.position) from grind.routine_sets s where s.routine_exercise_id=e.id),'[]'::jsonb)) order by e.position) from grind.routine_exercises e where e.routine_id=r.id),'[]'::jsonb)) from grind.routine_templates r where r.id=rid
$$;

create function grind.get_active_workout() returns jsonb language plpgsql stable security definer set search_path='' as $$
declare caller uuid:=grind_private.member(); wid uuid; begin
 select id into wid from grind.workout_sessions where owner_id=caller and status='active'; return grind_private.session_graph(wid); end $$;
create function grind.get_workout(p_session_id uuid) returns jsonb language plpgsql stable security definer set search_path='' as $$
begin
 if not exists(select 1 from grind.workout_sessions where id=p_session_id and owner_id=grind_private.member()) then raise exception 'FORBIDDEN: workout unavailable' using errcode='42501'; end if;
 return grind_private.session_graph(p_session_id); end $$;
create function grind.get_routine(p_routine_id uuid) returns jsonb language plpgsql stable security definer set search_path='' as $$
begin
 if not exists(select 1 from grind.routine_templates where id=p_routine_id and owner_id=grind_private.member()) then raise exception 'FORBIDDEN: routine unavailable' using errcode='42501'; end if;
 return grind_private.routine_graph(p_routine_id); end $$;
create function grind.list_routines() returns jsonb language plpgsql stable security definer set search_path='' as $$
declare caller uuid:=grind_private.member(); result jsonb; begin
 select coalesce(jsonb_agg(grind_private.routine_graph(id) order by name,id),'[]'::jsonb) into result from grind.routine_templates where owner_id=caller and archived_at is null; return result; end $$;
create function grind.list_workout_history(p_before_finished_at timestamptz default null,p_before_id uuid default null,p_limit integer default 30) returns jsonb language plpgsql stable security definer set search_path='' as $$
declare caller uuid:=grind_private.member(); result jsonb; cursor jsonb:='null'::jsonb; total integer; begin
 if p_limit is null or p_limit<1 or p_limit>100 or (p_before_finished_at is null)<>(p_before_id is null) or (p_before_finished_at is not null and not isfinite(p_before_finished_at)) then raise exception 'VALIDATION: invalid history cursor/limit' using errcode='23514'; end if;
 select coalesce(jsonb_agg(grind_private.session_graph(id) order by finished_at desc,id desc),'[]'::jsonb),count(*) into result,total
 from (select id,finished_at from grind.workout_sessions where owner_id=caller and status='completed' and (p_before_finished_at is null or (finished_at,id)<(p_before_finished_at,p_before_id)) order by finished_at desc,id desc limit p_limit+1) page;
 if total>p_limit then result:=result- p_limit; cursor:=jsonb_build_object('finished_at',result->(p_limit-1)->'finished_at','id',result->(p_limit-1)->'id'); end if;
 return jsonb_build_object('items',result,'next_cursor',cursor);
end $$;

create function grind.save_custom_exercise(p_operation_id uuid,p_exercise_id uuid,p_payload jsonb) returns jsonb language plpgsql security definer set search_path='' as $$
declare payload jsonb:=jsonb_build_object('method','save_custom_exercise','id',p_exercise_id,'payload',p_payload); result jsonb; caller uuid; eid uuid; begin
 result:=grind_private.command_start(p_operation_id,payload); if result is not null then return result; end if; caller:=auth.uid();
 perform grind_private.keys(p_payload,array['name','primary_muscle','equipment','category','load_convention','load_mode'],array['name','primary_muscle','equipment','category','load_convention','load_mode']);
 perform grind_private.mode(p_payload->>'load_mode');
 perform grind_private.text_value(p_payload->'name',1,80); perform grind_private.text_value(p_payload->'primary_muscle',1,40);
 perform grind_private.text_value(p_payload->'equipment',1,40); perform grind_private.text_value(p_payload->'category',1,40); perform grind_private.text_value(p_payload->'load_convention',1,80);
 if btrim(p_payload->>'name')='' or btrim(p_payload->>'primary_muscle')='' or btrim(p_payload->>'equipment')='' or btrim(p_payload->>'category')='' or btrim(p_payload->>'load_convention')='' then raise exception 'VALIDATION: blank definition' using errcode='23514'; end if;
 if p_exercise_id is null then
  insert into grind.exercises(origin,owner_id,name,primary_muscle,equipment,category,load_convention,load_mode)
  values('custom',caller,btrim(p_payload->>'name'),btrim(p_payload->>'primary_muscle'),btrim(p_payload->>'equipment'),btrim(p_payload->>'category'),btrim(p_payload->>'load_convention'),p_payload->>'load_mode') returning id into eid;
 else
  update grind.exercises set name=btrim(p_payload->>'name'),primary_muscle=btrim(p_payload->>'primary_muscle'),equipment=btrim(p_payload->>'equipment'),category=btrim(p_payload->>'category'),load_convention=btrim(p_payload->>'load_convention'),load_mode=p_payload->>'load_mode'
  where id=p_exercise_id and owner_id=caller and origin='custom' and archived_at is null returning id into eid;
  if eid is null then raise exception 'FORBIDDEN: custom exercise unavailable' using errcode='42501'; end if;
 end if;
 select to_jsonb(e) into result from grind.exercises e where id=eid;
 return grind_private.command_end(p_operation_id,payload,result);
end $$;
create function grind.archive_custom_exercise(p_operation_id uuid,p_exercise_id uuid) returns jsonb language plpgsql security definer set search_path='' as $$
declare payload jsonb:=jsonb_build_object('method','archive_custom_exercise','id',p_exercise_id); result jsonb; begin
 result:=grind_private.command_start(p_operation_id,payload); if result is not null then return result; end if;
 update grind.exercises set archived_at=coalesce(archived_at,now()) where id=p_exercise_id and origin='custom' and owner_id=auth.uid() returning to_jsonb(exercises.*) into result;
 if result is null then raise exception 'FORBIDDEN: custom exercise unavailable' using errcode='42501'; end if;
 return grind_private.command_end(p_operation_id,payload,result);
end $$;
create function grind.save_routine(p_operation_id uuid,p_routine_id uuid,p_expected_version integer,p_template jsonb) returns jsonb language plpgsql security definer set search_path='' as $$
declare payload jsonb:=jsonb_build_object('method','save_routine','id',p_routine_id,'version',p_expected_version,'template',p_template);
 result jsonb; rid uuid; previous grind.routine_templates; e jsonb; s jsonb; definition grind.exercises; eid uuid; sid uuid; ordinal integer; set_ordinal integer; retained uuid[]; begin
 result:=grind_private.command_start(p_operation_id,payload); if result is not null then return result; end if;
 perform grind_private.keys(p_template,array['name','exercises'],array['name','exercises']);
 perform grind_private.text_value(p_template->'name',1,80);
 if btrim(p_template->>'name')='' or jsonb_typeof(p_template->'exercises') is distinct from 'array' or jsonb_array_length(p_template->'exercises')>100 then raise exception 'VALIDATION: routine name/exercises' using errcode='23514'; end if;
 if p_routine_id is null then
  if p_expected_version is not null then raise exception 'VALIDATION: new routine version must be null' using errcode='23514'; end if;
  insert into grind.routine_templates(owner_id,name) values(auth.uid(),btrim(p_template->>'name')) returning id into rid;
  retained:=array[]::uuid[];
 else
  select * into previous from grind.routine_templates where id=p_routine_id and owner_id=auth.uid() and archived_at is null for update;
  if not found then raise exception 'FORBIDDEN: routine unavailable' using errcode='42501'; end if;
  if p_expected_version is distinct from previous.version then raise exception 'CONFLICT: routine changed' using errcode='PT409'; end if;
  rid:=previous.id; select coalesce(array_agg(exercise_id),array[]::uuid[]) into retained from grind.routine_exercises where routine_id=rid;
  update grind.routine_templates set name=btrim(p_template->>'name'),version=version+1 where id=rid;
  delete from grind.routine_exercises where routine_id=rid;
 end if;
 ordinal:=0;
 for e in select value from jsonb_array_elements(p_template->'exercises') loop
  perform grind_private.keys(e,array['id','exercise_id','position','load_mode','notes','rest_seconds','sets'],array['id','exercise_id','position','load_mode','notes','rest_seconds','sets']);
  eid:=grind_private.uuid_value(e->'id'); definition:=grind_private.catalog(grind_private.uuid_value(e->'exercise_id'),grind_private.uuid_value(e->'exercise_id')=any(retained));
  if grind_private.int_value(e->'position',0,99)<>ordinal then raise exception 'VALIDATION: routine exercise ordering' using errcode='23514'; end if;
  perform grind_private.mode(e->>'load_mode'); perform grind_private.text_value(e->'notes',0,2000);
  if jsonb_typeof(e->'sets') is distinct from 'array' or jsonb_array_length(e->'sets')>100 then raise exception 'VALIDATION: routine sets' using errcode='23514'; end if;
  insert into grind.routine_exercises(id,routine_id,exercise_id,position,load_mode,notes,rest_seconds) values(eid,rid,definition.id,ordinal,e->>'load_mode',e->>'notes',grind_private.int_value(e->'rest_seconds',15,3600));
  set_ordinal:=0;
  for s in select value from jsonb_array_elements(e->'sets') loop
   perform grind_private.set_values(s,e->>'load_mode'); sid:=grind_private.uuid_value(s->'id');
   if grind_private.int_value(s->'position',0,99)<>set_ordinal then raise exception 'VALIDATION: routine set ordering' using errcode='23514'; end if;
   insert into grind.routine_sets(id,routine_exercise_id,position,set_type,entered_load,entered_unit,reps,canonical_kg)
   values(sid,eid,set_ordinal,s->>'set_type',s->>'entered_load',s->>'entered_unit',(s->>'reps')::integer,grind_private.load_kg(s->>'entered_load',s->>'entered_unit',e->>'load_mode'));
   set_ordinal:=set_ordinal+1;
  end loop;
  ordinal:=ordinal+1;
 end loop;
 result:=grind_private.routine_graph(rid); return grind_private.command_end(p_operation_id,payload,result);
exception when unique_violation then raise exception 'VALIDATION: duplicate or retargeted template ID' using errcode='23514';
end $$;
create function grind.archive_routine(p_operation_id uuid,p_routine_id uuid,p_expected_version integer) returns jsonb language plpgsql security definer set search_path='' as $$
declare payload jsonb:=jsonb_build_object('method','archive_routine','id',p_routine_id,'version',p_expected_version); result jsonb; r grind.routine_templates; begin
 result:=grind_private.command_start(p_operation_id,payload); if result is not null then return result; end if;
 select * into r from grind.routine_templates where id=p_routine_id and owner_id=auth.uid() for update;
 if not found then raise exception 'FORBIDDEN: routine unavailable' using errcode='42501'; end if;
 if p_expected_version is distinct from r.version then raise exception 'CONFLICT: routine changed' using errcode='PT409'; end if;
 update grind.routine_templates set archived_at=coalesce(archived_at,now()),version=version+1 where id=r.id;
 return grind_private.command_end(p_operation_id,payload,grind_private.routine_graph(r.id));
end $$;

create function grind.start_workout(p_operation_id uuid,p_routine_id uuid default null,p_timezone text default 'UTC') returns jsonb language plpgsql security definer set search_path='' as $$
declare payload jsonb:=jsonb_build_object('method','start_workout','routine_id',p_routine_id,'timezone',p_timezone);
 result jsonb; wid uuid; r grind.routine_templates; e grind.routine_exercises; definition grind.exercises; weid uuid; begin
 result:=grind_private.command_start(p_operation_id,payload); if result is not null then return result; end if;
 if p_timezone is null or not exists(select 1 from pg_timezone_names where name=p_timezone) then raise exception 'VALIDATION: invalid timezone' using errcode='23514'; end if;
 select id into wid from grind.workout_sessions where owner_id=auth.uid() and status='active' for update;
 if wid is null then
  if p_routine_id is not null then
   select * into r from grind.routine_templates where id=p_routine_id and owner_id=auth.uid() and archived_at is null;
   if not found then raise exception 'FORBIDDEN: routine unavailable' using errcode='42501'; end if;
  end if;
  insert into grind.workout_sessions(owner_id,source_routine_id,name,timezone) values(auth.uid(),p_routine_id,coalesce(r.name,'Workout'),p_timezone) returning id into wid;
  if p_routine_id is not null then
   for e in select * from grind.routine_exercises where routine_id=p_routine_id order by position loop
    definition:=grind_private.catalog(e.exercise_id,true); weid:=gen_random_uuid();
    insert into grind.workout_exercises(id,session_id,exercise_id,position,name,load_convention,load_mode,notes,rest_seconds)
    values(weid,wid,e.exercise_id,e.position,definition.name,definition.load_convention,e.load_mode,e.notes,e.rest_seconds);
    insert into grind.workout_sets(id,workout_exercise_id,position,set_type,entered_load,entered_unit,canonical_kg,reps)
    select gen_random_uuid(),weid,position,set_type,entered_load,entered_unit,canonical_kg,reps from grind.routine_sets where routine_exercise_id=e.id;
   end loop;
  end if;
 end if;
 return grind_private.command_end(p_operation_id,payload,grind_private.session_graph(wid));
end $$;

create function grind.apply_workout_command(p_operation_id uuid,p_session_id uuid,p_expected_revision integer,p_command jsonb) returns jsonb language plpgsql security definer set search_path='' as $$
declare payload jsonb:=jsonb_build_object('method','apply_workout_command','session_id',p_session_id,'revision',p_expected_revision,'command',p_command);
 result jsonb; w grind.workout_sessions; e grind.workout_exercises; definition grind.exercises; s grind.workout_sets;
 kind text; eid uuid; sid uuid; pos integer; total integer; ids uuid[]; value jsonb; canonical numeric; changed boolean; begin
 result:=grind_private.command_start(p_operation_id,payload); if result is not null then return result; end if;
 select * into w from grind.workout_sessions where id=p_session_id and owner_id=auth.uid() for update;
 if not found then raise exception 'FORBIDDEN: workout unavailable' using errcode='42501'; end if;
 if w.status<>'active' then raise exception 'VALIDATION: workout is not active' using errcode='23514'; end if;
 if p_expected_revision is distinct from w.revision then raise exception 'CONFLICT: workout changed' using errcode='PT409'; end if;
 if jsonb_typeof(p_command) is distinct from 'object' then raise exception 'VALIDATION: command required' using errcode='23514'; end if;
 kind:=p_command->>'type';
 if kind='rename_workout' then
  perform grind_private.keys(p_command,array['type','name'],array['type','name']); perform grind_private.text_value(p_command->'name',1,80);
  if btrim(p_command->>'name')='' then raise exception 'VALIDATION: blank name' using errcode='23514'; end if;
  update grind.workout_sessions set name=btrim(p_command->>'name') where id=w.id;
 elsif kind='add_exercise' then
  perform grind_private.keys(p_command,array['type','id','exercise_id','position','load_mode','notes','rest_seconds'],array['type','id','exercise_id','position','load_mode','notes','rest_seconds']);
  select count(*) into total from grind.workout_exercises where session_id=w.id;
  if total>=100 then raise exception 'VALIDATION: exercise limit' using errcode='23514'; end if;
  pos:=grind_private.int_value(p_command->'position',0,total); eid:=grind_private.uuid_value(p_command->'id');
  definition:=grind_private.catalog(grind_private.uuid_value(p_command->'exercise_id'));
  perform grind_private.mode(p_command->>'load_mode'); perform grind_private.text_value(p_command->'notes',0,2000);
  update grind.workout_exercises set position=position+1 where session_id=w.id and position>=pos;
  insert into grind.workout_exercises(id,session_id,exercise_id,position,name,load_convention,load_mode,notes,rest_seconds)
  values(eid,w.id,definition.id,pos,definition.name,definition.load_convention,p_command->>'load_mode',p_command->>'notes',grind_private.int_value(p_command->'rest_seconds',15,3600));
 elsif kind='reorder_exercises' then
  perform grind_private.keys(p_command,array['type','ids'],array['type','ids']);
  if jsonb_typeof(p_command->'ids') is distinct from 'array' then raise exception 'VALIDATION: exercise IDs required' using errcode='23514'; end if;
  select coalesce(array_agg(grind_private.uuid_value(value) order by ordinality),array[]::uuid[]) into ids from jsonb_array_elements(p_command->'ids') with ordinality;
  select count(*) into total from grind.workout_exercises where session_id=w.id;
  if cardinality(ids)<>total or (select count(distinct x) from unnest(ids) x)<>total or exists(select 1 from unnest(ids) x where not exists(select 1 from grind.workout_exercises where id=x and session_id=w.id)) then raise exception 'VALIDATION: full exercise permutation required' using errcode='23514'; end if;
  update grind.workout_exercises set position=array_position(ids,id)-1 where session_id=w.id;
 elsif kind in ('update_exercise','remove_exercise','upsert_set','remove_set','reorder_sets','complete_set') then
  eid:=grind_private.uuid_value(p_command->'exercise_id');
  select * into e from grind.workout_exercises where id=eid and session_id=w.id;
  if not found then raise exception 'FORBIDDEN: workout exercise unavailable' using errcode='42501'; end if;
  if kind='update_exercise' then
   perform grind_private.keys(p_command,array['type','exercise_id','notes','rest_seconds'],array['type','exercise_id','notes','rest_seconds']);
   perform grind_private.text_value(p_command->'notes',0,2000);
   update grind.workout_exercises set notes=p_command->>'notes',rest_seconds=grind_private.int_value(p_command->'rest_seconds',15,3600) where id=eid;
  elsif kind='remove_exercise' then
   perform grind_private.keys(p_command,array['type','exercise_id'],array['type','exercise_id']);
   delete from grind.workout_exercises where id=eid;
   update grind.workout_exercises set position=position-1 where session_id=w.id and position>e.position;
  elsif kind='upsert_set' then
   perform grind_private.keys(p_command,array['type','exercise_id','set'],array['type','exercise_id','set']); value:=p_command->'set';
   perform grind_private.set_values(value,e.load_mode); sid:=grind_private.uuid_value(value->'id'); pos:=grind_private.int_value(value->'position',0,99);
   select * into s from grind.workout_sets where id=sid;
   select count(*) into total from grind.workout_sets where workout_exercise_id=eid;
   canonical:=grind_private.load_kg(value->>'entered_load',value->>'entered_unit',e.load_mode);
   if s.id is not null then
    if s.workout_exercise_id<>eid then raise exception 'FORBIDDEN: cannot retarget a set' using errcode='42501'; end if;
    if pos>=total then raise exception 'VALIDATION: set position' using errcode='23514'; end if;
    if pos>s.position then update grind.workout_sets set position=position-1 where workout_exercise_id=eid and position>s.position and position<=pos;
    elsif pos<s.position then update grind.workout_sets set position=position+1 where workout_exercise_id=eid and position>=pos and position<s.position; end if;
    changed:=row(s.set_type,s.entered_load,s.entered_unit,s.reps) is distinct from row(value->>'set_type',value->>'entered_load',value->>'entered_unit',(value->>'reps')::integer);
    update grind.workout_sets set position=pos,set_type=value->>'set_type',entered_load=value->>'entered_load',entered_unit=value->>'entered_unit',reps=(value->>'reps')::integer,canonical_kg=canonical,
      completed_at=case when changed then null else completed_at end where id=sid;
   else
    if total>=100 or pos>total then raise exception 'VALIDATION: set limit/position' using errcode='23514'; end if;
    update grind.workout_sets set position=position+1 where workout_exercise_id=eid and position>=pos;
    insert into grind.workout_sets(id,workout_exercise_id,position,set_type,entered_load,entered_unit,reps,canonical_kg)
    values(sid,eid,pos,value->>'set_type',value->>'entered_load',value->>'entered_unit',(value->>'reps')::integer,canonical);
   end if;
  elsif kind='reorder_sets' then
   perform grind_private.keys(p_command,array['type','exercise_id','ids'],array['type','exercise_id','ids']);
   if jsonb_typeof(p_command->'ids') is distinct from 'array' then raise exception 'VALIDATION: set IDs required' using errcode='23514'; end if;
   select coalesce(array_agg(grind_private.uuid_value(value) order by ordinality),array[]::uuid[]) into ids from jsonb_array_elements(p_command->'ids') with ordinality;
   select count(*) into total from grind.workout_sets where workout_exercise_id=eid;
   if cardinality(ids)<>total or (select count(distinct x) from unnest(ids) x)<>total or exists(select 1 from unnest(ids) x where not exists(select 1 from grind.workout_sets where id=x and workout_exercise_id=eid)) then raise exception 'VALIDATION: full set permutation required' using errcode='23514'; end if;
   update grind.workout_sets set position=array_position(ids,id)-1 where workout_exercise_id=eid;
  else
   sid:=grind_private.uuid_value(p_command->'set_id'); select * into s from grind.workout_sets where id=sid and workout_exercise_id=eid;
   if not found then raise exception 'FORBIDDEN: set unavailable' using errcode='42501'; end if;
   if kind='remove_set' then
    perform grind_private.keys(p_command,array['type','exercise_id','set_id'],array['type','exercise_id','set_id']);
    delete from grind.workout_sets where id=sid; update grind.workout_sets set position=position-1 where workout_exercise_id=eid and position>s.position;
   else
    perform grind_private.keys(p_command,array['type','exercise_id','set_id','completed'],array['type','exercise_id','set_id','completed']);
    if jsonb_typeof(p_command->'completed') is distinct from 'boolean' then raise exception 'VALIDATION: completion flag required' using errcode='23514'; end if;
    if (p_command->>'completed')::boolean and (s.reps is null or (e.load_mode<>'bodyweight' and s.entered_load is null)) then raise exception 'VALIDATION: complete values required' using errcode='23514'; end if;
    update grind.workout_sets set completed_at=case when (p_command->>'completed')::boolean then coalesce(completed_at,clock_timestamp()) else null end where id=sid;
   end if;
  end if;
 else raise exception 'VALIDATION: unknown command' using errcode='23514';
 end if;
 update grind.workout_sessions set revision=revision+1 where id=w.id;
 return grind_private.command_end(p_operation_id,payload,grind_private.session_graph(w.id));
exception when unique_violation then raise exception 'VALIDATION: duplicate or retargeted ID' using errcode='23514';
end $$;

create function grind_private.end_workout(op uuid,wid uuid,expected integer,new_status text) returns jsonb language plpgsql set search_path='' as $$
declare payload jsonb:=jsonb_build_object('method',case when new_status='completed' then 'finish_workout' else 'cancel_workout' end,'session_id',wid,'revision',expected);
 result jsonb; w grind.workout_sessions; begin
 result:=grind_private.command_start(op,payload); if result is not null then return result; end if;
 select * into w from grind.workout_sessions where id=wid and owner_id=auth.uid() for update;
 if not found then raise exception 'FORBIDDEN: workout unavailable' using errcode='42501'; end if;
 if w.status<>'active' then raise exception 'VALIDATION: workout is not active' using errcode='23514'; end if;
 if expected is distinct from w.revision then raise exception 'CONFLICT: workout changed' using errcode='PT409'; end if;
 if new_status='completed' then
  if not exists(select 1 from grind.workout_exercises e join grind.workout_sets s on s.workout_exercise_id=e.id where e.session_id=wid and s.completed_at is not null)
   or exists(select 1 from grind.workout_exercises e where e.session_id=wid and not exists(select 1 from grind.workout_sets s where s.workout_exercise_id=e.id))
   or exists(select 1 from grind.workout_exercises e join grind.workout_sets s on s.workout_exercise_id=e.id where e.session_id=wid and (s.completed_at is null or s.reps is null or (e.load_mode<>'bodyweight' and s.entered_load is null))) then
   raise exception 'VALIDATION: remove unfinished/empty rows before finishing' using errcode='23514';
  end if;
 end if;
 update grind.workout_sessions set status=new_status,finished_at=clock_timestamp(),revision=revision+1 where id=wid;
 return grind_private.command_end(op,payload,grind_private.session_graph(wid));
end $$;
create function grind.finish_workout(p_operation_id uuid,p_session_id uuid,p_expected_revision integer) returns jsonb language plpgsql security definer set search_path='' as $$
begin return grind_private.end_workout(p_operation_id,p_session_id,p_expected_revision,'completed'); end $$;
create function grind.cancel_workout(p_operation_id uuid,p_session_id uuid,p_expected_revision integer) returns jsonb language plpgsql security definer set search_path='' as $$
begin return grind_private.end_workout(p_operation_id,p_session_id,p_expected_revision,'cancelled'); end $$;

create function grind.get_previous_performance(p_exercise_id uuid,p_load_mode text,p_load_convention text default null) returns jsonb language plpgsql stable security definer set search_path='' as $$
declare definition grind.exercises; wid uuid; finished timestamptz; result jsonb; begin
 definition:=grind_private.catalog(p_exercise_id,true); perform grind_private.mode(p_load_mode);
 if p_load_convention is not null then
  perform grind_private.text_value(to_jsonb(p_load_convention),1,80);
  if btrim(p_load_convention)='' then raise exception 'VALIDATION: blank convention' using errcode='23514'; end if;
 end if;
 select w.id,w.finished_at into wid,finished from grind.workout_sessions w where w.owner_id=auth.uid() and w.status='completed' and exists(
  select 1 from grind.workout_exercises e join grind.workout_sets s on s.workout_exercise_id=e.id where e.session_id=w.id and e.exercise_id=p_exercise_id and e.load_mode=p_load_mode and e.load_convention=coalesce(p_load_convention,definition.load_convention) and s.completed_at is not null)
 order by w.finished_at desc,w.id desc limit 1;
 if wid is null then return null; end if;
 select coalesce(jsonb_agg(jsonb_build_object('set_type',set_type,'ordinal',ordinal,'entered_load',entered_load,'entered_unit',entered_unit,'reps',reps) order by exercise_position,set_position),'[]'::jsonb) into result
 from (select s.set_type,s.entered_load,s.entered_unit,s.reps,e.position as exercise_position,s.position as set_position,
  row_number() over(partition by s.set_type order by e.position,s.position)-1 as ordinal
  from grind.workout_exercises e join grind.workout_sets s on s.workout_exercise_id=e.id where e.session_id=wid and e.exercise_id=p_exercise_id and e.load_mode=p_load_mode and e.load_convention=coalesce(p_load_convention,definition.load_convention) and s.completed_at is not null) eligible;
 return jsonb_build_object('session_id',wid,'finished_at',finished,'sets',result);
end $$;

-- Helpers are invoker-only inside definer RPCs and cannot be called by application roles.
revoke all on all functions in schema grind_private from public,anon,authenticated;
revoke all on all tables in schema grind_private from public,anon,authenticated;
do $$ declare f record; begin
 for f in select p.oid::regprocedure as signature from pg_proc p join pg_namespace n on n.oid=p.pronamespace where n.nspname='grind' and p.proname=any(array[
 'get_active_workout','get_workout','get_routine','list_routines','list_workout_history','save_custom_exercise','archive_custom_exercise','save_routine','archive_routine','start_workout','apply_workout_command','finish_workout','cancel_workout','get_previous_performance']) loop
 execute format('revoke all on function %s from public, anon, authenticated',f.signature);
 execute format('grant execute on function %s to authenticated',f.signature);
 end loop;
end $$;
commit;
