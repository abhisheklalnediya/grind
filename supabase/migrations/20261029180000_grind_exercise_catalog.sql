-- Local catalog groundwork. Publication and media delivery require separate reviewed work.
begin;
create table grind_private.catalog_sources (
 source_key text primary key, repository_url text not null, license_name text not null,
 attribution text not null, approval_state text not null default 'pending'
 check (approval_state in ('pending','approved','rejected'))
);
create table grind_private.catalog_releases (
 id uuid primary key default gen_random_uuid(), source_key text not null references grind_private.catalog_sources,
 revision text not null check (revision ~ '^[0-9a-f]{40}$'), manifest_hash text not null check (manifest_hash ~ '^[0-9a-f]{64}$'),
 schema_version text not null, importer_version text not null, mapping_version text not null,
 state text not null default 'staged' check (state in ('staged','approved','active','retired')),
 record_count integer not null check (record_count >= 0), created_at timestamptz not null default now(),
 unique(source_key,revision)
);
create unique index catalog_one_active_release on grind_private.catalog_releases(source_key) where state='active';
create table grind_private.exercise_source_links (
 source_key text not null references grind_private.catalog_sources, source_exercise_id text not null,
 exercise_id uuid not null references grind.exercises(id), review_state text not null default 'pending'
 check (review_state in ('pending','approved','rejected')), rationale text,
 primary key(source_key,source_exercise_id)
);
create table grind_private.exercise_source_records (
 release_id uuid not null references grind_private.catalog_releases, source_exercise_id text not null,
 exercise_id uuid references grind.exercises(id), record_hash text not null check (record_hash ~ '^[0-9a-f]{64}$'),
 raw_payload jsonb not null, rights_state text not null default 'pending' check (rights_state in ('pending','approved','rejected')),
 primary key(release_id,source_exercise_id)
);
create table grind_private.catalog_import_runs (
 id uuid primary key default gen_random_uuid(), release_id uuid not null references grind_private.catalog_releases,
 idempotency_key uuid not null unique, state text not null default 'staged' check (state in ('staged','uploaded','published','failed')),
 report_hash text, created_at timestamptz not null default now()
);
revoke all on all tables in schema grind_private from public, anon, authenticated;

-- Invoker security deliberately relies on existing exercise RLS and grants.
create function grind.search_catalog(
 p_query text default '', p_muscle text default null, p_equipment text default null,
 p_after_name text default null, p_after_id uuid default null, p_limit integer default 30,
 p_custom boolean default false
) returns setof grind.exercises language plpgsql stable security invoker set search_path = '' as $$
begin
 if auth.uid() is null or not exists(select 1 from grind.app_accounts where user_id=auth.uid()) then
   raise exception 'FORBIDDEN: Grind membership required' using errcode='42501';
 end if;
 if p_query is null or length(p_query)>200 or p_limit is null or p_limit not between 1 and 50
    or (p_after_name is null) <> (p_after_id is null)
    or length(coalesce(p_muscle,''))>100 or length(coalesce(p_equipment,''))>100
    or p_custom is null
    or length(coalesce(p_after_name,''))>80 then
   raise exception 'VALIDATION: invalid catalog search' using errcode='23514';
 end if;
 return query select e.* from grind.exercises e
 where e.archived_at is null
   and (p_query='' or position(lower(btrim(p_query)) in lower(e.name))>0)
   and (p_muscle is null or position(lower(btrim(p_muscle)) in lower(e.primary_muscle))>0)
   and (p_equipment is null or position(lower(btrim(p_equipment)) in lower(e.equipment))>0)
   and (not p_custom or e.owner_id=auth.uid())
   and (p_after_name is null or (lower(e.name),e.id) > (lower(p_after_name),p_after_id))
 order by lower(e.name),e.id limit p_limit;
end $$;
revoke all on function grind.search_catalog(text,text,text,text,uuid,integer,boolean) from public,anon,authenticated;
grant execute on function grind.search_catalog(text,text,text,text,uuid,integer,boolean) to authenticated;
commit;
