-- Catalog definitions can exist before their workout logging semantics are reviewed.
-- Existing workout and routine snapshots remain fully configured and immutable.
begin;
alter table grind.exercises
 add column is_configured boolean not null default true,
 alter column load_mode drop not null,
 alter column load_convention drop not null,
 alter column tracking_type drop not null;
alter table grind.exercises add constraint grind_exercise_configuration_complete check (
 (is_configured and load_mode is not null and load_convention is not null and tracking_type is not null)
 or (not is_configured and origin='provider' and owner_id is null and load_mode is null and load_convention is null and tracking_type is null)
);

-- Prevent accidental invalidation of existing routine/workout references or Previous.
-- A reviewed future migration must explicitly handle any intentional downgrade.
create function grind_private.prevent_configuration_downgrade() returns trigger language plpgsql set search_path='' as $$
begin
 if old.is_configured and not new.is_configured then
  raise exception 'VALIDATION: configured exercise cannot be downgraded' using errcode='23514';
 end if;
 return new;
end $$;
create trigger grind_exercise_no_configuration_downgrade before update of is_configured on grind.exercises
 for each row execute function grind_private.prevent_configuration_downgrade();
revoke all on function grind_private.prevent_configuration_downgrade() from public,anon,authenticated,service_role;

-- New exercise selections require reviewed semantics; historical reference lookups
-- and saved routine snapshots remain readable when allow_archived is true.
create or replace function grind_private.catalog(id uuid, allow_archived boolean default false) returns grind.exercises language plpgsql stable set search_path='' as $$
declare e grind.exercises; caller uuid:=grind_private.member(); begin
 select * into e from grind.exercises x where x.id=catalog.id and (x.owner_id is null or x.owner_id=caller) and (allow_archived or x.archived_at is null);
 if not found then raise exception 'FORBIDDEN: exercise unavailable' using errcode='42501'; end if;
 if not allow_archived and not e.is_configured then
  raise exception 'VALIDATION: exercise logging configuration unavailable' using errcode='23514';
 end if;
 return e;
end $$;

-- Replace only the app projection signature to expose catalog readiness.
drop function grind.catalog_with_sources(text,uuid,integer);
create function grind.catalog_with_sources(p_after_name text default null,p_after_id uuid default null,p_limit integer default 100)
returns table(id uuid,origin text,owner_id uuid,name text,primary_muscle text,equipment text,category text,
 load_convention text,load_mode text,tracking_type text,archived_at timestamptz,created_at timestamptz,
 source_key text,source_exercise_id text,is_configured boolean) language plpgsql stable security definer set search_path='' as $$
declare caller uuid:=grind_private.member(); begin
 if p_limit is null or p_limit not between 1 and 100 or (p_after_name is null)<>(p_after_id is null)
  or length(coalesce(p_after_name,''))>80 then raise exception 'VALIDATION: invalid catalog cursor/limit' using errcode='23514'; end if;
 return query select e.id,e.origin,e.owner_id,e.name,e.primary_muscle,e.equipment,e.category,e.load_convention,e.load_mode,e.tracking_type,e.archived_at,e.created_at,m.source_key,m.source_exercise_id,e.is_configured
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
commit;
