import type { Bundle } from '../contracts/bundle.js';
import type { BlobKind, BlobOwnerRef, BlobRecord } from '../contracts/blob.js';
import type { CatalogRevision } from '../contracts/catalog.js';
import type { CaseEvidenceRevision } from '../contracts/evidence.js';
import type { AgentHandoff } from '../contracts/handoff.js';
import type { Issue } from '../contracts/issue.js';
import type {
  BlobId,
  BundleId,
  CaseEvidenceRevisionId,
  CatalogRevisionId,
  CaseId,
  HandoffId,
  JobId,
  IssueId,
  PrototypeId,
  RunId,
  SnapshotId,
  StalenessReportId,
  WorkspaceId,
} from '../contracts/ids.js';
import type { CaptureJob } from '../contracts/job.js';
import type { NormalizedSelection, Run } from '../contracts/run.js';
import type { BundleSnapshot } from '../contracts/snapshot.js';
import type { StalenessReport } from '../contracts/staleness.js';
import type { CoverageSummary } from '../contracts/coverage.js';
import type {
  ExecutingJobStatus,
  TerminalJobStatus,
} from '../contracts/vocabulary.js';
import type { EvidenceLevel } from '../contracts/vocabulary.js';
import type { NormalizedCaptureScope } from '../contracts/scope.js';

export type CreateJobInput = {
  bundleId: BundleId;
  selection: NormalizedSelection;
  inputVersion: string;
};

export type JobJournalEntryInput = {
  event: string;
  detail?: string;
};

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

export type CreateBundleInput = {
  bundleId: BundleId;
  prototypeId: PrototypeId;
  run: Run;
  revisions: CaseEvidenceRevision[];
  coverage: CoverageSummary;
};

export type ForkBundleInput = {
  sourceBundleId: BundleId;
  sourceSnapshotId: SnapshotId;
  bundleId: BundleId;
};

export type PutBlobInput = {
  bundleId: BundleId;
  kind: BlobKind;
  mediaType: string;
  bytes: Uint8Array;
  ownerRefs: BlobOwnerRef[];
};

export type FindReusableEvidenceInput = {
  bundleId: BundleId;
  caseId: CaseId;
  captureScope: NormalizedCaptureScope;
  inputDigest: string;
  minimumEvidenceLevel?: EvidenceLevel;
};

export type CreateStalenessReportInput = {
  bundleId: BundleId;
  snapshotId: SnapshotId;
  inputVersion: string;
  currentDependencyDigests: Readonly<Record<string, string>>;
};

export type StoreCapacity = {
  usedBytes: number;
  maxBytes?: number;
  remainingBytes?: number;
};

export type CleanCandidateKind = 'snapshot' | 'run' | 'revision';

export type CleanCandidate = {
  kind: CleanCandidateKind;
  bundleId: BundleId;
  objectId: string;
  byteLength: number;
};

export type CleanPlan = {
  planId: string;
  workspaceId: WorkspaceId;
  createdAt: string;
  retainArchivedSnapshots: number;
  candidates: CleanCandidate[];
  reclaimableBytes: number;
};

export type CleanResult = {
  deleted: CleanCandidate[];
  reclaimedBytes: number;
};

export type BundleDeleteCandidate = {
  bundleId: BundleId;
  fingerprint: string;
  blockedBy: Array<{ kind: 'handoff' | 'active-job'; objectId: string }>;
};

export type BundleDeletePlan = {
  planId: string;
  workspaceId: WorkspaceId;
  createdAt: string;
  candidates: BundleDeleteCandidate[];
};

export type BundleDeleteResult = {
  deletedBundleIds: BundleId[];
};

export type InitResult = {
  /** Jobs that were non-terminal at startup and have just been finalized as `interrupted`. */
  finalizedOrphanJobs: JobId[];
};

/**
 * Store interface (pb-v2-implementation-guide.md "Evidence Store 落地"):
 * CLI, MCP and Service must depend on this interface, never construct
 * paths or file formats themselves. The interface covers the Phase 2
 * persistence boundary: immutable history, atomic Bundle/Snapshot commits,
 * Job recovery, Catalog/Blob, dependency freshness, lifecycle, capacity
 * and safe clean.
 */
export interface V2Store {
  readonly workspaceId: WorkspaceId;

  /** Ensures the on-disk layout exists and finalizes any Job left non-terminal by a previous crash. Must be called once before any other method. */
  init(): Promise<InitResult>;
  close(): Promise<void>;

  createBundle(
    input: CreateBundleInput,
  ): Promise<{ bundle: Bundle; run: Run; snapshot: BundleSnapshot }>;
  getBundle(bundleId: BundleId): Promise<Bundle | undefined>;
  listBundles(): Promise<Bundle[]>;
  archiveBundle(bundleId: BundleId): Promise<Bundle>;
  trashBundle(bundleId: BundleId): Promise<Bundle>;
  restoreBundle(bundleId: BundleId): Promise<Bundle>;
  planDeleteBundles(bundleIds: BundleId[]): Promise<BundleDeletePlan>;
  applyDeleteBundles(plan: BundleDeletePlan): Promise<BundleDeleteResult>;
  forkBundle(
    input: ForkBundleInput,
  ): Promise<{ bundle: Bundle; snapshot: BundleSnapshot }>;

  createJob(input: CreateJobInput): Promise<CaptureJob>;
  startJob(jobId: JobId, runId: RunId): Promise<CaptureJob>;
  advanceJob(
    jobId: JobId,
    status: Exclude<ExecutingJobStatus, 'discovering'>,
  ): Promise<CaptureJob>;
  appendJobJournal(
    jobId: JobId,
    entry: JobJournalEntryInput,
  ): Promise<CaptureJob>;
  finalizeJob(jobId: JobId, status: TerminalJobStatus): Promise<CaptureJob>;
  getJob(jobId: JobId): Promise<CaptureJob | undefined>;
  listJobs(): Promise<CaptureJob[]>;
  listNonTerminalJobs(): Promise<CaptureJob[]>;

  getRun(bundleId: BundleId, runId: RunId): Promise<Run | undefined>;
  listRuns(bundleId: BundleId): Promise<Run[]>;
  getEvidenceRevision(
    bundleId: BundleId,
    revisionId: CaseEvidenceRevisionId,
  ): Promise<CaseEvidenceRevision | undefined>;
  listEvidenceRevisions(bundleId: BundleId): Promise<CaseEvidenceRevision[]>;

  getActiveSnapshot(bundleId: BundleId): Promise<BundleSnapshot | undefined>;
  getSnapshot(
    bundleId: BundleId,
    snapshotId: SnapshotId,
  ): Promise<BundleSnapshot | undefined>;
  listSnapshotIds(bundleId: BundleId): Promise<SnapshotId[]>;

  /**
   * The one atomic transition point: persists the Run and any new Evidence
   * revisions, builds the next Snapshot on top of the current active one,
   * and only then flips the Bundle's active-snapshot pointer. Any failure
   * before the final pointer flip leaves the previous active Snapshot
   * completely unaffected (pb-v2-spec.md "写入失败时旧 active Snapshot 保持不变").
   */
  commitRun(input: CommitRunInput): Promise<CommitRunResult>;

  putCatalogRevision(revision: CatalogRevision): Promise<void>;
  getCatalogRevision(
    bundleId: BundleId,
    revisionId: CatalogRevisionId,
  ): Promise<CatalogRevision | undefined>;
  listCatalogRevisions(bundleId: BundleId): Promise<CatalogRevision[]>;
  putIssue(bundleId: BundleId, issue: Issue): Promise<void>;
  getIssue(bundleId: BundleId, issueId: IssueId): Promise<Issue | undefined>;
  listIssues(bundleId: BundleId): Promise<Issue[]>;
  putBlob(input: PutBlobInput): Promise<BlobRecord>;
  getBlob(
    bundleId: BundleId,
    blobId: BlobId,
  ): Promise<{ record: BlobRecord; bytes: Uint8Array } | undefined>;
  listBlobRecords(bundleId: BundleId): Promise<BlobRecord[]>;
  findReusableEvidence(
    input: FindReusableEvidenceInput,
  ): Promise<CaseEvidenceRevision | undefined>;
  createStalenessReport(
    input: CreateStalenessReportInput,
  ): Promise<StalenessReport>;

  putStalenessReport(report: StalenessReport): Promise<void>;
  getStalenessReport(
    reportId: StalenessReportId,
  ): Promise<StalenessReport | undefined>;
  listStalenessReports(bundleId?: BundleId): Promise<StalenessReport[]>;
  putHandoff(handoff: AgentHandoff): Promise<void>;
  getHandoff(handoffId: HandoffId): Promise<AgentHandoff | undefined>;
  listHandoffs(bundleId?: BundleId): Promise<AgentHandoff[]>;

  getCapacity(): Promise<StoreCapacity>;
  planClean(options?: { retainArchivedSnapshots?: number }): Promise<CleanPlan>;
  applyClean(plan: CleanPlan): Promise<CleanResult>;
}
