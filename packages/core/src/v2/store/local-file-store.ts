import { mkdir } from 'node:fs/promises';
import { Bundle } from '../contracts/bundle.js';
import { CaseEvidenceRevision } from '../contracts/evidence.js';
import { AgentHandoff } from '../contracts/handoff.js';
import { V2ContractError, invalidSchemaError, unknownReferenceError } from '../contracts/errors.js';
import type {
  BundleId,
  CaseEvidenceRevisionId,
  HandoffId,
  JobId,
  PrototypeId,
  RunId,
  SnapshotId,
  StalenessReportId,
  WorkspaceId,
} from '../contracts/ids.js';
import { assertJobStatusTransition, CaptureJob } from '../contracts/job.js';
import { Run } from '../contracts/run.js';
import { BundleSnapshot } from '../contracts/snapshot.js';
import { StalenessReport } from '../contracts/staleness.js';
import { EVIDENCE_LEVELS, type ExecutingJobStatus, isTerminalJobStatus, type TerminalJobStatus } from '../contracts/vocabulary.js';
import { V2_SCHEMA_MAJOR } from '../contracts/version.js';
import {
  listJsonIds,
  readJson,
  writeImmutableJson,
  writeJsonAtomic,
} from './atomic-file.js';
import { generateOperationalId } from './id-generator.js';
import {
  activeSnapshotPointerPath,
  bundleManifestPath,
  evidenceRevisionPath,
  handoffPath,
  jobPath,
  jobsDir,
  runPath,
  snapshotPath,
  snapshotsDir,
  stalenessReportPath,
  workspaceManifestPath,
} from './paths.js';
import { buildNextSnapshot } from './snapshot-builder.js';
import type { CommitRunInput, CommitRunResult, CreateJobInput, InitResult, JobJournalEntryInput, V2Store } from './types.js';
import { acquireWriterLock } from './writer-lock.js';

type ActiveSnapshotPointer = { snapshotId: SnapshotId };

export type LocalFileStoreOptions = {
  /** Directory this Store persists into. Created if it does not exist. */
  root: string;
  workspaceId: WorkspaceId;
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
  private releaseLock: (() => Promise<void>) | undefined;

  constructor(options: LocalFileStoreOptions) {
    this.root = options.root;
    this.workspaceId = options.workspaceId;
  }

  async init(): Promise<InitResult> {
    await mkdir(this.root, { recursive: true });
    this.releaseLock = await acquireWriterLock(this.root);

    const manifest = await readJson<{ schemaVersion: number; workspaceId: WorkspaceId; createdAt: string }>(
      workspaceManifestPath(this.root),
    );
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
  }

  async close(): Promise<void> {
    await this.releaseLock?.();
    this.releaseLock = undefined;
  }

  // ---------------------------------------------------------------- Bundle

  async ensureBundle(input: { bundleId: BundleId; prototypeId: PrototypeId }): Promise<Bundle> {
    const existing = await this.getBundle(input.bundleId);
    if (existing) {
      if (existing.prototypeId !== input.prototypeId) {
        throw new V2ContractError(
          'workspace-mismatch',
          `Bundle ${input.bundleId} already exists for prototype ${existing.prototypeId}, not ${input.prototypeId}.`,
        );
      }
      return existing;
    }
    const bundle = Bundle.parse({
      schemaVersion: V2_SCHEMA_MAJOR,
      bundleId: input.bundleId,
      workspaceId: this.workspaceId,
      prototypeId: input.prototypeId,
      status: 'writable',
      createdAt: new Date().toISOString(),
    });
    await writeJsonAtomic(bundleManifestPath(this.root, input.bundleId), bundle);
    return bundle;
  }

  async getBundle(bundleId: BundleId): Promise<Bundle | undefined> {
    const raw = await readJson<unknown>(bundleManifestPath(this.root, bundleId));
    if (raw === undefined) return undefined;
    return this.parseOrThrow(Bundle, raw, 'Bundle');
  }

  private async requireBundle(bundleId: BundleId): Promise<Bundle> {
    const bundle = await this.getBundle(bundleId);
    if (!bundle) throw unknownReferenceError('Bundle', bundleId);
    return bundle;
  }

  // -------------------------------------------------------------------- Job

  async createJob(input: CreateJobInput): Promise<CaptureJob> {
    await this.requireBundle(input.bundleId);
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
    const job = await this.requireJob(jobId);
    assertJobStatusTransition(job.status, 'discovering');
    const now = new Date().toISOString();
    const next = CaptureJob.parse({
      ...job,
      status: 'discovering',
      startedAt: now,
      runId,
      journal: [...job.journal, { at: now, event: 'discovering', detail: runId }],
    });
    await writeJsonAtomic(jobPath(this.root, jobId), next);
    return next;
  }

  async advanceJob(jobId: JobId, status: Exclude<ExecutingJobStatus, 'discovering'>): Promise<CaptureJob> {
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

  async appendJobJournal(jobId: JobId, entry: JobJournalEntryInput): Promise<CaptureJob> {
    const job = await this.requireJob(jobId);
    if (isTerminalJobStatus(job.status)) {
      throw new V2ContractError('immutable-violation', `Job ${jobId} is already terminal (${job.status}); its journal can no longer grow.`);
    }
    const next = CaptureJob.parse({
      ...job,
      journal: [...job.journal, { at: new Date().toISOString(), ...entry }],
    });
    await writeJsonAtomic(jobPath(this.root, jobId), next);
    return next;
  }

  async finalizeJob(jobId: JobId, status: TerminalJobStatus): Promise<CaptureJob> {
    const job = await this.requireJob(jobId);
    assertJobStatusTransition(job.status, status);
    const now = new Date().toISOString();
    const next = CaptureJob.parse({
      ...job,
      status,
      endedAt: now,
      journal: [...job.journal, { at: now, event: 'finalized', detail: status }],
    });
    await writeJsonAtomic(jobPath(this.root, jobId), next);
    return next;
  }

  async listNonTerminalJobs(): Promise<CaptureJob[]> {
    const ids = await listJsonIds(jobsDir(this.root));
    const jobs = await Promise.all(ids.map((id) => this.requireJob(id as JobId)));
    return jobs.filter((job) => !isTerminalJobStatus(job.status));
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
        evidenceLevelBreakdown: Object.fromEntries(EVIDENCE_LEVELS.map((level) => [level, 0])) as Record<(typeof EVIDENCE_LEVELS)[number], number>,
        factQuality: { traceable: 0, heuristic: 0, unknown: 0, conflict: 0 },
        denominator: selectedCount,
      },
    });

    await this.commitRun({ bundleId: job.bundleId, run, revisions: [], coverage: run.coverage });

    await writeJsonAtomic(jobPath(this.root, job.jobId), CaptureJob.parse({
      ...job,
      status: 'interrupted',
      runId,
      startedAt: job.startedAt ?? job.acceptedAt,
      endedAt: now,
      journal: [...job.journal, { at: now, event: 'finalized-orphan', detail: `synthesized interrupted Run ${runId}` }],
    }));
  }

  // ------------------------------------------------------------------- Run

  async getRun(bundleId: BundleId, runId: RunId): Promise<Run | undefined> {
    const raw = await readJson<unknown>(runPath(this.root, bundleId, runId));
    if (raw === undefined) return undefined;
    return this.parseOrThrow(Run, raw, 'Run');
  }

  // ------------------------------------------------------- Evidence revision

  async getEvidenceRevision(bundleId: BundleId, revisionId: CaseEvidenceRevisionId): Promise<CaseEvidenceRevision | undefined> {
    const raw = await readJson<unknown>(evidenceRevisionPath(this.root, bundleId, revisionId));
    if (raw === undefined) return undefined;
    return this.parseOrThrow(CaseEvidenceRevision, raw, 'CaseEvidenceRevision');
  }

  // -------------------------------------------------------------- Snapshot

  async getActiveSnapshot(bundleId: BundleId): Promise<BundleSnapshot | undefined> {
    const pointer = await readJson<ActiveSnapshotPointer>(activeSnapshotPointerPath(this.root, bundleId));
    if (!pointer) return undefined;
    return this.getSnapshot(bundleId, pointer.snapshotId);
  }

  async getSnapshot(bundleId: BundleId, snapshotId: SnapshotId): Promise<BundleSnapshot | undefined> {
    const raw = await readJson<unknown>(snapshotPath(this.root, bundleId, snapshotId));
    if (raw === undefined) return undefined;
    return this.parseOrThrow(BundleSnapshot, raw, 'BundleSnapshot');
  }

  async listSnapshotIds(bundleId: BundleId): Promise<SnapshotId[]> {
    return (await listJsonIds(snapshotsDir(this.root, bundleId))) as SnapshotId[];
  }

  // ---------------------------------------------------------------- Commit

  async commitRun(input: CommitRunInput): Promise<CommitRunResult> {
    const { bundleId, coverage } = input;
    const run = this.parseOrThrow(Run, input.run, 'Run');
    if (run.bundleId !== bundleId) {
      throw new V2ContractError('workspace-mismatch', `Run.bundleId (${run.bundleId}) does not match the target Bundle (${bundleId}).`);
    }
    if (run.workspaceId !== this.workspaceId) {
      throw new V2ContractError('workspace-mismatch', `Run.workspaceId (${run.workspaceId}) does not match this Store's workspace (${this.workspaceId}).`);
    }
    await this.requireBundle(bundleId);

    const revisions = input.revisions.map((revision) => this.parseOrThrow(CaseEvidenceRevision, revision, 'CaseEvidenceRevision'));
    for (const revision of revisions) {
      if (revision.bundleId !== bundleId || revision.workspaceId !== this.workspaceId) {
        throw new V2ContractError('workspace-mismatch', `CaseEvidenceRevision ${revision.revisionId} does not belong to workspace/bundle ${this.workspaceId}/${bundleId}.`);
      }
    }
    const revisionsById = new Map(revisions.map((revision) => [revision.revisionId, revision]));

    for (const attempt of run.attempts) {
      if (attempt.result !== 'captured' || !attempt.revisionId) continue;
      if (!revisionsById.has(attempt.revisionId)) {
        throw unknownReferenceError(
          'CaseEvidenceRevision',
          `attempt ${attempt.attemptId} claims result=captured with revisionId ${attempt.revisionId}, but that revision was not supplied in commitRun's revisions[]`,
        );
      }
    }
    for (const attempt of run.attempts) {
      if (attempt.result !== 'reused' || !attempt.revisionId || revisionsById.has(attempt.revisionId)) continue;
      const existing = await this.getEvidenceRevision(bundleId, attempt.revisionId);
      if (!existing) throw unknownReferenceError('CaseEvidenceRevision', attempt.revisionId);
      revisionsById.set(attempt.revisionId, existing);
    }

    const previousSnapshot = await this.getActiveSnapshot(bundleId);
    const touchedCaseIds = new Set(run.attempts.map((attempt) => attempt.caseId));
    for (const slot of previousSnapshot?.activeSlots ?? []) {
      if (!touchedCaseIds.has(slot.caseId) || revisionsById.has(slot.revisionId)) continue;
      const existing = await this.getEvidenceRevision(bundleId, slot.revisionId);
      if (!existing) throw unknownReferenceError('CaseEvidenceRevision', slot.revisionId);
      revisionsById.set(slot.revisionId, existing);
    }

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
      }),
      'BundleSnapshot',
    );

    // Every step above only reads or validates; nothing on disk changes until we're certain the whole
    // transaction is valid. From here, we only ever create brand-new immutable files, and the final
    // pointer flip is the single atomic rename that makes this Run's outcome visible
    // (pb-v2-spec.md "写入失败时旧 active Snapshot 保持不变").
    for (const revision of revisions) {
      await writeImmutableJson(evidenceRevisionPath(this.root, bundleId, revision.revisionId), 'CaseEvidenceRevision', revision);
    }
    await writeImmutableJson(runPath(this.root, bundleId, run.runId), 'Run', run);
    await writeImmutableJson(snapshotPath(this.root, bundleId, snapshotId), 'BundleSnapshot', nextSnapshot);
    await writeJsonAtomic(activeSnapshotPointerPath(this.root, bundleId), { snapshotId } satisfies ActiveSnapshotPointer);

    return { run, snapshot: nextSnapshot };
  }

  // ----------------------------------------------------- Staleness/Handoff

  async putStalenessReport(report: StalenessReport): Promise<void> {
    const parsed = this.parseOrThrow(StalenessReport, report, 'StalenessReport');
    await writeImmutableJson(stalenessReportPath(this.root, parsed.reportId), 'StalenessReport', parsed);
  }

  async getStalenessReport(reportId: StalenessReportId): Promise<StalenessReport | undefined> {
    const raw = await readJson<unknown>(stalenessReportPath(this.root, reportId));
    if (raw === undefined) return undefined;
    return this.parseOrThrow(StalenessReport, raw, 'StalenessReport');
  }

  async putHandoff(handoff: AgentHandoff): Promise<void> {
    const parsed = this.parseOrThrow(AgentHandoff, handoff, 'AgentHandoff');
    if (parsed.workspaceId !== this.workspaceId) {
      throw new V2ContractError('workspace-mismatch', `Handoff ${parsed.handoffId} does not belong to workspace ${this.workspaceId}.`);
    }
    await writeImmutableJson(handoffPath(this.root, parsed.handoffId), 'AgentHandoff', parsed);
  }

  async getHandoff(handoffId: HandoffId): Promise<AgentHandoff | undefined> {
    const raw = await readJson<unknown>(handoffPath(this.root, handoffId));
    if (raw === undefined) return undefined;
    return this.parseOrThrow(AgentHandoff, raw, 'AgentHandoff');
  }

  // ------------------------------------------------------------------ util

  private parseOrThrow<T>(schema: { safeParse: (value: unknown) => { success: boolean; data?: T; error?: import('zod').ZodError } }, value: unknown, kind: string): T {
    const result = schema.safeParse(value);
    if (!result.success) throw invalidSchemaError(kind, result.error!);
    return result.data as T;
  }
}
