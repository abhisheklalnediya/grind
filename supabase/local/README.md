# GRIND disposable local backend

This guarded backend harness copies migrations and SQL tests from this repository's own `supabase/` directory. It never reads a sibling checkout or uses another app's credentials, database, Auth users or callbacks. The throwaway stack uses project ID `grind_disposable` and ports 55420–55430; the primary GRIND local Supabase stack uses ports 55520–55527.

From the GRIND root:

```sh
python3 scripts/backend/local.py prepare
python3 scripts/backend/local.py start
python3 scripts/backend/local.py reset
python3 scripts/backend/local.py test
python3 scripts/backend/local.py types
```

`prepare` creates a marked temporary directory and records it in ignored `.expo/grind-backend.json`. SHA256 manifests verify that copied GRIND SQL matches this repository before operations. After migration changes, run `refresh`, then `start`, `reset` and `test`. Refresh stops only the marked disposable GRIND stack and creates a fresh copy.

`start` runs a disposable GRIND Auth/API/mail/database stack and writes its public URL and anon key to ignored owner-only `.env.development.local`. It preserves `.env.local`, which contains the standalone hosted GRIND endpoint. No service credentials are copied or printed. Run the app with the development Metro workflow when using the disposable local backend.

The disposable API is at `http://127.0.0.1:55421`; captured mail is at `http://127.0.0.1:55424`. Android emulator uses `10.0.2.2`; a physical phone requires a reachable laptop LAN address instead of localhost. The standalone local CLI project is documented in [the Supabase setup](../README.md).

`reset` refuses unmarked, unexpected or linked workspaces and always passes `--local`. `test` executes only the GRIND SQL files against the disposable database, with fictional Auth IDs. The runner skips bootstrap SQL because full Supabase supplies Auth roles and schema. Fixture SQL rolls back its data. `types` prints the `grind` schema types.

To stop the disposable local backend:

```sh
python3 scripts/backend/local.py stop
```

Do not run hosted migrations, remote reset, secrets commands or provider requests as part of this harness. Physical-device Auth, SecureStore and native behavior still require device checks.
