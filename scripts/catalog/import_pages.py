#!/usr/bin/env python3
"""Import staged RepDB pages into the guarded local database; no logging defaults are inferred."""
import argparse
import hashlib
import json
from pathlib import Path
import re
import zipfile

from import_reviewed import apply, sql_json, SEEDS
from inspect_archive import inspect_archive
from review_import import canonical


def valid_label(value, limit, field):
    if not isinstance(value, str) or not value.strip() or len(value.strip()) > limit:
        raise ValueError(f'Invalid {field}')
    return value.strip()


def page_payload(archive):
    manifest = inspect_archive(archive)
    with zipfile.ZipFile(archive) as source:
        data = json.loads(source.read('free.en.json'))
    if hashlib.sha256(Path(archive).read_bytes()).hexdigest() != manifest['archive_sha256']:
        raise ValueError('Archive changed during validation')
    entries = []
    seen = set()
    for row in data['exercises']:
        source_id = valid_label(row.get('id'), 200, 'source identifier')
        if source_id in seen:
            raise ValueError('Duplicate source identifier')
        seen.add(source_id)
        muscles = row.get('primary_muscles')
        if not isinstance(muscles, list) or not muscles:
            raise ValueError(f'Missing primary muscle: {source_id}')
        try:
            muscle = data['muscles'][muscles[0]]['name']
            equipment = data['equipment'][row['equipment']]['name'] if row.get('equipment') else 'Unspecified'
            category = data['enum_labels']['category'][row['category']]
        except (KeyError, TypeError) as exc:
            raise ValueError(f'Unknown source taxonomy: {source_id}') from exc
        entries.append({'source_id': source_id, 'record_hash': hashlib.sha256(canonical(row)).hexdigest(),
                        'raw_payload': row, 'name': valid_label(row.get('name'), 80, 'name'),
                        'primary_muscle': valid_label(muscle, 40, 'muscle'),
                        'equipment': valid_label(equipment, 40, 'equipment'),
                        'category': valid_label(category, 40, 'category')})
    if len(entries) != 701 or 'bench-press' not in seen:
        raise ValueError('The supplied release must contain 701 records and bench-press')
    return manifest['archive_sha256'], entries


def make_page_sql(archive_hash, entries):
    if not re.fullmatch(r'[0-9a-f]{64}', archive_hash):
        raise ValueError('Invalid archive hash')
    ids = [entry.get('source_id') for entry in entries]
    if len(entries) != 701 or len(set(ids)) != 701 or 'bench-press' not in ids:
        raise ValueError('Expected unique 701-page release')
    payload = sql_json(entries)
    bench = SEEDS[0]
    retired = ','.join(f"'{seed}'::uuid" for seed in SEEDS[1:])
    return f'''begin;
lock table grind.exercises, grind_private.catalog_sources, grind_private.catalog_releases,
 grind_private.exercise_source_records, grind_private.exercise_source_links in share row exclusive mode;
do $pages$
declare v_release_id uuid; v_state text; v_entry jsonb; v_chosen uuid; v_items jsonb := {payload};
begin
 if not exists(select 1 from grind_private.catalog_sources where source_key='repdb'
   and repository_url='https://github.com/RepDB/exercise-dataset' and license_name='RepDB Free'
   and approval_state in ('pending','approved')) then raise exception 'Source mismatch or rejected'; end if;
 select id,state into v_release_id,v_state from grind_private.catalog_releases where source_key='repdb'
  and revision='{archive_hash}' and revision_kind='archive_sha256' and manifest_hash='{archive_hash}'
  and schema_version='3' and state in ('staged','active') and record_count=701;
 if v_release_id is null then raise exception 'Exact staged or active release required'; end if;
 if v_state='staged' and exists(select 1 from grind_private.catalog_releases where source_key='repdb' and state='active') then
  raise exception 'Active release update requires reviewed reconciliation'; end if;
 if (select count(*) from grind_private.exercise_source_records r where r.release_id=v_release_id) <> 701 then
  raise exception 'Staged record count mismatch'; end if;
 if not exists(select 1 from grind.exercises where id='{bench}'::uuid and owner_id is null and origin='grind'
   and lower(name)='barbell bench press' and archived_at is null and is_configured
   and load_mode='external' and load_convention='Total barbell weight' and tracking_type='reps') then
  raise exception 'Referenced bench identity is not the expected seed'; end if;
 for v_entry in select * from jsonb_array_elements(v_items) loop
  if not exists(select 1 from grind_private.exercise_source_records r where r.release_id=v_release_id
   and r.source_exercise_id=v_entry->>'source_id' and r.record_hash=v_entry->>'record_hash'
   and r.raw_payload=v_entry->'raw_payload' and ((v_state='staged' and r.rights_state='pending' and r.exercise_id is null)
    or (v_state='active' and r.rights_state='approved' and r.exercise_id is not null))) then
   raise exception 'Staged record mismatch'; end if;
 end loop;
 if v_state='staged' and exists(select 1 from grind_private.exercise_source_links where source_key='repdb') then
  raise exception 'Unexpected source links before first import'; end if;
 if v_state='staged' then
  update grind_private.catalog_sources set approval_state='approved' where source_key='repdb';
  update grind_private.exercise_source_records set rights_state='approved' where release_id=v_release_id;
  update grind_private.catalog_releases set state='approved' where id=v_release_id;
 end if;
 for v_entry in select * from jsonb_array_elements(v_items) loop
  if v_state='active' then
   select exercise_id into v_chosen from grind_private.exercise_source_links where source_key='repdb'
    and source_exercise_id=v_entry->>'source_id' and review_state='approved';
   if v_chosen is null or not exists(select 1 from grind_private.exercise_source_records r
     where r.release_id=v_release_id and r.source_exercise_id=v_entry->>'source_id' and r.exercise_id=v_chosen) then
    raise exception 'Published identity mismatch'; end if;
   if v_entry->>'source_id'='bench-press' and v_chosen<>'{bench}'::uuid then raise exception 'Bench identity changed'; end if;
  else
   if v_entry->>'source_id'='bench-press' then v_chosen := '{bench}'::uuid;
   else
    insert into grind.exercises(origin,owner_id,name,primary_muscle,equipment,category,
      load_convention,load_mode,tracking_type,is_configured)
    values('provider',null,v_entry->>'name',v_entry->>'primary_muscle',v_entry->>'equipment',v_entry->>'category',null,null,null,false)
    returning id into v_chosen;
   end if;
   insert into grind_private.exercise_source_links(source_key,source_exercise_id,exercise_id,review_state,rationale)
    values('repdb',v_entry->>'source_id',v_chosen,'approved','Local source identity; logging configuration pending');
   update grind_private.exercise_source_records set exercise_id=v_chosen
    where release_id=v_release_id and source_exercise_id=v_entry->>'source_id';
  end if;
 end loop;
 if (select count(*) from grind_private.exercise_source_links where source_key='repdb' and review_state='approved')<>701
  or exists(select 1 from grind_private.exercise_source_links where source_key='repdb' group by exercise_id having count(*)>1) then
  raise exception 'Catalog links are incomplete or duplicated'; end if;
 update grind.exercises set archived_at=coalesce(archived_at,now())
  where id in ({retired}) and origin='grind' and owner_id is null;
 if v_state='staged' then update grind_private.catalog_releases set state='active' where id=v_release_id and state='approved'; end if;
end $pages$;
commit;'''


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('archive', type=Path)
    parser.add_argument('--apply', action='store_true', help='Import only to the guarded disposable local database')
    args = parser.parse_args()
    try:
        archive_hash, entries = page_payload(args.archive)
        sql = make_page_sql(archive_hash, entries)
        if args.apply:
            apply(sql)
            print(f'Imported {len(entries)} local catalog pages; logging configuration remains pending.')
        else:
            print(f'Validated {len(entries)} pages; dry run only. SHA-256 {archive_hash}')
    except (OSError, ValueError, KeyError, zipfile.BadZipFile, json.JSONDecodeError) as exc:
        print(f'Page import failed: {exc}')
        return 1
    return 0


if __name__ == '__main__':
    raise SystemExit(main())
