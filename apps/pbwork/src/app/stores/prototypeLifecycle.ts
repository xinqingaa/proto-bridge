import { defineStore } from "pinia";
import {
  LifecycleOperationKey,
  OperationRequestDigest,
  FinalizedArtifacts as FinalizedArtifactsSchema,
  PrototypeLifecycleDocument,
  PrototypeLifecycleHistoryEntry,
  PrototypeLifecycleRecord as PrototypeLifecycleRecordSchema,
  type PrototypeLifecycleDocument as LifecycleDocument,
  type PrototypeLifecycleHistoryEntry as LifecycleHistoryEntry,
  type PrototypeLifecycleOperation as LifecycleOperation,
  type PrototypeLifecycleRecord,
  type PrototypeLifecycleStage as PrototypeLifecycle,
} from "@proto-bridge/core/v2";
import type { PrototypeRecord } from "@/design-system/types";
import type { RiskKind } from "@proto-bridge/core/v2";
import {
  createPrototypeCaptureDraft,
  useCaptureStore,
} from "@/app/stores/capture";
import type {
  BundleEvidenceDetails,
  HandoffPreview,
  StoredPreflight,
} from "@proto-bridge/core/v2/service-contract";
import {
  captureServiceClient,
  LocalServiceClientError,
} from "@/capture/service-client";
const HISTORY_LIMIT = 500;
const LEGACY_STORAGE_KEY = "pbwork.prototype-lifecycle.v2";
const legacyMigrationAttempted = new Set<string>();

export const lifecycleTransitions: Record<
  PrototypeLifecycle,
  PrototypeLifecycle[]
> = {
  active: ["review"],
  review: ["active", "final"],
  final: ["review", "archived"],
  archived: [],
};

export type FinalizationPhase = NonNullable<
  Extract<LifecycleOperation, { kind: "finalizing" }>["phase"]
>;
export type { LifecycleHistoryEntry, LifecycleOperation };
export type FinalizationFailedCase = { caseId: string; reason: string };
export type FinalizationProgress = { completed: number; total: number };
export type FinalizedArtifacts = NonNullable<PrototypeLifecycleRecord["artifacts"]>;

export type LifecycleState = {
  records: Record<string, PrototypeLifecycleRecord>;
  history: LifecycleHistoryEntry[];
  workspaceId: string | null;
  generationId: string | null;
  revision: number;
  hydrated: boolean;
  storageError: string | null;
  preflights: Record<string, StoredPreflight>;
  acceptedWarnings: Record<string, string[]>;
  evidence: Record<string, BundleEvidenceDetails>;
  handoffPreviews: Record<string, HandoffPreview>;
  acknowledgedRisks: Record<string, RiskKind[]>;
};

function emptyLifecycleState(): LifecycleState {
  return {
    records: {},
    history: [],
    workspaceId: null,
    generationId: null,
    revision: 0,
    hydrated: false,
    storageError: null,
    preflights: {},
    acceptedWarnings: {},
    evidence: {},
    handoffPreviews: {},
    acknowledgedRisks: {},
  };
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

async function migrateLegacyLifecycle(
  document: LifecycleDocument,
  raw: string,
): Promise<LifecycleDocument | null> {
  let parsed: unknown;
  try {
    parsed = JSON.parse(raw);
  } catch {
    return null;
  }
  if (!parsed || typeof parsed !== "object") return null;
  const legacy = parsed as {
    version?: unknown;
    workspaceId?: unknown;
    generationId?: unknown;
    records?: unknown;
    history?: unknown;
  };
  if (
    legacy.version !== 2 ||
    legacy.workspaceId !== document.workspaceId ||
    legacy.generationId !== document.generationId ||
    !legacy.records ||
    typeof legacy.records !== "object" ||
    Array.isArray(legacy.records)
  ) {
    return null;
  }

  const records: Record<string, PrototypeLifecycleRecord> = {};
  for (const [prototypeId, value] of Object.entries(legacy.records)) {
    if (!value || typeof value !== "object") continue;
    const old = value as Partial<PrototypeLifecycleRecord>;
    const createdAt = typeof old.createdAt === "string" ? old.createdAt : new Date().toISOString();
    const updatedAt = typeof old.updatedAt === "string" ? old.updatedAt : createdAt;
    const validStage = ["active", "review", "final", "archived"].includes(String(old.stage));
    if (old.prototypeId !== prototypeId || !validStage) continue;

    let stage = old.stage as PrototypeLifecycle;
    let artifacts: PrototypeLifecycleRecord["artifacts"] = null;
    let operation: LifecycleOperation = { kind: "idle" };
    const oldOperation = old.operation;
    let diagnostic: string | null = null;
    if (oldOperation?.kind === "finalizing" || oldOperation?.kind === "rolling-back") {
      stage = stage === "active" ? "active" : "review";
      operation = {
        kind: "failed",
        action: oldOperation.kind === "rolling-back" ? "rollback" : "finalize",
        message: "旧浏览器操作没有可恢复的服务端 operationKey；仅保留诊断状态，请重新检查后继续。",
        failedAt: new Date().toISOString(),
      };
    } else if (oldOperation?.kind === "failed") {
      operation = {
        kind: "failed",
        action: oldOperation.action === "rollback" ? "rollback" : "finalize",
        message: typeof oldOperation.message === "string" && oldOperation.message.trim()
          ? oldOperation.message
          : "旧浏览器操作失败；请重新检查后继续。",
        failedAt: typeof oldOperation.failedAt === "string" ? oldOperation.failedAt : new Date().toISOString(),
        ...(Array.isArray(oldOperation.failedCases)
          ? { failedCases: oldOperation.failedCases.filter((item): item is { caseId: string; reason: string } =>
              !!item && typeof item.caseId === "string" && typeof item.reason === "string",
            ) }
          : {}),
      };
    }

    if ((stage === "final" || stage === "archived") && old.artifacts) {
      const legacyArtifacts = old.artifacts as Record<string, unknown>;
      const fixedRefs = {
        jobId: legacyArtifacts.jobId,
        bundleId: legacyArtifacts.bundleId,
        snapshotId: legacyArtifacts.snapshotId,
        handoffId: legacyArtifacts.handoffId,
        deliveryId: legacyArtifacts.deliveryId,
        agentPromptPath: legacyArtifacts.agentPromptPath,
        receiptPath: legacyArtifacts.receiptPath,
        finalizedAt: legacyArtifacts.finalizedAt,
      };
      try {
        const digestBytes = await crypto.subtle.digest(
          "SHA-256",
          new TextEncoder().encode(JSON.stringify({
            workspaceId: document.workspaceId,
            generationId: document.generationId,
            prototypeId,
            ...fixedRefs,
          })),
        );
        const requestDigest = OperationRequestDigest.parse(
          `sha256:${Array.from(new Uint8Array(digestBytes), (byte) => byte.toString(16).padStart(2, "0")).join("")}`,
        );
        artifacts = FinalizedArtifactsSchema.parse({
          ...fixedRefs,
          operationKey: LifecycleOperationKey.parse(crypto.randomUUID()),
          requestDigest,
        });
      } catch {
        diagnostic = "旧定稿记录缺少完整、有效的固定产物引用。";
      }
    } else if (stage === "final" || stage === "archived") {
      diagnostic = "旧定稿记录缺少固定产物引用。";
    }

    if (diagnostic) {
      stage = "review";
      artifacts = null;
      operation = {
        kind: "failed",
        action: "finalize",
        message: `旧浏览器定稿绑定未通过迁移前检查，未作为正式定稿恢复；Evidence 仅作诊断：${diagnostic}`,
        failedAt: new Date().toISOString(),
      };
    }
    const candidate = PrototypeLifecycleRecordSchema.safeParse({
      prototypeId,
      stage,
      operation,
      artifacts,
      createdAt,
      updatedAt,
    });
    if (candidate.success) records[prototypeId] = candidate.data;
  }

  const history = Array.isArray(legacy.history)
    ? legacy.history.flatMap((entry) => {
        const candidate = PrototypeLifecycleHistoryEntry.safeParse(entry);
        return candidate.success ? [candidate.data] : [];
      }).slice(0, HISTORY_LIMIT)
    : [];
  return PrototypeLifecycleDocument.parse({
    ...document,
    revision: 1,
    records,
    history,
    updatedAt: new Date().toISOString(),
  });
}

function isFinalizingCapture(
  record: PrototypeLifecycleRecord | undefined,
  jobId: string,
): boolean {
  return (
    record?.stage === "review" &&
    record.operation.kind === "finalizing" &&
    record.operation.phase === "capturing" &&
    record.operation.jobId === jobId
  );
}

let lifecycleSaveTail: Promise<void> = Promise.resolve();
const pollsInFlight = new Map<string, Promise<void>>();

export const usePrototypeLifecycleStore = defineStore("prototypeLifecycle", {
  state: () => ({
    ...emptyLifecycleState(),
    connectionIssues: {} as Record<string, string>,
    progress: {} as Record<string, FinalizationProgress>,
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
    preflightFor: (state) =>
      (prototypeId: string): StoredPreflight | null =>
        state.preflights[prototypeId] ?? null,
    acceptedWarningsFor: (state) =>
      (prototypeId: string): string[] =>
        state.acceptedWarnings[prototypeId] ?? [],
    warningsAcceptedFor: (state) =>
      (prototypeId: string): boolean => {
        const required = state.preflights[prototypeId]?.result.warnings.map(
          (warning) => warning.warningId,
        ) ?? [];
        const accepted = new Set(state.acceptedWarnings[prototypeId] ?? []);
        return required.every((warningId) => accepted.has(warningId));
      },
    evidenceFor: (state) =>
      (prototypeId: string): BundleEvidenceDetails | null =>
        state.evidence[prototypeId] ?? null,
    handoffPreviewFor: (state) =>
      (prototypeId: string): HandoffPreview | null =>
        state.handoffPreviews[prototypeId] ?? null,
    acknowledgedRisksFor: (state) =>
      (prototypeId: string): string[] =>
        state.acknowledgedRisks[prototypeId] ?? [],
    risksAcceptedFor: (state) =>
      (prototypeId: string): boolean => {
        const required = state.handoffPreviews[prototypeId]?.risks.map(
          (risk) => risk.kind,
        ) ?? [];
        const accepted = new Set(state.acknowledgedRisks[prototypeId] ?? []);
        return required.every((kind) => accepted.has(kind));
      },
  },
  actions: {
    async hydrateFromService(document: LifecycleDocument, prototypes: PrototypeRecord[] = []) {
      let resolved = document;
      if (document.revision === 0 && Object.keys(document.records).length === 0) {
        const migrationKey = `${document.workspaceId}:${document.generationId}`;
        if (!legacyMigrationAttempted.has(migrationKey)) {
          legacyMigrationAttempted.add(migrationKey);
          let raw: string | null = null;
          try {
            raw = window.localStorage.getItem(LEGACY_STORAGE_KEY);
          } catch {
            // Browser storage may be disabled; the Service document remains authoritative.
          }
          if (raw) {
            try {
              const migrated = await migrateLegacyLifecycle(document, raw);
              if (migrated) {
                try {
                  resolved = await captureServiceClient.migratePrototypeLifecycle({ document: migrated });
                  window.localStorage.removeItem(LEGACY_STORAGE_KEY);
                } catch (error) {
                  const remote = await captureServiceClient.prototypeLifecycle();
                  if (remote.revision > 0 || Object.keys(remote.records).length > 0) {
                    resolved = remote;
                    window.localStorage.removeItem(LEGACY_STORAGE_KEY);
                  } else {
                    throw error;
                  }
                }
              }
            } catch (error) {
              this.storageError = `旧浏览器生命周期未迁移：${error instanceof Error ? error.message : "Local Service 暂不可用"}。当前仍以服务端状态为准。`;
            }
          }
        }
      }
      this.records = { ...resolved.records };
      this.history = [...resolved.history];
      this.workspaceId = resolved.workspaceId;
      this.generationId = resolved.generationId;
      this.revision = resolved.revision;
      this.hydrated = true;
      if (!this.storageError?.startsWith("旧浏览器生命周期未迁移：")) {
        this.storageError = null;
      }
      this.ensurePrototypes(prototypes);
    },
    persist(): Promise<void> {
      if (!this.hydrated || !this.workspaceId || !this.generationId) {
        return Promise.resolve();
      }
      const save = lifecycleSaveTail.then(async () => {
        const document = PrototypeLifecycleDocument.parse({
          schemaVersion: 1,
          workspaceId: this.workspaceId,
          generationId: this.generationId,
          revision: this.revision + 1,
          records: this.records,
          history: this.history.slice(0, HISTORY_LIMIT),
          updatedAt: new Date().toISOString(),
        });
        try {
          const saved = await captureServiceClient.updatePrototypeLifecycle({
            expectedRevision: this.revision,
            document,
          });
          this.revision = saved.revision;
          this.storageError = null;
        } catch (error) {
          if (error instanceof LocalServiceClientError && error.code === "revision-conflict") {
            try {
              const remote = await captureServiceClient.prototypeLifecycle();
              this.records = { ...remote.records };
              this.history = [...remote.history];
              this.workspaceId = remote.workspaceId;
              this.generationId = remote.generationId;
              this.revision = remote.revision;
            } catch {
              // Keep the known revision and report the original write conflict.
            }
            this.storageError = "另一个页签已更新生命周期。当前页已载入最新版本，请重新检查后继续。";
          } else {
            this.storageError = error instanceof Error ? error.message : "生命周期保存失败。";
          }
          throw error;
        }
      });
      lifecycleSaveTail = save.catch(() => undefined);
      return save;
    },
    ensurePrototypes(prototypes: PrototypeRecord[]) {
      if (this.storageError && !this.storageError.startsWith("旧浏览器生命周期未迁移：")) return;
      let changed = false;
      const records = { ...this.records };
      for (const prototype of prototypes) {
        if (records[prototype.id]) continue;
        records[prototype.id] = createRecord(prototype.id, "active");
        changed = true;
      }
      if (!changed) return;
      this.records = records;
      void this.persist().catch(() => undefined);
    },
    requireRecord(prototypeId: string): PrototypeLifecycleRecord {
      const existing = this.records[prototypeId];
      if (existing) return existing;
      const record = createRecord(prototypeId);
      this.records = { ...this.records, [prototypeId]: record };
      void this.persist().catch(() => undefined);
      return record;
    },
    replaceRecord(record: PrototypeLifecycleRecord) {
      this.records = { ...this.records, [record.prototypeId]: record };
      void this.persist().catch(() => undefined);
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
    failOperation(
      prototypeId: string,
      action: "finalize" | "rollback",
      message: string,
      failedCases: FinalizationFailedCase[] = [],
    ) {
      const current = this.requireRecord(prototypeId);
      this.clearConnectionIssue(prototypeId);
      this.replaceRecord({
        ...current,
        operation: {
          kind: "failed",
          ...(current.operation.kind === "finalizing" || current.operation.kind === "rolling-back"
            ? { operationKey: current.operation.operationKey }
            : {}),
          action,
          message,
          failedAt: new Date().toISOString(),
          ...(failedCases.length ? { failedCases } : {}),
        },
        updatedAt: new Date().toISOString(),
      });
    },
    setConnectionIssue(prototypeId: string, message: string) {
      this.connectionIssues = { ...this.connectionIssues, [prototypeId]: message };
    },
    clearConnectionIssue(prototypeId: string) {
      if (!(prototypeId in this.connectionIssues)) return;
      const { [prototypeId]: _removed, ...rest } = this.connectionIssues;
      this.connectionIssues = rest;
    },
    clearFailure(prototypeId: string) {
      const current = this.requireRecord(prototypeId);
      if (current.operation.kind !== "failed") return;
      const { [prototypeId]: _preflight, ...preflights } = this.preflights;
      const { [prototypeId]: _evidence, ...evidence } = this.evidence;
      const { [prototypeId]: _preview, ...handoffPreviews } = this.handoffPreviews;
      const { [prototypeId]: _accepted, ...acceptedWarnings } = this.acceptedWarnings;
      const { [prototypeId]: _risks, ...acknowledgedRisks } = this.acknowledgedRisks;
      this.preflights = preflights;
      this.evidence = evidence;
      this.handoffPreviews = handoffPreviews;
      this.acceptedWarnings = acceptedWarnings;
      this.acknowledgedRisks = acknowledgedRisks;
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
      const existingOperation = current.operation.kind === "finalizing" ? current.operation : undefined;
      const startedAt = existingOperation
        ? existingOperation.startedAt
        : new Date().toISOString();
      const operationKey = existingOperation
        ? existingOperation.operationKey
        : crypto.randomUUID();
      const phase = existingOperation?.phase === "awaiting-confirmation"
        ? "awaiting-confirmation"
        : "preflighting";
      this.replaceRecord({
        ...current,
        operation: {
          kind: "finalizing",
          operationKey,
          phase,
          startedAt,
          acceptedWarningIds: existingOperation?.acceptedWarningIds ?? [],
          acknowledgedRiskKinds: existingOperation?.acknowledgedRiskKinds ?? [],
        },
        updatedAt: startedAt,
      });
      this.clearConnectionIssue(prototype.id);
      this.acceptedWarnings = {
        ...this.acceptedWarnings,
        [prototype.id]: [...(existingOperation?.acceptedWarningIds ?? [])],
      };
      await this.persist();

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
      const draft = createPrototypeCaptureDraft(prototype.id);
      if (!draft) {
        this.failOperation(prototype.id, "finalize", "找不到原型或正式页面，无法创建整原型预检。");
        return false;
      }
      try {
        this.preflights = {
          ...this.preflights,
          [prototype.id]: await captureServiceClient.createPreflight(draft),
        };
      } catch (error) {
        capture.setError(error);
        this.failOperation(
          prototype.id,
          "finalize",
          capture.lastError ?? "整原型预检失败。",
        );
        return false;
      }
      const preflight = this.preflights[prototype.id];
      if (!preflight) {
        this.failOperation(
          prototype.id,
          "finalize",
          "整原型预检失败。",
        );
        return false;
      }
      if (
        !preflight.result.ready &&
        preflight.result.unacceptedWarningIds.length === 0
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
          operationKey,
          phase: "awaiting-confirmation",
          startedAt,
          acceptedWarningIds: [...(existingOperation?.acceptedWarningIds ?? [])],
          acknowledgedRiskKinds: [],
        },
        updatedAt: new Date().toISOString(),
      });
      try {
        await this.persist();
      } catch {
        this.setConnectionIssue(
          prototype.id,
          this.storageError ?? "无法保存本次 warning 确认；没有创建采集 Job，请刷新后重新检查。",
        );
        return false;
      }
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
      const preflight = this.preflights[prototype.id];
      const acceptedWarningIds = this.acceptedWarnings[prototype.id] ?? [];
      const requiredWarnings = preflight?.result.warnings.map((warning) => warning.warningId) ?? [];
      const accepted = new Set(acceptedWarningIds);
      if (!preflight || !requiredWarnings.every((warningId) => accepted.has(warningId))) {
        throw new Error("请逐项确认预检 warning。");
      }
      this.replaceRecord({
        ...current,
        operation: {
          ...current.operation,
          acceptedWarningIds: [...acceptedWarningIds].sort(),
        },
        updatedAt: new Date().toISOString(),
      });
      try {
        await this.persist();
      } catch {
        this.setConnectionIssue(
          prototype.id,
          this.storageError ?? "无法保存本次 warning 确认；尚未创建采集 Job，请恢复连接后重试。",
        );
        return false;
      }
      try {
        await captureServiceClient.createJob({
          preflightId: preflight.preflightId,
          acceptedWarningIds: [...acceptedWarningIds].sort(),
          operationKey: current.operation.operationKey,
        });
        await capture.refreshConsole();
      } catch (error) {
        capture.setError(error);
        this.failOperation(
          prototype.id,
          "finalize",
          capture.lastError ?? "整原型采集任务创建失败。",
        );
        return false;
      }
      await this.hydrateFromService(await captureServiceClient.prototypeLifecycle());
      return true;
    },
    toggleWarning(prototypeId: string, warningId: string, accepted: boolean) {
      const current = new Set(this.acceptedWarnings[prototypeId] ?? []);
      if (accepted) current.add(warningId);
      else current.delete(warningId);
      this.acceptedWarnings = {
        ...this.acceptedWarnings,
        [prototypeId]: [...current],
      };
    },
    toggleRisk(prototypeId: string, kind: RiskKind, accepted: boolean) {
      const current = new Set(this.acknowledgedRisks[prototypeId] ?? []);
      if (accepted) current.add(kind);
      else current.delete(kind);
      this.acknowledgedRisks = {
        ...this.acknowledgedRisks,
        [prototypeId]: [...current],
      };
    },
    /** Advances a capturing finalization; concurrent callers share one in-flight poll per prototype. */
    pollFinalization(prototype: PrototypeRecord): Promise<void> {
      const pending = pollsInFlight.get(prototype.id);
      if (pending) return pending;
      const poll = this.pollFinalizationOnce(prototype).finally(() => {
        pollsInFlight.delete(prototype.id);
      });
      pollsInFlight.set(prototype.id, poll);
      return poll;
    },
    async pollFinalizationOnce(prototype: PrototypeRecord) {
      const capture = useCaptureStore();
      if (!capture.connected) await capture.connect();
      if (!capture.connected) {
        this.setConnectionIssue(
          prototype.id,
          `采集服务未连接${capture.lastError ? `：${capture.lastError}` : ""}。采集任务可能仍在后台运行，恢复连接后会自动继续。`,
        );
        return;
      }

      try {
        const document = await captureServiceClient.prototypeLifecycle();
        await this.hydrateFromService(document);
        const latest = this.requireRecord(prototype.id);
        const jobId = latest.operation.kind === "finalizing" ? latest.operation.jobId : undefined;
        if (jobId) {
          const job = await captureServiceClient.getJob(jobId);
          if (job) {
            this.progress = {
              ...this.progress,
              [prototype.id]: {
                completed: job.journal.filter((entry) => entry.event === "case-finished").length,
                total: job.selection.cases.length,
              },
            };
          }
        }
        if (latest.operation.kind === "finalizing" && latest.operation.phase === "awaiting-risks") {
          await this.loadRiskReview(prototype, latest.operation);
        }
      } catch (error) {
        capture.setError(error);
        this.setConnectionIssue(
          prototype.id,
          `暂时读不到定稿状态：${capture.lastError ?? "网络错误"}。Local Service 会在恢复后继续处理。`,
        );
        return;
      }
      this.clearConnectionIssue(prototype.id);
    },
    async loadRiskReview(
      prototype: PrototypeRecord,
      operation: Extract<LifecycleOperation, { kind: "finalizing" }>,
    ) {
      if (!operation.bundleId || !operation.snapshotId) return false;
      if (this.evidence[prototype.id] && this.handoffPreviews[prototype.id]) return true;
      const capture = useCaptureStore();
      if (!capture.connected) await capture.connect();
      if (!capture.connected) return false;
      try {
        const details = await captureServiceClient.snapshotDetails(
          operation.bundleId,
          operation.snapshotId,
        );
        const preview = await captureServiceClient.previewHandoff({
          bundleId: operation.bundleId,
          snapshotId: operation.snapshotId,
          ...(operation.implementationIntent?.trim()
            ? { implementationIntent: operation.implementationIntent.trim() }
            : {}),
          acknowledgedRiskKinds: [],
        });
        this.evidence = { ...this.evidence, [prototype.id]: details };
        this.handoffPreviews = { ...this.handoffPreviews, [prototype.id]: preview };
        if (!(prototype.id in this.acknowledgedRisks)) {
          this.acknowledgedRisks = {
            ...this.acknowledgedRisks,
            [prototype.id]: [...operation.acknowledgedRiskKinds],
          };
        }
        this.clearConnectionIssue(prototype.id);
        return true;
      } catch (error) {
        capture.setError(error);
        this.setConnectionIssue(
          prototype.id,
          capture.lastError ?? "无法恢复 Handoff 风险确认，Workspace 中的 Operation 仍然保留。",
        );
        return false;
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
      const preview = this.handoffPreviews[prototype.id];
      const acknowledgedRiskKinds = this.acknowledgedRisks[prototype.id] ?? [];
      const requiredRiskKinds = preview?.risks.map((risk) => risk.kind) ?? [];
      const acknowledged = new Set(acknowledgedRiskKinds);
      if (!preview || !requiredRiskKinds.every((kind) => acknowledged.has(kind))) {
        throw new Error("请逐项确认 Handoff risk。");
      }
      this.replaceRecord({
        ...current,
        operation: {
          ...current.operation,
          phase: "building-prompt",
          acknowledgedRiskKinds: [...acknowledgedRiskKinds].sort(),
          implementationIntent: "",
        },
        updatedAt: new Date().toISOString(),
      });
      try {
        await this.persist();
      } catch {
        this.setConnectionIssue(
          prototype.id,
          this.storageError ?? "无法保存风险确认；服务端尚未开始生成提示词，请恢复连接后重试。",
        );
        return false;
      }
      return false;
    },
    async recoverFinalization(prototype: PrototypeRecord) {
      const current = this.requireRecord(prototype.id);
      if (current.operation.kind === "rolling-back") {
        await this.pollFinalization(prototype);
        return;
      }
      if (current.operation.kind !== "finalizing") return;
      if (
        current.operation.phase === "preflighting" ||
        current.operation.phase === "awaiting-confirmation"
      ) {
        await this.prepareFinalization(prototype);
        return;
      }
      if (
        current.operation.phase === "capturing" ||
        current.operation.phase === "building-prompt"
      ) {
        await this.pollFinalization(prototype);
        return;
      }
      if (current.operation.phase !== "awaiting-risks") return;
      await this.loadRiskReview(prototype, current.operation);
      if (!this.handoffPreviews[prototype.id]) {
        this.setConnectionIssue(
          prototype.id,
          "无法恢复 Handoff 风险确认，Workspace 中的 Operation 仍然保留。",
        );
        return;
      }
      if (this.handoffPreviews[prototype.id]!.risks.length === 0) {
        await this.completeFinalization(prototype);
      }
    },
    resetAfterWorkspaceReset(
      prototypes: PrototypeRecord[],
      binding?: { workspaceId: string; generationId: string },
    ) {
      this.storageError = null;
      this.records = {};
      this.history = [];
      this.workspaceId = binding?.workspaceId ?? null;
      this.generationId = binding?.generationId ?? null;
      this.revision = 0;
      this.hydrated = false;
      this.preflights = {};
      this.acceptedWarnings = {};
      this.evidence = {};
      this.handoffPreviews = {};
      this.acknowledgedRisks = {};
      if (binding) this.hydrated = true;
      this.ensurePrototypes(prototypes);
    },
    async rollbackToReview(prototype: PrototypeRecord, note = "") {
      const current = this.requireRecord(prototype.id);
      const retryingFailedRollback =
        current.operation.kind === "failed" &&
        current.operation.action === "rollback";
      if (
        current.stage !== "final" ||
        !current.artifacts ||
        (current.operation.kind !== "idle" && !retryingFailedRollback)
      ) {
        throw new Error("只有具有完整定稿产物的已定稿原型可以回退。");
      }
      const startedAt = new Date().toISOString();
      this.replaceRecord({
        ...current,
        operation: {
          kind: "rolling-back",
          operationKey: crypto.randomUUID(),
          startedAt,
          bundleIds: [current.artifacts.bundleId],
          ...(note.trim() ? { note: note.trim() } : {}),
        },
        updatedAt: startedAt,
      });
      await this.persist();
      return false;
    },
  },
});
