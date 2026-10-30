# M0 foundation decisions and source inventory

> Historical proposal, superseded on 30 October 2026. Its shared-project/Auth and sibling-workspace instructions are obsolete. GRIND uses only project `mgyzzipsqmsabptrfchw`, root `supabase/migrations`, and GRIND-owned local resources. Do not follow the historical cross-app access, migration, test, or account instructions below.

25 October 2026. User authorized starting M0/M1. Architect scope here is source inspection and foundation contracts only. No BabyBoo files, database schemas, hosted settings or provider resources were changed. Technical defaults below are recommendations for coordinator/developer review before migration work; user approval does not make untested native or hosted behavior verified.

## Precedence and development boundary

Use this GRIND root for the application. The 25 October shared-backend amendment in [architecture](../ARCHITECTURE.md) and [media module](../EXERCISE_MEDIA_MODULE.md) overrides older separate-project/generic account-deletion language. Reuse the shared Auth identity; isolate Grind data, membership, onboarding, session storage and app lifecycle. Default deletion means `delete_grind_data`, preserving Auth identity and BabyBoo records. Full shared-account deletion is not part of M1.

Recommend BabyBoo's existing Supabase migration stream as the single canonical source. Never initialize a second hosted migration history from GRIND. Assign one backend owner; coordinator approves precise sibling-workspace edits before they occur. This architect assignment makes no such edits. Until that handoff, backend work may prepare specifications and a disposable combined test workspace only.

## Verified source inventory

The following paths were inspected, without reading local secret files. Paths in this table are absolute owning sources; they are source facts rather than a live-project audit.

| Source | Evidence and consequence |
| --- | --- |
| `/Users/abhisheklal/works/babyBoo/AGENTS.md`, `README.md`, `docs/README.md`, `docs/STATUS.md` | Read before inspecting source. BabyBoo is a working app with documented native/hosted gates and existing test failures; do not treat a baseline failure as a Grind regression or claim all current tests pass. |
| `/Users/abhisheklal/works/babyBoo/supabase/config.toml` | `project_id` is `babyBoo`; API/database/shadow ports are 54421/54422/54420, PostgreSQL major 17. API exposes `public`, `graphql_public`; seeds disabled. Local email confirmations are false, callback allowlist contains loopback only. These are local settings, not evidence of hosted configuration. |
| `/Users/abhisheklal/works/babyBoo/supabase/migrations/` | Seven ordered SQL files: `20261020190000_baby_onboarding.sql`, `20261021120000_care_events.sql`, `20261021120100_care_event_mutations.sql`, `20261021130000_birth_date_picker_range.sql`, `20261021140000_mutation_argument_defaults.sql`, `20261021141000_care_conflict_response.sql`, `20261022180000_daily_weight.sql`. Preserve existing bytes/order; add forward migrations only. Source existence does not prove all seven are deployed. |
| `/Users/abhisheklal/works/babyBoo/supabase/tests/bootstrap.sql` | Minimal standalone PostgreSQL fixture creates Auth schema/roles/users. Do not run this bootstrap against real Supabase, where those objects already exist. |
| `/Users/abhisheklal/works/babyBoo/supabase/tests/` | Existing SQL regression cases include onboarding, care events, bounds/defaults, schema and daily weights. Determine harness compatibility before running through a different test runner. |
| `/Users/abhisheklal/works/babyBoo/src/data/supabase/client.ts` | PKCE; URL auto-detection and automatic refresh initially disabled; SecureStore adapter; crypto initialized before client; no explicit SDK storageKey. Grind must supply its own storageKey and native namespace. |
| `/Users/abhisheklal/works/babyBoo/src/data/supabase/secureSessionStorage.ts` | Serialized chunked/manifest session writes, bounded size, previous manifest retained on write failure; useful behavior reference, not authorization to couple app runtimes. |
| `/Users/abhisheklal/works/babyBoo/src/domain/auth/redirect.ts` | Existing callback is `littlelog://auth/callback`, strict code/flow parsing. Preserve it even though branding changed. |
| `/Users/abhisheklal/works/babyBoo/src/data/supabase/authGateway.ts`, `docs/engineering/AUTHENTICATION.md` | Local sign-out and server-validated restoration; BabyBoo password reset not implemented in that documented slice. Grind must implement/test its own recovery behavior. |
| `/Users/abhisheklal/works/babyBoo/package.json` | Current source pins Expo 57.0.31/RN 0.86.3/React 19.2.3, Node engine 22.13+ or 24.3+. This is a compatibility candidate, not a mandate or freshly verified SDK recommendation. |

BabyBoo migrations use public owner policies and `auth.users` cascade relationships. Deleting the shared identity would therefore affect BabyBoo data. Care-event mutation functions are security-definer with empty search paths and explicit caller/owner validation. Grind must not modify these functions or infer that a separate schema alone creates a separate security tenant.

## M1 database/API contract proposal

Expose `grind` alongside existing API schemas only in the approved local/staging configuration. `grind_private` remains outside API exposure and denies app-role access. Revoke default PUBLIC function execution; grant schema usage and only required per-object privileges. Every exposed table has RLS. Derive the caller from `auth.uid()`; no owner/app claim supplied by the UI grants authority.

| Object | Proposed invariant and access |
| --- | --- |
| `grind.app_accounts` | `user_id` primary key references Auth, `created_at`, nullable `setup_completed_at`. Own-row SELECT only. Membership creation goes through `join_grind()`, idempotently creating only the caller's membership. Setup completion is server controlled. No raw app-role deletion. |
| `grind.user_settings` | `user_id` primary key references membership; preferred unit `kg`/`lb`, integer default rest seconds, update timestamp. Own-member SELECT. `complete_grind_setup(unit, rest_seconds)` atomically upserts caller settings and marks setup complete; later `save_grind_settings` reuses validation. Repeat identical requests are safe; concurrent setup cannot create duplicate rows. |
| `grind.exercises` | Stable internal UUID; origin, owner (custom only), independently authored label, muscle/equipment/category/load convention, archive timestamp. M1 creates a small independently authored seed catalog. Member SELECT sees global records and own custom records only; no client write grants until custom commands arrive in M3. Archived entries may remain readable for historical references, but picker queries exclude them. |
| `grind_private` objects | No provider cache/quota tables need implementation in M1. If the empty namespace is created, revoke app/PUBLIC schema privileges. Later provider service access requires narrow dedicated grants. |

Membership gates the catalog, settings and later workouts; membership itself uses direct own-user RLS so policy evaluation does not recurse. `join_grind` is the sole exception that accepts an authenticated nonmember. Do not gate joining on prior membership. Both join and setup must reject anonymous users; joining never creates baby/profile/care rows.

RPC implementation should prefer invoker rights where safely possible. If revoking direct table writes necessitates a definer command, use an empty fixed search path, fully qualified objects, narrow EXECUTE grants, caller validation and an owner with only necessary privileges. Treat RLS bypass as a security review item, not a substitute for checks.

Client contracts expose validated membership/setup/settings/catalog values, not database credentials or Auth tokens. Map unauthenticated/forbidden, invalid input and transient transport failures to stable feature error codes. Do not leak raw SQL/provider payloads. Generate TypeScript types from the combined tested local schema. Keep public BabyBoo types untouched.

Coordinator-aligned local M1 defaults: kg, 120-second rest matching the prototype, rest alerts off until contextual consent; validate integer 15–3600 second durations. These are technical defaults/bounds pending user refinement, not a new zero-duration/disable-rest product feature. Exercise taxonomy uses provisional independently authored loaded seed examples first. Full bodyweight/assisted rules, load/reps limits, exact tie equivalence and previous-performance semantics must be settled before M2/M3 schema depends on them; do not silently derive them from HTML sample calculations. Provider origin remains reserved with no imported/provider data or live calls in local M1.

## Native authentication boundary

Use `grind.auth.session.v1` as SDK storageKey and a Grind-specific native keychain service/namespace. Ensure PKCE auxiliary keys also inherit that isolation; test installed-app boundaries rather than assuming sandbox behavior. Sessions use tested bounded secure storage; passwords stay in component memory. Query/draft keys include environment plus account ID. Clear Grind caches/timers on explicit logout/account changes; expired auth retains the same account's pending draft for reauthentication.

Use `grind://auth/callback` as the development callback proposal, with exact destination/code validation and explicit flow routing for verification versus recovery. Never accept a callback merely because its scheme starts with Grind. Handle duplicate callbacks, expired links, restore/auth-event races, refresh failure and recovery-without-session. Restore validates the identity with the server before protected UI. Default sign-out uses SDK local scope. The shared identity means password reset/change can affect both apps; explain this in account copy.

Local combined testing must enable email confirmation and mail capture and allow exact Grind plus existing BabyBoo callbacks in its generated disposable config. This is not a request to change BabyBoo's checked-in or hosted Auth settings. Hosted email/SMTP/template/rate-limit/redirect settings are shared and require separate audit and explicit write approval.

## Disposable combined migration workflow

1. Backend owner records a manifest/hashes of the seven canonical BabyBoo migrations and any reviewed new Grind migration. Recheck inventory immediately before use; another task may add migrations.
2. Create a temporary workdir such as `/private/tmp/grind-combined-<unique-id>` with only explicitly allowlisted migration/test/config files. Do not copy `.env*`, `.temp`, hosted project refs, local database data, or secrets. Never symlink mutable migrations into a running test workspace.
3. Generate a sanitized local Supabase config with unique project ID, checked available ports distinct from BabyBoo, PostgreSQL 17, original public API schemas plus Grind, synthetic email templates/test addresses, local confirmation/mail capture and exact callback allowlist. Disable external/production integrations. No link command or remote database URL.
4. Add the reviewed forward Grind migration from the canonical owner stream. Run CLI start/reset only using this disposable workdir and explicit local targeting. Verify project ID and local addresses before reset. Docker image downloads may require separately available network/tooling; this source review did not start them.
5. Replay combined migrations from empty local database; run an appropriate SQL/API harness. Do not feed standalone `bootstrap.sql` to Supabase. Existing SQL files must be adapted/selected by the harness rather than assumed pgTAP-compatible.
6. Test anonymous, nonmember, member A and member B; repeat/concurrent join/setup; own/global catalog scope; direct-write bypass denial; private-schema denial; shared identity without automatic BabyBoo onboarding; local logout independence. Re-run BabyBoo's meaningful onboarding/care/weight cases against the combined stack. Collect a clean baseline before attributing failures.
7. Generate types and record exact commands/results and migration hashes. Stop/remove only this disposable stack; never stop/reset the existing BabyBoo stack. Hosted promotion remains separate.

Candidate command shape after tooling validation: `supabase start --workdir <disposable-root>`, `supabase db reset --local --workdir <disposable-root>`, `supabase gen types typescript --local --schema grind --workdir <disposable-root>`. Backend owner must verify flags with installed CLI help, identify the actual SQL/API runner, and record executable commands before claiming checks. None were executed by this review.

## Toolchain and device gate

Coordinator reports verified Expo 57 defaults of Android 7/iOS 16.4, Node 24 installed and Xcode 26.2 below the SDK's required 26.4. Use those defaults for the initial matrix; native iOS compilation remains blocked until compatible Xcode is available. These are coordinator-supplied toolchain findings, not checks executed by this architect task. Developer must record exact pinned compatible packages/build settings. Do not inherit BabyBoo dependencies wholesale. iOS Live Activity availability and Android chronometer behavior require native development builds; Expo Go is insufficient evidence.

The user confirms both physical device platforms are available; record their OS versions when testing. On 26 October the user confirmed Apple signing is not configured and requested that iPhone native-build verification remain pending. M1 timer proof requires physical iPhone and Android evidence. Simulator/build-only success may allow scaffold progress but does not complete feasibility acceptance. Record fallback and observed permission/background/locked-screen/termination limits; do not promise guaranteed alert delivery. Coordinator also reports an existing BabyBoo Docker stack is running: leave it untouched and choose a distinct disposable project/ports.

## Information needed from the user versus technical defaults

Device platform availability is confirmed. Coordinator asks for OS versions when testing, which hosted staging target (or permission to prepare a separate one later), and account-specific MuscleWiki direct-API entitlement. These cannot be inferred safely from source. No password, API key or service-role secret should be requested in chat. Account console entitlement can be confirmed without a live provider call.

Technical decisions can proceed as proposals: isolated auth storage/callback, local disposable combined tests, server-owned setup, small independent catalog and layered services. Coordinator must confirm migration stream ownership and schema contracts with the backend task before edits. User's M0/M1 start authorization does not authorize deployment, production data modification, purchases or provider spend.

Provider work remains fixture-only until entitlement, current terms and cache/backup retention are verified. No persisted media descriptors by default; never persist media bytes/tokens or weaken BabyBoo backups. Provider unavailability must not block logging development. M1 documents readiness, not successful paid integration.

## Verification recorded

Executed: filesystem inventory and static reads of GRIND requirements, current design/status/milestone docs, BabyBoo required navigation docs, relevant Auth modules, package/config, migration definitions and SQL fixture inventory. No shell output contained local env values. No migration/reset, build/test suite, provider call, hosted audit or native check ran. This document is the only file owned/changed by this architect task.
