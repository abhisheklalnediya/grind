# MVP check status

Last reviewed: 3 November 2026. This is the working page-and-state checklist for comparing the app with [MVP requirements](../MVP_PAGES.md) and the [prototype](../../design/mvp.html). Update the relevant row when implementation or acceptance changes, and link to evidence rather than treating a prototype, mock or passing unit test as device verification. Task assignments and sequencing remain in [TASKS.md](TASKS.md); actual checks and blockers belong in [BUILD_STATUS.md](../BUILD_STATUS.md); coordination history belongs in [AGENT_STATUS.md](../AGENT_STATUS.md).

**Status:** Todo = not implemented or not yet reviewed; In progress = active work; Implemented = code exists but acceptance remains open; Verified = the stated acceptance has evidence; Blocked = an identified external dependency prevents progress; Deferred = deliberately later work. Status applies to the specific row, not the whole app. A page marked Implemented is not a claim of native, hosted, accessibility or visual acceptance.

## Page and journey checks

| ID | Page / state | Status | Current evidence and next check |
| --- | --- | --- | --- |
| AUTH-1 | Sign in and account creation | Implemented | Validation, pending/error and session handoff exist; user reported it worked on Android. Verify failure, restore and keyboard states on current builds. |
| AUTH-2 | Verify email | Implemented | Verification screen and callback exist; current hosted signup does not require confirmation. Verify applicable callback flow where enabled. |
| AUTH-3 | Password recovery and new password | Implemented | Recovery from sign-in and Settings, callback and reset screens exist. Verify hosted recovery and Android/iOS deep links end to end. |
| AUTH-4 | First setup | Implemented | Units/rest save through the account flow. Verify setup, retries and keyboard on devices. |
| TRAIN-1 | Train, empty and active states | Implemented | Start/Resume, routines and recent sessions exist; Android light active view inspected. Check populated/error states and device matrix. |
| ROUTINE-1 | Routine detail and start | Implemented | Ordered exercise panels and actual targets exist. Verify saved routine, archive, resume and device visuals. |
| ROUTINE-2 | Routine editor | Implemented | Ordered panels, target editing, draft and conflict paths exist. Verify picker return, keyboard and unsaved exit natively. |
| EXERCISE-1 | Picker | Implemented | Search/filter, configured-only selection, All/My scope and retained selection exist. Verify selection and return on devices. |
| EXERCISE-2 | Custom exercise create/edit/archive | Implemented | Validated editor and custom-only controls exist. Verify save/error/archive and historical references natively. |
| EXERCISE-3 | Library | Implemented | Configured catalog, search/filters, custom scope and attribution exist; Android light list inspected. Verify empty/error/filter and device accessibility. |
| EXERCISE-4 | Exercise detail and history | In progress | Shared Overview/History tabs now present account-scoped history for mapped RepDB and custom/server exercises; timed/distance values retain units and match tracking type. Verify native tabs and history; records remain M5. |
| WORKOUT-1 | Active workout and set entry | Implemented | Repetition and timed input, a compact type selector and save/recovery exist; extra set types work on the migrated local backend and are gated on server capability. Android row inspected; verify software keyboard, narrow/large text, timed sets and accessibility. Hosted migration is pending authorization. |
| WORKOUT-2 | Rest timer and recovery | In progress | In-app timer/retry/conflict controls exist. M4 notification, permission, lifecycle and physical-device evidence remain open. |
| WORKOUT-3 | Finish review | Implemented | Server-acknowledgement blockers and explicit removal confirmations exist. Verify all blocker states and return flow on devices. |
| WORKOUT-4 | Saved summary | In progress | Real saved confirmation, name/date and snapshot metrics exist. Records/baseline are M5; optional Save as routine remains Todo. |
| HISTORY-1 | History and empty state | Implemented | Date-grouped cards, pagination, retry and Train empty CTA exist; Android light empty view inspected. Verify populated/pagination states natively. |
| HISTORY-2 | Workout detail | Implemented | Snapshot values, units, conventions and the recorded local date/time render. Verify real historical and timed entries natively; correction is separate. |
| HISTORY-3 | Correct completed workout | Deferred | M5 requires reviewed server correction and record-recomputation contracts; prototype only simulates this. |
| SETTINGS-1 | Units, rest, appearance and account | Implemented | Persisted preferences, themes, sign-out and recovery exist; Android light settings inspected. Verify persistence, sign-out drafts and device matrix. |
| SETTINGS-2 | Rest alerts | Deferred | M4 native scheduling/permission/settings flow and physical-device checks remain. |
| ACCOUNT-1 | Delete GRIND data | Deferred | M5 needs reviewed scoped deletion, reauthentication/confirmation, isolation and local cleanup; no simulated delete action. |

## Cross-cutting acceptance

| ID | Check | Status | Evidence / next check |
| --- | --- | --- | --- |
| QUALITY-1 | Typecheck, lint, tests and coverage | Verified | Latest run and thresholds: [build status](../BUILD_STATUS.md). Rerun after code changes. |
| DEVICE-1 | Android and iOS page/state visual match | In progress | Android emulator light: Train, History empty, library, RepDB detail, Settings and populated repetition workout inspected; populated repetition workout also inspected in dark. Remaining pages/states and iOS are Todo. |
| DEVICE-2 | Dark/light, 320dp, large text, keyboard and screen reader | Todo | Semantic themes and tests exist; full native acceptance not established. |
| DEVICE-3 | Physical timer, notification, session and recovery behavior | Todo | Requires physical Android/iOS and appropriate toolchain; emulator/JS tests do not establish delivery or keychain behavior. |
| DATA-1 | Server acknowledgement, recovery and account isolation | Implemented | Automated/local evidence exists; combined native journey and authenticated hosted API/RLS acceptance remain open. |
| CATALOG-1 | Catalog configuration and release acceptance | In progress | Hosted approved catalog has 204 configured selections; remaining entries, rights and native acceptance are tracked in [catalog plan](../EXERCISE_CATALOG_PLAN.md). |

## Working order

1. Fix concrete defects in implemented pages and preserve the real data contracts; update the affected row and test evidence with each change.
2. Complete remaining page/state visual and accessibility checks on available devices without creating or modifying hosted data solely for fixtures.
3. Review the [M4/M5 completion proposal](MVP_COMPLETION_PROPOSAL.md), then implement approved contracts as separately scoped local milestones and verify native/hosted behavior.

The full prototype comparison is recorded in the [1 November review](../reports/reviews/2026-11-01-mvp-page-alignment.md).
