#!/usr/bin/env python3
"""Validate a RepDB free ZIP and print a non-publishing provenance manifest."""
import argparse
import hashlib
import json
import re
import sys
import zipfile
from pathlib import Path

MAX_FILE = 8 * 1024 * 1024


def digest(data):
    return hashlib.sha256(data).hexdigest()


def inspect_archive(path):
    archive = Path(path)
    archive_hash = digest(archive.read_bytes())
    with zipfile.ZipFile(archive) as source:
        infos = source.infolist()
        names = [i.filename for i in infos if not i.is_dir()]
        if len(set(names)) != len(names):
            raise ValueError('Archive has duplicate paths')
        for info in infos:
            parts = info.filename.split('/')
            if info.filename.startswith('/') or '\\' in info.filename or '..' in parts:
                raise ValueError('Archive has an unsafe path')
            if info.file_size > MAX_FILE:
                raise ValueError('Archive file exceeds inspection limit')
            if (info.external_attr >> 16) & 0o170000 == 0o120000:
                raise ValueError('Archive has a symbolic link')
        files = {}

        def read(name):
            try:
                value = source.read(name)
            except KeyError as exc:
                raise ValueError(f'Missing file: {name}') from exc
            files[name] = {'sha256': digest(value), 'bytes': len(value)}
            return value

        license_text = read('LICENSE.md').decode('utf-8')
        attribution = read('ATTRIBUTION.md').decode('utf-8')
        data = json.loads(read('free.en.json'))
        if data.get('source') != 'repdb-free' or data.get('schema_version') != 3 or data.get('locale') != 'en':
            raise ValueError('Unsupported source/schema/locale')
        rows = data.get('exercises')
        if not isinstance(rows, list) or not rows:
            raise ValueError('Missing exercise records')
        ids = set()
        image_count = 0
        for row in rows:
            if not isinstance(row, dict):
                raise ValueError('Invalid record')
            key = row.get('id')
            if not isinstance(key, str) or not re.fullmatch(r'[a-z0-9]+(?:-[a-z0-9]+)*', key) or key in ids:
                raise ValueError('Invalid or duplicate exercise ID')
            ids.add(key)
            if not isinstance(row.get('name'), str) or not row['name'].strip():
                raise ValueError(f'Missing name: {key}')
            instructions = row.get('instructions')
            if not isinstance(instructions, list) or not instructions or not all(isinstance(v, str) and v.strip() for v in instructions):
                raise ValueError(f'Invalid instructions: {key}')
            poses = row.get('images', {}).get('flat')
            if poses not in (['main'], ['start', 'peak']):
                raise ValueError(f'Invalid poses: {key}')
            for pose in poses:
                name = f'images/flat/{key}-{pose}.webp'
                raw = read(name)
                if len(raw) < 12 or raw[:4] != b'RIFF' or raw[8:12] != b'WEBP':
                    raise ValueError(f'Invalid WebP: {name}')
                image_count += 1
        return {'source': 'repdb-free', 'archive_sha256': archive_hash,
                'schema_version': data['schema_version'], 'generated_at': data.get('generated_at'),
                'record_count': len(rows), 'image_count': image_count,
                'license_text': license_text, 'attribution_text': attribution,
                'files': dict(sorted(files.items())),
                'status': 'inspection only; not a publishing or load-mode approval'}


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('archive')
    args = parser.parse_args()
    try:
        print(json.dumps(inspect_archive(args.archive), indent=2, ensure_ascii=False))
    except (ValueError, UnicodeError, OSError, zipfile.BadZipFile, json.JSONDecodeError) as exc:
        print(f'Inspection failed: {exc}', file=sys.stderr)
        return 1
    return 0


if __name__ == '__main__':
    sys.exit(main())
