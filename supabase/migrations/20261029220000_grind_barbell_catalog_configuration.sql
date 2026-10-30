-- Enable the RepDB barbell and Smith machine rows for weight-and-rep logging.
-- Keep their conventions separate so Previous never compares unlike equipment.
begin;
create function grind_private.configure_barbell_catalog()
returns integer language plpgsql security invoker set search_path = '' as $$
declare changed integer;
begin
 update grind.exercises e
 set is_configured=true,
     load_mode='external',
     load_convention=case e.equipment
       when 'Barbell' then 'Total barbell weight'
       when 'Smith Machine' then 'Smith machine displayed weight'
     end,
     tracking_type='reps'
 where e.origin='provider' and e.owner_id is null and e.archived_at is null
   and not e.is_configured and e.load_mode is null
   and e.load_convention is null and e.tracking_type is null
   and e.equipment in ('Barbell','Smith Machine')
   and exists (
     select 1
     from grind_private.exercise_source_links l
     join grind_private.catalog_sources s on s.source_key=l.source_key
     join grind_private.exercise_source_records r
       on r.source_exercise_id=l.source_exercise_id
     join grind_private.catalog_releases cr on cr.id=r.release_id
     where l.exercise_id=e.id and l.source_key='repdb'
       and l.review_state='approved' and s.approval_state='approved'
       and r.rights_state='approved' and cr.source_key='repdb'
       and cr.state='active'
   );
 get diagnostics changed = row_count;
 return changed;
end $$;
revoke all on function grind_private.configure_barbell_catalog() from public,anon,authenticated,service_role;

-- Clean migration replays have no imported RepDB rows, so this is safely a no-op
-- there. The guarded local catalog receives the same reviewed rule on rollout.
select grind_private.configure_barbell_catalog();
commit;
