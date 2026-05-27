// Fleet-analyze a directory of prompt-provenance documents.
// Subset of prompt-provenance-spec v0.1 used for analysis.

export type ApprovalState = "draft" | "proposed" | "approved" | "deprecated" | "revoked";

export interface ProvenanceDoc {
  provenance_version: string;
  prompt: {
    id: string;
    name?: string;
    version: string;
    hash: string;
    content_uri?: string;
    content_type?: string;
  };
  lineage?: { parent?: string; derivation?: string };
  authorship: {
    created_by: string;
    reviewed_by?: string[];
    approved_by?: string;
    created_at: string;
    approved_at?: string;
  };
  intent?: { purpose?: string; in_scope?: string[]; out_of_scope?: string[]; models_supported?: string[] };
  evaluations?: Array<{ suite: string; result_uri?: string; passed?: boolean; score?: number; ran_at?: string }>;
  approval: { state: ApprovalState; policy_uri?: string };
}

export type FindingSeverity = "high" | "medium" | "low" | "info";

export type FindingCode =
  | "approved-without-evaluations"
  | "approved-without-reviewer"
  | "evaluation-failing-on-approved"
  | "missing-out-of-scope-on-approved"
  | "single-reviewer"
  | "deprecated-still-referenced"
  | "weak-eval-coverage"
  | "approved-without-policy"
  | "missing-content-uri"
  | "missing-models-supported";

export interface Finding {
  code: FindingCode;
  severity: FindingSeverity;
  message: string;
  subject: string;
  subjectName?: string;
}

export interface FleetSummaryRow {
  /** "<prompt.id>@<prompt.version>" */
  id: string;
  promptId: string;
  version: string;
  name?: string;
  state: ApprovalState;
  isRoot: boolean;
  reviewers: number;
  evaluations: number;
  passingEvaluations: number;
  hasContentUri: boolean;
  hasApprover: boolean;
}

export interface FleetReport {
  generatedAt: string;
  prompts: number;
  byState: Record<ApprovalState, number>;
  rootPrompts: number;
  totalReviewers: number;
  totalEvaluations: number;
  totalPassingEvaluations: number;
  rows: FleetSummaryRow[];
  findings: Finding[];
  ok: boolean;
}
