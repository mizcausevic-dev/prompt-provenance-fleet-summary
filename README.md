# prompt-provenance-fleet-summary

[![CI](https://github.com/mizcausevic-dev/prompt-provenance-fleet-summary/actions/workflows/ci.yml/badge.svg)](https://github.com/mizcausevic-dev/prompt-provenance-fleet-summary/actions/workflows/ci.yml)
[![License: AGPL-3.0-or-later](https://img.shields.io/badge/License-AGPL--3.0--or--later-blue.svg)](LICENSE)

Fleet-analyze a directory of [prompt-provenance](https://github.com/mizcausevic-dev/prompt-provenance-spec) documents. Counts by approval state, surfaces the governance gaps that hurt an audit — approved prompts with no evaluations or reviewers, failing evals on approved prompts, deprecated prompts that still pass tests (so consumers haven't migrated), and single-reviewer approvals.

Sibling of [`agent-card-fleet-summary`](https://github.com/mizcausevic-dev/agent-card-fleet-summary) for the prompts side. Part of the [Kinetic Gain Suite](https://suite.kineticgain.com/).

---

## What it flags

| Code | Severity | Rule |
|---|---|---|
| `approved-without-evaluations` | 🔴 | `approval.state=approved` but `evaluations[]` is empty. |
| `approved-without-reviewer` | 🔴 | Approved prompt with no entries in `authorship.reviewed_by`. |
| `evaluation-failing-on-approved` | 🔴 | Approved prompt has at least one `evaluations[].passed = false`. |
| `missing-out-of-scope-on-approved` | 🟠 | Approved prompt declares no `intent.out_of_scope` items — guardrail surface is undefined. |
| `approved-without-policy` | 🟠 | Approved prompt has no `approval.policy_uri`. |
| `single-reviewer` | 🟠 | Approved prompt has only one reviewer in `authorship.reviewed_by`. |
| `deprecated-still-referenced` | 🟠 | Deprecated prompt still has passing evals — confirm consumers have migrated. |
| `weak-eval-coverage` | 🟡 | Approved prompt has only 1 evaluation suite (recommend ≥ 2 independent suites). |
| `missing-models-supported` | 🟡 | Approved prompt declares no `intent.models_supported`. |
| `missing-content-uri` | ℹ️ | `prompt.content_uri` is not set — content is unreachable from the doc. |

## CLI

```
npx prompt-provenance-fleet-summary <prompts-dir>
    [--format json|markdown|summary]
    [--now <iso>]
    [--fail-on-high]
    [--out FILE]
```

Exit codes:

- `0` — no high findings (or `--fail-on-high` not set)
- `1` — high finding AND `--fail-on-high` set
- `2` — usage / I/O error

## Library

```ts
import { summarize, toMarkdown } from "prompt-provenance-fleet-summary";

const report = summarize(docs);
console.log(report.byState);   // { draft, proposed, approved, deprecated, revoked }
console.log(report.findings);
console.log(toMarkdown(report));
```

## Composes with

- [**`prompt-provenance-spec`**](https://github.com/mizcausevic-dev/prompt-provenance-spec) — the schema this reads.
- [**`prompt-provenance-diff`**](https://github.com/mizcausevic-dev/prompt-provenance-diff) — diff two versions of a single prompt's provenance.
- [**`prompt-provenance-stamp`**](https://github.com/mizcausevic-dev/prompt-provenance-stamp) — generate a fresh provenance doc from raw prompt content.
- [**`prompt-provenance-readme-generator`**](https://github.com/mizcausevic-dev/prompt-provenance-readme-generator) — emit a Markdown README from a single provenance doc.
- [**`agent-card-fleet-summary`**](https://github.com/mizcausevic-dev/agent-card-fleet-summary) — sibling for the A2A AgentCard side.

## License

[AGPL-3.0-or-later](LICENSE)
