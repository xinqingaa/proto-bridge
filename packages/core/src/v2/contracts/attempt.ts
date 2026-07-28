import { z } from 'zod';
import { AttemptId, CaseEvidenceRevisionId, CaseId, RunId, ScopeKey } from './ids.js';
import { NormalizedCaptureScope } from './scope.js';
import { AttemptResult } from './vocabulary.js';
import { V2_SCHEMA_MAJOR } from './version.js';

const RESULTS_REQUIRING_REVISION = new Set<AttemptResult>(['captured', 'reused']);
const RESULTS_REQUIRING_REASON = new Set<AttemptResult>(['failed', 'skipped', 'unsupported']);

/**
 * Result of one Run's execution against one Case + Capture Scope
 * (pb-v2-spec.md "Run、Attempt、Revision 与 Snapshot"). `captured` produces
 * a new revision; `reused` fixes a reference to an existing one; every
 * other result must never carry a revision id.
 */
export const CaseAttempt = z
  .object({
    schemaVersion: z.literal(V2_SCHEMA_MAJOR),
    attemptId: AttemptId,
    runId: RunId,
    caseId: CaseId,
    captureScope: NormalizedCaptureScope,
    scopeKey: ScopeKey,
    result: AttemptResult,
    revisionId: CaseEvidenceRevisionId.optional(),
    reason: z.string().min(1).optional(),
    startedAt: z.string().datetime(),
    endedAt: z.string().datetime(),
  })
  .strict()
  .superRefine((attempt, ctx) => {
    const needsRevision = RESULTS_REQUIRING_REVISION.has(attempt.result);
    if (needsRevision && attempt.revisionId === undefined) {
      ctx.addIssue({ code: z.ZodIssueCode.custom, message: `${attempt.result} attempts must carry revisionId`, path: ['revisionId'] });
    }
    if (!needsRevision && attempt.revisionId !== undefined) {
      ctx.addIssue({ code: z.ZodIssueCode.custom, message: `${attempt.result} attempts must not carry revisionId`, path: ['revisionId'] });
    }
    if (RESULTS_REQUIRING_REASON.has(attempt.result) && attempt.reason === undefined) {
      ctx.addIssue({ code: z.ZodIssueCode.custom, message: `${attempt.result} attempts must carry a reason`, path: ['reason'] });
    }
  });
export type CaseAttempt = z.infer<typeof CaseAttempt>;
