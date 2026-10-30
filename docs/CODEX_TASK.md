# Codex Task — Phase 1: Cross-platform Workout Logger

Read README.md, docs/ARCHITECTURE.md, docs/PRODUCT_VISION.md, and docs/DATA_MODEL_FUTURE.md for context. **Implement only Phase 1**. The revised authenticated Supabase architecture supersedes the original SQLite/offline-first brief. Do not attempt the full future product in one pass.

Build an Expo / React Native / strict TypeScript application for both iOS and Android. Use Expo Router, Supabase Auth and Postgres with migrations/RLS, UUIDs, TanStack Query for API state, Zustand for transient UI state, Zod where helpful, and accessible dark-first theme tokens. Develop against real local Supabase, then validate hosted staging. GRIND / Volt Lime is the provisional default; STREAK / Industrial Amber is an alternative.

Features:
1. Home: start empty workout, saved routines, recent workouts.
2. Exercise library: search/filter, custom exercises and self-hosted static demonstrations. Follow docs/EXERCISE_CATALOG_PLAN.md for RepDB Free as primary, rights-gated supplementary content, ingestion/storage/search, attribution and acceptance.
3. Routine builder: exercises, ordering, template sets.
4. Active workout: warm-up/working sets, weight/reps, set completion, previous performance, durable API persistence, visible save state, bounded unsent device drafts and resume after process termination. Use transactional, idempotent commands and revision conflict checks.
5. Rest timer with background/locked-screen end alerts and ongoing countdown surfaces on supported iOS/Android versions; kg/lb conversion; configurable rest defaults. Native development builds are required for the full experience.
6. Workout completion/cancellation, history and exercise-specific history.
7. Personal records, with explicit calculation definitions and tests. Implement after the core logger if helpful, but include before MVP completion.
8. Database migration, RLS/ownership, command consistency and domain tests, plus physical-device timer checks.
9. Build/run instructions for both Android and iOS.
10. Email/password signup, verification, login, password reset, persistent sessions and sign-out using GRIND's standalone Supabase Auth; account deletion through a narrowly scoped GRIND server operation.

Model routine templates separately from actual sessions; do not overwrite historical workouts when a routine changes. Keep exercise definitions independent from individual gym machines. Allow future nullable gym/equipment association without making it required now. Preserve room for future spotter-assistance and next-session-intention fields.

Do **not** implement gym directory, equipment registry, leaderboards, owner dashboard, offers, AI, billing, export/backup UI, or full offline database replication in this milestone. Gym/community/commercial features are documented future phases. Authentication and the Supabase backend are required now. Don't claim branding board is production-ready artwork.

First write a short implementation plan, then implement incrementally, keeping the project runnable. Report what works, what is pending, and exact commands to launch on both platforms.

## 29 October 2026 amendment — self-hosted catalog

RepDB Free is the primary MVP exercise catalog and static-image source. Free Exercise DB is supplementary only after source-specific review; its images remain blocked until rights are documented. Follow the [self-hosted catalog implementation plan](EXERCISE_CATALOG_PLAN.md) for immutable snapshots, licenses/credits, additive schema/import, deduplication, private media storage, member-only APIs, caching, workout/custom integration and acceptance. This supersedes MuscleWiki selection, streaming/player/token/cache requirements for MVP; historical MuscleWiki material below is retained as context only. Existing shared-Auth/isolation, canonical migration and M8 cutover rules remain in force. Planning only: no data import, hosted change or code implementation is claimed.

## Exercise/provider and backend amendment — 25 October 2026

Historical provider choice (superseded for MVP above): MuscleWiki was selected; the supplied list/detail/video samples are sufficient for architecture, not proof of live integration. The earlier shared-backend proposal is superseded: GRIND uses only its standalone Supabase project, Auth and migration history. Read docs/EXERCISE_MEDIA_MODULE.md and docs/MVP_PAGES.md before exercise implementation. Local secrets exist in ignored env files; never copy their values into source, documentation or client code.
