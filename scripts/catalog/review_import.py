#!/usr/bin/env python3
"""Prepare a RepDB review sheet; inspect only, never approves or imports data."""
import argparse
import collections
import hashlib
import json
from pathlib import Path
import sys
import zipfile

from inspect_archive import inspect_archive

# The fixed foundation IDs are suggestions; a reviewer must confirm every mapping.
SEED_MATCHES = {
    'bench-press': '10000000-0000-4000-8000-000000000001',
    'cable-lateral-raise': '10000000-0000-4000-8000-000000000004',
    'incline-db-press': '10000000-0000-4000-8000-000000000006',
    'pull-up': '10000000-0000-4000-8000-000000000007',
}


def canonical(row):
    return json.dumps(row, sort_keys=True, separators=(',', ':'), ensure_ascii=False).encode()


def proposal(row):
    """Return suggestions with reasons: neither the source nor these heuristics are approval."""
    category, force = row.get('category'), row.get('force_type')
    equipment = row.get('equipment')
    reasons = []
    if category == 'cardio':
        tracking = 'distance_duration' if equipment in ('treadmill', 'bicycle', 'stationary_bike', 'rowing_machine') else None
        reasons.append('Cardio measurement depends on the exercise and equipment')
    elif category == 'stretching' or force == 'static':
        tracking = 'duration'
        reasons.append('Static/stretching duration is a suggestion; verify movement')
    elif category in ('strength', 'olympic', 'plyometrics', 'strongman'):
        tracking = 'reps'
        reasons.append('Repetition tracking is a suggestion; inspect holds and carries')
    else:
        tracking = None
        reasons.append('Unknown tracking type')
    if row.get('is_bodyweight') is True:
        mode, convention = 'bodyweight', 'Bodyweight / reps only'
        reasons.append('Verify equipment and whether added load or assistance is typical')
    elif equipment == 'barbell':
        mode, convention = 'external', 'Total barbell weight'
    elif equipment == 'dumbbell':
        mode, convention = 'external', 'Weight per dumbbell'
    elif equipment == 'cable':
        mode, convention = 'external', 'Stack display weight'
    else:
        mode, convention = None, None
        reasons.append('Load mode and convention require review')
    if equipment is None:
        reasons.append('Source equipment is missing')
    if tracking != 'reps':
        reasons.append('Verify how timed/distance tracking interacts with load')
    return {'tracking_type': tracking, 'load_mode': mode, 'load_convention': convention,
            'existing_id': SEED_MATCHES.get(row['id']), 'reasons': reasons}


def build_sheet(archive):
    report = inspect_archive(archive)
    with zipfile.ZipFile(archive) as z:
        data = json.loads(z.read('free.en.json'))
    entries = []
    for row in data['exercises']:
        entries.append({'source_id': row['id'], 'record_hash': hashlib.sha256(canonical(row)).hexdigest(),
                        'name': row['name'], 'category': row.get('category'),
                        'equipment': row.get('equipment'), 'primary_muscles': row.get('primary_muscles', []),
                        'proposal': proposal(row), 'reviewed': False})
    return {'archive_sha256': report['archive_sha256'], 'schema_version': report['schema_version'],
            'record_count': len(entries), 'entries': entries}


def summary(sheet):
    entries = sheet['entries']
    return {'archive_sha256': sheet['archive_sha256'], 'records': len(entries),
            'tracking_proposals': dict(sorted(collections.Counter(str(e['proposal']['tracking_type']) for e in entries).items())),
            'load_proposals': dict(sorted(collections.Counter(str(e['proposal']['load_mode']) for e in entries).items())),
            'missing_equipment': sum(e['equipment'] is None for e in entries),
            'proposed_seed_matches': {e['source_id']: e['proposal']['existing_id'] for e in entries if e['proposal']['existing_id']},
            'approved': sum(e['reviewed'] is True for e in entries)}


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('archive')
    parser.add_argument('--output', type=Path, required=True, help='Path for the review sheet')
    args = parser.parse_args()
    try:
        sheet = build_sheet(args.archive)
        with args.output.open('x', encoding='utf-8') as output:
            json.dump(sheet, output, ensure_ascii=False, indent=2)
            output.write('\n')
        print(json.dumps(summary(sheet), indent=2))
    except (OSError, ValueError, KeyError, zipfile.BadZipFile) as exc:
        print(f'Review sheet generation failed: {exc}', file=sys.stderr)
        return 1
    return 0


if __name__ == '__main__':
    sys.exit(main())
