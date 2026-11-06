# MVP page alignment review — 1 November 2026

The 21 entries in the local MVP prototype selector were opened in the browser and compared with the corresponding implementation and current specifications. This is a source/design comparison, not evidence that all native pages or states were opened or visually accepted. The prototype uses fictional data and simulates save, notifications, records, corrections and deletion.

| MVP page | Implementation and disposition |
| --- | --- |
| Train | `TrainScreen`: session card, routines and recent workouts aligned in prior work; native states still require review. |
| Sign in | `AuthScreen`: real validation, pending/error handling and verified-session handoff; copy/branding intentionally differs. |
| Create account | `AuthScreen`: real signup and validation; confirmed user-reported working on Android; inspect visual and error states on devices. |
| Verify email | `VerifyScreen`: retained for applicable auth flows; current hosted signup does not require confirmation. |
| Password recovery | `AuthScreen`: real recovery; Settings entry now available while signed in. |
| New password | `NewPasswordScreen`: callback-based recovery; device callback acceptance remains open. |
| First setup | `SetupScreen`: units/rest saved through server; alert-permission controls belong to M4. |
| Routine detail | `RoutineDetailScreen`: ordered themed exercise panels with actual individual targets; no fabricated muscle or target summary. |
| Routine editor | `RoutineEditorScreen`: ordered exercise panels retain per-set controls, recovery and save/conflict behavior; visual device review remains. |
| Exercise picker | `ExercisePickerScreen`: All/My scope added; search and selected items persist across scope changes. |
| Custom exercise | `CustomExerciseScreen`: existing validated creation and logging configuration; inspect native visual and save states. |
| Active workout | `WorkoutScreen`: prior alignment includes title, status, set cards and accessible options; remaining device matrix open. |
| Finish review | `FinishScreen`: receipt and explicit blockers; preserves acknowledgement and removal safeguards beyond prototype. |
| Saved summary | `WorkoutDetailScreen` summary: real saved confirmation, name/date and actual snapshot details; record/baseline claims and save-as-routine remain unimplemented. |
| History | `HistoryScreen`: contextual cards, empty CTA returning to Train, pagination and retry. |
| Workout detail | `WorkoutDetailScreen`/`SessionDetails`: real historical snapshots; correction is M5. |
| Correct workout | No production correction route; M5 requires reviewed server commands, records recomputation and safety. Prototype is simulated. |
| Exercise library | `ExerciseLibraryScreen`: search, configured-only filters, custom scope and catalog attribution; native review remains. |
| Exercise detail | RepDB and custom/server paths differ; RepDB provides bundled instructions and the mapped server load convention; custom has no fabricated media. Unified history/records are pending product/backend work. |
| Settings | `SettingsScreen`: unit, rest, appearance, account/sign-out and password recovery. Native rest alerts and deletion are M4/M5, not simulated controls. |
| Delete Grind data | No implemented deletion route; M5 needs reviewed scoped deletion, confirmation, security and recovery behavior. |

## Remaining gaps and verification

This pass aligns selected implemented UI elements; it does not establish full visual parity across every page. Android emulator light-mode views of Train, History empty, Exercises library, RepDB detail and Settings were inspected; the other native page/state views, dark/light matrix, accessibility, keyboard, larger text, iOS and physical-device validation are still open. Exercise-detail information architecture, reliable native rest alerts, correction/records, data deletion, and optional save-as-routine remain unfinished; these must not be represented as implemented by copying prototype-only controls. Avoid changing hosted data or creating fixture workouts for visual review without appropriate authorization.
