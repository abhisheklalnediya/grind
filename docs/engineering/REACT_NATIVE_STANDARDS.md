# React Native engineering standards

Status: required for all new and modified GRIND mobile implementation. Adapted from BabyBoo development standards on 27 October 2026 at the user’s request. Existing-code gaps are tracked in [test coverage](TEST_COVERAGE.md) and [tasks](../planning/TASKS.md); adopting policy does not make current code compliant. Explicit user instructions take precedence.

## Architecture and module ownership

Build Android and iOS with Expo, Expo Router and strict TypeScript at the workspace root. Follow [architecture](../ARCHITECTURE.md), [product scope](../CODEX_TASK.md) and [milestones](../IMPLEMENTATION_MILESTONES.md). Verify current compatible versions from official documentation when scaffolding; commit one package-manager lockfile.

| Layer | Responsibility | Must not own |
| --- | --- | --- |
| app/ | Route layouts, params and screen composition | Business rules, SQL, queue or notification implementation |
| src/components/ | Shared, accessible UI primitives | Feature data fetching or persistence |
| src/features/<feature>/ | Feature screens, specific components and orchestration hooks | Another feature's internal implementation |
| src/domain/ | Pure validation, conversions, event rules and commands | React, navigation or native APIs |
| src/services/ | Repositories, Supabase adapters, secure storage and native service boundaries | Rendering or navigation |
| src/types/ | Generated database contracts and shared type-only declarations | Runtime validation or business rules |
| src/notifications/ and modules/rest-timer/ | Permission, scheduling, deadline reconciliation and native countdown adapters as implemented | Screen composition or workout persistence |
| src/theme/ | Semantic design tokens and shared styles | Feature logic |
| tests/ | Cross-module, backend integration and end-to-end scenarios | Production implementation |

Dependency direction: routes → features → domain/contracts; service/native adapters implement those contracts. Keep the established GRIND src/services/ and src/types/ layout; do not rename folders merely to mirror BabyBoo. Shared UI does not import feature modules. Keep domain modules independent of React and infrastructure. Inject repositories, clocks, UUID generation and native services at feature/application boundaries so logic is deterministic in tests. Avoid circular imports and a general-purpose service locator.

## Reusable components and logic

- Separate presentational components, orchestration hooks and pure business functions. UI renders props and emits callbacks; hooks coordinate state and services; domain functions express rules.
- Keep one clear responsibility per module. Prefer small composable components with explicit, typed props over large configurable components with many boolean flags.
- Reuse an existing component or function before adding another. Extract shared behavior when multiple consumers need the same contract; keep feature-specific code close to its feature. Do not build speculative abstraction frameworks.
- Keep reusable hooks concerned with one lifecycle or workflow. Hooks must obey React's hook rules, clean up subscriptions and avoid side effects during render. Derived values should be calculated rather than synchronized through redundant effects.
- Aim for roughly 100 lines per source file; split before 250 where practical. Generated types, cohesive migrations and fixtures may exceed that limit with a clear reason.
- Use descriptive names: PascalCase components/types, useX hooks and camelCase functions. Colocate styles, feature types and tests; promote only genuinely shared code to shared folders. Avoid miscellaneous utils files and broad barrel exports that obscure dependencies.

## State and data flow

- Keep transient component state local. Use Zustand only for transient state shared across screens; use TanStack Query for remote data/cache; use validated form drafts for editable input.
- Supabase is authoritative. Do not maintain a second authoritative workout/history list in a global UI store. Define query-key factories, account/backend-environment scoping, invalidation and optimistic reconciliation centrally.
- Preserve drafts through selection changes and validation errors. Preserve entered decimal loads and units; normalize to canonical kg on the server with decimal arithmetic and the documented exact lb conversion. Store UTC timestamps plus the workout timezone snapshot. Display rounding must not rewrite source values. Bodyweight/assisted modes require explicit semantics; never reinterpret assistance as ordinary lifted load.
- Validate external input, route parameters, environment configuration and server payloads with Zod at boundaries. Use discriminated unions for event variants and result/error states. Avoid any, unchecked assertions, non-null assertions and ts-ignore; narrow unknown values explicitly.
- Keep React props/state immutable and rendering pure. Model async state explicitly; guard against stale responses, duplicate taps, unmounts and account changes.

## Required tests for every component and logic module

Every authored component, screen, hook and executable logic module must have meaningful automated tests in the same change. A component used only once still requires tests. Thin route/layout wrappers need navigation/composition coverage; a named integration test may cover a wrapper instead of duplicating a trivial unit test. Document that mapping in the change.

Type-only declarations, generated database types, static tokens/assets and re-export-only modules do not need artificial execution tests. Code with behavior is not exempt because it is small or difficult to test.

| Subject | Minimum relevant behaviors |
| --- | --- |
| UI component | Accessible role/name/state, meaningful variants, interaction callbacks, disabled behavior and relevant loading/error/empty states |
| Screen | Primary user task, validation, navigation, draft preservation and async feedback/recovery |
| Hook/store | State transitions, success/failure, cleanup, cancellation/races, reset and account isolation where applicable |
| Domain function | Valid input, boundaries, invalid input, conversions, null/unknown values and time/timezone cases |
| Repository/queue | Persistence failure, retry classification, stable IDs, replay after lost acknowledgement, transactional receipts, session revisions and cancellation/correction rules |
| Auth/RLS | Owner read/write, anonymous denial, cross-owner denial for select/insert/update/delete and mutation RPC ownership |
| Notifications/native timer | Set completion/uncompletion, deadline restoration, +30/restart/skip, replacement/cancel, finish/discard, sign-out/account changes, tap routing and permission denial |

Use Jest with the Expo-compatible jest-expo preset and React Native Testing Library for components/hooks; use Expo Router testing utilities for navigation. Verify mutually compatible versions during setup. Assert observable outcomes with role/label/text queries and user interactions; use test IDs only where semantic queries are insufficient. Do not rely on snapshots, implementation details, hook internals or mocks that merely reproduce the tested implementation.

Keep tests beside implementation as Component.test.tsx or module.test.ts. Put broader scenarios under tests/integration/ and native flows under tests/e2e/. Maintain a shared render helper for real providers, a fresh query cache per test and small typed fixtures. Mock network, native APIs, clock and ID sources at boundaries; retain real domain logic. Tests must be isolated, deterministic and able to run without real credentials. Keep live Supabase/RLS tests separate and explicitly configured.

## Coverage and CI gates

Maintain scripts for typecheck, lint, test and test:coverage, plus a noninteractive CI job running all four. The initial GRIND scaffold preceded this standards adoption; record its actual compliance gaps rather than rewriting earlier verification claims. Configure coverage to include all authored executable TS/TSX, including unimported files under src/ and app/. List exclusions explicitly; never exclude a module merely to pass coverage.

Initial required thresholds are at least 90% statements, lines and functions, and 85% branches overall. Critical validation/environment, Auth/callback/crypto/session, conversion, queue/idempotency, ownership and timer decision modules require 100% branch coverage. These are team policy targets, not upstream framework guarantees. File-level or integration coverage must still demonstrate tests for every component/module: aggregate percentages alone are insufficient.

Do not lower thresholds, skip failing tests or hide coverage gaps to finish a task. Resolve the gap or report the blocker. Coverage is a safety net; meaningful assertions and failure scenarios are mandatory even at 100%.

Integration checks with local Supabase must verify real constraints/RLS/RPC behavior, rather than only mocking the JS client. Native end-to-end checks must cover sign-in/onboarding and key logging/recovery flows on both platforms. Permission dialogs, notification actions/delivery, accessibility, keyboard behavior and process termination need physical-device checks where applicable. JS tests do not establish native delivery or layout correctness. Never report an unavailable check as passing.

## UI, accessibility and navigation

- Reuse semantic theme tokens; use StyleSheet for native styles. Preserve the approved Volt Lime design, Train/History/Exercises/Settings tabs and the active workout outside tabs with Resume access. Keep logging one-handed and use restrained icons.
- Support safe areas, keyboard avoidance, narrow 320px logical widths, larger text and both platforms. Keep primary Save reachable without concealing fields or errors.
- Interactive targets must be at least 48px. Use accessible labels, roles, hints and selected/disabled states. Do not convey meaning solely with color or icons. Respect reduced motion and supported appearance choices. The user added dark/light appearance to M3; retain Volt Lime through semantic tokens and readable contrast in both modes. Default/System behavior follows the agreed product decision. Do not introduce further theme modes without product scope.
- Return to the originating screen and retain parent-tab context. Validate deep links and route parameters. Restore focus where relevant; avoid unnecessary rerenders that replace inputs or erase drafts.
- Design and test loading, empty, pending, saved, failed/retry, permission-denied and auth-expired states. Saved means acknowledged by the server; optimistic feedback means pending.

## Persistence, reliability and security

- Write an action durably before showing optimistic confirmation. Keep stable workout/set and operation UUIDs across retries. Serialize active-session commands; enforce transaction receipts, payload identity and expected revisions on the server.
- Scope queue, cache and preferences to the correct backend environment/account/workout. Do not erase unsaved work silently or upload it under a different account. Sign-out must follow the product's pending-write and notification rules.
- Classify errors into actionable auth/validation/conflict failures and transient retryable failures. Bound retries with backoff/jitter. Do not swallow exceptions or show silent failed taps.
- Version database changes through reviewed migrations with constraints and owner-scoped RLS. Generated types do not replace runtime validation. Never auto-apply production migrations.
- Keep service-role keys and backend secrets out of client code, EXPO_PUBLIC variables, fixtures, logs and Git. Use an appropriate secure native auth-session adapter; AsyncStorage is for the limited queue/preferences, not secret storage.
- Do not log personal workout data, credentials, PKCE codes or provider token-bearing URLs. Account/workout fixtures must be fictional and development-only. Reviewed independently authored exercise catalog seeds may ship as product data; never mix sample workouts into real history. Validate exact allowed callback scheme/host/path and unambiguous parameters.

## Performance, dependencies and maintenance

Use stable list keys and virtualized lists for growing timelines. Avoid fetching or sorting large histories on every render; bound queries and profile real issues before adding memoization. Keep heavy work off the render path. Remove subscriptions/timers and cancel work when their lifecycle ends.

Use Expo-compatible packages and official platform APIs; add dependencies only for a concrete need. Record SDK-specific decisions and native requirements. Keep one clear public entry point per feature when useful, and avoid importing another feature's private files. Prefer explicit code over clever abstractions.

## Definition of done

1. The scoped behavior matches product/design specs and adds no deferred features.
2. Components and logic are modular, typed and tested; every executable module has direct tests or an explicit integration-coverage mapping.
3. Typecheck, lint, tests and required coverage pass. Backend/native checks appropriate to the change pass or are precisely recorded as unverified blockers.
4. Accessibility and all relevant async/error/recovery states are covered; no known data-loss or ownership defect remains.
5. Update setup with actual commands, docs/AGENT_STATUS.md with results and gaps, and affected specifications/decisions alongside the code.
6. Report changed behavior, checks actually executed and material limitations. A milestone is complete only when its specified gates pass.

## Official references

- [React rules](https://react.dev/reference/rules): pure rendering, hook rules and immutable state.
- [Expo unit testing](https://docs.expo.dev/develop/unit-testing/): jest-expo and React Native Testing Library setup.
- [Expo Router testing](https://docs.expo.dev/router/reference/testing/): route-level integration testing.

These are references inherited from the source standards, not claims of fresh verification during this adaptation. Recheck official version-specific APIs whenever choosing/upgrading packages.

## GRIND-specific operating boundaries

Read [maintenance](../MAINTENANCE.md) before dependency, schema, native configuration or release work. Local M0/M1 uses the guarded disposable backend; the running BabyBoo stack and hosted configuration are not a test target. Current shared migration/Auth boundaries remain authoritative until [M8 separation](../IMPLEMENTATION_MILESTONES.md) is approved and implemented. Never assume changing a URL migrates identities, sessions or data. Provider live calls remain disabled until explicitly authorized. Existing blocked BabyBoo regression, native iPhone/signing and timer/device gates remain open regardless of policy adoption.
