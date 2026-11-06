# M4/M5 MVP completion proposal

**Status: proposal for review. No implementation or database operation is authorized by this document.** This proposes local-only, additive GRIND work for the deferred M4 rest experience and M5 records, corrections, and GRIND data controls. It follows [architecture](../ARCHITECTURE.md), [milestones](../IMPLEMENTATION_MILESTONES.md), [MVP pages](../MVP_PAGES.md), and the standalone boundary in [Supabase setup](../../supabase/README.md). The HTML prototype remains illustrative.

## Existing foundation and limits

- The current training draft persists a timer deadline, session/set identity, and timer identity. The workout UI already supports deadline-based in-app countdown, extension, restart, skip, and recovery. These are local app behaviors, not OS notifications or a native live countdown.
- Settings and exercise snapshots already carry rest seconds. There is no notification adapter, permission/status preference, records API, correction command, deletion command, or corresponding production screen flow.
- Training RPCs use owner checks, operation receipts, session revisions, and transactional commands. Completed-session commands are not available through the active-workout command path. Set contracts already include reps, duration, and distance; historical snapshots preserve exercise identity and load convention.
- The schema is GRIND-owned and standalone. Any implementation uses additive migrations under `supabase/migrations/`, GRIND-owned local test resources, and GRIND configuration only. This proposal does not authorize hosted migration/deployment, hosted fixtures, or access to any other app's source, credentials, database, or local stack.

## Recommended product and API contracts

These are the smallest coherent defaults that satisfy current specifications. Choices labeled **Approval needed** require user approval before feature implementation; they do not block read-only design or local contract tests.

### M5 records

1. Compute records from source workout rows in owner-scoped SQL functions; do not add a stored record cache in this milestone. Recompute on read, so corrections cannot leave stale bests.
2. Eligible rows are completed working sets in completed workouts. Exclude warm-ups, incomplete sets, and cancelled workouts. Partition by exercise UUID, captured load convention, and load mode; never mix incompatible conventions or modes.
3. For external-load and weighted-bodyweight sets, expose three record families, partitioned by load mode and convention: highest canonical kg load; most reps at each exact canonical kg load; and highest single-set volume (`canonical_kg × reps`). The reps record is keyed by normalized load, not an unconstrained reps-only maximum. Normalize loads using existing exact decimal conversion before comparisons. Equal values are ties, not a new record. The first eligible performance is a baseline. For historical workout summaries, compare that workout only with eligible sessions completed before it; do not compare historical results to today's all-time best.
4. For bodyweight and assisted modes, expose reps-only bests, separately labeled by mode. Do not calculate loaded volume or claim assisted load is unassisted strength. For weighted-bodyweight, canonical load and volume refer only to the entered added load; never infer body mass or total system weight.
5. Timed/distance exercises continue to show their existing history and previous values. They do not enter these weight/repetition records.

**Proposed read interfaces:** `get_exercise_records(exercise_id, load_mode, load_convention)` returns current best values, display units sourced from original set entries, and the winning workout/set references. `get_workout_record_summary(session_id)` returns eligible values and whether each was a baseline, tie, or new best as of that session's completion. Both derive identity from `auth.uid()`, validate arguments, and return bounded results. Exact JSON field names should be fixed in the migration/API contract before implementation.

**Approval needed:** confirm whether Records should show only the three specified external/added-load metrics and the separate reps-only bodyweight/assisted metrics, with no estimated 1RM. This is the architecture's proposed starting set, rather than an extension.

### M5 completed-workout correction

1. Add `correct_completed_workout(operation_id, session_id, expected_revision, correction)` as a separate transactional RPC. It validates caller ownership, requires `status='completed'`, checks revision, serializes on the session row, and uses the existing owner-scoped operation receipt pattern. An identical retry returns the stored result; reuse of an operation ID with a different payload fails.
2. Recommended v1 correction surface edits existing workout name and existing exercise/set contents: exercise notes/rest; set type, entered load/unit, reps, duration, distance/unit, completion state, and order. Permit adding/removing/reordering sets and exercises using the same bounds and measurement validators as active commands. Completion is a boolean correction; the server sets or clears `completed_at` and the client cannot supply an arbitrary timestamp. Preserve captured exercise UUID/name/load convention/load mode/tracking type; do not retarget a historical row to a different catalog identity. Preserve the original session start/finish timestamps and timezone in v1. Routine templates are never changed by a history correction.
3. Validate the entire correction before committing any changes. Write all changes, increment the workout revision once, and return the refreshed complete session graph plus recomputed record summary in one transaction. Invalid input or a stale revision leaves all rows untouched. Correcting a session so it no longer contains an eligible set must remove its former record contribution on the next derived read.
4. Keep `apply_workout_command` restricted to active workouts. Do not add raw client DML or overload `finish_workout` for history edits.
5. The editor has explicit Edit, Save, and Cancel states; unsaved exit requires a choice. A conflict loads the latest server version while retaining the local correction draft for review. The client invalidates history, workout detail, exercise history, and record queries only after server acknowledgement.

**Approval needed:** confirm whether v1 should allow only editing existing rows or also add/remove/reorder historical sets/exercises. Recommendation is to allow bounded structural edits because they are necessary to correct omitted/duplicate entries, while freezing exercise identity and timestamps to reduce historical reinterpretation. If narrower scope is preferred, omit structural edits from both UI and RPC.

### M5 GRIND-only deletion

1. Provide one authenticated `delete_grind_data()` server function. It accepts no user ID or table names; derives the caller only from `auth.uid()`, requires an existing Grind membership, and deletes only that membership row. The deletion implementation must remove that member’s Grind settings, routines, custom exercises, workout history and command receipts in an order compatible with all foreign keys. Verify the actual cascade and reference graph in disposable tests; do not assume a single membership deletion is sufficient. Use a fixed empty search path, fully qualified object names, narrow execute grants, and a transaction. Do not delete or modify the Supabase Auth identity.
2. Keep application roles from directly deleting membership or user rows. Verify cascade behavior in a GRIND-owned disposable local Supabase stack, including that another member and their data survive. Verify that the Auth user remains and no other project or app resources are accessed.
3. UI copy names exactly what is removed: the user's GRIND settings, custom exercises, routines, workouts, and GRIND membership. The account identity is retained. Require an explicit destructive confirmation. On success only, clear GRIND query caches, drafts/outbox and timer state, sign out the local session, then show the signed-out state. Prevent the account-join flow from recreating membership between acknowledgement and sign-out. On server failure, keep local state and offer retry.
4. If an active workout has pending edits, first explain that those local unsent edits will also be discarded if the user continues. Never silently erase them before the deletion succeeds. Local cleanup after success is idempotent and keyed to the GRIND account/environment.

**Approval needed:** choose whether deletion requires recent password reauthentication in addition to explicit confirmation. Recommended v1 is an explicit confirmation and current authenticated session; add reauthentication only if the coordinator's security review finds session age insufficient, because a second Auth flow adds failure modes and is not currently specified as mandatory. The GRIND-only deletion boundary itself is already established and must not be expanded into Auth-user deletion.

### M4 timer and native lifecycle

1. Treat the existing persisted deadline as authoritative. The native adapter consumes a timer identity, deadline, owning session/set, and desired duration; it does not own workout persistence or run a background JavaScript countdown. `src/notifications/` or `modules/rest-timer/` may hold permission, scheduling, routing, reconciliation, and OS-surface adapters, consistent with engineering standards.
2. Completing a set with rest alerts enabled schedules one end-of-rest local alert and starts the supported OS countdown surface. Request permission contextually when the user enables alerts; if denied, keep in-app countdown and expose the system Settings route where available. Preserve permission as OS state; any app preference is a separate user choice to enable/disable alerts.
3. Every timer update is a replace operation: extension, duration adjustment, restart, or completion of another set cancels the previous scheduled alert and countdown before publishing the new timer identity/deadline. Skip, uncompletion of the associated set, workout finish/cancel, sign-out/account switch, GRIND data deletion, or detection that the owning workout/set is no longer current cancels both surfaces. Persist identifiers before reporting successful scheduling where the OS API permits; reconcile again on foreground/restart and discard stale IDs/deadlines.
4. Notification tap routes to the owning active workout only if that session still exists and belongs to the signed-in member. Otherwise open Train and show no stale workout. Expired deadlines display finished in-app and do not reschedule on reopen.
5. Keep platform-specific native configuration and code under one platform owner per file. Expo scheduled local notifications can provide the alert, but do not alone fulfill the documented countdown surface: Android needs a native chronometer surface; supported iOS requires ActivityKit/WidgetKit integration. Unsupported OS versions use the in-app fallback and state that limitation accurately. No push service or backend timer is needed.

**Approval needed:** confirm that end-of-rest alerts and platform-supported visible countdown surfaces remain required M4 acceptance, as currently specified. Any platform where native integration is unsupported must have a documented fallback and must not be reported as full M4 acceptance.

## Ownership and proposed interfaces

| Workstream | File ownership (proposed) | Main interface / responsibility |
| --- | --- | --- |
| Contract and migration | Coordinator/backend developer: new GRIND migration, `supabase/tests/**`, `src/types/database.ts` | SQL functions, constraints/validation, grants, derived record responses, correction RPC, deletion RPC; generated database types |
| Record domain/API | Developer: `src/domain/training/**`, `src/services/training/**`, focused tests | Zod request/response validation and typed wrappers for record reads, correction and delete |
| Records/correction screens | Developer: `src/features/history/**`, `src/features/exercises/**`, `src/features/shell/**` and colocated tests | Read server results, edit correction drafts, show acknowledged updates and destructive confirmation |
| Timer adapter | One developer owns `src/notifications/**`, `modules/rest-timer/**`, config/plugin/package and platform native files | Permission, scheduling, replacement/cancel, notification routing, deadline reconciliation, Android countdown and iOS live surface |
| Integration and task evidence | Coordinator owns `docs/planning/TASKS.md`, `docs/AGENT_STATUS.md`, `docs/BUILD_STATUS.md`, affected specs | Review decisions, one-owner coordination, local integration and honest native/backend evidence |
| Independent review | Reviewer read-only until findings returned | SQL ownership/atomicity, correction/record invariants, deletion isolation, lifecycle cleanup, accessibility and test evidence |

Routes remain thin. UI calls feature hooks; hooks call typed services; services validate through domain contracts; SQL remains authoritative for eligibility, ownership, correction and deletion. All executable modules and components require meaningful tests under current GRIND gates.

## Staged local-only sequence

1. **Review contracts.** Coordinator records approvals above and locks exact JSON contracts and UI copy in the owning specs. Keep M4 native file ownership separate from M5 SQL/editor ownership.
2. **M5 backend slice.** Add an additive migration and GRIND SQL regression cases. Verify clean local replay, eligible records, mixed-unit ties, load-convention/mode partitioning, historical cutoff, correction validation/rollback/revision/idempotent replay, record removal after correction, direct-DML denial, deletion cascades, and two-member isolation. No hosted link/push.
3. **M5 app slice.** Generate/review local types, add Zod/service contracts, query invalidation, Records surfaces, correction editor, and deletion flow. Test offline/error/conflict/unsaved states and account-scoped local cleanup. Run GRIND app quality gates and independent code/security review.
4. **M4 adapter proof.** Check official current Expo/platform APIs and dependency compatibility. Implement permission/schedule/replacement/cancel/tap routing and deadline reconciliation first; then platform countdown surfaces under one native owner. Rebuild development binaries after native/config changes.
5. **Acceptance and evidence.** Execute the device matrix on physical Android and iOS: foreground/background/lock, permission allowed/denied, process termination/reopen, replacement/skip/uncompletion/finish/signout, stale notification taps, expired presentation, force-stop and reboot observations. Record device/OS, OS restrictions, unsupported versions and fallback. Run all required app tests/coverage and local database/RLS suites; independent review closes findings. Hosted rollout, if later desired, requires a separate explicit authorization and its own migration review.

## Acceptance gates

- Records are server-derived, owner-scoped and deterministic for eligibility, normalized load, exact ties, baseline and historical cutoff. Corrections change or remove derived records without stale cache behavior.
- A stale/foreign/active workout cannot be corrected; an invalid multirow correction is atomic; retried operations cannot duplicate or fork edits.
- Grind deletion removes only caller-owned Grind rows, preserves Auth identity, rejects other-member access, and leaves no local Grind draft/timer/cache after acknowledged success. Failure leaves recoverable local state.
- Timer OS work follows the saved deadline and current timer identity; each lifecycle exit cancels stale alert/countdown state. Permission denial and unsupported OS versions preserve usable in-app behavior.
- Every new executable app module/component has meaningful tests. Run typecheck, strict lint, full Jest and required coverage thresholds; run the GRIND-owned local migration/RLS/API suites. Native/device and local SQL evidence are recorded separately; no JS export or mocked test stands in for them.

## Explicit exclusions

No Auth identity deletion, other-app files/data/migrations/local stacks, hosted schema or data changes, deployment, paid provider work, push infrastructure, export/backup UI, PR cache, estimated 1RM, retrospective exercise identity remapping, workout timestamp editing, or promise of guaranteed OS alert delivery.
