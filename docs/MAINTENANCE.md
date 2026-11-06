# GRIND development and maintenance workflow

27 October 2026. Written for GRIND's operating and engineering needs. [React Native standards](engineering/REACT_NATIVE_STANDARDS.md) owns mandatory source/testing rules; this document owns the maintenance procedure. [Task tracker](planning/TASKS.md) owns current assignments; [agent status](AGENT_STATUS.md) owns milestone evidence and blockers. User instructions take precedence.

## Before work

1. Read root README, agent status, documentation index and current task tracker. Read affected product/design/architecture/setup contracts before a scoped change; all specifications before initial implementation.
2. Inspect current files, version-control state and pre-existing modifications. Do not overwrite another task's work or attribute an existing failure to a new change without evidence.
3. Define scope, dependencies, allowed files, single owner per file, observable acceptance and verification commands. A task written in a document is a handoff, not authorization to expand the user's request.
4. Assign architect/designer/developer/reviewer work only through verified native delegation. Keep shared contracts stable before parallel edits; otherwise explain the supported alternative without pretending delegation occurred.

Keep the app at the GRIND root. Follow existing src/services/ and src/types/ boundaries; adopting BabyBoo's practices does not require a cosmetic directory migration. Aim around 100 lines per authored source file and split before 250 where practical; generated types, cohesive migrations and fixtures have explicit exceptions.

## Normal change workflow

- Implement one approved, runnable milestone slice. Keep UI, orchestration, domain rules, persistence and native services separate. Reuse existing components/contracts before creating abstractions.
- Add meaningful tests for every authored/modified executable component, screen, hook and logic module in the same change, including one-use modules. Record named integration coverage for thin routes/layouts. Type-only/generated/static files do not need artificial execution tests.
- Test observable behavior: primary actions, validation, loading/error/retry/empty states, drafts, duplicate taps, stale results, account boundaries and cleanup. Do not replace assertions with snapshots or percentage targets.
- Run typecheck, strict lint, tests and coverage. Required gates: at least 90% statements/lines/functions and 85% branches, with 100% branches in critical decision modules. Never lower a threshold, skip a test or exclude executable code to hide a failure. Record existing debt explicitly; policy adoption does not establish compliance.
- Obtain independent reviewer feedback, integrate fixes, rerun relevant checks after changes, and update owning specs/task/evidence documents before handoff. Describe what changed, why, actual tests and material limits.

## Verification commands and meaning

Use the pinned runtime with `nvm use`; use the single committed-source package-lock.json and exact compatible direct dependencies. Run from the GRIND root:

```sh
npm run typecheck
npm run lint
npm test
npm run test:coverage
node --check design/mvp.js
PYTHONDONTWRITEBYTECODE=1 python3 -m unittest discover -s scripts/backend -p 'test_*.py' -v
```

Run focused suites during iteration and the complete required quality gates before declaring completion. The prototype syntax check is not an interaction test. Changes to preview behavior require its own focused browser/state verification; native implementation requirements come from product/design specifications, not HTML shortcuts.

The configured CI workflow runs deterministic app quality checks, both-platform JS exports and Python harness-safety tests without hosted credentials. Workflow configuration is not proof of a remote CI run. GRIND backend tests stage only this repository's migration and test files. [Coverage mapping](engineering/TEST_COVERAGE.md) records current compliance and gaps.

`npm run export:android` and `npm run export:ios` check JavaScript/Hermes bundles; native compilation, install, process launch, visual interaction and physical-device acceptance are separate evidence levels. Current local-only/production-export environment behavior is documented in [setup](SETUP.md).

## Dependencies and native changes

- Check official current compatibility before SDK/API/package changes; keep one package manager and lockfile. Add dependencies for a concrete need, review lockfile changes and run install/compatibility checks. Never apply `audit fix --force`, incompatible overrides or unsafe workarounds just to clear a warning.
- Record advisory/peer-dependency warnings, reproducible failures and what was actually evaluated. Do not copy another project's vulnerability counts or assume they apply to GRIND.
- Rebuild native binaries after adding/removing native modules, config plugins, app identifiers, launcher/splash assets, widget extensions or packaged notification sounds. Metro reload/Expo Go/JS export cannot verify those changes.
- During SDK upgrades, review any SDK-internal native/notification import paths, secure crypto/session adapters and callback handling. Run regression checks on both platforms and document unsupported versions/OS delivery limits.
- Preserve bundle/package IDs, callback schemes, keychain/session/draft namespaces and notification identifiers during cosmetic rebranding. Intentional identifier/storage changes require migration/cleanup/rollback handling. Where Android channel sound configuration is immutable, use a reviewed channel transition rather than claiming an existing channel changed.
- Keep unrelated Metro servers, emulators and database stacks intact. GRIND uses its documented ports; only stop/reset resources belonging to the assigned task.

## Persistence and account lifecycle

Supabase owns authoritative data. Keep bounded account/environment/workout-scoped drafts rather than a second offline replica. Preserve original decimal input and units, stable entity/operation UUIDs, serialized writes and server revision checks across retries/restarts. Show Saved only after acknowledgement. Expired auth retains same-account pending work; explicit sign-out/account switching follows the specified warning/discard rules and prevents cross-account upload.

Keep SDK tokens in tested bounded secure storage and expose only the minimum identity to feature UI. Password drafts remain transient. Validate restoration with the server; handle restore/auth-event races, duplicate callbacks and unmounts. Validate exact callback destinations and unique parameters. Initialize secure native randomness/S256 before Auth SDK use; a narrow crypto bridge is not a complete local JWT verifier.

Native timer correctness uses a persisted deadline, not a continuously running background JavaScript interval. Review replacement/uncompletion/skip/restart/finish/cancel/sign-out/deletion cleanup and notification routing. Permission denial keeps the in-app experience usable. Record physical lock/background/restart/force-stop/reboot outcomes instead of promising delivery under every OS condition.

## Database, provider and environment maintenance

- GRIND's active standalone target is project `mgyzzipsqmsabptrfchw`; its public client URL/key live in ignored owner-only `.env.local`. Migrations are owned by root `supabase/migrations`. Both the 555xx primary local stack and 554xx disposable regression stack use GRIND-owned files and configuration.
- Hosted migrations and selected GRIND data transfer to this target are complete. Verify the linked project ref before future hosted operations. Keep all other app projects, credentials and data outside GRIND workflows. The 701-row RepDB catalog was published for the user-approved authenticated, app-bound use; further publication, raw dataset redistribution and unreviewed hosted changes remain outside that authorization. See [catalog plan](EXERCISE_CATALOG_PLAN.md).
- Do not run the minimal standalone Auth bootstrap against full Supabase or hosted databases. Use fictional disposable fixtures with exact cleanup scope and real constraints/RLS/RPC/concurrency checks. Preserve the existing baseline SQL-engine blocker as a failed/unverified check, not a pass or reason to weaken assertions.
- Generate database types into a temporary file, verify successful nonempty output from the intended schema, review it, then replace the client-owned generated file. Runtime response validation and database constraints remain required.
- If a future hosted operation is explicitly authorized, verify target and pending migration history/dry run, execute CLI database operations sequentially, review results and document rollback. Shared CLI temporary-login initialization may contend; retry read-only checks sequentially rather than resetting database credentials. No automatic hosted push, production fixtures, secret upload or deployment.
- Provider permanent keys belong server-side. Live MuscleWiki calls remain disabled until authorized and entitlement/retention/budget gates clear. Do not log/persist signed playback URLs or media tokens, or extend expired content lifetime on reads.
- [M8](IMPLEMENTATION_MILESTONES.md) standalone migration is implemented. GRIND's Auth, local backend tools and deployment use GRIND-owned resources only. User sign-in/recovery, authenticated API/RLS behavior and physical-device evidence remain open.

## Documentation and task maintenance

Use one owning source per fact and link elsewhere. Keep actual behavior separate from proposed behavior, and local results separate from hosted/native results. Update specifications alongside code; setup contains only actual available commands with explicit verification limits. Keep Markdown links and paths valid when moving files.

Task states: **Todo** (not started), **In progress**, **Implemented** (code exists, acceptance incomplete), **Blocked** (specific unmet dependency/failure), **Verified** (named acceptance checks passed), **Deferred** (outside active scope). Implemented is not Verified. Include owner, allowed paths, dependencies, acceptance, commands/results, blocker and next step. Never label a whole milestone complete while required gates remain open.

## Adaptation boundary

GRIND's engineering standards and product requirements are owned by GRIND documents and code. GRIND has no runtime, authentication or development dependency on another app.

Transferred: modularity, reuse, testing/CI, security, retries, accessibility, migration/type generation, dependency/native rebuild practices, documentation ownership and honest evidence. Adapted to workout/account/environment scoping, original units/canonical kg, session revisions and rest deadlines.

Excluded: unrelated care-product requirements, feeding/milk/nursing conversions, medical/reminder wording, other apps' visual assets/palette/mascot, callback/application/storage identifiers, project refs, credentials, historical test/audit counts and deployed-state claims. Historical 'tests not run' entries are evidence gaps, never exemptions from current testing rules. GRIND's own product decisions, provider restrictions, local-first boundary and M8 roadmap remain authoritative.
