import {
  classifyCaptureResults,
  type ClassifiedCaptureResult,
  type ClassifiedCaptureResults,
  type PrototypeLifecycleRecord,
  type ResultClassificationKind,
} from "@proto-bridge/core/v2/result-classification";
import type { CaptureConsoleState } from "@proto-bridge/core/v2/service-contract";

export const RESULT_CLASSIFICATION_LABELS: Record<ResultClassificationKind, string> = {
  "officially-finalized": "已正式定稿",
  finalizing: "定稿进行中",
  "awaiting-item-confirmation": "待逐项确认",
  "finalization-incomplete": "定稿未完成",
  "diagnostic-only": "仅诊断",
  "reference-invalid": "引用失效",
  "read-failed": "结果读取失败",
};

export const RESULT_ORIGIN_LABELS = {
  gui: "GUI",
  cli: "CLI",
  unknown: "来源未知",
} as const;

export type ResultSurfaceCopy = {
  kind: ResultClassificationKind;
  classificationLabel: string;
  originLabel: string;
  /** Coverage failure retained from the exact Snapshot. Empty when that Snapshot is complete or unread. */
  statusLabel: string;
  headline: string;
};

export function resultSurfaceCopy(result: ClassifiedCaptureResult): ResultSurfaceCopy {
  const classificationLabel = RESULT_CLASSIFICATION_LABELS[result.kind];
  const originLabel = RESULT_ORIGIN_LABELS[result.origin];
  const statusLabel =
    result.incompleteCount > 0 ? `部分失败 · ${result.incompleteCount} 项` : "";
  return {
    kind: result.kind,
    classificationLabel,
    originLabel,
    statusLabel,
    headline: [classificationLabel, originLabel, statusLabel].filter(Boolean).join(" · "),
  };
}

export function classifyWorkbenchResults(input: {
  records: Readonly<Record<string, PrototypeLifecycleRecord>>;
  consoleState: CaptureConsoleState | null;
}): ClassifiedCaptureResults {
  const state = input.consoleState;
  return classifyCaptureResults({
    lifecycle: { records: input.records },
    objectFactsKnown: state !== null,
    bundles: (state?.bundles ?? []).map((item) => {
      const snapshots = [...(item.snapshots ?? [])];
      if (
        item.activeSnapshot &&
        !snapshots.some((snapshot) => snapshot.snapshotId === item.activeSnapshot?.snapshotId)
      ) {
        snapshots.push(item.activeSnapshot);
      }
      return {
        bundleId: item.bundle.bundleId,
        prototypeId: item.bundle.prototypeId,
        status: item.bundle.status,
        snapshots: snapshots.map((snapshot) => ({
          snapshotId: snapshot.snapshotId,
          sourceRunId: snapshot.sourceRunId,
          coverageCounts: snapshot.coverage.counts,
        })),
      };
    }),
    jobs: (state?.jobs ?? []).map((job) => ({
      jobId: job.jobId,
      bundleId: job.bundleId,
      status: job.status,
      ...(job.runId ? { runId: job.runId } : {}),
      ...(job.operationKey ? { operationKey: job.operationKey } : {}),
    })),
    receipts: state?.receipts ?? [],
    handoffs: state?.handoffs ?? [],
    unreadableSnapshots: state?.unreadableSnapshots ?? [],
  });
}

function sameCopy(copy: ResultSurfaceCopy | null | undefined): ResultSurfaceCopy | null {
  return copy ?? null;
}

export function presentSnapshotResult(
  facts: ClassifiedCaptureResults,
  bundleId: string,
  snapshotId: string,
): ResultSurfaceCopy {
  return resultSurfaceCopy(facts.snapshot(bundleId, snapshotId));
}

export function presentJobResult(
  facts: ClassifiedCaptureResults,
  jobId: string,
): ResultSurfaceCopy | null {
  return sameCopy(facts.job(jobId) ? resultSurfaceCopy(facts.job(jobId)!) : null);
}

export function presentPrototypeResult(
  facts: ClassifiedCaptureResults,
  prototypeId: string,
): ResultSurfaceCopy | null {
  const result = facts.prototype(prototypeId);
  return result ? resultSurfaceCopy(result) : null;
}

export type ListedCaptureResult = {
  bundleId: string;
  snapshotId: string;
  prototypeId: string;
  path: string;
  headline: string;
  committedAt?: string;
};

/** Active Snapshots plus exact lifecycle bindings. Active is only a display candidate, never an identity. */
export function listClassifiedCaptureResults(input: {
  records: Readonly<Record<string, PrototypeLifecycleRecord>>;
  consoleState: CaptureConsoleState | null;
}): ListedCaptureResult[] {
  const facts = classifyWorkbenchResults(input);
  const seen = new Set<string>();
  const listed: ListedCaptureResult[] = [];
  const committedAt = new Map<string, string>();
  for (const item of input.consoleState?.bundles ?? []) {
    for (const snapshot of item.snapshots ?? []) {
      committedAt.set(`${item.bundle.bundleId}\n${snapshot.snapshotId}`, snapshot.committedAt);
    }
    if (item.activeSnapshot) {
      committedAt.set(
        `${item.bundle.bundleId}\n${item.activeSnapshot.snapshotId}`,
        item.activeSnapshot.committedAt,
      );
    }
  }
  function add(bundleId: string, snapshotId: string, prototypeId: string) {
    const key = `${bundleId}\n${snapshotId}`;
    if (seen.has(key)) return;
    seen.add(key);
    const copy = presentSnapshotResult(facts, bundleId, snapshotId);
    const at = committedAt.get(key);
    listed.push({
      bundleId,
      snapshotId,
      prototypeId,
      path: `/workbench/evidence/${bundleId}/${snapshotId}`,
      headline: copy.headline,
      ...(at ? { committedAt: at } : {}),
    });
  }
  for (const record of Object.values(input.records)) {
    if (!record.artifacts) continue;
    add(record.artifacts.bundleId, record.artifacts.snapshotId, record.prototypeId);
  }
  for (const item of input.consoleState?.bundles ?? []) {
    if (!item.activeSnapshot) continue;
    add(item.bundle.bundleId, item.activeSnapshot.snapshotId, item.bundle.prototypeId);
  }
  return listed;
}

export function presentEvidenceResult(
  facts: ClassifiedCaptureResults,
  bundleId: string,
  snapshotId: string,
): ResultSurfaceCopy {
  return presentSnapshotResult(facts, bundleId, snapshotId);
}

/** Drops the read-model sentence that invites creating a Handoff for a result that is not an open finalization. */
export function evidenceMessagesForClassification(
  messages: readonly string[],
  kind: ResultClassificationKind,
): string[] {
  return messages.filter((message) => {
    if (/可交付|已定稿/.test(message)) return false;
    if (
      kind !== "finalizing" &&
      kind !== "awaiting-item-confirmation" &&
      message.includes("可继续创建 Handoff")
    ) {
      return false;
    }
    return true;
  });
}
