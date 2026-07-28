import type { Bundle } from '../contracts/bundle.js';
import type { CaseEvidenceRevision } from '../contracts/evidence.js';
import type { AgentHandoff } from '../contracts/handoff.js';
import type { BundleId, CaseEvidenceRevisionId, HandoffId, JobId, PrototypeId, RunId, SnapshotId, StalenessReportId, WorkspaceId } from '../contracts/ids.js';
import type { CaptureJob } from '../contracts/job.js';
import type { NormalizedSelection, Run } from '../contracts/run.js';
import type { BundleSnapshot } from '../contracts/snapshot.js';
import type { StalenessReport } from '../contracts/staleness.js';
import type { CoverageSummary } from '../contracts/coverage.js';

export type CreateJobInput = {
  bundleId: BundleId;
  selection: NormalizedSelection;
  inputVersion: string;
};

export type JobJournalEntryInput = {
  event: string;
  detail?: string;
};

/** Terminal Job statuses double as the `RunTerminationReason` of the Run the Job produces. */
export type TerminalJobStatus = 'completed' | 'failed' | 'cancelled' | 'interrupted';

export type CommitRunInput = {
  bundleId: BundleId;
  /**
   * A fully-built, schema-shaped Run (immutable header + Attempts). Its
   * `attempts[].revisionId` for `captured` results must be present either
   * in `revisions` (newly captured this Run) or already persisted from an
   * earlier Run (`reused`/replay case).
   */
  run: Run;
  /** Newly captured Case Evidence Revisions produced by this Run's `captured` Attempts. */
  revisions: CaseEvidenceRevision[];
  /** Snapshot Coverage for the resulting Snapshot; computed by the caller (pb-v2-implementation-guide.md). */
  coverage: CoverageSummary;
};

export type CommitRunResult = {
  run: Run;
  snapshot: BundleSnapshot;
};

export type InitResult = {
  /** Jobs that were non-terminal at startup and have just been finalized as `interrupted`. */
  finalizedOrphanJobs: JobId[];
};

/**
 * Store interface (pb-v2-implementation-guide.md "Evidence Store 落地"):
 * CLI, MCP and Service must depend on this interface, never construct
 * paths or file formats themselves. This first implementation covers the
 * "先实现" scope: single Workspace, single-process writer, multi-process
 * reader, Run/Attempt/Revision/Snapshot persistence with atomic commit,
 * and Job/orphan restart finalization. Blob management, fork/archive/
 * clean, dependency-digest reuse and Staleness Report *generation* are not
 * yet implemented (pb-v2-implementation-guide.md "再实现").
 */
export interface V2Store {
  readonly workspaceId: WorkspaceId;

  /** Ensures the on-disk layout exists and finalizes any Job left non-terminal by a previous crash. Must be called once before any other method. */
  init(): Promise<InitResult>;

  ensureBundle(input: { bundleId: BundleId; prototypeId: PrototypeId }): Promise<Bundle>;
  getBundle(bundleId: BundleId): Promise<Bundle | undefined>;

  createJob(input: CreateJobInput): Promise<CaptureJob>;
  markJobRunning(jobId: JobId, runId: RunId): Promise<CaptureJob>;
  appendJobJournal(jobId: JobId, entry: JobJournalEntryInput): Promise<CaptureJob>;
  finalizeJob(jobId: JobId, status: TerminalJobStatus): Promise<CaptureJob>;
  getJob(jobId: JobId): Promise<CaptureJob | undefined>;
  listNonTerminalJobs(): Promise<CaptureJob[]>;

  getRun(bundleId: BundleId, runId: RunId): Promise<Run | undefined>;
  getEvidenceRevision(bundleId: BundleId, revisionId: CaseEvidenceRevisionId): Promise<CaseEvidenceRevision | undefined>;

  getActiveSnapshot(bundleId: BundleId): Promise<BundleSnapshot | undefined>;
  getSnapshot(bundleId: BundleId, snapshotId: SnapshotId): Promise<BundleSnapshot | undefined>;
  listSnapshotIds(bundleId: BundleId): Promise<SnapshotId[]>;

  /**
   * The one atomic transition point: persists the Run and any new Evidence
   * revisions, builds the next Snapshot on top of the current active one,
   * and only then flips the Bundle's active-snapshot pointer. Any failure
   * before the final pointer flip leaves the previous active Snapshot
   * completely unaffected (pb-v2-spec.md "写入失败时旧 active Snapshot 保持不变").
   */
  commitRun(input: CommitRunInput): Promise<CommitRunResult>;

  putStalenessReport(report: StalenessReport): Promise<void>;
  getStalenessReport(reportId: StalenessReportId): Promise<StalenessReport | undefined>;
  putHandoff(handoff: AgentHandoff): Promise<void>;
  getHandoff(handoffId: HandoffId): Promise<AgentHandoff | undefined>;
}
