# GRIND — Product Vision and Roadmap

Status: product ideas and proposed requirements, not implemented features. Brand GRIND / Volt Lime is provisional; STREAK / Industrial Amber remains an alternative. The branding concept board is exploratory artwork.

## Product thesis
Cross-platform (iOS + Android) authenticated, API-backed strength workout logger using Supabase that grows into a gym-specific equipment and community network, an AI training companion, and a gym-owner partnership platform. Start by building a strong workout logger, without copying Hevy's assets or protected designs. The revised MVP architecture is in `ARCHITECTURE.md`; it supersedes the original offline-first proposal.

## Roadmap (build in order; future phases are not MVP scope)
1. **Core logger**: authentication, exercise library, custom exercises, routines, workout sessions, set types, weight/reps, background rest notifications and live countdowns, exercise history, personal records, kg/lb conversion, API persistence, historical snapshots and interrupted-session recovery. Both platforms. PRs may be built later in this phase but are required for MVP. Export/backup UI is excluded.
2. **Advanced lifter tools**: prominently surfaced next-session notes/targets; complete contextual session history; explicit spotter present vs assistance given; assisted/unassisted PR distinction; planned vs actual sets and subjective context.
3. **Gym directory and profiles**: user-selected gym, gym discovery by locality, public/optional member profiles, follows and workout sharing; user-controlled gym directory visibility. Do not imply live attendance or verified membership.
4. **Gym-specific equipment**: community and owner-added equipment attached to an individual gym; photos, brand/model/type and exercise category; distinct equipment IDs even for same exercise/machine model. Select exact machine when logging; nullable equipment ID for generic exercises. Personal and gym-specific records, optional leaderboards, separate categories for load, rep-specific performance and volume. Self-reported records; no assumption that different machines are comparable. Support duplicates/edits/retirement and moderation.
5. **Gym partnerships**: gym owners claim/manage gym pages and equipment, update photos/facilities, publish offers (discounts, trials), issue coupon/QR redemptions, view basic analytics. Owner/staff roles and claim verification. A separate web dashboard (e.g. Next.js) may be appropriate. Do not implement payments initially.
6. **AI training companion**: pre-workout progression suggestions based on full history, optional contextual in-session prompts, post-workout analysis, personalized next-session proposals and selective acceptance. Distinguish deterministic performance/PR calculations from model-generated recommendations. No auto-modification of workout history or targets without user action.
7. **Monetization/launch**: consider free logger and social features, paid AI coaching, optional paid gym partner tools. Pricing hypotheses only; validate demand before billing implementation.

## Important product rules
- Gym selection does not automatically expose a user's profile, workouts or location; profile, gym directory and workout sharing permissions are separate.
- Only show public, eligible workout data on gym leaderboards; consider explicit leaderboard opt-in.
- Equipment records belong to a gym, and exercises belong to the global taxonomy; a machine may map to one or more exercise definitions.
- Record load measurement type (plates added, stack display, total load, etc.) and machine specifications when known. Don't conflate sled mass, external plates and actual resistance.
- Gym owners can maintain claimed pages, but ordinary members can submit equipment for review.
- Avoid suggesting official gym partnership unless a claim/partnership has been verified.
- Gym directories, third-party place APIs, logos, privacy, consent, moderation, minors, and partner promotions require policy/legal review before public launch.

## Success metrics to validate
- Can a lifter record a complete session quickly and reliably, with clear server-save status and recovery from interrupted requests?
- Do next-session notes and full history improve retention?
- Do members add and reuse gym-specific machines?
- Are leaderboard records meaningful and trusted?
- Do gym owners see measurable leads/redemptions and willingness to pay?
