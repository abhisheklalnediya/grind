#!/usr/bin/env python3
"""Publish the pinned RepDB catalog to GRIND's authenticated hosted app schema.

Dry-run by default. The only write mode targets the exact GRIND project link.
The source archive and generated SQL are kept out of the repository.
"""
import argparse
import json
import os
from pathlib import Path
import re
import subprocess
import sys
import tempfile

import import_pages
import inspect_archive
import stage_archive

ROOT = Path(__file__).resolve().parents[2]
PROJECT_REF = 'mgyzzipsqmsabptrfchw'
PINNED_ARCHIVE_SHA256 = 'afa162bf10bb23cadd9c3588be6ab84e56691fa328abcefabb4371cdeb47cb16'
MIGRATION_RE = re.compile(r'^\s*(\d{14})\s*\|\s*(\d{14})\s*\|', re.MULTILINE)
CONFIGURE_SQL = '''begin;
select grind_private.configure_barbell_catalog();
select grind_private.configure_dumbbell_ez_bar_catalog();
commit;'''
PREFLIGHT_COUNTS_SQL = '''select
 (select count(*) from grind.exercises where owner_id is null and archived_at is null) as active_global,
 (select count(*) from grind.exercises where owner_id is null and archived_at is null and is_configured) as configured_global,
 (select count(*) from grind.exercises where owner_id is null and archived_at is null and origin='provider') as active_provider,
 (select count(*) from grind_private.exercise_source_records) as source_records,
 (select count(*) from grind_private.exercise_source_links where source_key='repdb') as source_links,
 (select count(*) from grind_private.catalog_releases where source_key='repdb') as repdb_releases,
 (select count(*) from grind_private.catalog_releases where source_key='repdb' and revision=%(archive_hash)s and state='staged') as matching_staged_releases,
 (select count(*) from grind_private.catalog_releases where source_key='repdb' and revision=%(archive_hash)s and state='active') as matching_active_releases,
 (select count(*) from grind_private.exercise_source_records r join grind_private.catalog_releases cr on cr.id=r.release_id where cr.source_key='repdb' and cr.revision=%(archive_hash)s) as matching_records,
 (select count(*) from grind_private.exercise_source_records r join grind_private.catalog_releases cr on cr.id=r.release_id where cr.source_key='repdb' and cr.revision=%(archive_hash)s and r.rights_state='pending') as matching_pending_records,
 (select count(*) from grind_private.exercise_source_records r join grind_private.catalog_releases cr on cr.id=r.release_id where cr.source_key='repdb' and cr.revision=%(archive_hash)s and r.rights_state='approved') as matching_approved_records,
 (select count(*) from grind_private.exercise_source_links where source_key='repdb' and review_state='approved') as approved_links;'''
FINAL_COUNTS_SQL = '''select
 (select count(*) from grind.exercises where owner_id is null and archived_at is null) as active_global,
 (select count(*) from grind.exercises where owner_id is null and archived_at is null and is_configured) as configured_global,
 (select count(*) from grind.exercises where owner_id is null and archived_at is null and origin='provider') as active_provider,
 (select count(*) from grind.exercises where owner_id is null and archived_at is null and origin='provider' and is_configured) as configured_provider,
 (select count(*) from grind.exercises where owner_id is null and archived_at is null and origin='provider' and not is_configured) as unconfigured_provider,
 (select count(*) from grind_private.exercise_source_records) as source_records,
 (select count(*) from grind_private.exercise_source_links where source_key='repdb' and review_state='approved') as approved_links,
 (select count(*) from grind_private.catalog_releases where source_key='repdb' and state='active') as active_releases,
 (select count(*) from grind.exercises where owner_id is null and archived_at is null and is_configured and equipment='Barbell') as barbell,
 (select count(*) from grind.exercises where owner_id is null and archived_at is null and is_configured and equipment='Smith Machine') as smith_machine,
 (select count(*) from grind.exercises where owner_id is null and archived_at is null and is_configured and equipment='Dumbbell') as dumbbell,
 (select count(*) from grind.exercises where owner_id is null and archived_at is null and is_configured and equipment='EZ Curl Bar') as ez_curl_bar,
 (select count(*) from grind.exercises where owner_id is null and archived_at is null and is_configured and equipment not in ('Barbell','Smith Machine','Dumbbell','EZ Curl Bar')) as other_configured;'''


def project_ref() -> str:
    path = ROOT / 'supabase' / '.temp' / 'project-ref'
    try:
        return path.read_text().strip()
    except OSError as exc:
        raise ValueError('GRIND linked project reference is unavailable') from exc


def release_statements(archive: Path) -> tuple[dict, list[str]]:
    manifest = inspect_archive.inspect_archive(archive)
    if manifest['archive_sha256'] != PINNED_ARCHIVE_SHA256:
        raise ValueError('Archive SHA-256 is not the approved GRIND release')
    archive_hash, records = stage_archive.stage_payload(archive)
    page_hash, entries = import_pages.page_payload(archive)
    if archive_hash != page_hash or manifest['archive_sha256'] != archive_hash:
        raise ValueError('Archive hash changed while preparing the release')
    if manifest['record_count'] != 701 or manifest['schema_version'] != 3:
        raise ValueError('Expected the reviewed 701-record RepDB schema-v3 archive')
    if len(records) != 701 or len(entries) != 701:
        raise ValueError('Catalog release must contain exactly 701 records')
    return manifest, [stage_archive.make_stage_sql(archive_hash, records),
                      import_pages.make_page_sql(archive_hash, entries), CONFIGURE_SQL]


def migration_history_matches() -> bool:
    result = subprocess.run(['supabase', 'migration', 'list', '--linked'], cwd=ROOT,
                            capture_output=True, text=True, check=False, timeout=120)
    if result.returncode:
        raise RuntimeError('Could not read linked migration history; no hosted writes performed')
    rows = MIGRATION_RE.findall(result.stdout)
    local_versions = sorted(path.name[:14] for path in (ROOT / 'supabase' / 'migrations').glob('*.sql'))
    return [local for local, remote in rows if local == remote] == local_versions and len(rows) == len(local_versions)


def query_json(sql: str) -> dict:
    result = subprocess.run(['supabase', 'db', 'query', '--linked', '--output', 'json', sql], cwd=ROOT,
                            capture_output=True, text=True, check=False, timeout=120)
    if result.returncode:
        raise RuntimeError('Linked GRIND read-only preflight failed; no hosted writes performed')
    try:
        output = json.loads(result.stdout)
        return output['rows'][0]
    except (json.JSONDecodeError, KeyError, IndexError, TypeError) as exc:
        raise RuntimeError('Linked GRIND query returned an unexpected result; no hosted writes performed') from exc


def release_state_is_safe(state: dict) -> bool:
    common = state['repdb_releases'] == 0 or state['repdb_releases'] == 1
    if not common:
        return False
    fresh = (state['active_global'] == 7 and state['configured_global'] == 7
             and state['active_provider'] == 0 and state['source_records'] == 0
             and state['source_links'] == 0 and state['repdb_releases'] == 0)
    staged = (state['active_global'] == 7 and state['configured_global'] == 7
              and state['active_provider'] == 0 and state['source_records'] == 701
              and state['source_links'] == 0 and state['repdb_releases'] == 1
              and state['matching_staged_releases'] == 1 and state['matching_records'] == 701
              and state['matching_pending_records'] == 701)
    imported = (state['active_global'] == 701 and state['active_provider'] == 700
                and state['source_records'] == 701 and state['source_links'] == 701
                and state['repdb_releases'] == 1 and state['matching_active_releases'] == 1
                and state['matching_records'] == 701 and state['matching_approved_records'] == 701
                and state['approved_links'] == 701 and state['configured_global'] in (1, 204))
    return fresh or staged or imported


def final_counts_are_expected(counts: dict) -> bool:
    expected = {'active_global': 701, 'configured_global': 204, 'active_provider': 700,
                'configured_provider': 203, 'unconfigured_provider': 497,
                'source_records': 701, 'approved_links': 701, 'active_releases': 1,
                'barbell': 76, 'smith_machine': 19, 'dumbbell': 88,
                'ez_curl_bar': 21, 'other_configured': 0}
    return counts == expected


def run_file(sql: str, directory: Path, index: int) -> None:
    path = directory / f'release-{index}.sql'
    path.write_text(sql, encoding='utf-8')
    path.chmod(0o600)
    result = subprocess.run(['supabase', 'db', 'query', '--linked', '--file', str(path), '--output', 'json'],
                            cwd=ROOT, capture_output=True, text=True, check=False, timeout=300)
    if result.returncode:
        raise RuntimeError(f'Hosted release step {index} failed. Re-run after reviewing GRIND database state; SQL output was suppressed.')


def main() -> int:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('archive', type=Path)
    parser.add_argument('--apply-hosted', action='store_true', help='Explicitly publish to linked GRIND project')
    args = parser.parse_args()
    try:
        if project_ref() != PROJECT_REF:
            raise ValueError(f'Refusing: linked project is not GRIND ({PROJECT_REF})')
        manifest, statements = release_statements(args.archive)
        print(f"GRIND project {PROJECT_REF}; archive SHA-256 {manifest['archive_sha256']}; "
              f"schema {manifest['schema_version']}; {manifest['record_count']} exercises; {manifest['image_count']} images.")
        if not args.apply_hosted:
            print('Dry run only: no hosted requests or writes. Review migration history, then pass --apply-hosted to publish metadata and configure the approved equipment groups.')
            return 0
        if not migration_history_matches():
            raise RuntimeError('Linked migration history differs from local GRIND migrations; no hosted writes performed')
        dry_run = subprocess.run(['supabase', 'db', 'push', '--linked', '--dry-run'], cwd=ROOT,
                                  capture_output=True, text=True, check=False, timeout=180)
        if dry_run.returncode or 'up to date' not in dry_run.stdout.lower():
            raise RuntimeError('Linked migration dry run was not clean; no hosted writes performed')
        counts_sql = PREFLIGHT_COUNTS_SQL.replace('%(archive_hash)s', "'" + manifest['archive_sha256'] + "'")
        state = query_json(counts_sql)
        if not release_state_is_safe(state):
            raise RuntimeError('Hosted exercise state differs from the reviewed fresh/staged/imported release states; no hosted writes performed')
        with tempfile.TemporaryDirectory(prefix='grind-hosted-catalog-') as temporary:
            directory = Path(temporary)
            os.chmod(directory, 0o700)
            if state['repdb_releases'] == 0:
                run_file(statements[0], directory, 1)
            if state['matching_active_releases'] == 0:
                run_file(statements[1], directory, 2)
            run_file(statements[2], directory, 3)
        final_counts = query_json(FINAL_COUNTS_SQL)
        if not final_counts_are_expected(final_counts):
            raise RuntimeError('Hosted release completed but verification counts differ; inspect GRIND catalog before retrying')
        print('Hosted catalog release verified: 204 configured, 497 unconfigured; no other equipment enabled.')
        return 0
    except (OSError, ValueError, RuntimeError, subprocess.TimeoutExpired) as exc:
        print(f'Hosted catalog release stopped: {exc}', file=sys.stderr)
        return 1


if __name__ == '__main__':
    raise SystemExit(main())
