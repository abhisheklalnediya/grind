# GRIND MVP design · 02

3 November: Set rows use a compact set-type selector (W, working number, D, F), with other set actions available in the same menu. Per-row Next/Done buttons were removed at the user’s request; direct field selection and drag-to-dismiss remain. Additional types require a compatible backend. Keyboard and accessibility acceptance on physical devices remains open.


Status: first complete design pass, 25 October 2026. Reviewable prototype only; no application/backend implementation, account operation, provider request or persistence.

Open [mvp.html](mvp.html) directly, or serve this design directory locally. The prototype has no external assets, dependencies or network calls. Earlier [screen board](mvp-preview.html) and [exercise exploration](exercises.html) are preserved.

## Direction

### Authentication follow-up direction — 31 October

The selected left-hand GRIND concept board supplies the lime barbell mark, wordmark and dark visual identity; it does not depict a complete login page. The native auth refinement uses a compact lockup, prominent primary action, password visibility beside its field, distinct secondary actions and field-level feedback. The active workout refinement groups secondary options, uses compact rest and recovery controls, protects entered data on removal and summarizes finish blockers. Conflict resolution requires loading the server version before its actions become available. Both appearances and native keyboard, layout and accessibility behavior still require device verification; work and acceptance criteria are tracked in [tasks](../docs/planning/TASKS.md#login-review-follow-up).

The 31 October native workout rebuild follows this prototype's compact header, status line, exercise cards, shared set headings, completion and add actions, empty state and finish receipt. Native timer, conflict, timed/distance and original-unit behaviors remain explicit extensions of the illustrative prototype. Device fidelity and accessibility acceptance remain open.

GRIND / Volt Lime follows the existing dark-first tokens: #111418 background, #1B2026 surface, #30363E borders, #F1F1F1 text, #A5AFBB secondary text, #E8F84C accent and #FF9999 errors. Keep color purposeful: primary action, selection, completed sets and timer. Strong page titles, generous touch bounds and compact numeric rows prioritize logging rather than decoration.

Four bottom tabs contain Train, History, Exercises and Settings. Active workouts sit outside the tabs, with a Resume strip while browsing. Routine and exercise details use ordinary back navigation. The desktop review panel is separate from product UI and stacks above the phone on narrow viewports.

## Page coverage

| Requirement | Prototype page / interaction |
| --- | --- |
| Welcome / sign in | Sign in; labelled email/password, visibility, create/recovery paths |
| Create account | Create account → verification |
| Verify email | Resend with 60-second cooldown; explicitly labelled simulated verified link |
| Password recovery | Reset request confirmation; preview link → separate new-password screen |
| First setup | Unit and rest preference; no notification prompt |
| Train | Empty workout, routines, recent session, active Resume |
| Routine detail | Ordered exercises, set targets and start/archive |
| Routine editor | Name, exercise order, target fields, picker, notes, save/cancel |
| Exercise picker | Search + muscle/equipment + custom scope, selection retained across filters |
| Custom exercise | Name, muscle, equipment, category, load convention; create/edit/archive |
| Active workout | Previous beside inputs, completion validation, raw partial input, add/remove sets/exercises, save status |
| Finish review | Explicit incomplete-row removal, zero-set and unsaved guards |
| Saved summary | Baseline language, completed-set count, optional Save as routine |
| History | Chronological illustrative cards, empty state and end of pagination |
| Workout detail | Original labels/units, records at that time, correction route |
| Correction | Separate edit mode, save/cancel/discard confirmation |
| Exercise library | Combined filtering, All/Custom scope, details rather than selection |
| Exercise detail | Overview/History/Records, load convention, explicit Play, unavailable-media fallback |
| Settings | Unit/rest, contextual rest-alert choice, sign out with pending-input warning |
| Delete Grind account data | Scope explanation + acknowledgement + second confirmation; applies only to the standalone Grind account |

## Try these journeys

1. Train → Start empty workout → Add exercise → select Barbell bench press → Add selected → enter load/reps → complete → Finish → Finish and save → History.
2. In an active workout, select **Not saved** or **Conflict** in the review controls. Finish remains blocked; Retry or review/reapply resolves the simulated state. Incomplete values are not converted to zero.
3. Train → routine → Edit → add/reorder exercises → Save; archive is confirmed and leaves sample history intact.
4. Exercises → filter/search → open a movement → Overview/History/Records → Play demonstration. Playback is intentionally unavailable; there is no provider integration or fake playing video.
5. Settings → rest alerts → Allow/Not now; Settings → Delete Grind data shows the cross-app boundary explicitly.
6. Use the review page selector for auth pages, a populated workout, correction and other pages without replaying a journey.

## State coverage and fidelity

Default, Empty, Loading, Error, Not saved, Conflict and Expired controls demonstrate the visual treatment independently of production logic. These are review controls, not app features. Generic loading/error banners are available on every page; empty content is illustrated on Train, catalog, History and exercise history/records. Not every error has a distinct backend-derived message.

All data and changes are memory-only and reset on reload. Auth values are not verified, emails are not sent, saving does not contact a server, records are illustrative, and timer alerts do not schedule OS notifications. The countdown itself runs locally. No local storage, analytics or provider tokens are used.

Routine target fields, notes and order are retained between preview pages, with an explicit draft rollback on Cancel. Correction inputs commit to the selected illustrative session, or roll back on Cancel. New saved workouts appear in History with their entered sets. The historical sample is not a calculation engine. Original entered units are retained in session snapshots. Illustrative records normalize lb to kg; these floating-point preview calculations do not replace the proposed authoritative decimal SQL calculations. These are handoff details for implementation, not claims of functional data contracts.

The custom editor uses provisional category/equipment choices from the existing design examples. Final taxonomy, numeric bounds, precise previous-performance matching, assisted/bodyweight handling, normalized ties and SDK/minimum OS versions remain architecture decisions. Completing sets in this prototype demonstrates loaded exercises only. Add set offers working or warm-up type.

## Accessibility and verification

Semantic buttons, labelled form fields, visible focus, text-plus-color states, 48px action bounds, native dialogs and live status announcements support review. CSS reflows the shell at narrow widths; the set row has explicit 320px adaptations. No automatic animation or media is present.

Executed: `node --check design/mvp.js` (syntax passed). Coordinator verified local links/assets and exercised the core logging-to-History journey, entered-value snapshots, invalid/unsaved finish guards and unavailable-media behavior in the in-app browser. Independent static review passed after fixes; details are recorded in [project status](../docs/AGENT_STATUS.md).

Native dynamic type, screen readers, decimal keyboards, keyboard avoidance, secure auth/deep links, save/recovery/idempotency, network errors, physical notification delivery, iOS Live Activities and Android chronometers require real native implementation and device testing. HTML appearance cannot validate them.
