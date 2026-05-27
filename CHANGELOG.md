# Changelog

## v0.1.0 — 2026-05-26

- Initial release: `summarize(docs, now?)` → `FleetReport` with state counts + per-doc rows + finding list.
- 10 finding codes spanning approval-state hygiene (`approved-without-evaluations`, `approved-without-reviewer`, `evaluation-failing-on-approved`), guardrail completeness (`missing-out-of-scope-on-approved`, `missing-models-supported`), and lifecycle (`deprecated-still-referenced`).
- 3 severity tiers in line with the suite's other fleet tools: 🔴 high blocks ship, 🟠 medium recommends a re-review, 🟡 low + ℹ️ info are informational.
- Formatters: `toMarkdown(report)` and `toSummary(report)`.
- CLI: `prompt-provenance-fleet-summary <prompts-dir>` with `--format json|markdown|summary`, `--now <iso>`, `--fail-on-high`, `--out FILE`.
- 6-document fixture corpus spanning every approval state + every finding code (clean approved, draft root, approved-no-evals risky, single-reviewer, deprecated-still-passing, failing-on-approved).
- Sibling of `agent-card-fleet-summary` for the A2A AgentCard side.
- Node 20/22 CI (lint, typecheck, coverage, build, demo, `npm audit`), AGPL-3.0-or-later, Dependabot.
