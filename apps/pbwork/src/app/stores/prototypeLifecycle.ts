import { defineStore } from "pinia";
import type {
  CaptureJob,
  PrototypeFinalizedArtifacts,
  PrototypeLifecycleEvent,
  PrototypeLifecycleOperation,
  PrototypeLifecycleRecord,
  PrototypeLifecycleStage,
} from "@proto-bridge/core/v2";
import type { PrototypeLifecycle, PrototypeRecord } from "@/design-system/types";
import { useCaptureStore } from "@/app/stores/capture";
import { captureServiceClient } from "@/capture/service-client";

const LEGACY_STORAGE_KEY = "pbwork.prototype-lifecycle.v2";
const TERMINAL_JOB_STATUSES = new Set([
  "completed",
  "cancelled",
  "interrupted",
  "failed",
]);

export const lifecycleTransitions: Record<
  PrototypeLifecycle,
  PrototypeLifecycle[]
> = {
  active: ["review"],
  review: ["active", "final"],
  final: ["review", "archived"],
  archived: [],
};

export type FinalizationPhase = Extract<
  PrototypeLifecycleOperation,
  { kind: "finalizing" }
>["phase"];
export type LifecycleOperation = PrototypeLifecycleOperation;
export type FinalizedArtifacts = PrototypeFinalizedArtifacts;

export type LifecycleHistoryEntry = {
  id: string;
  prototypeId: string;
  from: PrototypeLifecycle;
  to: PrototypeLifecycle;
  note: string;
  changedAt: string;
};

type LifecycleState = {
  records: Record<string, PrototypeLifecycleRecord>;
  history: LifecycleHistoryEntry[];
  storageError: string | null;
  loading: boolean;
  loaded: boolean;
};

type LegacyRecord = {
  prototypeId: string;
  stage: PrototypeLifecycleStage;
  artifacts: PrototypeFinalizedArtifacts | null;
  createdAt?: string;
  updatedAt?: string;
};

function validArtifacts(value: unknown): value is PrototypeFinalizedArtifacts {
  if (!value || typeof value !== "object") return false;
  const item = value as Partial<PrototypeFinalizedArtifacts>;
  return [
    item.jobId,
    item.bundleId,
    item.snapshotId,
    item.handoffId,
    item.deliveryId,
    item.agentPromptPath,
    item.receiptPath,
    item.finalizedAt,
  ].every((field) => typeof field === "string" && field.length > 0);
}

function legacyRecords(): Record<string, LegacyRecord> {
  if (typeof window === "undefined") return {};
  try {
    const raw = window.localStorage.getItem(LEGACY_STORAGE_KEY);
    if (!raw) return {};
    const parsed = JSON.parse(raw) as { records?: Record<string, unknown> };
    const records: Record<string, LegacyRecord> = {};
    for (const [prototypeId, value] of Object.entries(parsed.records ?? {})) {
      if (!value || typeof value !== "object") continue;
      const item = value as Partial<LegacyRecord>;
      if (
        item.prototypeId !== prototypeId ||
        !["active", "review", "final", "archived"].includes(item.stage ?? "")
      ) {
        continue;
      }
      records[prototypeId] = {
        prototypeId,
        stage: item.stage!,
        artifacts: validArtifacts(item.artifacts) ? item.artifacts : null,
        ...(typeof item.createdAt === "string" ? { createdAt: item.createdAt } : {}),
        ...(typeof item.updatedAt === "string" ? { updatedAt: item.updatedAt } : {}),
      };
    }
    return records;
  } catch {
    return {};
  }
}

function toHistory(event: PrototypeLifecycleEvent): LifecycleHistoryEntry | null {
  if (!event.from) return null;
  return {
    id: event.eventId,
    prototypeId: event.prototypeId,
    from: event.from,
    to: event.to,
    note: event.note,
    changedAt: event.changedAt,
  };
}

function jobFailure(job: CaptureJob, fallback?: string | null): string {
  return (
    job.journal.at(-1)?.detail ??
    fallback ??
    `整原型采集以 ${job.status} 结束。`
  );
}

export const usePrototypeLifecycleStore = defineStore("prototypeLifecycle", {
  state: (): LifecycleState => ({
    records: {},
    history: [],
    storageError: null,
    loading: false,
    loaded: false,
  }),
  getters: {
    recordFor: (state) =>
      (prototypeId: string): PrototypeLifecycleRecord | null =>
        state.records[prototypeId] ?? null,
    effectiveLifecycle: (state) =>
      (prototype: PrototypeRecord): PrototypeLifecycle =>
        state.records[prototype.id]?.stage ?? "active",
    historyFor: (state) =>
      (prototypeId: string): LifecycleHistoryEntry[] =>
        state.history.filter((entry) => entry.prototypeId === prototypeId),
    finalizedRecords: (state): PrototypeLifecycleRecord[] =>
      Object.values(state.records).filter(
        (record) =>
          (record.stage === "final" || record.stage === "archived") &&
          record.artifacts,
      ),
  },
  actions: {
    persist() {
      // Core Store is authoritative. Retained as a compatibility no-op.
    },
    applyRecord(record: PrototypeLifecycleRecord) {
      this.records = { ...this.records, [record.prototypeId]: record };
    },
    applyEvent(event: PrototypeLifecycleEvent) {
      const entry = toHistory(event);
      if (!entry) return;
      this.history = [entry, ...this.history.filter((item) => item.id !== entry.id)];
    },
    applyRemoteState(state: {
      records: PrototypeLifecycleRecord[];
      events: Record<string, PrototypeLifecycleEvent[]>;
    }) {
      this.records = Object.fromEntries(
        state.records.map((record) => [record.prototypeId, record]),
      );
      this.history = Object.values(state.events)
        .flat()
        .map(toHistory)
        .filter((entry): entry is LifecycleHistoryEntry => Boolean(entry))
        .sort((left, right) => right.changedAt.localeCompare(left.changedAt));
    },
    async initialize(prototypes: PrototypeRecord[]) {
      if (this.loading) return;
      this.loading = true;
      this.storageError = null;
      const capture = useCaptureStore();
      try {
        if (!capture.connected) await capture.connect();
        if (!capture.connected) {
          throw new Error(capture.lastError ?? "生命周期服务未连接。");
        }
        const remote = await captureServiceClient.prototypeLifecycles();
        this.applyRemoteState(remote);

        const legacy = legacyRecords();
        for (const prototype of prototypes) {
          if (this.records[prototype.id]) continue;
          const candidate = legacy[prototype.id];
          if (!candidate) continue;
          if (
            (candidate.stage === "final" || candidate.stage === "archived") &&
            !candidate.artifacts
          ) {
            continue;
          }
          try {
            const imported = await captureServiceClient.importPrototypeLifecycle({
              prototypeId: prototype.id,
              stage: candidate.stage,
              artifacts: candidate.artifacts,
              note: "Validated import from PBWork local lifecycle v2",
              ...(candidate.createdAt ? { createdAt: candidate.createdAt } : {}),
              ...(candidate.updatedAt ? { updatedAt: candidate.updatedAt } : {}),
            });
            this.applyRecord(imported);
          } catch {
            // Invalid local refs intentionally fall through to active initialization.
          }
        }

        const missing = prototypes
          .map((prototype) => prototype.id)
          .filter((prototypeId) => !this.records[prototypeId]);
        if (missing.length) {
          const ensured = await captureServiceClient.ensurePrototypeLifecycles(missing);
          for (const record of ensured.records) this.applyRecord(record);
        }
        this.loaded = true;
      } catch (error) {
        this.storageError =
          error instanceof Error ? error.message : "生命周期状态无法读取。";
      } finally {
        this.loading = false;
      }
    },
    ensurePrototypes(prototypes: PrototypeRecord[]) {
      void this.initialize(prototypes);
    },
    requireRecord(prototypeId: string): PrototypeLifecycleRecord {
      const record = this.records[prototypeId];
      if (!record) throw new Error("生命周期尚未从 Core Store 加载完成。");
      return record;
    },
    async refresh(prototypes: PrototypeRecord[]) {
      this.loaded = false;
      await this.initialize(prototypes);
    },
    async setOperation(
      prototypeId: string,
      operation: PrototypeLifecycleOperation,
    ) {
      const current = this.requireRecord(prototypeId);
      const updated = await captureServiceClient.updatePrototypeLifecycleOperation(
        prototypeId,
        current.revision,
        operation,
      );
      this.applyRecord(updated);
      return updated;
    },
    async transition(
      prototype: PrototypeRecord,
      to: PrototypeLifecycle,
      note = "",
      artifacts?: PrototypeFinalizedArtifacts | null,
    ) {
      const current = this.requireRecord(prototype.id);
      const result = await captureServiceClient.transitionPrototypeLifecycle({
        prototypeId: prototype.id,
        expectedRevision: current.revision,
        to,
        note: note.trim(),
        ...(artifacts === undefined ? {} : { artifacts }),
      });
      this.applyRecord(result.record);
      this.applyEvent(result.event);
      return result.record;
    },
    async failOperation(
      prototypeId: string,
      action: "finalize" | "rollback",
      message: string,
    ) {
      try {
        await this.setOperation(prototypeId, {
          kind: "failed",
          action,
          message,
          failedAt: new Date().toISOString(),
        });
      } catch (error) {
        this.storageError =
          error instanceof Error ? error.message : "生命周期失败状态无法保存。";
      }
    },
    async clearFailure(prototypeId: string) {
      const current = this.requireRecord(prototypeId);
      if (current.operation.kind !== "failed") return;
      await this.setOperation(prototypeId, { kind: "idle" });
    },
    async prepareFinalization(prototype: PrototypeRecord) {
      const current = this.requireRecord(prototype.id);
      if (current.stage !== "review") throw new Error("只有待确定原型可以定稿。");
      const startedAt = new Date().toISOString();
      await this.setOperation(prototype.id, {
        kind: "finalizing",
        phase: "preflighting",
        startedAt,
      });
      const capture = useCaptureStore();
      if (!capture.connected) await capture.connect();
      if (!capture.connected) {
        await this.failOperation(prototype.id, "finalize", capture.lastError ?? "采集服务未连接。");
        return false;
      }
      capture.beginPrototype(prototype.id, `/workbench/prototypes/${prototype.id}`);
      await capture.runPreflight();
      if (!capture.preflight) {
        await this.failOperation(prototype.id, "finalize", capture.lastError ?? "整原型预检失败。");
        return false;
      }
      if (
        !capture.preflight.result.ready &&
        capture.preflight.result.unacceptedWarningIds.length === 0
      ) {
        await this.failOperation(
          prototype.id,
          "finalize",
          "整原型预检未通过，且没有可确认的 warning。",
        );
        return false;
      }
      await this.setOperation(prototype.id, {
        kind: "finalizing",
        phase: "awaiting-confirmation",
        startedAt,
      });
      return true;
    },
    async startFinalization(prototype: PrototypeRecord) {
      const current = this.requireRecord(prototype.id);
      if (
        current.stage !== "review" ||
        current.operation.kind !== "finalizing" ||
        current.operation.phase !== "awaiting-confirmation"
      ) {
        throw new Error("定稿预检尚未完成。");
      }
      const capture = useCaptureStore();
      if (!capture.preflight || !capture.warningsAccepted) {
        throw new Error("请逐项确认预检 warning。");
      }
      await this.setOperation(prototype.id, { ...current.operation, phase: "capturing" });
      await capture.createJob();
      const job = capture.activeJob;
      if (!job) {
        await this.failOperation(
          prototype.id,
          "finalize",
          capture.lastError ?? "整原型采集任务创建失败。",
        );
        return false;
      }
      capture.closeComposer();
      await this.setOperation(prototype.id, {
        kind: "finalizing",
        phase: "capturing",
        startedAt: current.operation.startedAt,
        jobId: job.jobId,
        bundleId: job.bundleId,
      });
      return true;
    },
    async pollFinalization(prototype: PrototypeRecord) {
      const current = this.requireRecord(prototype.id);
      if (
        current.stage !== "review" ||
        current.operation.kind !== "finalizing" ||
        current.operation.phase !== "capturing" ||
        !current.operation.jobId
      ) return;
      const capture = useCaptureStore();
      if (!capture.connected) await capture.connect();
      if (!capture.connected) return;
      try {
        if (capture.activeJob?.jobId !== current.operation.jobId) {
          capture.activeJob = await captureServiceClient.getJob(current.operation.jobId);
        }
        await capture.refreshActiveJob();
      } catch (error) {
        capture.setError(error);
        await this.failOperation(prototype.id, "finalize", capture.lastError ?? "读取采集任务失败。");
        return;
      }
      const job = capture.activeJob;
      if (!job || !TERMINAL_JOB_STATUSES.has(job.status)) return;
      if (job.status !== "completed") {
        await this.failOperation(prototype.id, "finalize", jobFailure(job, capture.lastError));
        return;
      }
      if (!capture.details || capture.details.bundle.bundleId !== job.bundleId) {
        await capture.loadBundle(job.bundleId);
      }
      const details = capture.details;
      if (!details || details.bundle.bundleId !== job.bundleId) {
        await this.failOperation(
          prototype.id,
          "finalize",
          capture.lastError ?? "采集已结束，但无法读取定稿 Evidence。",
        );
        return;
      }
      const counts = details.activeSnapshot.coverage.counts;
      const incomplete =
        counts.failed + counts.unsupported + counts.cancelled + counts.interrupted + counts.skipped;
      if (incomplete > 0) {
        await this.failOperation(
          prototype.id,
          "finalize",
          `整原型采集未完整：${counts.captured + counts.reused} 项成功或复用，${incomplete} 项未完成。`,
        );
        return;
      }
      await capture.previewCurrentHandoff();
      if (!capture.handoffPreview) {
        await this.failOperation(
          prototype.id,
          "finalize",
          capture.lastError ?? "Handoff 风险评估失败。",
        );
        return;
      }
      await this.setOperation(prototype.id, {
        kind: "finalizing",
        phase: "awaiting-risks",
        startedAt: current.operation.startedAt,
        jobId: job.jobId,
        bundleId: job.bundleId,
        snapshotId: details.activeSnapshot.snapshotId,
      });
      if (capture.handoffPreview.risks.length === 0) {
        await this.completeFinalization(prototype);
      }
    },
    async completeFinalization(prototype: PrototypeRecord) {
      const current = this.requireRecord(prototype.id);
      if (
        current.stage !== "review" ||
        current.operation.kind !== "finalizing" ||
        current.operation.phase !== "awaiting-risks" ||
        !current.operation.jobId ||
        !current.operation.bundleId ||
        !current.operation.snapshotId
      ) throw new Error("定稿 Evidence 尚未准备完成。");
      const capture = useCaptureStore();
      if (!capture.risksAccepted) throw new Error("请逐项确认 Handoff risk。");
      await this.setOperation(prototype.id, { ...current.operation, phase: "building-prompt" });
      await capture.createCurrentHandoff();
      if (!capture.handoff || !capture.deliveryArtifact) {
        await this.failOperation(
          prototype.id,
          "finalize",
          capture.lastError ?? "Agent 提示词生成失败。",
        );
        return false;
      }
      const artifacts: PrototypeFinalizedArtifacts = {
        jobId: current.operation.jobId,
        bundleId: current.operation.bundleId,
        snapshotId: current.operation.snapshotId,
        handoffId: capture.handoff.handoffId,
        deliveryId: capture.deliveryArtifact.deliveryId,
        agentPromptPath: capture.deliveryArtifact.agentPromptPath,
        receiptPath: capture.deliveryArtifact.receiptPath,
        finalizedAt: new Date().toISOString(),
      };
      await this.transition(prototype, "final", "整原型采集与提示词生成完成", artifacts);
      await capture.refreshConsole();
      return true;
    },
    async recoverFinalization(prototype: PrototypeRecord) {
      const current = this.requireRecord(prototype.id);
      if (current.operation.kind !== "finalizing") return;
      if (current.operation.phase === "preflighting") {
        await this.prepareFinalization(prototype);
        return;
      }
      if (current.operation.phase === "awaiting-confirmation") {
        const capture = useCaptureStore();
        if (capture.preflight?.result.selection.prototypeId === prototype.id) return;
        await this.prepareFinalization(prototype);
        return;
      }
      if (current.operation.phase === "capturing") {
        await this.pollFinalization(prototype);
        return;
      }
      if (!current.operation.bundleId || !current.operation.snapshotId) {
        await this.failOperation(prototype.id, "finalize", "定稿任务缺少 Bundle 或 Snapshot 引用。");
        return;
      }
      const capture = useCaptureStore();
      if (!capture.connected) await capture.connect();
      await capture.loadSnapshot(current.operation.bundleId, current.operation.snapshotId);
      await capture.previewCurrentHandoff();
      if (!capture.handoffPreview) {
        await this.failOperation(
          prototype.id,
          "finalize",
          capture.lastError ?? "无法恢复 Handoff 风险确认。",
        );
        return;
      }
      await this.setOperation(prototype.id, { ...current.operation, phase: "awaiting-risks" });
      if (capture.handoffPreview.risks.length === 0) {
        await this.completeFinalization(prototype);
      }
    },
    async rollbackToReview(prototype: PrototypeRecord, note = "") {
      const current = this.requireRecord(prototype.id);
      if (current.stage !== "final" || !current.artifacts) {
        throw new Error("只有具有完整定稿产物的已定稿原型可以回退。");
      }
      const bundleId = current.artifacts.bundleId;
      await this.setOperation(prototype.id, {
        kind: "rolling-back",
        startedAt: new Date().toISOString(),
        bundleIds: [bundleId],
      });
      const capture = useCaptureStore();
      if (!capture.connected) await capture.connect();
      if (!capture.connected) {
        await this.failOperation(
          prototype.id,
          "rollback",
          capture.lastError ?? "采集服务未连接，无法清理定稿 Evidence。",
        );
        return false;
      }
      try {
        await captureServiceClient.trashBundles([bundleId]);
        await capture.refreshConsole();
        await this.transition(prototype, "review", note || "清理定稿 Evidence 后回退", null);
        return true;
      } catch (error) {
        capture.setError(error);
        await this.failOperation(
          prototype.id,
          "rollback",
          capture.lastError ?? "定稿 Evidence 清理失败。",
        );
        return false;
      }
    },
  },
});
