# GRIND live task tracker

## Current priorities — 6 November 2026

| Task | Status | Owner / next acceptance |
| --- | --- | --- |
| Android core journey and recovery | Todo | Coordinator/device tester: verify workout entry → finish → History → restart and interruption recovery without disturbing existing work. |
| iOS and physical-device acceptance | Deferred | Device tester: resolve the documented iOS toolchain/signing dependency, then test Auth, keyboard, accessibility, timer and recovery on both platforms. |
| M4/M5 rest, records, correction and deletion | Deferred | Coordinator/architect: review [completion proposal](MVP_COMPLETION_PROPOSAL.md) and agree required contracts before implementation. |
| Exercise catalog acceptance | In progress | Catalog owner: review remaining logging semantics, release/rights and native verification in [catalog plan](../EXERCISE_CATALOG_PLAN.md). |
| Hosted set types and release | Deferred | Coordinator: inspect migration history and obtain explicit hosted rollout authorization before any deployment. |
| Progression guidance and machine-specific history | Todo | Product/architect: define and validate selected product hypotheses before planning implementation. |
| Test warning cleanup | Todo | Test owner: investigate the intermittent VirtualizedList `act(...)` warning observed in the 6 November coverage run without hiding failures or reducing coverage. |

The [milestone roadmap](../IMPLEMENTATION_MILESTONES.md) gives the ordered plan. Current check results and blockers are in [build status](../BUILD_STATUS.md); page-level acceptance is in the [MVP checklist](MVP_CHECKLIST.md).

## Earlier task handoffs — historical

Entries below preserve scope and evidence at the time of each handoff. Their individual state labels may have been superseded by later entries or the current priorities above; they are not new authorization.

## Set-entry and set-type refinement — 3 November 2026

**Implemented locally; hosted rollout and native acceptance Todo — coordinator with UI, domain and SQL specialists.** User requested removing the per-row Next/Done buttons and a compact set-type selector, including Drop and additional kinds. User confirmed warm-up, working, drop and failure as the selectable labels; a previously introduced rest-pause value remains readable for compatibility but is not offered as a choice. Previous performance matches types separately. Record eligibility is not changed. Scope: workout/routine set UI and tests, shared selector, training contracts/services, an additive GRIND migration and local SQL tests, affected docs. Preserve drafts, units, existing options, active workouts and pre-existing work. New backend capability check falls back to warm-up/working on older servers. Local rollback-only SQL rehearsals and post-migration tests passed; both migrations are applied on the GRIND local stack. Hosted dry run lists the two set-type migrations; no hosted migration applied. Independent review and full app gates passed; native keyboard/accessibility/device review remains Todo.


## MVP checklist remediation — 1 November 2026

**Implemented for current UI slice; native acceptance and M4/M5 planning remain open — coordinator, exercise-detail and history specialists.** User requested all open checklist work. Current scope: EXERCISE-4 Overview/History presentation and shared controls under `src/features/exercises/**`/tests; HISTORY-2 saved timestamp in `src/features/history/**` and history screen integration tests; coordinator owns docs and integration. Preserve existing uncommitted work, account scope, server snapshots and deferred records semantics. Acceptance: focused tests, independent review, typecheck, lint, tests and coverage; device review separately. The [M4/M5 architecture proposal](MVP_COMPLETION_PROPOSAL.md) is ready for review before major implementation choices; no hosted or cross-app operations.


## MVP checklist and exercise-history correction — 1 November 2026

**Implemented; native acceptance Todo — coordinator and exercise-history developer.** Maintain [MVP check status](MVP_CHECKLIST.md) as the page/state acceptance view while this tracker owns assignment/status and build status owns evidence. Scope: checklist/index, exercise detail/history/RepDB UI and colocated tests; preserve real units, account-scoped pagination and current history contracts. Acceptance: timed/distance history and previous performance display saved measurements and match the correct tracking type; linked RepDB detail exposes existing history using the mapped server identity; focused tests, independent review, typecheck, lint and coverage. No hosted or native configuration changes.


## MVP page-by-page alignment — 1 November 2026

**In progress — coordinator and bounded Luna specialists.** All 21 prototype selector pages opened and compared with implementation source; detailed page disposition is in [review record](../reports/reviews/2026-11-01-mvp-page-alignment.md). Scope: current UI and colocated tests in history, routines, exercises, auth/settings and reusable components; preserve user data and existing draft/recovery behavior. History cards/empty state, saved summary, routine panels, picker scope, mapped exercise load convention and Settings recovery are implemented. Full native comparison and device verification remain Todo. Rest notifications (M4), records/corrections/deletion (M5), unified exercise-detail behavior and optional save-as-routine remain unfinished and require their own contracts rather than prototype simulations. Acceptance: typecheck, lint and complete coverage, independent review, then page/state device checks on supported appearances and platforms.


## Workout set-control follow-up — 1 November 2026

**Implemented; native acceptance Todo.** Coordinator owns workout set control and tests, with independent Luna review. Reuse a common set options control across repetition and timed rows, display distance units, retain existing validation and commands. Focused and full checks passed; inspect dark/light, narrow/large text, actual software keyboard, accessibility, iOS and physical devices before acceptance.


## Workout screenshot alignment — 1 November 2026

**Implemented; native acceptance in progress.** Coordinator owns set rows, shared button, status/elapsed and integration; Luna developer owned workout shell and screen tests; independent Luna reviewer checked implementation. Scope: `src/features/workouts/**`, shared Button/tests and affected status documents. Acceptance: preserve workout commands, set options and mixed-unit labels; match MVP hierarchy and completion states; pass typecheck, lint and coverage; review populated workout on Android/iOS, both appearances, narrow/large text, keyboard and accessibility. Android light-mode screenshot inspected; remaining device matrix is Todo.


## Auth request investigation — 1 November 2026

**In progress — coordinator.** Scope: auth screen and colocated tests; coordination/build documents. Removed eager sign-in/signup navigation before session verification and added a way to leave the waiting state. Acceptance: reproduce and resolve the reported generic request error, verify successful signup/login and provider-to-gate handoff on the current Android bundle, and run typecheck, lint and coverage. Existing request-error cause and native end-to-end acceptance remain open.


## Train design alignment — 1 November 2026

**Implemented — coordinator; native visual acceptance Todo.** Scope: `src/features/home/TrainScreen.tsx` and colocated tests; documentation in this tracker, agent status and build status. Match the MVP session card, routine cards and section actions while preserving server-backed lists, active recovery and error states. Acceptance: focused Train tests, typecheck, lint and full test/coverage gates; review on an authenticated Android and iOS device remains open.


## Authentication branding — 31 October 2026

**Implemented — coordinator with asset and auth specialists; device acceptance Todo.** Apply the selected lime GRIND concept to auth and related screens, and configure launcher assets. Automated checks are recorded in build status. Rebuild native binaries and verify auth layouts, accessibility and launcher icons on supported devices.

### Login review follow-up

**Implemented — coordinator and auth specialist; device and hosted verification Todo.** The form and flow changes below are implemented and automated checks passed; see [build status](../BUILD_STATUS.md). The concept board establishes the GRIND identity but does not specify a complete login layout.

| Stage | Scope and ownership | Acceptance |
| --- | --- | --- |
| Form usability | Auth specialist: `src/features/auth/**` and colocated tests; shared components only if needed | Reduce the lockup's vertical footprint; make Sign in the primary action and distinguish account creation and recovery; put an accessible show/hide control alongside the password field with a 48px target; provide field-specific, announced validation while preserving input. Check small screens and larger text. |
| Flow polish | Auth specialist: auth screens, validation and colocated tests | Use task-specific signup/recovery copy; handle navigation and stale responses during pending requests; support email-to-password and password-to-submit keyboard actions; replace technical user-facing errors with actionable language. Preserve existing auth and recovery behavior. |
| Device acceptance | Coordinator/device reviewer: native builds and verification evidence | Rebuild binaries for launcher assets; inspect login and related flows on Android and iOS, including small screens, keyboard, larger text, screen readers, light/dark appearance and launcher masks. Record device/OS, results and remaining gaps in build status. |

Run focused auth tests during implementation, then typecheck, strict lint and full tests/coverage at integration. Review changes independently and record results without treating automated tests as device acceptance. Design direction is captured in [design notes](../../design/DESIGN_NOTES.md).

#### Sign-in and signup flow improvements

**Implemented — coordinator and auth specialist; item 7 remains Todo.** The following expands the stages above. Automated journey tests cover the gate transition; native and hosted acceptance remain separate.

1. **Simplify the form.** Reduce the branding footprint; make the primary action prominent; place password visibility alongside the field and recovery near the password. Keep accessible labels and 48px targets.
2. **Give precise feedback.** Display field-specific email and password errors near their inputs; show signup password requirements before submission; replace technical backend messages with clear, actionable language without exposing sensitive details.
3. **Reduce repeated typing.** Carry the entered email between sign-in, signup and recovery without transferring the password. Support password-manager autofill and keyboard Next/Submit actions: Next on the email field moves to the password field where present; Enter/Submit on the final field submits the relevant sign-in, signup or recovery form using the same validation and pending-request safeguards as its button. Preserve entered values after failures and test keyboard submission.
4. **Make the journey predictable.** Explain that signup leads to a short setup. For a signup response without a session, offer useful next actions without claiming the account was created. Keep recovery confirmation neutral about whether an account exists.
5. **Harden request handling.** Prevent duplicate submissions; define navigation during pending requests; ensure late responses cannot cause stale navigation or misleading feedback; retain drafts after failures. Add tests for these behaviors.
6. **Improve the post-login transition.** Show a concise loading state during session and membership checks. Replace backend/migration terminology with a user-facing error and retain Retry and Sign out paths.
7. **Verify on devices.** Rebuild native binaries for launcher assets; check Android and iOS on small screens, with keyboards, large text, screen readers, light/dark appearance and password managers. Exercise slow connections and offline-to-online recovery, and inspect launcher masks. Record device/OS, evidence and gaps in build status.
8. **Strengthen journey tests.** Cover navigation during requests, late responses, email transfer and signup through setup to Train. Run focused tests and the required integration gates; track hosted and physical-device verification separately from mocked tests.

## Active workout UI and UX review follow-up — 31 October 2026

### Prototype alignment rebuild

**Implemented — coordinator with shell and exercise-card specialists; native visual acceptance Todo.** The 11 identified areas were rebuilt against `design/mvp.html`, while retaining accessible controls, semantic themes, durable drafts, server acknowledgement and conflict/removal safeguards. Independent review identified and prompted fixes for invalid-draft uncompletion, narrow row wrapping and visible per-set units. Typecheck, strict lint and coverage passed; see [build status](../BUILD_STATUS.md). Pixel-level alignment and narrow/large-text rendering have not been verified on native devices.

### Latest workout review — high and medium priorities

**Implemented — coordinator with logging, workout-flow and timer specialists; native acceptance Todo.** Compact set controls, sticky recovery/timer and completion announcement, minimize fallback and durable-draft regression, empty-state and name editing fixes, visible exercise errors, timed validation and compact finish review are implemented. Independent review identified a conflict-review regression; it was corrected and re-reviewed. Typecheck, strict lint and coverage passed; see [build status](../BUILD_STATUS.md). Android/iOS layout, screen-reader, keyboard and physical-device recovery acceptance remain open.

**Implemented — coordinator and workout specialist; native acceptance Todo.** The scoped interface and behavior changes below are implemented and automated checks passed; see [build status](../BUILD_STATUS.md). Server-acknowledged save semantics, durable input, original units, recovery and conflict behavior remain required.

1. **Compact logging hierarchy.** Present set number, previous performance, inputs and completion together in a readable row; move less frequent exercise and set actions into clearly labelled options. Retain accessible labels and 48px targets, including on narrow screens and with larger text.
2. **Return and resume.** Provide an explicit back/minimize action that leaves the workout active, returns to the originating area and supports the existing Resume flow. Verify drafts and pending changes remain intact.
3. **Protect entered work.** Confirm removal of exercises or sets when entered or completed data would be lost, or provide a reliable undo. Explain the consequence and preserve the existing finish-review safeguards.
4. **Separate rest from recovery.** Present an active rest countdown and quick actions compactly; distinguish these from save, retry and conflict controls. Preserve timer behavior and accessible status.
5. **Guide an empty workout.** Add a clear empty state that directs the user to add the first exercise.
6. **Clarify workout naming.** Avoid an unexplained duplicate name display; provide an explicit edit affordance or visible label, with understandable validation and save feedback.
7. **Clarify exercise details.** Visibly label notes and rest; consider placing editing under exercise options while showing configured rest in the exercise summary.
8. **Show completed sets clearly.** Add a restrained visual distinction with a non-color cue and an accessible completion state, retaining Undo.
9. **Refine timed and distance sets.** Use a compact hierarchy consistent with rep-based sets and evaluate more legible duration entry without changing stored duration or distance/unit semantics.
10. **Make finish blockers specific.** Identify the actual reasons finishing is blocked, with counts and direct paths to resolve them. Retain explicit confirmation before discarding entered rows and require server acknowledgement before claiming completion.
11. **Make recovery reachable.** Keep save status understandable and make retry/recovery accessible near affected work or via a persistent control, including on long workouts. Never label pending input saved.
12. **Clarify rest adjustment.** Initialize rest adjustment from the relevant current or configured duration and distinguish restarting from extending time.

**Verification:** focused tests, independent review, typecheck, strict lint and full coverage passed. The minimize/resume test uses a mocked draft; durable recovery has separate integration coverage, but the combined native journey remains Todo. Rebuild for the previously changed launcher assets and inspect a populated workout on Android and iOS with keyboard open, narrow screens, larger text, screen readers and light/dark appearance; record device/OS and unresolved gaps in [build status](../BUILD_STATUS.md).

## Design and implementation review — 30 October 2026

**Verified — scoped software corrections; native acceptance remains Todo. Coordinator with GPT-6 Luna specialists.** User requested design/implementation checks and corrections. Preserve pre-existing standalone migration/configuration edits. No hosted changes, provider requests, spending or infrastructure operations in this review.

| Task | Owner / allowed files | Acceptance / checks |
| --- | --- | --- |
| Exercise design and UI fixes | `luna_design`: `src/features/exercises/**`, routine detail/targets and colocated tests | Review against current design; fix concrete state/accessibility defects, focused Jest |
| Service correctness | `luna_implementation`: `src/services/**` except pre-existing environment/Supabase changes | Review persistence/account/race behavior; regression tests for bounded corrections |
| Independent screen review | `luna_reviewer`: read-only | Actionable screen/design findings and independent correction review |
| Integration and evidence | Coordinator: other scoped screen/test fixes and owning docs | Typecheck, strict lint, complete tests/coverage passed; pending-save editor fix and independent final review complete. See review report linked below |


Review findings, fixed behavior and verification: [30 October review](../reports/reviews/2026-10-30-design-implementation.md). Full native visual/device acceptance remains Todo; History row context remains a design follow-up.

## M8 standalone Supabase migration — 30 October 2026

**In progress — coordinator.** User authorized project `mgyzzipsqmsabptrfchw` on the BabyBoo Supabase owner account. The different-account candidate `aarofbmnnlkvdvrvhzem` is dropped from scope and was not deleted. GRIND owns the new migration history in `supabase/migrations`; the nine initial files match reviewed BabyBoo migrations and replay cleanly on the standalone local stack.

**Allowed paths:** root `supabase/**`, `src/services/environment.ts` and its tests, ignored `.env.local`, and affected documentation. Do not modify BabyBoo files, touch the BabyBoo hosted project, or delete any Supabase project.

**Data scope:** preserve the one observed GRIND account, settings, one active and one completed workout, their one built-in exercise reference, one set and 13 command receipts. Do not migrate Auth sessions. Exclude the 701 RepDB records because current license/release review does not yet clear hosted API delivery; the migrations carry seven independently authored starter exercises. The target is a new isolated Auth project, so the user signs in again after the URL changes.

**Verified locally:** clean replay applied all nine migrations; all nine transactional SQL suites passed through psql; focused environment/client/auth tests pass (3 suites/7 tests); selective transfer of one GRIND account and its owned rows into the standalone local target passed exact comparison, excluding unrelated Auth users, sessions and RepDB data. `supabase test db` is not a valid runner for these scripts because pg_prove requires TAP plans.

**Hosted migration complete:** Remote history was empty; nine reviewed migrations were dry-run and applied. The single Auth user/identity and owned Grind rows were transferred transactionally and exact-compared. Counts are 1 account/settings, 2 workouts, 2 workout exercises, 1 set and 13 receipts. No Auth sessions or RepDB rows were copied. `grind` API exposure and the exact Auth callback are configured while preserving existing Auth settings. The key in ignored `.env.local` matches the selected project. Authenticated sign-in, RLS/recovery and device verification remain open.

**Acceptance:** remote history is blank or compatible; reviewed dry-run and migrations apply; private schema stays unexposed; the Grind API schema and exact Auth callback are configured; account/workout counts and snapshots match; sign-in and recovery work under the standalone Auth; old project/source data remain untouched.

Task status/assignment owner: coordinator. Milestone evidence and environment limitations live in [agent status](../AGENT_STATUS.md); requirements/sequence in [milestones](../IMPLEMENTATION_MILESTONES.md). A documented task is not authorization to implement an unapproved milestone.

## Enabled exercise selection and list visibility — 29 October 2026

**Implemented, local only:** Add Exercise and All Exercises now filter to enabled/configured records using the existing `is_configured` flag; unconfigured RepDB rows no longer appear. User approved Barbell, Smith Machine, Dumbbell and EZ Curl Bar for weight-and-rep logging. Local counts: 204/701 selectable (76, 19, 88 and 21 respectively), 497 remain unavailable, and zero other equipment is configured. Conventions are distinct: Total barbell weight, Smith machine displayed weight, Weight per dumbbell, Total EZ-bar weight. No new boolean/schema column was needed. Typecheck, lint, coverage (57 suites/306 tests), Android/iOS JS exports, focused picker/library tests (29), Grind SQL suite and authenticated local API smoke pass. Native UI acceptance remains Todo; no hosted changes.

**1 November hosted sync — published:** User clarified that catalog access stays inside authenticated GRIND app functionality and is not a public/reusable API. All nine local and hosted migration versions matched; linked migration dry run reported up to date. Added guarded publisher `scripts/catalog/publish_hosted.py`, which requires the linked project ref to equal `mgyzzipsqmsabptrfchw`, accepts only safe fresh/staged/imported catalog states, pins the approved archive SHA-256, stages and imports the exact archive, runs Barbell/Smith/Dumbbell/EZ configuration functions and verifies final counts. Dry run and 30 catalog Python tests passed. Hosted read-only verification reports 701 active records, 204 configured (Barbell 76, Smith Machine 19, Dumbbell 88, EZ Curl Bar 21), 497 unconfigured, 701 approved source links/records, one active release, zero other configured equipment. `authenticated` has execute grants for catalog projection/search; `anon` and `authenticated` lack `grind_private` schema access. No images or user fixtures were uploaded. An authenticated app API request and native acceptance remain open.

## RepDB barbell and Smith machine selection — 29 October 2026

**Implemented, local only (earlier checkpoint):** At the user's direction, active RepDB entries with equipment `Barbell` or `Smith Machine` were enabled for external-load/repetition logging. These now form part of the 204 enabled entries summarized above. The existing bench-press UUID and convention remain unchanged.

## Local RepDB page import — 29 October 2026

**Implemented, local only:** Imported 701 RepDB-linked pages with unique GRIND UUIDs. Preserved the referenced bench-press UUID and archived the other six seed rows. After the approved equipment batches, 204 entries are configured and 497 remain unavailable pending further review. The app and server reject workout selection for unconfigured rows. A repeated import and local SQL counts verify identity and idempotence; native acceptance, remaining logging configuration, weighted timed support and release rights review remain open. Tests and build evidence: [build status](../BUILD_STATUS.md).

## Catalog consolidation and measurements — 29 October 2026

User requested replacing the existing server seed catalog with RepDB, avoiding duplicates, and adding duration and distance tracking. Coordinator owns integration and documentation; backend and reviewer agents inspected the existing contracts. Implementation remains **In progress**: measurement contracts and explicit source-link UI exist; seven catalog forward migrations are applied to the isolated local database without a reset; all 701 source records are imported; six seeds are archived and bench press is mapped to RepDB. The user's approved equipment batches configure 204 entries; 497 remain unavailable. The full source review is incomplete, including weighted timed exercises not supported by the current model; an idempotent import was rehearsed with synthetic classifications in a rolled-back transaction. Allowed paths: catalog tooling and tests, exercise/training app modules and tests, affected specifications, and new forward migrations/tests in the canonical BabyBoo stream. Preserve existing user data and unrelated changes.

Dependencies: GRIND references UUIDs while RepDB IDs are slugs; retain stable UUIDs and source mappings. The isolated local database has six archived seed rows and one active bench-press seed mapped to RepDB; its UUID is referenced by an existing workout and must be retained. Its disposable SQL snapshot was updated using the reviewed forward-only local migration workflow; do not reset it. RepDB includes timed stretches and cardio; duration/distance requires changes to workout and routine contracts, persistence, validation, recovery, history and UI before those exercises can be logged correctly. Replace the duplicate bundled/server presentation as part of integration.

Acceptance: idempotent reviewed import with unique source mappings; preserve referenced history/custom exercises; one selectable entry per global exercise; appropriate duration/distance and existing weight/repetition logging; scoped database/API checks and full app typecheck, lint, tests and coverage. Hosted release is now user-authorized for authenticated GRIND app use; public/reusable API and raw dataset export remain out of scope.

## Catalog plan — 29 October 2026

Documentation updated: [catalog implementation plan](../EXERCISE_CATALOG_PLAN.md). The 701-page archive is now published to hosted GRIND through the guarded app-bound release path. 204 barbell/Smith/dumbbell/EZ bar entries are configured; 497 entries remain unconfigured pending reviewed logging semantics. Supplementary images remain blocked pending rights evidence. Hosted release is implemented, while authenticated app/API and native acceptance remain open; M6 is not fully accepted.

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
| M4–M7 | Later approved bounded tasks | Deferred | Native rest, records/corrections, catalog release and beta readiness remain open |
| M8 | Coordinator | In progress | Standalone migrations/data transfer to `mgyzzipsqmsabptrfchw`; see current M8 task at top |

## Required task handoff

For each assignment record scope, one owner per file, exact allowed paths, dependencies, observable acceptance and executable verification commands. Return changed behavior/files, results actually run, blocked/unverified checks and integration notes. Update this tracker during work; update AGENT_STATUS.md with milestone-level evidence at handoff.

Use Todo / In progress / Implemented / Blocked / Verified / Deferred precisely as defined in [maintenance](../MAINTENANCE.md). Current aggregate coverage debt is detailed in [test mapping](../engineering/TEST_COVERAGE.md); no quality pass is implied merely by adding CI.
