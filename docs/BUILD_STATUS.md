# GRIND — maintained build and implementation status

**30 October 2026 — GRIND-only Supabase/Auth configuration:** User directed removing BabyBoo coupling. The app and local harness now use GRIND-only copy, callbacks, migrations and configuration. The CLI link and ignored `.env.local` were verified as project `mgyzzipsqmsabptrfchw`; the development override targets local GRIND. Auth/settings/callback tests, Python harness-safety (10 tests), typecheck, lint and full coverage passed (57 suites/308 tests; 97.66% statements, 93.31% branches, 96.45% functions, 98.32% lines). Hosted sign-in and physical-device acceptance remain open.

**30 October 2026 — design/implementation review:** GPT-6 Luna specialists and coordinator fixed misleading exercise error/empty feedback, account ownership validation on settings-save responses, loss of routine edits during pending saves, and missing per-set routine targets/total count. Independent Luna review found no remaining actionable issue in those diffs. Integration passes: typecheck, zero-warning lint, 57 suites / 308 tests with coverage (97.66% statements, 93.31% branches, 96.45% functions, 98.32% lines), unchanged global/critical gates, prototype syntax and 10 Python harness-safety tests. No database/provider/native/hosted operations were performed for this review. Current source already includes workout elapsed/Finish/keyboard controls and Train recent sessions; native visual/device acceptance remains open. See [review and evidence](reports/reviews/2026-10-30-design-implementation.md). This checkpoint supersedes older software counts below.

**30 October 2026 — M8 hosted schema/data migration:** User authorized project `mgyzzipsqmsabptrfchw`. The fresh nine-migration stream applied successfully after an empty-history check and reviewed dry-run; remote history matches. The selected GRIND Auth identity and owned data were transactionally transferred and exact-compared: 1 account/settings row, 2 workouts, 2 workout-exercise rows, 1 set and 13 receipts. No sessions, unrelated Auth users or 701 RepDB rows were copied. Hosted API exposes `grind` and not `grind_private`; the exact `grind://auth/callback` is configured while preserving existing Auth MFA, site URL and email rate/OTP settings. An unauthenticated schema probe was denied by Grind schema permissions, as expected. App sign-in/recovery, authenticated API/RLS and physical-device acceptance remain open. The 701-row backend/API release remains gated on rights clarification. See [M8 task status](planning/TASKS.md) and [standalone setup](../supabase/README.md).

**29 October — enabled-only exercise lists; Dumbbell and EZ Curl Bar selection:** Add Exercise and All Exercises now omit unconfigured rows using the existing `is_configured` field from the database/API. Local RepDB configuration is 204/701: Barbell 76, Smith Machine 19, Dumbbell 88 and EZ Curl Bar 21. These use external load and reps with separate conventions (“Total barbell weight,” “Smith machine displayed weight,” “Weight per dumbbell,” and “Total EZ-bar weight”). The remaining 497 RepDB entries stay unavailable; zero other equipment is configured. Applied forward migration `20261029230000_grind_dumbbell_ez_catalog_configuration.sql` to the guarded local database without reset. Grind SQL suite passes, including workout logging and routine selection; real local Auth/API pagination returns all 701 unique entries. Typecheck, lint and coverage pass (57 suites / 306 tests); focused exercise screens/catalog tests pass (29 tests). Native picker/device visual acceptance and hosted/release review remain open; no hosted changes.

**29 October — Add Exercise diagnosis:** Local SQL confirms 701 active RepDB mappings, one configured for logging, and six archived seeds. The Add Exercise picker now uses the server catalog as its row source; bundled data provides details, search terms and images only for linked records. The other 700 records remain unavailable for workout selection because their logging fields are null and both app and backend enforce that boundary. Device/build state causing the reported seven selectable rows is unverified. Typecheck, lint and coverage passed (57 suites, 304 tests); native UI acceptance is pending.

**29 October — local catalog page import:** 701 RepDB pages were imported to the guarded disposable database, with 701 distinct source-to-UUID links. Bench press retains its existing workout UUID; the other six foundation seeds are archived, not deleted. The import was independently reviewed, rehearsed in a rolled-back transaction and repeated successfully against the local database. One entry is configured for workout logging; 700 remain browse-only until their logging behavior is reviewed and supported. App typecheck, lint and coverage passed (57 suites, 302 tests); 24 catalog and 10 backend harness tests passed. Authenticated local API pagination returned all 701 unique RepDB pages, and database types were regenerated from the isolated database. Native UI/device acceptance and release rights review remain open; no hosted operations were performed.

**29 October — catalog consolidation in progress:** The isolated local database received four reviewed forward migrations without reset; all 701 RepDB records were staged privately as pending, and repeating staging preserved the same count. Synthetic reviewed import and rerun passed in a rolled-back transaction, retaining the existing bench-press UUID. No catalog entries have been approved/published, and the seven original seed rows remain; visible duplicates therefore remain possible until mappings are reviewed and imported. Duration/distance and source-link integration are implemented but not accepted end-to-end. Typecheck, lint and coverage passed (57 suites, 297 tests); catalog and backend harness tests passed. Weighted timed movements, full classification, native validation, generated DB types and hosted/release checks remain open. Future catalog release reconciliation is intentionally blocked pending design.

**29 October — exercise list and picker cleanup:** RepDB English JSON and 1,217 flat images are staged in the local repository, with one image per exercise in the generated registry. Library and server-backed picker use compact rows. Typecheck, strict lint and coverage pass (56 suites, 275 tests; 98.32% statements, 95.17% branches, 97.82% functions, 99.17% lines); catalog Python tests and Android/iOS JS exports pass. Android arm64 debug assemble passed and APK installed on emulator-5554; exercise screen was not observed on device. Bundled exercises are browse-only pending reviewed server identity/load mappings; existing server rows remain separately visible and may duplicate names. Filter taxonomy is not unified. Public repository distribution requires license review.

**29 October — bundled exercise list:** local list implementation includes 701 archive records with one bundled image each, local search/filters, custom server entries and read-only RepDB detail. Typecheck, zero-warning lint and coverage pass (57 suites / 275 tests; 97.11% statements, 94.02% branches, 95.62% functions, 97.95% lines); 8 catalog Python tests and Android JS export pass. Source assets and generated registry are ignored and must be provisioned; absent registry falls back to placeholders. RepDB-to-server UUID mapping, selectable workout catalog, reviewed taxonomy, release fail-closed build, license/delivery review and native builds/device visual acceptance remain open.

**29 October — downloaded RepDB browser:** typecheck, lint and coverage pass (55 suites, 270 tests; 98.24% statements, 95.11% branches, 97.76% functions, 99.16% lines); Android JS export passes. Seven archive/catalog inspection tests pass. Backend specialist reports archive identity and importer SQL tests passed in rolled-back disposable local DB. Browse-only entries do not yet support workout selection or images; native/hosted acceptance remains open.

**29 October — exercise engine groundwork:** typecheck and lint passed; coverage suite 54 suites / 266 tests passed (98.29% statements, 95.15% branches, 98.12% functions, 99.18% lines). Catalog validator 4 tests and backend harness 4 tests passed. New catalog migration and SQL tests passed in a rolled-back guarded disposable database according to backend specialist; no hosted or native acceptance. RepDB acquisition/import, media delivery and full engine integration remain incomplete; existing library path retained until migration rollout.

Last checked: **30 October 2026 (Asia/Kolkata)**
Owner: coordinator
Authorized delivery scope: **M0–M3**, React Native/Expo, disposable local Supabase
Overall result: **M3 CORE WORKFLOW IMPLEMENTED; DESIGN ALIGNMENT AND DEVICE ACCEPTANCE OPEN**

## 1. Executive status

Core M3 workflows are in place, but an independent direction audit found unfinished native design requirements described below. The application includes authentication/setup, workout logging and recovery, finish review, History, exercise-specific history, custom exercises, routine editing/start/archive, four load modes, Previous performance, saved training defaults, and System/Light/Dark appearance.

All current software checks pass: **250 tests across 52 suites**, typecheck, zero-warning lint, coverage gates, Android/iOS JavaScript exports and four Python harness tests. Dedicated local SQL and real Auth/API checks pass against the final migration contract. Independent backend and final UI/recovery reviews found no remaining blocking issue in their assigned software scope.

A **new Android debug APK compiled and installed** on emulator-5554 after replacing only the old GRIND test installation to free space. Metro bundled the current app, and GRIND's sign-in UI rendered under its first-run developer overlay. Full native logging/Auth/keyboard/theme/restart journeys have **not** been signed off. iPhone native verification remains deferred at the user's request. No deployment, hosted database write, purchase or live MuscleWiki call was performed.

The [initial failing checkpoint](reports/build-checks/2026-10-28/build-status.md) and its evidence are retained. Current evidence lives in [the M3 checkpoint](reports/build-checks/2026-10-28-m3/).

## 2. Current check results

| Check | Result | Evidence / limits |
| --- | --- | --- |
| `npm run typecheck` | **PASS**, exit 0 | [Typecheck log](reports/build-checks/2026-10-28-m3/typecheck.txt). Includes generated types matching the final Previous-convention parameter. |
| `npm run lint -- --max-warnings=0` | **PASS**, exit 0 | [Lint log](reports/build-checks/2026-10-28-m3/lint.txt); zero warnings. |
| `npm run test:coverage` | **PASS**, exit 0 | **52 suites / 250 tests**; no failed tests, snapshots or console warnings in the final run. [Full log](reports/build-checks/2026-10-28-m3/coverage.txt). |
| Coverage | **PASS** | Statements **98.39%**, branches **95.46%**, functions **98.17%**, lines **99.28%**. Global remainder and explicit critical 100% branch gates pass. [Coverage data](reports/build-checks/2026-10-28-m3/coverage-summary.json). |
| `npm run export:android` | **PASS**, exit 0 | [Export log](reports/build-checks/2026-10-28-m3/android.txt); JavaScript/Hermes export, distinct from native build. |
| `npm run export:ios` | **PASS**, exit 0 | [Export log](reports/build-checks/2026-10-28-m3/ios.txt); does not establish an Xcode/signed iPhone build. |
| Python harness safety | **PASS**, four tests | `python3 -m unittest discover -s scripts/backend -p 'test_*.py'`; [log](reports/build-checks/2026-10-28-m3/python.txt). |
| Disposable backend replay | **PASS** | Guarded `local.py refresh/start` replayed the final canonical migrations; public Grind types regenerated. [Backend record](reports/build-checks/2026-10-28-m3/backend.txt). |
| Dedicated SQL / real Auth/API | **PASS** | `local.py test-grind` passes foundation/training SQL; `training_smoke.py` passes concurrency, receipts, stale revisions, ownership and lost responses. [Backend record](reports/build-checks/2026-10-28-m3/backend.txt). |
| Android prebuild/native compile | **PASS** | `expo prebuild --platform android --no-install`, then Gradle arm64 debug assemble. **BUILD SUCCESSFUL, 1m18s, 475 tasks.** [Prebuild](reports/build-checks/2026-10-28-m3/prebuild.txt), [Gradle](reports/build-checks/2026-10-28-m3/android-build.txt). Dependency deprecation warnings remain in Gradle output; app ESLint is clean. |
| Emulator install/launch/render | **PARTIAL VERIFIED** | New APK installed successfully; GRIND activity/Metro startup and sign-in rendering observed. First-run debug-overlay image retained [here](reports/build-checks/2026-10-28-m3/android-first-launch-developer-overlay.png). No completed native workout journey claimed. |
| Independent software reviews | **PASS in assigned scope** | Backend and final UI/recovery/runtime findings resolved; [review record](reports/build-checks/2026-10-28-m3/review.txt). Physical devices, full cross-app baseline and hosted operations remain outside that sign-off. |
| Remote CI | **Not run** | Workflow is configured; local checks are not a remote CI result. |

Jest still collects every executable app/src module, including thin routes. Thresholds and exclusions were not lowered. Critical gates now explicitly include training domain/services, queue/timer/ownership logic, AuthProvider/AuthGate, scoped settings/sign-out/runtime, theme resolution/provider and input-validation helpers. Thin routes have 29 named registration/composition cases plus actual signed-out cold-launch coverage. Detailed mapping is in [TEST_COVERAGE.md](engineering/TEST_COVERAGE.md).

## 3. Milestones and acceptance

| Milestone | Software implementation | Acceptance status |
| --- | --- | --- |
| **M0 — alignment/contracts** | Implemented | React Native/local backend, four modes, Previous matching and appearance decisions recorded. Later infrastructure changes retain approval gates. |
| **M1 — foundation/feasibility** | App/Auth/setup/backend foundation implemented | **Open:** physical-device Auth/deep-link/storage/timer proof, deferred iPhone native build and full BabyBoo regression. Android compile/install/render and automated/local API evidence exist. |
| **M2 — reliable core workout** | Implemented; local/automated checks pass | Core commands, durable text/numeric drafts, foreground recovery, receipt/conflict handling, in-app rest, finish/summary/history implemented. Native workout → finish → History → kill/reopen journey still requires acceptance evidence. |
| **M3 — everyday workflow** | Core workflows implemented; design alignment incomplete | Catalog/custom exercises, contextual picker, routines, exercise history, units/Previous/defaults and appearance implemented. Current workout/Train source requirements are present; native theme/keyboard/layout/accessibility/persistence acceptance remains open. |
| **M4 — production native rest** | Deferred | Scheduled alerts, OS countdown surfaces, notification permissions and production lifecycle matrix remain future work. Current timer is in-app; M1 native feasibility remains unverified. |
| **M5 — records/corrections/data controls** | Deferred | Records, completed-workout corrections and Grind-only deletion are not implemented merely because prototype views exist. |
| **M6 — MuscleWiki** | Deferred / gated | Entitlement unconfirmed; live calls disabled. |
| **M7 — hosted staging/beta** | Deferred | No hosted rollout or beta-readiness claim. |
| **M8 — standalone backend** | In progress | Root migration history and clean local replay are ready; hosted history review, push, selective data/Auth transfer and final cutover verification await CLI authentication. |

“Implemented” and “automated checks pass” do not mean physical/native/hosted acceptance is complete.

## 4. Direction audit — 28 October 2026

The React Native/Expo architecture, local-first shared Supabase boundary, later standalone M8 plan, four load modes, Previous semantics and System/Light/Dark settings match the user's decisions. We do not have evidence of actual credit consumption and cannot quantify savings or waste. Local automated/backend evidence does not establish native usability or complete M3 design acceptance.

**Historical design gaps from 28 October (source rechecked 30 October):**

- The earlier workout omissions are closed in current source: elapsed time, top-bar Finish, previous/load/reps/completion rows and keyboard Done/Next controls exist. Native layout/usability verification is still open.
- Train now renders recent sessions with loading/empty/retry behavior. Device acceptance remains open.
- Luna source/design review and scoped corrections are complete; physical/native visual, keyboard, large-text and accessibility acceptance remain open. History rows still have less context than the prototype.

**Version-control checkpoint:** The four canonical GRIND migrations and SQL tests were committed in the sibling BabyBoo repository as `2021d0f`, without staging its unrelated changes. GRIND now has a local baseline commit (see `git log`); ignored environment files remain excluded. GRIND has no configured remote, so this checkpoint is local only.

## 5. Module inventory

| Area | Implemented behavior / owning paths |
| --- | --- |
| Runtime/navigation | `app/**`, `features/shell/AppRuntime.tsx`, `features/home/**`: protected four tabs, separate active workout/Resume, stable root navigator, account/environment-scoped providers. Recovery IO waits for verified identity, completed setup and no password-recovery flow. |
| Auth/setup | `features/auth/**`, session/crypto/environment services: signup/verification/login/reset/recovery/setup, isolated secure storage and Grind-only local sign-out. Native PKCE/email-link acceptance remains separate from API tests. |
| Domain/API | `domain/training/**`, `services/training/{api,transport,errors}.ts`: strict boundary schemas, original decimal strings/units, authoritative normalization, four modes and expected-account token binding. Deliberate stale revisions use `PT409`/HTTP409; genuine serialization conflicts also handled. |
| Durable workout state | `services/training/outbox*`, `projection*`, `features/training/**`: persisted start/commands/terminal receipts, exact retry IDs, raw input including blank/name/notes/rest, serialized revisions, explicit conflict resolution, initial-sync and foreground retry, scoped lifecycle cleanup, persisted timer deadlines. |
| Logging/finish | `features/workouts/**`: working/warm-up rows, completion/uncompletion, notes/rest/name edits, exercise/set ordering/removal, finish guards, in-app timer adjustment/restart/skip and server-confirmed summary. |
| History | `features/history/**`, `features/exercises/ExerciseHistory.tsx`: paginated completed snapshots, recorded local-day grouping, detail and exercise history filtered by stable ID/mode/convention, original entered values, retry/load-more. |
| Catalog/custom | `features/exercises/**`: combined filtering, selection retained across filters, contextual picker, custom create/edit/archive and ownership boundaries. No live demonstrations/provider secrets. |
| Routines | `features/routines/**`: scoped transient drafts, atomic versioned templates, set controls, explicit unsaved/conflict guards, archive/start and direct Resume navigation for existing active workouts. |
| Defaults/appearance | `features/preferences/**`, `theme/**`, settings wrappers: saved unit/rest defaults for new entries, original values preserved when preferences change, display-only alternate-unit conversion for populated rows; System default with Light/Dark overrides and semantic palettes. |
| Canonical database | New forward migrations/tests in sibling BabyBoo repository; GRIND disposable runner in `scripts/backend/**`. GRIND ownership/RLS, snapshots, receipts and command locking are tested; existing BabyBoo configuration/production data remain untouched. |

## 6. Findings closed during this checkpoint

| Finding | Resolution / regression evidence |
| --- | --- |
| Terminal lost-response cold restart | Replays the same finish/cancel operation receipt before classifying a closed graph as external conflict; retains genuine rejection/network failures and concurrent edits. |
| Stale local graph replacing a different active workout | Reconciliation checks session identity; cross-device active/completed/cancelled regression cases pass. |
| Initial hydration failure falsely becoming Saved on Retry | Retry reruns incomplete authoritative synchronization; concurrent retries share hydration, and local/blank drafts survive storage/network failures. |
| Blank input disappearing / local-only input called Saved | Explicit empty raw text is persisted; unsent input is labelled unsaved and prevents finish. |
| Name/notes/rest lost before blur | Immediate durable raw fields, cleared only after matching commands are durably queued; mounted kill/reopen integration test verifies restoration and finish blocking. Delayed writes are isolated across field/workout keys. |
| Unit toggle changing 100kg into 100lb | Populated entries use display-only conversion; original source load/unit remain unchanged. Empty entries can choose a unit; saved preferences apply to newly added rows/rest. |
| Picker second-item retry position gap | Stable IDs plus contiguous retry positions; partial-success/rerender regression passes. |
| Stale History/Previous after completion | Server-acknowledged finish and recovered completed graphs invalidate history/performance caches; completion callbacks dedupe repeated emissions. |
| Missing exercise-specific history | Added actual paginated saved-history filtering with retry, refresh, older-page loading and original set values. |
| Routine Resume calling forbidden Start | Active-workout Resume navigates directly without creating another session. |
| Previous matched current catalog convention | SQL/API accept explicit snapshot convention; query key and repeated-exercise ordinals include it. Old/new convention and owner-isolation SQL regressions pass. |
| Build/test/lint/review blockers | Optional props narrowed, sign-out test synchronization fixed, lifecycle tests expanded, thin-route mapping added, module cycles removed through a narrow shared public entry point. Final checks and independent review pass. |

## 7. Native artifact and environment

- Runtime: Expo **57.0.31**, React Native **0.86.3**, React **19.2.3**, TypeScript **6.0.3**, pinned Node **24.11.1** used for checks.
- Current debug APK: `android/app/build/outputs/apk/debug/app-debug.apk`, **88,480,185 bytes**, built in this checkpoint. SHA256: `7b4a2475849a92ec7a587c9480e01a92fa2d7ffca7912260308fc5d080357334`.
- The binary includes automatic appearance configuration. App JS is supplied by Metro in this debug build; the APK alone is not a standalone distributable release. Current verification Metro uses localhost **8091**; emulator reverses 8091 and disposable API55421.
- Initial replace-install failed for insufficient emulator storage. Only `com.grind.dev` was uninstalled/reinstalled; its emulator test data was cleared. No unrelated app was removed. GRIND installation and native rendering then succeeded.
- iPhone native build remains deferred by user: signing not configured and recorded Xcode26.2 below documented SDK57 requirement26.4+. Toolchain version was not re-inspected here.
- Production exports may read hosted `.env.local` rather than the development override. The local-only runtime guard rejects hosted configuration. These are compile artifacts, not ready-to-distribute builds.
- The isolated `grind_m1_disposable` backend uses554xx ports. Canonical source is BabyBoo's forward-migration stream; its existing stack was not reset. Fictional HTTP/SQL test accounts were cleaned up.
- The initial GRIND baseline is recorded locally; `git log` identifies the revision. The sibling BabyBoo GRIND migration/test commit is `2021d0f`. GRIND has no configured remote; no remote CI or publishing was performed.

## 8. Remaining gates and maintenance

| Item | State / owner / next action |
| --- | --- |
| Workout/Train design alignment | **Implemented and source-reviewed**, elapsed time, top-bar Finish, keyboard controls and Train recent sessions present. Native visual/layout acceptance remains **Open**. |
| Full Android native journey | **Open**, developer/device reviewer: authenticated setup → routine/empty workout → editing → finish → History → force-close/reopen, offline recovery, sign-out and both appearance modes. Initial render is not this journey. |
| Physical-device acceptance | **Open**, device testing: Android and iPhone Auth/PKCE/keychain/keyboard/gestures/theme/large text plus native timer feasibility. User confirmed both platforms available; model/OS evidence not recorded. |
| iPhone build | **Deferred by user**, signing/toolchain setup required. Do not re-ask the already settled deferral. |
| Full BabyBoo regression | **Blocked separately**: unchanged anonymous onboarding-denial test caused PostgreSQL signal11 and was reproduced on the old-migration-only baseline. Dedicated GRIND checks pass; do not claim the full cross-app suite passed. |
| Recovery controller size | **Documented maintenance exception**: serialized controller is494lines after formatting, with persistence/schema/projection extracted. Preserve its single state/queue owner for this reviewed checkpoint; any later split of hydration/replay/actions requires equivalent race tests and100branch gates. |
| Remote/release operations | **Not performed**: GRIND has no configured remote; remote CI and release/hosted staging remain to establish before distribution. |
| **M4–M7** | **Deferred**; no notification delivery, PR records, corrections, data deletion, provider activation or beta acceptance is implied by M3. M8 is separately in progress under explicit user authorization. |

## 9. Owners and next checkpoint

Coordinator integrated the reviewed source and evidence. Recovery, UI fixes, Previous-contract and quality subagents completed bounded handoffs. Independent backend and final UI/recovery/runtime reviewers returned no remaining blocking software finding. Native acceptance remains assigned to developer/device reviewer; iPhone setup remains user-dependent.

Next: complete native visual acceptance after the source/design review and corrections; run one Android workout → finish → History → reopen journey. Preserve the iPhone deferral and investigate the BabyBoo baseline separately. Avoid new backend scope until these gaps are addressed.

## 10. Report maintenance

This is the canonical live build-health report. Update after integration/build checkpoints or blocker changes. Keep dated logs/snapshots under `docs/reports/build-checks/YYYY-MM-DD[-run]/`; preserve failures as well as passes. Record commands, results, coverage, source revision, artifact/device IDs, owners and unverified limits. Never include credentials, tokens or production data.

`planning/TASKS.md` owns task assignment; `AGENT_STATUS.md` owns coordination/decision history; `engineering/TEST_COVERAGE.md` owns test mapping; `SETUP.md` owns setup commands. Link to this report for changing build numbers rather than duplicating them. Do not write Codex memory files without a separate explicit request.
