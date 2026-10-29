#!/usr/bin/env python3
"""Inspect an explicitly pinned RepDB Git snapshot; never fetch or publish it."""
import argparse
import hashlib
import json
import re
import subprocess
import sys
from datetime import datetime, timezone
from pathlib import PurePosixPath

SOURCE = 'https://github.com/RepDB/exercise-dataset'
VERSION = '1.0.0'


def git(repo, *args):
    try:
        return subprocess.run(['git', '-C', str(repo), *args], check=True, stdout=subprocess.PIPE,
                              stderr=subprocess.PIPE).stdout
    except subprocess.CalledProcessError as exc:
        raise ValueError('Git could not read the requested snapshot') from exc


def blob(repo, revision, name):
    path = PurePosixPath(name)
    if path.is_absolute() or '..' in path.parts or '\\' in name:
        raise ValueError(f'Unsafe path: {name}')
    entry = git(repo, 'ls-tree', revision, '--', name).decode().strip()
    if not entry or not entry.startswith('100644 blob ') or entry.split('\t', 1)[-1] != name:
        raise ValueError(f'Missing or unsafe file: {name}')
    return git(repo, 'show', f'{revision}:{name}')


def inspect(repo, revision):
    if not re.fullmatch(r'[0-9a-f]{40}', revision):
        raise ValueError('A full lowercase 40-character Git commit SHA is required')
    actual = git(repo, 'rev-parse', '--verify', revision + '^{commit}').decode().strip()
    if actual != revision:
        raise ValueError('Revision is not the requested commit')
    origin = git(repo, 'remote', 'get-url', 'origin').decode().strip().removesuffix('.git').rstrip('/')
    if origin not in (SOURCE, 'git@github.com:RepDB/exercise-dataset'):
        raise ValueError('Snapshot origin does not match the canonical RepDB repository')
    files = {}

    def read(name):
        data = blob(repo, revision, name)
        files[name] = {'sha256': hashlib.sha256(data).hexdigest(), 'bytes': len(data)}
        return data

    license_text = read('LICENSE-DATA.md').decode('utf-8')
    attribution_text = read('ATTRIBUTION.md').decode('utf-8')
    dataset = json.loads(read('exercises.json'))
    if dataset.get('schema_version') != 3 or not isinstance(dataset.get('exercises'), list):
        raise ValueError('Unsupported dataset schema')
    rows = dataset['exercises']
    if type(dataset.get('count')) is not int or dataset['count'] != len(rows):
        raise ValueError('Declared exercise count does not match records')
    ids = set()
    for row in rows:
        if not isinstance(row, dict):
            raise ValueError('Invalid exercise record')
        exercise_id = row.get('id')
        if not isinstance(exercise_id, str) or not re.fullmatch(r'[a-z0-9]+(?:-[a-z0-9]+)*', exercise_id) or exercise_id in ids:
            raise ValueError('Invalid or duplicate exercise ID')
        ids.add(exercise_id)
        if not isinstance(row.get('name_en'), str) or not row['name_en'].strip():
            raise ValueError(f'Missing English name: {exercise_id}')
        instructions = row.get('instructions_en')
        if not isinstance(instructions, list) or not instructions or not all(isinstance(v, str) and v.strip() for v in instructions):
            raise ValueError(f'Invalid English instructions: {exercise_id}')
        images = row.get('images')
        if not isinstance(images, dict):
            raise ValueError(f'Invalid images: {exercise_id}')
        flat = images.get('flat')
        if not isinstance(flat, dict) or set(flat) not in ({'main'}, {'start', 'peak'}):
            raise ValueError(f'Invalid flat images: {exercise_id}')
        for pose, name in flat.items():
            expected = f'images/flat/{exercise_id}-{pose}.webp'
            if name != expected:
                raise ValueError(f'Unexpected image path: {name}')
            data = read(name)
            if len(data) < 12 or data[:4] != b'RIFF' or data[8:12] != b'WEBP':
                raise ValueError(f'Invalid WebP header: {name}')
    return {'source': 'repdb-free', 'source_url': SOURCE, 'commit': revision,
            'schema_version': 3, 'declared_count': dataset['count'], 'actual_count': len(rows),
            'inspected_at_utc': datetime.now(timezone.utc).isoformat(), 'importer_version': VERSION,
            'mapping_version': None, 'license_text': license_text, 'attribution_text': attribution_text,
            'files': dict(sorted(files.items())), 'total_bytes': sum(f['bytes'] for f in files.values()),
            'status': 'validation-only; taxonomy, rights and load mappings not approved'}


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('repository', help='Local canonical RepDB Git checkout')
    parser.add_argument('revision', help='Full immutable commit SHA')
    args = parser.parse_args()
    try:
        print(json.dumps(inspect(args.repository, args.revision), indent=2, ensure_ascii=False))
    except (ValueError, UnicodeError, json.JSONDecodeError, OSError) as exc:
        print(f'Validation failed: {exc}', file=sys.stderr)
        return 1
    return 0


if __name__ == '__main__':
    sys.exit(main())
