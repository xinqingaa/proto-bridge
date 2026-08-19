import { beforeEach, describe, expect, it, vi } from "vitest";
import { createPinia, setActivePinia } from "pinia";
import type {
  PrototypeFinalizedArtifacts,
  PrototypeLifecycleEvent,
  PrototypeLifecycleOperation,
  PrototypeLifecycleRecord,
  PrototypeLifecycleStage,
} from "@proto-bridge/core/v2";
import { usePrototypeLifecycleStore } from "@/app/stores/prototypeLifecycle";
import { useCaptureStore } from "@/app/stores/capture";
import { captureServiceClient } from "@/capture/service-client";
import { prototypes } from "@/prototypes/registry";

const now = "2026-08-19T08:00:00.000Z";

function artifacts(
  overrides: Partial<PrototypeFinalizedArtifacts> = {},
): PrototypeFinalizedArtifacts {
  return {
    jobId: "job-lifecycle-test",
    bundleId: "bundle-lifecycle-test",
    snapshotId: "snapshot-lifecycle-test",
    handoffId: "handoff-lifecycle-test",
    deliveryId: "delivery-lifecycle-test",
    agentPromptPath: "/delivery/agent-prompt.md",
    receiptPath: "/delivery/receipt.json",
    finalizedAt: now,
    ...overrides,
  };
}

function record(
  prototypeId: string,
  stage: PrototypeLifecycleStage = "active",
  revision = 1,
  operation: PrototypeLifecycleOperation = { kind: "idle" },
  finalizedArtifacts: PrototypeFinalizedArtifacts | null = null,
): PrototypeLifecycleRecord {
  return {
    schemaVersion: 1,
    workspaceId: "workspace-lifecycle-test",
    prototypeId,
    stage,
    operation,
    artifacts: finalizedArtifacts,
    revision,
    createdAt: now,
    updatedAt: now,
  };
}

function event(
  prototypeId: string,
  from: PrototypeLifecycleStage,
  to: PrototypeLifecycleStage,
  revision: number,
  note = "",
): PrototypeLifecycleEvent {
  return {
    schemaVersion: 1,
    eventId: `${prototypeId}.lifecycle.r${revision}`,
    workspaceId: "workspace-lifecycle-test",
    prototypeId,
    from,
    to,
    note,
    artifacts: null,
    recordRevision: revision,
    changedAt: now,
  };
}

describe("prototype lifecycle Core Store client", () => {
  beforeEach(() => {
    localStorage.clear();
    sessionStorage.clear();
    setActivePinia(createPinia());
    vi.restoreAllMocks();
    const capture = useCaptureStore();
    capture.session = {
      workspaceId: "workspace-lifecycle-test",
      generationId: "generation-lifecycle-test",
    } as never;
    vi.spyOn(captureServiceClient, "prototypeLifecycles").mockResolvedValue({
      records: [],
      events: {},
    });
    vi.spyOn(captureServiceClient, "ensurePrototypeLifecycles").mockImplementation(
      async (prototypeIds) => ({
        records: prototypeIds.map((prototypeId) => record(prototypeId)),
        events: {},
      }),
    );
  });

  it("loads persisted records and initializes only missing prototypes as active", async () => {
    const persisted = record(prototypes[0]!.id, "review", 4);
    vi.mocked(captureServiceClient.prototypeLifecycles).mockResolvedValue({
      records: [persisted],
      events: { [persisted.prototypeId]: [] },
    });
    const store = usePrototypeLifecycleStore();

    await store.initialize(prototypes);

    expect(store.recordFor(persisted.prototypeId)).toEqual(persisted);
    expect(captureServiceClient.ensurePrototypeLifecycles).toHaveBeenCalledWith([
      prototypes[1]!.id,
    ]);
    expect(store.effectiveLifecycle(prototypes[1]!)).toBe("active");
  });

  it("keeps the remote record authoritative over a conflicting legacy value", async () => {
    const prototype = prototypes[0]!;
    localStorage.setItem(
      "pbwork.prototype-lifecycle.v2",
      JSON.stringify({
        records: {
          [prototype.id]: {
            prototypeId: prototype.id,
            stage: "active",
            artifacts: null,
          },
        },
      }),
    );
    vi.mocked(captureServiceClient.prototypeLifecycles).mockResolvedValue({
      records: [record(prototype.id, "review", 3)],
      events: {},
    });
    const imported = vi.spyOn(captureServiceClient, "importPrototypeLifecycle");

    await usePrototypeLifecycleStore().initialize([prototype]);

    expect(imported).not.toHaveBeenCalled();
    expect(usePrototypeLifecycleStore().recordFor(prototype.id)?.stage).toBe(
      "review",
    );
  });

  it("falls back to active when a legacy finalized record cannot be validated", async () => {
    const prototype = prototypes[0]!;
    localStorage.setItem(
      "pbwork.prototype-lifecycle.v2",
      JSON.stringify({
        records: {
          [prototype.id]: {
            prototypeId: prototype.id,
            stage: "final",
            artifacts: artifacts(),
          },
        },
      }),
    );
    const imported = vi
      .spyOn(captureServiceClient, "importPrototypeLifecycle")
      .mockRejectedValue(new Error("Delivery does not exist"));

    await usePrototypeLifecycleStore().initialize([prototype]);

    expect(imported).toHaveBeenCalledOnce();
    expect(captureServiceClient.ensurePrototypeLifecycles).toHaveBeenCalledWith([
      prototype.id,
    ]);
    expect(usePrototypeLifecycleStore().recordFor(prototype.id)?.stage).toBe(
      "active",
    );
  });

  it("persists transitions with the current expected revision and immutable event", async () => {
    const prototype = prototypes[0]!;
    const store = usePrototypeLifecycleStore();
    store.applyRecord(record(prototype.id, "active", 7));
    const transition = vi
      .spyOn(captureServiceClient, "transitionPrototypeLifecycle")
      .mockResolvedValue({
        record: record(prototype.id, "review", 8),
        event: event(prototype.id, "active", "review", 8, "送交待确定"),
      });

    await store.transition(prototype, "review", "送交待确定");

    expect(transition).toHaveBeenCalledWith({
      prototypeId: prototype.id,
      expectedRevision: 7,
      to: "review",
      note: "送交待确定",
    });
    expect(store.recordFor(prototype.id)?.revision).toBe(8);
    expect(store.historyFor(prototype.id)[0]).toMatchObject({
      from: "active",
      to: "review",
      note: "送交待确定",
    });
  });

  it("persists rollback intent, trashes Evidence, then commits review", async () => {
    const prototype = prototypes[0]!;
    const store = usePrototypeLifecycleStore();
    const capture = useCaptureStore();
    store.applyRecord(record(prototype.id, "final", 5, { kind: "idle" }, artifacts()));
    const operation = vi
      .spyOn(captureServiceClient, "updatePrototypeLifecycleOperation")
      .mockImplementation(async (_prototypeId, expectedRevision, nextOperation) =>
        record(prototype.id, "final", expectedRevision + 1, nextOperation, artifacts()),
      );
    const trash = vi.spyOn(captureServiceClient, "trashBundles").mockResolvedValue({});
    vi.spyOn(capture, "refreshConsole").mockResolvedValue(true);
    const transition = vi
      .spyOn(captureServiceClient, "transitionPrototypeLifecycle")
      .mockImplementation(async (input) => ({
        record: record(prototype.id, "review", input.expectedRevision + 1),
        event: event(
          prototype.id,
          "final",
          "review",
          input.expectedRevision + 1,
          input.note,
        ),
      }));

    await expect(store.rollbackToReview(prototype, "方案需要调整")).resolves.toBe(true);

    expect(operation.mock.invocationCallOrder[0]).toBeLessThan(
      trash.mock.invocationCallOrder[0]!,
    );
    expect(trash.mock.invocationCallOrder[0]).toBeLessThan(
      transition.mock.invocationCallOrder[0]!,
    );
    expect(transition).toHaveBeenCalledWith({
      prototypeId: prototype.id,
      expectedRevision: 6,
      to: "review",
      note: "方案需要调整",
      artifacts: null,
    });
  });

  it("binds the generated Delivery when finalization commits", async () => {
    const prototype = prototypes[0]!;
    const store = usePrototypeLifecycleStore();
    const capture = useCaptureStore();
    store.applyRecord(
      record(prototype.id, "review", 9, {
        kind: "finalizing",
        phase: "awaiting-risks",
        startedAt: now,
        jobId: "job-lifecycle-test",
        bundleId: "bundle-lifecycle-test",
        snapshotId: "snapshot-lifecycle-test",
      }),
    );
    capture.handoffPreview = { risks: [] } as never;
    vi.spyOn(capture, "createCurrentHandoff").mockImplementation(async () => {
      capture.handoff = { handoffId: "handoff-lifecycle-test" } as never;
      capture.deliveryArtifact = {
        deliveryId: "delivery-lifecycle-test",
        agentPromptPath: "/delivery/agent-prompt.md",
        receiptPath: "/delivery/receipt.json",
      };
    });
    vi.spyOn(capture, "refreshConsole").mockResolvedValue(true);
    vi.spyOn(captureServiceClient, "updatePrototypeLifecycleOperation").mockResolvedValue(
      record(prototype.id, "review", 10, {
        kind: "finalizing",
        phase: "building-prompt",
        startedAt: now,
        jobId: "job-lifecycle-test",
        bundleId: "bundle-lifecycle-test",
        snapshotId: "snapshot-lifecycle-test",
      }),
    );
    const transition = vi
      .spyOn(captureServiceClient, "transitionPrototypeLifecycle")
      .mockImplementation(async (input) => ({
        record: record(prototype.id, "final", 11, { kind: "idle" }, input.artifacts!),
        event: { ...event(prototype.id, "review", "final", 11), artifacts: input.artifacts! },
      }));

    await expect(store.completeFinalization(prototype)).resolves.toBe(true);

    expect(transition).toHaveBeenCalledWith(
      expect.objectContaining({
        expectedRevision: 10,
        to: "final",
        artifacts: expect.objectContaining({
          jobId: "job-lifecycle-test",
          deliveryId: "delivery-lifecycle-test",
          handoffId: "handoff-lifecycle-test",
        }),
      }),
    );
    expect(store.recordFor(prototype.id)?.stage).toBe("final");
  });
});
