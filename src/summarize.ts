import type {
  ApprovalState,
  Finding,
  FleetReport,
  FleetSummaryRow,
  ProvenanceDoc
} from "./types.js";

const STATES: ApprovalState[] = ["draft", "proposed", "approved", "deprecated", "revoked"];

function emptyStateCounts(): Record<ApprovalState, number> {
  return { draft: 0, proposed: 0, approved: 0, deprecated: 0, revoked: 0 };
}

export function summarize(docs: ProvenanceDoc[], now?: string): FleetReport {
  const generatedAt = now ?? new Date().toISOString();
  const rows: FleetSummaryRow[] = [];
  const findings: Finding[] = [];
  const byState = emptyStateCounts();
  let rootPrompts = 0;
  let totalReviewers = 0;
  let totalEvaluations = 0;
  let totalPassing = 0;

  for (const d of docs) {
    if (!d.prompt || !d.approval || !d.authorship) continue;
    const id = `${d.prompt.id}@${d.prompt.version}`;
    const reviewers = d.authorship.reviewed_by?.length ?? 0;
    const evals = d.evaluations ?? [];
    const passing = evals.filter((e) => e.passed === true).length;
    const failing = evals.filter((e) => e.passed === false).length;
    const isRoot = !d.lineage?.parent;
    const hasApprover = !!d.authorship.approved_by;
    const hasContentUri = !!d.prompt.content_uri;

    if (STATES.includes(d.approval.state)) byState[d.approval.state] += 1;
    if (isRoot) rootPrompts += 1;
    totalReviewers += reviewers;
    totalEvaluations += evals.length;
    totalPassing += passing;

    rows.push({
      id,
      promptId: d.prompt.id,
      version: d.prompt.version,
      name: d.prompt.name,
      state: d.approval.state,
      isRoot,
      reviewers,
      evaluations: evals.length,
      passingEvaluations: passing,
      hasContentUri,
      hasApprover
    });

    // ─── findings ──
    if (d.approval.state === "approved") {
      if (evals.length === 0) {
        findings.push({
          code: "approved-without-evaluations",
          severity: "high",
          message: `Approved prompt has no evaluations recorded.`,
          subject: id,
          subjectName: d.prompt.name
        });
      }
      if (reviewers === 0) {
        findings.push({
          code: "approved-without-reviewer",
          severity: "high",
          message: `Approved prompt has no reviewers in authorship.reviewed_by.`,
          subject: id,
          subjectName: d.prompt.name
        });
      }
      if (failing > 0) {
        findings.push({
          code: "evaluation-failing-on-approved",
          severity: "high",
          message: `Approved prompt has ${failing} failing evaluation(s).`,
          subject: id,
          subjectName: d.prompt.name
        });
      }
      if (reviewers === 1) {
        findings.push({
          code: "single-reviewer",
          severity: "medium",
          message: `Approved prompt has only one reviewer.`,
          subject: id,
          subjectName: d.prompt.name
        });
      }
      if (evals.length > 0 && evals.length < 2) {
        findings.push({
          code: "weak-eval-coverage",
          severity: "low",
          message: `Approved prompt has only ${evals.length} evaluation suite — recommend ≥ 2 independent suites.`,
          subject: id,
          subjectName: d.prompt.name
        });
      }
      if (!d.approval.policy_uri) {
        findings.push({
          code: "approved-without-policy",
          severity: "medium",
          message: `Approved prompt has no approval.policy_uri.`,
          subject: id,
          subjectName: d.prompt.name
        });
      }
      if (!d.intent?.out_of_scope || d.intent.out_of_scope.length === 0) {
        findings.push({
          code: "missing-out-of-scope-on-approved",
          severity: "medium",
          message: `Approved prompt declares no intent.out_of_scope items.`,
          subject: id,
          subjectName: d.prompt.name
        });
      }
      if (!d.intent?.models_supported || d.intent.models_supported.length === 0) {
        findings.push({
          code: "missing-models-supported",
          severity: "low",
          message: `Approved prompt declares no intent.models_supported.`,
          subject: id,
          subjectName: d.prompt.name
        });
      }
    }
    if (d.approval.state === "deprecated" && d.evaluations?.some((e) => e.passed === true)) {
      findings.push({
        code: "deprecated-still-referenced",
        severity: "medium",
        message: `Deprecated prompt still passes evaluations — confirm consumers have migrated.`,
        subject: id,
        subjectName: d.prompt.name
      });
    }
    if (!hasContentUri) {
      findings.push({
        code: "missing-content-uri",
        severity: "info",
        message: `prompt.content_uri is not set.`,
        subject: id,
        subjectName: d.prompt.name
      });
    }
  }
  rows.sort((a, b) => a.id.localeCompare(b.id));

  const ok = !findings.some((f) => f.severity === "high");

  return {
    generatedAt,
    prompts: rows.length,
    byState,
    rootPrompts,
    totalReviewers,
    totalEvaluations,
    totalPassingEvaluations: totalPassing,
    rows,
    findings,
    ok
  };
}
