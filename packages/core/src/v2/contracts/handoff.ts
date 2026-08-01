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
import { computeScopeKey, NormalizedCaptureScope } from './scope.js';
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

const HandoffCaseBase = {
  caseId: CaseId,
  captureScope: NormalizedCaptureScope,
  scopeKey: ScopeKey,
};

function validateHandoffCaseScope(
  ref: { captureScope: z.infer<typeof NormalizedCaptureScope>; scopeKey: z.infer<typeof ScopeKey> },
  ctx: z.RefinementCtx,
): void {
  const expectedScopeKey = computeScopeKey(ref.captureScope);
  if (ref.scopeKey !== expectedScopeKey) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      message: `scopeKey does not match computeScopeKey(captureScope): expected ${expectedScopeKey}`,
      path: ['scopeKey'],
    });
  }
}

/** An available active Evidence revision plus the Snapshot-fixed relevant Attempt. */
export const ResolvedCaseRef = z
  .object({
    ...HandoffCaseBase,
    resolution: z.literal('resolved'),
    revisionId: CaseEvidenceRevisionId,
    relevantAttemptId: AttemptId,
  })
  .strict()
  .superRefine(validateHandoffCaseScope);
export type ResolvedCaseRef = z.infer<typeof ResolvedCaseRef>;

/** A selected Case/Scope with no matching active revision; a failed Attempt may still explain the missing Evidence. */
export const MissingCaseRef = z
  .object({
    ...HandoffCaseBase,
    resolution: z.literal('missing'),
    relevantAttemptId: AttemptId.optional(),
  })
  .strict()
  .superRefine(validateHandoffCaseScope);
export type MissingCaseRef = z.infer<typeof MissingCaseRef>;

export const HandoffCaseRef = z.union([ResolvedCaseRef, MissingCaseRef]);
export type HandoffCaseRef = z.infer<typeof HandoffCaseRef>;

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
    selectedCases: z.array(HandoffCaseRef).min(1),
    coverageStatus: CoverageStatus,
    interactionCoverage: z
      .object({
        required: z.number().int().nonnegative(),
        captured: z.number().int().nonnegative(),
        missingScenarioIds: z.array(z.string()).default([]),
      })
      .strict()
      .optional(),
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
    if (!handoff.selectedCases.some((selectedCase) => selectedCase.resolution === 'resolved')) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: 'a Handoff must contain at least one selected Case with available Evidence',
        path: ['selectedCases'],
      });
    }
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
