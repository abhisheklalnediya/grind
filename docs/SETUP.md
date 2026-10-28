# GRIND local foundation setup

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

## Backend safety boundary

Canonical migrations live in the existing sibling BabyBoo Supabase stream. The new foundation migration is `20261025180000_grind_foundation.sql`; pre-existing migrations/config/source remain unchanged. GRIND does not maintain a competing hosted history.

The local harness copies reviewed canonical SQL into a separate marked temporary workspace with project ID `grind_m1_disposable` and 554xx ports. The existing BabyBoo containers/544xx ports must remain untouched. No hosted link/push/reset/deployment is part of these commands.

```sh
python3 scripts/backend/local.py prepare
python3 scripts/backend/local.py start
python3 scripts/backend/local.py reset
python3 scripts/backend/local.py test
```

Run reset only through the guarded disposable harness. Never substitute a BabyBoo workdir or remote database URL. Test results and any engine/harness blockers belong in AGENT_STATUS.md; command availability does not imply every acceptance check passed.

The harness writes only public local endpoint/key configuration to ignored `.env.development.local` with owner-only permissions. Existing `.env.local` is preserved. Do not paste keys into chat/docs or expose the project root with a static web server. The M1 app rejects hosted endpoints before constructing its Supabase client. Provider live calls remain disabled.

## App and device setup

```sh
npm start -- --port 8087
npm run android -- --port 8087
npm run ios -- --port 8087 # pending Xcode/signing setup
```

These are scaffold commands; see status for actual bundle/native-build evidence. Android/iOS development IDs are provisional `com.grind.dev`; callback scheme is `grind://auth/callback`. Final store IDs are not a prerequisite for local foundation work.

The local backend defaults to `127.0.0.1:55421`. On an Android emulator or USB-connected Android device, forward that port before testing:

```sh
adb reverse tcp:55421 tcp:55421
```

A physical iPhone cannot use the Mac's loopback address. For that device, use a reachable private LAN address with port 55421 in the ignored development environment, restart Metro, and confirm firewall/Wi-Fi reachability. The local-only environment guard permits private LAN addresses. Do not switch to hosted credentials as a connectivity workaround. A suitable Xcode/signing setup and connected device are required for native iPhone validation.

The disposable mail-capture UI is on local port 55424. Use fictional development accounts for verification/reset; do not use real family records. The generated local allowlist retains the existing BabyBoo callback alongside Grind's callback. Hosted email templates/redirects remain unchanged and unverified.

## Scope

M1 delivers the application/auth/onboarding/catalog foundation. Workout logging, routines, complete timer lifecycle, records/corrections, data deletion and real provider playback belong to later milestones. M1's separate native timer feasibility proof still requires recorded physical iOS/Android evidence; a shell build or JavaScript export does not satisfy it.


## Bundle checks versus native acceptance

Android/iOS JavaScript exports have passed during foundation work, and the coordinator reran typecheck, lint and all 17 suites/29 tests successfully after integration. These exports are compilation checks, not native runtime/device proof. Expo production exports load `.env.local` rather than the development override; the M1 local-only guard refuses the hosted config and shows configuration-needed instead of contacting it. Use the development Metro workflow above for local Auth testing. Do not treat a production export as a ready-to-distribute build.

The canonical combined migration replay, dedicated Grind SQL and real local Auth/API smoke tests passed. The full BabyBoo SQL regression command remains blocked by a reproducible pre-existing database engine crash; see [backend evidence](../supabase/local/README.md). To run only the independently verified Grind policy checks and HTTP Auth/API cases:

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


## Quality policy adopted from BabyBoo — 27 October 2026

Follow [engineering standards](engineering/REACT_NATIVE_STANDARDS.md), [maintenance](MAINTENANCE.md) and [module/test mapping](engineering/TEST_COVERAGE.md). Required commands now include `npm run test:coverage` with all executable app/src files and enforced global/critical thresholds. Existing tests passing is not a coverage pass: the first broad measurement exposed gaps documented in the mapping. Do not lower/exclude to hide them.

`.github/workflows/ci.yml` runs typecheck, strict lint, tests/coverage, preview JavaScript syntax and both JS exports, plus a separate credential-free Python harness-safety job. The workflow has been configured; no GitHub run or real SQL/API/native backend pass is implied by it. Real backend checks remain guarded and explicitly executed, and full cross-app regression remains blocked as recorded in status.
