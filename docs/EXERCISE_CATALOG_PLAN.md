# GRIND self-hosted exercise catalog implementation plan

Decision: 29 October 2026. Status update 1 November: the authenticated GRIND app-bound catalog release is published and database counts verified; member-authenticated app/API and native acceptance remain open. This replaces MuscleWiki as the MVP catalog/media strategy. Static images satisfy MVP demonstrations; videos, provider tokens and metered provider calls are deferred.

## 1. Sources and release gates

RepDB Free is primary. Import its licensed JSON and free flat static WebP images into Grind-controlled PostgreSQL and Supabase Storage. No third-party exercise API requests during normal app usage. Free Exercise DB is supplementary only for reviewed gaps/aliases, never an automatic second catalog or media fallback. RepDB-only launch is acceptable.

Primary evidence checked 29 October 2026:
- [RepDB data license](https://github.com/RepDB/exercise-dataset/blob/main/LICENSE-DATA.md): v1.0 explicitly covers JSON and associated WebP assets, permits commercial in-app use with attribution, restricts redistribution as a dataset or API, prohibits generative-AI derivation, and excludes paid preview animations from production use.
- [RepDB attribution](https://github.com/RepDB/exercise-dataset/blob/main/ATTRIBUTION.md) and [repository](https://github.com/RepDB/exercise-dataset).
- [Live JSON](https://raw.githubusercontent.com/RepDB/exercise-dataset/main/exercises.json) reported schema_version 3 and count 701 when checked. README/search counts differ; ingestion must measure the pinned files, never assume 701 or import a moving main branch.
- [Free Exercise DB README](https://github.com/yuhonas/free-exercise-db) identifies an upstream exercises.json source. Its [Unlicense](https://github.com/yuhonas/free-exercise-db/blob/main/LICENSE.md) alone does not establish the complete ownership chain for each photograph. Image rights are NOT verified by this plan.

Display a visible clickable “Exercise data by RepDB (repdb.co)” link to https://repdb.co in Settings → About/Credits and add README credit. Preserve upstream license and attribution text in private source archives. Credits must remain available when catalog requests fail; bundled text can provide offline access. Add supplementary creator, source, license links and modification notices as required by each approved asset's actual terms.

**GRIND delivery decision (1 November 2026):** the user confirms the hosted Supabase catalog is reachable only through authenticated GRIND app functionality and is not a public or reusable catalog API. This app-bound delivery is approved for GRIND under the license's in-app use grant. Keep membership checks, RLS, bounded search/detail contracts, rate/size limits and no bulk-export/public-storage behavior. Do not publish a public API, raw dataset download or source mirror. This decision clears the project’s prior requirement to obtain separate written clarification solely for authenticated GRIND app delivery; it does not change any other license terms. Do not ingest premium-samples, classic/paid assets or animations; do not feed RepDB images to generative models. The source snapshot, attribution, measurement review and secure import/release checks remain required.

For every Free Exercise DB image proposed for use, require an evidence record identifying original creator/source, chain of permission, exact license/version, commercial use and self-hosting permissions, derivative/attribution/share-alike duties, evidence URL or written grant, reviewer and review date. Repository-level assertions or another app's credits are insufficient. Store candidate files only in non-serving quarantine. Default pending/unclear/rejected assets to blocked; use RepDB or a neutral placeholder. Review text provenance separately before supplemental metadata is promoted. Any share-alike obligations belong to that source's reviewed assets/derivatives; do not silently relicense the combined catalog.

## 2. Reproducible acquisition

Before importing, resolve a full upstream commit SHA (or immutable release plus SHA), fetch only that revision, and record manifest fields: source key, repository URL, commit, release if any, schema version, fetched_at UTC, declared/actual record count, all file SHA-256 hashes, byte totals, license filename/hash/text/version, attribution filename/hash/text, importer version and mapping version. Do this separately for both sources. No commit is pinned by this documentation change.

Keep source archives, licenses, raw JSON and rights evidence in access-controlled build storage, outside any public repo/web root. Commit importer code, mappings and checksum manifests; do not commit RepDB dataset/media into a public repository. Track field-level source provenance for imported text and asset-level provenance for images. Review changed licenses, schema, counts, removed IDs and rights evidence on every update; never auto-accept new upstream terms/assets. Approved previous snapshots remain reproducible subject to their terms and retention review.

## 3. Database design and compatibility

Extend the existing grind.exercises table and ExerciseRepository boundary; do not create a competing exercise identity system. Current fields include UUID id, owner_id, origin, name, category, equipment, primary_muscle, load_mode, load_convention and archived_at. Inspect actual canonical migration constraints/RPCs before changing enums or types. Stable internal UUIDs remain the only workout/routine references.

Proposed additive tables (final SQL reviewed against current schema):

| Table | Required fields/invariants |
| --- | --- |
| grind_private.catalog_sources | source key, repository URL, license/attribution identity and approval state |
| grind_private.catalog_releases | UUID, source key, immutable revision, manifest/archive location and hash, schema/importer/mapping versions, staged/approved/active/retired state, counts, approver/timestamps |
| grind_private.exercise_source_records | release_id, source exercise ID, raw record hash/private payload, internal exercise UUID, rights state; unique(release_id, source exercise ID) |
| grind_private.exercise_source_links | unique(source key, source exercise ID) → stable exercise UUID; mapping review state; preserve across releases |
| grind.exercise_content_versions | exercise UUID, version, locale, name, description, ordered instructions/tips, category/force/mechanic/difficulty, source/release references; immutable published versions |
| grind.exercise_terms | exercise UUID, term kind (alias/muscle/equipment/tag), normalized key, muscle role if applicable, source provenance; indexes on kind/key/exercise |
| grind.exercise_assets | exercise UUID, content version, source/release/asset ID, pose/order, private object key, MIME/dimensions/bytes/hash, rights evidence reference, approved/blocked/withdrawn state, transformation version, credit reference |
| grind_private.catalog_import_runs | release, idempotency key, validation/report hashes, staged/uploaded/published/failed state, counts/errors, actor/timestamps |

Only safe approved content/asset projections are exposed to members; raw payloads/manifests/rights evidence/import controls are service-only. Enforce RLS/grants and membership on all app-facing reads. Only privileged importer can alter global catalog data. Custom exercises retain owner-scoped command writes. Privileged credentials never enter the app.

Map RepDB name_en, instructions_en, description_en/tips_en, primary_muscles/secondary_muscles, equipment, category, difficulty, force_type and mechanic through validated adapters; confirm actual image/locale fields from the pinned schema, not assumed filenames. English is MVP; retain other approved locales without requiring translated UI. Map supplemental primaryMuscles/secondaryMuscles/instructions through a separate adapter. Explicit taxonomy dictionaries normalize equipment/muscles/categories; unknown values are reported for review, not silently dropped. Preserve multiple muscles/equipment in normalized terms while maintaining compatible summary fields.

Load modes/conventions are Grind domain decisions, not inferred from image/equipment alone. Require reviewed mapping to external, bodyweight, assisted or weighted-bodyweight and existing conventions before publish. Preserve total-barbell versus per-dumbbell and assistance semantics. MET data may be retained with provenance but does not add calorie estimates to MVP.

## 4. Ingestion, deduplication and publication

Implement scripts/catalog/ with acquire, validate, stage, report, publish, rollback commands (new commands to be documented in SETUP.md when implemented). Require explicit local/staging target allowlists and dry-run default. The authenticated GRIND catalog release was authorized and published on 1 November via `scripts/catalog/publish_hosted.py`; this GRIND-only tool verifies project ref, migration parity and a narrow target-state allowlist before writing. Future hosted releases still require explicit authorization. Use the existing canonical GRIND forward-migration stream and guarded disposable backend; do not create competing hosted migration history or reset existing stacks.

Pipeline: verify immutable source/checksums/license → validate JSON/schema/counts/IDs/paths → map taxonomy and logging modes → deduplicate → stage rows → validate/decode approved static media → upload immutable objects → verify checksums/readability → transactionally activate release/content references → emit reconciliation report. Publication is atomic at DB visibility, not a cross-system transaction: uploaded but unpublished objects are harmless and collected later. Any error preserves the active catalog; retry resumes safely without duplicate rows/assets.

Dedup rules: exact approved source link first; otherwise generate candidates using normalized name/aliases, equipment, muscles, movement and load convention. Case/punctuation normalization generates candidates only. Require review for fuzzy/cross-source matches; never merge solely on name. Keep incline/flat, unilateral/bilateral, barbell/dumbbell, assisted/bodyweight and different machine/load conventions distinct. RepDB content wins by default; supplemental fields/assets do not overwrite it automatically. Record reviewed mapping decisions, rationale and provenance. A supplemental alias may map to an existing UUID without creating another picker entry.

Never auto-merge or renumber existing seeds, custom exercises or historical references. Prepare reviewed seed→catalog mappings; attach source identity to an existing UUID only when semantics match. If identities must consolidate later, use an explicit migration with redirects for future selection and preserved historical identity/Previous/PR behavior; do not rewrite completed workouts. Missing upstream IDs retire from new selection after review, with UUIDs/tombstones retained. Rollback changes the active release pointer, not workout data. Serialize publication and reject stale competing activations.

## 5. Media storage and cost controls

Use a private Supabase Storage bucket (e.g. grind-exercise-media). Keys: repdb/<revision>/<source-id>/<content-hash>-<pose>.webp; use separate source prefixes for approved supplementary assets. No GitHub hotlinks or upstream runtime fallback. Import only allowlisted local paths within the snapshot; reject traversal, symlinks escaping root, remote URLs and unexpected file types. Decode/re-encode with resource bounds, strip metadata, confirm MIME/dimensions, and record transformations/hashes. Start/peak pairs or a single static pose are supported. Keep originals privately only where rights permit.

Issue bounded, short-lived signed read URLs after membership/asset approval checks; never expose storage service keys or list access. Keep URL lifetimes configurable, refresh once on expiry, redact query tokens from logs and avoid persisting signed URLs in workouts. This is an app delivery control, not a guarantee against extraction or license clearance. Rights withdrawals block new URLs and purge controlled caches/objects; existing signed URLs last at most their configured TTL. Do not promise immediate revocation of already downloaded files.

Cache immutable image bytes with bounded device LRU (initial budget 50 MB) keyed by asset hash, not signed URL. Use an expiry/revalidation policy so withdrawals can evict cached assets; purge on sign-out/account switch. Serve placeholders on failure, retry explicitly, use accessible pose labels, and never block logging on image availability. No videos or list autoplay. Set response caching appropriate to authenticated delivery; no public cache of personalized detail responses or signed URL payloads.

Acquisition budget: RepDB Free $0, supplementary repository $0 subject to rights review; storage, requests, database and egress still cost money. Record actual source/stored/thumbnail bytes and estimate monthly media egress = active users × detail views/user × cache-miss ratio × bytes/view, including two-pose views, then apply current approved hosting rates. Benchmark/cache before adding infrastructure. Monitor DB p95 latency, storage/egress, cache hit rate and errors; choose alert budgets before staging. No paid API quota or provider subscription is required for the planned MVP.

## 6. App-only search/detail contracts and caching

Use existing typed Supabase service/RPC patterns; a separate backend is not required. Proposed RPC contracts:
- search_exercises({query:'', muscles:[], equipment:[], category?, difficulty?, scope:'all'|'catalog'|'mine', cursor?, limit:30}) returns approved active summaries, stable UUIDs, asset availability and next cursor/catalog version. Cap limit at 50 and query at 100 characters. Empty query browses; debounce text 250 ms, cancel stale requests. Match aliases and normalize accents/case. Filters use OR within a dimension and AND across dimensions; equipment filter matches any selected equipment, with bodyweight mapped explicitly. Return deterministic relevance, normalized name, UUID ordering and an opaque cursor bound to filters/version. On catalog-version change return a restart signal; no mixed-version pages.
- get_exercise({exerciseId, locale:'en'}) returns visible approved definition/content version, muscles/equipment, ordered instructions/poses, credit metadata and separately resolved signed image URLs. Locale fallback is English. Missing/archived/withdrawn states are explicit; historical detail uses saved snapshots and graceful media fallback.
- get_exercise_facets returns counts/terms from the caller's visible catalog plus own custom exercises only.

Use indexed normalized search (PostgreSQL full text and/or trigram after measuring), term indexes, visibility predicates and bounded pagination; never fetch every record on mobile. Escape user input/parameterize queries. Public/anonymous users and nonmembers receive no catalog access; cross-owner custom IDs must not leak through details, facets, search or URL signing. Apply rate/size limits to discourage bulk extraction; do not provide full-library export endpoints.

TanStack Query keys include account, membership, catalog version, locale, normalized query/filter/cursor. Initial metadata stale time 24 hours; revalidate version on foreground with bounded frequency. Signed URL response freshness is shorter than URL TTL. Cache only viewed/bounded pages and recent exercise metadata, not a complete replicated catalog. Clear private state on identity changes. Existing durable workout drafts/operation receipts remain independent. Cached content may help an interrupted workout; it does not authorize new offline start/finish acknowledgements. No upstream request may be triggered by a cache miss.

## 7. Workout/routine and custom-exercise integration

Picker and detail use existing ExerciseRepository; add version/provenance/media through service adapters, not provider-specific UI. Routines and sessions continue using internal UUIDs. Workout creation snapshots name, category, load convention/mode and any required content revision at the existing server-authoritative boundary; never store signed URLs. Catalog refresh, rename, archive or rights removal must not alter saved history, set values, unit conversion, Previous or PR grouping. Do not copy full source instructional datasets into workout logs.

Do not auto-replace exercise IDs inside active workouts/routines. Retired exercises remain readable by authorized owners where referenced; hide them from new catalog choices and offer explicit replacement when appropriate. Broken media/search must not block editing, saving or finishing already selected exercises.

User-created exercises remain owner_id scoped in the same table, with stable UUID, required name, reviewed valid load mode/convention and optional classification. No source ID or image required. Create/edit/archive through existing validated idempotent commands and revision handling. No global publishing, automatic fuzzy merging or image upload feature in this scope. Name collisions are allowed with a visible “My exercise” indicator. Rename/archive preserves history; references by another user are denied. Grind-only deletion removes personal custom data according to current lifecycle while preserving global catalog and shared Auth/BabyBoo data.

## 8. Sequenced implementation handoff

This is the original sequenced plan, not a current status table. The 1 November hosted metadata release is implemented and verified; task states and remaining acceptance gates are tracked in `docs/planning/TASKS.md` and `docs/BUILD_STATUS.md`. It does not declare all of M6 complete. Assign canonical migration filenames through the GRIND-owned `supabase/migrations` stream.

| Task | Owner / allowed paths | Dependencies and acceptance |
| --- | --- | --- |
| C1 source/release lock | Catalog maintainer; private source evidence, scripts/catalog manifests, credits spec | Hosted archive pinned by SHA-256 and validated at 701 records/1,217 images; preserve required attribution/license evidence; authenticated GRIND app-bound delivery approved by user's 1 Nov decision; supplementary media remains blocked without evidence |
| C2 schema/adapters | Backend developer; assigned new canonical migration/tests, src/types/database.ts, src/domain/exercises/** | C1; additive migration/replay, stable identities, grants/RLS, taxonomy/load mapping; no historical rewrite |
| C3 importer/storage | Catalog developer; scripts/catalog/** and tests, assigned storage policy migration | C2; deterministic dry run, idempotency/resume, rights gate, staging/report, atomic activation/rollback |
| C4 search/services/cache | Service developer; src/services/exercises/**, assigned RPC migration/tests, query keys | C2/C3; bounded app-only contracts, stable pagination/indexes, tenant isolation, no upstream runtime traffic |
| C5 UI/logging/credits | App developer; src/features/exercises/**, assigned Settings/README changes and tests | C4; static poses, fallback/credits, picker return context and unchanged workout/custom semantics |
| C6 verification | Reviewer; read-only diff/checks, assigned integration tests and evidence | C1–C5; complete acceptance below and native review; hosting only with existing authorization gates |

One owner per file. Record live assignments/status in planning/TASKS.md, evidence in AGENT_STATUS.md/BUILD_STATUS.md, and executable new commands in SETUP.md. M6 becomes self-hosted catalog/static demonstrations. Preserve M0–M3 behavior, M4/M5 timing/data controls, M7 hosted approval and M8 standalone cutover; include catalog source mappings, versioned objects/rights and stable IDs in M8 migration rehearsal.

## 9. Tests and release acceptance

Automated tests required when code is implemented:
- Snapshot validation: corrupt/missing checksums, duplicate/missing IDs, count drift, unknown schema/taxonomy, invalid load mappings, malformed instructions, unsupported locales, traversal/remote paths, oversized/invalid images and premium sample rejection.
- Rights: pending/rejected/withdrawn supplementary images never upload to serving storage or appear in responses; approved evidence and required credits are enforced; license changes stop publication.
- Import: repeated/resumed runs produce identical logical rows/checksums, unchanged sources retain UUIDs, concurrent publishes are fenced, failed uploads leave active release intact, rollback works, removals preserve history, orphan cleanup protects referenced assets.
- Dedup: exact links reuse identity; aliases resolve; ambiguous and equipment/angle/mode variants stay separate; existing seed/custom collisions cannot silently merge; provenance survives reviewed supplement mapping.
- Database/API: migrations replay on guarded disposable stack; anonymous/nonmember/cross-owner reads/writes/facets/signing denied; malicious routine/workout exercise references denied; global catalog writes denied; query limits, filter semantics, empty browse, typo/alias search, stable cursor/restart and locale fallback tested.
- Mobile/cache/logging: stale responses cancelled, bounded pages/bytes, account switch/logout purge, expired URLs refresh once, missing images use placeholder, withdrawal invalidates controlled cache, offline failure preserves drafts; create/edit/archive custom exercise and start→pick→sets→finish→History regression, exact units/four modes/Previous/snapshots preserved after catalog update/rollback.
- Network assertion: search, detail, image view, routine selection and workout logging make zero requests to RepDB, GitHub, Free Exercise DB or MuscleWiki hosts; only approved Grind/Supabase endpoints serve catalog/media.

Run existing typecheck, strict lint, tests and coverage scripts; retain repository gates (90% statements/lines/functions, 85% branches, 100% critical security/validation/idempotency branches). Document actual results; no lowered thresholds. Include local SQL/Auth/API isolation/replay checks and BabyBoo regression where shared backend changes apply. New importer commands require meaningful direct tests. This documentation-only update requires document/link/diff review, not a claim that implementation tests ran.

Release checklist:
1. Approved manifest records immutable revisions, complete license snapshots/hashes, attribution, importer/mapping versions and measured counts; source-to-normalized reconciliation explains all excluded records.
2. Every published global record has stable UUID/provenance, validated logging semantics and approved text; every served image has approved rights and checksum. RepDB-only launch needs no supplementary image approval.
3. Credits are visible/clickable on iOS and Android; static single/two-pose detail renders accessibly, with loading/error/placeholder states. No premium media, public raw dataset/download/API or provider secrets shipped.
4. No upstream runtime calls; bounded cache and app-only member delivery verified. Seed identity/history and custom-owner isolation regressions pass.
5. As an initial staging target, search p95 <300 ms server-side over 100 representative warm queries at 20 concurrent sessions; record region, dataset size and measurement method. A miss triggers query/index review, not invented pass evidence. Measure first-image latency on representative mobile networks and record actual storage/egress forecast before beta.
6. Failure/retry/rollback, rights withdrawal, cross-account access and existing workout persistence pass automated tests plus physical iOS/Android journeys. Open native/hosted gates remain explicit; no implementation/deployment acceptance is claimed by this plan.
