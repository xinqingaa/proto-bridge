import { z } from 'zod';
import {
  AttemptId,
  BundleId,
  CaseEvidenceRevisionId,
  CaseId,
  HandoffId,
  ScopeKey,
  SnapshotId,
  StalenessReportId,
  WorkspaceId,
} from './ids.js';
import { CoverageStatus, FreshnessStatus, RiskKind } from './vocabulary.js';
import { V2_SCHEMA_MAJOR } from './version.js';

export const Risk = z
  .object({
    kind: RiskKind,
    message: z.string().min(1),
    refs: z.array(z.string()).default([]),
  })
  .strict();
export type Risk = z.infer<typeof Risk>;

/**
 * A Handoff must fix a concrete revision (and its relevant Attempt) for
 * every selected Case + Capture Scope; it can never resolve to "latest" at
 * consumption time (pb-v2-spec.md "Agent Handoff 与消费").
 */
export const ResolvedCaseRef = z
  .object({
    caseId: CaseId,
    scopeKey: ScopeKey,
    revisionId: CaseEvidenceRevisionId,
    relevantAttemptId: AttemptId,
  })
  .strict();
export type ResolvedCaseRef = z.infer<typeof ResolvedCaseRef>;

export const RiskAcknowledgement = z
  .object({
    acknowledgedAt: z.string().datetime(),
    acknowledgedRiskKinds: z.array(RiskKind).min(1),
  })
  .strict();
export type RiskAcknowledgement = z.infer<typeof RiskAcknowledgement>;

/**
 * Handoff is a task index, not an Evidence copy: it fixes Workspace,
 * Bundle, Snapshot and every referenced revision, and exposes coverage,
 * freshness and risk as three orthogonal fields (pb-v2-spec.md "Agent
 * Handoff 与消费"). It must never carry Store/Source/target paths, full
 * Evidence text, Debug Blobs or an implementation plan; the strict object
 * shape enforces that no such field can be attached.
 */
export const AgentHandoff = z
  .object({
    schemaVersion: z.literal(V2_SCHEMA_MAJOR),
    handoffId: HandoffId,
    workspaceId: WorkspaceId,
    bundleId: BundleId,
    snapshotId: SnapshotId,
    createdAt: z.string().datetime(),
    implementationIntent: z.string().optional(),
    selectedCases: z.array(ResolvedCaseRef).min(1),
    coverageStatus: CoverageStatus,
    freshnessStatus: FreshnessStatus,
    stalenessReportId: StalenessReportId,
    risks: z.array(Risk).default([]),
    riskAcknowledgement: RiskAcknowledgement.optional(),
    resourceRefs: z
      .array(z.object({ kind: z.string().min(1), ref: z.string().min(1) }).strict())
      .default([]),
  })
  .strict()
  .superRefine((handoff, ctx) => {
    const hasRisks = handoff.risks.length > 0;
    if (hasRisks && handoff.riskAcknowledgement === undefined) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: 'partial/stale/policy-required risks must be explicitly acknowledged before a Handoff can be created',
        path: ['riskAcknowledgement'],
      });
      return;
    }
    if (!hasRisks) return;
    const acknowledged = new Set(handoff.riskAcknowledgement?.acknowledgedRiskKinds ?? []);
    const missing = handoff.risks.map((risk) => risk.kind).filter((kind) => !acknowledged.has(kind));
    if (missing.length > 0) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: `unacknowledged risk kinds: ${[...new Set(missing)].join(', ')}`,
        path: ['riskAcknowledgement', 'acknowledgedRiskKinds'],
      });
    }
  });
export type AgentHandoff = z.infer<typeof AgentHandoff>;
