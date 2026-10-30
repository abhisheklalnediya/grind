# Exercise catalog and media module

## 30 October 2026 amendment — GRIND-only backend

GRIND uses only project `mgyzzipsqmsabptrfchw`, root `supabase/migrations` and GRIND-owned local stacks. Do not use another app's Auth, source, credentials, data or Supabase project. The RepDB license/release gate still applies to the 701-record catalog; those records were not uploaded and remain out of the hosted API until permitted in-app delivery is resolved.

## 29 October 2026 amendment — self-hosted catalog

RepDB Free is the primary MVP exercise catalog and static-image source. Free Exercise DB is supplementary only after source-specific review; its images remain blocked until rights are documented. Follow the [self-hosted catalog implementation plan](EXERCISE_CATALOG_PLAN.md) for immutable snapshots, licenses/credits, additive schema/import, deduplication, private media storage, member-only APIs, caching, workout/custom integration and acceptance. This supersedes MuscleWiki selection, streaming/player/token/cache requirements for MVP; historical MuscleWiki material below is retained as context only. GRIND's hosted migration is complete; catalog release and native verification remain open.

Decision date: 25 October 2026. Status: architecture proposal; secret/configuration files prepared locally. No backend, migration, provider request, hosted secret or native player has been deployed or verified by this work.

## Decisions

Historical proposal: use MuscleWiki as the demonstration provider. GRIND now uses its own standalone Supabase project and Auth. Live MuscleWiki calls remain disabled; catalog decisions in the current amendment above take precedence.

The current public offering says BASIC's 500 monthly requests are Playground-only; direct integration requires TESTING or above. Account-specific entitlement has not been tested. Do not assume the supplied key works outside the Playground or buy/upgrade automatically.

## Contract readiness from supplied samples

The user-provided list, detail and video responses are sufficient to define the module and app architecture. They are design fixtures, not evidence that the supplied key has direct API entitlement or that playback has been tested.

- `GET /exercises?limit=10&offset=0&lang=en-us` returns `total`, `limit`, `offset`, `count` and `results` containing provider integer `id` and `name`. The minimal list has no muscles/equipment/media: do not assume those fields exist or fetch every detail to render a page. Apply provider-side filters when browsing provider results; independently authored Grind records can be filtered locally/server-side in our own catalog.
- `GET /exercises/3?lang=en-us` returns Dumbbell Hammer Curl identity, muscle arrays, category, force, grips, mechanic, difficulty, steps, videos and bodymap references. Optional or tier-restricted fields must tolerate absence/null. Map provider category `Dumbbells` explicitly to Grind equipment taxonomy; do not depend on matching display labels.
- Video variants contain `url`, `angle`, `gender` and `og_image`. The supplied fixture has male/female and front/side variants; do not require every exercise to have all four. Provider URLs are protected resource locations, not proof of public or permanent playback access.
- `GET /exercises/3/videos?lang=en-us` returns just the variant array. Use it only for a media-only lookup when appropriate; a detail response already contains variants, so never call both redundantly.
- Store internal UUID plus MuscleWiki integer ID. Hammer Curl ID 3 is the supplied example, not a universal cross-provider identifier. Request contracts and response validation belong in the server adapter; UI consumes normalized Grind contracts.

No additional samples are required to finish architecture. During implementation verify token minting/expiry, direct-call entitlement, errors/rate-limit headers, pagination edge cases, current schema and Auth/RLS settings. Use the supplied shapes as synthetic test fixtures without copying credentials or tokenized URLs into tests.

## Exercises implementation checklist

- [x] Define library, detail, custom exercise and workout-picker flows.
- [x] Create interactive library design in `design/exercises.html` (illustrative data only).
- [x] Select MuscleWiki and document sample response contracts.
- [x] Prepare ignored local server secret and standalone GRIND public configuration.
- [x] Define shared metadata cache, backend interfaces, streaming boundary and independent Grind data/session lifecycle.
- [ ] Verify paid direct API entitlement and measured playback cost; no automatic upgrade.
- [ ] Resolve persisted media-reference caching permission and cache-backup retention.
- [ ] Audit live shared backend and coordinate one migration history.
- [ ] Implement migrations/RLS, provider adapter, cache, authenticated endpoints and native demo player.
- [ ] Verify concurrency, expiry, failures, credential redaction and native playback if a provider is approved.

## Cache boundary and costs

MuscleWiki permits exercise text/metadata caching for at most 30 days. Use a configurable 29-day fresh lifetime with an absolute 30-day retention deadline from provider retrieval. An app read does not extend either timestamp. Expired provider content must be removed from cache and not returned as stale fallback. Do not duplicate provider responses into long-lived logs, analytics, exports or backups with retention beyond the allowed window. Deployment needs a GRIND-specific backup/retention review.

Cache metadata globally by `(provider, provider_exercise_id, language, representation_version)`, never by user. The app sees only fields entitled under the configured plan. Missing tier-restricted fields remain unavailable, rather than triggering another request. This is a transient feature cache, not a bulk export or permanent copy of the provider dataset.

Media bytes: no storage in Supabase Storage, CDN, service-worker cache, device downloads or persistent video-player cache. Use transient playback buffers only and respect no-store. Thumbnails follow the stricter documented policy: private end-user cache up to 24h, no shared cache; bodymaps are unnecessary for MVP and are not fetched. Preserve video branding and include the required legal disclosure: "Exercise data and videos provided by MuscleWiki.com".

Video URL descriptors: storing a normal on-demand response's URLs is technically distinct from storing media bytes, but the public terms specify text-only caching and prohibit mass collection of video URLs. Do not assume permanent URL storage is authorized. Default implementation persists text fields only and resolves media on demand. Before enabling shared persisted media descriptors, obtain provider confirmation that on-demand exercise-associated URL caching is allowed and agree its TTL (never beyond the metadata deadline). That optional mode stores only token-free validated paths and variant labels, never signed URLs/tokens. This is a narrow licensing question, not a technical obstacle to caching text.

Provider billing includes stream requests and each HTTP Range request. A database cache hit avoids an exercise-details request only; playback is still billed. Illustration: 100 visits to Hammer Curl inside the cache lifetime need one details fetch for text, but 100 plays still need their stream requests, potentially multiple per play. In default text-only cache mode, playback also resolves the exercise media descriptors once per play session. Optional approved descriptor caching removes that extra lookup, not the streaming cost. Token mint requests should be budgeted conservatively until actual metering is measured. Do not promise one API call per video.

## Data contracts

| Object | Fields / invariant |
| --- | --- |
| `grind.app_accounts` | user_id referencing auth.users, setup state; authenticated user owns their row |
| `grind.exercises` | Stable internal UUID, origin (`grind`, `custom`, `provider`), owner for custom definitions, independently authored name/load convention, archived_at; never use provider ID as primary key |
| `grind.exercise_provider_refs` | Internal exercise UUID, provider, provider exercise ID, mapping review state; unique reviewed mapping per exercise/provider. No raw media or long-lived provider descriptions |
| `grind_private.provider_text_cache` | Provider ID/language/version key, allowlisted text payload, fetched_at, fresh_until, purge_at, status; no media fields or credentials |
| `grind_private.provider_fetch_leases` | Cache key, lease UUID, expires_at; atomic acquisition and fenced updates prevent concurrent misses overwriting newer results |
| `grind_private.provider_usage` | Provider/billing window, reservations, observed cost, remaining if available, cooldown/reset; no token or full upstream URL |

Provider-derived names/search result pages are cached under the same retention rules, not promoted into permanent catalog fields. Durable Grind definitions must be independently authored or licensed for permanent storage. Keep user-authored definitions, provider identity mappings and factual workout logs independent of the transient content cache. Historical labels come from Grind/user-authored definitions, not copied provider instructional text.

## Modules and interfaces

- `MuscleWikiClient` (server only): fixed HTTPS origin, secret header, allowlisted endpoints, bounded timeouts, response validation, entitlement/errors and sanitized provider metrics. Follow no arbitrary redirects; never accept a user-supplied upstream URL.
- `ExerciseCatalogService`: internal UUID/provider mapping; text cache read/refresh; safe app response projection and search/filter coordination. Custom exercises work without any provider mapping or media.
- `ProviderCacheRepository`: database-time TTL checks, atomic short leases, conditional/fenced commit, expiry purge. Never hold a DB transaction open across an HTTP fetch. Lease expires after timeout+margin; waiters poll briefly then receive a retriable response. 404 negative cache at most 5 minutes; 401/403 are provider-wide circuit events, not cached missing exercises.
- `ExerciseMediaService`: resolve valid variant descriptors for one exercise, validate origin/path, choose default male/front only when present (otherwise first available), mint a short-lived media token. Selection UI may change angle/demonstrator without refetching descriptors during that viewing session.
- `ProviderBudgetGuard`: user/session rate limits, global concurrency limits, circuit breaker on entitlement/quota errors, configurable safety margin and kill switch. It estimates spend; direct provider range traffic is only accurately known from provider counters and measured playback. Tokens are not file-scoped, so issuance limits alone cannot enforce per-file usage.
- Mobile `ExerciseRepository`, `ExerciseMediaGateway`, `ExerciseDemo`: search/details/query lifecycle, explicit Play, token renewal, player cleanup. UI has no provider key and imports no privileged repository.

Proposed authenticated Edge Function contracts, all names prefixed `grind-` within the GRIND project:

1. `grind-exercise-search`: `{query, muscle?, equipment?, cursor?}` → bounded exercise summaries. Debounce search, require at least two characters, cache normalized provider query/page results across users; no per-keystroke request. Prefer independently authored Grind catalog where possible. No full-library prefetch.
2. `grind-exercise-detail`: `{exerciseId, language:'en-us'}` → Grind identity + allowed instructions/muscles/equipment + cache/save provenance + `demoAvailable` when known. Returning `unknown` availability is preferable to fetching media solely to decorate a list.
3. `grind-exercise-playback`: `{exerciseId, angle?, gender?}` → selected ephemeral `playbackUrl`, `expiresAt`, safe variant labels. Resolve descriptors with `/exercises/{id}` (includes videos); do not also call `/videos` for the same response. Keep transient descriptors only for the active view by default. Send no-store and strip tokens from logs, analytics, crash reports and referrers. Require server-validated identity and Grind membership before any paid operation.

Permanent API key stays in Edge secrets. The backend calls `POST /media/token`; the app receives a short-lived token-bearing provider stream URL, not the permanent key. Use no shared/CDN token cache. Keep tokens in an authenticated viewing session's memory only, reuse within expiry, and return response Cache-Control: private, no-store. Do not save tokens to Postgres/AsyncStorage. The 15-minute default is a provider default, not our hardcoded guarantee; respect expires_in and refresh with margin.

## Hammer Curl journey

1. Exercises opens → browse available Grind catalog; no autoplay or video requests. Search calls our endpoint only after debounce.
2. User opens the internally mapped Hammer Curl → server validates Auth/membership → cache hit returns text, miss acquires shared lease and calls `/exercises/3?lang=en-us` once. Persist only allowed text, record retrieval/deadline and release lease. Concurrent users reuse that result.
3. Exercise detail renders instructions immediately and a Play demonstration control. A still poster is optional; fetching one is metered and must use private caching rules. No hidden preload of four variants.
4. Tap Play → resolve the default variant (or reuse current request's transient descriptors), mint/reuse this session's media token, stream directly from MuscleWiki with native player. No rehosting.
5. Another user gets the shared text cache. They still need authorized playback and incur stream calls. Approved descriptor-cache mode would also share token-free variant references while fresh.
6. On expiry/error, show the independent Grind exercise information and a retryable unavailable message. Never block logging a set because instructions/video is unavailable.

## Failure behavior and UX

- 401/403: disable provider fetch/play until configuration or entitlement changes; no automatic retry loop. Preserve workout logging.
- 429: respect Retry-After/reset when available, expose unavailable state, no blind background retries.
- Timeout/5xx: bounded backoff with jitter only while under budget. Return valid unexpired cached text if present. Never extend expiry because refresh failed.
- Missing media/exercise: no demo for that exercise; retain internal mapping/log history and offer custom exercise use.
- Expired media token: one controlled refresh/retry if authenticated and quota available; prevent looping refresh on 403/429.
- Leaving detail/backgrounding: stop player and release resources. No list autoplay, preloading all angles or persistent offline download. Respect reduced motion; explicit play/pause and captions for instructional text.
- Price/plan limits remain backend configuration and measured provider state, not a hardcoded assumption of 500 usable app calls.

## Local configuration prepared

- `supabase/functions/.env`: `MUSCLEWIKI_API_KEY`, owner-read/write only, ignored. No EXPO_PUBLIC prefix.
- `.env.local`: GRIND's standalone public Supabase URL/publishable key; owner-read/write only, ignored. No administrative credentials copied.
- `.env.example` and `supabase/functions/.env.example`: placeholders only.

For deployment, an authorized backend owner can upload only the provider secret file using `supabase secrets set --env-file <absolute-path-to-Grind>/supabase/functions/.env --project-ref mgyzzipsqmsabptrfchw`. This has not been run. Supabase secrets are project-wide and available to Edge Functions; the service module never exposes them to a client.

## Implementation and verification gates

1. Confirm direct API entitlement in the dashboard; optionally one explicit smoke request. Confirm descriptor-cache permission and cache retention versus shared backup policy. No purchase or mass import.
2. If this provider work is approved, review GRIND's hosted migration history, grants, RLS, Auth redirect/email settings and account deletion only. Keep its independent migration history in root `supabase/migrations`.
3. Implement and test client validation, RLS/cross-user isolation, single-flight concurrent misses, lease expiry/fencing, TTL purge, auth failures, provider 403/429, token redaction, URL allowlist and custom-exercise fallback.
4. Measure actual video request counts on physical iOS/Android, including range seeks, replay, token expiry and denial. Ensure no file/CDN persistence and that player controls preserve branding.
5. Verify GRIND sign-in/onboarding/persistence against the standalone GRIND project. Test GRIND logout and account deletion using GRIND-only test users and data.

## Sources checked

- https://api.musclewiki.com/api-terms — caching/media restrictions and attribution; terms control conflicting descriptions.
- https://api.musclewiki.com/faq — free-tier entitlement, metadata TTL, streaming request metering.
- https://api.musclewiki.com/documentation — details payload, native media-token flow, endpoint contracts.
- https://supabase.com/docs/guides/api/using-custom-schemas — custom-schema API configuration.
- https://supabase.com/docs/guides/api/securing-your-api — grants/RLS and dedicated API schemas.
- https://supabase.com/docs/guides/functions/secrets — local and hosted server-secret handling.
