import { createHash } from 'node:crypto';
import {
  cp,
  mkdir,
  readFile,
  readdir,
  rename,
  rm,
  stat,
} from 'node:fs/promises';
import path from 'node:path';
import { isDeepStrictEqual } from 'node:util';
import { BlobRecord } from '../contracts/blob.js';
import { Bundle } from '../contracts/bundle.js';
import { CatalogRevision } from '../contracts/catalog.js';
import { CaseEvidenceRevision } from '../contracts/evidence.js';
import { AgentHandoff } from '../contracts/handoff.js';
import { Issue } from '../contracts/issue.js';
import {
  V2ContractError,
  invalidSchemaError,
  unknownReferenceError,
} from '../contracts/errors.js';
import type {
  BundleId,
  BlobId,
  CaseEvidenceRevisionId,
  CatalogRevisionId,
  HandoffId,
  IssueId,
  JobId,
  PrototypeId,
  RunId,
  SnapshotId,
  StalenessReportId,
  WorkspaceId,
} from '../contracts/ids.js';
import { assertJobStatusTransition, CaptureJob } from '../contracts/job.js';
import { Run } from '../contracts/run.js';
import { computeScopeKey } from '../contracts/scope.js';
import { BundleSnapshot } from '../contracts/snapshot.js';
import { StalenessReport } from '../contracts/staleness.js';
import {
  EVIDENCE_LEVELS,
  evidenceLevelAtLeast,
  type ExecutingJobStatus,
  isTerminalJobStatus,
  type TerminalJobStatus,
} from '../contracts/vocabulary.js';
import { V2_SCHEMA_MAJOR } from '../contracts/version.js';
import { Workspace } from '../contracts/workspace.js';
import {
  assertHandoffReferences,
  assertRunReferences,
  assertSnapshotReferences,
  assertStalenessReportReferences,
} from '../resolver/references.js';
import {
  fileByteLength,
  listJsonIds,
  readJson,
  writeImmutableBytes,
  writeImmutableJson,
  writeJsonAtomic,
} from './atomic-file.js';
import { generateOperationalId } from './id-generator.js';
import {
  activeSnapshotPointerPath,
  blobContentPath,
  blobRecordPath,
  blobsDir,
  bundleManifestPath,
  bundleDir,
  bundlesDir,
  catalogRevisionPath,
  catalogRevisionsDir,
  evidenceRevisionPath,
  evidenceRevisionsDir,
  handoffPath,
  handoffsDir,
  issuePath,
  issuesDir,
  jobPath,
  jobsDir,
  runPath,
  runsDir,
  snapshotPath,
  snapshotsDir,
  stagingDir,
  stalenessReportPath,
  stalenessReportsDir,
  workspaceManifestPath,
} from './paths.js';
import { buildNextSnapshot } from './snapshot-builder.js';
import type {
  CleanCandidate,
  CleanPlan,
  CleanResult,
  CommitRunInput,
  CommitRunResult,
  CreateBundleInput,
  CreateJobInput,
  CreateStalenessReportInput,
  FindReusableEvidenceInput,
  ForkBundleInput,
  InitResult,
  JobJournalEntryInput,
  PutBlobInput,
  StoreCapacity,
  V2Store,
} from './types.js';
import { acquireWriterLock } from './writer-lock.js';

function readPngDimensions(bytes: Uint8Array): {
  width: number;
  height: number;
} {
  const signature = [137, 80, 78, 71, 13, 10, 26, 10];
  if (
    bytes.byteLength < 24 ||
    signature.some((value, index) => bytes[index] !== value) ||
    String.fromCharCode(...bytes.slice(12, 16)) !== 'IHDR'
  ) {
    throw new V2ContractError(
      'blob-rejected',
      'Screenshot declared as image/png is not a decodable PNG header.',
    );
  }
  const view = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength);
  const width = view.getUint32(16, false);
  const height = view.getUint32(20, false);
  if (width < 1 || height < 1) {
    throw new V2ContractError(
      'blob-rejected',
      'Screenshot PNG has invalid pixel dimensions.',
    );
  }
  return { width, height };
}

type ActiveSnapshotPointer = { snapshotId: SnapshotId };

export type LocalFileStoreOptions = {
  /** Directory this Store persists into. Created if it does not exist. */
  root: string;
  workspaceId: WorkspaceId;
  /**
   * Open an existing Store without taking the single-writer lock or
   * performing recovery writes. Intended for cross-process consumers such
   * as MCP readers.
   */
  readOnly?: boolean;
  /** Hard capacity guard for the complete Store root. */
  maxBytes?: number;
  /** Per-Blob guard; defaults to 25 MiB. */
  maxBlobBytes?: number;
  /** Test/recovery hook invoked after immutable objects are durable but before the active pointer flips. */
  beforeActivateSnapshot?: () => Promise<void>;
};

/**
 * First `V2Store` implementation (pb-v2-implementation-guide.md "Evidence
 * Store 落地" 先实现 scope): one Workspace root on the local filesystem, a
 * single writer process at a time (best-effort lock; full concurrent-writer
 * arbitration is a later "再实现" step), and any number of readers.
 *
 * Every historical object (Run, Case Evidence Revision, Bundle Snapshot) is
 * written once under a content-addressed-by-id path via `writeImmutableJson`
 * and never edited in place; only the Bundle's active-snapshot pointer and
 * a Job's own record change after creation.
 */
export class LocalFileStore implements V2Store {
  readonly workspaceId: WorkspaceId;
  private readonly root: string;
  private readonly maxBytes: number | undefined;
  private readonly maxBlobBytes: number;
  private readonly beforeActivateSnapshot: (() => Promise<void>) | undefined;
  private readonly readOnly: boolean;
  private releaseLock: (() => Promise<void>) | undefined;

  constructor(options: LocalFileStoreOptions) {
    this.root = options.root;
    this.workspaceId = options.workspaceId;
    this.maxBytes = options.maxBytes;
    this.maxBlobBytes = options.maxBlobBytes ?? 25 * 1024 * 1024;
    this.beforeActivateSnapshot = options.beforeActivateSnapshot;
    this.readOnly = options.readOnly ?? false;
  }

  async init(): Promise<InitResult> {
    if (this.readOnly) {
      const manifest = await readJson<{
        schemaVersion: number;
        workspaceId: WorkspaceId;
        createdAt: string;
      }>(workspaceManifestPath(this.root));
      if (!manifest) {
        throw new V2ContractError(
          'unknown-reference',
          `Store root ${this.root} does not contain a Workspace manifest.`,
        );
      }
      if (manifest.workspaceId !== this.workspaceId) {
        throw new V2ContractError(
          'workspace-mismatch',
          `Store root ${this.root} belongs to workspace ${manifest.workspaceId}, not ${this.workspaceId}.`,
        );
      }
      return { finalizedOrphanJobs: [] };
    }
    await mkdir(this.root, { recursive: true });
    this.releaseLock = await acquireWriterLock(this.root);
    try {
      await rm(stagingDir(this.root), { recursive: true, force: true });

      const manifest = await readJson<{
        schemaVersion: number;
        workspaceId: WorkspaceId;
        createdAt: string;
      }>(workspaceManifestPath(this.root));
      if (!manifest) {
        await writeJsonAtomic(workspaceManifestPath(this.root), {
          schemaVersion: V2_SCHEMA_MAJOR,
          workspaceId: this.workspaceId,
          createdAt: new Date().toISOString(),
        });
      } else if (manifest.workspaceId !== this.workspaceId) {
        throw new V2ContractError(
          'workspace-mismatch',
          `Store root ${this.root} already belongs to workspace ${manifest.workspaceId}, not ${this.workspaceId}.`,
        );
      }

      const finalizedOrphanJobs = await this.finalizeOrphanJobs();
      return { finalizedOrphanJobs };
    } catch (error) {
      await this.close();
      throw error;
    }
  }

  async close(): Promise<void> {
    await this.releaseLock?.();
    this.releaseLock = undefined;
  }

  private assertWritableStore(): void {
    if (this.readOnly) {
      throw new V2ContractError(
        'unsafe-input',
        'This LocalFileStore instance is open in read-only mode.',
      );
    }
  }

  // ---------------------------------------------------------------- Bundle

  async createBundle(
    input: CreateBundleInput,
  ): Promise<{ bundle: Bundle; run: Run; snapshot: BundleSnapshot }> {
    this.assertWritableStore();
    if (await this.getBundle(input.bundleId)) {
      throw new V2ContractError(
        'immutable-violation',
        `Bundle ${input.bundleId} already exists.`,
      );
    }
    const bundle = Bundle.parse({
      schemaVersion: V2_SCHEMA_MAJOR,
      bundleId: input.bundleId,
      workspaceId: this.workspaceId,
      prototypeId: input.prototypeId,
      status: 'writable',
      createdAt: new Date().toISOString(),
    });
    const run = this.parseOrThrow(Run, input.run, 'Run');
    if (
      run.workspaceId !== this.workspaceId ||
      run.bundleId !== bundle.bundleId ||
      run.selection.prototypeId !== bundle.prototypeId
    ) {
      throw new V2ContractError(
        'workspace-mismatch',
        `Initial Run ${run.runId} does not belong to Bundle ${bundle.bundleId}/${bundle.prototypeId}.`,
      );
    }
    assertRunReferences(run);
    const revisions = input.revisions.map((revision) =>
      this.parseOrThrow(CaseEvidenceRevision, revision, 'CaseEvidenceRevision'),
    );
    const catalogs = (input.catalogs ?? []).map((catalog) =>
      this.parseOrThrow(CatalogRevision, catalog, 'CatalogRevision'),
    );
    this.assertCatalogCommitOwnership(bundle, catalogs);
    const revisionsById = await this.validateCommitObjects(
      bundle,
      run,
      revisions,
      undefined,
    );
    const snapshot = this.parseOrThrow(
      BundleSnapshot,
      buildNextSnapshot({
        run,
        revisionsById,
        snapshotId: generateOperationalId('snapshot'),
        committedAt: new Date().toISOString(),
        coverage: input.coverage,
        catalogRefs: catalogs.map(({ kind, catalogRevisionId }) => ({
          kind,
          catalogRevisionId,
        })),
      }),
      'BundleSnapshot',
    );
    if (snapshot.activeSlots.length === 0) {
      throw new V2ContractError(
        'unknown-reference',
        `Bundle ${bundle.bundleId} cannot be created without at least one active Evidence revision in its first trustworthy Snapshot.`,
      );
    }
    this.assertSnapshotGraph(
      bundle,
      snapshot,
      [run],
      [...revisionsById.values()],
    );

    const estimatedBytes = this.serializedBytes(
      bundle,
      run,
      snapshot,
      ...revisions,
      ...catalogs,
    );
    await this.assertCapacity(estimatedBytes);

    const transactionRoot = path.join(
      stagingDir(this.root),
      generateOperationalId('create-bundle'),
    );
    const stagedBundleDir = bundleDir(transactionRoot, bundle.bundleId);
    try {
      await writeJsonAtomic(
        bundleManifestPath(transactionRoot, bundle.bundleId),
        bundle,
      );
      for (const revision of revisions) {
        await writeImmutableJson(
          evidenceRevisionPath(
            transactionRoot,
            bundle.bundleId,
            revision.revisionId,
          ),
          'CaseEvidenceRevision',
          revision,
        );
      }
      for (const catalog of catalogs) {
        await writeImmutableJson(
          catalogRevisionPath(
            transactionRoot,
            bundle.bundleId,
            catalog.catalogRevisionId,
          ),
          'CatalogRevision',
          catalog,
        );
      }
      await writeImmutableJson(
        runPath(transactionRoot, bundle.bundleId, run.runId),
        'Run',
        run,
      );
      await writeImmutableJson(
        snapshotPath(transactionRoot, bundle.bundleId, snapshot.snapshotId),
        'BundleSnapshot',
        snapshot,
      );
      await writeJsonAtomic(
        activeSnapshotPointerPath(transactionRoot, bundle.bundleId),
        {
          snapshotId: snapshot.snapshotId,
        } satisfies ActiveSnapshotPointer,
      );

      await mkdir(bundlesDir(this.root), { recursive: true });
      await rename(stagedBundleDir, bundleDir(this.root, bundle.bundleId));
    } finally {
      await rm(transactionRoot, { recursive: true, force: true });
    }
    return { bundle, run, snapshot };
  }

  async getBundle(bundleId: BundleId): Promise<Bundle | undefined> {
    const raw = await readJson<unknown>(
      bundleManifestPath(this.root, bundleId),
    );
    if (raw === undefined) return undefined;
    return this.parseOrThrow(Bundle, raw, 'Bundle');
  }

  async listBundles(): Promise<Bundle[]> {
    const bundles = await Promise.all(
      (await this.listBundleIds()).map((bundleId) => this.getBundle(bundleId)),
    );
    return bundles
      .filter((bundle): bundle is Bundle => bundle !== undefined)
      .sort((left, right) => right.createdAt.localeCompare(left.createdAt));
  }

  private async requireBundle(bundleId: BundleId): Promise<Bundle> {
    const bundle = await this.getBundle(bundleId);
    if (!bundle) throw unknownReferenceError('Bundle', bundleId);
    return bundle;
  }

  private requireWritableBundle(bundle: Bundle): void {
    if (bundle.status !== 'writable') {
      throw new V2ContractError(
        'bundle-archived',
        `Bundle ${bundle.bundleId} is ${bundle.status} and read-only; restore or fork it before creating a Job or committing a Run.`,
      );
    }
  }

  async archiveBundle(bundleId: BundleId): Promise<Bundle> {
    this.assertWritableStore();
    const bundle = await this.requireBundle(bundleId);
    if (bundle.status === 'archived') return bundle;
    if (bundle.status === 'trashed') {
      throw new V2ContractError(
        'invalid-schema',
        `Bundle ${bundleId} must be restored before it can be archived.`,
      );
    }
    const activeJobs = (await this.listNonTerminalJobs()).filter(
      (job) => job.bundleId === bundleId,
    );
    if (activeJobs.length > 0) {
      throw new V2ContractError(
        'invalid-schema',
        `Bundle ${bundleId} cannot be archived while non-terminal Jobs exist: ${activeJobs
          .map((job) => job.jobId)
          .join(', ')}.`,
      );
    }
    const archived = Bundle.parse({ ...bundle, status: 'archived' });
    await writeJsonAtomic(bundleManifestPath(this.root, bundleId), archived);
    return archived;
  }

  async trashBundle(bundleId: BundleId): Promise<Bundle> {
    this.assertWritableStore();
    const bundle = await this.requireBundle(bundleId);
    if (bundle.status === 'trashed') return bundle;
    const activeJobs = (await this.listNonTerminalJobs()).filter(
      (job) => job.bundleId === bundleId,
    );
    if (activeJobs.length > 0) {
      throw new V2ContractError(
        'invalid-schema',
        `Bundle ${bundleId} cannot be trashed while non-terminal Jobs exist.`,
      );
    }
    const trashed = Bundle.parse({
      ...bundle,
      status: 'trashed',
      statusBeforeTrash: bundle.status,
    });
    await writeJsonAtomic(bundleManifestPath(this.root, bundleId), trashed);
    return trashed;
  }

  async restoreBundle(bundleId: BundleId): Promise<Bundle> {
    this.assertWritableStore();
    const bundle = await this.requireBundle(bundleId);
    if (bundle.status !== 'trashed') return bundle;
    const { statusBeforeTrash, ...rest } = bundle;
    const restored = Bundle.parse({
      ...rest,
      status: statusBeforeTrash ?? 'writable',
    });
    await writeJsonAtomic(bundleManifestPath(this.root, bundleId), restored);
    return restored;
  }

  private async bundleDeleteCandidate(bundleId: BundleId) {
    const bundle = await this.requireBundle(bundleId);
    if (bundle.status !== 'trashed') {
      throw new V2ContractError(
        'invalid-schema',
        `Bundle ${bundleId} must be moved to trash before permanent deletion.`,
      );
    }
    const handoffs = await this.listHandoffs(bundleId);
    const activeJobs = (await this.listNonTerminalJobs()).filter(
      (job) => job.bundleId === bundleId,
    );
    const activeSnapshot = await this.getActiveSnapshot(bundleId);
    const fingerprint = `sha256:${createHash('sha256')
      .update(
        JSON.stringify({
          bundle,
          activeSnapshotId: activeSnapshot?.snapshotId,
          handoffIds: handoffs.map((item) => item.handoffId).sort(),
          activeJobIds: activeJobs.map((item) => item.jobId).sort(),
        }),
      )
      .digest('hex')}`;
    return {
      bundleId,
      fingerprint,
      blockedBy: [
        ...handoffs.map((handoff) => ({
          kind: 'handoff' as const,
          objectId: handoff.handoffId,
        })),
        ...activeJobs.map((job) => ({
          kind: 'active-job' as const,
          objectId: job.jobId,
        })),
      ],
    };
  }

  async planDeleteBundles(bundleIds: BundleId[]) {
    const uniqueIds = [...new Set(bundleIds)].sort();
    if (uniqueIds.length === 0) {
      throw new V2ContractError('invalid-schema', 'No Bundles were selected.');
    }
    return {
      planId: generateOperationalId('delete-plan'),
      workspaceId: this.workspaceId,
      createdAt: new Date().toISOString(),
      candidates: await Promise.all(
        uniqueIds.map((bundleId) => this.bundleDeleteCandidate(bundleId)),
      ),
    };
  }

  async applyDeleteBundles(plan: import('./types.js').BundleDeletePlan) {
    this.assertWritableStore();
    if (plan.workspaceId !== this.workspaceId) {
      throw new V2ContractError(
        'workspace-mismatch',
        'Delete Plan belongs to another Workspace.',
      );
    }
    const current = await Promise.all(
      plan.candidates.map((candidate) =>
        this.bundleDeleteCandidate(candidate.bundleId),
      ),
    );
    if (!isDeepStrictEqual(current, plan.candidates)) {
      throw new V2ContractError(
        'preflight-expired',
        'Delete Plan is stale; generate a new preview.',
      );
    }
    const blockers = current.flatMap((candidate) => candidate.blockedBy);
    if (blockers.length > 0) {
      throw new V2ContractError(
        'invalid-schema',
        'Referenced Bundles cannot be permanently deleted.',
        blockers,
      );
    }
    for (const candidate of current) {
      await rm(bundleDir(this.root, candidate.bundleId), {
        recursive: true,
        force: false,
      });
    }
    return { deletedBundleIds: current.map((candidate) => candidate.bundleId) };
  }

  async forkBundle(
    input: ForkBundleInput,
  ): Promise<{ bundle: Bundle; snapshot: BundleSnapshot }> {
    this.assertWritableStore();
    if (await this.getBundle(input.bundleId)) {
      throw new V2ContractError(
        'immutable-violation',
        `Bundle ${input.bundleId} already exists.`,
      );
    }
    const sourceBundle = await this.requireBundle(input.sourceBundleId);
    const sourceSnapshot = await this.getSnapshot(
      input.sourceBundleId,
      input.sourceSnapshotId,
    );
    if (!sourceSnapshot)
      throw unknownReferenceError(
        'Fork source Snapshot',
        input.sourceSnapshotId,
      );
    const sourceRuns = await this.loadRuns(sourceBundle.bundleId);
    const sourceRevisions = await this.loadRevisions(sourceBundle.bundleId);
    this.assertSnapshotGraph(
      sourceBundle,
      sourceSnapshot,
      sourceRuns,
      sourceRevisions,
    );

    const bundle = Bundle.parse({
      schemaVersion: V2_SCHEMA_MAJOR,
      bundleId: input.bundleId,
      workspaceId: this.workspaceId,
      prototypeId: sourceBundle.prototypeId,
      status: 'writable',
      createdAt: new Date().toISOString(),
      originSnapshotId: sourceSnapshot.snapshotId,
    });
    const snapshot = BundleSnapshot.parse({
      ...sourceSnapshot,
      snapshotId: generateOperationalId('snapshot'),
      bundleId: bundle.bundleId,
      originSnapshotId: sourceSnapshot.snapshotId,
      committedAt: new Date().toISOString(),
    });
    this.assertSnapshotGraph(bundle, snapshot, sourceRuns, sourceRevisions);

    const transactionRoot = path.join(
      stagingDir(this.root),
      generateOperationalId('fork-bundle'),
    );
    const stagedBundle = bundleDir(transactionRoot, bundle.bundleId);
    await this.assertCapacity(
      (await this.directoryByteLength(
        bundleDir(this.root, sourceBundle.bundleId),
      )) + this.serializedBytes(bundle, snapshot),
    );
    try {
      await writeJsonAtomic(
        bundleManifestPath(transactionRoot, bundle.bundleId),
        bundle,
      );
      await cp(
        runsDir(this.root, sourceBundle.bundleId),
        runsDir(transactionRoot, bundle.bundleId),
        {
          recursive: true,
          force: false,
          errorOnExist: true,
        },
      ).catch((error) => {
        if (!this.isEnoent(error)) throw error;
      });
      await cp(
        evidenceRevisionsDir(this.root, sourceBundle.bundleId),
        evidenceRevisionsDir(transactionRoot, bundle.bundleId),
        { recursive: true, force: false, errorOnExist: true },
      ).catch((error) => {
        if (!this.isEnoent(error)) throw error;
      });
      await cp(
        catalogRevisionsDir(this.root, sourceBundle.bundleId),
        catalogRevisionsDir(transactionRoot, bundle.bundleId),
        {
          recursive: true,
          force: false,
          errorOnExist: true,
        },
      ).catch((error) => {
        if (!this.isEnoent(error)) throw error;
      });
      await cp(
        blobsDir(this.root, sourceBundle.bundleId),
        blobsDir(transactionRoot, bundle.bundleId),
        {
          recursive: true,
          force: false,
          errorOnExist: true,
        },
      ).catch((error) => {
        if (!this.isEnoent(error)) throw error;
      });
      await writeImmutableJson(
        snapshotPath(transactionRoot, bundle.bundleId, snapshot.snapshotId),
        'BundleSnapshot',
        snapshot,
      );
      await writeJsonAtomic(
        activeSnapshotPointerPath(transactionRoot, bundle.bundleId),
        {
          snapshotId: snapshot.snapshotId,
        } satisfies ActiveSnapshotPointer,
      );
      await mkdir(bundlesDir(this.root), { recursive: true });
      await rename(stagedBundle, bundleDir(this.root, bundle.bundleId));
    } finally {
      await rm(transactionRoot, { recursive: true, force: true });
    }
    return { bundle, snapshot };
  }

  // -------------------------------------------------------------------- Job

  async createJob(input: CreateJobInput): Promise<CaptureJob> {
    this.assertWritableStore();
    const bundle = await this.getBundle(input.bundleId);
    if (bundle) {
      this.requireWritableBundle(bundle);
      if (bundle.prototypeId !== input.selection.prototypeId) {
        throw new V2ContractError(
          'workspace-mismatch',
          `Selection Prototype ${input.selection.prototypeId} does not match Bundle ${bundle.bundleId}/${bundle.prototypeId}.`,
        );
      }
    }
    const now = new Date().toISOString();
    const job = CaptureJob.parse({
      schemaVersion: V2_SCHEMA_MAJOR,
      jobId: generateOperationalId('job'),
      workspaceId: this.workspaceId,
      bundleId: input.bundleId,
      selection: input.selection,
      inputVersion: input.inputVersion,
      status: 'queued',
      acceptedAt: now,
      journal: [{ at: now, event: 'queued' }],
    });
    await writeJsonAtomic(jobPath(this.root, job.jobId), job);
    return job;
  }

  async getJob(jobId: JobId): Promise<CaptureJob | undefined> {
    const raw = await readJson<unknown>(jobPath(this.root, jobId));
    if (raw === undefined) return undefined;
    return this.parseOrThrow(CaptureJob, raw, 'CaptureJob');
  }

  private async requireJob(jobId: JobId): Promise<CaptureJob> {
    const job = await this.getJob(jobId);
    if (!job) throw unknownReferenceError('CaptureJob', jobId);
    return job;
  }

  async startJob(jobId: JobId, runId: RunId): Promise<CaptureJob> {
    this.assertWritableStore();
    const job = await this.requireJob(jobId);
    assertJobStatusTransition(job.status, 'discovering');
    const now = new Date().toISOString();
    const next = CaptureJob.parse({
      ...job,
      status: 'discovering',
      startedAt: now,
      runId,
      journal: [
        ...job.journal,
        { at: now, event: 'discovering', detail: runId },
      ],
    });
    await writeJsonAtomic(jobPath(this.root, jobId), next);
    return next;
  }

  async advanceJob(
    jobId: JobId,
    status: Exclude<ExecutingJobStatus, 'discovering'>,
  ): Promise<CaptureJob> {
    this.assertWritableStore();
    const job = await this.requireJob(jobId);
    assertJobStatusTransition(job.status, status);
    const now = new Date().toISOString();
    const next = CaptureJob.parse({
      ...job,
      status,
      journal: [...job.journal, { at: now, event: status }],
    });
    await writeJsonAtomic(jobPath(this.root, jobId), next);
    return next;
  }

  async appendJobJournal(
    jobId: JobId,
    entry: JobJournalEntryInput,
  ): Promise<CaptureJob> {
    this.assertWritableStore();
    const job = await this.requireJob(jobId);
    if (isTerminalJobStatus(job.status)) {
      throw new V2ContractError(
        'immutable-violation',
        `Job ${jobId} is already terminal (${job.status}); its journal can no longer grow.`,
      );
    }
    const next = CaptureJob.parse({
      ...job,
      journal: [...job.journal, { at: new Date().toISOString(), ...entry }],
    });
    await writeJsonAtomic(jobPath(this.root, jobId), next);
    return next;
  }

  async finalizeJob(
    jobId: JobId,
    status: TerminalJobStatus,
  ): Promise<CaptureJob> {
    this.assertWritableStore();
    const job = await this.requireJob(jobId);
    assertJobStatusTransition(job.status, status);
    const now = new Date().toISOString();
    const next = CaptureJob.parse({
      ...job,
      status,
      endedAt: now,
      journal: [
        ...job.journal,
        { at: now, event: 'finalized', detail: status },
      ],
    });
    await writeJsonAtomic(jobPath(this.root, jobId), next);
    return next;
  }

  async listNonTerminalJobs(): Promise<CaptureJob[]> {
    const jobs = await this.listJobs();
    return jobs.filter((job) => !isTerminalJobStatus(job.status));
  }

  async listJobs(): Promise<CaptureJob[]> {
    const ids = await listJsonIds(jobsDir(this.root));
    const jobs = await Promise.all(
      ids.map((id) => this.requireJob(id as JobId)),
    );
    return jobs.sort((left, right) =>
      right.acceptedAt.localeCompare(left.acceptedAt),
    );
  }

  /**
   * Restart finalization (pb-v2-spec.md "Service 重启后非终态 Job 可以确定性
   * 终结为 interrupted Run、Coverage 和 Snapshot"): every Job still
   * any non-terminal phase when this process starts belonged to a writer that
   * never reached a terminal state (crash, kill, or an unclean shutdown).
   * Each one is finalized as `interrupted` and, if it ever started
   * executing, produces a zero-Attempt interrupted Run whose Snapshot
   * carries forward the Bundle's existing active Evidence untouched.
   */
  private async finalizeOrphanJobs(): Promise<JobId[]> {
    const nonTerminal = await this.listNonTerminalJobs();
    const finalized: JobId[] = [];
    for (const job of nonTerminal) {
      await this.finalizeOrphanJob(job);
      finalized.push(job.jobId);
    }
    return finalized;
  }

  private async finalizeOrphanJob(job: CaptureJob): Promise<void> {
    const now = new Date().toISOString();
    const runId = job.runId ?? generateOperationalId('run');
    const selectedCount = job.selection.cases.length;

    const run = Run.parse({
      schemaVersion: V2_SCHEMA_MAJOR,
      runId,
      workspaceId: this.workspaceId,
      bundleId: job.bundleId,
      selection: job.selection,
      inputVersion: job.inputVersion,
      startedAt: job.startedAt ?? job.acceptedAt,
      endedAt: now,
      terminationReason: 'interrupted',
      attempts: [],
      coverage: {
        counts: {
          selected: selectedCount,
          captured: 0,
          reused: 0,
          failed: 0,
          skipped: 0,
          unsupported: 0,
          cancelled: 0,
          interrupted: 0,
          missing: selectedCount,
          stale: 0,
        },
        evidenceLevelBreakdown: Object.fromEntries(
          EVIDENCE_LEVELS.map((level) => [level, 0]),
        ) as Record<(typeof EVIDENCE_LEVELS)[number], number>,
        factQuality: { traceable: 0, heuristic: 0, unknown: 0, conflict: 0 },
        denominator: selectedCount,
      },
    });

    const bundle = await this.getBundle(job.bundleId);
    if (bundle) {
      await this.commitRun({
        bundleId: job.bundleId,
        run,
        revisions: [],
        coverage: run.coverage,
      });
    }

    await writeJsonAtomic(
      jobPath(this.root, job.jobId),
      CaptureJob.parse({
        ...job,
        status: 'interrupted',
        runId,
        startedAt: job.startedAt ?? job.acceptedAt,
        endedAt: now,
        journal: [
          ...job.journal,
          {
            at: now,
            event: 'finalized-orphan',
            detail: bundle
              ? `synthesized interrupted Run ${runId}`
              : `interrupted before the first trustworthy Snapshot; pending Bundle ${job.bundleId} was not created`,
          },
        ],
      }),
    );
  }

  // ------------------------------------------------------------------- Run

  async getRun(bundleId: BundleId, runId: RunId): Promise<Run | undefined> {
    const raw = await readJson<unknown>(runPath(this.root, bundleId, runId));
    if (raw === undefined) return undefined;
    return this.parseOrThrow(Run, raw, 'Run');
  }

  async listRuns(bundleId: BundleId): Promise<Run[]> {
    return (await this.loadRuns(bundleId)).sort((left, right) =>
      right.startedAt.localeCompare(left.startedAt),
    );
  }

  // ------------------------------------------------------- Evidence revision

  async getEvidenceRevision(
    bundleId: BundleId,
    revisionId: CaseEvidenceRevisionId,
  ): Promise<CaseEvidenceRevision | undefined> {
    const raw = await readJson<unknown>(
      evidenceRevisionPath(this.root, bundleId, revisionId),
    );
    if (raw === undefined) return undefined;
    return this.parseOrThrow(CaseEvidenceRevision, raw, 'CaseEvidenceRevision');
  }

  async listEvidenceRevisions(
    bundleId: BundleId,
  ): Promise<CaseEvidenceRevision[]> {
    return (await this.loadRevisions(bundleId)).sort((left, right) =>
      right.capturedAt.localeCompare(left.capturedAt),
    );
  }

  // -------------------------------------------------------------- Snapshot

  async getActiveSnapshot(
    bundleId: BundleId,
  ): Promise<BundleSnapshot | undefined> {
    const pointer = await readJson<ActiveSnapshotPointer>(
      activeSnapshotPointerPath(this.root, bundleId),
    );
    if (!pointer) return undefined;
    return this.getSnapshot(bundleId, pointer.snapshotId);
  }

  async getSnapshot(
    bundleId: BundleId,
    snapshotId: SnapshotId,
  ): Promise<BundleSnapshot | undefined> {
    const raw = await readJson<unknown>(
      snapshotPath(this.root, bundleId, snapshotId),
    );
    if (raw === undefined) return undefined;
    return this.parseOrThrow(BundleSnapshot, raw, 'BundleSnapshot');
  }

  async listSnapshotIds(bundleId: BundleId): Promise<SnapshotId[]> {
    return (await listJsonIds(
      snapshotsDir(this.root, bundleId),
    )) as SnapshotId[];
  }

  // ---------------------------------------------------------------- Commit

  async commitRun(input: CommitRunInput): Promise<CommitRunResult> {
    this.assertWritableStore();
    const { bundleId, coverage } = input;
    const run = this.parseOrThrow(Run, input.run, 'Run');
    if (run.bundleId !== bundleId) {
      throw new V2ContractError(
        'workspace-mismatch',
        `Run.bundleId (${run.bundleId}) does not match the target Bundle (${bundleId}).`,
      );
    }
    if (run.workspaceId !== this.workspaceId) {
      throw new V2ContractError(
        'workspace-mismatch',
        `Run.workspaceId (${run.workspaceId}) does not match this Store's workspace (${this.workspaceId}).`,
      );
    }
    const bundle = await this.requireBundle(bundleId);
    this.requireWritableBundle(bundle);
    if (run.selection.prototypeId !== bundle.prototypeId) {
      throw new V2ContractError(
        'workspace-mismatch',
        `Run ${run.runId} selects Prototype ${run.selection.prototypeId}, not Bundle Prototype ${bundle.prototypeId}.`,
      );
    }
    assertRunReferences(run);

    const existingRun = await this.getRun(bundleId, run.runId);
    if (existingRun) {
      if (!isDeepStrictEqual(existingRun, run)) {
        throw new V2ContractError(
          'immutable-violation',
          `Run ${run.runId} is already persisted with different content.`,
        );
      }
      const activeSnapshot = await this.getActiveSnapshot(bundleId);
      if (activeSnapshot?.sourceRunId === run.runId) {
        return { run: existingRun, snapshot: activeSnapshot };
      }
    }

    const revisions = input.revisions.map((revision) =>
      this.parseOrThrow(CaseEvidenceRevision, revision, 'CaseEvidenceRevision'),
    );
    const catalogs = (input.catalogs ?? []).map((catalog) =>
      this.parseOrThrow(CatalogRevision, catalog, 'CatalogRevision'),
    );
    this.assertCatalogCommitOwnership(bundle, catalogs);
    for (const revision of revisions) {
      if (
        revision.bundleId !== bundleId ||
        revision.workspaceId !== this.workspaceId
      ) {
        throw new V2ContractError(
          'workspace-mismatch',
          `CaseEvidenceRevision ${revision.revisionId} does not belong to workspace/bundle ${this.workspaceId}/${bundleId}.`,
        );
      }
    }
    const previousSnapshot = await this.getActiveSnapshot(bundleId);
    const revisionsById = await this.validateCommitObjects(
      bundle,
      run,
      revisions,
      previousSnapshot,
    );

    const snapshotId = generateOperationalId('snapshot');
    const nextSnapshot = this.parseOrThrow(
      BundleSnapshot,
      buildNextSnapshot({
        previousSnapshot,
        run,
        revisionsById,
        snapshotId,
        committedAt: new Date().toISOString(),
        coverage,
        ...(input.catalogs === undefined
          ? {}
          : {
              catalogRefs: catalogs.map(({ kind, catalogRevisionId }) => ({
                kind,
                catalogRevisionId,
              })),
            }),
      }),
      'BundleSnapshot',
    );
    const allRuns = [
      ...(await this.loadRuns(bundleId)).filter(
        (candidate) => candidate.runId !== run.runId,
      ),
      run,
    ];
    const allRevisions = [
      ...(await this.loadRevisions(bundleId)).filter(
        (candidate) => !revisionsById.has(candidate.revisionId),
      ),
      ...revisionsById.values(),
    ];
    this.assertSnapshotGraph(bundle, nextSnapshot, allRuns, allRevisions);
    await this.assertCapacity(
      this.serializedBytes(run, nextSnapshot, ...revisions, ...catalogs),
    );

    // Every step above only reads or validates; nothing on disk changes until we're certain the whole
    // transaction is valid. From here, we only ever create brand-new immutable files, and the final
    // pointer flip is the single atomic rename that makes this Run's outcome visible
    // (pb-v2-spec.md "写入失败时旧 active Snapshot 保持不变").
    for (const revision of revisions) {
      await writeImmutableJson(
        evidenceRevisionPath(this.root, bundleId, revision.revisionId),
        'CaseEvidenceRevision',
        revision,
      );
    }
    for (const catalog of catalogs) {
      await writeImmutableJson(
        catalogRevisionPath(this.root, bundleId, catalog.catalogRevisionId),
        'CatalogRevision',
        catalog,
      );
    }
    await writeImmutableJson(
      runPath(this.root, bundleId, run.runId),
      'Run',
      run,
    );
    await writeImmutableJson(
      snapshotPath(this.root, bundleId, snapshotId),
      'BundleSnapshot',
      nextSnapshot,
    );
    await this.beforeActivateSnapshot?.();
    await writeJsonAtomic(activeSnapshotPointerPath(this.root, bundleId), {
      snapshotId,
    } satisfies ActiveSnapshotPointer);

    return { run, snapshot: nextSnapshot };
  }

  // ------------------------------------------------------- Catalog / Blob

  async putCatalogRevision(revision: CatalogRevision): Promise<void> {
    this.assertWritableStore();
    const parsed = this.parseOrThrow(
      CatalogRevision,
      revision,
      'CatalogRevision',
    );
    const bundle = await this.requireBundle(parsed.bundleId);
    this.requireWritableBundle(bundle);
    if (
      parsed.workspaceId !== this.workspaceId ||
      parsed.prototypeId !== bundle.prototypeId
    ) {
      throw new V2ContractError(
        'workspace-mismatch',
        `Catalog revision ${parsed.catalogRevisionId} does not belong to Bundle ${bundle.bundleId}.`,
      );
    }
    for (const blobId of parsed.entries.flatMap((entry) => entry.blobIds)) {
      if (!(await this.getBlob(parsed.bundleId, blobId))) {
        throw unknownReferenceError('Catalog Blob', blobId);
      }
    }
    await this.assertCapacity(this.serializedBytes(parsed));
    await writeImmutableJson(
      catalogRevisionPath(this.root, parsed.bundleId, parsed.catalogRevisionId),
      'CatalogRevision',
      parsed,
    );
  }

  async getCatalogRevision(
    bundleId: BundleId,
    revisionId: CatalogRevisionId,
  ): Promise<CatalogRevision | undefined> {
    const raw = await readJson<unknown>(
      catalogRevisionPath(this.root, bundleId, revisionId),
    );
    if (raw === undefined) return undefined;
    return this.parseOrThrow(CatalogRevision, raw, 'CatalogRevision');
  }

  async listCatalogRevisions(bundleId: BundleId): Promise<CatalogRevision[]> {
    await this.requireBundle(bundleId);
    const ids = (await listJsonIds(
      catalogRevisionsDir(this.root, bundleId),
    )) as CatalogRevisionId[];
    const revisions = await Promise.all(
      ids.map((revisionId) => this.getCatalogRevision(bundleId, revisionId)),
    );
    return revisions
      .filter((revision): revision is CatalogRevision => revision !== undefined)
      .sort((left, right) => left.createdAt.localeCompare(right.createdAt));
  }

  async putIssue(bundleId: BundleId, issue: Issue): Promise<void> {
    this.assertWritableStore();
    const bundle = await this.requireBundle(bundleId);
    this.requireWritableBundle(bundle);
    const parsed = this.parseOrThrow(Issue, issue, 'Issue');
    await this.assertCapacity(this.serializedBytes(parsed));
    await writeImmutableJson(
      issuePath(this.root, bundleId, parsed.issueId),
      'Issue',
      parsed,
    );
  }

  async getIssue(
    bundleId: BundleId,
    issueId: IssueId,
  ): Promise<Issue | undefined> {
    const raw = await readJson<unknown>(
      issuePath(this.root, bundleId, issueId),
    );
    if (raw === undefined) return undefined;
    return this.parseOrThrow(Issue, raw, 'Issue');
  }

  async listIssues(bundleId: BundleId): Promise<Issue[]> {
    await this.requireBundle(bundleId);
    const ids = (await listJsonIds(issuesDir(this.root, bundleId))) as IssueId[];
    const issues = await Promise.all(
      ids.map((issueId) => this.getIssue(bundleId, issueId)),
    );
    return issues
      .filter((issue): issue is Issue => issue !== undefined)
      .sort((left, right) => left.issueId.localeCompare(right.issueId));
  }

  async putBlob(input: PutBlobInput): Promise<BlobRecord> {
    this.assertWritableStore();
    const bundle = await this.requireBundle(input.bundleId);
    this.requireWritableBundle(bundle);
    if (input.bytes.byteLength > this.maxBlobBytes) {
      throw new V2ContractError(
        'blob-rejected',
        `Blob is ${input.bytes.byteLength} bytes; the per-Blob limit is ${this.maxBlobBytes} bytes.`,
      );
    }
    if (!this.isAllowedBlobMediaType(input.mediaType)) {
      throw new V2ContractError(
        'blob-rejected',
        `Blob media type ${input.mediaType} is not allowed.`,
      );
    }
    if (input.ownerRefs.length === 0) {
      throw new V2ContractError(
        'blob-rejected',
        'A Blob must have at least one logical owner reference.',
      );
    }
    const image =
      input.kind === 'screenshot' && input.mediaType === 'image/png'
        ? readPngDimensions(input.bytes)
        : undefined;
    const ownerRefs = [...new Map(
      input.ownerRefs
        .map((ownerRef) => [`${ownerRef.kind}:${ownerRef.objectId}`, ownerRef] as const)
        .sort(([left], [right]) => left.localeCompare(right)),
    ).values()];
    for (const ownerRef of ownerRefs) {
      await this.assertBlobOwnerExists(input.bundleId, ownerRef);
    }

    const hash = createHash('sha256').update(input.bytes).digest('hex');
    const logicalHash = createHash('sha256')
      .update(
        JSON.stringify({
          digest: `sha256:${hash}`,
          kind: input.kind,
          mediaType: input.mediaType,
          ownerRefs,
        }),
      )
      .digest('hex');
    const blobId = `blob-${hash.slice(0, 24)}-${logicalHash.slice(0, 15)}` as BlobId;
    const existing = await this.getBlob(input.bundleId, blobId);
    if (existing) return existing.record;
    const record = BlobRecord.parse({
      schemaVersion: V2_SCHEMA_MAJOR,
      blobId,
      workspaceId: this.workspaceId,
      bundleId: input.bundleId,
      kind: input.kind,
      mediaType: input.mediaType,
      byteLength: input.bytes.byteLength,
      digest: `sha256:${hash}`,
      createdAt: new Date().toISOString(),
      ...(image ? { image } : {}),
      ownerRefs,
    });
    await this.assertCapacity(
      input.bytes.byteLength + this.serializedBytes(record),
    );
    await writeImmutableBytes(
      blobContentPath(this.root, input.bundleId, blobId),
      'Blob',
      input.bytes,
    );
    await writeImmutableJson(
      blobRecordPath(this.root, input.bundleId, blobId),
      'BlobRecord',
      record,
    );
    return record;
  }

  async getBlob(
    bundleId: BundleId,
    blobId: BlobId,
  ): Promise<{ record: BlobRecord; bytes: Uint8Array } | undefined> {
    const raw = await readJson<unknown>(
      blobRecordPath(this.root, bundleId, blobId),
    );
    if (raw === undefined) return undefined;
    const record = this.parseOrThrow(BlobRecord, raw, 'BlobRecord');
    const bytes = await readFile(blobContentPath(this.root, bundleId, blobId));
    const digest = `sha256:${createHash('sha256').update(bytes).digest('hex')}`;
    if (bytes.byteLength !== record.byteLength || digest !== record.digest) {
      throw new V2ContractError(
        'immutable-violation',
        `Blob ${blobId} content does not match its immutable metadata.`,
      );
    }
    return { record, bytes };
  }

  async listBlobRecords(bundleId: BundleId): Promise<BlobRecord[]> {
    const ids = (await listJsonIds(blobsDir(this.root, bundleId))) as BlobId[];
    const records = await Promise.all(
      ids.map(async (blobId) => (await this.getBlob(bundleId, blobId))?.record),
    );
    return records
      .filter((record): record is BlobRecord => record !== undefined)
      .sort((left, right) => right.createdAt.localeCompare(left.createdAt));
  }

  async findReusableEvidence(
    input: FindReusableEvidenceInput,
  ): Promise<CaseEvidenceRevision | undefined> {
    const snapshot = await this.getActiveSnapshot(input.bundleId);
    if (!snapshot) return undefined;
    const scopeKey = computeScopeKey(input.captureScope);
    const candidates: CaseEvidenceRevision[] = [];
    for (const slot of snapshot.activeSlots) {
      if (slot.caseId !== input.caseId || slot.scopeKey !== scopeKey) continue;
      const revision = await this.getEvidenceRevision(
        input.bundleId,
        slot.revisionId,
      );
      if (!revision || revision.inputDigest !== input.inputDigest) continue;
      if (
        input.minimumEvidenceLevel &&
        !evidenceLevelAtLeast(
          revision.evidenceLevel,
          input.minimumEvidenceLevel,
        )
      ) {
        continue;
      }
      candidates.push(revision);
    }
    return candidates.sort(
      (left, right) =>
        right.requiredFactsResolved / Math.max(1, right.requiredFactsTotal) -
          left.requiredFactsResolved / Math.max(1, left.requiredFactsTotal) ||
        right.capturedAt.localeCompare(left.capturedAt),
    )[0];
  }

  // ----------------------------------------------------- Staleness/Handoff

  async createStalenessReport(
    input: CreateStalenessReportInput,
  ): Promise<StalenessReport> {
    this.assertWritableStore();
    const bundle = await this.requireBundle(input.bundleId);
    const snapshot = await this.getSnapshot(input.bundleId, input.snapshotId);
    if (!snapshot)
      throw unknownReferenceError('Staleness Snapshot', input.snapshotId);
    const perRevision = [];
    for (const slot of snapshot.activeSlots) {
      const revision = await this.getEvidenceRevision(
        input.bundleId,
        slot.revisionId,
      );
      if (!revision)
        throw unknownReferenceError(
          'Staleness Evidence revision',
          slot.revisionId,
        );
      const dependencies = revision.dependencyDigests ?? [];
      const changedDependencies =
        dependencies.length > 0
          ? dependencies.filter(
              (dependency) =>
                input.currentDependencyDigests[dependency.dependencyId] !==
                dependency.digest,
            )
          : revision.inputDigest === input.inputVersion
            ? []
            : [
                {
                  dependencyId: 'legacy-input-version',
                  digest: revision.inputDigest,
                },
              ];
      perRevision.push({
        revisionId: revision.revisionId,
        caseId: slot.caseId,
        scopeKey: slot.scopeKey,
        stale: changedDependencies.length > 0,
        ...(changedDependencies.length > 0
          ? {
              reason: `Dependency digest changed or disappeared: ${changedDependencies
                .map((dependency) => dependency.dependencyId)
                .join(', ')}.`,
            }
          : {}),
      });
    }
    const report = StalenessReport.parse({
      schemaVersion: V2_SCHEMA_MAJOR,
      reportId: generateOperationalId('staleness'),
      workspaceId: this.workspaceId,
      bundleId: bundle.bundleId,
      snapshotId: snapshot.snapshotId,
      checkedAt: new Date().toISOString(),
      inputVersion: input.inputVersion,
      perRevision,
    });
    await this.putStalenessReport(report);
    return report;
  }

  async putStalenessReport(report: StalenessReport): Promise<void> {
    this.assertWritableStore();
    const parsed = this.parseOrThrow(
      StalenessReport,
      report,
      'StalenessReport',
    );
    if (parsed.workspaceId !== this.workspaceId) {
      throw new V2ContractError(
        'workspace-mismatch',
        `Staleness Report ${parsed.reportId} does not belong to workspace ${this.workspaceId}.`,
      );
    }
    const snapshot = await this.getSnapshot(parsed.bundleId, parsed.snapshotId);
    if (!snapshot)
      throw unknownReferenceError('Staleness Snapshot', parsed.snapshotId);
    assertStalenessReportReferences(parsed, snapshot);
    await writeImmutableJson(
      stalenessReportPath(this.root, parsed.reportId),
      'StalenessReport',
      parsed,
    );
  }

  async getStalenessReport(
    reportId: StalenessReportId,
  ): Promise<StalenessReport | undefined> {
    const raw = await readJson<unknown>(
      stalenessReportPath(this.root, reportId),
    );
    if (raw === undefined) return undefined;
    return this.parseOrThrow(StalenessReport, raw, 'StalenessReport');
  }

  async listStalenessReports(bundleId?: BundleId): Promise<StalenessReport[]> {
    const ids = (await listJsonIds(
      stalenessReportsDir(this.root),
    )) as StalenessReportId[];
    const reports = await Promise.all(
      ids.map((reportId) => this.getStalenessReport(reportId)),
    );
    return reports
      .filter(
        (report): report is StalenessReport =>
          report !== undefined &&
          (bundleId === undefined || report.bundleId === bundleId),
      )
      .sort((left, right) => right.checkedAt.localeCompare(left.checkedAt));
  }

  async putHandoff(handoff: AgentHandoff): Promise<void> {
    this.assertWritableStore();
    const parsed = this.parseOrThrow(AgentHandoff, handoff, 'AgentHandoff');
    if (parsed.workspaceId !== this.workspaceId) {
      throw new V2ContractError(
        'workspace-mismatch',
        `Handoff ${parsed.handoffId} does not belong to workspace ${this.workspaceId}.`,
      );
    }
    const bundle = await this.requireBundle(parsed.bundleId);
    const snapshot = await this.getSnapshot(parsed.bundleId, parsed.snapshotId);
    if (!snapshot)
      throw unknownReferenceError('Handoff Snapshot', parsed.snapshotId);
    const stalenessReport = await this.getStalenessReport(
      parsed.stalenessReportId,
    );
    if (!stalenessReport) {
      throw unknownReferenceError(
        'Handoff Staleness Report',
        parsed.stalenessReportId,
      );
    }
    const runs = await this.loadRuns(parsed.bundleId);
    const revisions = await this.loadRevisions(parsed.bundleId);
    assertHandoffReferences({
      workspace: this.workspaceFor(bundle),
      bundle,
      snapshot,
      runs,
      revisions,
      handoff: parsed,
      stalenessReport,
      allowedOriginBundleIds: this.foreignObjectBundleIds(
        bundle,
        runs,
        revisions,
      ),
    });
    await writeImmutableJson(
      handoffPath(this.root, parsed.handoffId),
      'AgentHandoff',
      parsed,
    );
  }

  async getHandoff(handoffId: HandoffId): Promise<AgentHandoff | undefined> {
    const raw = await readJson<unknown>(handoffPath(this.root, handoffId));
    if (raw === undefined) return undefined;
    return this.parseOrThrow(AgentHandoff, raw, 'AgentHandoff');
  }

  async listHandoffs(bundleId?: BundleId): Promise<AgentHandoff[]> {
    const ids = (await listJsonIds(handoffsDir(this.root))) as HandoffId[];
    const handoffs = await Promise.all(
      ids.map((handoffId) => this.getHandoff(handoffId)),
    );
    return handoffs
      .filter(
        (handoff): handoff is AgentHandoff =>
          handoff !== undefined &&
          (bundleId === undefined || handoff.bundleId === bundleId),
      )
      .sort((left, right) => right.createdAt.localeCompare(left.createdAt));
  }

  // ----------------------------------------------------- Capacity / clean

  async getCapacity(): Promise<StoreCapacity> {
    const usedBytes = await this.directoryByteLength(this.root);
    return {
      usedBytes,
      ...(this.maxBytes === undefined
        ? {}
        : {
            maxBytes: this.maxBytes,
            remainingBytes: Math.max(0, this.maxBytes - usedBytes),
          }),
    };
  }

  async planClean(
    options: { retainArchivedSnapshots?: number } = {},
  ): Promise<CleanPlan> {
    const retainArchivedSnapshots = options.retainArchivedSnapshots ?? 1;
    if (
      !Number.isInteger(retainArchivedSnapshots) ||
      retainArchivedSnapshots < 1
    ) {
      throw new V2ContractError(
        'invalid-schema',
        'retainArchivedSnapshots must be an integer greater than or equal to 1.',
      );
    }
    const protectedSnapshotIds =
      await this.collectWorkspaceProtectedSnapshotIds();
    const candidates: CleanCandidate[] = [];

    for (const bundleId of await this.listBundleIds()) {
      const bundle = await this.requireBundle(bundleId);
      if (bundle.status !== 'archived') continue;
      const active = await this.getActiveSnapshot(bundleId);
      if (active) protectedSnapshotIds.add(active.snapshotId);
      const snapshots = (await this.loadSnapshots(bundleId)).sort(
        (left, right) => right.committedAt.localeCompare(left.committedAt),
      );
      snapshots.slice(0, retainArchivedSnapshots).forEach((snapshot) => {
        protectedSnapshotIds.add(snapshot.snapshotId);
      });
      const keptSnapshots = snapshots.filter((snapshot) =>
        protectedSnapshotIds.has(snapshot.snapshotId),
      );
      const keptRunIds = new Set(
        keptSnapshots.flatMap((snapshot) => [
          snapshot.sourceRunId,
          ...snapshot.latestAttempts.map((ref) => ref.runId),
        ]),
      );
      const keptRevisionIds = new Set(
        keptSnapshots.flatMap((snapshot) =>
          snapshot.activeSlots.map((slot) => slot.revisionId),
        ),
      );

      for (const snapshot of snapshots) {
        if (protectedSnapshotIds.has(snapshot.snapshotId)) continue;
        candidates.push({
          kind: 'snapshot',
          bundleId,
          objectId: snapshot.snapshotId,
          byteLength: await fileByteLength(
            snapshotPath(this.root, bundleId, snapshot.snapshotId),
          ),
        });
      }
      for (const runId of await listJsonIds(runsDir(this.root, bundleId))) {
        if (keptRunIds.has(runId as RunId)) continue;
        candidates.push({
          kind: 'run',
          bundleId,
          objectId: runId,
          byteLength: await fileByteLength(
            runPath(this.root, bundleId, runId as RunId),
          ),
        });
      }
      for (const revisionId of await listJsonIds(
        evidenceRevisionsDir(this.root, bundleId),
      )) {
        if (keptRevisionIds.has(revisionId as CaseEvidenceRevisionId)) continue;
        candidates.push({
          kind: 'revision',
          bundleId,
          objectId: revisionId,
          byteLength: await fileByteLength(
            evidenceRevisionPath(
              this.root,
              bundleId,
              revisionId as CaseEvidenceRevisionId,
            ),
          ),
        });
      }
    }
    candidates.sort((left, right) =>
      `${left.bundleId}/${left.kind}/${left.objectId}`.localeCompare(
        `${right.bundleId}/${right.kind}/${right.objectId}`,
      ),
    );
    return {
      planId: generateOperationalId('clean-plan'),
      workspaceId: this.workspaceId,
      createdAt: new Date().toISOString(),
      retainArchivedSnapshots,
      candidates,
      reclaimableBytes: candidates.reduce(
        (sum, candidate) => sum + candidate.byteLength,
        0,
      ),
    };
  }

  async applyClean(plan: CleanPlan): Promise<CleanResult> {
    this.assertWritableStore();
    if (plan.workspaceId !== this.workspaceId) {
      throw new V2ContractError(
        'workspace-mismatch',
        'Clean plan belongs to a different Workspace.',
      );
    }
    const current = await this.planClean({
      retainArchivedSnapshots: plan.retainArchivedSnapshots,
    });
    const candidateKey = (candidate: CleanCandidate) =>
      `${candidate.bundleId}/${candidate.kind}/${candidate.objectId}/${candidate.byteLength}`;
    if (
      !isDeepStrictEqual(
        current.candidates.map(candidateKey),
        plan.candidates.map(candidateKey),
      )
    ) {
      throw new V2ContractError(
        'clean-plan-stale',
        'Store references changed after the clean plan was created; generate a new plan before applying.',
      );
    }
    for (const candidate of plan.candidates) {
      await rm(this.cleanCandidatePath(candidate), { force: true });
    }
    return {
      deleted: plan.candidates,
      reclaimedBytes: plan.candidates.reduce(
        (sum, candidate) => sum + candidate.byteLength,
        0,
      ),
    };
  }

  // ------------------------------------------------------------------ util

  private async validateCommitObjects(
    bundle: Bundle,
    run: Run,
    revisions: CaseEvidenceRevision[],
    previousSnapshot: BundleSnapshot | undefined,
  ): Promise<Map<CaseEvidenceRevisionId, CaseEvidenceRevision>> {
    const revisionsById = new Map<
      CaseEvidenceRevisionId,
      CaseEvidenceRevision
    >();
    for (const revision of revisions) {
      if (
        revision.bundleId !== bundle.bundleId ||
        revision.workspaceId !== this.workspaceId ||
        revision.caseId === undefined
      ) {
        throw new V2ContractError(
          'workspace-mismatch',
          `CaseEvidenceRevision ${revision.revisionId} does not belong to workspace/bundle ${this.workspaceId}/${bundle.bundleId}.`,
        );
      }
      if (revisionsById.has(revision.revisionId)) {
        throw new V2ContractError(
          'invalid-schema',
          `commitRun contains duplicate revision ${revision.revisionId}.`,
        );
      }
      revisionsById.set(revision.revisionId, revision);
    }

    for (const attempt of run.attempts) {
      if (attempt.result === 'captured' && attempt.revisionId) {
        const revision = revisionsById.get(attempt.revisionId);
        if (!revision) {
          throw unknownReferenceError(
            'CaseEvidenceRevision',
            `attempt ${attempt.attemptId} claims result=captured with revisionId ${attempt.revisionId}, but that revision was not supplied`,
          );
        }
        if (
          revision.caseId !== attempt.caseId ||
          revision.scopeKey !== attempt.scopeKey ||
          computeScopeKey(revision.captureScope) !==
            computeScopeKey(attempt.captureScope)
        ) {
          throw new V2ContractError(
            'workspace-mismatch',
            `Attempt ${attempt.attemptId} does not match captured revision ${revision.revisionId}.`,
          );
        }
      }
      if (
        attempt.result === 'reused' &&
        attempt.revisionId &&
        !revisionsById.has(attempt.revisionId)
      ) {
        const existing = await this.getEvidenceRevision(
          bundle.bundleId,
          attempt.revisionId,
        );
        if (!existing)
          throw unknownReferenceError(
            'CaseEvidenceRevision',
            attempt.revisionId,
          );
        revisionsById.set(attempt.revisionId, existing);
      }
    }

    const touchedCaseIds = new Set(
      run.attempts.map((attempt) => attempt.caseId),
    );
    for (const slot of previousSnapshot?.activeSlots ?? []) {
      if (
        !touchedCaseIds.has(slot.caseId) ||
        revisionsById.has(slot.revisionId)
      )
        continue;
      const existing = await this.getEvidenceRevision(
        bundle.bundleId,
        slot.revisionId,
      );
      if (!existing)
        throw unknownReferenceError('CaseEvidenceRevision', slot.revisionId);
      revisionsById.set(slot.revisionId, existing);
    }
    return revisionsById;
  }

  private assertCatalogCommitOwnership(
    bundle: Bundle,
    catalogs: CatalogRevision[],
  ): void {
    const kinds = new Set<string>();
    for (const catalog of catalogs) {
      if (
        catalog.workspaceId !== this.workspaceId ||
        catalog.bundleId !== bundle.bundleId ||
        catalog.prototypeId !== bundle.prototypeId
      ) {
        throw new V2ContractError(
          'workspace-mismatch',
          `CatalogRevision ${catalog.catalogRevisionId} does not belong to ${this.workspaceId}/${bundle.bundleId}/${bundle.prototypeId}.`,
        );
      }
      if (kinds.has(catalog.kind)) {
        throw new V2ContractError(
          'invalid-schema',
          `Catalog commit contains duplicate kind ${catalog.kind}.`,
        );
      }
      kinds.add(catalog.kind);
    }
  }

  private assertSnapshotGraph(
    bundle: Bundle,
    snapshot: BundleSnapshot,
    runs: Run[],
    revisions: CaseEvidenceRevision[],
  ): void {
    assertSnapshotReferences({
      workspace: this.workspaceFor(bundle),
      bundle,
      snapshot,
      runs,
      revisions,
      allowedOriginBundleIds: this.foreignObjectBundleIds(
        bundle,
        runs,
        revisions,
      ),
    });
  }

  private workspaceFor(bundle: Bundle): Workspace {
    return Workspace.parse({
      schemaVersion: V2_SCHEMA_MAJOR,
      workspaceId: this.workspaceId,
      prototypeIds: [bundle.prototypeId],
      createdAt: bundle.createdAt,
    });
  }

  private foreignObjectBundleIds(
    bundle: Bundle,
    runs: readonly Run[],
    revisions: readonly CaseEvidenceRevision[],
  ): BundleId[] {
    if (!bundle.originSnapshotId) return [];
    return [
      ...new Set(
        [
          ...runs.map((run) => run.bundleId),
          ...revisions.map((revision) => revision.bundleId),
        ].filter((bundleId) => bundleId !== bundle.bundleId),
      ),
    ] as BundleId[];
  }

  private async loadRuns(bundleId: BundleId): Promise<Run[]> {
    const ids = (await listJsonIds(runsDir(this.root, bundleId))) as RunId[];
    const runs = await Promise.all(
      ids.map((runId) => this.getRun(bundleId, runId)),
    );
    return runs.filter((run): run is Run => run !== undefined);
  }

  private async loadRevisions(
    bundleId: BundleId,
  ): Promise<CaseEvidenceRevision[]> {
    const ids = (await listJsonIds(
      evidenceRevisionsDir(this.root, bundleId),
    )) as CaseEvidenceRevisionId[];
    const revisions = await Promise.all(
      ids.map((revisionId) => this.getEvidenceRevision(bundleId, revisionId)),
    );
    return revisions.filter(
      (revision): revision is CaseEvidenceRevision => revision !== undefined,
    );
  }

  private async loadSnapshots(bundleId: BundleId): Promise<BundleSnapshot[]> {
    const ids = await this.listSnapshotIds(bundleId);
    const snapshots = await Promise.all(
      ids.map((snapshotId) => this.getSnapshot(bundleId, snapshotId)),
    );
    return snapshots.filter(
      (snapshot): snapshot is BundleSnapshot => snapshot !== undefined,
    );
  }

  private async listBundleIds(): Promise<BundleId[]> {
    try {
      const entries = await readdir(bundlesDir(this.root), {
        withFileTypes: true,
      });
      return entries
        .filter((entry) => entry.isDirectory() && !entry.name.startsWith('.'))
        .map((entry) => entry.name as BundleId);
    } catch (error) {
      if (this.isEnoent(error)) return [];
      throw error;
    }
  }

  private async assertBlobOwnerExists(
    bundleId: BundleId,
    ownerRef: PutBlobInput['ownerRefs'][number],
  ): Promise<void> {
    const exists =
      ownerRef.kind === 'revision'
        ? await this.getEvidenceRevision(
            bundleId,
            ownerRef.objectId as CaseEvidenceRevisionId,
          )
        : ownerRef.kind === 'snapshot'
          ? await this.getSnapshot(bundleId, ownerRef.objectId as SnapshotId)
          : ownerRef.kind === 'run'
            ? await this.getRun(bundleId, ownerRef.objectId as RunId)
            : await this.getCatalogRevision(
                bundleId,
                ownerRef.objectId as CatalogRevisionId,
              );
    if (!exists)
      throw unknownReferenceError(
        `Blob ${ownerRef.kind} owner`,
        ownerRef.objectId,
      );
  }

  private isAllowedBlobMediaType(mediaType: string): boolean {
    return new Set([
      'image/png',
      'image/jpeg',
      'image/webp',
      'application/json',
      'application/zip',
      'text/plain',
    ]).has(mediaType);
  }

  private serializedBytes(...values: unknown[]): number {
    return values.reduce<number>(
      (sum, value) =>
        sum + Buffer.byteLength(`${JSON.stringify(value, null, 2)}\n`),
      0,
    );
  }

  private async assertCapacity(additionalBytes: number): Promise<void> {
    if (this.maxBytes === undefined) return;
    const capacity = await this.getCapacity();
    if (capacity.usedBytes + additionalBytes > this.maxBytes) {
      throw new V2ContractError(
        'capacity-exceeded',
        `Store capacity would exceed ${this.maxBytes} bytes (${capacity.usedBytes} used + ${additionalBytes} requested).`,
      );
    }
  }

  private async directoryByteLength(dir: string): Promise<number> {
    try {
      const entries = await readdir(dir, { withFileTypes: true });
      let total = 0;
      for (const entry of entries) {
        const entryPath = path.join(dir, entry.name);
        if (entry.isDirectory())
          total += await this.directoryByteLength(entryPath);
        else if (entry.isFile()) total += (await stat(entryPath)).size;
      }
      return total;
    } catch (error) {
      if (this.isEnoent(error)) return 0;
      throw error;
    }
  }

  private async collectWorkspaceProtectedSnapshotIds(): Promise<
    Set<SnapshotId>
  > {
    const protectedIds = new Set<SnapshotId>();
    for (const handoffId of (await listJsonIds(
      handoffsDir(this.root),
    )) as HandoffId[]) {
      const handoff = await this.getHandoff(handoffId);
      if (handoff) protectedIds.add(handoff.snapshotId);
    }
    for (const reportId of (await listJsonIds(
      stalenessReportsDir(this.root),
    )) as StalenessReportId[]) {
      const report = await this.getStalenessReport(reportId);
      if (report) protectedIds.add(report.snapshotId);
    }
    for (const bundleId of await this.listBundleIds()) {
      const bundle = await this.getBundle(bundleId);
      if (bundle?.originSnapshotId) protectedIds.add(bundle.originSnapshotId);
    }
    return protectedIds;
  }

  private cleanCandidatePath(candidate: CleanCandidate): string {
    if (candidate.kind === 'snapshot') {
      return snapshotPath(
        this.root,
        candidate.bundleId,
        candidate.objectId as SnapshotId,
      );
    }
    if (candidate.kind === 'run') {
      return runPath(
        this.root,
        candidate.bundleId,
        candidate.objectId as RunId,
      );
    }
    return evidenceRevisionPath(
      this.root,
      candidate.bundleId,
      candidate.objectId as CaseEvidenceRevisionId,
    );
  }

  private isEnoent(error: unknown): boolean {
    return (
      typeof error === 'object' &&
      error !== null &&
      'code' in error &&
      (error as { code?: unknown }).code === 'ENOENT'
    );
  }

  private parseOrThrow<T>(
    schema: {
      safeParse: (value: unknown) => {
        success: boolean;
        data?: T;
        error?: import('zod').ZodError;
      };
    },
    value: unknown,
    kind: string,
  ): T {
    const result = schema.safeParse(value);
    if (!result.success) throw invalidSchemaError(kind, result.error!);
    return result.data as T;
  }
}
