import { beforeEach, describe, expect, it, vi } from "vitest";
import { createPinia, setActivePinia } from "pinia";
import { usePrototypeLifecycleStore } from "@/app/stores/prototypeLifecycle";
import { useCaptureStore } from "@/app/stores/capture";
import { captureServiceClient } from "@/capture/service-client";
import { prototypes } from "@/prototypes/registry";

const OPERATION_KEY = "00000000-0000-4000-8000-000000000001";
const REQUEST_DIGEST = `sha256:${"a".repeat(64)}`;
const STARTED_AT = "2026-09-25T02:35:44.713Z";

function finalRecord(prototypeId: string) {
  return {
    prototypeId,
    stage: "final" as const,
    operation: { kind: "idle" as const },
    artifacts: {
      jobId: "job-1",
      bundleId: "bundle-1",
      snapshotId: "snapshot-1",
      handoffId: "handoff-1",
      deliveryId: "delivery-1",
      agentPromptPath: "/delivery/agent-prompt.md",
      receiptPath: "/delivery/receipt.json",
      finalizedAt: STARTED_AT,
      operationKey: OPERATION_KEY,
      requestDigest: REQUEST_DIGEST,
    },
    createdAt: STARTED_AT,
    updatedAt: STARTED_AT,
  };
}

function capturingRecord(prototypeId: string) {
  return {
    prototypeId,
    stage: "review" as const,
    operation: {
      kind: "finalizing" as const,
      operationKey: OPERATION_KEY,
      phase: "capturing" as const,
      acceptedWarningIds: [],
      acknowledgedRiskKinds: [],
      startedAt: STARTED_AT,
      jobId: "job-1",
      bundleId: "bundle-1",
    },
    artifacts: null,
    createdAt: STARTED_AT,
    updatedAt: STARTED_AT,
  };
}

function lifecycleDocument(prototypeId: string, record: unknown, revision = 1) {
  return {
    schemaVersion: 1,
    workspaceId: "pbwork-local",
    generationId: "generation-test",
    revision,
    records: { [prototypeId]: record },
    history: [],
    updatedAt: STARTED_AT,
  } as never;
}

describe("Workspace-persisted prototype lifecycle", () => {
  beforeEach(() => {
    localStorage.clear();
    sessionStorage.clear();
    setActivePinia(createPinia());
    vi.restoreAllMocks();
  });

  it("renders active defaults before service hydration and never writes lifecycle to localStorage", () => {
    const store = usePrototypeLifecycleStore();
    store.ensurePrototypes(prototypes);
    expect(prototypes.every((item) => store.effectiveLifecycle(item) === "active")).toBe(true);
    expect(localStorage.length).toBe(0);
  });

  it("hydrates fixed stages and artifacts from the Service document after a page reload", async () => {
    const prototype = prototypes[0]!;
    const store = usePrototypeLifecycleStore();
    await store.hydrateFromService(lifecycleDocument(prototype.id, finalRecord(prototype.id)));
    expect(store.effectiveLifecycle(prototype)).toBe("final");
    expect(store.finalizedRecords[0]?.artifacts).toMatchObject({
      jobId: "job-1",
      bundleId: "bundle-1",
      snapshotId: "snapshot-1",
      handoffId: "handoff-1",
      deliveryId: "delivery-1",
      operationKey: OPERATION_KEY,
    });
  });

  it("imports legacy lifecycle state only for the matching Workspace and clears it after Service accepts", async () => {
    const prototype = prototypes[0]!;
    const legacy = {
      version: 2,
      workspaceId: "pbwork-local",
      generationId: "generation-test",
      records: { [prototype.id]: finalRecord(prototype.id) },
      history: [],
      storageError: null,
    };
    localStorage.setItem("pbwork.prototype-lifecycle.v2", JSON.stringify(legacy));
    const migrate = vi.spyOn(captureServiceClient, "migratePrototypeLifecycle");
    migrate.mockImplementation(async ({ document }) => document);
    const empty = {
      schemaVersion: 1,
      workspaceId: "pbwork-local",
      generationId: "generation-test",
      revision: 0,
      records: {},
      history: [],
      updatedAt: STARTED_AT,
    } as never;

    const store = usePrototypeLifecycleStore();
    await store.hydrateFromService(empty);

    expect(migrate).toHaveBeenCalledOnce();
    const request = migrate.mock.calls[0]?.[0];
    expect(request?.document.records[prototype.id]?.stage).toBe("final");
    expect(request?.document.records[prototype.id]?.artifacts?.operationKey).toMatch(
      /^[0-9a-f-]{36}$/,
    );
    expect(request?.document.records[prototype.id]?.artifacts?.requestDigest).toMatch(
      /^sha256:[a-f0-9]{64}$/,
    );
    expect(localStorage.getItem("pbwork.prototype-lifecycle.v2")).toBeNull();
    expect(store.effectiveLifecycle(prototype)).toBe("final");
  });

  it("rejects skipping lifecycle stages or marking a prototype final directly", () => {
    const store = usePrototypeLifecycleStore();
    const prototype = prototypes[0]!;
    expect(() => store.transition(prototype, "final")).toThrow("不允许");
    store.transition(prototype, "review");
    expect(() => store.transition(prototype, "final")).toThrow("自动采集");
    store.replaceRecord(finalRecord(prototype.id));
    expect(() => store.transition(prototype, "review")).toThrow("清理定稿 Evidence");
  });

  it("coalesces same-tab polls and only reads Service-owned operation state", async () => {
    const prototype = prototypes[0]!;
    const lifecycle = usePrototypeLifecycleStore();
    const capture = useCaptureStore();
    capture.session = {} as never;
    const createHandoff = vi.spyOn(capture, "createCurrentHandoff");
    lifecycle.replaceRecord(capturingRecord(prototype.id));
    const refresh = vi.spyOn(captureServiceClient, "prototypeLifecycle").mockImplementation(async () => {
      await new Promise((resolve) => setTimeout(resolve, 5));
      return lifecycleDocument(prototype.id, capturingRecord(prototype.id));
    });
    await Promise.all([
      lifecycle.pollFinalization(prototype),
      lifecycle.pollFinalization(prototype),
    ]);

    expect(refresh).toHaveBeenCalledTimes(1);
    expect(createHandoff).not.toHaveBeenCalled();
    expect(lifecycle.recordFor(prototype.id)?.operation).toMatchObject({
      kind: "finalizing",
      operationKey: OPERATION_KEY,
    });
  });

  it("shows server-persisted failure details after hydration", async () => {
    const prototype = prototypes[0]!;
    const lifecycle = usePrototypeLifecycleStore();
    const capture = useCaptureStore();
    capture.session = {} as never;
    const createHandoff = vi.spyOn(capture, "createCurrentHandoff");
    const failedRecord = {
      prototypeId: prototype.id,
      stage: "review",
      operation: {
        kind: "failed",
        operationKey: OPERATION_KEY,
        action: "finalize",
        message: "整原型采集未完整：1/3 项有效，2 项失败。",
        failedAt: STARTED_AT,
        failedCases: [
          { caseId: "case-b", reason: "Fragment b/ is missing." },
          { caseId: "case-c", reason: "Required Fragment c/ is occluded." },
        ],
      },
      artifacts: null,
      createdAt: STARTED_AT,
      updatedAt: STARTED_AT,
    };
    vi.spyOn(captureServiceClient, "prototypeLifecycle").mockResolvedValue(
      lifecycleDocument(prototype.id, failedRecord, 2),
    );

    await lifecycle.pollFinalization(prototype);

    expect(lifecycle.recordFor(prototype.id)?.operation).toMatchObject({
      kind: "failed",
      failedCases: [
        { caseId: "case-b", reason: "Fragment b/ is missing." },
        { caseId: "case-c", reason: "Required Fragment c/ is occluded." },
      ],
    });
    expect(createHandoff).not.toHaveBeenCalled();
  });

  it("keeps formal warning and risk confirmations isolated per prototype", () => {
    const lifecycle = usePrototypeLifecycleStore();
    const capture = useCaptureStore();
    const [first, second] = prototypes;
    if (!first || !second) throw new Error("expected at least two prototypes");

    lifecycle.preflights = {
      [first.id]: { result: { warnings: [{ warningId: "warning-a" }] } } as never,
      [second.id]: { result: { warnings: [{ warningId: "warning-b" }] } } as never,
    };
    lifecycle.handoffPreviews = {
      [first.id]: { risks: [{ kind: "required-unknown" }] } as never,
      [second.id]: { risks: [{ kind: "partial-coverage" }] } as never,
    };

    lifecycle.toggleWarning(first.id, "warning-a", true);
    lifecycle.toggleRisk(first.id, "required-unknown", true);

    expect(lifecycle.warningsAcceptedFor(first.id)).toBe(true);
    expect(lifecycle.warningsAcceptedFor(second.id)).toBe(false);
    expect(lifecycle.risksAcceptedFor(first.id)).toBe(true);
    expect(lifecycle.risksAcceptedFor(second.id)).toBe(false);
    expect(capture.acceptedWarningIds).toEqual([]);
    expect(capture.acknowledgedRiskKinds).toEqual([]);
  });

  it("keeps the operation visible during a Service connection interruption", async () => {
    const prototype = prototypes[0]!;
    const lifecycle = usePrototypeLifecycleStore();
    const capture = useCaptureStore();
    capture.session = {} as never;
    lifecycle.replaceRecord(capturingRecord(prototype.id));
    vi.spyOn(captureServiceClient, "prototypeLifecycle").mockRejectedValue(
      new TypeError("Failed to fetch"),
    );

    await lifecycle.pollFinalization(prototype);

    expect(lifecycle.recordFor(prototype.id)?.operation).toMatchObject({
      kind: "finalizing",
      phase: "capturing",
      jobId: "job-1",
    });
    expect(lifecycle.connectionIssues[prototype.id]).toContain("Local Service 会在恢复后继续处理");
  });

  it("persists rollback intent only and lets Service complete the cleanup", async () => {
    const lifecycle = usePrototypeLifecycleStore();
    const capture = useCaptureStore();
    const prototype = prototypes[0]!;
    capture.session = {} as never;
    const update = vi.spyOn(captureServiceClient, "updatePrototypeLifecycle");
    const trash = vi.spyOn(captureServiceClient, "trashBundles");
    update.mockImplementation(async ({ document }) => document);
    await lifecycle.hydrateFromService(
      lifecycleDocument(prototype.id, finalRecord(prototype.id)),
    );

    await expect(lifecycle.rollbackToReview(prototype, "方案需要调整")).resolves.toBe(false);
    expect(lifecycle.recordFor(prototype.id)).toMatchObject({
      stage: "final",
      operation: {
        kind: "rolling-back",
        bundleIds: ["bundle-1"],
        note: "方案需要调整",
      },
      artifacts: { bundleId: "bundle-1" },
    });
    expect(trash).not.toHaveBeenCalled();
    expect(update).toHaveBeenCalled();

    vi.spyOn(captureServiceClient, "prototypeLifecycle").mockResolvedValue(
      lifecycleDocument(
        prototype.id,
        {
          ...lifecycle.recordFor(prototype.id),
          stage: "review",
          operation: { kind: "idle" },
          artifacts: null,
        },
        5,
      ),
    );
    await lifecycle.pollFinalization(prototype);
    expect(lifecycle.recordFor(prototype.id)).toMatchObject({
      stage: "review",
      operation: { kind: "idle" },
      artifacts: null,
    });
    expect(trash).not.toHaveBeenCalled();
  });

  it("offers a new rollback operation after a persisted rollback failure", async () => {
    const lifecycle = usePrototypeLifecycleStore();
    const capture = useCaptureStore();
    const prototype = prototypes[0]!;
    capture.session = {} as never;
    const trash = vi.spyOn(captureServiceClient, "trashBundles");
    vi.spyOn(captureServiceClient, "updatePrototypeLifecycle").mockImplementation(
      async ({ document }) => document,
    );
    const failedRecord = {
      ...finalRecord(prototype.id),
      operation: {
        kind: "failed",
        operationKey: "00000000-0000-4000-8000-000000000099",
        action: "rollback",
        message: "回退失败：fixture IO error。修复后可重试回退。",
        failedAt: STARTED_AT,
      },
    };
    await lifecycle.hydrateFromService(
      lifecycleDocument(prototype.id, failedRecord),
    );

    await lifecycle.rollbackToReview(prototype);

    expect(lifecycle.recordFor(prototype.id)?.operation).toMatchObject({
      kind: "rolling-back",
      bundleIds: ["bundle-1"],
    });
    expect(lifecycle.recordFor(prototype.id)?.operation).not.toMatchObject({
      operationKey: "00000000-0000-4000-8000-000000000099",
    });
    expect(trash).not.toHaveBeenCalled();
  });
});
