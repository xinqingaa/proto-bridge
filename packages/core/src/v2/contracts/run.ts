import { z } from 'zod';
import { CaseAttempt } from './attempt.js';
import { CoverageSummary } from './coverage.js';
import { BundleId, CaseId, IssueId, PrototypeId, RunId, WorkspaceId } from './ids.js';
import { NormalizedCaptureScope } from './scope.js';
import { CaseKey } from './case.js';
import { RunTerminationReason } from './vocabulary.js';
import { V2_SCHEMA_MAJOR } from './version.js';

/** One selected Case plus the Capture Scope requested for it, as fixed inside a normalized Selection. */
export const SelectedCase = z
  .object({
    caseId: CaseId,
    caseKey: CaseKey,
    captureScope: NormalizedCaptureScope,
  })
  .strict();
export type SelectedCase = z.infer<typeof SelectedCase>;

/** Minimal normalized Selection: a Preflight-approved Case Matrix for one Prototype. */
export const NormalizedSelection = z
  .object({
    prototypeId: PrototypeId,
    cases: z.array(SelectedCase).min(1),
    acceptedWarningIds: z.array(IssueId).default([]),
  })
  .strict();
export type NormalizedSelection = z.infer<typeof NormalizedSelection>;

/**
 * A Run is one execution of a normalized Selection. It never represents
 * the Bundle's current state by itself (pb-v2-spec.md "核心对象与关系").
 */
export const Run = z
  .object({
    schemaVersion: z.literal(V2_SCHEMA_MAJOR),
    runId: RunId,
    workspaceId: WorkspaceId,
    bundleId: BundleId,
    selection: NormalizedSelection,
    inputVersion: z.string().min(1),
    startedAt: z.string().datetime(),
    endedAt: z.string().datetime(),
    terminationReason: RunTerminationReason,
    attempts: z.array(CaseAttempt),
    coverage: CoverageSummary,
  })
  .strict()
  .superRefine((run, ctx) => {
    const selectedIds = new Set(run.selection.cases.map((c) => c.caseId));
    run.attempts.forEach((attempt, index) => {
      if (attempt.runId !== run.runId) {
        ctx.addIssue({ code: z.ZodIssueCode.custom, message: `attempt[${index}].runId does not match Run.runId`, path: ['attempts', index, 'runId'] });
      }
      if (!selectedIds.has(attempt.caseId)) {
        ctx.addIssue({ code: z.ZodIssueCode.custom, message: `attempt[${index}].caseId is not part of the Run's selection`, path: ['attempts', index, 'caseId'] });
      }
    });
  });
export type Run = z.infer<typeof Run>;
