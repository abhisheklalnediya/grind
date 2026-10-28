#!/usr/bin/env python3
"""Real local Auth/PostgREST smoke checks; no hosted requests or credentials output."""
import concurrent.futures
import json
import secrets
import subprocess
import urllib.error
import urllib.request
import uuid

import local

local.target()  # Refuse stale, unmarked or linked targets before local HTTP/SQL.
ENV = {}
for line in (local.ROOT / '.env.development.local').read_text().splitlines():
    key, separator, value = line.partition('=')
    if separator:
        ENV[key] = value
URL = ENV['EXPO_PUBLIC_SUPABASE_URL']
KEY = ENV['EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY']
if URL != 'http://127.0.0.1:55421':
    raise SystemExit('Refusing non-loopback/non-disposable API target.')
DB = ['docker', 'exec', '-i', f'supabase_db_{local.PROJECT}', 'psql', '-U', 'postgres',
      '-d', 'postgres', '-t', '-A', '-v', 'ON_ERROR_STOP=1']
created = []


def request(path, payload=None, token=None, schema=False, method=None):
    headers = {'apikey': KEY, 'Content-Type': 'application/json'}
    if token:
        headers['Authorization'] = 'Bearer ' + token
    if schema:
        headers.update({'Accept-Profile': 'grind', 'Content-Profile': 'grind'})
    data = None if payload is None else json.dumps(payload).encode()
    req = urllib.request.Request(URL + path, data=data, headers=headers,
                                 method=method or ('POST' if data is not None else 'GET'))
    try:
        with urllib.request.urlopen(req, timeout=15) as response:
            text = response.read().decode()
            return response.status, json.loads(text) if text else None
    except urllib.error.HTTPError as error:
        return error.code, json.loads(error.read())  # Do not log error/session bodies.


def sql(text):
    result = subprocess.run(DB, input=text, text=True, capture_output=True)
    if result.returncode:
        raise AssertionError('Disposable SQL fixture operation failed.')
    return result.stdout.strip()


def new_user():
    email = f'grind-m1-{uuid.uuid4().hex}@example.test'
    password = 'Local-fixture-' + secrets.token_hex(16)
    status, signup = request('/auth/v1/signup', {'email': email, 'password': password})
    assert status == 200 and signup.get('access_token') is None, 'Verification gate missing.'
    user_id = str(uuid.UUID(signup.get('user', signup)['id']))
    created.append(user_id)
    hashed = sql(f"select confirmation_token from auth.users where id='{user_id}';")
    assert hashed, 'Verification token not created.'
    status, verified = request('/auth/v1/verify', {'type': 'signup', 'token_hash': hashed})
    assert status == 200 and verified.get('access_token'), 'Email verification failed.'
    status, signed_in = request('/auth/v1/token?grant_type=password',
                                {'email': email, 'password': password})
    assert status == 200 and signed_in.get('access_token'), 'Password sign-in failed.'
    return email, password, signed_in


def rpc(name, token, payload=None):
    return request('/rest/v1/rpc/' + name, payload or {}, token=token, schema=True)



def ok(name, token, payload=None):
    status, result = rpc(name, token, payload)
    assert status == 200, f'{name} failed HTTP {status}, code {result.get("code") if isinstance(result, dict) else "unknown"}'
    return result


def operation():
    return str(uuid.uuid4())


try:
    _, _, first = new_user()
    _, _, second = new_user()
    token, other = first['access_token'], second['access_token']
    for access in (token, other):
        ok('join_grind', access)
        ok('complete_grind_setup', access, {'p_preferred_unit': 'kg', 'p_default_rest_seconds': 120})
    with concurrent.futures.ThreadPoolExecutor(max_workers=6) as pool:
        starts = list(pool.map(lambda _: ok('start_workout', token, {'p_operation_id': operation()}), range(12)))
    assert len({s['id'] for s in starts}) == 1, 'Concurrent starts created multiple active sessions.'
    session = starts[0]
    wid = session['id']
    op = operation()
    payload = {'p_operation_id': op, 'p_session_id': wid, 'p_expected_revision': 0,
               'p_command': {'type': 'rename_workout', 'name': 'Fictional concurrency'}}
    with concurrent.futures.ThreadPoolExecutor(max_workers=6) as pool:
        receipts = list(pool.map(lambda _: ok('apply_workout_command', token, payload), range(8)))
    assert all(r == receipts[0] for r in receipts), 'Concurrent same-operation replay differs.'
    assert receipts[0]['revision'] == 1, 'Replay incremented revision.'
    stale = dict(payload, p_operation_id=operation())
    status, error = rpc('apply_workout_command', token, stale)
    assert status == 409 and error['code'] == 'PT409', 'Stale revision not rejected.'
    status, error = rpc('get_workout', other, {'p_session_id': wid})
    assert status == 403 and error['code'] == '42501', 'Cross-owner RPC not rejected.'
    malformed = dict(payload, p_operation_id=operation(), p_expected_revision=1,
                     p_command={'type': 'rename_workout', 'name': 'Bad', 'owner_id': created[1]})
    status, error = rpc('apply_workout_command', token, malformed)
    assert status == 400 and error['code'] == '23514', 'Unknown command ownership field accepted.'
    status, error = rpc('finish_workout', token, {'p_operation_id': operation(),
                       'p_session_id': wid, 'p_expected_revision': 1})
    assert status == 400 and error['code'] == '23514', 'Empty workout completed.'
    changed = dict(payload, p_command={'type': 'rename_workout', 'name': 'Changed'})
    status, error = rpc('apply_workout_command', token, changed)
    assert status == 400 and error['code'] == '23514', 'Receipt payload reuse accepted.'
    ok('cancel_workout', token, {'p_operation_id': operation(), 'p_session_id': wid, 'p_expected_revision': 1})
    assert ok('apply_workout_command', token, payload) == receipts[0], 'Lost response replay changed after cancellation.'
    assert ok('get_active_workout', token) is None, 'Cancellation retained active session.'
    print('PASS: real Auth/API concurrent starts, atomic replay, stale revisions, owner isolation and lost responses.')
finally:
    for identity in created:
        sql(f"delete from auth.users where id='{identity}';")
