# GRIND local foundation setup

## Set-type migration verification — 3 November 2026

The local GRIND stack has `20261103120000_grind_set_types.sql` and `20261103130000_grind_set_type_choices.sql` applied; the hosted target has neither. A hosted dry run listed both migrations. Older application builds cannot parse the new set types, so coordinate any hosted rollout with compatible clients. Recheck local and hosted migration histories before any deployment. For the rollback-only local SQL test, run from the repository root against the GRIND-owned local container:

```sh
docker exec -i supabase_db_grind_standalone_local psql -U postgres -d postgres -v ON_ERROR_STOP=1 < supabase/tests/grind_set_types.sql
docker exec -i supabase_db_grind_standalone_local psql -U postgres -d postgres -v ON_ERROR_STOP=1 < supabase/tests/grind_set_type_choices.sql
```

The SQL test inserts fictional data inside a transaction and rolls it back. Do not point it at hosted data.


25 October 2026. M0/M1 in progress; see [agent status](AGENT_STATUS.md) for checks actually completed. Native timer/physical-device acceptance is not yet complete.

## Runtime

The scaffold pins Expo SDK 57 and compatible React Native packages. Use the installed Node 24.11.1 runtime via the root `.nvmrc`; the shell's default Node 20 is too old for this SDK.

```sh
nvm use
npm ci
npm run typecheck
npm run lint
npm test
```

The environment inspected has Docker 29.1.3, Supabase CLI 2.101.0, Java 17, Android SDK/Android Studio and Xcode 26.2. Expo's current [SDK compatibility matrix](https://docs.expo.dev/versions/latest/#support-for-android-and-ios-versions) lists SDK 57 minimum Android 7/iOS 16.4 and Xcode 26.4+. The installed Xcode therefore remains an iOS native build-verification blocker. No system-toolchain upgrade has been performed. The user confirmed Apple signing is not configured and asked to leave iPhone native-build verification pending.

## GRIND disposable backend regression harness

`scripts/backend/local.py` copies only GRIND migrations/tests into a guarded disposable project (`grind_disposable`) on 554xx ports. It reads from this repository's root `supabase/` directory. The primary standalone local stack uses 555xx ports.

```sh
python3 scripts/backend/local.py prepare
python3 scripts/backend/local.py start
python3 scripts/backend/local.py reset
python3 scripts/backend/local.py test
```

Run reset only through the guarded disposable harness. Never substitute another project directory or remote database URL. Test results and any harness blockers belong in AGENT_STATUS.md; command availability does not imply every acceptance check passed.

The harness writes only public local endpoint/anon-key configuration to ignored owner-only `.env.development.local`, which takes precedence during development; it does not modify `.env.local`. The emulator was switched to the hosted GRIND public configuration on 31 October. Running the harness prepare step switches that development override back to local; restart Metro after any change and confirm the target before signup. The app accepts local endpoints or the selected standalone GRIND origin. Keep private keys out of chat/source. Provider live calls remain disabled.


## Standalone Supabase migration (active, 30 October 2026)

GRIND's standalone project is `mgyzzipsqmsabptrfchw`; the ignored `.env.local` contains its public URL/key. Root `supabase/config.toml` uses a separate local project ID and ports 55520–55527. For local clean replay, run `SUPABASE_TELEMETRY_DISABLED=1 supabase start` and `SUPABASE_TELEMETRY_DISABLED=1 supabase db reset --local`; this touches only the new GRIND local stack. The nine transactional SQL suites pass through psql; see [supabase/README.md](../supabase/README.md) for the runner.

Hosted deployment to `mgyzzipsqmsabptrfchw` is complete. The initial nine GRIND migrations were applied after a dry run, selected GRIND account data was transferred and compared, and `grind://auth/callback` plus the `grind` API schema are configured. The app accepts this project origin and its public publishable key through the environment variables below; never use a service-role key. Android emulator sign-in was confirmed; recovery, RLS and physical-device callback behavior remain to be verified. See [current M8 evidence](BUILD_STATUS.md) and [standalone Supabase setup](../supabase/README.md).

The transferred GRIND account must sign in again because Auth sessions are not copied. The 701 RepDB records were excluded from that initial transfer. Per the user's 1 November 2026 decision, catalog delivery through authenticated, member-scoped GRIND app functionality is approved as in-app use; it must not be exposed as a public/reusable API, raw dataset export, public storage listing or source mirror. The catalog must still pass the pinned-source, attribution, measurement, migration-history and release checks before hosted publication.

## App and device setup

```sh
npm start -- --port 8087
npm run android -- --port 8087
npm run ios -- --port 8087 # pending Xcode/signing setup
```

These are scaffold commands; see status for actual bundle/native-build evidence. Android/iOS development IDs are provisional `com.grind.dev`; callback scheme is `grind://auth/callback`. Final store IDs are not a prerequisite for local foundation work.

The disposable regression backend uses `127.0.0.1:55421`. On an Android emulator or USB-connected Android device, forward that port before testing it:

```sh
adb reverse tcp:55421 tcp:55421
```

A physical iPhone cannot use the Mac's loopback address. For that device, use a reachable private LAN address with port 55521 in the ignored development environment, restart Metro, and confirm firewall/Wi-Fi reachability. The environment guard permits private LAN addresses for local development. A suitable Xcode/signing setup and connected device are required for native iPhone validation.

The standalone local mail-capture UI is on port 55524. Use fictional development accounts for verification/reset. The hosted Auth redirect is configured for Grind's `grind://auth/callback`; email delivery and app callback behavior still require end-to-end verification.

## Scope

M1 delivers the application/auth/onboarding/catalog foundation. Workout logging, routines, complete timer lifecycle, records/corrections, data deletion and real provider playback belong to later milestones. M1's separate native timer feasibility proof still requires recorded physical iOS/Android evidence; a shell build or JavaScript export does not satisfy it.


## Bundle checks versus native acceptance

Android/iOS JavaScript exports have passed during foundation work. These exports are compilation checks, not native runtime/device proof. Expo production exports load `.env.local` rather than `.env.development.local`; verify the selected standalone URL and public publishable key before exporting. Use the development Metro workflow above for local Auth testing. Do not treat a production export as a ready-to-distribute build.

The GRIND migration replay, SQL tests and local Auth/API smoke tests pass. Run the GRIND policy checks and HTTP Auth/API cases with:

```sh
python3 scripts/backend/local.py test-grind
python3 scripts/backend/api_smoke.py
python3 scripts/backend/training_smoke.py
```

These commands target only the guarded disposable local stack and use fictional accounts. Real native PKCE/email-link callbacks, keychain isolation and timer delivery still need device evidence.


## Verified Android debug build

The coordinator generated the Android project, compiled the arm64 debug APK, installed it on emulator-5554 and observed Metro bundling the Router entry plus ReactNativeJS main starting. A fresh M3 native build/install also passed on28October; current software checks and native limits are maintained in BUILD_STATUS.md. This does not complete physical-device Auth/timer acceptance.

The generated artifact is `android/app/build/outputs/apk/debug/app-debug.apk` (ignored build output). Reproducible native build from the generated Android folder:

```sh
cd android
./gradlew :app:assembleDebug -PreactNativeArchitectures=arm64-v8a --console=plain
```

An initial build may take several minutes while Gradle/native dependencies compile. Normal developer startup should omit CI mode to retain interactive reloads.


## Engineering quality policy — 27 October 2026

Follow [engineering standards](engineering/REACT_NATIVE_STANDARDS.md), [maintenance](MAINTENANCE.md) and [module/test mapping](engineering/TEST_COVERAGE.md). Required commands now include `npm run test:coverage` with all executable app/src files and enforced global/critical thresholds. Existing tests passing is not a coverage pass: the first broad measurement exposed gaps documented in the mapping. Do not lower/exclude to hide them.

`.github/workflows/ci.yml` runs typecheck, strict lint, tests/coverage, preview JavaScript syntax and both JS exports, plus a separate credential-free Python harness-safety job. The workflow has been configured; no GitHub run or real SQL/API/native backend pass is implied by it. Real GRIND backend checks remain guarded and explicitly executed.

### RepDB snapshot inspection (local, read-only)

Given a local checkout of the canonical RepDB repository and an independently resolved full commit SHA, run `python3 scripts/catalog/validate.py /path/to/checkout <full-commit-sha> > /private/path/manifest.json`. The command reads committed Git blobs, checks basic schema and image headers, and records hashes plus license and credit text. It does not fetch, decode images fully, approve rights, import, upload or publish. Test it with `python3 -m unittest discover -s scripts/catalog -p 'test_*.py' -v`. Keep manifests containing licensed text in access-controlled storage.

### Bundled exercise catalog

The app bundles the licensed English data and static image registry at `assets/exercises/repdb` for local previews/imagery, with license and attribution. If updating the bundle, validate the source, review its terms and regenerate the registry with `python3 scripts/catalog/generate_bundle.py assets/exercises/repdb`; restart Metro afterwards. Missing bundle files cause the build to fail rather than silently shipping an empty library. A remote is configured; review the license's dataset redistribution restriction and repository visibility before any further publication. The original downloaded archive under ignored `Data/` is not needed for a build. Server exercise identities and configured selection are hosted in GRIND; see the 1 November release evidence.

### RepDB local review tooling

Generate an unapproved, archive-bound review sheet outside the repository with `python3 scripts/catalog/review_import.py Data/repdb-free.zip --output /private/tmp/grind-repdb-review.json`. The proposals are not reviewed logging decisions. `python3 scripts/catalog/import_reviewed.py Data/repdb-free.zip /private/tmp/grind-repdb-review.json` validates a completed review without writing to a database; `--apply` targets only the guarded disposable database and requires its migration snapshot to match. Stage pending source records using `python3 scripts/catalog/stage_archive.py Data/repdb-free.zip --apply` only after verifying the disposable target; omit `--apply` for validation only. These commands are local-only and must never target hosted data. The 1 November hosted release was performed with `python3 scripts/catalog/publish_hosted.py Data/repdb-free.zip --apply-hosted`, which enforces the GRIND project link and migration/catalog preflights. Run it again only for an intentional catalog release after source review.

After the guarded local configuration migration is present and the exact source archive is staged, `python3 scripts/catalog/import_pages.py Data/repdb-free.zip` validates the page import without a write; `--apply` imports pages to the guarded disposable local database. The initial local import keeps the bench-press UUID, archives the other seed rows and creates unconfigured browse-only pages. This importer is local-only.

The authenticated GRIND release was published on 1 November 2026. For a future specifically authorized release, `python3 scripts/catalog/publish_hosted.py Data/repdb-free.zip` performs validation and prints a dry-run plan; `--apply-hosted` targets only linked project `mgyzzipsqmsabptrfchw`, checks migration parity and the expected catalog state, writes through Supabase CLI, configures only approved equipment groups, and verifies exact result counts. Keep the original archive and generated SQL private; the command deletes temporary SQL after each step. Do not use for a different Supabase project or a new source archive without reviewing its hash, license and logging semantics.
