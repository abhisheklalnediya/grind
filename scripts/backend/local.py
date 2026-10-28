#!/usr/bin/env python3
"""Disposable combined Supabase stack. Never links or modifies hosted projects."""
from __future__ import annotations

import argparse
import hashlib
import json
from pathlib import Path
import re
import shutil
import subprocess
import tempfile

ROOT = Path(__file__).resolve().parents[2]
SOURCE = ROOT.parent / 'babyBoo' / 'supabase'
PROJECT = 'grind_m1_disposable'
STATE = ROOT / '.expo' / 'grind-backend.json'
MARKER = '.grind-disposable-local'
EXCLUDED = 'analytics,studio,meta,storage,imgproxy,realtime,edge-runtime,functions,vector'
CONFIG = f'''project_id = "{PROJECT}"
[api]
enabled = true
port = 55421
schemas = ["public", "graphql_public", "grind"]
extra_search_path = ["public", "extensions"]
max_rows = 1000
[db]
port = 55422
shadow_port = 55420
major_version = 17
[db.seed]
enabled = false
[db.pooler]
enabled = false
port = 55429
[realtime]
enabled = false
[studio]
enabled = false
port = 55423
[inbucket]
enabled = true
port = 55424
[storage]
enabled = false
[auth]
enabled = true
site_url = "http://127.0.0.1:3000"
additional_redirect_urls = ["grind://auth/callback", "littlelog://auth/callback"]
jwt_expiry = 3600
enable_signup = true
minimum_password_length = 8
[auth.email]
enable_signup = true
double_confirm_changes = true
enable_confirmations = true
[auth.sms]
enable_signup = false
enable_confirmations = false
[edge_runtime]
enabled = false
inspector_port = 55430
[analytics]
enabled = false
port = 55427
'''


def sql_manifest(base: Path) -> dict[str, str]:
    result = {}
    for name in ('migrations', 'tests'):
        for path in sorted((base / name).glob('*.sql')):
            pattern = r'\d{14}_[a-z0-9_]+\.sql' if name == 'migrations' else r'[a-z0-9_]+\.sql'
            if path.is_symlink() or not re.fullmatch(pattern, path.name):
                raise SystemExit('Refusing unexpected SQL source filename.')
            result[f'{name}/{path.name}'] = hashlib.sha256(path.read_bytes()).hexdigest()
    return result


def run(command: list[str], *, sql: str | None = None) -> str:
    result = subprocess.run(command, input=sql, text=True, capture_output=True)
    if result.returncode:
        # CLI status/start output can contain credentials. Do not echo it.
        if sql is not None:
            safe = '\n'.join(line for line in result.stderr.splitlines()
                             if any(word in line for word in ('ERROR:', 'CONTEXT:', 'connection', 'server closed')))
            raise SystemExit(f'Local SQL failed: {safe}')
        raise SystemExit(f'Local command failed ({result.returncode}): {command[0]} {command[1]} '
                         '(output withheld because CLI output may contain local credentials)')
    return result.stdout


def target(*, verify: bool = True) -> Path:
    if not STATE.exists():
        raise SystemExit('Run prepare first.')
    work = Path(json.loads(STATE.read_text())['workdir']).resolve()
    if not work.name.startswith('grind-m1-') or not (work / MARKER).exists():
        raise SystemExit('Refusing unrecognized workspace.')
    config = (work / 'supabase' / 'config.toml').read_text()
    if f'project_id = "{PROJECT}"' not in config or 'port = 55421' not in config:
        raise SystemExit('Refusing unexpected project ID/ports.')
    if (work / 'supabase' / '.temp' / 'project-ref').exists():
        raise SystemExit('Refusing linked workspace.')
    if verify:
        manifest = json.loads((work / 'sql-manifest.json').read_text())
        if manifest != sql_manifest(SOURCE) or manifest != sql_manifest(work / 'supabase'):
            raise SystemExit('Source/snapshot SQL changed; stop then refresh the disposable copy.')
        if config != CONFIG:
            raise SystemExit('Disposable config changed; stop then refresh the copy.')
    return work


def prepare() -> None:
    if STATE.exists():
        print(f'Existing disposable workspace verified: {target()}')
        return
    work = Path(tempfile.mkdtemp(prefix='grind-m1-'))
    dest = work / 'supabase'
    dest.mkdir()
    manifest = sql_manifest(SOURCE)
    for name in ('migrations', 'tests'):
        (dest / name).mkdir()
    for relative in manifest:
        shutil.copy2(SOURCE / relative, dest / relative)
    (dest / 'config.toml').write_text(CONFIG)
    (work / 'sql-manifest.json').write_text(json.dumps(manifest, indent=2))
    (work / MARKER).write_text(PROJECT)
    STATE.parent.mkdir(exist_ok=True)
    STATE.write_text(json.dumps({'workdir': str(work)}, indent=2) + '\n')
    print(f'Prepared disposable combined migration copy: {work}')


def cli(*args: str) -> list[str]:
    return ['supabase', *args, '--workdir', str(target())]


def public_environment() -> None:
    data = run(cli('status', '-o', 'env'))
    values = {}
    for line in data.splitlines():
        key, sep, value = line.partition('=')
        if sep:
            values[key] = value.strip('"')
    url = values.get('API_URL') or values.get('SUPABASE_URL')
    key = values.get('ANON_KEY') or values.get('PUBLISHABLE_KEY')
    if not url or not key or not url.startswith('http://127.0.0.1:55421'):
        raise SystemExit('Unexpected local API configuration; environment not written.')
    path = ROOT / '.env.development.local'
    text = f'EXPO_PUBLIC_SUPABASE_URL={url}\nEXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY={key}\n'
    if path.exists() and path.read_text() != text:
        raise SystemExit('Existing development env differs; refusing to overwrite it.')
    path.write_text(text)
    path.chmod(0o600)
    print('Local public API config written to ignored .env.development.local (hosted .env.local preserved).')


def test(*, grind_only: bool = False) -> None:
    work = target()
    container = f'supabase_db_{PROJECT}'
    command = ['docker', 'exec', '-i', container, 'psql', '-U', 'postgres', '-d', 'postgres', '-v', 'ON_ERROR_STOP=1']
    fixtures = """insert into auth.users(id) values
      ('00000000-0000-4000-8000-000000000001'),
      ('00000000-0000-4000-8000-000000000002') on conflict(id) do nothing;"""
    run(command, sql=fixtures)
    for path in sorted((work / 'supabase' / 'tests').glob('*.sql')):
        if grind_only and not path.name.startswith('grind_'):
            continue
        if path.name == 'bootstrap.sql':
            continue  # Full Supabase supplies auth schema/roles; do not replace them.
        print(f'Running local SQL: {path.name}', flush=True)
        run(command, sql=path.read_text())
        print(f'PASS local SQL: {path.name}')


def main() -> None:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('action', choices=['prepare', 'refresh', 'start', 'reset', 'test', 'test-grind', 'env', 'types', 'stop'])
    action = parser.parse_args().action
    if action == 'prepare':
        prepare()
    elif action == 'refresh':
        work = target(verify=False)
        run(['supabase', 'stop', '--no-backup', '--workdir', str(work)])
        STATE.unlink()
        prepare()
    elif action == 'start':
        run(cli('start', '--exclude', EXCLUDED))
        print('Disposable local Auth/API/mail/database started on 554xx ports.')
        public_environment()
    elif action == 'reset':
        run(cli('db', 'reset', '--local', '--yes'))
        print('Disposable local combined migration replay passed.')
    elif action in ('test', 'test-grind'):
        test(grind_only=action == 'test-grind')
    elif action == 'env':
        public_environment()
    elif action == 'types':
        output = run(cli('gen', 'types', 'typescript', '--local', '--schema', 'grind'))
        print(output, end='')
    else:
        run(cli('stop', '--no-backup'))
        print('Stopped only the disposable GRIND stack.')


if __name__ == '__main__':
    main()
