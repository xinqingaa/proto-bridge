import { beforeEach, describe, expect, it, vi } from "vitest";
import { createPinia, setActivePinia } from "pinia";
import { usePrototypeLifecycleStore } from "@/app/stores/prototypeLifecycle";
import { useCaptureStore } from "@/app/stores/capture";
import { captureServiceClient } from "@/capture/service-client";
import { prototypes } from "@/prototypes/registry";

describe("prototype lifecycle workspace state", () => {
  beforeEach(() => {
    localStorage.clear();
    sessionStorage.clear();
    setActivePinia(createPinia());
    vi.restoreAllMocks();
  });

  it("initializes every new prototype as active and supports the review loop", () => {
    const store = usePrototypeLifecycleStore();
    store.ensurePrototypes(prototypes);

    expect(
      prototypes.every((item) => store.effectiveLifecycle(item) === "active"),
    ).toBe(true);

    const prototype = prototypes[0]!;
    store.transition(prototype, "review", "送交待确定");
    store.transition(prototype, "active", "继续修改");

    expect(store.effectiveLifecycle(prototype)).toBe("active");
    expect(
      store.historyFor(prototype.id).map(({ from, to }) => ({ from, to })),
    ).toEqual([
      { from: "review", to: "active" },
      { from: "active", to: "review" },
    ]);
  });

  it("rejects skipping stages and bypassing finalization or cleanup", () => {
    const store = usePrototypeLifecycleStore();
    const prototype = prototypes[0]!;

    expect(() => store.transition(prototype, "final")).toThrow("不允许");
    store.transition(prototype, "review");
    expect(() => store.transition(prototype, "final")).toThrow("自动采集");

    const now = new Date().toISOString();
    store.replaceRecord({
      prototypeId: prototype.id,
      stage: "final",
      operation: { kind: "idle" },
      artifacts: {
        jobId: "job-1",
        bundleId: "bundle-1",
        snapshotId: "snapshot-1",
        handoffId: "handoff-1",
        deliveryId: "delivery-1",
        agentPromptPath: "/delivery/agent-prompt.md",
        receiptPath: "/delivery/receipt.json",
        finalizedAt: now,
      },
      createdAt: now,
      updatedAt: now,
    });
    expect(() => store.transition(prototype, "review")).toThrow(
      "清理定稿 Evidence",
    );
  });

  it("clears the bound Evidence before rolling a finalized prototype back", async () => {
    const store = usePrototypeLifecycleStore();
    const capture = useCaptureStore();
    const prototype = prototypes[0]!;
    const now = new Date().toISOString();
    store.replaceRecord({
      prototypeId: prototype.id,
      stage: "final",
      operation: { kind: "idle" },
      artifacts: {
        jobId: "job-1",
        bundleId: "bundle-1",
        snapshotId: "snapshot-1",
        handoffId: "handoff-1",
        deliveryId: "delivery-1",
        agentPromptPath: "/delivery/agent-prompt.md",
        receiptPath: "/delivery/receipt.json",
        finalizedAt: now,
      },
      createdAt: now,
      updatedAt: now,
    });
    capture.session = {} as never;
    const trash = vi
      .spyOn(captureServiceClient, "trashBundles")
      .mockResolvedValue({});
    vi.spyOn(capture, "refreshConsole").mockResolvedValue(true);

    await expect(
      store.rollbackToReview(prototype, "方案需要调整"),
    ).resolves.toBe(true);

    expect(trash).toHaveBeenCalledWith(["bundle-1"]);
    expect(store.recordFor(prototype.id)).toMatchObject({
      stage: "review",
      operation: { kind: "idle" },
      artifacts: null,
    });
    expect(store.historyFor(prototype.id)[0]).toMatchObject({
      from: "final",
      to: "review",
      note: "方案需要调整",
    });
  });

  it("keeps archived prototypes terminal and immutable", () => {
    const store = usePrototypeLifecycleStore();
    const prototype = prototypes[0]!;
    const now = new Date().toISOString();
    store.replaceRecord({
      prototypeId: prototype.id,
      stage: "final",
      operation: { kind: "idle" },
      artifacts: {
        jobId: "job-1",
        bundleId: "bundle-1",
        snapshotId: "snapshot-1",
        handoffId: "handoff-1",
        deliveryId: "delivery-1",
        agentPromptPath: "/delivery/agent-prompt.md",
        receiptPath: "/delivery/receipt.json",
        finalizedAt: now,
      },
      createdAt: now,
      updatedAt: now,
    });

    store.transition(prototype, "archived", "历史封存");

    expect(store.recordFor(prototype.id)?.stage).toBe("archived");
    expect(() => store.transition(prototype, "final")).toThrow("不允许");
    expect(() => store.transition(prototype, "review")).toThrow("不允许");
  });
});
