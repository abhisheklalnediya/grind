#!/usr/bin/env python3
"""Stage a RepDB archive as pending records in the guarded local database only."""
import argparse
import hashlib
import json
from pathlib import Path
import re
import sys
import zipfile

from inspect_archive import inspect_archive
from review_import import canonical
from import_reviewed import apply, sql_json


def stage_payload(archive):
    manifest = inspect_archive(archive)
    with zipfile.ZipFile(archive) as source:
        data = json.loads(source.read('free.en.json'))
    if hashlib.sha256(Path(archive).read_bytes()).hexdigest() != manifest['archive_sha256']:
        raise ValueError('Archive changed during validation')
    records = [{'source_id': row['id'], 'record_hash': hashlib.sha256(canonical(row)).hexdigest(),
                'raw_payload': row} for row in data['exercises']]
    return manifest['archive_sha256'], records


def make_stage_sql(archive_hash, records):
    if not re.fullmatch(r'[0-9a-f]{64}', archive_hash):
        raise ValueError('Invalid archive hash')
    ids = [row.get('source_id') for row in records]
    if not records or len(ids) != len(set(ids)):
        raise ValueError('Missing or duplicate source records')
    payload = sql_json(records)
    return f'''begin;
-- Serialize against other importers; source catalog remains unchanged.
lock table grind_private.catalog_sources, grind_private.catalog_releases,
 grind_private.exercise_source_records in share row exclusive mode;
insert into grind_private.catalog_sources(source_key,repository_url,license_name,attribution,approval_state)
values('repdb','https://github.com/RepDB/exercise-dataset','RepDB Free','Exercise data by RepDB (repdb.co)','pending')
on conflict(source_key) do nothing;
do $stage$ declare v_release_id uuid; records jsonb := {payload}; row jsonb; begin
 if not exists(select 1 from grind_private.catalog_sources where source_key='repdb'
   and repository_url='https://github.com/RepDB/exercise-dataset' and license_name='RepDB Free'
   and approval_state <> 'rejected') then raise exception 'Source mismatch or rejected'; end if;
 insert into grind_private.catalog_releases(source_key,revision,revision_kind,manifest_hash,schema_version,importer_version,mapping_version,state,record_count)
 values('repdb','{archive_hash}','archive_sha256','{archive_hash}','3','local-stage-1','pending','staged',{len(records)})
 on conflict(source_key,revision) do nothing;
 select id into v_release_id from grind_private.catalog_releases where source_key='repdb' and revision='{archive_hash}'
  and revision_kind='archive_sha256' and manifest_hash='{archive_hash}' and schema_version='3'
  and state='staged' and record_count={len(records)};
 if v_release_id is null then raise exception 'Release mismatch or not staged'; end if;
 for row in select * from jsonb_array_elements(records) loop
  insert into grind_private.exercise_source_records(release_id,source_exercise_id,record_hash,raw_payload,rights_state)
  values(v_release_id,row->>'source_id',row->>'record_hash',row->'raw_payload','pending') on conflict do nothing;
  if not exists(select 1 from grind_private.exercise_source_records r where r.release_id=v_release_id
    and r.source_exercise_id=row->>'source_id' and r.record_hash=row->>'record_hash' and r.raw_payload=row->'raw_payload'
    and r.rights_state='pending' and r.exercise_id is null) then raise exception 'Existing staged record mismatch'; end if;
 end loop;
 if (select count(*) from grind_private.exercise_source_records r where r.release_id=v_release_id) <> {len(records)} then
  raise exception 'Unexpected staged record count'; end if;
end $stage$;
commit;'''


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('archive', type=Path)
    parser.add_argument('--apply', action='store_true', help='Stage in the guarded disposable local database')
    args = parser.parse_args()
    try:
        archive_hash, records = stage_payload(args.archive)
        sql = make_stage_sql(archive_hash, records)
        if args.apply:
            apply(sql)
            print(f'Staged {len(records)} pending records in the guarded disposable database.')
        else:
            print(f'Validated {len(records)} records; dry run only. SHA-256 {archive_hash}')
    except (OSError, ValueError, KeyError, zipfile.BadZipFile, json.JSONDecodeError) as exc:
        print(f'Staging failed: {exc}', file=sys.stderr)
        return 1
    return 0


if __name__ == '__main__':
    sys.exit(main())
