# Grind MVP pages and design

Status: proposed design for review, 25 October 2026. This defines the mobile app; the HTML board is a visual prototype with illustrative data, not a working app.

## Product and navigation

Help a lifter start quickly, record sets with one hand, and trust that their workout is saved. Use four bottom tabs: Train, History, Exercises, Settings. Routines live on Train. Records live within exercise details and workout summaries. Keep the active workout outside the tabs, with a persistent Resume workout strip when navigating elsewhere. One active workout at a time; Start returns to it if one already exists.

Primary journey: Sign in → Train → Start routine or empty workout → Add exercises → Log and complete sets → Finish review → Saved summary → History.

## Page inventory

| Page | Content and primary action | Important states |
| --- | --- | --- |
| Welcome / sign in | Short product promise, email/password, Sign in; Create account and Forgot password links | Invalid credentials, loading, network error, expired session |
| Create account | Email, password, password visibility; Create account | Validation, existing account response, submission error |
| Verify email | Email destination, resend with cooldown, return to sign in | Link expired, resend error, verification success |
| Password recovery | Request email, confirmation, deep-linked new password form | Invalid/expired link, resend, success |
| First setup | Preferred kg/lb and default rest time; Continue | Defaults selected; later editable in Settings; no notification request here |
| Train | Start empty workout, saved routines, recent workouts; New routine | First use with Start workout and Create routine, loading/error, active workout Resume |
| Routine detail | Name, ordered exercises, target sets/reps/load, estimated set count; Start workout | Edit, archive confirmation, existing active session |
| Routine editor | Name, add/reorder exercises, template sets, rest override, notes; Save routine | Unsaved-exit confirmation, validation, save failure, version conflict |
| Exercise picker | Search, muscle/equipment filters, multi-select; Add selected | Empty search, loading/error, Create custom exercise; selection preserved during search |
| Custom exercise editor | Name, muscle, category, load convention; Save exercise | Duplicate-name hint, required fields, custom-only edit/archive, historical references retained |
| Active workout | Elapsed time, save state, exercise cards, previous performance, editable set rows, add set/exercise; Finish | Saving, Saved, Not saved—retry, partial input, recovery, expired auth, revision conflict |
| Finish review | Completed set count and unresolved rows; Finish and save | Incomplete rows require explicit removal or return to workout; unsent changes block finishing; zero completed sets returns to logging or discard |
| Workout summary | Saved confirmation, duration, completed working sets, eligible volume and earned records; Done | First performance labelled Baseline; ties are not new records; optional Save as routine |
| History | Chronological sessions grouped by local date; Open workout | Empty state, loading/error, pagination; cancelled sessions excluded |
| Workout detail | Historical exercise names and sets, original date, duration, records at that time; Correct workout | Explicit correction mode with Save/Cancel, unsaved exit and recomputed records; no routine edit side effects |
| Exercise library | Search and filters, seeded and custom exercises; Open exercise | Empty search, loading/error, custom exercise creation |
| Exercise detail | Overview / History / Records; instructions, on-demand demonstration, load convention, previous sessions, eligible bests | No history, no eligible record, media unavailable, kg/lb display, custom edit/archive |
| Settings | Units, default rest, dark/light appearance, rest alert status, account email; Sign out | Permission denied with system settings link, save error, unsent draft before sign-out |
| Delete Grind data | Explain Grind-only data/membership deletion, explicit confirmation; Delete Grind data | Shared BabyBoo identity/data preserved; reauthentication if required, server error, success returns to auth |

## Active workout interaction

The workout is the design priority. Use columns Set / Previous / kg or lb / Reps / Complete. Keep numeric inputs large, use decimal keyboard for weight and integer keyboard for reps, and keep entered raw text while editing. Do not prefill last performance as a completed result. Show warm-up sets as W; working sets use numbered labels. Tap completion only after valid values exist. Uncompleting a set clears its completion state and reconciles its associated timer.

Completing a set starts its configured rest timer. Present a persistent in-app timer strip with remaining time, +30 seconds, and Skip. A timer sheet supports duration adjustment and restart. Ask for notification permission when the user first enables rest alerts; denial keeps the in-app timer usable. Provide OS countdown surfaces on supported devices and clear them when the workout finishes or is discarded.

Finish is always available to open review, but final completion requires server acknowledgement of every pending change. Do not show the saved summary before success. If connectivity drops, retain the existing workout's unsent input on this device and show Retry; new workout creation requires a connection.

Resume opens the recovered session with a subtle confirmation. For a revision conflict, preserve pending input, show the latest saved version and let the user review/reapply changes; never overwrite silently. Expired authentication opens reauthentication and retains the same account's draft. Explicit sign-out warns if input would be lost and offers Stay and retry or Discard local changes and sign out.

Discard workout is a secondary menu action behind confirmation. Leaving the workout screen does not discard it. Archive routine/custom exercise also needs confirmation and preserves past sessions.

## Visual direction

- Provisional GRIND / Volt Lime: background #111418, raised surface #1B2026, subtle border #30363E, primary text #F1F1F1, secondary text #A5AFBB, accent #E8F84C, error #FF9999.
- Quiet, dense, practical UI. Use lime for primary actions, selected controls and completed sets. Use words/icons with color for save and error states.
- System sans-serif; strong 30–32 px page titles, 16 px body, tabular numeric input. Use sentence case and short action labels.
- 16–20 px outer gutters, 12–16 px card radii, 8 px spacing rhythm. Minimum 48 px interactive targets. Avoid tiny icon-only completion targets.
- Support dynamic type, screen reader labels including exercise/set context, reduced motion, visible focus and sufficient contrast. Let set cards reflow at larger text sizes.
- Numeric keyboard must not cover the active row or timer controls. Keep Finish in the top bar and expose accessible Done/Next input controls.
- No charts on Train, fabricated readiness score, social feed, AI prompts, gym selection or billing in this MVP.

## Appearance addition — 27 October 2026

The user requested dark and light app appearance as part of M3 preferences. Volt Lime remains the brand direction; the existing prototype defines the dark reference only. Define a readable light palette with shared semantic tokens for all screens, controls, save/error states and native system bars. Persist the selected preference without resetting form/workout drafts. The user selected System as default with explicit Light/Dark overrides; browser/native and test evidence must distinguish both themes. Light and dark semantic app themes are implemented; native visual, accessibility and device verification remains open. The existing browser prototype remains the dark design reference.

## Review and implementation sequence

Review the Train, active workout and History direction in design/mvp-preview.html first. Then refine routine editing, exercise picking/details, and auth/settings using these tokens. The preview shows representative static screens and sample values; it does not validate native keyboards, accessibility, saving or notifications.

Build the first complete slice as authentication → Train → empty workout → picker → set logging → finish → History. Add routines and custom exercises, then records and correction flow. All pages and state handling above remain required for MVP; Save as routine is optional convenience.

## Exercises design preview

`design/exercises.html` is an interactive mobile design proposal. Search, muscle/equipment filters and All/Custom scope combine; results sort alphabetically. Each row opens Overview, History and Records. Load convention is explicit. Custom creation includes name, primary muscle, equipment and load convention. Preview data is illustrative and custom additions are temporary. The library opens details; selection controls belong to the workout/routine picker. Production also requires API loading/error/retry, custom edit/archive confirmation, and assistive-technology/native verification.

## Exercise demonstrations and data plan

MuscleWiki is the selected provider. The supplied list/detail/video responses are enough to architect the app; live integration remains unverified. See [Exercise media module](EXERCISE_MEDIA_MODULE.md) for the response contracts, implementation checklist and cache rules.

Library rows use a still thumbnail when permitted and available, otherwise a neutral movement icon. No list autoplay or eager loading of all video variants. Exercise Overview includes instructions and an explicit Play demonstration control; playback is muted with play/pause and available angle/demonstrator selection. Stop playback when leaving the screen. History and Records use Grind workout data and continue working when provider media is unavailable. Custom exercises have no demonstration unless explicitly mapped to an appropriate provider exercise.

Cache permitted exercise text across users; fetch missing detail once under a shared lease. A second user reuses fresh text. Media streams remain metered; video URL caching cannot guarantee a single call per play. Keep the API key server-only and use short-lived playback tokens. Do not permanently store media. Free-tier/direct-access entitlement, media-reference caching and shared backend permissions are implementation verification gates.

Share BabyBoo's Supabase project/Auth, while keeping Grind data, onboarding and local sessions separate. The Settings deletion flow must distinguish Delete Grind data from deletion of the shared account affecting both apps.
