import { defineStore } from "pinia";
import type { CaptureJob } from "@proto-bridge/core/v2";
import type { PrototypeLifecycle, PrototypeRecord } from "@/design-system/types";
import { useCaptureStore } from "@/app/stores/capture";
import { captureServiceClient } from "@/capture/service-client";

const STORAGE_KEY = "pbwork.prototype-lifecycle.v2";
const LEGACY_STORAGE_KEY = "pbwork.prototype-lifecycle.v1";
const HISTORY_LIMIT = 500;

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

export type FinalizationPhase =
  | "preflighting"
  | "awaiting-confirmation"
  | "capturing"
  | "awaiting-risks"
  | "building-prompt";

export type LifecycleOperation =
  | { kind: "idle" }
  | {
      kind: "finalizing";
      phase: FinalizationPhase;
      startedAt: string;
      jobId?: string;
      bundleId?: string;
      snapshotId?: string;
    }
  | {
      kind: "rolling-back";
      startedAt: string;
      bundleIds: string[];
    }
  | {
      kind: "failed";
      action: "finalize" | "rollback";
      message: string;
      failedAt: string;
    };

export type FinalizedArtifacts = {
  jobId: string;
  bundleId: string;
  snapshotId: string;
  handoffId: string;
  deliveryId: string;
  agentPromptPath: string;
  receiptPath: string;
  finalizedAt: string;
};

export type PrototypeLifecycleRecord = {
  prototypeId: string;
  stage: PrototypeLifecycle;
  operation: LifecycleOperation;
  artifacts: FinalizedArtifacts | null;
  createdAt: string;
  updatedAt: string;
};

export type LifecycleHistoryEntry = {
  id: string;
  prototypeId: string;
  from: PrototypeLifecycle;
  to: PrototypeLifecycle;
  note: string;
  changedAt: string;
};

type LifecycleState = {
  version: 2;
  records: Record<string, PrototypeLifecycleRecord>;
  history: LifecycleHistoryEntry[];
  storageError: string | null;
};

function isLifecycle(value: unknown): value is PrototypeLifecycle {
  return (
    value === "active" ||
    value === "review" ||
    value === "final" ||
    value === "archived"
  );
}

function isOperation(value: unknown): value is LifecycleOperation {
  if (!value || typeof value !== "object") return false;
  const candidate = value as Partial<LifecycleOperation>;
  return (
    candidate.kind === "idle" ||
    candidate.kind === "finalizing" ||
    candidate.kind === "rolling-back" ||
    candidate.kind === "failed"
  );
}

function isArtifacts(value: unknown): value is FinalizedArtifacts {
  if (!value || typeof value !== "object") return false;
  const item = value as Partial<FinalizedArtifacts>;
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

function createRecord(
  prototypeId: string,
  stage: PrototypeLifecycle = "active",
): PrototypeLifecycleRecord {
  const now = new Date().toISOString();
  return {
    prototypeId,
    stage,
    operation: { kind: "idle" },
    artifacts: null,
    createdAt: now,
    updatedAt: now,
  };
}

function parseRecord(
  prototypeId: string,
  value: unknown,
): PrototypeLifecycleRecord | null {
  if (!value || typeof value !== "object") return null;
  const item = value as Partial<PrototypeLifecycleRecord>;
  if (
    item.prototypeId !== prototypeId ||
    !isLifecycle(item.stage) ||
    !isOperation(item.operation) ||
    typeof item.createdAt !== "string" ||
    typeof item.updatedAt !== "string"
  ) {
    return null;
  }
  const artifacts = isArtifacts(item.artifacts) ? item.artifacts : null;
  if (item.stage === "final" && !artifacts) {
    return {
      ...createRecord(prototypeId, "review"),
      createdAt: item.createdAt,
      updatedAt: item.updatedAt,
    };
  }
  return {
    prototypeId,
    stage: item.stage,
    operation: item.operation,
    artifacts,
    createdAt: item.createdAt,
    updatedAt: item.updatedAt,
  };
}

function parseHistory(value: unknown): LifecycleHistoryEntry[] {
  if (!Array.isArray(value)) return [];
  return value
    .filter((entry): entry is LifecycleHistoryEntry => {
      if (!entry || typeof entry !== "object") return false;
      const item = entry as Partial<LifecycleHistoryEntry>;
      return (
        typeof item.id === "string" &&
        typeof item.prototypeId === "string" &&
        isLifecycle(item.from) &&
        isLifecycle(item.to) &&
        typeof item.note === "string" &&
        typeof item.changedAt === "string"
      );
    })
    .slice(0, HISTORY_LIMIT);
}

function loadLegacyState(): LifecycleState {
  const empty: LifecycleState = {
    version: 2,
    records: {},
    history: [],
    storageError: null,
  };
  const raw = window.localStorage.getItem(LEGACY_STORAGE_KEY);
  if (!raw) return empty;
  try {
    const parsed = JSON.parse(raw) as {
      overrides?: Record<string, unknown>;
      history?: unknown;
    };
    for (const [prototypeId, value] of Object.entries(parsed.overrides ?? {})) {
      if (!isLifecycle(value)) continue;
      const stage = value === "final" ? "review" : value;
      empty.records[prototypeId] = createRecord(prototypeId, stage);
    }
    empty.history = parseHistory(parsed.history);
    return empty;
  } catch {
    return {
      ...empty,
      storageError: "旧生命周期状态无法读取；新原型将从进行中开始。",
    };
  }
}

function loadState(): LifecycleState {
  if (typeof window === "undefined") {
    return { version: 2, records: {}, history: [], storageError: null };
  }
  const raw = window.localStorage.getItem(STORAGE_KEY);
  if (!raw) return loadLegacyState();
  try {
    const parsed = JSON.parse(raw) as Partial<LifecycleState>;
    if (parsed.version !== 2 || !parsed.records) {
      throw new Error("unsupported lifecycle state");
    }
    const records = Object.fromEntries(
      Object.entries(parsed.records)
        .map(([prototypeId, value]) => [
          prototypeId,
          parseRecord(prototypeId, value),
        ])
        .filter((entry): entry is [string, PrototypeLifecycleRecord] =>
          Boolean(entry[1]),
        ),
    );
    return {
      version: 2,
      records,
      history: parseHistory(parsed.history),
      storageError: null,
    };
  } catch {
    return {
      version: 2,
      records: {},
      history: [],
      storageError:
        "生命周期状态文件无法读取。原值已保留，请修复或清除后重试。",
    };
  }
}

function jobFailure(job: CaptureJob, fallback?: string | null): string {
  const lastJournal = job.journal.at(-1)?.detail;
  if (lastJournal) return lastJournal;
  if (fallback) return fallback;
  return `整原型采集以 ${job.status} 结束。`;
}

export const usePrototypeLifecycleStore = defineStore("prototypeLifecycle", {
  state: loadState,
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
      if (typeof window === "undefined" || this.storageError) return;
      window.localStorage.setItem(
        STORAGE_KEY,
        JSON.stringify({
          version: 2,
          records: this.records,
          history: this.history.slice(0, HISTORY_LIMIT),
          storageError: null,
        } satisfies LifecycleState),
      );
    },
    ensurePrototypes(prototypes: PrototypeRecord[]) {
      if (this.storageError) return;
      let changed = false;
      const records = { ...this.records };
      for (const prototype of prototypes) {
        if (records[prototype.id]) continue;
        records[prototype.id] = createRecord(prototype.id, "active");
        changed = true;
      }
      if (!changed) return;
      this.records = records;
      this.persist();
    },
    requireRecord(prototypeId: string): PrototypeLifecycleRecord {
      const existing = this.records[prototypeId];
      if (existing) return existing;
      const record = createRecord(prototypeId);
      this.records = { ...this.records, [prototypeId]: record };
      this.persist();
      return record;
    },
    replaceRecord(record: PrototypeLifecycleRecord) {
      this.records = { ...this.records, [record.prototypeId]: record };
      this.persist();
    },
    appendHistory(
      prototypeId: string,
      from: PrototypeLifecycle,
      to: PrototypeLifecycle,
      note = "",
    ) {
      const changedAt = new Date().toISOString();
      this.history = [
        {
          id: `${prototypeId}-${changedAt}-${Math.random().toString(36).slice(2, 8)}`,
          prototypeId,
          from,
          to,
          note: note.trim(),
          changedAt,
        },
        ...this.history,
      ].slice(0, HISTORY_LIMIT);
    },
    transition(prototype: PrototypeRecord, to: PrototypeLifecycle, note = "") {
      const current = this.requireRecord(prototype.id);
      const from = current.stage;
      if (!lifecycleTransitions[from].includes(to)) {
        throw new Error(`不允许从 ${from} 流转到 ${to}`);
      }
      if (from === "review" && to === "final") {
        throw new Error("进入已定稿必须完成整原型自动采集。");
      }
      if (from === "final" && to === "review") {
        throw new Error("回退待确定必须先清理定稿 Evidence。");
      }
      if (current.operation.kind !== "idle" && current.operation.kind !== "failed") {
        throw new Error("当前生命周期操作尚未结束。");
      }
      const now = new Date().toISOString();
      this.appendHistory(prototype.id, from, to, note);
      this.replaceRecord({
        ...current,
        stage: to,
        operation: { kind: "idle" },
        updatedAt: now,
      });
    },
    failOperation(prototypeId: string, action: "finalize" | "rollback", message: string) {
      const current = this.requireRecord(prototypeId);
      this.replaceRecord({
        ...current,
        operation: {
          kind: "failed",
          action,
          message,
          failedAt: new Date().toISOString(),
        },
        updatedAt: new Date().toISOString(),
      });
    },
    clearFailure(prototypeId: string) {
      const current = this.requireRecord(prototypeId);
      if (current.operation.kind !== "failed") return;
      this.replaceRecord({
        ...current,
        operation: { kind: "idle" },
        updatedAt: new Date().toISOString(),
      });
    },
    async prepareFinalization(prototype: PrototypeRecord) {
      const current = this.requireRecord(prototype.id);
      if (current.stage !== "review") {
        throw new Error("只有待确定原型可以定稿。");
      }
      const startedAt = new Date().toISOString();
      this.replaceRecord({
        ...current,
        operation: { kind: "finalizing", phase: "preflighting", startedAt },
        updatedAt: startedAt,
      });

      const capture = useCaptureStore();
      if (!capture.connected) await capture.connect();
      if (!capture.connected) {
        this.failOperation(
          prototype.id,
          "finalize",
          capture.lastError ?? "采集服务未连接。",
        );
        return false;
      }
      capture.beginPrototype(
        prototype.id,
        `/workbench/prototypes/${prototype.id}`,
      );
      await capture.runPreflight();
      if (!capture.preflight) {
        this.failOperation(
          prototype.id,
          "finalize",
          capture.lastError ?? "整原型预检失败。",
        );
        return false;
      }
      if (
        !capture.preflight.result.ready &&
        capture.preflight.result.unacceptedWarningIds.length === 0
      ) {
        this.failOperation(
          prototype.id,
          "finalize",
          "整原型预检未通过，且没有可确认的 warning。",
        );
        return false;
      }
      this.replaceRecord({
        ...this.requireRecord(prototype.id),
        operation: {
          kind: "finalizing",
          phase: "awaiting-confirmation",
          startedAt,
        },
        updatedAt: new Date().toISOString(),
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
      this.replaceRecord({
        ...current,
        operation: {
          ...current.operation,
          phase: "capturing",
        },
        updatedAt: new Date().toISOString(),
      });
      await capture.createJob();
      const job = capture.activeJob;
      if (!job) {
        this.failOperation(
          prototype.id,
          "finalize",
          capture.lastError ?? "整原型采集任务创建失败。",
        );
        return false;
      }
      capture.closeComposer();
      this.replaceRecord({
        ...this.requireRecord(prototype.id),
        operation: {
          kind: "finalizing",
          phase: "capturing",
          startedAt: current.operation.startedAt,
          jobId: job.jobId,
          bundleId: job.bundleId,
        },
        updatedAt: new Date().toISOString(),
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
      ) {
        return;
      }
      const capture = useCaptureStore();
      if (!capture.connected) await capture.connect();
      if (!capture.connected) return;

      try {
        if (capture.activeJob?.jobId !== current.operation.jobId) {
          capture.activeJob = await captureServiceClient.getJob(
            current.operation.jobId,
          );
        }
        await capture.refreshActiveJob();
      } catch (error) {
        capture.setError(error);
        this.failOperation(
          prototype.id,
          "finalize",
          capture.lastError ?? "读取采集任务失败。",
        );
        return;
      }

      const job = capture.activeJob;
      if (!job || !TERMINAL_JOB_STATUSES.has(job.status)) return;
      if (job.status !== "completed") {
        this.failOperation(
          prototype.id,
          "finalize",
          jobFailure(job, capture.lastError),
        );
        return;
      }

      if (!capture.details) await capture.loadBundle(job.bundleId);
      const details = capture.details;
      if (!details || details.bundle.bundleId !== job.bundleId) {
        this.failOperation(
          prototype.id,
          "finalize",
          capture.lastError ?? "采集已结束，但无法读取定稿 Evidence。",
        );
        return;
      }
      const counts = details.activeSnapshot.coverage.counts;
      const incomplete =
        counts.failed +
        counts.unsupported +
        counts.cancelled +
        counts.interrupted +
        counts.skipped;
      if (incomplete > 0) {
        const failedAttempt = details.runs
          .flatMap((run) => run.attempts)
          .find(
            (attempt) =>
              attempt.result !== "captured" && attempt.result !== "reused",
          );
        const failureDetail = failedAttempt
          ? ` ${failedAttempt.caseId}：${failedAttempt.reason ?? failedAttempt.result}`
          : "";
        this.failOperation(
          prototype.id,
          "finalize",
          `整原型采集未完整：${counts.captured + counts.reused} 项成功或复用，${incomplete} 项未完成。${failureDetail}`,
        );
        return;
      }

      await capture.previewCurrentHandoff();
      if (!capture.handoffPreview) {
        this.failOperation(
          prototype.id,
          "finalize",
          capture.lastError ?? "Handoff 风险评估失败。",
        );
        return;
      }
      this.replaceRecord({
        ...this.requireRecord(prototype.id),
        operation: {
          kind: "finalizing",
          phase: "awaiting-risks",
          startedAt: current.operation.startedAt,
          jobId: job.jobId,
          bundleId: job.bundleId,
          snapshotId: details.activeSnapshot.snapshotId,
        },
        updatedAt: new Date().toISOString(),
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
      ) {
        throw new Error("定稿 Evidence 尚未准备完成。");
      }
      const capture = useCaptureStore();
      if (!capture.risksAccepted) {
        throw new Error("请逐项确认 Handoff risk。");
      }
      this.replaceRecord({
        ...current,
        operation: { ...current.operation, phase: "building-prompt" },
        updatedAt: new Date().toISOString(),
      });
      await capture.createCurrentHandoff();
      if (!capture.handoff || !capture.deliveryArtifact) {
        this.failOperation(
          prototype.id,
          "finalize",
          capture.lastError ?? "Agent 提示词生成失败。",
        );
        return false;
      }
      const finalizedAt = new Date().toISOString();
      this.appendHistory(prototype.id, "review", "final", "整原型采集与提示词生成完成");
      this.replaceRecord({
        ...this.requireRecord(prototype.id),
        stage: "final",
        operation: { kind: "idle" },
        artifacts: {
          jobId: current.operation.jobId,
          bundleId: current.operation.bundleId,
          snapshotId: current.operation.snapshotId,
          handoffId: capture.handoff.handoffId,
          deliveryId: capture.deliveryArtifact.deliveryId,
          agentPromptPath: capture.deliveryArtifact.agentPromptPath,
          receiptPath: capture.deliveryArtifact.receiptPath,
          finalizedAt,
        },
        updatedAt: finalizedAt,
      });
      capture.closeComposer();
      await capture.refreshConsole();
      return true;
    },
    async recoverFinalization(prototype: PrototypeRecord) {
      const current = this.requireRecord(prototype.id);
      if (current.operation.kind !== "finalizing") return;
      if (
        current.operation.phase === "preflighting" ||
        current.operation.phase === "awaiting-confirmation"
      ) {
        await this.prepareFinalization(prototype);
        return;
      }
      if (current.operation.phase === "capturing") {
        await this.pollFinalization(prototype);
        return;
      }
      if (!current.operation.bundleId || !current.operation.snapshotId) {
        this.failOperation(
          prototype.id,
          "finalize",
          "定稿任务缺少 Bundle 或 Snapshot 引用。",
        );
        return;
      }
      const capture = useCaptureStore();
      if (!capture.connected) await capture.connect();
      await capture.loadSnapshot(
        current.operation.bundleId,
        current.operation.snapshotId,
      );
      await capture.previewCurrentHandoff();
      if (!capture.handoffPreview) {
        this.failOperation(
          prototype.id,
          "finalize",
          capture.lastError ?? "无法恢复 Handoff 风险确认。",
        );
        return;
      }
      this.replaceRecord({
        ...this.requireRecord(prototype.id),
        operation: { ...current.operation, phase: "awaiting-risks" },
        updatedAt: new Date().toISOString(),
      });
      if (capture.handoffPreview.risks.length === 0) {
        await this.completeFinalization(prototype);
      }
    },
    async rollbackToReview(prototype: PrototypeRecord, note = "") {
      const current = this.requireRecord(prototype.id);
      if (current.stage !== "final" || !current.artifacts) {
        throw new Error("只有具有完整定稿产物的已定稿原型可以回退。");
      }
      const startedAt = new Date().toISOString();
      this.replaceRecord({
        ...current,
        operation: {
          kind: "rolling-back",
          startedAt,
          bundleIds: [current.artifacts.bundleId],
        },
        updatedAt: startedAt,
      });
      const capture = useCaptureStore();
      if (!capture.connected) await capture.connect();
      if (!capture.connected) {
        this.failOperation(
          prototype.id,
          "rollback",
          capture.lastError ?? "采集服务未连接，无法清理定稿 Evidence。",
        );
        return false;
      }
      try {
        await captureServiceClient.trashBundles([current.artifacts.bundleId]);
        await capture.refreshConsole();
      } catch (error) {
        capture.setError(error);
        this.failOperation(
          prototype.id,
          "rollback",
          capture.lastError ?? "定稿 Evidence 清理失败。",
        );
        return false;
      }
      const completedAt = new Date().toISOString();
      this.appendHistory(prototype.id, "final", "review", note || "清理定稿 Evidence 后回退");
      this.replaceRecord({
        ...this.requireRecord(prototype.id),
        stage: "review",
        operation: { kind: "idle" },
        artifacts: null,
        updatedAt: completedAt,
      });
      return true;
    },
  },
});
