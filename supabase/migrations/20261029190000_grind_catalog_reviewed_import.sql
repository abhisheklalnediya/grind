-- Privileged reviewed-catalog loader; never callable by application roles.
begin;
create function grind_private.import_reviewed_exercises(p_release uuid, p_entries jsonb)
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
    if entry->>'load_mode' not in ('external','bodyweight','assisted','weighted_bodyweight') or
      coalesce(btrim(entry->>'name'),'')='' or coalesce(btrim(entry->>'primary_muscle'),'')='' or
      coalesce(btrim(entry->>'equipment'),'')='' or coalesce(btrim(entry->>'category'),'')='' or
      coalesce(btrim(entry->>'load_convention'),'')='' then
      raise exception 'reviewed exercise and logging semantics are required' using errcode='23514';
    end if;
    insert into grind.exercises(origin,name,primary_muscle,equipment,category,load_convention,load_mode)
     values('provider',btrim(entry->>'name'),btrim(entry->>'primary_muscle'),btrim(entry->>'equipment'),btrim(entry->>'category'),btrim(entry->>'load_convention'),entry->>'load_mode') returning id into chosen;
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
revoke all on function grind_private.import_reviewed_exercises(uuid,jsonb) from public,anon,authenticated,service_role;
commit;
