# GRIND — maintained build and implementation status

Last checked: **28 October 2026 (Asia/Kolkata)**
Owner: coordinator
Authorized delivery scope: **M0–M3**, React Native/Expo, disposable local Supabase
Overall result: **INTEGRATION IN PROGRESS — NOT READY FOR M3 SIGN-OFF**

## 1. Executive status

The React Native application now has substantial source implementation through M3: authentication/setup, core workout commands, durable recovery, workout logging, finish review, History, exercise selection/custom exercises, routines, and System/Light/Dark appearance. Android and iOS JavaScript exports pass on the current source. This does **not** establish a working current native build or completed acceptance.

Fresh verification found one TypeScript error, one failing automated test and one lint warning. Independent review also identified an unresolved cold-restart recovery defect involving a successful finish/cancel with a lost response. Review was interrupted by agent usage limits. These are engineering follow-ups, not missing product decisions from the user.

The existing Android APK is from **26 October**, before the current M3 integration and automatic-appearance configuration. iOS native build verification remains deferred at the user's request. No hosted deployment, production database change, purchase, or live MuscleWiki call has been made.

## 2. Fresh check results

These checks were rerun for this report. Full output is preserved in [dated build evidence](./).

| Check | Current result | Evidence / interpretation |
| --- | --- | --- |
| `npm run typecheck` | **FAIL**, exit 2 | One TS2375 error in `src/features/exercises/CustomExerciseScreen.tsx:28`: explicitly passing possibly undefined `id`/`existing` to optional props under `exactOptionalPropertyTypes`. [Log](./typecheck.txt) |
| `npm run lint` | Exit 0, **1 warning** | `tests/setup.ts:4`: import appears after a statement (`import/first`). No lint errors; not a warning-free result. [Log](./lint.txt) |
| `npm run test:coverage` | **FAIL**, exit 1 | **43 suites pass, 1 fails; 183 tests pass, 1 fails; 44 suites / 184 tests total.** Failure is `SettingsRoute.test.tsx:67`, Stay/sign-out assertion expects false but still sees earlier true. Investigate async test synchronization and guard behavior; do not assume a production defect or dismiss the failure without evidence. [Log](./coverage.txt) |
| Coverage thresholds | Aggregate percentages above required minimums | Statements **96.22%**, branches **93.58%**, functions **93.75%**, lines **97.20%**. No configured coverage-threshold failure printed in this run. The overall command still fails because a test fails. [Machine-readable coverage](./coverage-summary.json) |
| Test diagnostics | Warning remains | TrainingProvider test emits an update-outside-`act(...)` warning. Resolve test lifecycle synchronization. |
| `npm run export:android` | **PASS**, exit 0 | Current JavaScript/Hermes bundle exported to `dist/android`. This is not a Gradle/native build or installed-device test. [Log](./export-android.txt) |
| `npm run export:ios` | **PASS**, exit 0 | Current JavaScript/Hermes bundle exported to `dist/ios`. This is not an Xcode/signing/native build. [Log](./export-ios.txt) |
| `python3 -m unittest discover -s scripts/backend -p 'test_*.py'` | **PASS** | Four backend harness safety tests. Does not start Docker or validate a live database. [Log](./python.txt) |

Required policy remains 90% statements/functions/lines and 85% branches overall, plus 100% branches for critical decisions. Thresholds/exclusions were not lowered for this report. Sampled critical domain, transport, outbox and theme files show 100% coverage, but newly added critical paths still need a complete policy-to-config audit. Some thin routes remain unexecuted and need the required named integration-coverage mapping. Aggregate coverage is not proof of correctness: the reviewer found a recovery defect despite high instrumentation coverage.

## 3. Milestone status

| Milestone | Implementation state | Acceptance state / remaining work |
| --- | --- | --- |
| **M0 — alignment/contracts** | Decisions and architecture documented | Agreed React Native/local backend/four load modes/Previous/theme semantics; preserve review gates for later architecture and live operations. |
| **M1 — runnable foundation** | Auth/setup, shell, secure session storage, backend foundation and local harness implemented | **Open:** physical-device Auth/deep links/storage/timer feasibility, iPhone native build, full BabyBoo SQL regression. Earlier Android build/launch is partial evidence. |
| **M2 — core workout slice** | Transactional commands, receipt/revision handling, core logging/finish/history, raw drafts and in-app rest timer implemented | **In progress:** terminal lost-response recovery fix, complete independent review, integrated API-backed/native workflow acceptance, crash/reopen verification. |
| **M3 — everyday workflow** | Catalog/custom exercises, routine editing/start/archive, four load modes, Previous, System/Light/Dark implemented | **In progress:** current type/test failures, route integration tests, independent UI/data review, theme/native/layout acceptance and end-to-end persistence checks. |
| **M4 — production native rest** | Not implemented as a production native experience | Planned: scheduled alerts, OS countdown surfaces, permission/lifecycle/background/device matrix. In-app countdown does not complete M4. |
| **M5 — records/corrections/data controls** | Deferred | Records, completed-workout corrections and Grind-only deletion remain future work. Prototype views do not establish native implementation. |
| **M6 — MuscleWiki** | Deferred / gated | Entitlement unconfirmed; live calls disabled. |
| **M7 — hosted staging/beta** | Deferred | Hosted configuration/deployment and beta acceptance have not run. |
| **M8 — standalone database** | Planned | Separate GRIND database/Auth/data cutover and rollback design required before execution. Current shared backend is transitional. |

## 4. Implemented modules and limits

| Module | Current source / behavior | Verification limits |
| --- | --- | --- |
| App/runtime/navigation | `app/**`, `features/shell/AppRuntime.tsx`; always-mounted root navigator, protected routes, four tabs, scoped providers, Train and Resume | Signed-out cold-launch Router test passes; complete new-route registration/parameter coverage and native journey remain open. |
| Auth/setup | `features/auth/**`, secure session/crypto/environment services; signup, verification, sign-in, reset, recovery, onboarding, independent sign-out | Automated Auth/service tests pass. Actual native email-link/PKCE and both-device secure-storage acceptance remain open. |
| Domain/contracts | `domain/training/**`, `engineering/M2_M3_CONTRACT.md`; strict schemas, original units, decimal conversion, four modes, Previous matching | Domain suites pass. Backend remains authoritative for normalized storage. |
| Training API | `services/training/{api,transport,errors}.ts`; Grind profile headers, response validation, expected-account token guard | API/transport tests pass. Deliberate stale revisions use `PT409`/HTTP409; client also handles genuine `40001` serialization conflicts. |
| Recovery/outbox | `services/training/outbox*`, `projection*`, `features/training/**`; durable scoped drafts, serialized commands, stable operation IDs, conflict review/reapply/discard, timer deadlines | Focused tests and current suite pass, but unresolved reviewer finding below prevents acceptance. Controller is about 443 lines and needs a justified cohesion exception or safe decomposition. |
| Workout UI | `features/workouts/**`; add/reorder/remove, working/warm-up sets, raw numeric editing, completion, rest controls, finish review and saved summary | Current workout tests pass. Native keyboard/layout/process-death/timer behavior unverified. |
| History | `features/history/**`; server-backed pagination/detail and saved snapshots | Tests pass; real-device/timezone/DST and full integrated API journey still require acceptance evidence. |
| Exercise catalog/custom | `features/exercises/**`; filtering, contextual picker, custom create/edit/archive, ownership boundaries | Tests pass; custom screen still blocks TypeScript. No live provider demonstrations. |
| Routines | `features/routines/**`; scoped transient drafts, set templates, save/conflict review, archive and start | Current routine tests pass. Independent final review was interrupted. |
| Appearance/settings | `theme/**`, Settings screens; System default, Light/Dark overrides, scoped persistence, account-bound preference writes and pending-edit sign-out guard | Theme tests pass; sign-out wrapper test fails. Native automatic-appearance setting requires a new binary and physical visual/accessibility checks. |
| Backend | Canonical BabyBoo forward migrations plus `scripts/backend/**`; dedicated Grind schema/RLS, normalized sessions/routines/custom data, transactional RPCs and receipts | Earlier local SQL/Auth/API results passed; not rerun for this report. Full BabyBoo regression remains blocked separately. |

## 5. Native artifacts and environment

| Area | Observed state |
| --- | --- |
| Stack | Expo **57.0.31**, React Native **0.86.3**, React **19.2.3**, TypeScript **6.0.3**; pinned Node **24.11.1** used for checks. |
| Android artifact | `android/app/build/outputs/apk/debug/app-debug.apk` exists, **88,480,177 bytes**, filesystem date **26 October 2026**. It predates current M3 changes. |
| Earlier Android verification | Recorded Gradle debug build passed, APK installed on emulator, React Native process/Metro entry launched. This report did not rerun the native build or reproduce installation/visual flows. |
| Current Android native acceptance | **Pending**: regenerate/rebuild after current configuration, emulator journey, physical-device Auth/recovery/keyboard/theme checks. |
| iOS native | **Deferred by user**: Apple signing not configured; recorded Xcode26.2 is below the documented SDK57 requirement26.4+. No current signed iPhone build established. Toolchain version was not re-inspected for this report. |
| Production exports | Production exports can read hosted `.env.local` rather than the development override. The local-only runtime guard rejects hosted configuration. Passing exports are compile artifacts, not ready-to-distribute builds. |
| Supabase | Guarded disposable local project `grind_m1_disposable`, 554xx ports; BabyBoo's existing stack/config/data must remain untouched. Live Docker/container health was not rechecked here. |
| Git/reproducibility | Repository has **no commits**; project files currently appear untracked. There is no committed build revision or published remote baseline to reference. No commit/push performed for this report. |

## 6. Backend evidence from the previous implementation session

These are recorded earlier results, **not newly rerun checks**:

- Combined canonical migration replay passed on the disposable stack.
- Dedicated foundation/training SQL covered membership, grants/RLS, raw-write denial and cross-owner access.
- Real local Auth/API smoke covered concurrent starts, receipt retries/payload mismatch rejection, all four load modes, exact lb conversion, entered strings, archived references/routine starts, stable History cursors and snapshots.
- Canonical files: `../babyBoo/supabase/migrations/20261025180000_grind_foundation.sql` and `20261027180000_grind_training.sql`; corresponding dedicated SQL tests are in that repository's `supabase/tests/`.
- Full BabyBoo SQL regression **did not pass**: the unchanged anonymous onboarding-denial block caused PostgreSQL signal11; reproduced against the old migration-only baseline. Existing BabyBoo production/source history was not rewritten to bypass it.

## 7. Open findings and blockers

| ID | Priority / state | Finding | Next action / owner |
| --- | --- | --- | --- |
| B01 | **P1 — open** | On cold restart after a successful finish/cancel whose response was lost, recovery sees the now-closed server graph and enters conflict before replaying the original terminal receipt. Retry/reapply cannot complete recovery correctly. | Recovery developer/coordinator: replay and validate the same terminal operation ID before deciding external completion conflicts; add cold-restart finish and cancel lost-response tests, then reviewer recheck. |
| B02 | **P1 — fixed, re-review pending** | Clean stale local session could replace a different authoritative active workout during final hydration refresh. | Guard now requires matching document/local session IDs. Added three-status cross-device regression; outbox suite passes in this report. Independent reviewer has not re-signed off. |
| B03 | **Build blocker — open** | CustomExerciseScreen optional-prop TypeScript error. | Catalog developer/coordinator: conditional props or a properly narrowed interface; rerun typecheck and affected tests. |
| B04 | **Quality blocker — open** | Sign-out guard test fails at Stay assertion. | Coordinator: resolve timing/behavior with a deterministic test; cover Stay, discard success/failure and dismissal; rerun full suite. |
| B05 | **Review blocker — open** | Catalog/routine, workout/history and independent-review agents hit usage limits before final handoff/sign-off. | Resume bounded reviews when available; inspect saved files and address findings. No active subagent was running when status was checked. |
| B06 | **Native acceptance — open/deferred** | No current M3 native binary/journey accepted; iPhone setup deferred; physical timer/Auth evidence missing. | Rebuild Android after software gates pass; complete device matrix. Leave iPhone setup pending until user supplies it. |
| B07 | **Cross-app regression — blocked** | Existing BabyBoo SQL engine/baseline failure. | Separate local investigation; preserve production and canonical historical migrations. |
| B08 | **Maintenance — open** | One lint warning, provider-test `act` warning, uncovered thin routes, critical-gate config audit and oversized recovery controller. | Coordinator: close diagnostics/mapping and document or safely refactor cohesion before final standards sign-off. |

## 8. Agent/work ownership

Native delegation was actually available and used; all code lives in the shared workspace.

| Responsibility | Last known owner | Current state |
| --- | --- | --- |
| Coordination, runtime/routes, API integration, status | Coordinator | Active; this report created and checked. |
| Architecture/domain contracts | Architect/domain specialist | Contract/domain implementation handed off earlier; final aggregate review remains open. |
| MVP design | Designer | Clickable prototype/design handoff completed; native design acceptance outstanding. |
| Training backend | Backend specialist | Earlier implementation and local verification handed off. |
| Durable recovery/provider | Recovery specialist | Handed off with focused tests; coordinator owns released files and open review fixes. |
| Catalog/routines | `m3_catalog_routines_ui` | Source/tests saved; interrupted by usage limit. |
| Workout/history | `m3_workout_history_ui` | Source/tests saved; interrupted by usage limit. |
| Independent review | `m3_independent_review` | Two concrete recovery findings delivered; interrupted before complete review. |

## 9. Next execution order

1. Resolve B01–B04 with bounded regression tests and no broader feature expansion.
2. Complete the thin-route integration mapping, warning cleanup and critical coverage-gate audit.
3. Rerun typecheck, warning-free lint, full tests/coverage, dedicated local SQL and real Auth/API smoke; capture results here.
4. Finish independent backend/recovery/UI review and address any further findings.
5. Rebuild the Android binary for current configuration; verify the actual logging → finish → History → restart/recovery and appearance flows. Record physical-device checks separately.
6. Keep M1/M2/M3 acceptance open until the required evidence exists. Keep M4–M8 deferred unless explicitly authorized.

## 10. Maintenance rules for this report

- **This file is the canonical live build-health report.** Update after each integration/build checkpoint and whenever a blocker opens/closes. Replace the latest-results tables; keep dated evidence under `docs/reports/build-checks/YYYY-MM-DD/` (use a run suffix for another snapshot on the same date).
- Record check date, exact command, exit/result, counts/coverage, relevant source revision, device/build identifiers, owner and unverified limits. Until Git has a commit, explicitly say the source is uncommitted.
- Preserve failure evidence; do not call an export a native build, an earlier run a fresh check, or an implemented milestone accepted.
- `planning/TASKS.md` owns live task assignments. `AGENT_STATUS.md` owns coordination/decision history and links here for current check results. `SETUP.md` owns runnable setup commands. Avoid copying changing numbers among those documents.
- Do not include environment values, access tokens, provider keys, passwords or production data in evidence. Do not write to the Codex memory folder unless the user explicitly requests memory updates.
