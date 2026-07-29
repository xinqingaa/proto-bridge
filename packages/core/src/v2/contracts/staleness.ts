import { z } from 'zod';
import { BundleId, CaseEvidenceRevisionId, CaseId, ScopeKey, SnapshotId, StalenessReportId, WorkspaceId } from './ids.js';
import { V2_SCHEMA_MAJOR } from './version.js';

/**
 * One immutable, Snapshot-bound freshness check (pb-v2-spec.md "Coverage、
 * Issue 与 stale"). It never gets rewritten and never writes back into the
 * Snapshot, Run or Evidence revision it evaluated.
 */
export const StalenessReport = z
  .object({
    schemaVersion: z.literal(V2_SCHEMA_MAJOR),
    reportId: StalenessReportId,
    workspaceId: WorkspaceId,
    bundleId: BundleId,
    snapshotId: SnapshotId,
    checkedAt: z.string().datetime(),
    inputVersion: z.string().min(1),
    perRevision: z.array(
      z
        .object({
          revisionId: CaseEvidenceRevisionId,
          caseId: CaseId,
          scopeKey: ScopeKey,
          stale: z.boolean(),
          reason: z.string().optional(),
        })
        .strict()
        .superRefine((entry, ctx) => {
          if (entry.stale && entry.reason === undefined) {
            ctx.addIssue({ code: z.ZodIssueCode.custom, message: 'a stale entry must carry a reason', path: ['reason'] });
          }
        }),
    ),
  })
  .strict();
export type StalenessReport = z.infer<typeof StalenessReport>;

export function findStaleness(
  report: Pick<StalenessReport, 'perRevision'>,
  revisionId: CaseEvidenceRevisionId,
): boolean | undefined {
  return report.perRevision.find((entry) => entry.revisionId === revisionId)?.stale;
}
