import { incompleteCaseCount, type CoverageCounts } from './contracts/coverage.js';
import type { PrototypeLifecycleRecord } from './contracts/prototype-lifecycle.js';

export type { PrototypeLifecycleRecord };
import type { BundleStatus } from './contracts/vocabulary.js';

/**
 * Identity of one capture result. Core owns this projection.
 * Callers must not infer official status or origin from Bundle ids, file
 * names, timestamps, or which Snapshot is active.
 */
export const RESULT_CLASSIFICATION_KINDS = [
  'officially-finalized',
  'finalizing',
  'awaiting-item-confirmation',
  'finalization-incomplete',
  'diagnostic-only',
  'reference-invalid',
  'read-failed',
] as const;
export type ResultClassificationKind = (typeof RESULT_CLASSIFICATION_KINDS)[number];

export const RESULT_ORIGINS = ['gui', 'cli', 'unknown'] as const;
export type ResultOrigin = (typeof RESULT_ORIGINS)[number];

export type ResultSnapshotFact = {
  snapshotId: string;
  sourceRunId: string;
  coverageCounts: CoverageCounts;
};

export type ResultBundleFact = {
  bundleId: string;
  prototypeId: string;
  status: BundleStatus;
  snapshots: readonly ResultSnapshotFact[];
};

export type ResultJobFact = {
  jobId: string;
  bundleId: string;
  runId?: string;
  status: string;
  operationKey?: string;
};

/** A delivery receipt the caller actually read. `source` is set only when the file recorded it. */
export type ResultReceiptFact = {
  deliveryId: string;
  bundleId: string;
  snapshotId: string;
  handoffId: string;
  source?: 'cli' | 'gui';
};

export type ResultHandoffFact = {
  handoffId: string;
  bundleId: string;
  snapshotId: string;
};

export type ResultSnapshotReadFailure = {
  bundleId: string;
  snapshotId: string;
};

export type ClassifyCaptureResultsInput = {
  lifecycle: { records: Readonly<Record<string, PrototypeLifecycleRecord>> } | null;
  bundles: readonly ResultBundleFact[];
  jobs: readonly ResultJobFact[];
  receipts: readonly ResultReceiptFact[];
  handoffs: readonly ResultHandoffFact[];
  /** Snapshot ids that were listed but could not be read. Do not replace them with another Snapshot. */
  unreadableSnapshots?: readonly ResultSnapshotReadFailure[];
  /**
   * False while Bundle/Handoff/Delivery reachability has not been loaded.
   * Missing objects are then not treated as deletion. Trash is still honored
   * when a Bundle fact is present.
   */
  objectFactsKnown: boolean;
};

export type ClassifiedCaptureResult = {
  kind: ResultClassificationKind;
  origin: ResultOrigin;
  prototypeId?: string;
  bundleId?: string;
  snapshotId?: string;
  jobId?: string;
  handoffId?: string;
  deliveryId?: string;
  /** Incomplete cases on the exact Snapshot. Zero when that Snapshot was not read. */
  incompleteCount: number;
};

export type ClassifiedCaptureResults = {
  results: ClassifiedCaptureResult[];
  snapshot(bundleId: string, snapshotId: string): ClassifiedCaptureResult;
  job(jobId: string): ClassifiedCaptureResult | undefined;
  prototype(prototypeId: string): ClassifiedCaptureResult | undefined;
};

const CONFIRMATION_PHASES = new Set(['awaiting-confirmation', 'awaiting-risks']);

function snapshotKey(bundleId: string, snapshotId: string): string {
  return `${bundleId}\n${snapshotId}`;
}

function knownSource(source: ResultReceiptFact['source']): ResultOrigin {
  return source === 'cli' || source === 'gui' ? source : 'unknown';
}

function originFor(
  receipts: readonly ResultReceiptFact[],
  match: {
    deliveryId?: string;
    bundleId?: string;
    snapshotId?: string;
    handoffId?: string;
  },
): ResultOrigin {
  if (match.deliveryId) {
    const receipt = receipts.find((item) => item.deliveryId === match.deliveryId);
    if (!receipt) return 'unknown';
    if (match.bundleId && receipt.bundleId !== match.bundleId) return 'unknown';
    if (match.snapshotId && receipt.snapshotId !== match.snapshotId) return 'unknown';
    if (match.handoffId && receipt.handoffId !== match.handoffId) return 'unknown';
    return knownSource(receipt.source);
  }
  if (!match.bundleId || !match.snapshotId) return 'unknown';
  const matched = receipts.filter(
    (item) =>
      item.bundleId === match.bundleId &&
      item.snapshotId === match.snapshotId &&
      (match.handoffId ? item.handoffId === match.handoffId : true),
  );
  const origins = new Set(matched.map((item) => knownSource(item.source)));
  origins.delete('unknown');
  if (origins.size !== 1) return 'unknown';
  return [...origins][0]!;
}

function classified(input: {
  kind: ResultClassificationKind;
  origin: ResultOrigin;
  prototypeId?: string | undefined;
  bundleId?: string | undefined;
  snapshotId?: string | undefined;
  jobId?: string | undefined;
  handoffId?: string | undefined;
  deliveryId?: string | undefined;
  incompleteCount?: number | undefined;
}): ClassifiedCaptureResult {
  return {
    kind: input.kind,
    origin: input.origin,
    incompleteCount: input.incompleteCount ?? 0,
    ...(input.prototypeId ? { prototypeId: input.prototypeId } : {}),
    ...(input.bundleId ? { bundleId: input.bundleId } : {}),
    ...(input.snapshotId ? { snapshotId: input.snapshotId } : {}),
    ...(input.jobId ? { jobId: input.jobId } : {}),
    ...(input.handoffId ? { handoffId: input.handoffId } : {}),
    ...(input.deliveryId ? { deliveryId: input.deliveryId } : {}),
  };
}

export function classifyCaptureResults(
  input: ClassifyCaptureResultsInput,
): ClassifiedCaptureResults {
  const records = Object.values(input.lifecycle?.records ?? {});
  const bundles = new Map(input.bundles.map((bundle) => [bundle.bundleId, bundle]));
  const jobs = new Map(input.jobs.map((job) => [job.jobId, job]));
  const unreadable = new Set(
    (input.unreadableSnapshots ?? []).map((item) => snapshotKey(item.bundleId, item.snapshotId)),
  );
  const handoffIds = new Set(input.handoffs.map((item) => item.handoffId));
  const deliveryIds = new Set(input.receipts.map((item) => item.deliveryId));

  function readableSnapshot(bundleId: string, snapshotId: string): ResultSnapshotFact | undefined {
    return bundles
      .get(bundleId)
      ?.snapshots.find((snapshot) => snapshot.snapshotId === snapshotId);
  }

  function incompleteOf(snapshot: ResultSnapshotFact | undefined): number {
    return snapshot ? incompleteCaseCount(snapshot.coverageCounts) : 0;
  }

  function artifactRecord(bundleId: string, snapshotId: string): PrototypeLifecycleRecord | undefined {
    return records.find(
      (record) =>
        record.artifacts?.bundleId === bundleId &&
        record.artifacts.snapshotId === snapshotId,
    );
  }

  function bindingBroken(
    bundleId: string,
    snapshotId: string,
    handoffId: string,
    deliveryId: string,
  ): 'reference-invalid' | 'read-failed' | undefined {
    const bundle = bundles.get(bundleId);
    if (!input.objectFactsKnown) {
      if (bundle?.status === 'trashed') return 'reference-invalid';
      return undefined;
    }
    if (!bundle || bundle.status === 'trashed') return 'reference-invalid';
    if (unreadable.has(snapshotKey(bundleId, snapshotId))) return 'read-failed';
    if (!readableSnapshot(bundleId, snapshotId)) return 'reference-invalid';
    const handoff = input.handoffs.find((item) => item.handoffId === handoffId);
    if (
      !handoffIds.has(handoffId) ||
      !handoff ||
      handoff.bundleId !== bundleId ||
      handoff.snapshotId !== snapshotId
    ) {
      return 'reference-invalid';
    }
    const receipt = input.receipts.find((item) => item.deliveryId === deliveryId);
    if (
      !deliveryIds.has(deliveryId) ||
      !receipt ||
      receipt.bundleId !== bundleId ||
      receipt.snapshotId !== snapshotId ||
      receipt.handoffId !== handoffId
    ) {
      return 'reference-invalid';
    }
    return undefined;
  }

  function operationRecordForSnapshot(
    bundleId: string,
    snapshotId: string,
  ): PrototypeLifecycleRecord | undefined {
    const snapshot = readableSnapshot(bundleId, snapshotId);
    return records.find((record) => {
      const operation = record.operation;
      if (operation.kind === 'finalizing') {
        if (operation.bundleId === bundleId && operation.snapshotId === snapshotId) return true;
        const job = operation.jobId ? jobs.get(operation.jobId) : undefined;
        if (
          job &&
          job.bundleId === bundleId &&
          snapshot &&
          job.runId === snapshot.sourceRunId
        ) {
          return true;
        }
        return input.jobs.some(
          (item) =>
            item.operationKey === operation.operationKey &&
            item.bundleId === bundleId &&
            snapshot &&
            item.runId === snapshot.sourceRunId,
        );
      }
      if (operation.kind === 'failed' && operation.action === 'finalize' && operation.operationKey) {
        return input.jobs.some(
          (item) =>
            item.operationKey === operation.operationKey &&
            item.bundleId === bundleId &&
            snapshot &&
            item.runId === snapshot.sourceRunId,
        );
      }
      return false;
    });
  }

  function snapshot(bundleId: string, snapshotId: string): ClassifiedCaptureResult {
    const bundle = bundles.get(bundleId);
    const readable = readableSnapshot(bundleId, snapshotId);
    const bound = artifactRecord(bundleId, snapshotId);
    const artifacts = bound?.artifacts;
    if (artifacts && artifacts.bundleId === bundleId && artifacts.snapshotId === snapshotId) {
      const broken = bindingBroken(
        bundleId,
        snapshotId,
        artifacts.handoffId,
        artifacts.deliveryId,
      );
      const origin = originFor(input.receipts, {
        deliveryId: artifacts.deliveryId,
        bundleId,
        snapshotId,
        handoffId: artifacts.handoffId,
      });
      if (broken) {
        return classified({
          kind: broken,
          origin,
          prototypeId: bound?.prototypeId ?? bundle?.prototypeId,
          bundleId,
          snapshotId,
          jobId: artifacts.jobId,
          handoffId: artifacts.handoffId,
          deliveryId: artifacts.deliveryId,
          incompleteCount: broken === 'read-failed' ? 0 : incompleteOf(readable),
        });
      }
      return classified({
        kind: 'officially-finalized',
        origin,
        prototypeId: bound?.prototypeId ?? bundle?.prototypeId,
        bundleId,
        snapshotId,
        jobId: artifacts.jobId,
        handoffId: artifacts.handoffId,
        deliveryId: artifacts.deliveryId,
        incompleteCount: incompleteOf(readable),
      });
    }

    const operationRecord = operationRecordForSnapshot(bundleId, snapshotId);
    const operation = operationRecord?.operation;
    if (operation?.kind === 'finalizing') {
      const fixedMissing =
        input.objectFactsKnown &&
        operation.bundleId === bundleId &&
        operation.snapshotId === snapshotId &&
        (!bundle || bundle.status === 'trashed' || (!readable && !unreadable.has(snapshotKey(bundleId, snapshotId))));
      if (bundle?.status === 'trashed' || fixedMissing) {
        return classified({
          kind: 'reference-invalid',
          origin: 'unknown',
          prototypeId: operationRecord?.prototypeId ?? bundle?.prototypeId,
          bundleId,
          snapshotId,
          incompleteCount: 0,
        });
      }
      if (unreadable.has(snapshotKey(bundleId, snapshotId)) && !readable) {
        return classified({
          kind: 'read-failed',
          origin: 'unknown',
          prototypeId: operationRecord?.prototypeId ?? bundle?.prototypeId,
          bundleId,
          snapshotId,
          incompleteCount: 0,
        });
      }
      return classified({
        kind: CONFIRMATION_PHASES.has(operation.phase)
          ? 'awaiting-item-confirmation'
          : 'finalizing',
        origin: originFor(input.receipts, { bundleId, snapshotId }),
        prototypeId: operationRecord?.prototypeId ?? bundle?.prototypeId,
        bundleId,
        snapshotId,
        jobId: operation.jobId,
        incompleteCount: incompleteOf(readable),
      });
    }
    if (operation?.kind === 'failed' && operation.action === 'finalize') {
      return classified({
        kind: 'finalization-incomplete',
        origin: originFor(input.receipts, { bundleId, snapshotId }),
        prototypeId: operationRecord?.prototypeId ?? bundle?.prototypeId,
        bundleId,
        snapshotId,
        incompleteCount: incompleteOf(readable),
      });
    }

    if (!readable) {
      return classified({
        kind: 'read-failed',
        origin: 'unknown',
        prototypeId: bundle?.prototypeId,
        bundleId,
        snapshotId,
        incompleteCount: 0,
      });
    }
    return classified({
      kind: 'diagnostic-only',
      origin: originFor(input.receipts, { bundleId, snapshotId }),
      prototypeId: bundle?.prototypeId,
      bundleId,
      snapshotId,
      incompleteCount: incompleteOf(readable),
    });
  }

  function job(jobId: string): ClassifiedCaptureResult | undefined {
    const current = jobs.get(jobId);
    if (!current) return undefined;
    const bundle = bundles.get(current.bundleId);
    const snapshotFact = current.runId
      ? bundle?.snapshots.find((item) => item.sourceRunId === current.runId)
      : undefined;
    if (snapshotFact) {
      const result = snapshot(current.bundleId, snapshotFact.snapshotId);
      return { ...result, jobId: current.jobId };
    }
    const boundToJob = records.find((record) => record.artifacts?.jobId === current.jobId);
    if (boundToJob?.artifacts) {
      const result = snapshot(boundToJob.artifacts.bundleId, boundToJob.artifacts.snapshotId);
      return { ...result, jobId: current.jobId };
    }
    const operationRecord = records.find((record) => {
      const operation = record.operation;
      if (operation.kind === 'finalizing') {
        return operation.jobId === current.jobId || operation.operationKey === current.operationKey;
      }
      return (
        operation.kind === 'failed' &&
        operation.action === 'finalize' &&
        operation.operationKey !== undefined &&
        operation.operationKey === current.operationKey
      );
    });
    const operation = operationRecord?.operation;
    if (operationRecord && operation?.kind === 'finalizing') {
      if (operation.snapshotId && operation.bundleId) {
        const result = snapshot(operation.bundleId, operation.snapshotId);
        return { ...result, jobId: current.jobId, prototypeId: operationRecord.prototypeId };
      }
      return classified({
        kind: CONFIRMATION_PHASES.has(operation.phase)
          ? 'awaiting-item-confirmation'
          : 'finalizing',
        origin: 'unknown',
        prototypeId: operationRecord?.prototypeId,
        bundleId: current.bundleId,
        jobId: current.jobId,
      });
    }
    if (operation?.kind === 'failed') {
      return classified({
        kind: 'finalization-incomplete',
        origin: 'unknown',
        prototypeId: operationRecord?.prototypeId,
        bundleId: current.bundleId,
        jobId: current.jobId,
      });
    }
    if (current.status === 'completed' && current.runId) {
      return classified({
        kind: 'read-failed',
        origin: 'unknown',
        prototypeId: bundle?.prototypeId,
        bundleId: current.bundleId,
        jobId: current.jobId,
      });
    }
    return classified({
      kind: 'diagnostic-only',
      origin: 'unknown',
      prototypeId: bundle?.prototypeId,
      bundleId: current.bundleId,
      jobId: current.jobId,
    });
  }

  function prototype(prototypeId: string): ClassifiedCaptureResult | undefined {
    const record = input.lifecycle?.records[prototypeId];
    if (!record) return undefined;
    if (record.artifacts) {
      const result = snapshot(record.artifacts.bundleId, record.artifacts.snapshotId);
      return { ...result, prototypeId };
    }
    const operation = record.operation;
    if (operation.kind === 'finalizing') {
      if (operation.bundleId && operation.snapshotId) {
        const result = snapshot(operation.bundleId, operation.snapshotId);
        return { ...result, prototypeId };
      }
      const linked = input.jobs.find((item) => item.operationKey === operation.operationKey);
      if (linked) {
        const result = job(linked.jobId);
        if (result) return { ...result, prototypeId };
      }
      return classified({
        kind: CONFIRMATION_PHASES.has(operation.phase)
          ? 'awaiting-item-confirmation'
          : 'finalizing',
        origin: 'unknown',
        prototypeId,
      });
    }
    if (operation.kind === 'failed' && operation.action === 'finalize') {
      const linked = operation.operationKey
        ? input.jobs.find((item) => item.operationKey === operation.operationKey)
        : undefined;
      if (linked) {
        const result = job(linked.jobId);
        if (result && (result.kind === 'diagnostic-only' || result.kind === 'finalizing' || result.kind === 'awaiting-item-confirmation')) {
          return { ...result, prototypeId, kind: 'finalization-incomplete' };
        }
        if (result) return { ...result, prototypeId };
      }
      return classified({
        kind: 'finalization-incomplete',
        origin: 'unknown',
        prototypeId,
      });
    }
    if (operation.kind === 'rolling-back' || (operation.kind === 'failed' && operation.action === 'rollback')) {
      return undefined;
    }
    return undefined;
  }

  const seen = new Set<string>();
  const results: ClassifiedCaptureResult[] = [];
  function add(result: ClassifiedCaptureResult | undefined) {
    if (!result) return;
    const key = [
      result.kind,
      result.prototypeId ?? '',
      result.bundleId ?? '',
      result.snapshotId ?? '',
      result.jobId ?? '',
    ].join('\n');
    if (seen.has(key)) return;
    seen.add(key);
    results.push(result);
  }
  for (const bundle of input.bundles) {
    for (const item of bundle.snapshots) add(snapshot(bundle.bundleId, item.snapshotId));
  }
  for (const item of input.unreadableSnapshots ?? []) add(snapshot(item.bundleId, item.snapshotId));
  for (const record of records) add(prototype(record.prototypeId));
  for (const item of input.jobs) add(job(item.jobId));

  return { results, snapshot, job, prototype };
}
