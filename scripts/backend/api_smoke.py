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


try:
    email1, password1, first = new_user()
    _, _, second = new_user()
    token1, token2 = first['access_token'], second['access_token']
    status, rows = request('/rest/v1/exercises?select=id', token=token2, schema=True)
    assert status == 200 and rows == [], 'Nonmember catalog leak.'
    status, _ = rpc('complete_grind_setup', token2,
                    {'p_preferred_unit': 'kg', 'p_default_rest_seconds': 120})
    assert status in (401, 403), 'Nonmember setup accepted.'
    with concurrent.futures.ThreadPoolExecutor(max_workers=4) as pool:
        results = list(pool.map(lambda _: rpc('join_grind', token1), range(8)))
    assert all(status == 200 for status, _ in results), 'Concurrent join failed.'
    assert len({json.dumps(row, sort_keys=True) for _, row in results}) == 1, 'Join replay mismatch.'
    account = results[0][1]
    assert isinstance(account, dict) and account['setup_completed_at'] is None, 'Composite RPC shape mismatch.'
    with concurrent.futures.ThreadPoolExecutor(max_workers=4) as pool:
        setups = list(pool.map(lambda _: rpc('complete_grind_setup', token1,
                           {'p_preferred_unit': 'lb', 'p_default_rest_seconds': 90}), range(4)))
    assert all(status == 200 and saved['preferred_unit'] == 'lb' and
               saved['default_rest_seconds'] == 90 and saved['user_id'] == account['user_id']
               for status, saved in setups), 'Concurrent setup save failed.'
    status, rows = request('/rest/v1/exercises?select=id&archived_at=is.null', token=token1, schema=True)
    assert status == 200 and len(rows) >= 1, 'Member catalog failed.'
    catalog, after = [], None
    for _ in range(100):
        status, page = rpc('catalog_with_sources', token1, {
            'p_after_name': after['name'] if after else None,
            'p_after_id': after['id'] if after else None,
            'p_limit': 100,
        })
        assert status == 200 and isinstance(page, list), 'Paginated catalog request failed.'
        catalog.extend(page)
        if len(page) < 100:
            break
        after = page[-1]
    else:
        raise AssertionError('Catalog pagination did not terminate.')
    assert len({row['id'] for row in catalog}) == len(catalog), 'Duplicate catalog UUID.'
    repdb = [row for row in catalog if row.get('source_key') == 'repdb']
    if repdb:
        assert len(repdb) == 701 and len({row['source_exercise_id'] for row in repdb}) == 701, 'RepDB catalog is incomplete or duplicated.'
    print(f'PASS authenticated paginated catalog: {len(repdb)} distinct RepDB pages.')
    status, denial = request('/rest/v1/user_settings?user_id=eq.' + account['user_id'], {'preferred_unit': 'kg'}, token=token1,
                        schema=True, method='PATCH')
    assert status in (401, 403, 404, 405), f'Raw settings request unexpected HTTP {status}, code {denial.get("code")}. '
    status, rows = request('/rest/v1/user_settings?select=user_id', token=token2, schema=True)
    assert status == 200 and rows == [], 'Cross-user settings leak.'
    status, _ = rpc('join_grind', token2)
    assert status == 200, 'Second member join failed.'
    # A second independent login for the same shared identity models BabyBoo's session.
    status, other_app = request('/auth/v1/token?grant_type=password',
                                {'email': email1, 'password': password1})
    assert status == 200, 'Independent shared-identity login failed.'
    status, _ = request('/auth/v1/logout?scope=local', {}, token=token1)
    assert status == 204, 'Local logout failed.'
    status, _ = request('/auth/v1/token?grant_type=refresh_token',
                        {'refresh_token': first['refresh_token']})
    assert status == 400, 'Signed-out Grind refresh token remained usable.'
    status, _ = request('/auth/v1/token?grant_type=refresh_token',
                        {'refresh_token': other_app['refresh_token']})
    assert status == 200, 'Local logout revoked independent app session.'
    status, _ = request('/auth/v1/recover', {'email': email1})
    assert status == 200, 'Recovery request failed.'
    user_id = str(uuid.UUID(first['user']['id']))
    hashed = sql(f"select recovery_token from auth.users where id='{user_id}';")
    assert hashed, 'Recovery token not created.'
    status, recovered = request('/auth/v1/verify', {'type': 'recovery', 'token_hash': hashed})
    assert status == 200 and recovered.get('access_token'), 'Recovery verification failed.'
    new_password = 'Changed-local-' + secrets.token_hex(16)
    status, _ = request('/auth/v1/user', {'password': new_password},
                        token=recovered['access_token'], method='PUT')
    assert status == 200, 'Password update failed.'
    status, _ = request('/auth/v1/token?grant_type=password', {'email': email1, 'password': password1})
    assert status == 400, 'Old password still accepted.'
    status, _ = request('/auth/v1/token?grant_type=password', {'email': email1, 'password': new_password})
    assert status == 200, 'New password sign-in failed.'
    print('PASS real local recovery: request, token verification, password update, old-password rejection.')
    print('PASS real local Auth: verification, password login, independent-session local logout.')
    print('PASS real local API: concurrent join replay/composite contract, setup, member catalog, RLS and raw-write denial.')
finally:
    if created:
        ids = ','.join("'" + str(uuid.UUID(value)) + "'" for value in created)
        sql(f"delete from auth.users where id in ({ids}) and email like 'grind-m1-%@example.test';")
