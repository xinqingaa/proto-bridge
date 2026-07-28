import { z } from 'zod';
import { BundleId, JobId, RunId, WorkspaceId } from './ids.js';
import { NormalizedSelection } from './run.js';
import { isTerminalJobStatus, JobStatus } from './vocabulary.js';
import { V2_SCHEMA_MAJOR } from './version.js';

/**
 * One append-only entry in a Job's execution journal. The journal is the
 * only part of a Capture Job that grows over its (bounded) lifetime; every
 * other field only ever moves forward through the status state machine
 * (pb-v2-implementation-guide.md "Evidence Store 落地").
 */
export const JobJournalEntry = z
  .object({
    at: z.string().datetime(),
    event: z.string().min(1),
    detail: z.string().optional(),
  })
  .strict();
export type JobJournalEntry = z.infer<typeof JobJournalEntry>;

/**
 * Persistent execution control record for one accepted Capture Job
 * (pb-v2-spec.md "Run、Attempt、Revision 与 Snapshot"): "Job 被接受前必须先
 * 持久化执行控制记录；返回成功后即使 Service 重启也能恢复其终态". Unlike Run,
 * Snapshot and Evidence revision, a Job is intentionally mutable while
 * non-terminal (its `status`/`journal`/`endedAt` advance in place); once it
 * reaches a terminal status it must never change again.
 *
 * Terminal `status` values are reused as `RunTerminationReason` values on
 * the Run this Job produces (or synthesizes on restart finalization), so no
 * second reason vocabulary is needed here.
 */
export const CaptureJob = z
  .object({
    schemaVersion: z.literal(V2_SCHEMA_MAJOR),
    jobId: JobId,
    workspaceId: WorkspaceId,
    bundleId: BundleId,
    selection: NormalizedSelection,
    /** Input version Preflight validated this Selection against; carried onto the Run this Job produces. */
    inputVersion: z.string().min(1),
    status: JobStatus,
    acceptedAt: z.string().datetime(),
    startedAt: z.string().datetime().optional(),
    endedAt: z.string().datetime().optional(),
    /** Established once the Job starts executing and a Run identity is minted; never reassigned afterwards. */
    runId: RunId.optional(),
    journal: z.array(JobJournalEntry).default([]),
  })
  .strict()
  .superRefine((job, ctx) => {
    const terminal = isTerminalJobStatus(job.status);
    if (job.status === 'accepted') {
      if (job.startedAt !== undefined) {
        ctx.addIssue({ code: z.ZodIssueCode.custom, message: 'accepted jobs must not carry startedAt', path: ['startedAt'] });
      }
      if (job.runId !== undefined) {
        ctx.addIssue({ code: z.ZodIssueCode.custom, message: 'accepted jobs must not carry runId', path: ['runId'] });
      }
      if (job.endedAt !== undefined) {
        ctx.addIssue({ code: z.ZodIssueCode.custom, message: 'accepted jobs must not carry endedAt', path: ['endedAt'] });
      }
      return;
    }
    if (job.status === 'running') {
      if (job.startedAt === undefined) {
        ctx.addIssue({ code: z.ZodIssueCode.custom, message: 'running jobs must carry startedAt', path: ['startedAt'] });
      }
      if (job.runId === undefined) {
        ctx.addIssue({ code: z.ZodIssueCode.custom, message: 'running jobs must carry a Run identity', path: ['runId'] });
      }
      if (job.endedAt !== undefined) {
        ctx.addIssue({ code: z.ZodIssueCode.custom, message: 'running jobs must not carry endedAt', path: ['endedAt'] });
      }
      return;
    }
    // terminal: completed | failed | cancelled | interrupted
    if (terminal && job.endedAt === undefined) {
      ctx.addIssue({ code: z.ZodIssueCode.custom, message: 'terminal jobs must carry endedAt', path: ['endedAt'] });
    }
    if ((job.startedAt === undefined) !== (job.runId === undefined)) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: 'startedAt and runId must be set together: a Job only gets a Run identity once it actually starts executing',
        path: ['runId'],
      });
    }
  });
export type CaptureJob = z.infer<typeof CaptureJob>;
