import { z } from 'zod';
import { BundleId, CaseEvidenceRevisionId, CaseId, ScopeKey, WorkspaceId } from './ids.js';
import { NormalizedCaptureScope, computeScopeKey } from './scope.js';
import { EvidenceLevel, FactSource } from './vocabulary.js';
import { V2_SCHEMA_MAJOR } from './version.js';

export const DependencyDigest = z
  .object({
    dependencyId: z.string().min(1),
    digest: z.string().min(1),
  })
  .strict();
export type DependencyDigest = z.infer<typeof DependencyDigest>;

export const Provenance = z
  .object({
    source: FactSource,
    /** Free-form locator into the source (registry key, pbId, DOM path for debug only, screenshot region, ...). */
    locator: z.string().min(1),
    confidence: z.enum(['high', 'medium', 'low']).optional(),
  })
  .strict();
export type Provenance = z.infer<typeof Provenance>;

export const Candidate = z
  .object({
    value: z.unknown(),
    provenance: Provenance,
  })
  .strict();
export type Candidate = z.infer<typeof Candidate>;

export const FACT_RESOLUTIONS = ['resolved', 'unresolved-conflict', 'unknown'] as const;
export const FactResolution = z.enum(FACT_RESOLUTIONS);
export type FactResolution = z.infer<typeof FactResolution>;

/**
 * Every Agent-facing fact must carry a stable identity, one or more
 * candidates with provenance, and either an effective value, an
 * unresolved conflict, or an explicit unknown (pb-v2-spec.md "事实、来源与冲突").
 * Candidates are never overwritten by write order; conflicts keep every
 * candidate.
 */
export const Fact = z
  .object({
    factId: z.string().min(1),
    candidates: z.array(Candidate).min(1),
    resolution: FactResolution,
    effectiveValue: z.unknown().optional(),
    issueRef: z.string().optional(),
  })
  .strict()
  .superRefine((fact, ctx) => {
    if (fact.resolution === 'resolved' && fact.effectiveValue === undefined) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: 'resolved facts must carry an effectiveValue',
        path: ['effectiveValue'],
      });
    }
    if (fact.resolution !== 'resolved' && fact.effectiveValue !== undefined) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: 'only resolved facts may carry an effectiveValue',
        path: ['effectiveValue'],
      });
    }
    if (fact.resolution === 'unresolved-conflict' && fact.candidates.length < 2) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: 'unresolved-conflict requires at least two candidates',
        path: ['candidates'],
      });
    }
  });
export type Fact = z.infer<typeof Fact>;

/** Pointer used by Snapshot/Handoff to reference a revision without embedding its content. */
export const EvidenceRef = z
  .object({
    workspaceId: WorkspaceId,
    bundleId: BundleId,
    caseId: CaseId,
    caseEvidenceRevisionId: CaseEvidenceRevisionId,
  })
  .strict();
export type EvidenceRef = z.infer<typeof EvidenceRef>;

/**
 * Header of an immutable Case Evidence Revision. Body facts are included
 * because Phase 1 fixtures need to exercise conflict/unknown/provenance
 * rules, but Store persistence of large bodies is a Phase 2 concern.
 */
export const CaseEvidenceRevision = z
  .object({
    schemaVersion: z.literal(V2_SCHEMA_MAJOR),
    revisionId: CaseEvidenceRevisionId,
    workspaceId: WorkspaceId,
    bundleId: BundleId,
    caseId: CaseId,
    captureScope: NormalizedCaptureScope,
    scopeKey: ScopeKey,
    evidenceLevel: EvidenceLevel,
    /** Opaque digest over the inputs (Registry/Source/Runtime state) used to produce this revision; used by Staleness checks. */
    inputDigest: z.string().min(1),
    /** The actual dependency closure used for incremental reuse and per-Case stale evaluation. */
    dependencyDigests: z.array(DependencyDigest).optional(),
    capturedAt: z.string().datetime(),
    facts: z.array(Fact).default([]),
    requiredFactsTotal: z.number().int().min(0),
    requiredFactsResolved: z.number().int().min(0),
  })
  .strict()
  .superRefine((revision, ctx) => {
    if (revision.requiredFactsResolved > revision.requiredFactsTotal) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: 'requiredFactsResolved cannot exceed requiredFactsTotal',
        path: ['requiredFactsResolved'],
      });
    }
    const expectedScopeKey = computeScopeKey(revision.captureScope);
    if (revision.scopeKey !== expectedScopeKey) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: `scopeKey does not match computeScopeKey(captureScope): expected ${expectedScopeKey}`,
        path: ['scopeKey'],
      });
    }
    const dependencyIds = new Set<string>();
    revision.dependencyDigests?.forEach((dependency, index) => {
      if (dependencyIds.has(dependency.dependencyId)) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: `duplicate dependency identity ${dependency.dependencyId}`,
          path: ['dependencyDigests', index, 'dependencyId'],
        });
      }
      dependencyIds.add(dependency.dependencyId);
    });
  });
export type CaseEvidenceRevision = z.infer<typeof CaseEvidenceRevision>;

/** Simplified provenance-quality score used by the conservative Phase 1/2 dominance comparison. */
export function evidenceQualityScore(revision: Pick<CaseEvidenceRevision, 'requiredFactsTotal' | 'requiredFactsResolved'>): number {
  if (revision.requiredFactsTotal === 0) return 1;
  return revision.requiredFactsResolved / revision.requiredFactsTotal;
}
