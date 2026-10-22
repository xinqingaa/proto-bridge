import {
  CaseAttempt,
  type CaseAttempt as CaseAttemptType,
} from '../contracts/attempt.js';
import {
  CaseEvidenceRevision,
  type CaseEvidenceRevision as CaseEvidenceRevisionType,
} from '../contracts/evidence.js';
import { Run, type Run as RunType } from '../contracts/run.js';
import {
  CatalogRevision,
  type CatalogRevision as CatalogRevisionType,
} from '../contracts/catalog.js';
import { computeScopeKey } from '../contracts/scope.js';
import {
  evidenceLevelAtLeast,
  isTerminalJobStatus,
  type AttemptResult,
} from '../contracts/vocabulary.js';
import { V2_SCHEMA_MAJOR } from '../contracts/version.js';
import type { BundleSnapshot } from '../contracts/snapshot.js';
import type { JobId } from '../contracts/ids.js';
import type { StagedBinaryInput, V2Store } from '../store/types.js';
import { generateOperationalId } from '../store/id-generator.js';
import {
  computeAttemptCoverage,
  issuesForCapturedRevisions,
} from '../store/snapshot-builder.js';
import type { CapturedBinary, CaseCaptureDriver } from './playwright-driver.js';
import { CaseCaptureFailure } from './playwright-driver.js';
import {
  assertPreflightReady,
  digestCaptureInput,
  type CapturePreflight,
} from './preflight.js';

export type CaptureOrchestratorInput = {
  store: V2Store;
  bundleId: string;
  preflight: CapturePreflight;
  runtimeBaseUrl: string;
  driver: CaseCaptureDriver;
  /** A Job already durably accepted by CaptureJobHost/Local Service. */
  jobId?: JobId;
  signal?: AbortSignal;
  now?: () => Date;
};

export type CaptureOrchestratorResult = {
  run: RunType;
  snapshot: BundleSnapshot;
  jobId: string;
  storedBlobIds: string[];
};

function resultReason(error: unknown): string {
  return (error instanceof Error ? error.message : String(error)).slice(
    0,
    2000,
  );
}

function attemptResultToTermination(
  attempts: CaseAttemptType[],
  cancelled: boolean,
): 'completed' | 'cancelled' | 'failed' {
  if (cancelled) return 'cancelled';
  return attempts.some(
    (attempt) => attempt.result === 'captured' || attempt.result === 'reused',
  )
    ? 'completed'
    : 'failed';
}

function stagedBinaries(
  binaries: readonly CapturedBinary[],
  owner: StagedBinaryInput['owner'],
): StagedBinaryInput[] {
  return binaries.map((binary) => ({ ...binary, owner }));
}

/**
 * Executes a Preflight-fixed Matrix, isolates Case failures, and commits
 * one immutable Run/Snapshot through the real V2Store transaction. Every
 * finished Case is durably staged before the next one starts, so a writer
 * crash only loses the Case in flight (see `V2Store.stageJobCase`).
 */
export async function capturePreflightToStore(
  input: CaptureOrchestratorInput,
): Promise<CaptureOrchestratorResult> {
  assertPreflightReady(input.preflight);
  const now = input.now ?? (() => new Date());
  const runId = generateOperationalId('run', now());
  const job = input.jobId
    ? await input.store.getJob(input.jobId)
    : await input.store.createJob({
        bundleId: input.bundleId,
        selection: input.preflight.selection,
        inputVersion: input.preflight.inputVersion,
      });
  if (!job) {
    throw new Error(`Capture Job ${input.jobId} no longer exists.`);
  }
  if (
    job.bundleId !== input.bundleId ||
    job.inputVersion !== input.preflight.inputVersion ||
    JSON.stringify(job.selection) !== JSON.stringify(input.preflight.selection)
  ) {
    throw new Error(
      `Capture Job ${job.jobId} does not match the fixed Preflight input.`,
    );
  }
  await input.store.startJob(job.jobId, runId);
  try {
    return await executeStartedJob(
      input,
      job.jobId,
      job.acceptedAt,
      runId,
      now,
    );
  } catch (error) {
    const current = await input.store.getJob(job.jobId).catch(() => undefined);
    if (current && !isTerminalJobStatus(current.status)) {
      await input.store
        .appendJobJournal(job.jobId, {
          event:
            current.status === 'writing' ? 'commit-failed' : 'execution-failed',
          detail: resultReason(error),
        })
        .catch(() => undefined);
      await input.store.finalizeJob(job.jobId, 'failed');
    }
    throw error;
  }
}

async function executeStartedJob(
  input: CaptureOrchestratorInput,
  jobId: JobId,
  acceptedAt: string,
  runId: string,
  now: () => Date,
): Promise<CaptureOrchestratorResult> {
  const { store } = input;
  await store.advanceJob(jobId, 'capturing');

  const existingCatalogs = (await store.getBundle(input.bundleId))
    ? await store.listCatalogRevisions(input.bundleId)
    : [];
  const catalogs: CatalogRevisionType[] = [];
  for (const catalog of input.preflight.catalogInputs) {
    const existing = existingCatalogs.find(
      (candidate) =>
        candidate.kind === catalog.kind &&
        candidate.inputDigest === catalog.inputDigest,
    );
    if (existing) {
      catalogs.push(existing);
      continue;
    }
    const catalogRevisionId = generateOperationalId('catalog', now());
    const entries = catalog.entries.map((entry) => ({
      ...entry,
      blobIds: [...entry.blobIds],
    }));
    catalogs.push(
      CatalogRevision.parse({
        schemaVersion: V2_SCHEMA_MAJOR,
        catalogRevisionId,
        workspaceId: store.workspaceId,
        bundleId: input.bundleId,
        prototypeId: input.preflight.selection.prototypeId,
        kind: catalog.kind,
        inputDigest: catalog.inputDigest,
        createdAt: now().toISOString(),
        entries,
      }),
    );
  }
  await store.stageJobCatalogs(jobId, catalogs);
  // DS owns the asset bytes and Target exports. Capture fixes Catalog
  // metadata only; a redundant download must not prevent any Case from running.

  const attempts: CaseAttemptType[] = [];
  const revisions: CaseEvidenceRevisionType[] = [];
  let cancelled = false;

  const finishCase = async (
    attempt: CaseAttemptType,
    revision: CaseEvidenceRevisionType | undefined,
    binaries: StagedBinaryInput[],
  ): Promise<void> => {
    let staged = { attempt, revision };
    try {
      await store.stageJobCase(jobId, {
        attempt,
        ...(revision ? { revision } : {}),
        binaries,
      });
    } catch (error) {
      const required = revision
        ? binaries.filter((binary) => binary.kind === 'screenshot')
        : [];
      const optional = binaries.filter((binary) => !required.includes(binary));
      let recovered = false;
      if (optional.length > 0) {
        await store.appendJobJournal(jobId, {
          event: 'blob-write-failed',
          detail: `${attempt.caseId}:${resultReason(error)}`,
        });
        try {
          await store.stageJobCase(jobId, {
            attempt,
            ...(revision ? { revision } : {}),
            binaries: required,
          });
          recovered = true;
        } catch (retryError) {
          error = retryError;
        }
      }
      if (!recovered) {
        if (!revision || required.length === 0) throw error;
        // A captured Case without its required screenshot is not Evidence.
        const { revisionId: _dropped, ...rest } = attempt;
        const failed = CaseAttempt.parse({
          ...rest,
          result: 'failed',
          reason:
            `Required screenshot Blob could not be written: ${resultReason(error)}`.slice(
              0,
              2000,
            ),
        });
        await store.stageJobCase(jobId, { attempt: failed });
        staged = { attempt: failed, revision: undefined };
      }
    }
    attempts.push(staged.attempt);
    if (staged.revision) revisions.push(staged.revision);
    await store.appendJobJournal(jobId, {
      event: 'case-finished',
      detail:
        staged.attempt.result === 'failed'
          ? `${staged.attempt.caseId}:failed:${staged.attempt.reason ?? ''}`
          : `${staged.attempt.caseId}:${staged.attempt.result}`,
    });
  };

  for (const entry of input.preflight.matrix) {
    if (input.signal?.aborted) {
      cancelled = true;
      break;
    }
    const startedAt = now().toISOString();
    await store.appendJobJournal(jobId, {
      event: 'case-started',
      detail: entry.selectedCase.caseId,
    });
    const scopeKey = computeScopeKey(entry.selectedCase.captureScope);
    const baseAttempt = {
      schemaVersion: V2_SCHEMA_MAJOR,
      runId,
      caseId: entry.selectedCase.caseId,
      captureScope: entry.selectedCase.captureScope,
      scopeKey,
      startedAt,
    };
    const inputDigest = digestCaptureInput({
      manifestDigest: input.preflight.manifestDigest,
      caseKey: entry.selectedCase.caseKey,
      scenario: entry.scenario,
    });
    const reusable = await store.findReusableEvidence({
      bundleId: input.bundleId,
      caseId: entry.selectedCase.caseId,
      captureScope: entry.selectedCase.captureScope,
      inputDigest,
      minimumEvidenceLevel: entry.selectedCase.captureScope.minEvidenceLevel,
    });
    if (reusable) {
      const attempt = CaseAttempt.parse({
        ...baseAttempt,
        attemptId: generateOperationalId('attempt', now()),
        result: 'reused',
        revisionId: reusable.revisionId,
        endedAt: now().toISOString(),
      });
      await store.stageJobCase(jobId, { attempt });
      attempts.push(attempt);
      revisions.push(reusable);
      await store.appendJobJournal(jobId, {
        event: 'case-finished',
        detail: `${entry.selectedCase.caseId}:reused`,
      });
      continue;
    }

    try {
      const captured = await input.driver.captureCase({
        entry,
        preflight: input.preflight,
        runtimeBaseUrl: input.runtimeBaseUrl,
        ...(input.signal ? { signal: input.signal } : {}),
      });
      if (
        !evidenceLevelAtLeast(
          captured.evidenceLevel,
          entry.selectedCase.captureScope.minEvidenceLevel,
        )
      ) {
        await finishCase(
          CaseAttempt.parse({
            ...baseAttempt,
            attemptId: generateOperationalId('attempt', now()),
            result: 'unsupported',
            reason: `Captured Evidence Level ${captured.evidenceLevel} is below required ${entry.selectedCase.captureScope.minEvidenceLevel}.`,
            endedAt: now().toISOString(),
          }),
          undefined,
          [],
        );
        continue;
      }
      const revisionId = generateOperationalId('revision', now());
      const revision = CaseEvidenceRevision.parse({
        schemaVersion: V2_SCHEMA_MAJOR,
        revisionId,
        workspaceId: store.workspaceId,
        bundleId: input.bundleId,
        caseId: entry.selectedCase.caseId,
        captureScope: entry.selectedCase.captureScope,
        scopeKey,
        evidenceLevel: captured.evidenceLevel,
        inputDigest,
        dependencyDigests: [
          {
            dependencyId: `manifest:${input.preflight.selection.prototypeId}`,
            digest: input.preflight.manifestDigest,
          },
          {
            dependencyId: `runtime:${entry.selectedCase.caseKey.screenId}`,
            digest: input.preflight.inputVersion,
          },
        ],
        capturedAt: now().toISOString(),
        facts: captured.facts,
        requiredFactsTotal: captured.requiredFactsTotal,
        requiredFactsResolved: captured.requiredFactsResolved,
      });
      await finishCase(
        CaseAttempt.parse({
          ...baseAttempt,
          attemptId: generateOperationalId('attempt', now()),
          result: 'captured',
          revisionId,
          endedAt: now().toISOString(),
        }),
        revision,
        stagedBinaries(captured.binaries, 'revision'),
      );
    } catch (error) {
      const result: AttemptResult = input.signal?.aborted
        ? 'cancelled'
        : 'failed';
      if (result === 'cancelled') cancelled = true;
      await finishCase(
        CaseAttempt.parse({
          ...baseAttempt,
          attemptId: generateOperationalId('attempt', now()),
          result,
          ...(result === 'failed' ? { reason: resultReason(error) } : {}),
          endedAt: now().toISOString(),
        }),
        undefined,
        error instanceof CaseCaptureFailure
          ? stagedBinaries(error.binaries, 'run')
          : [],
      );
    }
  }

  if (cancelled) {
    const attemptedCaseIds = new Set(attempts.map((attempt) => attempt.caseId));
    for (const entry of input.preflight.matrix) {
      if (attemptedCaseIds.has(entry.selectedCase.caseId)) continue;
      attempts.push(
        CaseAttempt.parse({
          schemaVersion: V2_SCHEMA_MAJOR,
          attemptId: generateOperationalId('attempt', now()),
          runId,
          caseId: entry.selectedCase.caseId,
          captureScope: entry.selectedCase.captureScope,
          scopeKey: computeScopeKey(entry.selectedCase.captureScope),
          result: 'cancelled',
          startedAt: now().toISOString(),
          endedAt: now().toISOString(),
        }),
      );
    }
  }

  const coverage = computeAttemptCoverage(attempts, revisions);
  const terminationReason = attemptResultToTermination(attempts, cancelled);
  const run = Run.parse({
    schemaVersion: V2_SCHEMA_MAJOR,
    runId,
    workspaceId: store.workspaceId,
    bundleId: input.bundleId,
    selection: input.preflight.selection,
    inputVersion: input.preflight.inputVersion,
    startedAt: acceptedAt,
    endedAt: now().toISOString(),
    terminationReason,
    attempts,
    coverage,
  });

  await store.advanceJob(jobId, 'writing');
  const newlyCaptured = revisions.filter((revision) =>
    attempts.some(
      (attempt) =>
        attempt.result === 'captured' &&
        attempt.revisionId === revision.revisionId,
    ),
  );
  const transaction = {
    bundleId: input.bundleId,
    run,
    revisions: newlyCaptured,
    coverage,
    catalogs,
    issues: issuesForCapturedRevisions(newlyCaptured),
    stagedJobId: jobId,
  };
  const committed = (await store.getBundle(input.bundleId))
    ? await store.commitRun(transaction)
    : await store.createBundle({
        ...transaction,
        prototypeId: input.preflight.selection.prototypeId,
      });
  await store.finalizeJob(jobId, terminationReason);
  return {
    run: committed.run,
    snapshot: committed.snapshot,
    jobId,
    storedBlobIds: committed.blobIds ?? [],
  };
}
