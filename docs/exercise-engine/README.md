# Exercise engine — architecture proposal

Status: **Proposed for user review**, 29 October 2026. This document defines the application-facing service and its boundaries; it does not authorize implementation, import, deployment or a change to existing workout behavior. The [catalog implementation plan](../EXERCISE_CATALOG_PLAN.md) owns source licensing, ingestion, storage and the C1–C6 delivery sequence. Existing architecture and product decisions remain authoritative.

## Purpose

Give GRIND screens one consistent way to find and read exercises. A screen asks for exercise summaries, optionally filtered by muscle and equipment, and receives validated GRIND data without knowing which source supplied it. The exercise library, workout/routine picker and exercise detail are consumers. The first catalog source is RepDB Free; personal custom exercises remain part of the same user-visible catalog.

The engine is an application service and associated server-side catalog operations, not a separate deployed service or an on-device copy of the entire catalog. It extends the existing catalog access boundary. RepDB is an ingestion source, not a runtime API dependency.

```text
Library / picker / detail
        ↓
Exercise engine: typed queries, validation and cache integration
        ↓
GRIND authenticated catalog API and database
        ↑
Reviewed import and source adapters → RepDB snapshot (later: other approved sources)
```

## Current state and intended change

Today `TrainingTransport.catalog()` reads active `grind.exercises`, `TrainingApi.catalog()` validates an array, and `useCatalog` filters that array locally. This supports the existing small catalog and custom exercises; it does not provide bounded server search, multiple muscle terms, catalog versions or media. The proposed service replaces that read path incrementally, reusing existing Supabase authentication and stable exercise identities. It must not create a parallel catalog or change custom-exercise commands without an explicit migration plan. Picker and detail currently depend on the old path, so retain compatibility until each consumer is migrated and tested.

## Responsibilities

- Accept validated browse/search requests and return normalized, paginated summaries and filter facets.
- Fetch an authorized exercise detail and resolve approved media through the catalog API; expose unavailable states rather than provider-specific responses.
- Provide a testable adapter boundary for GRIND's catalog transport and use TanStack Query for scoped caching. Validate external responses with Zod; translate transport failures into actionable, typed errors.
- Normalize imported source fields through source-specific ingestion adapters, with provenance and reviewed taxonomy and load-mode mappings. Never infer logging semantics from a picture or equipment alone.
- Preserve stable internal UUIDs and existing ownership, custom exercise and historical snapshot behavior. Source IDs are provenance, not workout identifiers.

The engine does **not** call multiple providers during a search, merge unreviewed source records, export the dataset, calculate calories, generate muscle claims, or own workout logging. Source acquisition and publication belong to the catalog pipeline, not the screen-facing service.

## Proposed service contract

These are logical contracts, not final TypeScript or RPC signatures. The database and implementation must be reviewed against the canonical schema.

### Search and browse

`searchExercises({ query, muscles, equipment, category, difficulty, scope, cursor, limit, locale })` returns `{ items, nextCursor, catalogVersion }`.

- Empty query browses; default page size 30, maximum 50, query maximum 100 characters. Search names and approved aliases with accent/case normalization; debounce screen input by 250 ms and cancel or ignore stale responses.
- Scope is `all`, `catalog` or `mine`; `all` includes approved active catalog entries and the caller's active custom entries. Other users' custom entries are never visible.
- Multiple selected values are OR within a filter dimension and AND between dimensions. Equipment matches any selected equipment; bodyweight is mapped explicitly. **Proposed for review:** muscle filters match both primary and secondary muscles; results retain their roles so the UI can distinguish them. Confirm this choice before implementation.
- Search relevance, normalized name and UUID give deterministic ordering. Cursors are opaque and bound to filters and catalog version; a version mismatch signals the client to restart rather than mixing releases.
- Results are bounded pages, not a full-library export. The server applies membership, ownership and visibility rules before pagination and facet counts.

Example: `{ muscles: ["biceps"], equipment: ["barbell"], scope: "all" }` returns visible movements matching both dimensions, including an eligible personal custom movement. Normalized keys and accepted taxonomy are determined from the pinned dataset and reviewed mapping, not this illustrative spelling.

### Summary returned to a list

Each summary has a stable GRIND exercise UUID, display name, ordered primary and secondary muscle labels, equipment labels, origin (`catalog` or `custom`), and an approved thumbnail reference or an explicit no-image state. Include existing load mode and convention where needed by picker/logging consumers. Source and content version are retained for provenance; screens must not use external IDs as keys. Labels are localized with English as MVP fallback. Avoid presenting an anatomical head or training effect unless supported by approved source content.

Image references are resolved through authorized delivery, never persisted as signed URLs in workout data. A missing, blocked, withdrawn, expired or failed image produces a neutral placeholder and does not block selection or logging.

### Detail and facets

`getExercise({ exerciseId, locale })` returns authorized approved content, ordered instructions and poses, muscles/equipment, content version and credits; it distinguishes unavailable or retired content. Historical views use saved snapshots and graceful media fallback. `getExerciseFacets(...)` returns filter options/counts only for the caller's visible catalog; exact facet-count behavior under active filters must be specified with the API before implementation. Personal mutations continue through existing validated, idempotent custom-exercise commands.

## Data, source and media boundaries

RepDB Free JSON and permitted static WebP assets are imported from an immutable, verified snapshot into GRIND-controlled Postgres and private storage. Record source/release provenance, license and attribution evidence. The current upstream count is not a fixed product requirement. Validate actual fields and image mappings against the pinned revision. Supplementary sources require their own reviewed adapter, rights and deduplication; no unreviewed automatic merging. Stable GRIND UUIDs link catalog entries to routines and workouts; preserve historical snapshots and never silently rewrite or merge existing references.

Only approved assets are delivered to authenticated members using bounded short-lived URLs; no upstream hotlinks, public listing or embedded service credentials. Cache image bytes by immutable hash within the catalog plan's budget and withdrawal policy, and clear private state on sign-out/account switch. License review of app delivery and required visible attribution remain release gates; follow the catalog plan for details.

## State, failures and performance

TanStack Query keys include account, membership, catalog version, locale and normalized query/filter/cursor. Cache bounded viewed pages and recent details; metadata starts with a 24-hour stale time and foreground version revalidation is bounded. Signed URL freshness must be shorter than its TTL. Do not persist signed URLs as catalog identity. Clear private cached data when identity changes; do not show stale results from a previous request or account.

Consumers can distinguish initial loading, empty results, network failure/retry, authentication or membership failure, malformed response, unavailable detail, media failure and catalog-version restart. A failed next page keeps already loaded results visible with retry. Cache availability does not imply server acknowledgement of workout writes. A search or image failure must not prevent editing or finishing an already selected exercise.

## List redesign handoff

The list should use compact accessible rows: exercise image or neutral placeholder on the left; name and primary muscle(s) plus equipment on the right. Mark custom entries clearly. Search, active filters, All/My exercises scope, pagination and empty/error/retry states are required. Secondary muscles support the proposed filter semantics but need not fit into the row subtitle. This is a design direction, not native visual acceptance; light/dark themes, large text, screen readers and 48 px targets require verification. The library opens detail; workout/routine selection remains a separate picker interaction.

## Delivery and acceptance

1. **Review this contract** and settle the muscle-filter and facet-count questions. Review source/delivery rights and pin the RepDB snapshot under C1.
2. **Catalog foundation (C2–C3):** inspect canonical migrations; add reviewed schema, mappings, import, private storage and local verification. Preserve IDs and existing data. Hosted operations remain separately authorized.
3. **Engine (C4):** implement bounded search/detail/facets, validated service and scoped cache; migrate consumers with a compatibility path. Verify tenant isolation, aliases, filters, pagination/version restart, failure handling and stable identities.
4. **List design and integration (C5):** prototype and review the compact list, then implement against the engine with image fallback, credits and accessible states. Preserve picker and custom workflows.
5. **Independent verification (C6):** run project typecheck, strict lint, tests and coverage gates; verify local database/API behavior, then record native/device evidence separately. Import and implementation do not by themselves establish production or device acceptance.

Tasks, exact file ownership and commands belong in [TASKS.md](../planning/TASKS.md) and [SETUP.md](../SETUP.md) when implementation is authorized. Existing C1–C6 remain Todo. No new source, provider or hosted operation is authorized by this proposal.

## Review decisions

- Should a muscle filter include secondary muscles as proposed, or only primary muscles? If both, should users be able to choose the role?
- For multi-select facets, should counts reflect all other active filters while excluding the facet's own selections? Confirm after checking feasibility and user expectations.
- Approve the list subtitle priority: primary muscle(s), then equipment; use only supported labels and truncate gracefully.
