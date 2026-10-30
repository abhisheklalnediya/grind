# GRIND document index

## Development and maintenance entry points

Read [build status](BUILD_STATUS.md) for current checks and blockers, [agent status](AGENT_STATUS.md) for actual evidence and [live tasks](planning/TASKS.md) for current assignments, then the affected specifications below. Before implementation or maintenance, read the required [React Native standards](engineering/REACT_NATIVE_STANDARDS.md) and [maintenance workflow](MAINTENANCE.md). Explicit user instructions take precedence; requirements override prototype shortcuts.

| Document | Owns |
| --- | --- |
| BUILD_STATUS.md | Maintained current build health, check results, artifacts, defects and acceptance gaps |
| AGENT_STATUS.md | Milestone-level completed checks, gaps and blockers |
| planning/TASKS.md | Live task assignments, task states, allowed paths and acceptance |
| engineering/REACT_NATIVE_STANDARDS.md | Mandatory module, testing, accessibility and quality policy |
| engineering/TEST_COVERAGE.md | Named module-to-test mapping and measured compliance gaps |
| MAINTENANCE.md | Dependency/native/database/security/documentation procedures and adaptation boundary |
| SETUP.md | Available commands and environment/device setup, with verification limits |

Keep each fact in its owning document and link elsewhere. Update affected specifications with code; do not duplicate state trackers or treat a proposed task as authorization.

## Current catalog decision

29 October: [self-hosted catalog implementation plan](EXERCISE_CATALOG_PLAN.md) owns RepDB Free adoption and rights-gated supplementary Free Exercise DB usage. It supersedes earlier MuscleWiki MVP selection and streaming requirements.

## Specification reading order

1. [Architecture](ARCHITECTURE.md): system boundaries, data model, commands, recovery, timers and acceptance.
2. [Exercise media and backend](EXERCISE_MEDIA_MODULE.md): current standalone backend boundary, migration ownership and provider gates.
3. [MVP pages](MVP_PAGES.md): navigation, screens, interaction states and visual direction.
4. [Development task](CODEX_TASK.md): complete Phase 1 scope; local implementation through M3 is authorized.
5. [Product vision](PRODUCT_VISION.md): future roadmap, distinct from MVP.
6. [Future data model](DATA_MODEL_FUTURE.md): future domain notes, not migrations.
7. [Agent status](AGENT_STATUS.md): review results, unresolved decisions and current work.
8. [Implementation milestones](IMPLEMENTATION_MILESTONES.md): M0–M8 sequence, owners, dependencies and acceptance gates; standalone migration is complete, with Auth/RLS/device acceptance open.

9. [Local setup](SETUP.md): runtime, guarded backend commands and device/toolchain gates.

## Decision precedence and open alignment

The 30 October standalone decision supersedes all earlier shared-project, shared-Auth and cross-app migration instructions. GRIND uses only its standalone project `mgyzzipsqmsabptrfchw`, its own Auth users and [`supabase/migrations`](../supabase/migrations/). Do not use another app's source, configuration, credentials, data or local stack for GRIND development or runtime.

M0 aligned the older generic account-deletion and local initialization instructions with this amendment. Review findings and other pending decisions are tracked in AGENT_STATUS.md. Provider entitlement/terms and hosted settings have not been verified by this cleanup.

- [Through-M3 coordination and pending product choices](planning/M1_M3_EXECUTION.md)

## Foundation decisions

- [M0 historical contracts and tooling](decisions/M0_FOUNDATION.md) (shared-backend design is superseded; do not follow it)

## Design references

- [Current clickable MVP prototype](../design/mvp.html)
- [Design handoff and page/state coverage](../design/DESIGN_NOTES.md)
- [MVP screen board](../design/mvp-preview.html)
- [Interactive exercise prototype](../design/exercises.html)
- [Brand concept board](../assets/branding/concept-board.png)

Prototype data is illustrative. Native behavior, persistence, accessibility and notifications require implementation and device verification.
