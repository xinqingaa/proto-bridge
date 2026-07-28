import { z } from 'zod';
import { EVIDENCE_LEVELS, EvidenceLevel } from './vocabulary.js';

/**
 * Shared shape for Run Coverage and Snapshot Coverage (pb-v2-spec.md
 * "Coverage、Issue 与 stale"). The two are kept as separate documents
 * (a Run describes one execution, a Snapshot describes the Bundle's
 * current projection) even though the counters look the same.
 */
export const CoverageCounts = z
  .object({
    selected: z.number().int().min(0),
    captured: z.number().int().min(0),
    reused: z.number().int().min(0),
    failed: z.number().int().min(0),
    skipped: z.number().int().min(0),
    unsupported: z.number().int().min(0),
    cancelled: z.number().int().min(0),
    interrupted: z.number().int().min(0),
    missing: z.number().int().min(0),
    stale: z.number().int().min(0),
  })
  .strict();
export type CoverageCounts = z.infer<typeof CoverageCounts>;

export const EvidenceLevelBreakdown = z.record(EvidenceLevel, z.number().int().min(0)).default(
  Object.fromEntries(EVIDENCE_LEVELS.map((level) => [level, 0])) as Record<EvidenceLevel, number>,
);

export const FactQualityBreakdown = z
  .object({
    traceable: z.number().int().min(0),
    heuristic: z.number().int().min(0),
    unknown: z.number().int().min(0),
    conflict: z.number().int().min(0),
  })
  .strict();
export type FactQualityBreakdown = z.infer<typeof FactQualityBreakdown>;

/**
 * Denominator is the explicit Selection/Snapshot scope. A zero denominator
 * must be reported as `not-computable`, never masqueraded as 100%.
 */
export const CoverageSummary = z
  .object({
    counts: CoverageCounts,
    evidenceLevelBreakdown: EvidenceLevelBreakdown,
    factQuality: FactQualityBreakdown,
    denominator: z.union([z.number().int().min(1), z.literal('not-computable')]),
  })
  .strict()
  .superRefine((summary, ctx) => {
    if (summary.denominator === 'not-computable' && summary.counts.selected !== 0) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "denominator can only be 'not-computable' when selected is 0",
        path: ['denominator'],
      });
    }
    if (typeof summary.denominator === 'number' && summary.denominator !== summary.counts.selected) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: 'numeric denominator must equal counts.selected',
        path: ['denominator'],
      });
    }
  });
export type CoverageSummary = z.infer<typeof CoverageSummary>;
