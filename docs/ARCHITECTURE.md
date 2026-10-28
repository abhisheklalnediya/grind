# GRIND MVP architecture

Decision date: 2026-10-17. Original architecture proposal following the revised product requirements, written before implementation. Current M0/M1 progress and executed checks are recorded in [agent status](AGENT_STATUS.md).


## 25 October 2026 amendment: shared backend and exercise media

Use BabyBoo's existing Supabase project and Auth identities for Grind, with separate Grind schema/data, native sessions, onboarding and app membership. Coordinate one migration history. Shared identity deletion must not be used for a Grind-only data deletion action. This supersedes the separate-project assumption and the single-app deletion wording below.

MuscleWiki is the selected demonstration provider. Cache permitted exercise text across users with bounded retention; stream videos on demand. Caching a URL does not avoid per-stream/range-request billing. The free tier is currently Playground-only. See [Exercise media module](EXERCISE_MEDIA_MODULE.md) for cache boundaries, proposed contracts, failure handling, shared-auth consequences and verification gates. Configuration is saved locally; no backend changes are deployed.

## 27 October 2026 roadmap amendment: standalone backend

The shared BabyBoo Supabase project/Auth is transitional. The user requested a standalone GRIND project/database as plan point8/M8. See [the separation milestone](IMPLEMENTATION_MILESTONES.md#m8--standalone-grind-backend-plan-point-8) for data/Auth migration, independent migration ownership, validation and cutover/rollback scope. Current M0/M1 local/shared contracts remain in use until an approved separation is implemented. Adding the milestone does not authorize hosted project creation, live migration or source-data deletion.

## Engineering standards

All new and modified implementation follows [React Native standards](engineering/REACT_NATIVE_STANDARDS.md) and [maintenance workflow](MAINTENANCE.md), including testable module boundaries, tests for every executable component/module and explicit route integration mapping. The current services/types layout is preserved. Current compliance gaps are tracked separately from architectural intent in [coverage mapping](engineering/TEST_COVERAGE.md).

## Product boundary

Build an authenticated, API-backed iOS and Android workout app. Supabase Postgres is the authoritative store. Replace the original offline-first SQLite architecture.

MVP includes email/password authentication, email verification and password reset, exercise search and custom exercises, routines, active workouts, history, previous performance, kg/lb conversion, historical snapshots, rest alerts and notification/lock-screen countdowns, and personal records. PR implementation can come after the core logging flow, but must ship before MVP completion.

No export or backup UI in MVP. No gym directory, social graph, equipment registry, leaderboards, AI, offers, or billing. These remain future phases. Do not build an offline database replication engine.

## System structure

```text
Expo / React Native / TypeScript
  Expo Router: auth, home, routines, active workout, history, settings
  TanStack Query: API reads, mutations, invalidation and loading/error state
  Zustand: temporary editor and timer presentation state
  Account-scoped device draft: unsent workout input and operation IDs
  Native timer adapter: scheduled alert + OS-rendered countdown
                 |
                 | HTTPS + authenticated user token
                 v
Supabase
  Auth: accounts, sessions, verification, recovery
  Data API: reads and simple owner-scoped writes under RLS
  Postgres RPC: transactional workout/routine commands and PR queries
  Postgres: authoritative data, constraints, snapshots, migrations
  Edge Functions: privileged account deletion; future external integrations
```

Use one application repository, with `app/`, `src/features/`, `src/domain/`, `src/services/`, `src/components/`, `src/theme/`, `src/types/`, `modules/rest-timer/`, and `supabase/{migrations,tests,seed.sql}`. Group features by auth, exercises, routines, workouts, history, records and settings. Keep routes thin; screens call feature hooks, hooks call services, services use the typed Supabase client.

Use Zod at input/API boundaries and generated Supabase TypeScript types for database contracts. Domain modules contain unit conversion and input normalization without React dependencies. Postgres owns authoritative validation and PR calculations; mobile previews must not become a second conflicting source of truth.

Do not add a standalone Express/Nest server or a web dashboard for this milestone. Supabase already supplies the API. Put multi-row state changes in database functions rather than several independent HTTP writes. Use Edge Functions only where server secrets, Auth administration, or external services require them. Realtime subscriptions are unnecessary initially; refresh on focus and invalidate after mutations.

## Authentication and access control

- Proposed initial provider: email/password, verified email, password reset, persistent login and sign-out. Social providers can be added later.
- Configure application deep links and separate local/hosted redirect allowlists for verification and reset. Handle expired links and session refresh failures explicitly.
- Persist sessions using a tested native secure-storage adapter, including token-size handling. Refresh sessions according to app lifecycle; server access remains controlled by JWT validation and database policies.
- The app contains only a Supabase project URL and publishable key. Never embed secret/service-role keys. Client environment variables are public configuration.
- Every exposed private table has RLS and explicit grants. Derive ownership from `auth.uid()`, never trust a submitted owner ID. Policies cover read, insert, update and delete, including parent ownership for child records.
- Prevent cross-user references using ownership-aware constraints and command validation. A private exercise cannot be referenced by another user's routine/session. Global seed exercises are readable by authenticated users and cannot be edited by them.
- Prefer security-invoker functions. Privileged functions require a fixed search path, explicit ownership checks, narrow execute grants, and tests. Restrict direct DML where it could bypass workout lifecycle, revision, snapshot or PR rules.
- Clear account-scoped caches, drafts and timers on explicit logout/account switch. On token expiry, retain an unsent draft for the same account and require reauthentication before sending it. Grind-only data deletion uses a narrowly scoped authenticated server function and preserves shared Auth/BabyBoo data; no admin credentials on device. Full shared-account deletion is separately gated.

## Data model

Use UUID primary keys, UTC `timestamptz`, database constraints, explicit ordering, and indexed owner/parent foreign keys. Store local timezone at session start for consistent historical day grouping. Use decimal Postgres `numeric` for weights.

| Table | Responsibility / key fields |
| --- | --- |
| `profiles` | Auth user ID, display name; private by default |
| `user_settings` | User ID, preferred unit (`kg`/`lb`), default rest duration |
| `exercises` | Global or user-owned definition; name, muscles, category, load convention, archived timestamp |
| `routine_templates` | Owner, name, version, archived timestamp |
| `routine_exercises` | Routine, exercise, order, notes, rest default |
| `routine_sets` | Template exercise, order, set type, target load/unit, target reps |
| `workout_sessions` | Owner, source routine, routine-name snapshot, status, start/finish times, timezone, revision |
| `workout_exercises` | Session, exercise ID, order, name/category/load-convention snapshots, notes, rest override |
| `workout_sets` | Workout exercise, order, warm-up/working type, entered load/unit, canonical kg load, reps, completion time |
| `workout_command_receipts` | Owner + operation ID, command/payload identity and result for safe retries |

Use one exercise table for seeded and custom exercises, distinguished by nullable owner; avoid separate history logic for each. Exercise retirement hides it from new selection while preserving references and snapshots. Do not hard-delete definitions used in history.

Keep exercise definitions separate from machines. Do not create empty future gym tables or foreign keys to nonexistent tables; future nullable equipment associations can be added by migration. Preserve expansion through clear domain boundaries rather than placeholder fields everywhere.

Session statuses: `active`, `completed`, `cancelled`. Enforce one active session per user with a partial unique index. Starting from a routine copies its exercise/template data into session-owned rows in one transaction. Changing a routine afterward affects future sessions only.

Completed history is stable under exercise renames, routine edits and unit-preference changes. Corrections to completed sets use an explicit validated command and invalidate/recompute derived records; general active-workout commands cannot mutate completed sessions. Preserve original input units and values alongside normalized values.

## API commands and consistency

Proposed RPC contracts:

- `start_workout(operation_id, routine_id?)`: validate owner, create active session and template snapshots atomically; return an existing receipt on retry.
- `apply_workout_command(operation_id, session_id, expected_revision, command)`: add/reorder/remove exercise or set, update valid draft values, complete/uncomplete a set, or edit notes. Validate status, ownership and input; lock session; increment revision.
- `finish_workout(operation_id, session_id, expected_revision)`: validate complete sets, reject ambiguous incomplete rows with a clear response, finish atomically and expose refreshed record results.
- `cancel_workout(operation_id, session_id, expected_revision)`: mark cancelled and exclude from history metrics/records without silently destroying the draft.
- `save_routine(operation_id, expected_version?, template)`: save ordered children transactionally.
- `correct_completed_workout(...)`: apply deliberate history corrections and return refreshed metrics.
- History/records queries: owner-scoped paginated reads, bounded by exercise/date where applicable.

Every command and receipt write occurs in one transaction. A repeated operation ID with a different payload is an error, not a new write. Client UUIDs and idempotency prevent duplicate rows when a successful response is lost. All workout mutations follow the same session locking/revision protocol; do not expose an alternate raw-write route around it.

Serialize writes for the active workout on the device. A second device may read it; a stale revision must trigger refresh and explicit conflict resolution rather than overwrite newer data. Do not implement simultaneous collaborative editing or automatic device takeover in MVP.

## Saving input and workout recovery

Recovery means: after app termination or phone restart, reopen the current workout with its saved sets. It is not a special workout calculation.

Server-acknowledged entries are restored from Supabase on any signed-in device. Keep a small account-scoped durable device draft for raw text and pending edits so an interrupted request or partial value such as `72.` is not silently lost. Use AsyncStorage for this bounded draft, not a full local exercise/history database. Zustand alone is not durable.

Save valid field edits after a short debounce and on blur. Persist raw editor changes to the draft; flush valid values before completing a set or finishing. Incomplete text is not coerced to zero and does not count as a completed set. Show `Saving`, `Saved`, or `Not saved — retry` based on server acknowledgement.

MVP is online-first: login, new workout creation and server saving require connectivity. If a connection drops during an existing workout, retain unsent edits on that device, show their status, and retry in order when the app is foregrounded and authenticated. Do not promise unrestricted offline workflows or background synchronization. A pending draft is not available on another device until uploaded. Finishing requires pending edits to be acknowledged; no false success screen while writes remain unsent.

## Kg/lb behavior

Use the exact conversion `1 lb = 0.45359237 kg`. Preserve entered decimal value and unit; derive canonical kg on the server using decimal arithmetic. Convert only for display when the preferred unit changes. Never repeatedly convert and overwrite source values.

Record exercise load conventions (for example total barbell weight versus per-dumbbell weight); do not compare incompatible conventions. Display rounding is separate from calculation precision. Set validation and range limits belong in both UI and database. Bodyweight and assisted exercises need explicit modes; do not turn assistance into ordinary positive lifted load. Initially show rep records for these modes and defer weighted-strength estimates until their semantics are defined and tested.

## Personal records: implement later in development, ship in MVP

Proposed initial records: highest eligible load, most reps at the same normalized load, and highest single-set volume (`kg × reps`). Qualify records by exercise and load convention; normalize units before comparison. Avoid estimated 1RM in the initial definition to keep formula assumptions out of MVP.

Only completed working sets from completed, noncancelled workouts qualify. Exclude warm-ups and incomplete/deleted sets; don't claim assisted work as unassisted. Equal normalized performances are ties, not new records. First eligible performance establishes a baseline. Rep records for bodyweight/assisted modes are labelled separately and do not use loaded volume.

Compute authoritative results in owner-scoped SQL queries/functions from source sets, indexed by owner/exercise/completion. Return best-current metrics and, where shown, compare a historical session against preceding eligible sessions, not against today's all-time best. Start without a stored PR cache to avoid stale records after corrections. Add materialized projections only after measuring the need. Test definitions before this feature is considered complete.

## Rest timer and notification experience

Rest time is device execution state, not a backend cron job. Store an end timestamp, timer identifier, session/set reference and scheduled-notification ID in the device draft. The screen displays `max(0, endsAt - now)`; do not rely on a JavaScript interval continuing in the background.

On completing a set, create the timer and schedule an OS local notification. Restart/extend/skip cancels or replaces the old alert. Cancellation and workout finish clean up alerts and the live surface. Notification taps open the correct workout. On app resume/restart reconcile the deadline, scheduled alerts and current server session. Expired timers display finished and never start again merely because the app reopened.

Include two complementary surfaces in MVP:

1. End-of-rest local notification with sound/vibration where allowed, using `expo-notifications`; no Supabase push infrastructure is required for a device timer.
2. Visible ongoing countdown: Android notification chronometer through a native adapter; iOS Live Activity through ActivityKit/WidgetKit and a widget extension on supported versions. These require native configuration and development builds. Do an early proof of concept on both physical platforms. Plain scheduled Expo notifications alone do not supply the whole live countdown experience.

Timer correctness and visible/ audible delivery are different: notification permissions, Focus modes, battery policies and Android exact-alarm access can affect delivery. Handle denial with an in-app countdown and clear settings affordance. Request exact-alarm access only if justified by the implementation and applicable distribution rules. Do not claim that Live Activity cleanup always executes at the precise deadline while the app is terminated; use OS-rendered time and verify stale/expired presentation on devices. Force-stop and reboot behavior must be tested and documented, not assumed to be guaranteed.

## Local Supabase, then hosted

Recommendation: develop against the real Supabase stack locally, not mocks; connect a hosted development/staging project early for physical-device and email-link testing. Docker and Supabase CLI are installed here; Docker responded with server version 29.1.3 and Supabase CLI with 2.101.0 during this analysis. The project stack itself has not been initialized or started.

Use the existing BabyBoo migration stream as the canonical shared source. Create a sanitized disposable copy with distinct project ID/ports for local start/replay; do not initialize a competing hosted history in Grind or reset the existing BabyBoo stack. Version new forward migrations/RLS/functions, test combined local replay and generate database types. Local authentication uses the disposable mail capture service for verification/reset links. See [M0 foundation decisions](decisions/M0_FOUNDATION.md).

To move to hosted: create/select a project, link it, apply reviewed migrations, deploy any Edge Functions and secrets, configure Auth email delivery and redirects, and change app URL/publishable key. Exercise seeds require an explicit deployment step; don't assume a schema push seeds them. Local users, sessions and workout data are not automatically migrated; create fresh hosted test accounts.

Simulators/emulators/physical phones need different local backend addresses; a phone cannot use the laptop's `localhost`. Use a reachable LAN address and check firewall/deep links. Hosted staging avoids dependence on the laptop for testers. Schema migration is portable; environment configuration still needs verification. Production remains separate from development and staging.

## Implementation order and acceptance

1. Scaffold Expo application and local Supabase, migrations, seed library, generated types and RLS tests. Add development builds for both native platforms.
2. Implement registration/verification/login/reset and owner-isolation tests. Prove timer alerts and live countdowns on physical devices early.
3. Build the vertical slice: start empty workout, add exercise, edit/complete sets, save, terminate/reopen, finish, see history. Cover dropped requests, duplicate retries and revision conflicts.
4. Add routines, custom exercises, previous performance, settings and conversion. Verify snapshots survive routine edits and exercise renames.
5. Implement and test PR definitions and history corrections; finish notification lifecycle and accessibility checks.
6. Deploy to hosted staging, repeat auth/RLS and iOS/Android end-to-end tests, and document launch commands and observed platform limitations.

MVP requires all listed functionality, not just the core vertical slice. Required checks: cross-user isolation including malicious child references; clean migration replay; command atomicity/idempotency; partial input recovery; expired auth during writes; no finish with unsaved edits; historical snapshots; kg/lb precision; PR eligibility/ties/corrections; timer background/lock/restart/permission denial and stale-alert cancellation on physical iOS and Android devices. Export/backup features are not acceptance criteria.

## Sources checked

- Supabase local workflow: https://supabase.com/docs/guides/local-development/cli-workflows
- Supabase React Native Auth: https://supabase.com/docs/guides/auth/quickstarts/react-native
- Supabase RLS: https://supabase.com/docs/guides/database/postgres/row-level-security
- Expo notifications: https://docs.expo.dev/versions/latest/sdk/notifications/
- Android notification chronometer: https://developer.android.com/reference/android/app/Notification.Builder
- Apple ActivityKit: https://developer.apple.com/documentation/ActivityKit
