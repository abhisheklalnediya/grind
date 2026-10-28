# Future Domain Model — design notes, not migrations

The current MVP model is defined in `ARCHITECTURE.md`: Supabase Auth, user profiles/settings, a unified global/user-owned exercises table, routine templates/exercises/sets, workout sessions/exercises/sets and idempotent command receipts. Use UUIDs and versioned Postgres migrations with RLS. Persist valid active-workout edits through authenticated APIs, retain bounded unsent device drafts, and preserve historical snapshots. History and PRs initially derive from source sets rather than stored projections.

Future additions (do not implement in MVP unless needed as harmless nullable extension points):

- gyms: id, source_place_id (where permitted), user_submitted_name, claimed_status, verified_owner_id, lifecycle_status
- user_gym_affiliations: id, user_id, gym_id, is_primary, started_at, ended_at, directory_visibility; affiliation is self-reported
- gym_equipment: id, gym_id, display_name, manufacturer, model, equipment_type, photo, load_measurement_type, created_by, review_status, retired_at
- gym_equipment_exercises: equipment_id, exercise_id
- workout_exercises: optional gym_equipment_id, gym_id snapshot; historical records remain intact after gym/equipment changes
- workout_sets: load value/unit/type, reps, set type, completed timestamp; future assistance metadata and effort rating
- follows: follower_id, followed_id, approval_state
- workout_shares: session_id, user_id, visibility, published_at; separate from private workout data
- leaderboard_eligibility: user/session opt-in and eligibility policy; calculate from appropriate public sets; consider duplicate/fraud flags
- gym_claims, gym_staff_roles, gym_page_edits, equipment_submissions
- gym_offers: gym_id, offer_terms, start/end, status, redemption_method
- offer_redemptions: offer_id, user_id, redeemed_at, redemption_reference
- ai_analyses, ai_plan_proposals, ai_proposal_acceptances (future only)

Architecture note: Supabase Postgres is the authoritative store from MVP, with authenticated APIs and database-enforced ownership. Future gym/social/partner data extends this backend with separate access policies; private workouts must remain private unless explicitly shared. No full local database synchronization engine is planned for MVP.
