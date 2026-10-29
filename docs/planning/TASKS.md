# GRIND live task tracker

Task status/assignment owner: coordinator. Milestone evidence and environment limitations live in [agent status](../AGENT_STATUS.md); requirements/sequence in [milestones](../IMPLEMENTATION_MILESTONES.md). A documented task is not authorization to implement an unapproved milestone.

## Enabled exercise selection and list visibility — 29 October 2026

**Implemented, local only:** Add Exercise and All Exercises now filter to enabled/configured records using the existing `is_configured` flag; unconfigured RepDB rows no longer appear. User approved Barbell, Smith Machine, Dumbbell and EZ Curl Bar for weight-and-rep logging. Local counts: 204/701 selectable (76, 19, 88 and 21 respectively), 497 remain unavailable, and zero other equipment is configured. Conventions are distinct: Total barbell weight, Smith machine displayed weight, Weight per dumbbell, Total EZ-bar weight. No new boolean/schema column was needed. Typecheck, lint, coverage (57 suites/306 tests), Android/iOS JS exports, focused picker/library tests (29), Grind SQL suite and authenticated local API smoke pass. Native UI acceptance remains Todo; no hosted changes.

## RepDB barbell and Smith machine selection — 29 October 2026

**Implemented, local only (earlier checkpoint):** At the user's direction, active RepDB entries with equipment `Barbell` or `Smith Machine` were enabled for external-load/repetition logging. These now form part of the 204 enabled entries summarized above. The existing bench-press UUID and convention remain unchanged.

## Local RepDB page import — 29 October 2026

**Implemented, local only:** Imported 701 RepDB-linked pages with unique GRIND UUIDs. Preserved the referenced bench-press UUID and archived the other six seed rows. After the approved equipment batches, 204 entries are configured and 497 remain unavailable pending further review. The app and server reject workout selection for unconfigured rows. A repeated import and local SQL counts verify identity and idempotence; native acceptance, remaining logging configuration, weighted timed support and release rights review remain open. Tests and build evidence: [build status](../BUILD_STATUS.md).

## Catalog consolidation and measurements — 29 October 2026

User requested replacing the existing server seed catalog with RepDB, avoiding duplicates, and adding duration and distance tracking. Coordinator owns integration and documentation; backend and reviewer agents inspected the existing contracts. Implementation remains **In progress**: measurement contracts and explicit source-link UI exist; seven catalog forward migrations are applied to the isolated local database without a reset; all 701 source records are imported; six seeds are archived and bench press is mapped to RepDB. The user's approved equipment batches configure 204 entries; 497 remain unavailable. The full source review is incomplete, including weighted timed exercises not supported by the current model; an idempotent import was rehearsed with synthetic classifications in a rolled-back transaction. Allowed paths: catalog tooling and tests, exercise/training app modules and tests, affected specifications, and new forward migrations/tests in the canonical BabyBoo stream. Preserve existing user data and unrelated changes.

Dependencies: GRIND references UUIDs while RepDB IDs are slugs; retain stable UUIDs and source mappings. The isolated local database has six archived seed rows and one active bench-press seed mapped to RepDB; its UUID is referenced by an existing workout and must be retained. Its disposable SQL snapshot was updated using the reviewed forward-only local migration workflow; do not reset it. RepDB includes timed stretches and cardio; duration/distance requires changes to workout and routine contracts, persistence, validation, recovery, history and UI before those exercises can be logged correctly. Replace the duplicate bundled/server presentation as part of integration.

Acceptance: idempotent reviewed import with unique source mappings; preserve referenced history/custom exercises; one selectable entry per global exercise; appropriate duration/distance and existing weight/repetition logging; scoped database/API checks and full app typecheck, lint, tests and coverage. No hosted operations are authorized.

## Catalog plan — 29 October 2026

Documentation updated: [catalog implementation plan](../EXERCISE_CATALOG_PLAN.md). C1–C6 remain partially in progress: rights/snapshot lock → additive schema → importer/storage → search/cache → UI/logging/credits → verification. The 701-page archive is imported locally, and 204 barbell/Smith/dumbbell/EZ bar entries are configured; other entries remain blocked pending reviewed semantics. RepDB Free is primary; supplementary images remain blocked pending rights evidence. No hosted operation or M6 acceptance is claimed.

## Exercise engine implementation — 29 October 2026

User authorized implementation. Local-only work; no hosted changes. One owner per path:

| Task | Owner / allowed paths | State | Acceptance / verification |
| --- | --- | --- | --- |
| Snapshot validator | ingestion specialist: scripts/catalog/** | Implemented | Immutable manifest, rights/input validation; Python unit tests; no network or publication |
| Catalog database | backend specialist: new canonical BabyBoo migration and SQL tests | Implemented | Additive metadata and bounded member-scoped search; disposable SQL replay/isolation checks |
| UI | UI specialist: src/features/exercises/** and tests | Implemented | Attribution and graceful media absence implemented; library retains prior path until migration rollout; focused Jest |
| API and integration | Coordinator: src/services/training/{api,transport} and tests; docs | Implemented | Validate bounded request/response, preserve existing commands and owner boundaries; full project gates |
| Independent review | Reviewer after integration | Implemented | Review security, compatibility and reported verification gaps |

## Bundled list — 29 October

The application now includes the licensed English dataset and flat images in the local Git index; public distribution remains subject to license review. The list and picker share exercise rows and show bundled RepDB previews; only server exercises can be selected. Device visual verification and unified server identity remain Todo.

| Task | Owner / allowed paths | State | Acceptance / next step |
| --- | --- | --- | --- |
| Local exercise engine and compact library | Coordinator, UI and engine specialists: `src/services/exercises/**`, `src/features/exercises/**`, catalog generator, Metro/Jest and Settings credits | Implemented | Browse 701 local records with generated image registry; verify taxonomy and cross-source identity, native/device behavior and release provisioning before acceptance |
| RepDB identity and server import | Coordinator | In progress | 701 entries imported with unique UUID links; complete logging configuration so imported exercises can be selected in workouts and routines |

## Downloaded archive — 29 October

| Task | Owner / allowed paths | State | Acceptance / next step |
| --- | --- | --- | --- |
| Archive inspection | Catalog specialist: scripts/catalog/** | Verified | ZIP hash, license, 701 records and 1,217 flat assets inspected; 7 Python tests |
| Archive browser | UI specialist: src/features/exercises/**, Metro/Jest/lint config | Implemented | Browse/filter/text details with attribution and absent-data fallback; no workout selection or image rendering yet |
| Reviewed import foundation | Backend specialist: new canonical 20261029185000/190000 migrations and SQL tests | Implemented | Disposable rollback tests pass; review mappings, load approved records and integrate server selection remain Todo |
| Import, storage and workout integration | Unassigned | Todo | Review exercise semantics, deduplicate seed identities, ingest approved content and implement media delivery; verify local end-to-end before considering hosted deployment |

## Current work — 28 October 2026

Current build/check evidence and acceptance limits: [BUILD_STATUS.md](../BUILD_STATUS.md). Core M0–M3 workflows and automated/local gates pass; workout/Train design alignment and native acceptance remain open.

| Task | Owner / allowed paths | State | Acceptance / next step |
| --- | --- | --- | --- |
| M0–M3 domain/command contracts | Architect/Previous specialist: domain/training, contract, canonical new training migration | Verified | Four modes, decimal/source preservation, snapshot Previous and API argument contract tested |
| Foundation/Auth quality remediation | Quality specialist: Auth tests, Jest/CI and route mapping | Verified | Global/critical gates pass without exclusions or reduced thresholds;29route cases mapped |
| Training backend/local API | Backend specialist + independent reviewer: new BabyBoo forward migrations/tests, scripts/backend | Verified | Final disposable replay, dedicated SQL and real Auth/API pass; full BabyBoo baseline remains separate |
| Durable recovery/provider | Recovery/quality specialists; coordinator integration: outbox/projection/training provider | Verified | Terminal receipts, blank/text drafts, initial/foreground retry, account/key isolation, conflicts and timers have regression coverage |
| Catalog/custom/routines | UI specialists + coordinator: features/exercises, routines, preferences | Implemented | Software tests/review pass; native editor/picker/appearance acceptance pending |
| Workout/History | m3_workout_design: features/workouts except RecoveryControls/FinishScreen | In progress | Compact rows, elapsed time, top-bar Finish and keyboard controls; preserve drafts and four modes; run targeted tests/lint |
| Train design alignment | train_recent: features/home/** | In progress | Show scoped recent sessions alongside start/routines; preserve error/empty states; run targeted tests/lint |
| Version-control baseline | Coordinator: GRIND files and four new BabyBoo migration/test files | Verified | Local GRIND baseline plus BabyBoo commit `2021d0f`; unrelated BabyBoo changes and ignored secrets excluded; GRIND remote not configured |
| Theme/runtime/routes | Coordinator/quality: app, theme/components, shell/home | Implemented | System/Light/Dark and scoped runtime tested; current Android binary compiled/installed/rendered; native visual matrix pending |
| Through-M3 independent review | Backend and final UI/recovery/runtime reviewers, read-only | Verified | Findings closed in assigned software scope; no physical/hosted sign-off inferred |
| Android full device journey | Developer/device reviewer: bounded app fixes only as findings require | Todo | Auth/setup → log → finish → History → restart/offline → sign-out/theme on current binary |
| Physical native timer/Auth proof | Developer + physical-device checks | Todo | Supported platform/version, permissions/lifecycle and keychain/PKCE evidence; production rest remains M4 |
| iPhone native build | User/toolchain dependent | Deferred | User requested pending signing/Xcode setup |
| Existing BabyBoo SQL engine regression | Separate local investigation | Blocked | Fix/retest baseline without rewriting historical migrations or touching production |
| Recovery controller decomposition | Architect/developer, later bounded task | Deferred | Documented494line cohesion exception; preserve serialization/race coverage in future split |
| M4–M8 | Later approved bounded tasks | Deferred | No automatic expansion beyond M3; M8 standalone Auth/data cutover requires reviewed plan |

## Required task handoff

For each assignment record scope, one owner per file, exact allowed paths, dependencies, observable acceptance and executable verification commands. Return changed behavior/files, results actually run, blocked/unverified checks and integration notes. Update this tracker during work; update AGENT_STATUS.md with milestone-level evidence at handoff.

Use Todo / In progress / Implemented / Blocked / Verified / Deferred precisely as defined in [maintenance](../MAINTENANCE.md). Current aggregate coverage debt is detailed in [test mapping](../engineering/TEST_COVERAGE.md); no quality pass is implied merely by adding CI.
