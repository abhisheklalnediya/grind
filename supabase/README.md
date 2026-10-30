# GRIND standalone Supabase project

GRIND’s standalone target is project `mgyzzipsqmsabptrfchw`. GRIND’s public client URL/key are stored only in ignored `.env.local`. The app, Auth, data, migrations and local backend workflows use GRIND resources only.

`migrations/` is the GRIND-owned stream. New GRIND changes belong here. The standalone local CLI project uses ports 55520–55527. Its `project_id` is a local Docker namespace, not the hosted project ref.

## Local clean replay

```sh
SUPABASE_TELEMETRY_DISABLED=1 supabase start
SUPABASE_TELEMETRY_DISABLED=1 supabase db reset --local
```

The reset is destructive only to this dedicated local stack. It does not touch the hosted project. The migration baseline creates the Grind schemas, RLS/RPCs and seven independently authored starter exercises.

The nine SQL test files use transactional `psql` scripts, not pgTAP. `supabase test db` therefore cannot run them as-is. Run them against the local container with:

```sh
python3 - <<'PY'
from pathlib import Path
import subprocess
for path in sorted(Path("supabase/tests").glob("grind_*.sql")):
    result = subprocess.run(["docker", "exec", "-i", "supabase_db_grind_standalone_local", "psql", "-U", "postgres", "-d", "postgres"], input=path.read_text(), text=True, capture_output=True)
    if result.returncode:
        print(result.stdout, result.stderr)
        raise SystemExit(f"FAIL: {path}")
    print(f"PASS: {path.name}")
PY
```

## Hosted migration sequence

1. Authenticate with `supabase login` and link `mgyzzipsqmsabptrfchw` using `supabase link --project-ref mgyzzipsqmsabptrfchw`. CLI linking prompts for the project database password; do not put it in source or chat.
2. Inspect `supabase migration list --linked` and confirm the target has no conflicting migration history.
3. Review `supabase db push --linked --dry-run`; only then apply with `supabase db push --linked`. Do not use `--include-all` without reviewing the history diff.
4. Expose `grind` (never `grind_private`) in the hosted API and add the exact `grind://auth/callback` Auth redirect. Verify signup, email confirmation, recovery, RLS and app login before treating the client cutover as accepted.

### Standalone operation

The app is configured for this GRIND project only. Do not add another project's URL, Auth callback or credentials as a fallback. Investigate sign-in failures against this project's Auth settings and GRIND's local disposable stack. Back up and reconcile GRIND data before any future project migration.

**Completed 30 October 2026:** the nine migrations are applied, selected user/workout data was transferred and exact-compared, and hosted API/Auth configuration matches the GRIND schema and callback requirements. Authenticated sign-in/recovery/RLS and physical-device validation are still required before M8 acceptance.

## Data scope

The imported GRIND dataset contains one member, one settings row, one active and one completed workout, one referenced built-in exercise, one set and 13 command receipts. No routine or custom exercise rows were present. Those workouts reference the independently authored starter seed, so they were transferred without RepDB records. Auth sessions were not transferred; the user signs in to GRIND independently.

The same local database also contains 701 RepDB catalog records. The included RepDB license allows in-app use with attribution but prohibits dataset/API redistribution; the project’s catalog plan still requires review or written clarification for authenticated backend delivery. Do not upload those 701 rows or their source links as part of this migration. The local app bundle remains governed by its separate in-app license terms. Test fixtures are never migrated.
