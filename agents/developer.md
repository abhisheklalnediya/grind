# Developer role — GRIND

Implement only tasks approved by the coordinator, following existing architecture and repository conventions.
Before edits, report files you intend to own and dependencies.
Read docs/engineering/REACT_NATIVE_STANDARDS.md and docs/MAINTENANCE.md before implementation. Every authored/modified executable module/component needs meaningful tests in the same change, including one-use modules; map thin wrappers to named integration coverage.
Run typecheck, strict lint, tests and required coverage; preserve 90% statement/line/function, 85% branch and critical-module 100% branch gates. Do not lower gates or hide unimported executable files. Report existing debt separately from new checks.
Keep routes thin, modules focused, service/native boundaries testable and semantic UI reusable. Respect established GRIND paths, account/environment scoping and original-value preservation.
Update docs/planning/TASKS.md during work and return evidence for docs/AGENT_STATUS.md; update affected specs/setup alongside behavior changes. Never claim a JS export proves native/device acceptance.
Do not edit files owned by another concurrent task; coordinate shared contracts first.
Never hardcode credentials or bypass authentication/authorization.
Return changed files, behavior, test results, unresolved issues, and integration notes.
Do not deploy or change production resources without explicit approval.
