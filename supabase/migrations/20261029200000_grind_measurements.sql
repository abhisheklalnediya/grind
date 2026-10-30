-- Add exercise measurement snapshots without rewriting historical workouts.
begin;
alter table grind.exercises add column tracking_type text not null default 'reps' check (tracking_type in ('reps','duration','distance_duration'));
alter table grind.routine_exercises add column tracking_type text not null default 'reps' check (tracking_type in ('reps','duration','distance_duration'));
alter table grind.workout_exercises add column tracking_type text not null default 'reps' check (tracking_type in ('reps','duration','distance_duration'));
alter table grind.routine_sets add column duration_seconds integer check (duration_seconds between 1 and 86400), add column entered_distance text, add column distance_unit text check(distance_unit in ('km','mi')), add column canonical_distance_km numeric;
alter table grind.workout_sets add column duration_seconds integer check (duration_seconds between 1 and 86400), add column entered_distance text, add column distance_unit text check(distance_unit in ('km','mi')), add column canonical_distance_km numeric;

create function grind_private.tracking_type(value text) returns text language plpgsql immutable set search_path='' as $$
begin
 if value is null or value not in ('reps','duration','distance_duration') then raise exception 'VALIDATION: invalid tracking type' using errcode='23514'; end if;
 return value;
end $$;
create function grind_private.distance_km(value text, unit text) returns numeric language plpgsql immutable set search_path='' as $$
begin
 if unit is not null and unit not in ('km','mi') then raise exception 'VALIDATION: invalid distance unit' using errcode='23514'; end if;
 if value is null then return null; end if;
 if unit is null or char_length(value)>32 or value!~'^([0-9]+(\.[0-9]{1,3})?|\.[0-9]{1,3})$' then raise exception 'VALIDATION: decimal distance and unit required' using errcode='23514'; end if;
 if value::numeric<=0 or value::numeric>100000 then raise exception 'VALIDATION: distance range' using errcode='23514'; end if;
 return value::numeric * case when unit='mi' then 1.609344::numeric else 1::numeric end;
end $$;
create function grind_private.measurements(value jsonb, tracking text) returns void language plpgsql immutable set search_path='' as $$
declare distance text; unit text; begin
 perform grind_private.tracking_type(tracking);
 if value ? 'duration_seconds' and value->'duration_seconds'<>'null'::jsonb then perform grind_private.int_value(value->'duration_seconds',1,86400); end if;
 if value ? 'entered_distance' and value->'entered_distance'<>'null'::jsonb then distance:=grind_private.text_value(value->'entered_distance',1,32); end if;
 if value ? 'distance_unit' and value->'distance_unit'<>'null'::jsonb then unit:=grind_private.text_value(value->'distance_unit',1,2); end if;
 perform grind_private.distance_km(distance,unit);
 if tracking='reps' and (value->>'duration_seconds' is not null or distance is not null or unit is not null) then raise exception 'VALIDATION: incompatible measurements' using errcode='23514'; end if;
 if tracking='duration' and (distance is not null or unit is not null) then raise exception 'VALIDATION: incompatible measurements' using errcode='23514'; end if;
 if tracking<>'reps' and (value->>'entered_load' is not null or value->>'reps' is not null) then raise exception 'VALIDATION: incompatible measurements' using errcode='23514'; end if;
end $$;
create function grind_private.set_complete(tracking text, mode text, reps integer, load text, duration integer, distance text, unit text) returns boolean language sql immutable set search_path='' as $$
 select case tracking when 'reps' then reps is not null and (mode='bodyweight' or load is not null) when 'duration' then duration is not null when 'distance_duration' then duration is not null and distance is not null and unit is not null else false end
$$;

create or replace function grind_private.set_values(value jsonb, mode text) returns void language plpgsql immutable set search_path='' as $$
declare load text; begin
 perform grind_private.keys(value,array['id','position','set_type','entered_load','entered_unit','reps','duration_seconds','entered_distance','distance_unit'],array['id','position','set_type','entered_load','entered_unit','reps']);
 perform grind_private.uuid_value(value->'id'); perform grind_private.int_value(value->'position',0,99);
 if (value->>'set_type') is null or value->>'set_type' not in ('warmup','working') then raise exception 'VALIDATION: set type' using errcode='23514'; end if;
 if value->'entered_load'<>'null'::jsonb then load:=grind_private.text_value(value->'entered_load',1,32); end if;
 perform grind_private.load_kg(load,value->>'entered_unit',mode);
 if value->'reps'<>'null'::jsonb then perform grind_private.int_value(value->'reps',1,10000); end if;
end $$;

create or replace function grind_private.session_graph(wid uuid) returns jsonb language sql stable set search_path='' as $$
 select jsonb_build_object('id',w.id,'status',w.status,'name',w.name,'started_at',w.started_at,'finished_at',w.finished_at,'timezone',w.timezone,'revision',w.revision,'source_routine_id',w.source_routine_id,
  'exercises',coalesce((select jsonb_agg(jsonb_build_object('id',e.id,'exercise_id',e.exercise_id,'position',e.position,'name',e.name,'load_convention',e.load_convention,'load_mode',e.load_mode,'tracking_type',e.tracking_type,'notes',e.notes,'rest_seconds',e.rest_seconds,
   'sets',coalesce((select jsonb_agg(jsonb_build_object('id',s.id,'position',s.position,'set_type',s.set_type,'entered_load',s.entered_load,'entered_unit',s.entered_unit,'reps',s.reps,'duration_seconds',s.duration_seconds,'entered_distance',s.entered_distance,'distance_unit',s.distance_unit,'completed_at',s.completed_at) order by s.position) from grind.workout_sets s where s.workout_exercise_id=e.id),'[]'::jsonb)) order by e.position) from grind.workout_exercises e where e.session_id=w.id),'[]'::jsonb))
 from grind.workout_sessions w where w.id=wid
$$;

create or replace function grind_private.routine_graph(rid uuid) returns jsonb language sql stable set search_path='' as $$
 select jsonb_build_object('id',r.id,'name',r.name,'version',r.version,'archived_at',r.archived_at,
 'exercises',coalesce((select jsonb_agg(jsonb_build_object('id',e.id,'exercise_id',e.exercise_id,'position',e.position,'load_mode',e.load_mode,'tracking_type',e.tracking_type,'notes',e.notes,'rest_seconds',e.rest_seconds,
 'sets',coalesce((select jsonb_agg(jsonb_build_object('id',s.id,'position',s.position,'set_type',s.set_type,'entered_load',s.entered_load,'entered_unit',s.entered_unit,'reps',s.reps,'duration_seconds',s.duration_seconds,'entered_distance',s.entered_distance,'distance_unit',s.distance_unit) order by s.position) from grind.routine_sets s where s.routine_exercise_id=e.id),'[]'::jsonb)) order by e.position) from grind.routine_exercises e where e.routine_id=r.id),'[]'::jsonb)) from grind.routine_templates r where r.id=rid
$$;

create or replace function grind.save_routine(p_operation_id uuid,p_routine_id uuid,p_expected_version integer,p_template jsonb) returns jsonb language plpgsql security definer set search_path='' as $$
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
  perform grind_private.keys(e,array['id','exercise_id','position','load_mode','notes','rest_seconds','sets','tracking_type'],array['id','exercise_id','position','load_mode','notes','rest_seconds','sets']);
  eid:=grind_private.uuid_value(e->'id'); definition:=grind_private.catalog(grind_private.uuid_value(e->'exercise_id'),grind_private.uuid_value(e->'exercise_id')=any(retained));
  if e ? 'tracking_type' and e->>'tracking_type' is distinct from definition.tracking_type then raise exception 'VALIDATION: tracking type differs from catalog' using errcode='23514'; end if;
  if grind_private.int_value(e->'position',0,99)<>ordinal then raise exception 'VALIDATION: routine exercise ordering' using errcode='23514'; end if;
  perform grind_private.mode(e->>'load_mode'); perform grind_private.text_value(e->'notes',0,2000);
  if jsonb_typeof(e->'sets') is distinct from 'array' or jsonb_array_length(e->'sets')>100 then raise exception 'VALIDATION: routine sets' using errcode='23514'; end if;
  insert into grind.routine_exercises(id,routine_id,exercise_id,position,tracking_type,load_mode,notes,rest_seconds) values(eid,rid,definition.id,ordinal,definition.tracking_type,e->>'load_mode',e->>'notes',grind_private.int_value(e->'rest_seconds',15,3600));
  set_ordinal:=0;
  for s in select value from jsonb_array_elements(e->'sets') loop
   perform grind_private.set_values(s,e->>'load_mode'); perform grind_private.measurements(s,definition.tracking_type); sid:=grind_private.uuid_value(s->'id');
   if grind_private.int_value(s->'position',0,99)<>set_ordinal then raise exception 'VALIDATION: routine set ordering' using errcode='23514'; end if;
   insert into grind.routine_sets(id,routine_exercise_id,position,set_type,entered_load,entered_unit,reps,canonical_kg,duration_seconds,entered_distance,distance_unit,canonical_distance_km)
   values(sid,eid,set_ordinal,s->>'set_type',s->>'entered_load',s->>'entered_unit',(s->>'reps')::integer,grind_private.load_kg(s->>'entered_load',s->>'entered_unit',e->>'load_mode'),(s->>'duration_seconds')::integer,s->>'entered_distance',s->>'distance_unit',grind_private.distance_km(s->>'entered_distance',s->>'distance_unit'));
   set_ordinal:=set_ordinal+1;
  end loop;
  ordinal:=ordinal+1;
 end loop;
 result:=grind_private.routine_graph(rid); return grind_private.command_end(p_operation_id,payload,result);
exception when unique_violation then raise exception 'VALIDATION: duplicate or retargeted template ID' using errcode='23514';
end $$;

create or replace function grind.start_workout(p_operation_id uuid,p_routine_id uuid default null,p_timezone text default 'UTC') returns jsonb language plpgsql security definer set search_path='' as $$
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
    insert into grind.workout_exercises(id,session_id,exercise_id,position,name,load_convention,tracking_type,load_mode,notes,rest_seconds)
    values(weid,wid,e.exercise_id,e.position,definition.name,definition.load_convention,e.tracking_type,e.load_mode,e.notes,e.rest_seconds);
    insert into grind.workout_sets(id,workout_exercise_id,position,set_type,entered_load,entered_unit,canonical_kg,reps,duration_seconds,entered_distance,distance_unit,canonical_distance_km)
    select gen_random_uuid(),weid,position,set_type,entered_load,entered_unit,canonical_kg,reps,duration_seconds,entered_distance,distance_unit,canonical_distance_km from grind.routine_sets where routine_exercise_id=e.id;
   end loop;
  end if;
 end if;
 return grind_private.command_end(p_operation_id,payload,grind_private.session_graph(wid));
end $$;

create or replace function grind.apply_workout_command(p_operation_id uuid,p_session_id uuid,p_expected_revision integer,p_command jsonb) returns jsonb language plpgsql security definer set search_path='' as $$
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
  perform grind_private.keys(p_command,array['type','id','exercise_id','position','load_mode','notes','rest_seconds','tracking_type'],array['type','id','exercise_id','position','load_mode','notes','rest_seconds']);
  select count(*) into total from grind.workout_exercises where session_id=w.id;
  if total>=100 then raise exception 'VALIDATION: exercise limit' using errcode='23514'; end if;
  pos:=grind_private.int_value(p_command->'position',0,total); eid:=grind_private.uuid_value(p_command->'id');
  definition:=grind_private.catalog(grind_private.uuid_value(p_command->'exercise_id'));
  if p_command ? 'tracking_type' and p_command->>'tracking_type' is distinct from definition.tracking_type then raise exception 'VALIDATION: tracking type differs from catalog' using errcode='23514'; end if;
  perform grind_private.mode(p_command->>'load_mode'); perform grind_private.text_value(p_command->'notes',0,2000);
  update grind.workout_exercises set position=position+1 where session_id=w.id and position>=pos;
  insert into grind.workout_exercises(id,session_id,exercise_id,position,name,load_convention,tracking_type,load_mode,notes,rest_seconds)
  values(eid,w.id,definition.id,pos,definition.name,definition.load_convention,definition.tracking_type,p_command->>'load_mode',p_command->>'notes',grind_private.int_value(p_command->'rest_seconds',15,3600));
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
   perform grind_private.set_values(value,e.load_mode); perform grind_private.measurements(value,e.tracking_type); sid:=grind_private.uuid_value(value->'id'); pos:=grind_private.int_value(value->'position',0,99);
   select * into s from grind.workout_sets where id=sid;
   select count(*) into total from grind.workout_sets where workout_exercise_id=eid;
   canonical:=grind_private.load_kg(value->>'entered_load',value->>'entered_unit',e.load_mode);
   if s.id is not null then
    if s.workout_exercise_id<>eid then raise exception 'FORBIDDEN: cannot retarget a set' using errcode='42501'; end if;
    if pos>=total then raise exception 'VALIDATION: set position' using errcode='23514'; end if;
    if pos>s.position then update grind.workout_sets set position=position-1 where workout_exercise_id=eid and position>s.position and position<=pos;
    elsif pos<s.position then update grind.workout_sets set position=position+1 where workout_exercise_id=eid and position>=pos and position<s.position; end if;
    changed:=row(s.set_type,s.entered_load,s.entered_unit,s.reps,s.duration_seconds,s.entered_distance,s.distance_unit) is distinct from row(value->>'set_type',value->>'entered_load',value->>'entered_unit',(value->>'reps')::integer,(value->>'duration_seconds')::integer,value->>'entered_distance',value->>'distance_unit');
    update grind.workout_sets set position=pos,set_type=value->>'set_type',entered_load=value->>'entered_load',entered_unit=value->>'entered_unit',reps=(value->>'reps')::integer,canonical_kg=canonical,duration_seconds=(value->>'duration_seconds')::integer,entered_distance=value->>'entered_distance',distance_unit=value->>'distance_unit',canonical_distance_km=grind_private.distance_km(value->>'entered_distance',value->>'distance_unit'),
      completed_at=case when changed then null else completed_at end where id=sid;
   else
    if total>=100 or pos>total then raise exception 'VALIDATION: set limit/position' using errcode='23514'; end if;
    update grind.workout_sets set position=position+1 where workout_exercise_id=eid and position>=pos;
    insert into grind.workout_sets(id,workout_exercise_id,position,set_type,entered_load,entered_unit,reps,canonical_kg,duration_seconds,entered_distance,distance_unit,canonical_distance_km)
    values(sid,eid,pos,value->>'set_type',value->>'entered_load',value->>'entered_unit',(value->>'reps')::integer,canonical,(value->>'duration_seconds')::integer,value->>'entered_distance',value->>'distance_unit',grind_private.distance_km(value->>'entered_distance',value->>'distance_unit'));
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
    if (p_command->>'completed')::boolean and not grind_private.set_complete(e.tracking_type,e.load_mode,s.reps,s.entered_load,s.duration_seconds,s.entered_distance,s.distance_unit) then raise exception 'VALIDATION: complete values required' using errcode='23514'; end if;
    update grind.workout_sets set completed_at=case when (p_command->>'completed')::boolean then coalesce(completed_at,clock_timestamp()) else null end where id=sid;
   end if;
  end if;
 else raise exception 'VALIDATION: unknown command' using errcode='23514';
 end if;
 update grind.workout_sessions set revision=revision+1 where id=w.id;
 return grind_private.command_end(p_operation_id,payload,grind_private.session_graph(w.id));
exception when unique_violation then raise exception 'VALIDATION: duplicate or retargeted ID' using errcode='23514';
end $$;

create or replace function grind_private.end_workout(op uuid,wid uuid,expected integer,new_status text) returns jsonb language plpgsql set search_path='' as $$
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
   or exists(select 1 from grind.workout_exercises e join grind.workout_sets s on s.workout_exercise_id=e.id where e.session_id=wid and (s.completed_at is null or not grind_private.set_complete(e.tracking_type,e.load_mode,s.reps,s.entered_load,s.duration_seconds,s.entered_distance,s.distance_unit))) then
   raise exception 'VALIDATION: remove unfinished/empty rows before finishing' using errcode='23514';
  end if;
 end if;
 update grind.workout_sessions set status=new_status,finished_at=clock_timestamp(),revision=revision+1 where id=wid;
 return grind_private.command_end(op,payload,grind_private.session_graph(wid));
end $$;

drop function grind.get_previous_performance(uuid,text,text);
create or replace function grind.get_previous_performance(p_exercise_id uuid,p_load_mode text,p_load_convention text default null,p_tracking_type text default 'reps') returns jsonb language plpgsql stable security definer set search_path='' as $$
declare definition grind.exercises; wid uuid; finished timestamptz; result jsonb; begin
 definition:=grind_private.catalog(p_exercise_id,true); perform grind_private.mode(p_load_mode); perform grind_private.tracking_type(p_tracking_type);
 if p_load_convention is not null then
  perform grind_private.text_value(to_jsonb(p_load_convention),1,80);
  if btrim(p_load_convention)='' then raise exception 'VALIDATION: blank convention' using errcode='23514'; end if;
 end if;
 select w.id,w.finished_at into wid,finished from grind.workout_sessions w where w.owner_id=auth.uid() and w.status='completed' and exists(
  select 1 from grind.workout_exercises e join grind.workout_sets s on s.workout_exercise_id=e.id where e.session_id=w.id and e.exercise_id=p_exercise_id and e.load_mode=p_load_mode and e.tracking_type=p_tracking_type and e.load_convention=coalesce(p_load_convention,definition.load_convention) and s.completed_at is not null)
 order by w.finished_at desc,w.id desc limit 1;
 if wid is null then return null; end if;
 select coalesce(jsonb_agg(jsonb_build_object('set_type',set_type,'ordinal',ordinal,'entered_load',entered_load,'entered_unit',entered_unit,'reps',reps,'duration_seconds',duration_seconds,'entered_distance',entered_distance,'distance_unit',distance_unit) order by exercise_position,set_position),'[]'::jsonb) into result
 from (select s.set_type,s.entered_load,s.entered_unit,s.reps,s.duration_seconds,s.entered_distance,s.distance_unit,e.position as exercise_position,s.position as set_position,
  row_number() over(partition by s.set_type order by e.position,s.position)-1 as ordinal
  from grind.workout_exercises e join grind.workout_sets s on s.workout_exercise_id=e.id where e.session_id=wid and e.exercise_id=p_exercise_id and e.load_mode=p_load_mode and e.tracking_type=p_tracking_type and e.load_convention=coalesce(p_load_convention,definition.load_convention) and s.completed_at is not null) eligible;
 return jsonb_build_object('session_id',wid,'finished_at',finished,'sets',result);
end $$;
revoke all on function grind.get_previous_performance(uuid,text,text,text) from public,anon,authenticated;
grant execute on function grind.get_previous_performance(uuid,text,text,text) to authenticated;

create or replace function grind_private.import_reviewed_exercises(p_release uuid, p_entries jsonb)
returns integer language plpgsql security invoker set search_path = '' as $$
declare
 release_row grind_private.catalog_releases%rowtype;
 entry jsonb; source_id text; linked uuid; chosen uuid; existing grind.exercises%rowtype;
 processed integer := 0;
begin
 select * into release_row from grind_private.catalog_releases where id=p_release for update;
 if not found or release_row.state not in ('approved','active') or not exists (
   select 1 from grind_private.catalog_sources s where s.source_key=release_row.source_key and s.approval_state='approved'
 ) then raise exception 'catalog release is not approved' using errcode='23514'; end if;
 if jsonb_typeof(p_entries) <> 'array' or jsonb_array_length(p_entries) > 1000 then
   raise exception 'invalid reviewed import payload' using errcode='23514';
 end if;
 if (select count(*) <> count(distinct v->>'source_id') from jsonb_array_elements(p_entries) v) then
   raise exception 'duplicate source identifier' using errcode='23514';
 end if;
 for entry in select * from jsonb_array_elements(p_entries) loop
  source_id := entry->>'source_id';
  if jsonb_typeof(entry)<>'object' or coalesce(entry->>'reviewed','') <> 'true' or source_id is null or
     not exists(select 1 from grind_private.exercise_source_records r where r.release_id=p_release and r.source_exercise_id=source_id and r.rights_state='approved') then
    raise exception 'unreviewed or unknown source record' using errcode='23514';
  end if;
  select exercise_id into linked from grind_private.exercise_source_links l where l.source_key=release_row.source_key and l.source_exercise_id=source_id and l.review_state='approved';
  if linked is not null then
    if entry->>'existing_id' is not null and linked <> (entry->>'existing_id')::uuid then
      raise exception 'source identity cannot be remapped' using errcode='23514';
    end if;
    chosen := linked;
  elsif entry->>'existing_id' is not null then
    chosen := (entry->>'existing_id')::uuid;
    select * into existing from grind.exercises where id=chosen;
    if not found or existing.owner_id is not null or existing.archived_at is not null then
      raise exception 'existing exercise must be an active global definition' using errcode='23514';
    end if;
  else
    perform grind_private.tracking_type(coalesce(entry->>'tracking_type','reps'));
    if entry->>'load_mode' not in ('external','bodyweight','assisted','weighted_bodyweight') or
      coalesce(btrim(entry->>'name'),'')='' or coalesce(btrim(entry->>'primary_muscle'),'')='' or
      coalesce(btrim(entry->>'equipment'),'')='' or coalesce(btrim(entry->>'category'),'')='' or
      coalesce(btrim(entry->>'load_convention'),'')='' then
      raise exception 'reviewed exercise and logging semantics are required' using errcode='23514';
    end if;
    insert into grind.exercises(origin,name,primary_muscle,equipment,category,load_convention,load_mode,tracking_type)
     values('provider',btrim(entry->>'name'),btrim(entry->>'primary_muscle'),btrim(entry->>'equipment'),btrim(entry->>'category'),btrim(entry->>'load_convention'),entry->>'load_mode',coalesce(entry->>'tracking_type','reps')) returning id into chosen;
  end if;
  select * into existing from grind.exercises where id=chosen;
  if (entry ? 'tracking_type' and entry->>'tracking_type' is distinct from existing.tracking_type)
    or (entry ? 'load_mode' and entry->>'load_mode' is distinct from existing.load_mode)
    or (entry ? 'load_convention' and (jsonb_typeof(entry->'load_convention') is distinct from 'string'
      or btrim(entry->>'load_convention')='' or btrim(entry->>'load_convention') is distinct from existing.load_convention)) then
    raise exception 'existing exercise logging semantics differ' using errcode='23514';
  end if;
  insert into grind_private.exercise_source_links(source_key,source_exercise_id,exercise_id,review_state,rationale)
   values(release_row.source_key,source_id,chosen,'approved',entry->>'rationale')
   on conflict(source_key,source_exercise_id) do nothing;
  if not exists(select 1 from grind_private.exercise_source_links l where l.source_key=release_row.source_key and l.source_exercise_id=source_id and l.exercise_id=chosen and l.review_state='approved') then
    raise exception 'source mapping requires review' using errcode='23514';
  end if;
  update grind_private.exercise_source_records set exercise_id=chosen where release_id=p_release and source_exercise_id=source_id;
  processed := processed+1;
 end loop;
 return processed;
end $$;
-- App-facing projection exposes only approved RepDB identity, without private records.
create function grind.catalog_with_sources(p_after_name text default null,p_after_id uuid default null,p_limit integer default 100)
returns table(id uuid,origin text,owner_id uuid,name text,primary_muscle text,equipment text,category text,
 load_convention text,load_mode text,tracking_type text,archived_at timestamptz,created_at timestamptz,
 source_key text,source_exercise_id text) language plpgsql stable security definer set search_path='' as $$
declare caller uuid:=grind_private.member(); begin
 if p_limit is null or p_limit not between 1 and 100 or (p_after_name is null)<>(p_after_id is null)
  or length(coalesce(p_after_name,''))>80 then raise exception 'VALIDATION: invalid catalog cursor/limit' using errcode='23514'; end if;
 return query select e.id,e.origin,e.owner_id,e.name,e.primary_muscle,e.equipment,e.category,e.load_convention,e.load_mode,e.tracking_type,e.archived_at,e.created_at,m.source_key,m.source_exercise_id
 from grind.exercises e
 left join lateral (
  select min(l.source_key) as source_key,min(l.source_exercise_id) as source_exercise_id
  from grind_private.exercise_source_links l join grind_private.catalog_sources cs on cs.source_key=l.source_key
  where l.exercise_id=e.id and l.source_key='repdb' and l.review_state='approved' and cs.approval_state='approved'
  having count(*)=1
 ) m on e.owner_id is null
 where e.archived_at is null and (e.owner_id is null or e.owner_id=caller)
  and (p_after_name is null or (lower(e.name),e.id)>(lower(p_after_name),p_after_id))
 order by lower(e.name),e.id limit p_limit;
end $$;
revoke all on function grind.catalog_with_sources(text,uuid,integer) from public,anon,authenticated;
grant execute on function grind.catalog_with_sources(text,uuid,integer) to authenticated;

revoke all on function grind_private.tracking_type(text), grind_private.distance_km(text,text), grind_private.measurements(jsonb,text), grind_private.set_complete(text,text,integer,text,integer,text,text) from public,anon,authenticated,service_role;
commit;
