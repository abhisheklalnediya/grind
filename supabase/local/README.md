# Disposable combined local backend

The authoritative migration stream is `../../../babyBoo/supabase/migrations` relative to this folder. GRIND does not own a competing linked Supabase project/history. The new foundation migration and SQL test live in BabyBoo's existing stream; no hosted application is implied.

From the GRIND root:

```sh
python3 scripts/backend/local.py prepare
python3 scripts/backend/local.py start
python3 scripts/backend/local.py reset
python3 scripts/backend/local.py test
python3 scripts/backend/local.py types
```

`prepare` copies canonical SQL migrations/tests and generates a strict local-only configuration into a marked temporary directory and records its path in ignored `.expo/grind-backend.json`. The copy uses project ID `grind_m1_disposable`, ports 554xx, API schemas public/graphql_public/grind, email confirmations and both apps' exact callbacks. No source environment files, linked-project metadata, external provider configuration or non-SQL test files are copied. SHA256 manifests verify that canonical SQL and copied SQL match before operations; drift is rejected. It does not edit BabyBoo configuration or touch its running 544xx stack. After canonical SQL edits, run `python3 scripts/backend/local.py refresh`, then `start`, `reset` and `test`. Refresh stops only the marked disposable stack and creates a new snapshot; stale copies cannot pass tests.

`start` exposes only this disposable Auth/API/mail/database stack and writes public URL/anon key to ignored owner-only `.env.development.local`, which takes precedence over existing hosted `.env.local` during development. The hosted file is preserved. No service credentials are copied into app configuration or printed. Root must launch the app in development mode and verify local endpoint selection before auth requests.

The API is at `http://127.0.0.1:55421`; local captured mail is at `http://127.0.0.1:55424`. Android emulator uses `10.0.2.2` for the host; a physical phone requires the laptop's reachable LAN address instead of localhost. Configure only the public local API address for those targets; retain port 55421 and do not substitute hosted BabyBoo. LAN reachability/firewall and native callback delivery need device verification.

`reset` refuses an unmarked, unexpected, or linked workspace and always passes `--local`. It resets only this disposable copy. `test` executes actual PostgreSQL suites (including existing BabyBoo tests), supplying fictional Auth IDs; the minimal bootstrap script is deliberately skipped because full Supabase supplies auth roles/schema. Fixture suites roll back their own data. `types` prints generated grind-schema types; redirect to an agreed client-owned path only after coordination.

To stop only this disposable stack:

```sh
python3 scripts/backend/local.py stop
```

Do not run `db push`, `link`, remote reset, hosted secrets commands, or provider requests as part of this harness. Live MuscleWiki calls remain disabled. Physical-device Auth/storage and native notification behavior are separate acceptance gates.


## Verification evidence — 25 October 2026

- `PYTHONDONTWRITEBYTECODE=1 python3 -m unittest discover -s scripts/backend -p 'test_*.py' -v`: three harness safety tests pass, including source-drift rejection.
- Combined canonical migrations replayed successfully on the disposable full Supabase stack.
- `python3 scripts/backend/local.py test-grind`: dedicated Grind membership/setup/settings/catalog SQL policies and constraints pass on full Supabase.
- `PYTHONDONTWRITEBYTECODE=1 python3 scripts/backend/api_smoke.py`: real loopback Auth/PostgREST checks pass for confirmation, password login, eight concurrent join replays, setup, membership/ownership filtering, direct-write denial, independent-session local logout, recovery verification and password update. Random fictional users are deleted afterward. Session tokens and passwords remain in memory and are never printed. Token-hash verification does not prove native PKCE/callback handling.
- Full `test` is **blocked**, not passed: unchanged `baby_onboarding.sql` crashes this Supabase PostgreSQL image with signal 11 during its anonymous `complete_baby_onboarding` permission-denial block. The same minimal block reproduces in a fresh disposable `grind_baseline` database containing only the seven BabyBoo migrations and no Grind migration. Plain anonymous table SELECT/INSERT denial blocks succeed; disabling JIT does not fix the RPC-planning crash. No existing BabyBoo stack was changed. Preserve this as an engine/baseline regression gate rather than weakening tests or claiming cross-app regression passed.

The API smoke uses local test token hashes to exercise server verification/recovery; real captured-email links, device callback delivery, keychain isolation and native app sessions remain separate checks. Do not run the smoke script against a non-loopback or hosted endpoint; it refuses those targets.
