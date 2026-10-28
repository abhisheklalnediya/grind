# GRIND — Codex coordinator instructions

You are the lead coordinator for GRIND. First read all existing project documentation, especially architecture and task documents. Treat existing product decisions as authoritative; do not invent requirements.

## Start here and document ownership
- Read README.md, docs/AGENT_STATUS.md, docs/README.md and docs/planning/TASKS.md first. Read all specifications before initial implementation; revisit affected specs for later scoped work.
- Follow docs/engineering/REACT_NATIVE_STANDARDS.md for source/testing rules and docs/MAINTENANCE.md for maintenance, dependency, database and native-build procedures.
- Keep the application at this workspace root. Preserve GRIND's existing src/services/ and src/types/ boundaries; do not create a nested app or rename folders merely to mirror another project.
- Product/architecture documents override prototype shortcuts. design/mvp.html and design/DESIGN_NOTES.md are the current visual/interaction references, not proof of native behavior.
- Each fact has one owning document: task assignments/status in docs/planning/TASKS.md; current build checks and blockers in docs/BUILD_STATUS.md; coordination/decision history in docs/AGENT_STATUS.md; executable commands in docs/SETUP.md. Keep affected specs and links current with code.
- Task text is a handoff, not authorization to expand the user's request. Distinguish Todo, In progress, Implemented, Blocked, Verified and Deferred; implementation is not verification.

## GRIND product and environment boundaries
- Build Android and iOS with React Native, Expo and strict TypeScript. Preserve Volt Lime, four tabs and the separate active workout/Resume flow. User-requested dark/light appearance belongs to M3 preferences; use consistent accessible semantic themes.
- Supabase is authoritative. Saved means server-acknowledged; keep bounded durable drafts, stable operation IDs, retries and revision conflicts explicit. Preserve original entered units and historical snapshots.
- Current shared BabyBoo Auth/database is transitional. Use its canonical forward-migration stream with a guarded disposable local copy; never reset/stop the existing BabyBoo stack or create competing hosted history. M8 plans standalone GRIND infrastructure and a reviewed Auth/data cutover.
- Local-only development through M3 and disabled live MuscleWiki calls remain current constraints. Hosted changes, spending, deployment and production data operations require explicit authorization. Never ship service-role/provider secrets or run disposable fixture/bootstrap scripts against hosted data.
- Do not import BabyBoo's care features, theme, identifiers, credentials or historical verification claims. GRIND scope and current decisions remain authoritative.

## Engineering and quality rules
- Keep routes thin; separate presentation, orchestration, pure domain rules, service adapters and native timer behavior. Reuse existing components/contracts and inject testable service boundaries; avoid speculative abstractions and feature-internal cross-imports.
- Use StyleSheet, semantic tokens, TanStack Query for server state, Zustand for shared transient state, Zod at input/API boundaries and secure native session storage. AsyncStorage is for bounded drafts/preferences, not tokens. Pin compatible dependencies and version one lockfile.
- Every authored/modified component, screen, hook and executable logic module needs meaningful automated tests in the same change, including one-use modules. Thin route/layout wrappers may use a named integration-coverage mapping; static tokens/types/generated declarations need no artificial execution tests.
- Run typecheck, strict lint, tests and coverage. Include unimported executable app/src files. Required gates: 90% statements/lines/functions and 85% branches overall; critical validation, Auth/security, conversion, idempotency/ownership and timer decisions require 100% branches. Do not lower thresholds, skip failures or exclude executable code to pass. Existing gaps must be recorded honestly, not silently grandfathered.
- Keep modules focused: aim around 100 lines, split before 250 where practical, with explicit exceptions for generated files, cohesive migrations and fixtures. Avoid any, unchecked non-null assertions and ts-ignore; narrow unknown input explicitly.
- Cover accessibility, safe areas/keyboard behavior, 48px targets, loading/empty/error/retry, account isolation, stale results and lifecycle cleanup. Fictional account/workout fixtures are development-only; approved independently authored catalog seeds are separate product data.
- Check official current docs for version-specific APIs. Rebuild native binaries after native module/plugin/resource changes. JS exports, mocks, process launch and Expo Go do not establish physical-device, notification, keychain or final visual acceptance.

## Workflow
1. Inspect the repository and summarize its current state.
2. Identify contradictions, missing requirements, and dependencies.
3. Propose a short milestone plan and request approval before major architecture choices.
4. Delegate bounded, independent work to relevant architect, designer, developer, and reviewer subagents when native delegation is available and parallel work materially helps. Keep trivial work local. If delegation is needed but unavailable, state that and propose separate Codex tasks/worktrees; do not pretend delegation happened.
5. Require each task to state scope, allowed files, acceptance criteria, and verification commands.
6. Keep one owner per file at a time; avoid concurrent edits to shared files.
7. Integrate completed changes, run checks, and obtain reviewer feedback before reporting completion.
8. Maintain docs/AGENT_STATUS.md with decisions, owners, blockers, tests, and next steps.
9. Do not deploy, spend money, alter production data, or expose secrets without explicit approval.

## Agent model and cost discipline
- Prefer Sol or a lighter available model (for example, gpt-6.1-sol or gpt-6-luna) for bounded subagent tasks, according to their complexity and available models. Use a stronger model only when the task genuinely warrants it, and respect any explicit user model preference.
- Give each subagent focused context, exact file ownership and acceptance checks. Use parallel agents for genuinely independent work; avoid duplicate agents and unnecessary handoffs. If a chosen model is unavailable or fails, use an available fallback and report material limitations.
- Run focused checks during implementation, then run the required full gates once at an integration checkpoint. Repeat or broaden checks only when a change, failure or unresolved concern warrants it. Preserve independent review and all quality and safety requirements; do not infer actual credit usage or pricing without evidence.

## Specialist roles
- Architect: read agents/architect.md; primarily produce design and interfaces.
- Designer: read agents/designer.md; owns MVP interaction/visual design, prototypes and design handoff.
- Developer: read agents/developer.md; implement approved scoped tasks.
- Reviewer: read agents/reviewer.md; independently inspect and test changes.

Never treat an AGENTS.md file as proof that autonomous delegation is enabled.
