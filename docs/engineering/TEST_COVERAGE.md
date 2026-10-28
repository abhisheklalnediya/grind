# Test coverage and quality gates

Updated 28 October 2026 during through-M3 integration. This document owns the module-to-test map and enforcement policy. [BUILD_STATUS.md](../BUILD_STATUS.md) owns the latest aggregate check results, acceptance gaps and dated evidence; [TASKS.md](../planning/TASKS.md) owns assignments. Instrumented coverage is not native, backend or hosted acceptance.

## Enforcement

`npm run typecheck`, warning-free strict lint, `npm test` and `npm run test:coverage` are required. The quality workflow in `.github/workflows/ci.yml` runs app checks followed by Android/iOS JavaScript exports. A separate job runs Python disposable-harness safety tests. No remote CI run, native binary/device acceptance or live database result is implied by these commands.

Jest collects every authored executable TS/TSX file under `app/` and `src/`, including unimported files. Exclusions remain tests, static `src/theme/tokens.ts`, generated type-only `src/types/database.ts` and declarations. Thin routes remain collected and receive named integration coverage below. No executable file is excluded to meet a gate.

Required global thresholds remain **90% statements, lines and functions; 85% branches**. Explicit **100% branch** gates cover:

- Environment validation; Auth validation/callback/service/session lifecycle and mounted AuthProvider/AuthGate; native PKCE crypto; secure session storage/client construction; Grind membership/settings contracts, account-bound settings writes and guarded sign-out/runtime scope.
- All training domain modules (schemas, command validation, decimal conversion and Previous matching).
- All training service modules (API/transport/error handling, queue persistence/state/projection/replay/timer decisions) and mounted `TrainingProvider` orchestration.
- Workout raw-input validation/reorder helpers; appearance resolution/persistence and `ThemeProvider` lifecycle.

Jest subtracts modules with explicit file/glob thresholds before computing its `global` bucket. Therefore all-files aggregate percentages may exceed policy while the global remainder still fails. Both matter; do not remove critical gates, lower global thresholds or hide files to solve this. Every new critical executable module must receive an equivalent gate and meaningful boundary tests. Ordinary rendering components do not need artificial 100% branch gates.

Strict lint rejects explicit `any`, unchecked non-null assertions, `ts-ignore` and `ts-nocheck`. A described `ts-expect-error` is not a substitute for correctly narrowing runtime data.

## Route and layout integration mapping

`tests/routesM3.test.tsx` registers the actual Expo Router route modules and real layouts, with bounded destination-screen mocks so assertions isolate registration, parameter forwarding and layout composition. Its **29 route cases** cover:

| Actual route/layout | Named test coverage |
| --- | --- |
| `app/(tabs)/_layout.tsx`, `index.tsx`, `history.tsx`, `exercises.tsx`, `settings.tsx` | Intended Train/History/Exercises/Settings composition, all four native-tab accessibility labels and Resume placement outside the tab navigator |
| `app/workout/_layout.tsx`, `index.tsx`, `finish.tsx`, `summary.tsx` | Workout/finish/summary registration; summary id forwarding and absent-id fallback; protected workout destination withheld by layout gate |
| `app/history-detail.tsx`, `exercise-detail.tsx`, `routine.tsx` | Registered detail destination, exact id forwarding, absent-id fallback |
| `app/custom-exercise.tsx`, `routine-edit.tsx` | Create routes omit optional id; edit routes pass selected id |
| `app/exercise-picker.tsx` | Routine picker context; absent/unsupported target defaults to workout |
| `app/auth/_layout.tsx`, sign-in/sign-up/recovery routes | Registered signin/signup/recovery form modes with actual layout composition |
| Callback/setup/verify/new-password re-export routes | Registered destination screens; executable behavior belongs to their direct feature tests |

These are parameter composition tests, **not a claim that arbitrary route IDs are validated** or that native navigation/deep links are accepted. The actual root navigator/AuthGate behavior remains separately exercised by `tests/routing.test.tsx`: signed-out cold launch redirects before protected Train content mounts. Direct `AuthGate.test.tsx` covers guard decisions. Real feature interaction tests below exercise the destination behavior behind the route mocks.

## Component and executable-module mapping

Paths below are relative to `src/` unless otherwise stated. Tests are colocated. A mapping describes assertions, not blanket completeness.

| Module(s) | Behavioral test evidence |
| --- | --- |
| `components/Button`, `Heading`, `Screen` | `components/components.test.tsx`: accessible button state/callbacks/variants, semantic heading, safe-area/keyboard layout and theme behavior; real primitives also mounted in feature tests |
| `features/auth/AuthScreen`, `NewPasswordScreen`, `SetupScreen`, `VerifyScreen`, `CallbackScreen` | Individual screen tests: input validation, normalized email, safe failure copy, pending/retry/navigation, setup acknowledgement, recovery gates, callback replay, resend cooldown and owned interval cleanup |
| `features/auth/AuthProvider`, `AuthGate` | Individual tests plus actual root routing: verified session/recovery/account changes, membership/setup/error routing, cleanup and retries; underlying session races tested in lifecycle module |
| `features/auth/{authService,validation,authCallback,sessionLifecycle}` | Individual tests: exact callback allowlist and PKCE exchange, safe errors, current shared-password contract, getUser identity validation, stale auth events, local sign-out and recovery latch |
| `services/{environment,authCrypto,secureSessionStorage,supabase,grindAccount,scopedSettings}` | Individual tests: local-only/public-key guard, native secure RNG/S256, chunked secure storage/corruption/cleanup, client initialization, Grind-only RPCs and expected-account settings ownership |
| `domain/training/{primitives,schemas,commands,loads,previous}` | Individual tests: strict bounds/unknown keys, all command variants, all four load modes, completeability, exact canonical decimal preview, display-only conversion and working/warm-up ordinal Previous matching |
| `services/training/{api,transport,errors}` | Individual tests: fixed schema and RPC shape, response validation, bounded expected-account token checks, missing/auth/network/malformed/conflict classifications and sanitized feedback |
| `services/training/{outbox,outboxPersistence,outboxState,projection}` | Individual tests: durable-before-projection writes, exact operation replay, conflicts/review/reapply/discard, bounded scoped raw input, lost responses, storage failure, all commands, finish and timer decisions, disposal and restart reconciliation |
| `features/training/TrainingProvider` | `TrainingProvider.test.tsx`: StrictMode lifecycle, identity-scoped factory, disabled/no-IO behavior, retained navigator children, account switch disposal, completion-notification deduplication, foreground replay of pending/error work, conflict protection, removed foreground listeners and action forwarding. Rejected actions that update provider state are awaited inside `act` |
| `theme/{appearance,ThemeProvider,AppearanceControls}` | Individual tests: System/Light/Dark, native scheme changes, account/backend persistence, stale reads/writes, storage failures/retry and accessible choice state |
| `features/shell/{AppRuntime,SettingsRoute,SettingsScreen,PlaceholderScreen}` | Individual tests: root scope and navigator, preference acknowledgement/retry/account changes, sign-out Stay/discard/dismiss/failure guard and honest unavailable behavior |
| `features/home/{TrainScreen,ResumeStrip}` | `TrainScreen.test.tsx`: start/resume/routine/history navigation, acknowledged routines, disabled/loading/retry/error states and scoped API availability |
| `features/workouts/{WorkoutScreen,SetEditor,ExerciseEditor,RecoveryControls,FinishScreen,SummaryScreen,fields}` | `features/workouts/screens.test.tsx`: raw editing/validation, completion, ordering, notes/rest, Previous rows, timer adjustment/errors, conflict actions, finish review/remove-incomplete/save/cancel, acknowledged summary; pure helper boundaries included |
| `features/history/{HistoryScreen,WorkoutDetailScreen,SessionDetails}` | `features/workouts/screens.test.tsx`: server-backed pagination/detail, loading/empty/failure/retry, saved snapshots and accessible original units. Cross-feature tests import public history exports where appropriate |
| `features/exercises/{catalog,fields,ExerciseLibraryScreen,ExerciseDetailScreen,CustomExerciseScreen,CustomExerciseForm,ExercisePickerScreen,ExerciseHistory}` | `features/exercises/screens.test.tsx` and integration regressions added during M3 fixes: combined filters/selection, contextual picker, custom create/edit/archive, validation, retries, actual performance/history and owner boundaries |
| `features/routines/{draft,RoutineEditorScreen,RoutineDetailScreen,TemplateExercise}` | `features/routines/screens.test.tsx`: scoped drafts, picker return, atomic saves/versions/conflict review, unsaved navigation, template controls, archive/start and source-value preservation |
| `state/useEditorStore` | `useEditorStore.test.ts`: account-boundary reset |
| `features/preferences` and `components/LoadUnitControl` | Coordinator-owned focused tests: preference-backed defaults and display-unit changes that preserve entered source values. See current source tests for exact final cases during integration |
| Static tokens, generated database types, declarations and behavior-free re-export modules | No artificial execution tests; actual theme/schema and registered destinations tested through consumers |

## Latest verification in this quality lane

Pinned runtime: Node24.11.1. Focused route/provider command:

```sh
npm test -- --runTestsByPath tests/routesM3.test.tsx src/features/training/TrainingProvider.test.tsx
```

Result: route/provider checks initially passed **2 suites / 32 tests**. After adding AuthProvider initialization/refresh/stale-callback tests and completion-notification tests, the expanded focused command passed **3 suites / 37 tests**, with no provider `act` diagnostic. Additional foreground-replay scenarios now bring the mounted TrainingProvider suite to **6 tests**, all passing. AuthProvider-only (4 tests) and TrainingProvider-only (6 tests) coverage runs each reach **100% statements, branches, functions and lines**, using strict CLI100 thresholds without weakening repository gates. Final scoped ESLint with `--max-warnings 0` and typecheck pass. Intermediate full runs exposed a concurrently edited AppRuntime test failure; all remaining configured critical gates passed after AuthProvider race coverage was added. Use BUILD_STATUS.md for final aggregate evidence rather than interpreting these focused results as complete milestone sign-off.

## Historical policy-adoption baseline

On 27 October, adoption exposed pre-existing debt: 17 suites/29 tests passed, while coverage was70.83% statements/70.90% branches/63.63% functions/74.87% lines and the newly enforced gates failed. Seven unchecked non-null assertions were subsequently removed. This is a historical baseline, not current readiness; focused implementation and test remediation have progressed since then. No threshold/exclusion was weakened to hide that baseline.

## CI and native/backend boundaries

No remote CI run is claimed here. CI includes no automatic hosted deployment, provider request, production migration, source-account access or secret injection. The backend integration harness depends on the canonical BabyBoo migration stream, so a standalone mock CI backend-green badge would be misleading. Run its guarded disposable local checks and record actual results until an approved reproducible CI-source strategy exists.

Python safety tests validate harness targeting/source-drift guards using fictional temporary files. They do not prove SQL, real Auth/API, native secure storage, physical notifications, background timers or hosted settings. Those gates remain separate in BUILD_STATUS.md and AGENT_STATUS.md.

## Final M3 integration additions

- `tests/workoutRecovery.test.tsx` mounts the actual training controller/provider and workout/finish UI across unmount/reopen. It verifies unblurred name/notes/rest recovery, no premature writes, finish blocking and field cleanup after acknowledged commands.
- `features/workouts/useWorkoutDraft.test.tsx` covers raw restoration, rapid writes/storage failure and deferred writes across workout/field-key switches.
- `features/preferences/preferences.test.tsx` verifies setup-gated scoped settings defaults, invalidation/refetch and failure retry. `components/LoadUnitControl.test.tsx` verifies display conversion without changing populated source units, empty-entry unit choice and partial-value guards.
- `services/trainingCache.test.ts` and mounted TrainingProvider callback tests cover completion invalidation, recovered completion and duplicate-emission suppression.
- Final command results are in BUILD_STATUS.md; the initial failing run is retained as dated evidence. No thresholds/exclusions were weakened. Query test lifecycle warnings were addressed at the actual refresh interaction rather than suppressing console output.
