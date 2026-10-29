# Bundled exercise catalog and list — implementation plan

Status: **List implemented locally; integration and release incomplete**, 29 October 2026. The user requested local bundled RepDB JSON and images, the exercise engine and the compact exercise list. This changes the previously proposed runtime delivery direction in [the engine proposal](README.md) and [catalog plan](../EXERCISE_CATALOG_PLAN.md): for the initial RepDB release, browse data and approved images are intended to ship with the app. Those documents' database identity, licensing, custom exercise, security and history requirements still apply. Reconcile their runtime-delivery wording once the design below is reviewed; no hosted operation is authorized.

## Existing work

The application bundles the supplied English RepDB JSON and flat images under `assets/exercises/repdb/`. The inspected archive reported 701 records and 1,217 flat images; the generated registry selects one image per list item. The tab uses one catalog view with local catalog, existing server catalog records and personal custom exercises. Existing server records are labeled and may have duplicate names until identities are reviewed. RepDB source slugs cannot yet be used for workouts; the picker remains server-backed until identity integration. These observations do not establish native or production acceptance. See [build status](../BUILD_STATUS.md) and [tasks](../planning/TASKS.md).

## Identity and Supabase

RepDB records have string IDs such as `barbell-curl`. They identify records within that source; they are not GRIND workout UUIDs. The current server contracts and workout/routine references require GRIND UUIDs and look up authoritative exercise rows, including logging mode/convention. Consequently Supabase cannot currently contain only a RepDB slug. Preserve the UUID, source key and source ID mapping, validated logging fields, ownership/visibility and any fields required by existing commands; preserve workout snapshots and user data. Do not change existing IDs or rewrite history.

Create a reviewed, versioned manifest mapping `(repdb, source_id)` to a stable GRIND UUID, shared by bundled JSON and the local server import. Review existing seed matches and ambiguous variants; do not silently merge. Custom exercises remain server-owned UUID records and appear in the combined view after authenticated loading. Catalog browse may work without a server connection, but an exercise is selectable for a server-acknowledged workout only when its corresponding approved server record is available. Define a clear unavailable/retry state for absent mappings or mismatched catalog versions. Do not present a local-only selection as saved.

## Bundle and source release

1. Inspect the actual supplied archive, license and attribution, hash all files, and record its identity, schema, counts and transformation versions. Record an immutable upstream revision where available; archive hash alone identifies the supplied artifact, not its upstream commit. Confirm whether the license permits the intended distributable containing the complete dataset/assets; document a delivery review before release. Do not distribute paid assets. The local application repository now contains the English data and free images; review the license and intended distribution before publishing the repository. Maintain visible clickable RepDB attribution in Settings/About.
2. Generate a minimal validated app JSON with source ID, GRIND UUID mapping, display name, reviewed muscle/equipment labels, source/content version and static asset key. Retain only required fields for this phase; detail content can be versioned separately. Do not invent muscle-head claims or infer load modes from equipment.
3. Generate a static asset registry using explicit React Native `require` calls; dynamic JSON paths alone cannot make Metro include assets. Map reviewed image keys to bundled start or main poses, with a neutral placeholder for missing/invalid images. Use only approved free assets. Measure compressed download size, installed size and build memory before committing to all 1,217 poses; list thumbnails may use one pose while detail needs can be assessed separately. Respect original asset terms and retain provenance for transformations. Rebuild native binaries after asset/config changes and verify on both platforms.
4. Ensure build machines can reproducibly provision the ignored source and verify checksums; absence or mismatch must fail a release build clearly rather than silently ship an empty catalog. Development fallback must be visibly identified. Never expose keys or sign-in credentials in the bundle.

## Exercise engine

Provide a typed, tested local catalog adapter behind the existing exercise service boundary. Validate bundled input, construct a normalized search index once and return bounded result slices; use a virtualized list rather than rendering every row. Search names/approved aliases, filter by reviewed muscle and equipment terms, and distinguish primary and secondary muscles. Proposed behavior is OR within each filter and AND across filters; confirm primary-versus-secondary matching and facet semantics before finalizing. Combine personal server exercises without leaking one account's data to another. Handle duplicate display names with a visible custom label; do not merge identities based on names.

The service returns UUID when approved, source identity, name, primary muscle labels, equipment, origin, local asset reference and availability. Keep provider-specific record structure out of screens. Define version mismatch, unavailable data, malformed manifest, custom-catalog loading and failure states. Keep list browsing independent of image loading and workout writes; preserve session/account scoping and existing custom-exercise mutations.

## List implementation

Replace the separate archive browser and generic button list with one Exercise Library matching [the HTML preview](../../design/exercise-list-proposal.html): search, muscle/equipment selectors, All/My exercises, create action and compact tappable rows with static image, name, primary muscle and equipment. Show an explicit custom badge and image placeholder. Provide empty/clear-filter, loading and retry states, readable large-text reflow, accessible names and at least 48 px touch targets in both themes. Use a virtualized list, preserve detail navigation and avoid inventing data in subtitles. RepDB browsing alone must not imply that workout selection is available.

## Work sequence and verification

- **Inventory and release review:** inspect current archive and existing uncommitted changes, validate counts, file integrity, license and mapping needs; measure asset sizes. Record exact hashes privately where required.
- **Identity and import:** review seed mappings and load semantics; import server-required rows into the guarded disposable local database, with stable UUID mapping and tests. No reset of the BabyBoo stack, hosted writes or historical rewrites.
- **Bundle and engine:** generate validated JSON and static image registry; implement service/search and cache/account isolation. Test malformed data, filters, missing images, version mismatches, mapping and identity behavior.
- **Native list:** implement and test list interactions, empty/error states, custom scope and navigation. Keep picker and workout behavior intact until server integration is verified.
- **Integration:** run typecheck, strict lint, tests and coverage gates, archive/import checks and guarded local SQL/API checks. Build and inspect current Android and iOS native binaries, then verify scrolling, image loading, accessibility, offline browse and account switching on devices. Record failures and limitations in owning status documents. No physical-device or release acceptance is implied by tests or JS export.

## Open decisions

- Confirm muscle filter behavior: primary only or primary and secondary; the architecture proposal suggests both.
- Resolve whether each store build bundles all poses or only assets used by the initial list, after size measurement and rights review.
- Choose version mismatch behavior and migration/update policy before offline browsing is connected to workout selection.

## Local implementation checkpoint

The exercise list uses the local engine and a virtualized list. RepDB records remain read-only and server entries retain existing detail navigation. Search, source-specific muscle/equipment filters, custom scope, image fallback and Settings attribution are implemented. The English data, images and generated registry are in the application tree; follow SETUP.md when updating them. Server seed/catalog duplicates and taxonomy differences remain until reviewed mapping; source slugs are not workout IDs. Native acceptance, release build provisioning checks, license/delivery review and server import are still open.

## List cleanup checkpoint

The separate archive browser was removed. The list and workout/routine picker use compact rows; picker selection remains restricted to existing server UUIDs. Existing server catalog rows remain accessible in the library to preserve detail and history and can overlap bundled names. Unifying identities and filter taxonomy remains necessary before the full RepDB catalog is selectable in workouts. Android debug build was installed on an emulator but the page has not been visually verified there.
