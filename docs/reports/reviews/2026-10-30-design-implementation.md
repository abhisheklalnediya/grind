# Design and implementation review — 30 October 2026

Scope: current native M0–M3 code against `design/mvp.html`, `design/DESIGN_NOTES.md` and product/engineering specifications. User explicitly requested GPT Luna checks and corrections. Three GPT-6 Luna specialists performed exercise design review/correction, service review/correction and an independent read-only screen/diff review. Coordinator integrated the fixes. Existing standalone migration/configuration changes were preserved.

## Findings and corrections

| Finding | Correction | Evidence |
| --- | --- | --- |
| Exercise error also presented as empty catalog | Empty result UI now requires query success; error retains its retry path | `src/features/exercises/ExerciseLibraryScreen.tsx`, `screens.test.tsx` |
| Settings save trusted returned owner despite account-bound request | Validate response user_id against the bound account and reject mismatch | `src/services/scopedSettings.ts`, `scopedSettings.test.ts` |
| Routine save could discard edits made during the pending request | Synchronous in-flight guard blocks duplicate submission and navigation; pending status temporarily replaces editable controls. Failure restores the preserved draft | `src/features/routines/RoutineEditorScreen.tsx`, deferred-promise test in `screens.test.tsx` |
| Routine details omitted load/repetition/time/distance targets and total set count | Added `RoutineTargets` with original units, working/warm-up distinctions, unspecified values and bodyweight/assistance semantics; detail shows total planned sets | `src/features/routines/RoutineTargets.tsx`, `RoutineDetailScreen.tsx`, integration regression in `screens.test.tsx` |

Independent reviewer confirmed these corrections and found no further actionable issue in the reviewed diffs. This is scoped software sign-off, not whole-app acceptance.

## Design review limits and remaining work

Current source includes elapsed workout time, top-bar Finish, previous/load/reps/completion rows, keyboard controls and recent sessions on Train. The earlier build-status audit incorrectly still listed these as missing; its findings are now annotated as historical. Source presence does not establish native visual fidelity.

History list rows still provide less context than the prototype (names under dates rather than richer duration/set summaries). Full native layout polish remains open. No physical-device screenshots, keyboard, large-text, screen-reader, native timer, Auth/sign-in/recovery or hosted RLS acceptance was performed in this review. No new provider requests, database operations, native build, JS exports, deployment or spending occurred. Current standalone backend and RepDB release/rights gates remain unchanged.

## Verification

Executed using Node 24.11.1 at the integration checkpoint:

- `npm run typecheck`: PASS.
- `npm run lint -- --max-warnings=0`: PASS.
- `npm run test:coverage`: PASS, all 57 suites / 308 tests. This executes the complete test suite with coverage; an additional duplicate noncoverage run was unnecessary.
- Aggregate coverage: 97.66% statements, 93.31% branches, 96.45% functions, 98.32% lines. Existing global remainder and explicit critical gates pass unchanged. All executable app/src files remain collected; no thresholds or exclusions changed.
- `node --check design/mvp.js`: PASS (syntax only).
- `PYTHONDONTWRITEBYTECODE=1 python3 -m unittest discover -s scripts/backend -p 'test_*.py'`: PASS, 10 harness-safety tests, no database execution.
- Focused exercise, service/recovery, routine and independent screen suites also passed during iteration. Final routine suite contains 17 tests.

Full Jest checkpoint output: [coverage log](2026-10-30-design-coverage.txt). Coverage metrics are also in the generated local `coverage/coverage-summary.json`. No remote CI result is claimed.
