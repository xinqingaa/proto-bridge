import { beforeEach, describe, expect, it, vi } from "vitest";
import { createPinia, setActivePinia } from "pinia";
import { usePrototypeLifecycleStore } from "@/app/stores/prototypeLifecycle";
import { useCaptureStore } from "@/app/stores/capture";
import { captureServiceClient } from "@/capture/service-client";
import { prototypes } from "@/prototypes/registry";

const STORAGE_KEY = "pbwork.prototype-lifecycle.v2";

function finalizedRecord(prototypeId: string, now = new Date().toISOString()) {
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
      finalizedAt: now,
    },
    createdAt: now,
    updatedAt: now,
  };
}

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
    expect(JSON.parse(localStorage.getItem(STORAGE_KEY)!).records[prototype.id].stage).toBe(
      "active",
    );
  });

  it("rejects skipping stages and bypassing finalization or cleanup", () => {
    const store = usePrototypeLifecycleStore();
    const prototype = prototypes[0]!;

    expect(() => store.transition(prototype, "final")).toThrow("不允许");
    store.transition(prototype, "review");
    expect(() => store.transition(prototype, "final")).toThrow("自动采集");

    store.replaceRecord(finalizedRecord(prototype.id));
    expect(() => store.transition(prototype, "review")).toThrow(
      "清理定稿 Evidence",
    );
  });

  it("keeps review when finalization fails", () => {
    const store = usePrototypeLifecycleStore();
    const prototype = prototypes[0]!;
    store.transition(prototype, "review");
    store.failOperation(prototype.id, "finalize", "整原型预检失败。");

    expect(store.recordFor(prototype.id)).toMatchObject({
      stage: "review",
      operation: { kind: "failed", action: "finalize" },
    });
  });

  it("clears the bound Evidence before rolling a finalized prototype back", async () => {
    const store = usePrototypeLifecycleStore();
    const capture = useCaptureStore();
    const prototype = prototypes[0]!;
    store.replaceRecord(finalizedRecord(prototype.id));
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
    store.replaceRecord(finalizedRecord(prototype.id));

    store.transition(prototype, "archived", "历史封存");

    expect(store.recordFor(prototype.id)?.stage).toBe("archived");
    expect(() => store.transition(prototype, "final")).toThrow("不允许");
    expect(() => store.transition(prototype, "review")).toThrow("不允许");
  });

  it("restores persisted records after reload and treats missing records as active", () => {
    const prototype = prototypes[0]!;
    const first = usePrototypeLifecycleStore();
    first.ensurePrototypes(prototypes);
    first.transition(prototype, "review", "送交待确定");

    setActivePinia(createPinia());
    const reloaded = usePrototypeLifecycleStore();
    expect(reloaded.effectiveLifecycle(prototype)).toBe("review");

    localStorage.clear();
    setActivePinia(createPinia());
    const cleared = usePrototypeLifecycleStore();
    cleared.ensurePrototypes(prototypes);
    expect(
      prototypes.every((item) => cleared.effectiveLifecycle(item) === "active"),
    ).toBe(true);
  });

  it("returns every prototype to active after a workspace reset", () => {
    const store = usePrototypeLifecycleStore();
    const prototype = prototypes[0]!;
    store.replaceRecord(finalizedRecord(prototype.id));
    store.appendHistory(prototype.id, "review", "final", "定稿");

    store.resetAfterWorkspaceReset(prototypes);

    expect(
      prototypes.every((item) => store.effectiveLifecycle(item) === "active"),
    ).toBe(true);
    expect(store.recordFor(prototype.id)?.artifacts).toBeNull();
    expect(store.historyFor(prototype.id)).toEqual([]);
    expect(
      JSON.parse(localStorage.getItem(STORAGE_KEY)!).records[prototype.id].stage,
    ).toBe("active");
  });

  it("returns every prototype to active when Store generation changes", () => {
    const store = usePrototypeLifecycleStore();
    const prototype = prototypes[0]!;
    store.replaceRecord(finalizedRecord(prototype.id));
    store.syncWithWorkspace({
      workspaceId: "pbwork-local",
      generationId: "generation-a",
      knownBundleIds: ["bundle-1"],
      prototypes,
    });

    const reset = store.syncWithWorkspace({
      workspaceId: "pbwork-local",
      generationId: "generation-b",
      knownBundleIds: [],
      prototypes,
    });

    expect(reset).toBe(true);
    expect(store.effectiveLifecycle(prototype)).toBe("active");
    expect(store.recordFor(prototype.id)?.artifacts).toBeNull();
    expect(JSON.parse(localStorage.getItem(STORAGE_KEY)!)).toMatchObject({
      generationId: "generation-b",
      workspaceId: "pbwork-local",
    });
  });

  it("preserves review state on first generation bind when artifacts still exist", () => {
    const store = usePrototypeLifecycleStore();
    const prototype = prototypes[0]!;
    store.ensurePrototypes(prototypes);
    store.transition(prototype, "review", "送交待确定");

    const reset = store.syncWithWorkspace({
      workspaceId: "pbwork-local",
      generationId: "generation-a",
      knownBundleIds: [],
      prototypes,
    });

    expect(reset).toBe(false);
    expect(store.effectiveLifecycle(prototype)).toBe("review");
    expect(JSON.parse(localStorage.getItem(STORAGE_KEY)!).generationId).toBe(
      "generation-a",
    );
  });

  it("clears unbound finalized records whose Evidence is already gone", () => {
    const store = usePrototypeLifecycleStore();
    const prototype = prototypes[0]!;
    store.replaceRecord(finalizedRecord(prototype.id));

    const reset = store.syncWithWorkspace({
      workspaceId: "pbwork-local",
      generationId: "generation-new",
      knownBundleIds: [],
      prototypes,
    });

    expect(reset).toBe(true);
    expect(store.effectiveLifecycle(prototype)).toBe("active");
    expect(store.historyFor(prototype.id)).toEqual([]);
  });
});
