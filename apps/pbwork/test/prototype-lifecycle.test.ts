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

  describe("capturing finalization polls", () => {
    const startedAt = "2026-09-25T02:35:44.713Z";
    const jobId = "job-1";
    const bundleId = "bundle-1";
    const runId = "run-1";

    function capturingRecord(prototypeId: string) {
      return {
        prototypeId,
        stage: "review" as const,
        operation: {
          kind: "finalizing" as const,
          phase: "capturing" as const,
          startedAt,
          jobId,
          bundleId,
        },
        artifacts: null,
        createdAt: startedAt,
        updatedAt: startedAt,
      };
    }

    function completedJob(caseIds: string[]) {
      return {
        jobId,
        bundleId,
        runId,
        status: "completed",
        selection: { cases: caseIds.map((caseId) => ({ caseId })) },
        journal: caseIds.map((caseId) => ({
          at: startedAt,
          event: "case-finished",
          detail: `${caseId}:captured`,
        })),
      } as never;
    }

    function details(
      attempts: Array<{ caseId: string; result: string; reason?: string }>,
    ) {
      const failed = attempts.filter((item) => item.result === "failed").length;
      return {
        bundle: { bundleId },
        activeSnapshot: {
          snapshotId: "snapshot-1",
          coverage: {
            counts: {
              selected: attempts.length,
              captured: attempts.length - failed,
              reused: 0,
              failed,
              skipped: 0,
              unsupported: 0,
              cancelled: 0,
              interrupted: 0,
              missing: 0,
              stale: 0,
            },
          },
        },
        runs: [{ runId, attempts }],
      } as never;
    }

    function connectedCapture() {
      const capture = useCaptureStore();
      capture.session = {} as never;
      vi.spyOn(capture, "refreshConsole").mockResolvedValue(true);
      return capture;
    }

    it("creates one Handoff when the page and the sheet poll at the same time", async () => {
      const store = usePrototypeLifecycleStore();
      const capture = connectedCapture();
      const prototype = prototypes[0]!;
      store.replaceRecord(capturingRecord(prototype.id));
      vi.spyOn(captureServiceClient, "getJob").mockResolvedValue(
        completedJob(["case-a"]),
      );
      vi.spyOn(capture, "loadBundle").mockImplementation(async () => {
        capture.details = details([{ caseId: "case-a", result: "captured" }]);
      });
      vi.spyOn(capture, "previewCurrentHandoff").mockImplementation(async () => {
        await new Promise((resolve) => setTimeout(resolve, 5));
        capture.handoffPreview = { risks: [], coverageStatus: "complete" } as never;
      });
      const createHandoff = vi
        .spyOn(capture, "createCurrentHandoff")
        .mockImplementation(async () => {
          await new Promise((resolve) => setTimeout(resolve, 5));
          capture.handoff = { handoffId: "handoff-1" } as never;
          capture.deliveryArtifact = {
            deliveryId: "delivery-1",
            agentPromptPath: "/delivery/agent-prompt.md",
            receiptPath: "/delivery/receipt.json",
          } as never;
        });

      await Promise.all([
        store.pollFinalization(prototype),
        store.pollFinalization(prototype),
      ]);
      await store.pollFinalization(prototype);

      expect(createHandoff).toHaveBeenCalledTimes(1);
      expect(store.recordFor(prototype.id)).toMatchObject({
        stage: "final",
        artifacts: { handoffId: "handoff-1", deliveryId: "delivery-1" },
      });
    });

    it("keeps every failed Case of an incomplete capture and skips the Handoff", async () => {
      const store = usePrototypeLifecycleStore();
      const capture = connectedCapture();
      const prototype = prototypes[0]!;
      store.replaceRecord(capturingRecord(prototype.id));
      vi.spyOn(captureServiceClient, "getJob").mockResolvedValue(
        completedJob(["case-a", "case-b", "case-c"]),
      );
      vi.spyOn(capture, "loadBundle").mockImplementation(async () => {
        capture.details = details([
          { caseId: "case-a", result: "captured" },
          { caseId: "case-b", result: "failed", reason: "Fragment b/ is missing." },
          {
            caseId: "case-c",
            result: "failed",
            reason: "Required Fragment c/ is occluded at its center point.",
          },
        ]);
      });
      const preview = vi.spyOn(capture, "previewCurrentHandoff");

      await store.pollFinalization(prototype);

      expect(preview).not.toHaveBeenCalled();
      expect(store.recordFor(prototype.id)?.operation).toMatchObject({
        kind: "failed",
        message: expect.stringContaining("1/3 项有效，2 项失败"),
        failedCases: [
          { caseId: "case-b", reason: "Fragment b/ is missing." },
          {
            caseId: "case-c",
            reason: "Required Fragment c/ is occluded at its center point.",
          },
        ],
      });
      setActivePinia(createPinia());
      expect(
        usePrototypeLifecycleStore().recordFor(prototype.id)?.operation,
      ).toMatchObject({ kind: "failed", failedCases: expect.any(Array) });
    });

    it("keeps capturing and explains a lost connection instead of failing", async () => {
      const store = usePrototypeLifecycleStore();
      const capture = connectedCapture();
      const prototype = prototypes[0]!;
      store.replaceRecord(capturingRecord(prototype.id));
      vi.spyOn(captureServiceClient, "getJob").mockRejectedValue(
        new TypeError("Failed to fetch"),
      );

      await store.pollFinalization(prototype);

      expect(store.recordFor(prototype.id)?.operation).toMatchObject({
        kind: "finalizing",
        phase: "capturing",
        jobId,
      });
      expect(store.connectionIssues[prototype.id]).toContain("仍在后台运行");
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
