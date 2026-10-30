\set ON_ERROR_STOP on
begin;
insert into grind_private.catalog_sources(source_key,repository_url,license_name,attribution,approval_state) values ('fixture','https://example.invalid','fixture','fixture','approved');
insert into grind_private.catalog_releases(id,source_key,revision,manifest_hash,schema_version,importer_version,mapping_version,state,record_count)
 values ('93000000-0000-4000-8000-000000000001','fixture',repeat('a',40),repeat('b',64),'3','1','1','approved',3);
insert into grind_private.catalog_releases(id,source_key,revision_kind,revision,manifest_hash,schema_version,importer_version,mapping_version,state,record_count)
 values ('93000000-0000-4000-8000-000000000002','fixture','archive_sha256',repeat('f',64),repeat('b',64),'3','1','1','staged',0);
do $$ begin
 begin
  insert into grind_private.catalog_releases(source_key,revision_kind,revision,manifest_hash,schema_version,importer_version,mapping_version,record_count)
   values ('fixture','archive_sha256',repeat('a',40),repeat('b',64),'3','1','1',0);
  raise exception 'invalid archive hash accepted';
 exception when check_violation then null; end;
end $$;
insert into grind_private.exercise_source_records(release_id,source_exercise_id,record_hash,raw_payload,rights_state) values
 ('93000000-0000-4000-8000-000000000001','row',repeat('c',64),'{}','approved'),
 ('93000000-0000-4000-8000-000000000001','seed',repeat('d',64),'{}','approved'),
 ('93000000-0000-4000-8000-000000000001','unapproved',repeat('e',64),'{}','pending');
do $$ declare input jsonb; first_id uuid; begin
 input := '[{"source_id":"row","reviewed":true,"name":"Fixture row","primary_muscle":"Back","equipment":"Cable","category":"Strength","load_convention":"Stack display weight","load_mode":"external"},{"source_id":"seed","reviewed":true,"existing_id":"10000000-0000-4000-8000-000000000001"}]'::jsonb;
 if grind_private.import_reviewed_exercises('93000000-0000-4000-8000-000000000001',input) <> 2 then raise exception 'wrong count'; end if;
 select exercise_id into first_id from grind_private.exercise_source_links where source_key='fixture' and source_exercise_id='row';
 perform grind_private.import_reviewed_exercises('93000000-0000-4000-8000-000000000001',input);
 if first_id <> (select exercise_id from grind_private.exercise_source_links where source_key='fixture' and source_exercise_id='row') then raise exception 'unstable identity'; end if;
 if (select exercise_id from grind_private.exercise_source_links where source_key='fixture' and source_exercise_id='seed') <> '10000000-0000-4000-8000-000000000001' then raise exception 'seed identity changed'; end if;
 if (select name from grind.exercises where id='10000000-0000-4000-8000-000000000001') <> 'Barbell bench press' then raise exception 'seed overwritten'; end if;
 begin perform grind_private.import_reviewed_exercises('93000000-0000-4000-8000-000000000001','[{"source_id":"unapproved","reviewed":true}]'); raise exception 'unapproved accepted'; exception when check_violation then null; end;
 begin perform grind_private.import_reviewed_exercises('93000000-0000-4000-8000-000000000001','[{"source_id":"row","reviewed":true,"existing_id":"10000000-0000-4000-8000-000000000001"}]'); raise exception 'remapping accepted'; exception when check_violation then null; end;
end $$;
set local role authenticated;
do $$ begin
 begin perform grind_private.import_reviewed_exercises('93000000-0000-4000-8000-000000000001','[]'); raise exception 'authenticated import allowed'; exception when insufficient_privilege then null; end;
end $$;
rollback;
select 'PASS: reviewed import, stable IDs, seed preservation and permissions';
