# GRIND live task tracker

Task status/assignment owner: coordinator. Milestone evidence and environment limitations live in [agent status](../AGENT_STATUS.md); requirements/sequence in [milestones](../IMPLEMENTATION_MILESTONES.md). A documented task is not authorization to implement an unapproved milestone.

## Current work — 28 October 2026

Current build/check evidence and acceptance limits: [BUILD_STATUS.md](../BUILD_STATUS.md). Core M0–M3 workflows and automated/local gates pass; workout/Train design alignment and native acceptance remain open.

| Task | Owner / allowed paths | State | Acceptance / next step |
| --- | --- | --- | --- |
| M0–M3 domain/command contracts | Architect/Previous specialist: domain/training, contract, canonical new training migration | Verified | Four modes, decimal/source preservation, snapshot Previous and API argument contract tested |
| Foundation/Auth quality remediation | Quality specialist: Auth tests, Jest/CI and route mapping | Verified | Global/critical gates pass without exclusions or reduced thresholds;29route cases mapped |
| Training backend/local API | Backend specialist + independent reviewer: new BabyBoo forward migrations/tests, scripts/backend | Verified | Final disposable replay, dedicated SQL and real Auth/API pass; full BabyBoo baseline remains separate |
| Durable recovery/provider | Recovery/quality specialists; coordinator integration: outbox/projection/training provider | Verified | Terminal receipts, blank/text drafts, initial/foreground retry, account/key isolation, conflicts and timers have regression coverage |
| Catalog/custom/routines | UI specialists + coordinator: features/exercises, routines, preferences | Implemented | Software tests/review pass; native editor/picker/appearance acceptance pending |
| Workout/History | UI specialist + designer/coordinator: features/workouts, history | In progress | Core logic tested; approved compact rows, elapsed time, top-bar Finish and keyboard controls remain; actual native journey pending |
| Train design alignment | Designer/developer: features/home | Todo | Show actual recent sessions alongside start/routines and preserve error/empty states |
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
