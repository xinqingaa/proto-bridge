import {
  CaseAttempt,
  type CaseAttempt as CaseAttemptType,
} from '../contracts/attempt.js';
import {
  CaseEvidenceRevision,
  type CaseEvidenceRevision as CaseEvidenceRevisionType,
} from '../contracts/evidence.js';
import { CoverageSummary, type CoverageSummary as CoverageSummaryType } from '../contracts/coverage.js';
import { Run, type Run as RunType } from '../contracts/run.js';
import { computeScopeKey } from '../contracts/scope.js';
import { evidenceLevelAtLeast, type AttemptResult, type EvidenceLevel } from '../contracts/vocabulary.js';
import { V2_SCHEMA_MAJOR } from '../contracts/version.js';
import type { BundleSnapshot } from '../contracts/snapshot.js';
import type { V2Store } from '../store/types.js';
import { generateOperationalId } from '../store/id-generator.js';
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
  signal?: AbortSignal;
  now?: () => Date;
};

export type CaptureOrchestratorResult = {
  run: RunType;
  snapshot: BundleSnapshot;
  jobId: string;
  storedBlobIds: string[];
};

type PendingBinary = {
  binary: CapturedBinary;
  owner: { kind: 'revision'; objectId: string } | { kind: 'run'; objectId: string };
};

function emptyCounts(selected: number): CoverageSummaryType['counts'] {
  return {
    selected,
    captured: 0,
    reused: 0,
    failed: 0,
    skipped: 0,
    unsupported: 0,
    cancelled: 0,
    interrupted: 0,
    missing: 0,
    stale: 0,
  };
}

function coverageFor(
  attempts: CaseAttemptType[],
  revisions: CaseEvidenceRevisionType[],
): CoverageSummaryType {
  const counts = emptyCounts(attempts.length);
  for (const attempt of attempts) counts[attempt.result] += 1;
  const evidenceLevelBreakdown: Partial<Record<EvidenceLevel, number>> = {};
  let traceable = 0;
  let heuristic = 0;
  let unknown = 0;
  let conflict = 0;
  for (const revision of revisions) {
    evidenceLevelBreakdown[revision.evidenceLevel] =
      (evidenceLevelBreakdown[revision.evidenceLevel] ?? 0) + 1;
    for (const fact of revision.facts) {
      if (fact.resolution === 'unknown') unknown += 1;
      else if (fact.resolution === 'unresolved-conflict') conflict += 1;
      else if (
        fact.candidates.some(
          (candidate) =>
            candidate.provenance.source === 'heuristic' ||
            candidate.provenance.confidence === 'low',
        )
      ) {
        heuristic += 1;
      } else {
        traceable += 1;
      }
    }
  }
  return CoverageSummary.parse({
    counts,
    evidenceLevelBreakdown,
    factQuality: { traceable, heuristic, unknown, conflict },
    denominator: attempts.length,
  });
}

function resultReason(error: unknown): string {
  return (error instanceof Error ? error.message : String(error)).slice(0, 2000);
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

/**
 * Executes a Preflight-fixed Matrix, isolates Case failures, and commits
 * one immutable Run/Snapshot through the real V2Store transaction.
 */
export async function capturePreflightToStore(
  input: CaptureOrchestratorInput,
): Promise<CaptureOrchestratorResult> {
  assertPreflightReady(input.preflight);
  const now = input.now ?? (() => new Date());
  const runId = generateOperationalId('run', now());
  const job = await input.store.createJob({
    bundleId: input.bundleId,
    selection: input.preflight.selection,
    inputVersion: input.preflight.inputVersion,
  });
  await input.store.startJob(job.jobId, runId);
  await input.store.advanceJob(job.jobId, 'capturing');

  const attempts: CaseAttemptType[] = [];
  const revisions: CaseEvidenceRevisionType[] = [];
  const pendingBinaries: PendingBinary[] = [];
  let cancelled = false;

  for (const entry of input.preflight.matrix) {
    if (input.signal?.aborted) {
      cancelled = true;
      break;
    }
    const startedAt = now().toISOString();
    const scopeKey = computeScopeKey(entry.selectedCase.captureScope);
    const inputDigest = digestCaptureInput({
      manifestDigest: input.preflight.manifestDigest,
      caseKey: entry.selectedCase.caseKey,
      scenario: entry.scenario,
    });
    const reusable = await input.store.findReusableEvidence({
      bundleId: input.bundleId,
      caseId: entry.selectedCase.caseId,
      captureScope: entry.selectedCase.captureScope,
      inputDigest,
      minimumEvidenceLevel: entry.selectedCase.captureScope.minEvidenceLevel,
    });
    if (reusable) {
      attempts.push(
        CaseAttempt.parse({
          schemaVersion: V2_SCHEMA_MAJOR,
          attemptId: generateOperationalId('attempt', now()),
          runId,
          caseId: entry.selectedCase.caseId,
          captureScope: entry.selectedCase.captureScope,
          scopeKey,
          result: 'reused',
          revisionId: reusable.revisionId,
          startedAt,
          endedAt: now().toISOString(),
        }),
      );
      revisions.push(reusable);
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
        attempts.push(
          CaseAttempt.parse({
            schemaVersion: V2_SCHEMA_MAJOR,
            attemptId: generateOperationalId('attempt', now()),
            runId,
            caseId: entry.selectedCase.caseId,
            captureScope: entry.selectedCase.captureScope,
            scopeKey,
            result: 'unsupported',
            reason: `Captured Evidence Level ${captured.evidenceLevel} is below required ${entry.selectedCase.captureScope.minEvidenceLevel}.`,
            startedAt,
            endedAt: now().toISOString(),
          }),
        );
        continue;
      }
      const revisionId = generateOperationalId('revision', now());
      const revision = CaseEvidenceRevision.parse({
        schemaVersion: V2_SCHEMA_MAJOR,
        revisionId,
        workspaceId: input.store.workspaceId,
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
      revisions.push(revision);
      attempts.push(
        CaseAttempt.parse({
          schemaVersion: V2_SCHEMA_MAJOR,
          attemptId: generateOperationalId('attempt', now()),
          runId,
          caseId: entry.selectedCase.caseId,
          captureScope: entry.selectedCase.captureScope,
          scopeKey,
          result: 'captured',
          revisionId,
          startedAt,
          endedAt: now().toISOString(),
        }),
      );
      for (const binary of captured.binaries) {
        pendingBinaries.push({
          binary,
          owner: { kind: 'revision', objectId: revisionId },
        });
      }
    } catch (error) {
      const result: AttemptResult =
        input.signal?.aborted ? 'cancelled' : 'failed';
      if (result === 'cancelled') cancelled = true;
      attempts.push(
        CaseAttempt.parse({
          schemaVersion: V2_SCHEMA_MAJOR,
          attemptId: generateOperationalId('attempt', now()),
          runId,
          caseId: entry.selectedCase.caseId,
          captureScope: entry.selectedCase.captureScope,
          scopeKey,
          result,
          ...(result === 'failed' ? { reason: resultReason(error) } : {}),
          startedAt,
          endedAt: now().toISOString(),
        }),
      );
      if (error instanceof CaseCaptureFailure) {
        for (const binary of error.binaries) {
          pendingBinaries.push({
            binary,
            owner: { kind: 'run', objectId: runId },
          });
        }
      }
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

  const coverage = coverageFor(attempts, revisions);
  const terminationReason = attemptResultToTermination(attempts, cancelled);
  const run = Run.parse({
    schemaVersion: V2_SCHEMA_MAJOR,
    runId,
    workspaceId: input.store.workspaceId,
    bundleId: input.bundleId,
    selection: input.preflight.selection,
    inputVersion: input.preflight.inputVersion,
    startedAt: job.acceptedAt,
    endedAt: now().toISOString(),
    terminationReason,
    attempts,
    coverage,
  });

  await input.store.advanceJob(job.jobId, 'writing');
  try {
    const committed = await input.store.commitRun({
      bundleId: input.bundleId,
      run,
      revisions: revisions.filter((revision) =>
        attempts.some(
          (attempt) =>
            attempt.result === 'captured' &&
            attempt.revisionId === revision.revisionId,
        ),
      ),
      coverage,
    });
    const storedBlobIds: string[] = [];
    for (const pending of pendingBinaries) {
      try {
        const record = await input.store.putBlob({
          bundleId: input.bundleId,
          kind: pending.binary.kind,
          mediaType: pending.binary.mediaType,
          bytes: pending.binary.bytes,
          ownerRefs: [pending.owner],
        });
        storedBlobIds.push(record.blobId);
      } catch (error) {
        await input.store.appendJobJournal(job.jobId, {
          event: 'blob-write-failed',
          detail: resultReason(error),
        });
      }
    }
    await input.store.finalizeJob(job.jobId, terminationReason);
    return {
      run: committed.run,
      snapshot: committed.snapshot,
      jobId: job.jobId,
      storedBlobIds,
    };
  } catch (error) {
    await input.store.finalizeJob(job.jobId, 'failed');
    throw error;
  }
}
