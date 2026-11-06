# GRIND implementation milestones

Last reviewed: 6 November 2026. This is the roadmap and acceptance sequence, not permission to start a milestone or deploy. [Tasks](planning/TASKS.md) own work status and assignments; [build status](BUILD_STATUS.md) owns current verification and blockers; [MVP checklist](planning/MVP_CHECKLIST.md) tracks pages and journeys. A passing automated test or a prototype does not establish device or release acceptance.

GRIND uses its own Supabase project, Auth, local stacks and `supabase/migrations`. Hosted changes, spending and deployment require explicit authorization. Supabase is authoritative; pending work must not be called saved before server acknowledgement.

| Milestone | State | Outcome and remaining acceptance |
| --- | --- | --- |
| M0 — Foundation and contracts | Implemented | Project, design and core contracts established. Maintain current architecture and stand-alone ownership decisions. |
| M1 — App, auth and feasibility | Implemented; acceptance open | Auth, onboarding and secure session infrastructure exist. The user confirmed Android emulator sign-in on 6 November; recovery links, error states, physical-device session security, iOS and native timer feasibility remain to verify. |
| M2 — Core workout | Implemented; acceptance open | Start/resume, set entry, saved history and durable recovery exist. Verify the complete API-backed workout, finish, history, interruption and recovery journey on devices, including account isolation and failure handling. |
| M3 — Everyday training | Implemented; acceptance open | Routines, custom exercises, previous performance, units and appearance exist. Verify editors, picker, settings, keyboard, accessibility and snapshots on both platforms. |
| M4 — Native rest | Deferred | Implement and verify background alerts, supported countdown surfaces, permission handling and lifecycle cleanup on physical devices. In-app countdown alone is not M4 acceptance. See [M4/M5 proposal](planning/MVP_COMPLETION_PROPOSAL.md). |
| M5 — Records, corrections and data controls | Deferred | Review and implement record rules, completed-workout corrections and GRIND data deletion, including ownership, recovery and deletion behavior. The proposal needs decisions before implementation. |
| M6 — Exercise catalog and demonstrations | In progress | RepDB is the selected catalog; historical hosted checks reported 701 records and 204 configured for selection. Review the remaining exercise logging semantics, license/release conditions, attribution, identity, media fallback and native acceptance. See [catalog plan](EXERCISE_CATALOG_PLAN.md). |
| M7 — Beta and launch readiness | Todo | Verify approved hosted environment and migrations, complete journeys, security, accessibility and physical-device tests. Produce signed release candidates and complete store requirements. Beta and production publication are separate decisions. |
| M8 — Standalone backend | Implemented; acceptance open | GRIND owns its backend and migration history. Sign-in was confirmed on the emulator; hosted RLS, recovery callbacks and full physical-device journeys remain open. Set-type migrations are local only and await separately authorized hosted rollout. |

## Recommended order

1. **Stabilize the current logger:** complete the Android workout-to-history and interruption/recovery journey, then verify the equivalent iOS and physical-device cases. Resolve confirmed issues with focused regression coverage.
2. **Complete required MVP functionality:** agree M4/M5 contracts, then implement and verify native rest, records, corrections and data controls. Review catalog configuration and release rights alongside that work.
3. **Validate the selected product direction:** progression guidance and machine-specific progress are future product hypotheses selected for GRIND, not current MVP capabilities. Define and test their requirements before scheduling implementation; do not imply they are already available.
4. **Prepare beta and release:** reconcile reviewed migrations and approved hosted configuration, verify two-user isolation and recovery, complete device/accessibility testing, produce signed builds, and review store, privacy and operational requirements. Authorization is required before hosted rollout or publication.

## Acceptance principles

- **M2/M3:** preserve original values and units, historical snapshots, account-scoped drafts, idempotent commands and revision conflicts. Saved means server-acknowledged; failed or pending work remains recoverable and visible.
- **M4:** exercise alert replacement/cancellation, permission denial, foreground/background/locked screen and restart on physical devices; document platform limitations.
- **M5:** verify record eligibility and mixed units, corrections and recalculation, deletion scope, local cleanup and isolation. Do not assume a database cascade without testing it.
- **M6:** use stable GRIND exercise identities, approved licensed assets, attribution and configured logging semantics. Keep unreviewed content and unsupported provider use out of release.
- **M7/M8:** verify the actual target and migration history, authenticated access and user isolation; never use production data as a disposable fixture. Native build, install, interaction, physical-device and hosted evidence are separate checks.

The detailed page and state criteria remain in the [MVP checklist](planning/MVP_CHECKLIST.md), and commands are in [setup](SETUP.md). Product and architecture specifications remain authoritative; the HTML design is a visual reference.
