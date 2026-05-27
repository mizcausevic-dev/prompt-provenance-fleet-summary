import { readFileSync, readdirSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";

import { summarize } from "../src/summarize.js";
import { toMarkdown, toSummary } from "../src/format.js";
import type { ProvenanceDoc } from "../src/types.js";

const here = fileURLToPath(new URL(".", import.meta.url));
const NOW = "2026-05-26T20:00:00Z";

function loadFleet(): ProvenanceDoc[] {
  const dir = `${here}/../fixtures/prompts`;
  const out: ProvenanceDoc[] = [];
  for (const entry of readdirSync(dir)) {
    if (!entry.endsWith(".json")) continue;
    out.push(JSON.parse(readFileSync(`${dir}/${entry}`, "utf8")) as ProvenanceDoc);
  }
  return out;
}

describe("summarize", () => {
  it("counts the full fixture fleet", () => {
    const r = summarize(loadFleet(), NOW);
    expect(r.prompts).toBe(6);
    expect(r.byState.draft).toBe(1);
    expect(r.byState.approved).toBe(4);
    expect(r.byState.deprecated).toBe(1);
    expect(r.byState.revoked).toBe(0);
    expect(r.rootPrompts).toBe(5); // only incident-summary has a parent
    expect(r.generatedAt).toBe(NOW);
  });

  it("tallies reviewers and evaluations across fleet", () => {
    const r = summarize(loadFleet(), NOW);
    expect(r.totalReviewers).toBe(2 + 1 + 1 + 2); // incident=2 + single=1 + deprecated=1 + failing=2
    expect(r.totalEvaluations).toBe(2 + 1 + 1 + 2);
    expect(r.totalPassingEvaluations).toBe(2 + 1 + 1 + 1); // failing-approved has 1 failing
  });

  it("flags approved-without-evaluations (high) for risky-approved-no-evals", () => {
    const r = summarize(loadFleet(), NOW);
    const codes = r.findings.filter((f) => f.subject.startsWith("vendor-risk-scorer")).map((f) => f.code);
    expect(codes).toContain("approved-without-evaluations");
    expect(codes).toContain("approved-without-reviewer");
    expect(codes).toContain("approved-without-policy");
    expect(codes).toContain("missing-out-of-scope-on-approved");
    expect(codes).toContain("missing-models-supported");
  });

  it("flags evaluation-failing-on-approved (high) for failing-approved", () => {
    const r = summarize(loadFleet(), NOW);
    const codes = r.findings.filter((f) => f.subject.startsWith("tone-rewriter")).map((f) => f.code);
    expect(codes).toContain("evaluation-failing-on-approved");
  });

  it("flags single-reviewer (medium) and weak-eval-coverage (low) for release-notes-drafter", () => {
    const r = summarize(loadFleet(), NOW);
    const codes = r.findings.filter((f) => f.subject.startsWith("release-notes-drafter")).map((f) => f.code);
    expect(codes).toContain("single-reviewer");
    expect(codes).toContain("weak-eval-coverage");
    expect(codes).toContain("missing-out-of-scope-on-approved");
  });

  it("flags deprecated-still-referenced for old-summarizer", () => {
    const r = summarize(loadFleet(), NOW);
    const codes = r.findings.filter((f) => f.subject.startsWith("old-summarizer")).map((f) => f.code);
    expect(codes).toContain("deprecated-still-referenced");
  });

  it("does not flag the clean incident-summary-generator approved prompt", () => {
    const r = summarize(loadFleet(), NOW);
    const codes = r.findings.filter((f) => f.subject.startsWith("incident-summary-generator")).map((f) => f.code);
    expect(codes).not.toContain("approved-without-evaluations");
    expect(codes).not.toContain("approved-without-reviewer");
    expect(codes).not.toContain("evaluation-failing-on-approved");
    expect(codes).not.toContain("single-reviewer");
    expect(codes).not.toContain("missing-out-of-scope-on-approved");
  });

  it("flags missing-content-uri (info) on the draft", () => {
    const r = summarize(loadFleet(), NOW);
    const codes = r.findings.filter((f) => f.subject.startsWith("experimental-rephraser")).map((f) => f.code);
    expect(codes).toContain("missing-content-uri");
  });

  it("ok=false when any high finding is present", () => {
    const r = summarize(loadFleet(), NOW);
    expect(r.ok).toBe(false);
    expect(r.findings.some((f) => f.severity === "high")).toBe(true);
  });

  it("ok=true when fleet has no high findings", () => {
    const onlyClean = loadFleet().filter((d) => d.prompt.id === "incident-summary-generator");
    const r = summarize(onlyClean, NOW);
    expect(r.ok).toBe(true);
  });

  it("ignores docs missing required blocks instead of throwing", () => {
    const bad = [{} as ProvenanceDoc, { prompt: { id: "a", version: "1", hash: "sha256:0" } } as ProvenanceDoc];
    const r = summarize(bad, NOW);
    expect(r.prompts).toBe(0);
  });

  it("rows are sorted by id", () => {
    const r = summarize(loadFleet(), NOW);
    const ids = r.rows.map((row) => row.id);
    expect([...ids].sort()).toEqual(ids);
  });

  it("uses provided 'now' over Date.now()", () => {
    const r = summarize(loadFleet(), "2030-01-01T00:00:00Z");
    expect(r.generatedAt).toBe("2030-01-01T00:00:00Z");
  });

  it("toMarkdown returns the failure banner when ok=false", () => {
    const r = summarize(loadFleet(), NOW);
    const md = toMarkdown(r);
    expect(md).toContain("# Prompt Provenance fleet summary ❌");
    expect(md).toContain("## Fleet");
    expect(md).toContain("## Per prompt");
    expect(md).toContain("## Findings");
    expect(md).toContain("`vendor-risk-scorer@0.2.0`");
  });

  it("toMarkdown returns the success banner + 'No findings' when clean", () => {
    const cleanCard: ProvenanceDoc = {
      provenance_version: "0.1",
      prompt: { id: "clean", version: "1.0.0", hash: "sha256:abc" },
      authorship: { created_by: "x", created_at: "2026-01-01T00:00:00Z" },
      approval: { state: "draft" }
    };
    cleanCard.prompt.content_uri = "https://example.com/x";
    const r = summarize([cleanCard], NOW);
    const md = toMarkdown(r);
    expect(md).toContain("# Prompt Provenance fleet summary ✅");
    expect(md).toContain("No findings.");
  });

  it("toSummary line-formats fleet counts", () => {
    const r = summarize(loadFleet(), NOW);
    const s = toSummary(r);
    expect(s).toContain("6 prompts");
    expect(s).toContain("4 approved");
    expect(s).toContain("1 deprecated");
    expect(s).toContain("0 revoked");
    expect(s).toContain("(fail)");
  });

  it("toSummary handles singular and ok-state", () => {
    const cleanCard: ProvenanceDoc = {
      provenance_version: "0.1",
      prompt: { id: "clean", version: "1.0.0", hash: "sha256:abc", content_uri: "https://x/" },
      authorship: { created_by: "x", created_at: "2026-01-01T00:00:00Z" },
      approval: { state: "draft" }
    };
    expect(toSummary(summarize([cleanCard], NOW))).toContain("1 prompt ·");
    expect(toSummary(summarize([cleanCard], NOW))).toContain("(ok)");
  });
});
