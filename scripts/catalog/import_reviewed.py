#!/usr/bin/env python3
"""Import a fully reviewed RepDB release into the guarded disposable database only."""
import argparse
import hashlib
import json
from pathlib import Path
import re
import sys
import uuid
import zipfile

from review_import import build_sheet, canonical

ROOT = Path(__file__).resolve().parents[2]
sys.path.insert(0, str(ROOT / 'scripts' / 'backend'))
import local  # noqa: E402

MODES = {'external', 'bodyweight', 'assisted', 'weighted_bodyweight'}
TRACKING = {'reps', 'duration', 'distance_duration'}
SEEDS = tuple(f'10000000-0000-4000-8000-{i:012d}' for i in range(1, 8))


def reviewed_entries(archive, review):
    fresh = build_sheet(archive)
    if review.get('archive_sha256') != fresh['archive_sha256'] or review.get('schema_version') != fresh['schema_version']:
        raise ValueError('Review does not match archive')
    if not isinstance(review.get('reviewer'), str) or not review['reviewer'].strip():
        raise ValueError('A reviewer is required')
    entries = review.get('entries')
    if not isinstance(entries, list) or len(entries) != len(fresh['entries']):
        raise ValueError('Review must cover every record')
    expected = {e['source_id']: e for e in fresh['entries']}
    seen, matched, result = set(), set(), []
    with zipfile.ZipFile(archive) as z:
        source = json.loads(z.read('free.en.json'))
    raw = {row['id']: row for row in source['exercises']}
    for entry in entries:
        if not isinstance(entry, dict):
            raise ValueError('Invalid review entry')
        source_id = entry.get('source_id')
        if source_id not in expected or source_id in seen or entry.get('record_hash') != expected[source_id]['record_hash']:
            raise ValueError('Unknown, duplicate or changed source record')
        seen.add(source_id)
        decision = entry.get('decision')
        if entry.get('reviewed') is not True or not isinstance(decision, dict):
            raise ValueError(f'Unreviewed entry: {source_id}')
        if decision.get('tracking_type') not in TRACKING or decision.get('load_mode') not in MODES:
            raise ValueError(f'Invalid tracking or load mode: {source_id}')
        for key, length in (('primary_muscle', 40), ('equipment', 40), ('category', 40), ('load_convention', 80)):
            value = decision.get(key)
            if not isinstance(value, str) or not value.strip() or len(value.strip()) > length:
                raise ValueError(f'Invalid {key}: {source_id}')
        name = raw[source_id]['name'].strip()
        if len(name) > 80:
            raise ValueError(f'Name exceeds database limit: {source_id}')
        existing = decision.get('existing_id')
        if existing is not None:
            try:
                existing = str(uuid.UUID(existing))
            except (ValueError, TypeError, AttributeError) as exc:
                raise ValueError(f'Invalid exercise UUID: {source_id}') from exc
            if existing in matched:
                raise ValueError('Two RepDB records map to the same exercise UUID')
            matched.add(existing)
        result.append({'source_id': source_id, 'reviewed': True, 'name': name,
                       'tracking_type': decision['tracking_type'], 'load_mode': decision['load_mode'],
                       'load_convention': decision['load_convention'].strip(),
                       'primary_muscle': decision['primary_muscle'].strip(), 'equipment': decision['equipment'].strip(),
                       'category': decision['category'].strip(), 'existing_id': existing,
                       'rationale': 'Reviewed local RepDB mapping', 'record_hash': entry['record_hash'],
                       'raw_payload': raw[source_id]})
    bench = next((item for item in result if item['source_id'] == 'bench-press'), None)
    if bench is not None and bench['existing_id'] != SEEDS[0]:
        raise ValueError('The referenced bench-press seed UUID must be preserved')
    return fresh['archive_sha256'], result


def sql_json(value):
    encoded = json.dumps(value, ensure_ascii=False, separators=(',', ':')).encode().hex()
    return f"convert_from(decode('{encoded}','hex'),'UTF8')::jsonb"


def make_sql(archive_hash, entries):
    # All user content is hex-encoded data, never interpolated as SQL syntax.
    if not re.fullmatch('[0-9a-f]{64}', archive_hash):
        raise ValueError('Invalid archive hash')
    payload = sql_json(entries)
    seed_ids = ','.join(f"'{seed}'::uuid" for seed in SEEDS)
    return f'''begin;
-- Lock both approval state and catalog writes while validating the entire release.
lock table grind.exercises, grind_private.catalog_sources, grind_private.catalog_releases,
 grind_private.exercise_source_records, grind_private.exercise_source_links in share row exclusive mode;
do $review$ declare v_release_id uuid; release_state text; entries jsonb := {payload}; row jsonb; n integer; begin
 if not exists(select 1 from grind_private.catalog_sources where source_key='repdb'
   and repository_url='https://github.com/RepDB/exercise-dataset' and license_name='RepDB Free'
   and approval_state in ('pending','approved')) then raise exception 'Source mismatch or rejected'; end if;
 select id,state into v_release_id,release_state from grind_private.catalog_releases
 where source_key='repdb' and revision='{archive_hash}' and revision_kind='archive_sha256'
 and manifest_hash='{archive_hash}' and schema_version='3' and state in ('staged','active') and record_count={len(entries)};
 if v_release_id is null then raise exception 'Exact staged or active release required'; end if;
 if release_state='staged' and exists(select 1 from grind_private.catalog_releases where source_key='repdb' and state='active') then
  raise exception 'Active RepDB release requires a reviewed update workflow'; end if;
 if (select count(*) from grind_private.exercise_source_records r where r.release_id=v_release_id) <> {len(entries)} then
  raise exception 'Staged record count mismatch'; end if;
 for row in select * from jsonb_array_elements(entries) loop
  if exists(select 1 from grind_private.exercise_source_links l join grind.exercises e on e.id=l.exercise_id
    where l.source_key='repdb' and l.source_exercise_id=row->>'source_id' and l.review_state='approved'
    and e.origin='provider' and (e.name is distinct from row->>'name'
      or e.primary_muscle is distinct from row->>'primary_muscle'
      or e.equipment is distinct from row->>'equipment' or e.category is distinct from row->>'category')) then
   raise exception 'Existing provider catalog fields differ from reviewed release'; end if;
  if not exists(select 1 from grind_private.exercise_source_records r where r.release_id=v_release_id
    and r.source_exercise_id=row->>'source_id' and r.record_hash=row->>'record_hash' and r.raw_payload=row->'raw_payload'
    and ((release_state='staged' and r.rights_state='pending' and r.exercise_id is null)
      or (release_state='active' and r.rights_state='approved' and r.exercise_id is not null))) then
   raise exception 'Staged record mismatch or rights state changed'; end if;
 end loop;
 if release_state='staged' then
  update grind_private.catalog_sources set approval_state='approved' where source_key='repdb';
  update grind_private.exercise_source_records set rights_state='approved' where release_id=v_release_id;
  update grind_private.catalog_releases set state='approved' where id=v_release_id;
 end if;
 n:=grind_private.import_reviewed_exercises(v_release_id,entries);
 if n <> {len(entries)} then raise exception 'Unexpected imported count'; end if;
 if exists(select 1 from grind_private.exercise_source_links where source_key='repdb' and review_state='approved'
   group by exercise_id having count(*) > 1) then raise exception 'Multiple source records mapped to one exercise'; end if;
 -- Preserve referenced IDs and snapshots; only retire unmatched foundation seeds.
 update grind.exercises e set archived_at=coalesce(e.archived_at,now()) where e.id in ({seed_ids}) and e.origin='grind'
 and not exists(select 1 from grind_private.exercise_source_links l where l.source_key='repdb' and l.exercise_id=e.id and l.review_state='approved');
 if release_state='staged' then
  update grind_private.catalog_releases set state='active' where id=v_release_id and state='approved';
 end if;
end $review$;
commit;'''



def apply(sql):
    local.target()  # Checks marked workdir, unlinked project, exact config and SQL manifests.
    command = ['docker', 'exec', '-i', f'supabase_db_{local.PROJECT}', 'psql', '-U', 'postgres', '-d', 'postgres', '-v', 'ON_ERROR_STOP=1']
    local.run(command, sql=sql)


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('archive')
    parser.add_argument('review', type=Path)
    parser.add_argument('--apply', action='store_true', help='Apply to the guarded disposable local database')
    args = parser.parse_args()
    try:
        review = json.loads(args.review.read_text())
        archive_hash, entries = reviewed_entries(args.archive, review)
        sql = make_sql(archive_hash, entries)
        if args.apply:
            apply(sql)
            print(f'Imported {len(entries)} reviewed records into the guarded disposable database.')
        else:
            print(f'Validated {len(entries)} reviewed records; dry run only.')
    except (OSError, ValueError, KeyError, zipfile.BadZipFile, json.JSONDecodeError) as exc:
        print(f'Import failed: {exc}', file=sys.stderr)
        return 1
    return 0


if __name__ == '__main__':
    sys.exit(main())
