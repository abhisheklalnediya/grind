# Repository, architecture and test review — 6 November 2026

Scope: review current GRIND source, documentation, quality configuration and representative tests at commit `d65204a`. Coordinator and two independent read-only Luna reviewers sampled app, services, recovery, Auth, set types and tests. This is not an exhaustive security audit or launch sign-off. No hosted operations or device-data changes were performed. Actionable work is assigned in [tasks](../../planning/TASKS.md); current build evidence belongs in [build status](../../BUILD_STATUS.md).

## Conclusion

GRIND has a credible foundation for an early-stage workout logger: typed app/service/domain boundaries, server-authoritative mutations, validation, account-scoped recovery, and substantial automated tests. There is enough automated coverage to support ongoing development, but not enough end-to-end evidence to call the app launch-ready. Instrumented coverage cannot prove real native behavior, hosted isolation, notification delivery or the safety of unimplemented features.

## Current checks

- Node 24.11.1: typecheck and zero-warning lint passed; Jest coverage passed with 69 suites and 382 tests: 96.97% statements, 92.65% branches, 95.64% functions and 97.8% lines. Jest emitted intermittent React `act(...)` warnings in virtualized-list and History-related tests; investigate their asynchronous cleanup and assertions rather than suppressing them.
- Ten backend harness-safety and 30 catalog Python tests passed. These are not a database replay or authenticated hosted check.
- The last recorded Android emulator sign-in reached Train; no full workout/restart/device journey, physical device, hosted RLS, SQL replay or release build was performed in this review.

## Findings

### High — Critical journeys lack end-to-end acceptance

The mounted recovery tests exercise real provider/UI interactions and simulated remounts, but do not prove a complete real backend and native lifecycle journey. Route tests mock Auth/provider boundaries, and in-app timer tests do not prove background notifications or OS delivery. Complete an isolated Android and iOS journey and targeted physical-device checks, covering interrupted save, resume, account isolation, time/permission and recovery cases. Native timer features are not yet implemented. See [workout recovery tests](../../../tests/workoutRecovery.test.tsx), [routing tests](../../../tests/routing.test.tsx), and [MVP checklist](../../planning/MVP_CHECKLIST.md).

### High — Database and catalog checks are not part of CI

[CI](../../../.github/workflows/ci.yml) runs app checks, JS exports and Python backend harness-safety tests. It does not run catalog Python tests or replay the GRIND SQL/RLS/RPC suites against a disposable database. The repository has SQL tests and local Auth/API harnesses, but their existence does not mean every CI change verifies them. Add catalog tests to CI and design a reproducible GRIND-owned disposable database job, with no hosted credentials, destructive resets or unrelated application dependencies; retain explicit isolation and API assertions. Audit the coverage of cross-user read/write and RPC denial before claiming the full matrix.

### Medium — Critical-module branch thresholds need an enforcement audit

Jest includes all executable `app/` and `src/` files and enforces overall thresholds plus explicit 100% gates for many critical modules. The new [authDiagnostics.ts](../../../src/features/auth/authDiagnostics.ts) currently has 100% observed branch coverage but is not named in the critical threshold list in [jest.config.cjs](../../../jest.config.cjs). Audit newly added security/validation/timer logic for the same issue and add explicit enforcement and meaningful tests where applicable; do not infer a failure of current coverage from the missing guard.

### Medium — Several modules are difficult to maintain safely

The project aims for focused modules and splitting before 250 lines where practical. The reviewed `src/services/training/outbox.ts` is 494 lines and is an existing documented cohesion exception; `RecoveryControls.tsx` is 440, `ExercisePickerScreen.tsx` 402, `ExerciseEditor.tsx` 395 and `TimedSetEditor.tsx` 369. These sizes are maintainability risks, not demonstrated functional defects. Decompose in bounded, independently reviewed slices only when equivalent race, retry, recovery and lifecycle tests can be retained; avoid a broad rewrite of the serialized outbox.

### Medium — Release and repository distribution need review

The working tree was clean at review start; the branch was three commits ahead of its configured remote. The repository tracks the RepDB dataset and image assets and its license restricts dataset redistribution. Verify actual remote visibility and distribution terms before pushing/publishing further; do not assume private/public status or remove assets and break builds without a migration plan. Store package IDs, iOS signing, policies, accessibility and release-device acceptance remain open.

### Low — Documentation and test hygiene can drift

The 6 November coverage run passed but emitted React `act(...)` warnings. Also, [test coverage mapping](../../engineering/TEST_COVERAGE.md) still contains historical references to a superseded shared backend, which can mislead CI planning. Update the map to describe current GRIND-owned tooling while preserving dated historical evidence.

## Strengths and limitations

- Training API/transport samples check expected identity and validate boundary responses. The outbox has tests for retries, lost acknowledgements, storage failure and account isolation. These are valuable protections, not a formal proof of all paths.
- Auth tests exercise input validation, errors and async handling. Diagnostic logging is development-only and allowlists fields. Production errors still provide limited user-facing diagnosis; usability should be tested without exposing sensitive details.
- CI collects unimported application source and enforces significant thresholds, but percentages measure execution, not correctness or missing features.
- The review sampled code and tests. SQL security completeness, all feature boundaries, device behavior, dependency advisories and store compliance were not independently audited in full.
