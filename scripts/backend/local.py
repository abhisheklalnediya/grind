#!/usr/bin/env python3
"""Disposable combined Supabase stack. Never links or modifies hosted projects."""
from __future__ import annotations

import argparse
import fcntl
import hashlib
import json
import os
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


def forward_plan(work: Path, approved: list[str]) -> tuple[dict[str, str], dict[str, str], list[str]]:
    """Accept only an explicitly named, append-only Grind migration batch."""
    if (work / MARKER).read_text() != PROJECT or (work / 'supabase' / 'config.toml').read_text() != CONFIG:
        raise SystemExit('Disposable marker or exact configuration changed.')
    old = json.loads((work / 'sql-manifest.json').read_text())
    current = sql_manifest(SOURCE)
    snapshot = sql_manifest(work / 'supabase')
    if any(current.get(key) != value or snapshot.get(key) != value for key, value in old.items()):
        raise SystemExit('Existing source or snapshot SQL changed; refusing forward update.')
    added = sorted(set(current) - set(old))
    if any(key not in current or current[key] != value for key, value in snapshot.items()):
        raise SystemExit('Unexpected snapshot file or changed snapshot SQL.')
    migrations = [key for key in added if key.startswith('migrations/')]
    tests = [key for key in added if key.startswith('tests/')]
    if any(not re.fullmatch(r'migrations/\d{14}_grind_[a-z0-9_]+\.sql', item) for item in migrations):
        raise SystemExit('Only new Grind migrations are allowed.')
    if any(not re.fullmatch(r'tests/grind_[a-z0-9_]+\.sql', item) for item in tests):
        raise SystemExit('Only new Grind tests are allowed.')
    if not migrations or sorted(approved) != migrations or len(set(approved)) != len(approved):
        raise SystemExit('Explicitly approve the exact new migration filenames.')
    old_versions = [Path(k).name[:14] for k in old if k.startswith('migrations/')]
    versions = [Path(k).name[:14] for k in migrations]
    if len(set(old_versions + versions)) != len(old_versions + versions) or not old_versions or min(versions) <= max(old_versions):
        raise SystemExit('Migration versions must be unique and strictly forward.')
    return old, current, migrations


def migration_body(path: Path, expected_hash: str) -> str:
    raw = path.read_bytes()
    if hashlib.sha256(raw).hexdigest() != expected_hash:
        raise SystemExit('Migration changed during preparation.')
    text = raw.decode('utf-8')
    # A single outer transaction must cover all migrations and history entries.
    lines = text.splitlines()
    meaningful = [i for i, line in enumerate(lines) if line.strip() and not line.strip().startswith('--')]
    if not meaningful or lines[meaningful[0]].strip().lower() != 'begin;' or lines[meaningful[-1]].strip().lower() != 'commit;':
        raise SystemExit('Migration must have a simple outer begin/commit wrapper.')
    del lines[meaningful[-1]]
    del lines[meaningful[0]]
    if any(re.match(r'^\s*(?:\\|(?:begin|commit|rollback|savepoint|release)\s*;)', line, re.I) for line in lines):
        raise SystemExit('Nested transaction commands and psql directives are not allowed.')
    return '\n'.join(lines)


def history_rows(manifest: dict[str, str], *, marked: set[str] = frozenset()) -> list[dict]:
    result = []
    for key in sorted(k for k in manifest if k.startswith('migrations/')):
        stem = Path(key).stem
        version, name = stem.split('_', 1)
        result.append({'version': version, 'name': name,
                       'marker': 'sha256:' + manifest[key] if key in marked else None})
    return result


def database_history() -> list[dict]:
    container = f'supabase_db_{PROJECT}'
    command = ['docker', 'exec', '-i', container, 'psql', '-U', 'postgres', '-d', 'postgres', '-At', '-v', 'ON_ERROR_STOP=1']
    result = run(command, sql="select coalesce(json_agg(json_build_object('version',version,'name',name,'statements',statements) order by version),'[]'::json)::text from supabase_migrations.schema_migrations;")
    return json.loads(result)


def history_matches(actual: list[dict], expected: list[dict]) -> bool:
    if len(actual) != len(expected):
        return False
    for row, want in zip(actual, expected):
        if row.get('version') != want['version'] or row.get('name') != want['name']:
            return False
        if want['marker'] is not None and row.get('statements') != [want['marker']]:
            return False
    return True


def forward_sql(old: dict[str, str], new: dict[str, str], migrations: list[str]) -> str:
    expected = [[row['version'], row['name']] for row in history_rows(old)]
    expected_hex = json.dumps(expected, separators=(',', ':')).encode().hex()
    parts = ["begin;", "lock table supabase_migrations.schema_migrations in access exclusive mode;",
             "do $guard$ begin if (select coalesce(jsonb_agg(jsonb_build_array(version,name) order by version),'[]'::jsonb) from supabase_migrations.schema_migrations) <> convert_from(decode('" + expected_hex + "','hex'),'UTF8')::jsonb then raise exception 'migration history changed'; end if; end $guard$;"]
    for key in migrations:
        body = migration_body(SOURCE / key, new[key])
        version, name = Path(key).stem.split('_', 1)
        parts += [body, f"insert into supabase_migrations.schema_migrations(version,name,statements) values('{version}','{name}',array['sha256:{new[key]}']);"]
    parts.append('commit;')
    return '\n'.join(parts)


def update_forward(approved: list[str]) -> None:
    work = target(verify=False)
    # A process-local filesystem lock serializes snapshot synchronization and recovery.
    with (work / '.grind-forward.lock').open('a') as lock:
        fcntl.flock(lock, fcntl.LOCK_EX | fcntl.LOCK_NB)
        old, new, migrations = forward_plan(work, approved)
        sql = forward_sql(old, new, migrations)
        history = database_history()
        if history_matches(history, history_rows(old)):
            container = f'supabase_db_{PROJECT}'
            command = ['docker', 'exec', '-i', container, 'psql', '-U', 'postgres', '-d', 'postgres', '-v', 'ON_ERROR_STOP=1']
            run(command, sql=sql)
        elif not history_matches(history, history_rows(new, marked=set(migrations))):
            raise SystemExit('Database migration history differs from both approved states.')
        if not history_matches(database_history(), history_rows(new, marked=set(migrations))):
            raise SystemExit('Database migration history could not be verified after update.')
        if sql_manifest(SOURCE) != new:
            raise SystemExit('Source changed during update; do not synchronize the snapshot.')
        for key in sorted(set(new) - set(old)):
            source = SOURCE / key
            if hashlib.sha256(source.read_bytes()).hexdigest() != new[key]:
                raise SystemExit('Source changed while synchronizing snapshot.')
            dest = work / 'supabase' / key
            temp = dest.with_name(dest.name + '.forward-tmp')
            shutil.copy2(source, temp)
            os.replace(temp, dest)
        manifest_tmp = work / 'sql-manifest.json.forward-tmp'
        manifest_tmp.write_text(json.dumps(new, indent=2))
        os.replace(manifest_tmp, work / 'sql-manifest.json')
        target()
        print(f'Applied and verified {len(migrations)} forward migrations; existing database was not reset.')


def main() -> None:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('action', choices=['prepare', 'refresh', 'start', 'reset', 'test', 'test-grind', 'env', 'types', 'stop', 'update-forward'])
    parser.add_argument('migrations', nargs='*', help='Exact migrations/<filename> paths for update-forward')
    args = parser.parse_args()
    action = args.action
    if args.migrations and action != 'update-forward':
        parser.error('Migration paths are only accepted by update-forward')
    if action == 'update-forward':
        update_forward(args.migrations)
    elif action == 'prepare':
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
