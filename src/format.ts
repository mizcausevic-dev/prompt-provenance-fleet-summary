import type { FindingSeverity, FleetReport } from "./types.js";

const SEVERITY_LABEL: Record<FindingSeverity, string> = {
  high: "🔴 high",
  medium: "🟠 medium",
  low: "🟡 low",
  info: "ℹ️  info"
};
const SEVERITY_RANK: Record<FindingSeverity, number> = { high: 0, medium: 1, low: 2, info: 3 };

export function toMarkdown(report: FleetReport): string {
  const lines: string[] = [];
  lines.push(report.ok ? `# Prompt Provenance fleet summary ✅` : `# Prompt Provenance fleet summary ❌`);
  lines.push(``);
  lines.push(`Generated: \`${report.generatedAt}\``);
  lines.push(``);
  lines.push(`## Fleet`);
  lines.push(``);
  lines.push(`- Prompts: **${report.prompts}** · Roots: ${report.rootPrompts} · Reviewers across fleet: ${report.totalReviewers}`);
  lines.push(`- Evaluations: **${report.totalEvaluations}** total · ${report.totalPassingEvaluations} passing`);
  lines.push(
    `- Approval state: draft=${report.byState.draft} · proposed=${report.byState.proposed} · approved=${report.byState.approved} · deprecated=${report.byState.deprecated} · revoked=${report.byState.revoked}`
  );
  lines.push(``);
  lines.push(`## Per prompt`);
  lines.push(``);
  lines.push(`| prompt | state | root? | reviewers | evals (pass) | approver | content URI |`);
  lines.push(`|---|---|:---:|---:|---:|:---:|:---:|`);
  for (const r of report.rows) {
    lines.push(
      `| \`${r.id}\` | ${r.state} | ${r.isRoot ? "✓" : "—"} | ${r.reviewers} | ${r.evaluations} (${r.passingEvaluations}) | ${r.hasApprover ? "✓" : "—"} | ${r.hasContentUri ? "✓" : "—"} |`
    );
  }

  const ranked = [...report.findings].sort(
    (a, b) => SEVERITY_RANK[a.severity] - SEVERITY_RANK[b.severity]
  );
  if (ranked.length > 0) {
    lines.push(``);
    lines.push(`## Findings (${ranked.length})`);
    lines.push(``);
    lines.push(`| severity | code | prompt | message |`);
    lines.push(`|---|---|---|---|`);
    for (const f of ranked) {
      lines.push(
        `| ${SEVERITY_LABEL[f.severity]} | \`${f.code}\` | ${f.subjectName ?? f.subject} | ${f.message} |`
      );
    }
  } else {
    lines.push(``);
    lines.push(`No findings.`);
  }
  return lines.join("\n");
}

export function toSummary(report: FleetReport): string {
  const counts: Record<FindingSeverity, number> = { high: 0, medium: 0, low: 0, info: 0 };
  for (const f of report.findings) counts[f.severity] += 1;
  return `${report.prompts} prompt${report.prompts === 1 ? "" : "s"} · ${report.byState.approved} approved · ${report.byState.deprecated} deprecated · ${report.byState.revoked} revoked · ${counts.high} high · ${counts.medium} medium (${report.ok ? "ok" : "fail"})`;
}
