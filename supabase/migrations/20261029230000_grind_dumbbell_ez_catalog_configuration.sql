-- Enable reviewed RepDB dumbbell and EZ-bar rows for weight-and-rep logging.
-- The two conventions remain distinct from barbell and Smith-machine loads.
begin;
create function grind_private.configure_dumbbell_ez_bar_catalog()
returns integer language plpgsql security invoker set search_path = '' as $$
declare changed integer;
begin
 update grind.exercises e
 set is_configured=true,
     load_mode='external',
     load_convention=case e.equipment
       when 'Dumbbell' then 'Weight per dumbbell'
       when 'EZ Curl Bar' then 'Total EZ-bar weight'
     end,
     tracking_type='reps'
 where e.origin='provider' and e.owner_id is null and e.archived_at is null
   and not e.is_configured and e.load_mode is null
   and e.load_convention is null and e.tracking_type is null
   and e.equipment in ('Dumbbell','EZ Curl Bar')
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
revoke all on function grind_private.configure_dumbbell_ez_bar_catalog() from public,anon,authenticated,service_role;

-- Catalog imports may be absent on clean replay; rollout is idempotent.
select grind_private.configure_dumbbell_ez_bar_catalog();
commit;
