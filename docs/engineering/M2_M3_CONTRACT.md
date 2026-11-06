# M2–M3 training contract

## 3 November 2026 — set-type extension

Forward GRIND migrations extend storage to accept `warmup|working|drop|failure|rest_pause` while preserving existing values. The user selected only `warmup|working|drop|failure` for the selector; `rest_pause` is retained solely for compatibility with any earlier local data and is not offered as a new choice. Previous-performance ordinals remain partitioned by exact type. The client queries `get_supported_set_types()`, filters out `rest_pause`, and falls back to warm-up/working when the backend lacks the RPC, so newer types are not offered against an older server. A type change on a completed set clears completion and its associated timer through the existing upsert semantics; the UI confirms this. No M5 record-eligibility policy is changed: current summary working-set counts retain their existing definition. Deployment of the migration to hosted GRIND requires separate authorization.


27 October 2026. Frozen coordination contract accepted by coordinator after user answers. Local-only implementation; no provider/hosted work. API names/keys below are shared across SQL, services, durable drafts and native features. Domain schemas live in `src/domain/training/`; generated database types remain integrator-owned.

## User decisions and numeric interpretation

Four `load_mode` values: `external`, `bodyweight`, `assisted`, `weighted_bodyweight`. External is entered external load; bodyweight stores reps and null load; assisted stores a positive assistance value, never ordinary lifted volume; weighted bodyweight stores only added external load, not inferred body mass. Mode and load convention qualify comparisons. Catalog `load_mode` is the default; adding a workout exercise explicitly chooses its mode and preserves the catalog name/convention snapshot.

Entered load is a decimal **string** with at most three decimal places, no exponent/sign/whitespace, range 0–100000 entered kg/lb (assistance strictly positive). Preserve source text/value and unit. SQL derives authoritative decimal canonical kg using `1 lb = 0.45359237 kg`; JS display conversion never rewrites source. Reps are integers 1–10000. Incomplete set fields may be null; invalid/partial raw text belongs only in the durable editor draft. Bodyweight load must be null.

Names: trimmed, 1–80 characters. Muscle/equipment/category: trimmed 1–40; convention1–80. Notes maximum2000. Rest seconds integer15–3600, default120. At most100 exercises/session or routine and100 sets/exercise. Positions and per-type ordinals are zero-based. UUIDs are client-generated once for operations, exercises-in-workout/template and sets; retry preserves them. Dates are UTC timestamp strings; session timezone is a valid IANA zone captured at start.

## JSON representations

API uses snake_case. Every returned graph is complete and owner-filtered; no client-supplied owner grants authority. Object IDs refer to graph rows unless explicitly called `exercise_id` for catalog identity.

```text
CatalogExercise {
 id, origin: grind|custom|provider, owner_id: uuid|null,
 name, primary_muscle, equipment, category, load_convention,
 load_mode, archived_at: timestamp|null, created_at
}
WorkoutSession {
 id, status: active|completed|cancelled, name, started_at,
 finished_at: timestamp|null, timezone, revision: integer>=0,
 source_routine_id: uuid|null,
 exercises: [{ id, exercise_id: catalogUUID, position, name,
   load_convention, load_mode, notes, rest_seconds,
   sets: [{ id, position, set_type: warmup|working|drop|failure (plus preserved legacy rest_pause),
     entered_load: decimalString|null, entered_unit: kg|lb,
     reps: integer|null, completed_at: timestamp|null }] }]
}
Routine {
 id, name, version: integer>=1, archived_at: timestamp|null,
 exercises: [{ id, exercise_id: catalogUUID, position, load_mode,
   notes, rest_seconds, sets: [{ id, position, set_type,
     entered_load: decimalString|null, entered_unit, reps: integer|null }] }]
}
```

Routine save payload is `{name,exercises:[...]}` with the same stable nested IDs/fields, excluding server `id/version/archived_at`. Catalog custom-save payload is `{name,primary_muscle,equipment,category,load_convention,load_mode}`. No provider content or owner fields are accepted. SQL may return extra canonical fields; client projection does not trust extras.

## RPC names, parameters and returns

All RPCs use `.schema('grind')`. Mutation receipts and changes commit atomically. Repeated operation ID plus identical command/parameters returns its stored result even if a later command changed the graph; a different payload fails. All mutations are membership-gated; completed setup is required for training data.

| RPC                        | Parameters                                                                               | Return                                                                                      |
| -------------------------- | ---------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------ | ------------------------------------------------------- | ------------------------------------------------- |
| `start_workout`            | `p_operation_id uuid`, `p_routine_id uuid                                                | null`default null,`p_timezone text` default UTC                                             | WorkoutSession; empty starts name Workout, routine starts snapshot its name/template |
| `apply_workout_command`    | `p_operation_id uuid`, `p_session_id uuid`, `p_expected_revision int`, `p_command jsonb` | WorkoutSession                                                                              |
| `finish_workout`           | `p_operation_id`, `p_session_id`, `p_expected_revision`                                  | completed WorkoutSession                                                                    |
| `cancel_workout`           | same three parameters                                                                    | cancelled WorkoutSession                                                                    |
| `get_active_workout`       | none                                                                                     | WorkoutSession or null                                                                      |
| `get_workout`              | `p_session_id uuid`                                                                      | WorkoutSession; unauthorized/missing returns FORBIDDEN                                      |
| `list_workout_history`     | `p_before_finished_at timestamp                                                          | null`default null,`p_before_id uuid                                                         | null`default null,`p_limit int` default30, range1–100                                | `{items:WorkoutSession[],next_cursor:{finished_at,id}   | null}`; completed only, descending finished_at/id |
| `save_routine`             | `p_operation_id uuid`, `p_routine_id uuid                                                | null`, `p_expected_version int                                                              | null`, `p_template jsonb`                                                            | Routine; new version1, update requires expected version |
| `archive_routine`          | `p_operation_id uuid`, `p_routine_id uuid`, `p_expected_version int`                     | archived Routine                                                                            |
| `list_routines`            | none                                                                                     | unarchived Routine[] ordered name/id                                                        |
| `get_routine`              | `p_routine_id uuid`                                                                      | owner Routine; unauthorized/missing FORBIDDEN                                               |
| `save_custom_exercise`     | `p_operation_id uuid`, `p_exercise_id uuid                                               | null`, `p_payload jsonb`                                                                    | CatalogExercise; update only caller custom, preserve identity/history                |
| `archive_custom_exercise`  | `p_operation_id uuid`, `p_exercise_id uuid`                                              | CatalogExercise with archived_at; no hard delete                                            |
| `get_previous_performance` | `p_exercise_id uuid`, `p_load_mode text`, `p_load_convention text` default null                                                 | `{session_id,finished_at,sets:[{set_type,ordinal,entered_load,entered_unit,reps}]}` or null |

Catalog browsing uses RLS-protected exercises SELECT, excluding archived definitions for new selection; never load provider data. Historical references remain readable. Previous uses the latest completed noncancelled session with the same stable catalog exercise ID, chosen mode and **requested workout snapshot load convention**. Native callers pass the active exercise snapshot convention explicitly. Omitted/null convention retains the current catalog convention for legacy callers; changing a custom definition must not change the comparison convention of an already active workout. Match ordinals separately for each exact set type, including preserved legacy rest_pause, flattened by exercise position/set position if the exercise occurred more than once. Include only completed eligible sets for that mode; unmatched ordinals show no Previous value. Previous is displayed only, never a completed prefill.

## Workout command payloads

All commands are discriminated by `type`, with strict allowed fields. Client IDs are stable across retries. Reorder commands are full permutations, not partial reorder patches.

```text
{type:'rename_workout', name}
{type:'add_exercise', id, exercise_id:catalogUUID, position,
 load_mode, notes, rest_seconds}
{type:'update_exercise', exercise_id:workoutExerciseUUID, notes, rest_seconds}
{type:'remove_exercise', exercise_id:workoutExerciseUUID}
{type:'reorder_exercises', ids:workoutExerciseUUID[]}
{type:'upsert_set', exercise_id:workoutExerciseUUID,
 set:{id,position,set_type,entered_load,entered_unit,reps}}
{type:'remove_set', exercise_id:workoutExerciseUUID, set_id}
{type:'reorder_sets', exercise_id:workoutExerciseUUID, ids:setUUID[]}
{type:'complete_set', exercise_id:workoutExerciseUUID, set_id, completed:boolean}
```

Add/insert accepts position0..current length. Removing/reordering compacts positions. A changed existing set input/type clears its completion; unchanged retries do not create duplicates. Completion validates values for the exercise mode and uses server time. Uncompletion clears completion. Mode is fixed on the session exercise; changing it means remove/re-add explicitly, preserving historical interpretation.

Every active-workout mutation locks/validates the session, checks expected revision and increments revision once. Start guarantees one active session per owner; when one exists, return that session rather than creating another (including different operation IDs), recording the result. Finish requires at least one completed set, no incomplete/invalid sets and no empty exercises; client must explicitly remove incomplete/empty rows or return to logging. Finished/cancelled graphs cannot be changed by active commands. Routine edits never change existing sessions. Raw DML cannot bypass commands.

## Error contract and recovery

SQLSTATE `42501` with message prefix `FORBIDDEN` means unauthenticated/nonmember/not-owner access. `23514` with `VALIDATION` means invalid values/payload/receipt reuse. `PT409` (HTTP 409; deliberate stale-revision conflict) with `CONFLICT` means stale revision/version. Transport/network errors remain retryable; Auth/validation/conflict failures need deliberate user action. Client maps these to safe messages and never displays raw SQL.

Durable editor state is scoped by backend origin/account/workout and contains raw strings plus pending commands/operation IDs. It serializes commands; stale revision retains raw input and stops replay for review instead of silently rebasing. Server-acknowledged values may reload on any signed-in device; pending raw input stays on this device. Finish requires every pending mutation acknowledged. Account-switch/sign-out handling follows the specified warn/discard flow; expiration must retain same-account drafts.

## Verification

Critical domain validation/conversion/previous rules require100% branches and behavioral tests. SQL/API checks cover cross-user references, direct-write bypass, one-active concurrency, atomic receipt replay/different-payload rejection, lost responses, stale revisions, routine conflicts, archived references, snapshots and exact canonical values. UI tests cover four modes, unmatched Previous rows, raw partial drafts, unfinished/unsaved finish guards and unit changes without source rewrites. Native evidence remains separate.

## Domain implementation evidence

The frozen public domain API is exported from `src/domain/training/index.ts`: `sessionSchema`, `routineSchema`, `exerciseSchema`, `previousSchema`, `historyPageSchema`, `workoutCommandSchema`, `routinePayloadSchema`, `customExercisePayloadSchema`; types `TrainingSession`, `TrainingRoutine`, `TrainingExercise`, `TrainingSet`, `LoadMode`, `WeightUnit`, `WorkoutCommand`, `RoutinePayload`, `CustomExercisePayload`, `PreviousPerformance`; helpers `parseLoadInput`, `isSetCompleteable`, `toCanonicalKg`, `displayLoad`, `loadFieldLabel`, `previousForSet`.

Executed: TypeScript check and domain ESLint pass. Five domain suites / ten tests pass, with focused domain coverage at100% statements/branches/functions/lines using a stricter100% focused CLI threshold (repository gates were not edited or weakened). Tests cover all four load modes, partial/invalid text, exact bounded decimal conversion, unit-preserving display, graph/input validation, bodyweight/assistance/completed-set invariants, all command payload variants and separate Previous ordinals. `index.ts` is a re-export-only public entry point with no executable behavior.

This does not claim whole-repository coverage, SQL/RLS behavior or native/device acceptance. Schema output projections ignore extra server-owned fields while strict mutation payloads reject extra authority-bearing fields. SQL remains responsible for actual membership, ownership, transaction/revision/receipt checks, timezone validity and graph-order invariants.

## Proposed measurement extension — local integration in progress

The user approved a separate `tracking_type`: `reps`, `duration`, or `distance_duration`. Legacy records and payloads default to `reps`. Duration is entered as whole seconds (1–86400); distance preserves an entered decimal (up to three decimal places) and `km` or `mi`, while the server stores canonical kilometres. Complete duration sets require duration; complete distance-duration sets require both duration and distance. Tracking type is snapshotted for routines and workouts and participates in Previous matching. Timed/distance sets do not contribute to strength volume. Weighted timed exercises are not yet supported by this contract and must not be classified as supported automatically. These changes are under integration; see the task tracker and build status for verification and migration state.
