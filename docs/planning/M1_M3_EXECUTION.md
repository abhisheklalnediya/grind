# Through-M3 implementation coordination

27 October 2026. User requested implementation through M3 with subagents and explicitly requested questions/blockers before implementation. Read-only architect, UI and reviewer preflights completed. User answered all three product questions: implementation is now in progress; milestone acceptance is not yet claimed.

## Product answers recorded

1. Include all four load modes now: external weights, bodyweight reps-only, assisted (positive assistance separately), weighted bodyweight (added external load only, no inferred body mass). Assistance never counts as ordinary lifted load.
2. Previous performance: approved latest completed noncancelled workout for the same stable exercise/load convention/mode, matched by working/warm-up ordinal separately; do not prefill completion.
3. Appearance default: approved System default with explicit Light/Dark override. Light palette needs its own contrast-safe accent/text tokens, not lime text on white.

These questions were answered before feature implementation. Numeric precision/bounds, SQL structures and library choices are technical contracts to document and test, not an unnecessary user questionnaire. Preserve entered decimal values/units and authoritative exact canonical conversion.

## Established boundaries

Continue local-first, current shared canonical migration stream, provider calls disabled and planned M8 standalone separation. iPhone signing/toolchain deferral is already agreed; do not reopen it as a prerequisite for local feature code or claim it verified. M5 PR/corrections/deletion, M6 media and hosted deployment remain outside through-M3 implementation scope. Native timer feasibility carried from M1 and physical-device acceptance must remain explicit rather than silently declared complete.

## Existing internal work/gates

Fresh preflight: typecheck/lint pass; all17 suites/29 tests pass, but coverage fails adopted thresholds (70.83% statements,70.90% branches,63.63% functions,74.87% lines). Three Python harness-safety tests pass. No new database/native/provider operations ran during preflight.

Existing BabyBoo SQL-engine baseline crash, physical Android Auth/timer evidence and iPhone deferral are recorded in AGENT_STATUS.md. They are not requests for more user requirements. Resolve/track them separately while preserving data isolation; never weaken tests or mark partial evidence as complete.

## Agent waves in progress

Maximum four active agents includes coordinator. Rotate bounded assignments through these lanes; do not start every lane at once or overlap shared files. Exact filenames/migration timestamps are assigned and logged before each task starts.

| Lane | Owner and allowed-path boundary | Acceptance and verification |
| --- | --- | --- |
| Contracts/backend | Architect reviews; one backend developer owns new forward migrations/tests in BabyBoo's canonical stream and bounded scripts/backend integration tests | Transactions/receipts/revisions, owner checks, one active session, routine versions, snapshots and custom-exercise scope; disposable replay + dedicated SQL/HTTP concurrency checks |
| M1 quality debt | Quality developer owns explicitly assigned existing Auth/service tests, new Verify/Settings tests and integration cases; coordinate existing screen ownership before edits | Restore every-module mapping and actual coverage gates without exclusions/threshold reductions; typecheck/lint/test:coverage |
| Appearance/shared primitives | Theme developer owns src/theme/**, src/components/** and their tests; coordinator owns root provider/route integration | Agreed System/Light/Dark behavior, persisted scoped preference, semantic colors, contrast, state/draft preservation and theme tests; source changes in existing screens assigned sequentially |
| Domain/API/durable drafts | Domain/recovery developer owns new src/domain/workouts/**, src/services/workouts/** and drafts modules; generated src/types/database.ts remains integrator-owned | Validated commands, original units, stable IDs, bounded durable raw text, serialized replay, auth/conflict recovery; pure/service/queue tests with critical100% branches |
| Catalog/custom | Exercise developer owns new src/features/exercises/**, src/domain/exercises/**, src/services/exercises/** | Library filters, picker retained selections, custom create/edit/archive, parent return context, ownership and historical references; direct tests + local API cases |
| Workout/History | Workout developer owns new src/features/workouts/**; History developer later owns src/features/history/** and service/domain/history files | Start/log/complete/finish/cancel, timestamp countdown, unsaved/invalid finish guards, recovery, snapshot History/cursor pagination; integration/behavior tests and Android build/device evidence |
| Routines/preferences/previous | Training developer owns new src/features/routines/** and domain/service/routines files; settings edits assigned after theme/quality ownership released | Versioned templates/order/types/targets/rest/notes, stable historical snapshots, exact Previous contract and unit changes; direct/integration + local transaction tests |
| Independent review | Reviewer reads scoped diffs/contracts and runs feasible checks, without editing implementation | Cross-user refs, replay/lost response, revisions, account switching, archival snapshots, unit precision, theme accessibility and truthful native evidence |

Shared app routes/layouts/providers, query-key factories, generated types, package/build config and shared component files have one designated integrator at a time. Contract-dependent lanes wait for reviewed interfaces. M3 routine/History screens follow stable M2 data/recovery contracts.

## Handoff

Each task records scope, dependencies, exact owned paths, acceptance and commands/results in TASKS.md. Coordinator integrates and updates AGENT_STATUS.md, coverage mapping, setup and affected specs. Completion through M3 requires the agreed behavior and quality gates; open physical/engine/toolchain checks are explicitly carried as unverified, never labelled passed. No hosted or provider operation is implied by local milestone authorization.
