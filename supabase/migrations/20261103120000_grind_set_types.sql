-- Expand the set classification vocabulary without changing persisted set rows.
-- Existing warmup/working values and command payloads remain valid.
begin;

alter table grind.routine_sets
  drop constraint if exists routine_sets_set_type_check,
  add constraint routine_sets_set_type_check
    check (set_type in ('warmup','working','drop','failure','rest_pause'));

alter table grind.workout_sets
  drop constraint if exists workout_sets_set_type_check,
  add constraint workout_sets_set_type_check
    check (set_type in ('warmup','working','drop','failure','rest_pause'));

create or replace function grind_private.set_values(value jsonb, mode text)
returns void language plpgsql immutable set search_path='' as $$
declare load text;
begin
 perform grind_private.keys(value,array['id','position','set_type','entered_load','entered_unit','reps','duration_seconds','entered_distance','distance_unit'],array['id','position','set_type','entered_load','entered_unit','reps']);
 perform grind_private.uuid_value(value->'id');
 perform grind_private.int_value(value->'position',0,99);
 if (value->>'set_type') is null or value->>'set_type' not in ('warmup','working','drop','failure','rest_pause') then
  raise exception 'VALIDATION: set type' using errcode='23514';
 end if;
 if value->'entered_load'<>'null'::jsonb then load:=grind_private.text_value(value->'entered_load',1,32); end if;
 perform grind_private.load_kg(load,value->>'entered_unit',mode);
 if value->'reps'<>'null'::jsonb then perform grind_private.int_value(value->'reps',1,10000); end if;
end $$;

-- Clients can negotiate newer set labels without assuming every backend has
-- applied this migration. The response is scoped to a completed GRIND member.
create or replace function grind.get_supported_set_types()
returns jsonb language plpgsql stable security definer set search_path='' as $$
begin
 if auth.uid() is null or not exists (
   select 1 from grind.app_accounts
   where user_id=auth.uid() and setup_completed_at is not null
 ) then
  raise exception 'FORBIDDEN: completed Grind setup required' using errcode='42501';
 end if;
 return jsonb_build_object('set_types',jsonb_build_array('warmup','working','drop','failure','rest_pause'));
end $$;
revoke all on function grind.get_supported_set_types() from public,anon,authenticated;
grant execute on function grind.get_supported_set_types() to authenticated;

commit;
