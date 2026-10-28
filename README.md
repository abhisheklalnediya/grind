# GRIND / STREAK — React Native Gym Logger

An **iOS and Android** workout logger with local implementation through M3 in place and device acceptance in progress. Brand direction: GRIND / Volt Lime (#111418 background, #E8F84C accent, #F1F1F1 text). Alternative: STREAK / Industrial Amber (#171717 background, #F5A623 accent). Verify name, store and trademark availability before release.

## What to build now
A reliable Expo / React Native / TypeScript, authenticated, API-backed workout logger using Supabase Auth and Postgres: exercise library, routines, sets, history, personal records, kg/lb conversion and background rest notifications with live countdown surfaces. See `docs/ARCHITECTURE.md` for the revised architecture and `docs/CODEX_TASK.md` for MVP scope. Use real local Supabase during development, then deploy to hosted Supabase; device storage is limited to session support and unsent drafts.

## What comes later
Advanced lifter context, gym profiles and follows, community equipment catalogs, machine-specific leaderboards, owner-managed gym pages, partner offers and AI coaching. See `docs/PRODUCT_VISION.md` and `docs/DATA_MODEL_FUTURE.md`. **These are plans, not implemented features.**

## Branding
`assets/branding/concept-board.png` is exploratory artwork, not a ready-to-ship icon. Recreate the selected barbell-with-muscle-curves mark as a clean original vector and export separate iOS and Android icons. Do not copy competitors' branding.

## Development and maintenance

- [React Native standards](docs/engineering/REACT_NATIVE_STANDARDS.md): mandatory modularity, reusable components and meaningful tests for every executable module.
- [Maintenance workflow](docs/MAINTENANCE.md): quality gates, dependencies, migrations, native rebuilds and documentation discipline adapted from BabyBoo.
- [Live tasks](docs/planning/TASKS.md), [test coverage and gaps](docs/engineering/TEST_COVERAGE.md), and [actual status](docs/AGENT_STATUS.md): distinguish implemented work from verified acceptance. Current tests passing does not imply coverage gates pass.

## Working in this project

Open this GRIND folder in Codex. Start with [START_HERE.md](START_HERE.md) and [AGENTS.md](AGENTS.md). The user authorized local implementation through M3. Native app/auth source now lives at the root; the HTML prototype remains a separate design reference. Read [setup](docs/SETUP.md) for commands and [agent status](docs/AGENT_STATUS.md) for verified checks and open acceptance gates.

Current implementation/build health is maintained in [docs/BUILD_STATUS.md](docs/BUILD_STATUS.md), including failures, native artifacts and the next fixes through M3.

## File layout

- `AGENTS.md`: coordinator rules; `agents/`: architect, designer, developer and reviewer role instructions.
- `docs/`: architecture, requirements, roadmap and coordination status.
- `design/`: illustrative HTML prototypes, separate from future application code.
- `assets/branding/`: exploratory branding artwork.
- `supabase/functions/`: ignored provider configuration; `scripts/backend/`: guarded disposable local backend harness. Canonical migrations live in the existing BabyBoo stream.
- `.env.example`: public configuration template; `.env.local` is ignored local configuration.

See [the document index](docs/README.md) for reading order and decision precedence. Keep configuration secrets out of documentation and commits.

## MVP design review

The designer role is defined in [agents/designer.md](agents/designer.md). Open [the clickable MVP prototype](design/mvp.html) and [design notes](design/DESIGN_NOTES.md) to review pages and interaction states using local sample data. Local implementation through M3 is authorized; M4–M8 and hosted/provider operations retain their gates.

To serve the design locally from the GRIND root:

```sh
python3 -m http.server 8765 --bind 127.0.0.1 --directory design
```

Then open `http://127.0.0.1:8765/mvp.html`. This serves only the design folder, keeping local environment files outside the preview server.

## Shared backend and exercise demonstrations

Grind uses the planned shared BabyBoo Auth model with separate app data and sessions. MuscleWiki is selected for streamed demonstrations. Read [the module architecture](docs/EXERCISE_MEDIA_MODULE.md) before implementation; local secrets are ignored and no integration is deployed yet.
