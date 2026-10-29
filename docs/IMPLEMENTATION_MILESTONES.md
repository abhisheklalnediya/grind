# GRIND implementation milestones

Status: sequence planned on 25 October 2026; user subsequently authorized local implementation through M3. Both device platforms are available, live provider calls remain disabled, and M4–M8 and hosted operations are not automatically authorized. Current checks and device-acceptance gaps are in [BUILD_STATUS.md](BUILD_STATUS.md).

## 29 October 2026 amendment — self-hosted catalog

RepDB Free is the primary MVP exercise catalog and static-image source. Free Exercise DB is supplementary only after source-specific review; its images remain blocked until rights are documented. Follow the [self-hosted catalog implementation plan](EXERCISE_CATALOG_PLAN.md) for immutable snapshots, licenses/credits, additive schema/import, deduplication, private media storage, member-only APIs, caching, workout/custom integration and acceptance. This supersedes MuscleWiki selection, streaming/player/token/cache requirements for MVP; historical MuscleWiki material below is retained as context only. Existing shared-Auth/isolation, canonical migration and M8 cutover rules remain in force. Planning only: no data import, hosted change or code implementation is claimed.

## Starting point and scope

At the original planning checkpoint GRIND had architecture/requirements documents, specialist roles and a reviewed 21-view clickable design, with no application scaffold. React Native application and local database source now exist through M3; see [BUILD_STATUS.md](BUILD_STATUS.md) for current verified state. The HTML prototype uses simulated auth, saving, records and notifications.

Build the existing online-first iOS/Android MVP. Follow [ARCHITECTURE.md](ARCHITECTURE.md), its shared-backend amendment, [EXERCISE_MEDIA_MODULE.md](EXERCISE_MEDIA_MODULE.md), [MVP_PAGES.md](MVP_PAGES.md) and [design handoff](../design/DESIGN_NOTES.md). This plan sequences those requirements; it does not add future product scope.

## Sequence

| Stage | User-visible outcome | Depends on |
| --- | --- | --- |
| M0 — Alignment | Approved design baseline, contracts and development environment plan | User decisions below |
| M1 — Foundation and feasibility | Native app launches; secure sign-in and Grind onboarding work; timer/provider risks assessed | M0 |
| M2 — Reliable workout slice | Start → pick exercise → log sets → recover → finish → History | M1 |
| M3 — Everyday training | Routines, custom exercises, previous performance, preferences and dark/light appearance | M2 |
| M4 — Native rest experience | Reliable in-app rest controls, background alerts and supported OS countdown surfaces | M1 timer proof, M2 set lifecycle, M3 rest preferences |
| M5 — Records, corrections and data controls | Trustworthy records, deliberate history edits and Grind-only data deletion | M2/M3 data contracts; M4 cleanup integration |
| M6 — Exercise demonstrations | RepDB Free catalog and self-hosted static demonstrations with safe failure handling | Rights/release gates; M3 catalog identity |
| M7 — Beta readiness | Verified iOS/Android builds against approved hosted staging | M1–M6 and explicit hosted-change authorization |
| M8 — Standalone GRIND backend | GRIND runs on its own Supabase project/database, separate from BabyBoo | User-approved separation/cutover plan and validated migration rehearsal |

M2 is the first useful end-to-end logger, not the complete MVP. All M1–M7 features are required for the documented MVP. M4 and M6 can proceed alongside M3/M5 once contracts are stable and file ownership is separate. Provider integration must not block core logging development, but the self-hosted catalog/static-image acceptance gates must pass before declaring the full MVP complete; MuscleWiki entitlement is no longer an MVP dependency.

## M0 — Alignment and implementation contracts

Scope:
- Review the design baseline and record any requested changes; use the prototype as a visual/interaction reference, not production code.
- Confirm this GRIND root as the application repository and establish version control before code work.
- Approve one migration owner: recommended BabyBoo's existing Supabase stream, with a disposable combined local stack. Record exact migration/config/test paths before assigning edits; do not create a second hosted history.
- Choose SDK/minimum supported OS/device matrix after checking available tooling. Confirm access to physical iOS and Android devices for native acceptance.
- Resolve equipment/category taxonomy, load modes, numeric bounds/decimal precision, previous-performance matching, normalized-load equality and bodyweight/assisted rep-record grouping before schema/contracts depend on them.
- Align older generic account-deletion/local-init instructions with the shared-project amendment. Default deletion removes Grind data/membership and preserves shared Auth/BabyBoo data.
- Identify isolated local/staging test targets and hosted audit access. Do not reset or use production as a test environment.

Acceptance: short decision records, schema/RPC/error contracts, device matrix, precise task file owners and no unresolved ambiguity affecting the first implementation task. Later-feature details may remain pending until their dependent tasks begin.

Owners: architect proposes contracts; designer resolves page/state questions; coordinator records decisions; reviewer checks consistency.

## M1 — Runnable foundation and early feasibility

Scope:
- Scaffold Expo Router/strict TypeScript, four-tab shell, theme/components, typed Supabase service layer, Query/Zustand boundaries and validation setup.
- Create a reproducible combined local backend using the approved migration stream. Add Grind membership/settings and an independently authored seed catalog, with explicit schema exposure/grants/RLS.
- Implement signup, verification, login, reset/deep links, refresh, independent secure session storage, local sign-out and first setup.
- Prove local alerts plus Android chronometer/iOS Live Activity feasibility in native development builds on physical devices. This is an early proof, not the full timer lifecycle.
- Review provider entitlement, current integration contract and cache/backup retention route early. Use supplied synthetic fixtures without live calls. Actual provider calls, expenditure or hosted settings changes require explicit authorization. Record blocked access rather than assuming the key works.
- Audit shared hosted migration/Auth/schema configuration read-only when access is available; prepare a staging plan early. Any configuration change/deployment remains separately authorized.

Acceptance:
- Both native development builds launch and auth/setup errors/expired links are handled.
- A shared test identity enters Grind onboarding without creating BabyBoo records; Grind sign-out preserves BabyBoo's local session. Existing BabyBoo sign-in/onboarding/persistence regressions pass against the combined local test stack.
- Combined local migration replay succeeds. Anonymous/nonmember/cross-user access and malicious references are rejected; service-only schema is inaccessible to app clients.
- Physical-device timer proof records alert/countdown results, denied-permission behavior and supported versions.
- Provider readiness has a documented go/no-go and concrete remediation, without purchasing access automatically. A blocked provider does not block M2.

Owners: developer implements app/backend in explicitly separated tasks; architect owns contracts/native feasibility decisions; designer reviews shared components/auth; reviewer verifies isolation and replay.

## M2 — Reliable core workout slice

Scope:
- Train, seed catalog search/filter, picker and empty-workout start; one active session per user.
- Add/reorder/remove exercises and sets; working/warm-up types, input validation, completion/uncompletion and notes.
- Transactional start/apply/finish/cancel commands with operation receipts, payload identity, locking and revision checks; no direct-write bypass.
- Preserve entered units and authoritative decimal normalization from the first persisted set. Add timestamp-based in-app rest countdown pending full native integration in M4.
- Account-scoped durable raw-input drafts, serialized pending writes, truthful save status, foreground retry, expired-auth recovery and explicit conflict review.
- Finish review, saved summary, cancellation, paginated History/workout detail and historical snapshots with timezone grouping and stable pagination across date/timezone boundaries, including DST. PR presentation remains pending M5.

Acceptance: complete a real API-backed workout and reopen its exact saved values in History. Kill/reopen preserves acknowledged data and same-device unsent partial input. Command and receipt commit atomically; lost-success responses/retries do not duplicate sets; the same operation ID with a different payload is rejected. Concurrent starts yield one active workout; stale revisions cannot overwrite another device; finish cannot succeed with unresolved/unsent rows; cancelled sessions do not enter history metrics. Account changes do not leak drafts/caches. Newly creating/finishing a workout requires server acknowledgement.

Owners: developer owns command/backend and mobile tasks in sequence around shared contracts; designer checks one-hand logging/keyboard/error flows; reviewer exercises failure/recovery and authorization cases.

## M3 — Everyday training workflow

Scope:
- Routine create/edit/reorder/archive, template sets/targets/types/notes/rest defaults, atomic versioned save and start-from-routine snapshots.
- Custom exercise create/edit/archive with equipment/muscle/load convention and picker return context. Preserve references after archive.
- Previous performance beside set inputs and exercise-specific history using approved matching rules.
- Units/default rest/settings persistence and display conversion without modifying original entries; historical labels remain stable.
- Dark and light app appearance, requested by the user on 27 October: semantic theme tokens across all screens, persisted appearance preference, accessible contrast and appropriate status/navigation bars. User selected follow-phone/System as default with explicit Light/Dark overrides.
- Review routine/custom editor save/cancel, unsaved exit and version conflicts. Optional Save as routine only after required behavior is complete.

Acceptance: edit a routine or rename/archive an exercise without rewriting existing workouts; next routine start uses the new template. Cross-user custom references fail. Kg/lb changes, including mid-workout preference changes, preserve source values and use consistent display rules; previous performance matches the intended exercise/load convention. Picker selections survive search/filter changes. Dark/light appearance applies consistently across screens and persists at the agreed scope after restart without losing drafts, focus or saved data; both palettes pass relevant contrast, large-text and native system-bar review.

Owners: developer implements; designer checks editor/picker states; architect resolves remaining domain contracts; reviewer checks snapshot, unit and ownership invariants.

## M4 — Production native rest experience

Scope: integrate completion-driven scheduled local alerts and OS countdown surfaces; +30 seconds, duration adjustment, restart/skip, contextual permission request, denial/settings affordance, workout notification routing and deadline reconciliation after resume/restart. Cancel/replace alerts on uncompletion, finish, cancellation, sign-out/account switch and timer replacement.

Acceptance: physical iOS/Android evidence for foreground/background/locked screen, permission denial, process termination/reopen, stale-alert cancellation and expired presentation. Test/document force-stop, reboot, Focus/battery/exact-alarm limitations rather than claiming guaranteed delivery. Unsupported OS versions keep a clear in-app fallback. Expo Go alone does not establish acceptance.

Owners: developer owns native adapter/build configuration under one owner per platform file; architect reviews lifecycle; designer verifies timer/permission states; reviewer checks device evidence and residual limitations.

## M5 — Records, corrections and Grind data controls

Scope:
- Authoritative SQL records: eligible highest load, reps at normalized load and single-set volume; baseline/tie rules, working-set eligibility and separate bodyweight/assisted semantics.
- Exercise Records and workout summary metrics; historical records compare with preceding eligible sessions.
- Explicit completed-workout correction command/editor, validated save/cancel, refreshed history and derived records.
- Authenticated privileged Grind-only data deletion with clear confirmation, local cleanup and preserved shared Auth/BabyBoo data. Full shared-account deletion remains outside this plan pending its separate audit/approval.

Acceptance: tested warm-up/incomplete/cancelled exclusions, mixed-unit ties, load conventions and corrections changing/removing a record correctly. Ordinary active-workout commands cannot change completed sessions. Grind-only deletion affects only the test user's Grind data/membership, clears drafts/timers/session locally and leaves shared identity/BabyBoo data intact; another user's data remains inaccessible.

Owners: architect approves record/correction/deletion contracts; developer implements; designer checks records/correction/destructive copy; reviewer independently verifies SQL/security and cross-app preservation.

## M6 — Self-hosted exercise catalog and static demonstrations

Scope: execute [EXERCISE_CATALOG_PLAN.md](EXERCISE_CATALOG_PLAN.md), tasks C1–C6. RepDB Free is primary; Free Exercise DB supplements reviewed gaps only, with images blocked until documented rights approval. Snapshot immutable revisions/licenses, preserve stable UUIDs, normalize/deduplicate, import atomically, host approved static assets privately, implement member-only search/detail/filter services, bounded caching, visible attribution and workout/custom integration. No upstream runtime calls or native video player required.

Acceptance: all catalog-plan release criteria pass, including rights/provenance, import/retry/rollback, isolation, stable historical snapshots/Previous, zero upstream runtime traffic, credits, static-image fallback and native accessibility checks. RepDB-only launch is acceptable. This is planned work, not an import/deployment authorization or completed M6.

Owners: catalog/backend/app developers receive bounded C1–C5 assignments; reviewer checks C6 evidence. Existing hosted, spending, shared migration and M8 cutover gates remain.

## M7 — Hosted staging and beta readiness

Scope: with explicit authorization, apply the coordinated reviewed migrations/seeds/functions to an isolated hosted staging target, configure both-app redirects/email compatibility, and repeat the complete journeys on native builds. Perform large-text/screen-reader/contrast/reduced-motion/keyboard checks and resolve beta-blocking issues. Deliver exact build/run instructions and known platform limitations.

Acceptance: hosted schema/types match reviewed migrations; two-user/cross-app isolation and BabyBoo regression pass; signup/recovery links and server persistence work on physical devices; complete workout/routine/correction/records/media/timer/deletion flows pass. No unresolved data-loss, authorization or required-MVP blockers. Reviewer signs off against page/state coverage. Production release/store submission is a separate decision.

Owners: coordinator integrates/deployment review; developer performs authorized setup/fixes; designer reviews native accessibility and visual parity; reviewer independently validates the complete acceptance matrix.

## M8 — Standalone GRIND backend (plan point 8)

Added at the user’s request on 27 October 2026. Sharing BabyBoo’s backend is transitional; the intended destination is a standalone GRIND Supabase project/database. This adds the separation milestone to the roadmap, not permission to create projects, incur costs or move live data now.

Scope:
- Inventory GRIND-owned tables, functions, policies, seeds, provider services/secrets and dependencies on shared Auth. Establish GRIND’s own migration history from a reviewed standalone baseline without rewriting BabyBoo’s history.
- Design the Auth transition explicitly: which GRIND users move, identity/foreign-key preservation or mapping, credential migration feasibility, session invalidation/reauthentication and recovery/email callbacks. Do not assume changing the database URL transfers accounts, passwords or sessions.
- Rehearse selective GRIND schema/data migration into an isolated target. Exclude BabyBoo baby/care records and unrelated users; preserve GRIND workout history, custom exercises, routines, settings and ownership links.
- Configure GRIND-only Auth, redirects/email, grants/RLS, API/Edge Functions and provider configuration. Validate cache-retention rules and regenerate client types.
- Prepare reviewed backup, final-write reconciliation, cutover and rollback procedures; update application environment/session namespaces and verify existing installations can transition safely.
- Remove obsolete shared-backend dependencies only after validated cutover and explicit authorization for any source cleanup. Preserve BabyBoo functionality, identities and data.

Acceptance: standalone clean migration replay and restore rehearsal pass; GRIND data counts/references and historical values match the approved source scope; signup/login/recovery, ownership isolation, workouts/records/media and GRIND on both iOS and Android pass against the standalone target. BabyBoo regression passes with no GRIND runtime dependency. Cutover/rollback and any reauthentication required are documented and tested. No old data is deleted merely because the new target works.

Owners: architect designs separation/Auth contracts; developer implements reviewed migration/config/client tasks; designer reviews any account-transition messaging; reviewer validates data integrity, isolation and rollback; coordinator controls integration and explicit cutover approval.

## Task assignment and verification

Each task must record scope, dependencies, exact allowed files, one owner per file, acceptance criteria and commands/results in AGENT_STATUS.md. Milestone areas are planning boundaries, not blanket permission to edit sibling BabyBoo files or deploy.

| Area | Proposed ownership boundary after approval |
| --- | --- |
| Routes/features/domain/services/theme/tests/build config | Developer, split into bounded tasks; coordinator assigns shared files serially |
| System contracts/decision records | Architect; implementation consumes reviewed contracts |
| Prototype/design handoff and visual/state review | Designer; existing production contracts cannot be silently changed |
| Supabase migrations/tests/config | Single backend task owner in the approved shared stream; coordinate all cross-app changes |
| Independent findings and acceptance evidence | Reviewer; returns findings rather than silently rewriting implementation |
| Status, integration and release gates | Coordinator |

Verification commands and guardrails are maintained in [SETUP.md](SETUP.md); executed results and remaining device/hosted gates are in [BUILD_STATUS.md](BUILD_STATUS.md). Reset or test databases only through the approved disposable combined backend workflow. Physical-device and hosted checks require recorded evidence beyond unit tests.

Every milestone ends with a runnable demo where applicable, relevant checks, independent review, updated status and explicit remaining limitations. Timelines will be estimated after M1 toolchain/native feasibility; no unverified delivery dates are promised.

## Authorization recorded

The user explicitly authorized M0 and M1 after reviewing this plan, then requested implementation through M3. Coordinator assigned the existing BabyBoo stream a new forward migration with disposable combined local testing; design remains the current baseline subject to feedback. User confirmed local-first, both device platforms available and live provider calls disabled. This authorization permits bounded local work through M3, while hosted writes, deployments, purchases/provider spend and production release retain their explicit approval boundaries.
