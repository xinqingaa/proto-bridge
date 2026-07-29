import { z } from 'zod';
import { CaseId, IssueId } from './ids.js';
import { IssueSeverity } from './vocabulary.js';
import { V2_SCHEMA_MAJOR } from './version.js';

/**
 * pb-v2-spec.md "Coverage、Issue 与 stale": every Issue must carry severity,
 * scope, reason, refs and a next action; warning acceptance can only accept
 * a known Issue, never turn a blocked Contract error into something
 * executable.
 */
export const Issue = z
  .object({
    schemaVersion: z.literal(V2_SCHEMA_MAJOR),
    issueId: IssueId,
    severity: IssueSeverity,
    reason: z.string().min(1),
    affectedCaseIds: z.array(CaseId).default([]),
    evidenceRefs: z.array(z.string()).default([]),
    nextAction: z.string().min(1),
  })
  .strict();
export type Issue = z.infer<typeof Issue>;
