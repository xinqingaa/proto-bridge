import { z } from 'zod';
import { BundleId, JobId, RunId, WorkspaceId } from './ids.js';
import { NormalizedSelection } from './run.js';
import { V2ContractError } from './errors.js';
import {
  isTerminalJobStatus,
  type JobStatus,
  JobStatus as JobStatusSchema,
  type RunTerminationReason,
  type TerminalJobStatus,
} from './vocabulary.js';
import { V2_SCHEMA_MAJOR } from './version.js';
import {
  LifecycleOperationKey,
  OperationRequestDigest,
} from './prototype-lifecycle.js';

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

const JOB_STATUS_TRANSITIONS: Readonly<Record<JobStatus, readonly JobStatus[]>> = {
  queued: ['discovering', 'cancelled', 'interrupted', 'failed'],
  discovering: ['capturing', 'writing', 'cancelled', 'interrupted', 'failed'],
  capturing: ['writing', 'cancelled', 'interrupted', 'failed'],
  writing: ['completed', 'cancelled', 'interrupted', 'failed'],
  completed: [],
  cancelled: [],
  interrupted: [],
  failed: [],
};

export function canTransitionJobStatus(from: JobStatus, to: JobStatus): boolean {
  return JOB_STATUS_TRANSITIONS[from].includes(to);
}

export function assertJobStatusTransition(from: JobStatus, to: JobStatus): void {
  if (!canTransitionJobStatus(from, to)) {
    throw new V2ContractError('immutable-violation', `Capture Job cannot transition from ${from} to ${to}.`, { from, to });
  }
}

export function terminalJobStatusToRunTerminationReason(status: TerminalJobStatus): RunTerminationReason {
  return status;
}

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
    /** Optional idempotency identity for a higher-level producer operation. */
    operationKey: LifecycleOperationKey.optional(),
    operationRequestDigest: OperationRequestDigest.optional(),
    status: JobStatusSchema,
    acceptedAt: z.string().datetime(),
    startedAt: z.string().datetime().optional(),
    endedAt: z.string().datetime().optional(),
    /** Established once the Job starts executing and a Run identity is minted; never reassigned afterwards. */
    runId: RunId.optional(),
    journal: z.array(JobJournalEntry).default([]),
  })
  .strict()
  .superRefine((job, ctx) => {
    if ((job.operationKey === undefined) !== (job.operationRequestDigest === undefined)) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: 'operationKey and operationRequestDigest must be supplied together',
        path: ['operationRequestDigest'],
      });
    }
    const terminal = isTerminalJobStatus(job.status);
    if (job.status === 'queued') {
      if (job.startedAt !== undefined) {
        ctx.addIssue({ code: z.ZodIssueCode.custom, message: 'queued jobs must not carry startedAt', path: ['startedAt'] });
      }
      if (job.runId !== undefined) {
        ctx.addIssue({ code: z.ZodIssueCode.custom, message: 'queued jobs must not carry runId', path: ['runId'] });
      }
      if (job.endedAt !== undefined) {
        ctx.addIssue({ code: z.ZodIssueCode.custom, message: 'queued jobs must not carry endedAt', path: ['endedAt'] });
      }
      return;
    }
    if (!terminal) {
      if (job.startedAt === undefined) {
        ctx.addIssue({ code: z.ZodIssueCode.custom, message: `${job.status} jobs must carry startedAt`, path: ['startedAt'] });
      }
      if (job.runId === undefined) {
        ctx.addIssue({ code: z.ZodIssueCode.custom, message: `${job.status} jobs must carry a Run identity`, path: ['runId'] });
      }
      if (job.endedAt !== undefined) {
        ctx.addIssue({ code: z.ZodIssueCode.custom, message: `${job.status} jobs must not carry endedAt`, path: ['endedAt'] });
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
    if (job.status === 'completed' && (job.startedAt === undefined || job.runId === undefined)) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: 'completed jobs must carry startedAt and runId',
        path: ['runId'],
      });
    }
  });
export type CaptureJob = z.infer<typeof CaptureJob>;
